import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { buildTenantAIConfig } from '@/lib/ai-config'

const Schema = z.object({
  postARef: z.string().min(1),
  name: z.string().max(120).optional(),
  hypothesis: z.string().max(300).optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const tenantId = session.user.tenantId

  const tests = await prisma.aBTest.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  // Fetch post data for each test
  const postIds = Array.from(new Set([
    ...tests.map(t => t.postARef),
    ...tests.filter(t => t.postBRef).map(t => t.postBRef as string),
  ]))

  const posts = await prisma.post.findMany({
    where: { id: { in: postIds }, tenantId },
    select: {
      id: true, caption: true, type: true, contentType: true,
      status: true, thumbnailUrl: true, scheduledAt: true,
      likes: true, comments: true, reach: true,
    },
  })
  const postMap = Object.fromEntries(posts.map(p => [p.id, p]))

  return NextResponse.json(tests.map(t => ({
    ...t,
    postA: postMap[t.postARef] || null,
    postB: t.postBRef ? (postMap[t.postBRef] || null) : null,
  })))
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const tenantId = session.user.tenantId

  const body = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const { postARef, name, hypothesis } = parsed.data

  const postA = await prisma.post.findFirst({ where: { id: postARef, tenantId } })
  if (!postA) return NextResponse.json({ error: 'Post A no encontrado' }, { status: 404 })

  const test = await prisma.aBTest.create({
    data: {
      tenantId,
      name: name || ('Test: ' + (postA.caption?.slice(0, 40) || postA.id)),
      hypothesis: hypothesis || null,
      postARef,
      status: 'draft',
    },
  })

  // Auto-generate variant B in background
  generateVariantB(test.id, tenantId, postA).catch(console.error)

  return NextResponse.json(test)
}

async function generateVariantB(testId: string, tenantId: string, postA: any) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { brandVoice: true },
  })

  const aiConfig = buildTenantAIConfig(tenant)
  const apiKey = aiConfig.apiKey || process.env.ANTHROPIC_API_KEY || ''

  const prompt = [
    'Post original (Variante A):',
    'Caption: ' + (postA.caption || '(sin caption)'),
    'Hashtags: ' + (postA.hashtags || ''),
    'Tipo: ' + postA.type + ' / ' + postA.contentType,
    '',
    'Crea una Variante B para A/B test. Cambia SOLO:',
    '- El hook de apertura (primera oración/línea)',
    '- El tono o ángulo del copy (ej: si A es aspiracional, B es directo)',
    '- Mantén exactamente los mismos hashtags',
    '',
    'Responde SOLO en JSON:',
    '{"caption":"caption completo variante B","hashtags":"mismos hashtags","changeRationale":"qué cambiaste y por qué"}',
  ].join('\n')

  const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-haiku-4-20250514', max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  const aiData = await aiRes.json()
  const rawText = aiData.content?.[0]?.text || '{}'
  let variant: any = {}
  try { variant = JSON.parse(rawText.replace(/```json|```/g, '').trim()) }
  catch { return }

  // Create Post B as a clone of Post A with new caption
  const postB = await prisma.post.create({
    data: {
      tenantId,
      type: postA.type,
      contentType: postA.contentType,
      caption: variant.caption || postA.caption,
      hashtags: variant.hashtags || postA.hashtags,
      mediaUrls: postA.mediaUrls,
      thumbnailUrl: postA.thumbnailUrl,
      platform: postA.platform,
      status: 'PENDING_APPROVAL',
      imagePrompt: postA.imagePrompt,
      scheduledAt: postA.scheduledAt || new Date(),
    },
  })

  await prisma.aBTest.update({
    where: { id: testId },
    data: { postBRef: postB.id },
  })
}

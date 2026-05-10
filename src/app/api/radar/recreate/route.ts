import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { buildTenantAIConfig } from '@/lib/ai-config'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const tenantId = session.user.tenantId

  const { postId } = await req.json()
  if (!postId) return NextResponse.json({ error: 'postId requerido' }, { status: 400 })

  const [post, tenant] = await Promise.all([
    prisma.competitorPost.findFirst({
      where: { id: postId, competitor: { tenantId } },
      include: { competitor: true },
    }),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { brandVoice: true },
    }),
  ])

  if (!post) return NextResponse.json({ error: 'Post no encontrado' }, { status: 404 })
  if (!tenant) return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 })

  const bv = tenant.brandVoice
  const brandName = tenant.name

  const systemParts = [
    'Eres el copywriter de ' + brandName + '.',
    'Tono: ' + (bv?.tone || 'cercano y aspiracional') + '.',
    bv?.description ? bv.description + '.' : '',
    'Principio core: nunca vendas el producto, vende el estado posterior.',
    'Caption maximo 150 palabras con 5 hashtags al final.',
  ]
  const SYSTEM = systemParts.filter(Boolean).join(' ')

  const promptLines = [
    'Competidor: @' + post.competitor.handle,
    'Caption original: ' + (post.caption || '(sin caption)'),
    'Tipo: ' + (post.mediaType || 'imagen') + ' | Likes: ' + post.likesCount + ' | Comentarios: ' + post.commentsCount + ' | Views: ' + post.viewsCount,
    '',
    'Analiza por que fue viral y crea version para ' + brandName + '.',
    'Responde SOLO en JSON sin markdown:',
    '{"analysis":"por que funciono (2 frases)","hook":"primera linea que para el scroll","caption":"caption completo","contentType":"reel|carrusel|foto","imagePrompt":"prompt en ingles para imagen IA"}',
  ]
  const prompt = promptLines.join('\n')

  const aiConfig = buildTenantAIConfig(tenant)
  const apiKey = aiConfig.apiKey || process.env.ANTHROPIC_API_KEY || ''

  const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-20250514',
      max_tokens: 1000,
      system: SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  const aiData = await aiRes.json()
  const rawText = aiData.content?.[0]?.text || '{}'
  let parsed: any = {}
  try {
    parsed = JSON.parse(rawText.replace(/```json|```/g, '').trim())
  } catch {
    parsed = { caption: rawText, analysis: '', hook: '', contentType: 'foto', imagePrompt: '' }
  }

  await prisma.competitorPost.update({
    where: { id: postId },
    data: { recreated: true, recreatedCaption: parsed.caption, recreatedAt: new Date() },
  })

  return NextResponse.json(parsed)
}

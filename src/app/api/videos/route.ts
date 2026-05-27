import { rateLimit } from "@/lib/rate-limit"
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import path from 'path'
import { generateImage } from '@/lib/fal'
import { buildTenantAIConfig } from '@/lib/ai-config'
import { assembleVideo } from '@/lib/video-generator'
import { uploadBufferToR2 } from '@/lib/r2'

// Videos stored in R2

const Schema = z.object({
  template: z.enum(['tips', 'antes_despues', 'showcase', 'problema_solucion']),
  topic: z.string().min(3).max(200),
  customPrompt: z.string().max(400).optional(),
})

const TEMPLATE_LABELS: Record<string, string> = {
  tips: '3 Tips',
  antes_despues: 'Antes / Después',
  showcase: 'Showcase',
  problema_solucion: 'Problema → Solución',
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const tenantId = session.user.tenantId

  const videos = await prisma.videoScript.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true, template: true, topic: true, status: true,
      outputUrl: true, thumbnailUrl: true, duration: true, error: true, createdAt: true,
    },
  })
  return NextResponse.json(videos)
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { limit: 10, windowMs: 60 * 60 * 1000, keyPrefix: "videos" })
  if (limited) return limited

  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const tenantId = session.user.tenantId

  const body = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const { template, topic, customPrompt } = parsed.data

  const record = await prisma.videoScript.create({
    data: { tenantId, template, topic, status: 'processing' },
  })

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { brandVoice: true },
  })

  // Fire background generation — don't await
  generateVideoBackground(record.id, tenantId, template, topic, customPrompt || '', tenant).catch(async (err) => {
    await prisma.videoScript.update({
      where: { id: record.id },
      data: { status: 'error', error: err.message },
    })
  })

  return NextResponse.json({ id: record.id, status: 'processing' })
}

async function generateVideoBackground(
  id: string,
  tenantId: string,
  template: string,
  topic: string,
  customPrompt: string,
  tenant: any
) {
  const { mkdir } = await import('fs/promises')
  const { tmpdir } = await import('os')

  const bv = tenant?.brandVoice
  const brandName = tenant?.name || 'tu marca'
  const aiConfig = buildTenantAIConfig(tenant)
  const apiKey = aiConfig.apiKey || process.env.ANTHROPIC_API_KEY || ''

  const SYSTEM = bv
    ? 'Eres el estratega de contenido de ' + brandName + '. Tono: ' + (bv.tone || 'cercano') + '. ' + (bv.description || '')
    : 'Eres un estratega de contenido para redes sociales. Tono: cercano, directo, aspiracional.'

  const TEMPLATES_DESC: Record<string, string> = {
    tips: 'Genera un reel de 3 tips prácticos. slides: exactamente 3 objetos con label "TIP 1 DE 3", "TIP 2 DE 3", "TIP 3 DE 3". duration 5 cada uno.',
    antes_despues: 'Genera un reel Antes/Después. slides: 2 objetos — label "ANTES" bgVariant 0, label "DESPUÉS" bgVariant 1. duration 5 cada uno.',
    showcase: 'Genera un reel showcase de producto/servicio. slides: 3 objetos con los 3 beneficios principales, label "BENEFICIO 1/2/3". duration 4 cada uno.',
    problema_solucion: 'Genera un reel Problema→Solución. slides: 4 objetos — label "EL PROBLEMA", "LO QUE PIERDES", "LA SOLUCIÓN", "POR QUÉ NOSOTROS". duration 4/3/5/4.',
  }

  const prompt = [
    'Tema: ' + topic,
    customPrompt ? 'Contexto adicional: ' + customPrompt : '',
    '',
    TEMPLATES_DESC[template],
    '',
    'Responde SOLO en JSON válido sin markdown:',
    '{"hook":"frase de gancho max 5 palabras","hookSub":"subtítulo max 8 palabras","slides":[{"label":"...","labelColor":"7c3aed","main":"texto principal max 5 palabras","sub":"apoyo max 6 palabras","duration":5,"bgVariant":0}],"cta":"llamado a la acción max 5 palabras","ctaSub":"apoyo cta max 8 palabras","heroImagePrompt":"prompt en inglés para imagen de fondo cinematográfica vertical 9:16"}',
  ].filter(Boolean).join('\n')

  const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001', max_tokens: 1200,
      system: SYSTEM, messages: [{ role: 'user', content: prompt }],
    }),
  })
  const aiData = await aiRes.json()
  const rawText = aiData.content?.[0]?.text || '{}'
  let script: any = {}
  try { script = JSON.parse(rawText.replace(/```json|```/g, '').trim()) }
  catch { throw new Error('AI did not return valid JSON: ' + rawText.slice(0, 200)) }

  await prisma.videoScript.update({ where: { id }, data: { script } })

  // Generate hero image
  let heroImageUrl: string | undefined
  if (script.heroImagePrompt) {
    try {
      heroImageUrl = await generateImage(script.heroImagePrompt, 'REEL', 'emocional', '')
    } catch { /* use no hero image */ }
  }

  const outputPath = path.join(tmpdir(), id + '.mp4')
  const tmpDir    = path.join(tmpdir(), 'tmp_' + id)

  await assembleVideo(
    { ...script, heroImageUrl },
    template,
    outputPath,
    tmpDir
  )

  // Upload MP4 to R2
  const { readFile, unlink } = await import('fs/promises')
  const mp4Buffer = await readFile(outputPath)
  const r2Key     = 'videos/' + tenantId + '/' + id + '.mp4'
  const outputUrl = await uploadBufferToR2(r2Key, mp4Buffer, 'video/mp4')
  await unlink(outputPath).catch(() => {})

  // Estimate duration
  const totalSecs = 3 + (script.slides || []).reduce((a: number, s: any) => a + (s.duration || 4), 0) + 4

  await prisma.videoScript.update({
    where: { id },
    data: {
      status: 'done',
      outputUrl,
      thumbnailUrl: heroImageUrl || null,
      duration: totalSecs,
      script,
    },
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildTenantAIConfig } from '@/lib/ai-config'

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const tenantId = session.user.tenantId

  const lead = await prisma.socialLead.findFirst({
    where: { id: params.id, tenantId },
    include: {
      activities: { orderBy: { createdAt: 'desc' }, take: 10 },
      notes:      { orderBy: { createdAt: 'desc' }, take: 5 },
    },
  })
  if (!lead) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
  const aiConfig = buildTenantAIConfig(tenant)
  const apiKey = aiConfig.apiKey || process.env.ANTHROPIC_API_KEY || ''

  const daysSinceCreated = Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / 86400000)
  const daysSinceActivity = lead.lastActivity
    ? Math.floor((Date.now() - new Date(lead.lastActivity).getTime()) / 86400000)
    : daysSinceCreated

  const context = [
    'Lead: ' + (lead.nombre || 'Sin nombre'),
    'Etapa: ' + lead.stage,
    'Dias desde creacion: ' + daysSinceCreated,
    'Dias sin actividad: ' + daysSinceActivity,
    'Actividades: ' + lead.activities.length,
    lead.email ? 'Tiene email: si' : 'Tiene email: no',
    lead.dealValue ? 'Valor deal: $' + lead.dealValue : '',
    lead.closerName ? 'Closer asignado: ' + lead.closerName : 'Sin closer asignado',
    lead.activities.length > 0
      ? 'Ultimas actividades: ' + lead.activities.slice(0, 5).map(a => a.tipo + ': ' + (a.detalle || '')).join(' | ')
      : '',
    lead.notes.length > 0
      ? 'Notas: ' + lead.notes.slice(0, 3).map(n => n.body).join(' | ')
      : '',
  ].filter(Boolean).join('\n')

  const prompt = 'Analiza este lead de ventas y asigna un score de 0 a 100.\n\n' +
    context + '\n\n' +
    'Criterios: 0-30 frio/inactivo, 31-60 tibio/potencial, 61-80 caliente/activo, 81-100 muy caliente/listo para cerrar.\n' +
    'Responde SOLO en JSON: {"score":75,"reason":"explicacion corta max 20 palabras"}'

  const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-haiku-4-20250514',
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  const aiData = await aiRes.json()
  const raw = aiData.content?.[0]?.text || '{}'
  let result: any = {}
  try { result = JSON.parse(raw.replace(/```json|```/g, '').trim()) }
  catch { result = { score: 50, reason: 'Score automático' } }

  const score = Math.max(0, Math.min(100, Number(result.score) || 50))

  const updated = await prisma.socialLead.update({
    where: { id: params.id },
    data: {
      leadScore:   score,
      scoreReason: result.reason || null,
      lastActivity: new Date(),
    },
  })

  await prisma.leadActivity.create({
    data: {
      leadId:  params.id,
      tipo:    'score_update',
      detalle: 'Score IA: ' + score + '/100 — ' + (result.reason || ''),
    },
  })

  return NextResponse.json({ score, reason: result.reason, lead: updated })
}

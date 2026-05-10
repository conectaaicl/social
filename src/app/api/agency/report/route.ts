import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildTenantAIConfig } from '@/lib/ai-config'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const agencyTenantId = session.user.tenantId

  const agency = await prisma.tenant.findUnique({ where: { id: agencyTenantId } })
  if (!agency || agency.plan !== 'AGENCY') return NextResponse.json({ error: 'Plan AGENCY requerido' }, { status: 403 })

  const { clientId } = await req.json()
  const client = await prisma.tenant.findFirst({ where: { id: clientId, agencyId: agencyTenantId } })
  if (!client) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const [posts, prevPosts, leads, videos] = await Promise.all([
    prisma.post.findMany({
      where: { tenantId: clientId, status: 'PUBLISHED', publishedAt: { gte: monthStart } },
      select: { reach: true, likes: true, comments: true, caption: true, platform: true },
    }),
    prisma.post.findMany({
      where: { tenantId: clientId, status: 'PUBLISHED', publishedAt: { gte: prevMonthStart, lt: monthStart } },
      select: { reach: true, likes: true },
    }),
    prisma.socialLead.findMany({
      where: { tenantId: clientId },
      select: { stage: true, dealValue: true, leadScore: true, createdAt: true },
    }),
    prisma.videoScript.count({ where: { tenantId: clientId, status: 'done' } }).catch(() => 0),
  ])

  const reach   = posts.reduce((s, p) => s + (p.reach || 0), 0)
  const likes   = posts.reduce((s, p) => s + (p.likes || 0), 0)
  const prevReach = prevPosts.reduce((s, p) => s + (p.reach || 0), 0)
  const clientes  = leads.filter(l => l.stage === 'cliente').length
  const revenue   = leads.filter(l => l.stage === 'cliente').reduce((s, l) => s + (l.dealValue || 0), 0)
  const hotLeads  = leads.filter(l => l.leadScore >= 80).length

  const aiConfig = buildTenantAIConfig(agency)
  const apiKey = aiConfig.apiKey || process.env.ANTHROPIC_API_KEY || ''
  const month = now.toLocaleString('es-CL', { month: 'long', year: 'numeric' })

  const prompt = 'Genera un reporte ejecutivo mensual para el cliente "' + client.name + '" correspondiente a ' + month + '.\n\n' +
    'DATOS DEL MES:\n' +
    '- Posts publicados: ' + posts.length + ' (mes anterior: ' + prevPosts.length + ')\n' +
    '- Alcance total: ' + reach.toLocaleString('es-CL') + ' (anterior: ' + prevReach.toLocaleString('es-CL') + ')\n' +
    '- Likes totales: ' + likes.toLocaleString('es-CL') + '\n' +
    '- Leads totales: ' + leads.length + '\n' +
    '- Clientes cerrados: ' + clientes + '\n' +
    '- Revenue generado: $' + revenue.toLocaleString('es-CL') + '\n' +
    '- Leads calientes (score ≥80): ' + hotLeads + '\n' +
    '- Videos IA generados: ' + videos + '\n\n' +
    'Escribe un reporte ejecutivo profesional en español con: resumen ejecutivo (3 bullets), logros del mes, oportunidades, recomendaciones para el próximo mes. Tono: profesional y orientado a resultados. Max 300 palabras.'

  const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-haiku-4-20250514', max_tokens: 700, messages: [{ role: 'user', content: prompt }] }),
  })
  const aiData = await aiRes.json()
  const reportText = aiData.content?.[0]?.text || 'Error generando reporte'

  return NextResponse.json({
    client: client.name,
    month,
    stats: { posts: posts.length, reach, likes, leads: leads.length, clientes, revenue, hotLeads, videos },
    report: reportText,
  })
}

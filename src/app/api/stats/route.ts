import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getOswConversations } from '@/lib/osw'

export async function GET(_: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const tenantId = session.user.tenantId

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const weekStart  = new Date(now); weekStart.setDate(now.getDate() - 7)

  // Fetch everything in parallel
  const [leads, monthPosts, allPosts, videos, abTests, oswConvs] = await Promise.all([
    prisma.socialLead.findMany({
      where: { tenantId },
      select: { stage: true, leadScore: true, dealValue: true, closerName: true, createdAt: true, updatedAt: true },
    }),
    prisma.post.findMany({
      where: { tenantId, status: 'PUBLISHED', publishedAt: { gte: monthStart } },
      select: { reach: true, likes: true, comments: true, platform: true, publishedAt: true },
    }),
    prisma.post.findMany({
      where: { tenantId, status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      take: 30,
      select: { reach: true, likes: true, comments: true, publishedAt: true, caption: true },
    }),
    prisma.videoScript.count({ where: { tenantId, status: 'done' } }).catch(() => 0),
    prisma.aBTest.count({ where: { tenantId } }).catch(() => 0),
    getOswConversations(200).catch(() => []),
  ])

  // ── CRM metrics ──
  const totalLeads     = leads.length
  const byStage        = leads.reduce((acc, l) => { acc[l.stage] = (acc[l.stage] || 0) + 1; return acc }, {} as Record<string, number>)
  const clientes       = byStage['cliente'] || 0
  const calificados    = byStage['calificado'] || 0
  const revenue        = leads.filter(l => l.stage === 'cliente').reduce((s, l) => s + (l.dealValue || 0), 0)
  const avgScore       = totalLeads > 0 ? Math.round(leads.reduce((s, l) => s + l.leadScore, 0) / totalLeads) : 0
  const hotLeads       = leads.filter(l => l.leadScore >= 80).length
  const newThisWeek    = leads.filter(l => new Date(l.createdAt) >= weekStart).length
  const conversionRate = totalLeads > 0 ? ((clientes / totalLeads) * 100).toFixed(1) : '0'

  // ── Closer performance ──
  const closerMap: Record<string, { leads: number; clients: number; revenue: number; avgScore: number; scores: number[] }> = {}
  for (const l of leads) {
    if (!l.closerName) continue
    if (!closerMap[l.closerName]) closerMap[l.closerName] = { leads: 0, clients: 0, revenue: 0, avgScore: 0, scores: [] }
    closerMap[l.closerName].leads++
    closerMap[l.closerName].scores.push(l.leadScore)
    if (l.stage === 'cliente') {
      closerMap[l.closerName].clients++
      closerMap[l.closerName].revenue += l.dealValue || 0
    }
  }
  const closers = Object.entries(closerMap).map(([name, d]) => ({
    name,
    leads: d.leads,
    clients: d.clients,
    revenue: d.revenue,
    avgScore: d.scores.length > 0 ? Math.round(d.scores.reduce((a, b) => a + b, 0) / d.scores.length) : 0,
    conversionRate: d.leads > 0 ? Number(((d.clients / d.leads) * 100).toFixed(1)) : 0,
  })).sort((a, b) => b.revenue - a.revenue)

  // ── Content metrics ──
  const monthReach    = monthPosts.reduce((s, p) => s + (p.reach ?? 0), 0)
  const monthLikes    = monthPosts.reduce((s, p) => s + (p.likes ?? 0), 0)
  const monthComments = monthPosts.reduce((s, p) => s + (p.comments ?? 0), 0)
  const engagementRate = monthReach > 0 ? Number((((monthLikes + monthComments) / monthReach) * 100).toFixed(1)) : 0

  // Best post this month
  const bestPost = allPosts.reduce((best, p) => {
    const eng = (p.likes || 0) + (p.comments || 0)
    const bestEng = (best?.likes || 0) + (best?.comments || 0)
    return eng > bestEng ? p : best
  }, allPosts[0] || null)

  // ── OmniFlow / WhatsApp metrics ──
  const totalConvs     = oswConvs.length
  const openConvs      = oswConvs.filter(c => c.status === 'open').length
  const whatsappConvs  = oswConvs.filter(c => c.channel === 'whatsapp').length
  const igConvs        = oswConvs.filter(c => c.channel === 'instagram').length
  const botActive      = oswConvs.filter(c => c.bot_active).length
  const avgLeadScore   = oswConvs.length > 0
    ? Math.round(oswConvs.reduce((s, c) => s + (c.contact?.lead_score || 0), 0) / oswConvs.length)
    : 0

  // Intent breakdown from OmniFlow
  const intents: Record<string, number> = {}
  for (const c of oswConvs) {
    const intent = c.contact?.intent || 'unknown'
    intents[intent] = (intents[intent] || 0) + 1
  }
  const topIntents = Object.entries(intents)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([intent, count]) => ({ intent, count }))

  return NextResponse.json({
    generatedAt: now.toISOString(),

    crm: {
      totalLeads, byStage, clientes, calificados, hotLeads,
      newThisWeek, revenue, avgScore,
      conversionRate: Number(conversionRate),
      closers,
    },

    content: {
      publishedThisMonth: monthPosts.length,
      monthReach, monthLikes, monthComments, engagementRate,
      videosGenerated: videos,
      abTestsRun: abTests,
      bestPost: bestPost ? {
        caption: bestPost.caption?.slice(0, 60),
        likes: bestPost.likes,
        comments: bestPost.comments,
        reach: bestPost.reach,
      } : null,
    },

    omniflow: {
      totalConversations: totalConvs,
      openConversations: openConvs,
      whatsappConversations: whatsappConvs,
      instagramConversations: igConvs,
      botActiveCount: botActive,
      avgLeadScore,
      topIntents,
    },
  })
}

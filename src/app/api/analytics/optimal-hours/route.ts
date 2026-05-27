import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  const tenantId = session?.user?.tenantId
  if (!tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Get published posts with engagement data from the last 90 days
  const since = new Date()
  since.setDate(since.getDate() - 90)

  const posts = await prisma.post.findMany({
    where: {
      tenantId,
      status: 'PUBLISHED',
      publishedAt: { gte: since },
    },
    select: { publishedAt: true, likes: true, comments: true, reach: true, platform: true },
  })

  if (posts.length < 3) {
    // Not enough data — return generic best hours by platform
    return NextResponse.json({
      insufficient: true,
      message: 'Necesitas al menos 3 posts publicados para calcular horas optimas',
      generic: {
        instagram: [9, 11, 14, 17, 20],
        facebook: [9, 13, 15, 18, 20],
        general: [9, 12, 17, 20],
      },
    })
  }

  // Build hourly engagement map (0-23)
  const hourMap: Record<number, { total: number; count: number; score: number }> = {}
  for (let h = 0; h < 24; h++) hourMap[h] = { total: 0, count: 0, score: 0 }

  for (const p of posts) {
    if (!p.publishedAt) continue
    const hour = new Date(p.publishedAt).getHours()
    const score = (p.likes || 0) * 1 + (p.comments || 0) * 3 + (p.reach || 0) * 0.01
    hourMap[hour].total += score
    hourMap[hour].count += 1
    hourMap[hour].score = hourMap[hour].count > 0 ? hourMap[hour].total / hourMap[hour].count : 0
  }

  // Sort hours by average engagement score
  const ranked = Object.entries(hourMap)
    .map(([hour, data]) => ({
      hour: parseInt(hour),
      avgScore: data.count > 0 ? Math.round(data.score) : 0,
      postCount: data.count,
      label: formatHour(parseInt(hour)),
    }))
    .sort((a, b) => b.avgScore - a.avgScore)

  // Best 5 hours
  const best = ranked.filter(h => h.postCount > 0).slice(0, 5)
  const worst = ranked.filter(h => h.postCount > 0).slice(-3)

  // Day of week analysis
  const dayMap: Record<number, { total: number; count: number }> = {}
  for (let d = 0; d < 7; d++) dayMap[d] = { total: 0, count: 0 }
  for (const p of posts) {
    if (!p.publishedAt) continue
    const day = new Date(p.publishedAt).getDay()
    const score = (p.likes || 0) + (p.comments || 0) * 3
    dayMap[day].total += score
    dayMap[day].count += 1
  }
  const DAYS = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']
  const days = Object.entries(dayMap).map(([d, data]) => ({
    day: parseInt(d),
    label: DAYS[parseInt(d)],
    avgScore: data.count > 0 ? Math.round(data.total / data.count) : 0,
    postCount: data.count,
  })).sort((a, b) => b.avgScore - a.avgScore)

  return NextResponse.json({
    insufficient: false,
    totalPosts: posts.length,
    period: '90 dias',
    bestHours: best,
    worstHours: worst,
    allHours: ranked,
    bestDays: days.slice(0, 3),
    allDays: days,
    recommendation: best.length > 0
      ? 'Publica entre las ' + best[0].label + ' y ' + best[1]?.label + ' — tu audiencia esta mas activa en esos horarios'
      : 'Publica a las 9am, 12pm o 7pm para maxima visibilidad',
  })
}

function formatHour(h: number): string {
  if (h === 0) return '12am'
  if (h < 12) return h + 'am'
  if (h === 12) return '12pm'
  return (h - 12) + 'pm'
}

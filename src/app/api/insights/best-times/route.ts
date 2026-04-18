import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const posts = await prisma.post.findMany({
    where: { tenantId: session.user.tenantId, status: "PUBLISHED", publishedAt: { not: null } },
    select: { publishedAt: true, reach: true, likes: true, comments: true, type: true },
    take: 100,
  })

  if (posts.length < 3) {
    return NextResponse.json({
      bestHours: [],
      bestDays: [],
      heatmap: [],
      recommendation: "Necesitas al menos 3 posts publicados para generar predicciones.",
    })
  }

  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
  const heatmap: Array<{ day: number; hour: number; avgEng: number; count: number }> = []

  // Build engagement heatmap by day+hour
  const grid: Record<string, { total: number; count: number }> = {}
  for (const p of posts) {
    if (!p.publishedAt) continue
    const d = new Date(p.publishedAt)
    const day = d.getDay()
    const hour = d.getHours()
    const key = `${day}-${hour}`
    const eng = (p.likes ?? 0) + (p.comments ?? 0)
    if (!grid[key]) grid[key] = { total: 0, count: 0 }
    grid[key].total += eng
    grid[key].count += 1
  }

  for (const [key, val] of Object.entries(grid)) {
    const [day, hour] = key.split("-").map(Number)
    heatmap.push({ day, hour, avgEng: Math.round(val.total / val.count), count: val.count })
  }

  // Best hours (avg across all days)
  const hourMap: Record<number, number[]> = {}
  for (const h of heatmap) {
    if (!hourMap[h.hour]) hourMap[h.hour] = []
    hourMap[h.hour].push(h.avgEng)
  }
  const bestHours = Object.entries(hourMap)
    .map(([h, engs]) => ({ hour: Number(h), avg: Math.round(engs.reduce((a, b) => a + b, 0) / engs.length) }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5)

  // Best days
  const dayMap: Record<number, number[]> = {}
  for (const h of heatmap) {
    if (!dayMap[h.day]) dayMap[h.day] = []
    dayMap[h.day].push(h.avgEng)
  }
  const bestDays = Object.entries(dayMap)
    .map(([d, engs]) => ({ day: Number(d), name: dayNames[Number(d)], avg: Math.round(engs.reduce((a, b) => a + b, 0) / engs.length) }))
    .sort((a, b) => b.avg - a.avg)

  const topHour = bestHours[0]?.hour ?? 19
  const topDay = bestDays[0]?.name ?? "Miércoles"
  const recommendation = `Publica preferentemente los ${topDay} entre ${topHour}:00 y ${topHour + 1}:00 hrs para maximizar engagement.`

  return NextResponse.json({ bestHours, bestDays, heatmap, recommendation })
}

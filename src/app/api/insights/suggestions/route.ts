import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateContentSuggestions } from "@/lib/claude"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const tenantId = session.user.tenantId

  const [brandVoice, publishedPosts] = await Promise.all([
    prisma.brandVoice.findUnique({ where: { tenantId } }),
    prisma.post.findMany({
      where: { tenantId, status: "PUBLISHED" },
      select: { type: true, reach: true, likes: true, comments: true, publishedAt: true },
      orderBy: { publishedAt: "desc" },
      take: 50,
    }),
  ])

  if (!brandVoice) return NextResponse.json({ error: "Configura tu marca primero" }, { status: 400 })

  // Calculate analytics
  const typeEngagement: Record<string, number[]> = {}
  const dayEngagement: Record<number, number[]> = {}

  for (const p of publishedPosts) {
    const eng = (p.likes ?? 0) + (p.comments ?? 0)
    if (!typeEngagement[p.type]) typeEngagement[p.type] = []
    typeEngagement[p.type].push(eng)

    if (p.publishedAt) {
      const day = new Date(p.publishedAt).getDay()
      if (!dayEngagement[day]) dayEngagement[day] = []
      dayEngagement[day].push(eng)
    }
  }

  const topPostTypes = Object.entries(typeEngagement)
    .map(([type, engs]) => ({ type, avg: engs.reduce((a, b) => a + b, 0) / engs.length }))
    .sort((a, b) => b.avg - a.avg)
    .map((t) => t.type)

  const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
  const bestDay = Object.entries(dayEngagement)
    .map(([day, engs]) => ({ day: Number(day), avg: engs.reduce((a, b) => a + b, 0) / engs.length }))
    .sort((a, b) => b.avg - a.avg)[0]

  const avgReach = publishedPosts.length > 0
    ? Math.round(publishedPosts.reduce((s, p) => s + (p.reach ?? 0), 0) / publishedPosts.length)
    : 0

  const suggestions = await generateContentSuggestions({
    brandVoice: {
      industry: brandVoice.industry,
      description: brandVoice.description,
      tone: brandVoice.tone,
      products: brandVoice.products,
      keywords: brandVoice.keywords,
    },
    analytics: {
      topPostTypes: topPostTypes.slice(0, 3),
      bestEngagementDay: bestDay ? dayNames[bestDay.day] : "Sin datos",
      avgReach,
      totalPosts: publishedPosts.length,
    },
  })

  return NextResponse.json({ suggestions, analytics: { topPostTypes, avgReach, bestDay: bestDay ? dayNames[bestDay.day] : null } })
}

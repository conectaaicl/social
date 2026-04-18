import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { startOfMonth, endOfMonth, subDays, startOfDay, endOfDay } from "date-fns"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const tenantId = session.user.tenantId
  const now = new Date()

  const [
    totalPublished,
    totalScheduled,
    totalFailed,
    thisMonth,
    topPosts,
    dailyStats,
    typeBreakdown,
  ] = await Promise.all([
    prisma.post.count({ where: { tenantId, status: "PUBLISHED" } }),
    prisma.post.count({ where: { tenantId, status: "SCHEDULED" } }),
    prisma.post.count({ where: { tenantId, status: "FAILED" } }),
    prisma.post.findMany({
      where: {
        tenantId,
        status: "PUBLISHED",
        publishedAt: { gte: startOfMonth(now), lte: endOfMonth(now) },
      },
      select: { reach: true, likes: true, comments: true },
    }),
    prisma.post.findMany({
      where: { tenantId, status: "PUBLISHED" },
      orderBy: { reach: "desc" },
      take: 5,
      select: {
        id: true,
        caption: true,
        type: true,
        platform: true,
        reach: true,
        likes: true,
        comments: true,
        publishedAt: true,
        mediaUrls: true,
        thumbnailUrl: true,
      },
    }),
    Promise.all(
      Array.from({ length: 7 }, (_, i) => {
        const day = subDays(now, 6 - i)
        return prisma.post
          .count({
            where: {
              tenantId,
              status: "PUBLISHED",
              publishedAt: { gte: startOfDay(day), lte: endOfDay(day) },
            },
          })
          .then((count) => ({ date: day.toISOString().slice(0, 10), count }))
      })
    ),
    prisma.post.groupBy({
      by: ["type"],
      where: { tenantId, status: "PUBLISHED" },
      _count: { id: true },
    }),
  ])

  const monthReach = thisMonth.reduce((s, p) => s + (p.reach ?? 0), 0)
  const monthLikes = thisMonth.reduce((s, p) => s + (p.likes ?? 0), 0)
  const monthComments = thisMonth.reduce((s, p) => s + (p.comments ?? 0), 0)
  const engagementRate =
    monthReach > 0 ? (((monthLikes + monthComments) / monthReach) * 100).toFixed(2) : "0"

  return NextResponse.json({
    overview: {
      totalPublished,
      totalScheduled,
      totalFailed,
      thisMonthPosts: thisMonth.length,
      monthReach,
      monthLikes,
      monthComments,
      engagementRate: Number(engagementRate),
    },
    topPosts,
    dailyStats,
    typeBreakdown: typeBreakdown.map((t) => ({ type: t.type, count: t._count.id })),
  })
}

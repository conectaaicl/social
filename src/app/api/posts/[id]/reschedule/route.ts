import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const tenantId = session.user.tenantId

  const post = await prisma.post.findFirst({
    where: { id: params.id, tenantId, status: { in: ["SCHEDULED", "PENDING", "FAILED"] } },
  })
  if (!post) return NextResponse.json({ error: "Post no encontrado" }, { status: 404 })

  const body = await req.json().catch(() => ({}))

  // If explicit scheduledAt provided, just update it
  if (body.scheduledAt) {
    const updated = await prisma.post.update({
      where: { id: params.id },
      data: {
        scheduledAt: new Date(body.scheduledAt),
        status: "SCHEDULED",
        failReason: null,
        attempts: 0,
        nextAttemptAt: null,
      },
    })
    return NextResponse.json({ ok: true, scheduledAt: updated.scheduledAt })
  }

  // Auto-suggest: find best hour based on winning patterns for this tenant
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  const publishedPosts = await prisma.post.findMany({
    where: { tenantId, status: "PUBLISHED", publishedAt: { gte: since } },
    select: { publishedAt: true, likes: true, comments: true, reach: true },
    orderBy: { publishedAt: "desc" },
    take: 100,
  })

  let bestHour = 19 // sensible default for social media
  let bestDay = (new Date().getDay() + 1) % 7 || 1 // tomorrow

  if (publishedPosts.length >= 5) {
    const hourMap: Record<number, number> = {}
    for (const p of publishedPosts) {
      if (!p.publishedAt) continue
      const h = new Date(p.publishedAt).getHours()
      const score = (p.likes ?? 0) * 2 + (p.comments ?? 0) * 3 + (p.reach ?? 0) * 0.01
      hourMap[h] = (hourMap[h] ?? 0) + score
    }
    bestHour = Number(Object.entries(hourMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 19)
  }

  // Schedule for tomorrow at bestHour
  const suggested = new Date()
  suggested.setDate(suggested.getDate() + 1)
  suggested.setHours(bestHour, 0, 0, 0)

  const updated = await prisma.post.update({
    where: { id: params.id },
    data: {
      scheduledAt: suggested,
      status: "SCHEDULED",
      failReason: null,
      attempts: 0,
      nextAttemptAt: null,
    },
  })

  return NextResponse.json({
    ok: true,
    scheduledAt: updated.scheduledAt,
    bestHour,
    confidence: publishedPosts.length >= 10 ? "alta" : publishedPosts.length >= 5 ? "media" : "estimada",
    basedOn: publishedPosts.length,
  })
}

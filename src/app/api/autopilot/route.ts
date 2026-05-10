import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { subDays, startOfDay, endOfDay } from "date-fns"

// Mode logic:
//   no CalendarConfig        → "manual"
//   autoPublish = false      → "asistido"
//   autoPublish = true       → "autopiloto"

export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const tenantId = session.user.tenantId
  const now = new Date()
  const today = startOfDay(now)
  const weekAgo = subDays(now, 7)

  const [calendarConfig, brandVoice, socialAccounts, recentPosts, todayCreated, weekPublished, nextScheduled] = await Promise.all([
    prisma.calendarConfig.findUnique({ where: { tenantId } }),
    prisma.brandVoice.findUnique({ where: { tenantId }, select: { id: true } }),
    prisma.socialAccount.count({ where: { tenantId, active: true } }),
    prisma.post.findMany({
      where: { tenantId, createdAt: { gte: subDays(now, 3) } },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: { id: true, type: true, contentType: true, status: true, scheduledAt: true, publishedAt: true, createdAt: true, caption: true, thumbnailUrl: true },
    }),
    prisma.post.count({ where: { tenantId, createdAt: { gte: today, lte: endOfDay(now) } } }),
    prisma.post.count({ where: { tenantId, status: "PUBLISHED", publishedAt: { gte: weekAgo } } }),
    prisma.post.findFirst({
      where: { tenantId, status: "SCHEDULED", scheduledAt: { gte: now } },
      orderBy: { scheduledAt: "asc" },
      select: { id: true, scheduledAt: true, type: true, contentType: true, thumbnailUrl: true },
    }),
  ])

  let mode: "manual" | "asistido" | "autopiloto" = "manual"
  if (calendarConfig) {
    mode = calendarConfig.autoPublish ? "autopiloto" : "asistido"
  }

  const ready = {
    hasBrand: !!brandVoice,
    hasSocialAccounts: socialAccounts > 0,
    hasCalendarConfig: !!calendarConfig,
  }

  const scheduleSlots = (calendarConfig?.scheduleSlots as any[]) ?? []
  const contentMix = (calendarConfig?.contentMix as Record<string, number>) ?? {}

  return NextResponse.json({
    mode,
    ready,
    stats: {
      todayCreated,
      weekPublished,
      totalScheduled: await prisma.post.count({ where: { tenantId, status: "SCHEDULED" } }),
      nextScheduled,
    },
    schedule: {
      slots: scheduleSlots,
      contentMix,
      timezone: calendarConfig?.timezone ?? "America/Santiago",
      postsPerDay: calendarConfig?.postsPerDay ?? 0,
    },
    activity: recentPosts.map(p => ({
      id: p.id,
      type: p.type,
      contentType: p.contentType,
      status: p.status,
      scheduledAt: p.scheduledAt,
      publishedAt: p.publishedAt,
      createdAt: p.createdAt,
      caption: p.caption?.slice(0, 80) ?? "",
      thumbnailUrl: p.thumbnailUrl,
    })),
  })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const tenantId = session.user.tenantId
  const { mode } = await req.json()

  if (!["manual", "asistido", "autopiloto"].includes(mode)) {
    return NextResponse.json({ error: "Modo inválido" }, { status: 400 })
  }

  if (mode === "manual") {
    // Don't delete config, just disable autoPublish
    await prisma.calendarConfig.updateMany({
      where: { tenantId },
      data: { autoPublish: false },
    })
    return NextResponse.json({ ok: true, mode: "asistido" }) // stays asistido if config exists
  }

  const autoPublish = mode === "autopiloto"

  const existing = await prisma.calendarConfig.findUnique({ where: { tenantId } })
  if (existing) {
    await prisma.calendarConfig.update({
      where: { tenantId },
      data: { autoPublish },
    })
  } else {
    // Create default config
    await prisma.calendarConfig.create({
      data: {
        tenantId,
        autoPublish,
        scheduleSlots: [
          { time: "09:00", type: "feed" },
          { time: "13:00", type: "story" },
          { time: "19:00", type: "feed" },
        ],
        contentMix: { PRODUCTO: 30, PROYECTO: 25, TIP: 25, PROMO: 20 },
        postsPerDay: 3,
        timezone: "America/Santiago",
      },
    })
  }

  return NextResponse.json({ ok: true, mode })
}

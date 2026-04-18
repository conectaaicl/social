import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendWeeklyReport } from "@/lib/mail"
import { sendWeeklyWhatsAppReport } from "@/lib/whatsapp"
import { subDays, startOfDay } from "date-fns"

function verifyCronSecret(req: NextRequest) {
  const auth = req.headers.get("authorization")
  return auth === `Bearer ${process.env.CRON_SECRET}`
}

export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const since = startOfDay(subDays(new Date(), 7))

  const tenants = await prisma.tenant.findMany({
    where: { active: true },
    include: { users: { take: 1 } },
  })

  const results: Array<{ tenant: string; email: boolean; whatsapp: boolean }> = []

  for (const tenant of tenants) {
    const owner = tenant.users[0]
    if (!owner?.email) continue

    const [weekPosts, scheduledCount, allPublished] = await Promise.all([
      prisma.post.findMany({
        where: { tenantId: tenant.id, status: "PUBLISHED", publishedAt: { gte: since } },
        select: { reach: true, likes: true, comments: true, caption: true },
        orderBy: { reach: "desc" },
      }),
      prisma.post.count({ where: { tenantId: tenant.id, status: "SCHEDULED" } }),
      prisma.post.findMany({
        where: { tenantId: tenant.id, status: "PUBLISHED" },
        select: { reach: true, likes: true, comments: true },
      }),
    ])

    const weekReach = weekPosts.reduce((s, p) => s + (p.reach ?? 0), 0)
    const weekLikes = weekPosts.reduce((s, p) => s + (p.likes ?? 0), 0)
    const weekComments = weekPosts.reduce((s, p) => s + (p.comments ?? 0), 0)
    const totalReach = allPublished.reduce((s, p) => s + (p.reach ?? 0), 0)
    const topCaption = weekPosts[0]?.caption ?? "—"

    const summary = {
      publishedThisWeek: weekPosts.length,
      scheduledUpcoming: scheduledCount,
      totalReach,
      weekReach,
      weekLikes,
      weekComments,
      topCaption,
    }

    let emailSent = false
    let whatsappSent = false

    try {
      await sendWeeklyReport({
        email: owner.email,
        tenantName: tenant.name,
        ...summary,
      })
      emailSent = true
    } catch {}

    const ownerPhone = process.env.WHATSAPP_REPORT_PHONE
    if (ownerPhone && weekPosts.length > 0) {
      try {
        await sendWeeklyWhatsAppReport({
          phone: ownerPhone,
          tenantName: tenant.name,
          published: weekPosts.length,
          scheduled: scheduledCount,
          reach: weekReach,
          likes: weekLikes,
          topCaption,
        })
        whatsappSent = true
      } catch {}
    }

    results.push({ tenant: tenant.slug, email: emailSent, whatsapp: whatsappSent })
  }

  return NextResponse.json({ ok: true, results })
}

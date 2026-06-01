import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { publishPost } from "@/lib/publisher"

const MAX_ATTEMPTS = 5

function verifyCronSecret(req: NextRequest) {
  const auth = req.headers.get("authorization")
  return auth === `Bearer ${process.env.CRON_SECRET}`
}

export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()

  // Get tenants with autopilot ON (autoPublish = true)
  const activeTenants = await prisma.calendarConfig.findMany({
    where: { autoPublish: true },
    select: { tenantId: true },
  })
  const activeTenantIds = activeTenants.map(c => c.tenantId)

  // If no tenants have autopilot on, nothing to publish
  if (activeTenantIds.length === 0) {
    return NextResponse.json({ ok: true, checked: 0, published: 0, failed: 0, paused: true })
  }

  // SCHEDULED posts due now — only for active autopilot tenants
  const scheduled = await prisma.post.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { lte: now },
      tenantId: { in: activeTenantIds },
      tenant: { active: true },
    },
    select: { id: true, tenantId: true, scheduledAt: true },
    orderBy: { scheduledAt: "asc" },
    take: 20,
  })

  // Retry FAILED posts only for active autopilot tenants
  const retryable = await prisma.post.findMany({
    where: {
      status: "FAILED",
      attempts: { lt: MAX_ATTEMPTS },
      nextAttemptAt: { lte: now },
      tenantId: { in: activeTenantIds },
      tenant: { active: true },
    },
    select: { id: true, tenantId: true, scheduledAt: true },
    orderBy: { nextAttemptAt: "asc" },
    take: 10,
  })

  const duePosts = [...scheduled, ...retryable]
  const results: Array<{ postId: string; success: boolean; error?: string }> = []

  for (const post of duePosts) {
    try {
      const res = await publishPost(post.id, post.tenantId)
      const data = await res.json()
      if (!data.success) {
        await prisma.post.updateMany({
          where: { id: post.id, status: "FAILED" },
          data: {
            attempts: { increment: 1 },
            nextAttemptAt: computeNextAttempt(1),
          },
        })
      }
      results.push({ postId: post.id, success: data.success ?? false, error: data.error })
    } catch (err: any) {
      results.push({ postId: post.id, success: false, error: err.message })
    }
  }

  return NextResponse.json({
    ok: true,
    checked: duePosts.length,
    published: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results,
  })
}

function computeNextAttempt(attemptNumber: number): Date {
  const delays = [5, 15, 45, 120, 360]
  const minutes = delays[Math.min(attemptNumber, delays.length - 1)]
  return new Date(Date.now() + minutes * 60 * 1000)
}

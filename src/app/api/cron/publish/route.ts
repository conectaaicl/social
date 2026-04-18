import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { publishPost } from "@/lib/publisher"

function verifyCronSecret(req: NextRequest) {
  const auth = req.headers.get("authorization")
  return auth === `Bearer ${process.env.CRON_SECRET}`
}

export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const windowStart = new Date(now.getTime() - 8 * 60 * 1000) // 8 min before

  const duePosts = await prisma.post.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { lte: now, gte: windowStart },
      tenant: { active: true, calendar: { autoPublish: true } },
    },
    select: { id: true, tenantId: true },
  })

  const results: Array<{ postId: string; success: boolean; error?: string }> = []

  for (const post of duePosts) {
    try {
      const res = await publishPost(post.id, post.tenantId)
      const data = await res.json()
      results.push({ postId: post.id, success: data.success ?? false, error: data.error })
    } catch (err: any) {
      results.push({ postId: post.id, success: false, error: err.message })
    }
  }

  return NextResponse.json({
    ok: true,
    checked: duePosts.length,
    published: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  })
}

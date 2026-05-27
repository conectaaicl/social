import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

function verifyCronSecret(req: NextRequest) {
  const auth = req.headers.get("authorization")
  return auth === `Bearer ${process.env.CRON_SECRET}`
}

export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Fetch published posts with metaPostId that haven't been refreshed in 24h
  const since = new Date(Date.now() - 25 * 60 * 60 * 1000)
  const posts = await prisma.post.findMany({
    where: {
      status: "PUBLISHED",
      metaPostId: { not: null },
      OR: [
        { updatedAt: { lte: since } },
        { reach: null },
      ],
    },
    include: {
      socialAccount: { select: { accessToken: true, platform: true, accountId: true } },
    },
    take: 50,
    orderBy: { publishedAt: "desc" },
  })

  let updated = 0
  const errors: string[] = []

  for (const post of posts) {
    if (!post.metaPostId || !post.socialAccount?.accessToken) continue
    try {
      const platform = post.socialAccount.platform
      let metrics: { likes?: number; comments?: number; reach?: number; impressions?: number; saves?: number } = {}

      if (platform === "INSTAGRAM") {
        // Instagram Insights API
        const fields = "like_count,comments_count,reach,impressions,saved"
        const r = await fetch(
          `https://graph.facebook.com/v21.0/${post.metaPostId}/insights?metric=${fields}&access_token=${post.socialAccount.accessToken}`,
          { signal: AbortSignal.timeout(10000) }
        )
        const d = await r.json()
        if (!d.error && d.data) {
          const map: Record<string, number> = {}
          for (const item of d.data) map[item.name] = item.values?.[0]?.value ?? item.value ?? 0
          metrics = {
            likes: map["like_count"],
            comments: map["comments_count"],
            reach: map["reach"],
            saves: map["saved"],
          }
        }
      } else if (platform === "FACEBOOK") {
        // Facebook post insights
        const fields = "likes.summary(true),comments.summary(true),insights.metric(post_reach,post_impressions)"
        const r = await fetch(
          `https://graph.facebook.com/v21.0/${post.metaPostId}?fields=${fields}&access_token=${post.socialAccount.accessToken}`,
          { signal: AbortSignal.timeout(10000) }
        )
        const d = await r.json()
        if (!d.error) {
          metrics = {
            likes: d.likes?.summary?.total_count,
            comments: d.comments?.summary?.total_count,
            reach: d.insights?.data?.find((x: any) => x.name === "post_reach")?.values?.[0]?.value,
          }
        }
      }

      if (Object.keys(metrics).length > 0) {
        await prisma.post.update({
          where: { id: post.id },
          data: {
            likes: metrics.likes ?? post.likes,
            comments: metrics.comments ?? post.comments,
            reach: metrics.reach ?? post.reach,
          },
        })
        updated++
      }
    } catch (e: any) {
      errors.push(`${post.id}: ${e.message?.slice(0, 80)}`)
    }
  }

  console.log(`[insights-cron] checked=${posts.length} updated=${updated} errors=${errors.length}`)
  return NextResponse.json({ ok: true, checked: posts.length, updated, errors })
}

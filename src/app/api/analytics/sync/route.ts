import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getMediaInsights } from "@/lib/meta"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const tenantId = session.user.tenantId

  const posts = await prisma.post.findMany({
    where: {
      tenantId,
      status: "PUBLISHED",
      metaPostId: { not: null },
      publishedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
    select: { id: true, metaPostId: true, platform: true },
  })

  const accounts = await prisma.socialAccount.findMany({
    where: { tenantId, active: true },
    select: { platform: true, accessToken: true },
  })

  const tokenMap: Record<string, string> = {}
  for (const a of accounts) tokenMap[a.platform] = a.accessToken

  let synced = 0
  for (const post of posts) {
    if (!post.metaPostId) continue
    const platform = post.platform[0]
    const token = tokenMap[platform]
    if (!token) continue

    const insights = await getMediaInsights(post.metaPostId, token)
    if (insights.reach > 0 || insights.likes > 0) {
      await prisma.post.update({
        where: { id: post.id },
        data: {
          reach: insights.reach,
          likes: insights.likes,
          comments: insights.comments,
        },
      })
      synced++
    }
  }

  return NextResponse.json({ ok: true, synced, total: posts.length })
}

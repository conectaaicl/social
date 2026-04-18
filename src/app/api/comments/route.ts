import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getPostComments } from "@/lib/meta"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get("page") ?? "1")
  const limit = 20
  const replied = searchParams.get("replied")

  const [comments, total] = await Promise.all([
    prisma.postComment.findMany({
      where: {
        tenantId: session.user.tenantId,
        ...(replied === "false" ? { replied: false } : {}),
        ...(replied === "true" ? { replied: true } : {}),
      },
      include: { post: { select: { caption: true, type: true, mediaUrls: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.postComment.count({
      where: {
        tenantId: session.user.tenantId,
        ...(replied === "false" ? { replied: false } : {}),
      },
    }),
  ])

  return NextResponse.json({ comments, total })
}

// Sync comments from Meta for all published posts
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const tenantId = session.user.tenantId

  const recentPosts = await prisma.post.findMany({
    where: {
      tenantId,
      status: "PUBLISHED",
      metaPostId: { not: null },
      publishedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
    select: { id: true, metaPostId: true, caption: true, platform: true },
    take: 20,
  })

  const accounts = await prisma.socialAccount.findMany({
    where: { tenantId, active: true },
    select: { platform: true, accessToken: true },
  })
  const tokenMap: Record<string, string> = {}
  for (const a of accounts) tokenMap[a.platform] = a.accessToken

  let synced = 0
  for (const post of recentPosts) {
    if (!post.metaPostId) continue
    const token = tokenMap[post.platform[0]]
    if (!token) continue

    const metaComments = await getPostComments(post.metaPostId, token)
    for (const c of metaComments) {
      await prisma.postComment.upsert({
        where: { metaCommentId: c.id },
        create: {
          metaCommentId: c.id,
          username: c.username,
          text: c.text,
          postId: post.id,
          tenantId,
        },
        update: {},
      })
      synced++
    }
  }

  return NextResponse.json({ ok: true, synced })
}

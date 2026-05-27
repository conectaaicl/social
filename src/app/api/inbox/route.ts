import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const tenantId = session.user.tenantId

  const { searchParams } = req.nextUrl
  const filter = searchParams.get("filter") ?? "all"  // all | unreplied | comments | mentions
  const cursor = searchParams.get("cursor")
  const take = 30

  // Comments on own posts
  const commentsWhere: any = {
    tenantId,
    ...(filter === "unreplied" ? { replied: false } : {}),
    ...(cursor ? { id: { lt: cursor } } : {}),
  }

  const comments = await prisma.postComment.findMany({
    where: commentsWhere,
    include: {
      post: { select: { id: true, caption: true, mediaUrls: true, platform: true } },
    },
    orderBy: { createdAt: "desc" },
    take,
  })

  // Hashtag leads (mentions / leads from hashtag monitoring)
  const leadsWhere: any = {
    tenantId,
    ...(cursor ? { scannedAt: { lt: new Date(parseInt(cursor)) } } : {}),
  }
  const hashtagLeads = await prisma.hashtagLead.findMany({
    where: leadsWhere,
    include: { monitor: { select: { hashtag: true } } },
    orderBy: { scannedAt: "desc" },
    take: filter === "comments" ? 0 : take,
  })

  // Merge and sort by date
  const items = [
    ...comments.map(c => ({
      id: c.id,
      type: "comment" as const,
      from: c.username,
      text: c.text,
      platform: c.post.platform,
      postId: c.postId,
      postCaption: c.post.caption?.slice(0, 60),
      postImage: c.post.mediaUrls?.[0],
      replied: c.replied,
      sentiment: null,
      date: c.createdAt,
    })),
    ...(filter === "comments" ? [] : hashtagLeads.map(l => ({
      id: l.id,
      type: "mention" as const,
      from: l.username,
      text: l.caption?.slice(0, 200) ?? "",
      platform: ["INSTAGRAM"],
      postId: l.postUrl,
      postCaption: null,
      postImage: l.mediaUrl,
      replied: false,
      sentiment: l.sentiment,
      date: l.scannedAt,
    }))),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, take)

  const unrepliedCount = await prisma.postComment.count({ where: { tenantId, replied: false } })

  return NextResponse.json({
    items,
    unrepliedCount,
    hasMore: items.length === take,
    nextCursor: items[items.length - 1]?.id ?? null,
  })
}

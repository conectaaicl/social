import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getPostComments, replyToComment } from "@/lib/meta"
import { generateCommentReply } from "@/lib/claude"

function verifyCronSecret(req: NextRequest) {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`
}

export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const tenants = await prisma.tenant.findMany({
    where: {
      active: true,
      calendar: { autoReplyComments: true },
      brandVoice: { autoReply: true },
    },
    include: {
      brandVoice: true,
      calendar: true,
      socialAccounts: { where: { active: true } },
    },
  })

  const summary: Array<{ tenant: string; replied: number; errors: string[] }> = []

  for (const tenant of tenants) {
    if (!tenant.brandVoice) continue
    const errors: string[] = []
    let replied = 0

    const tokenMap: Record<string, string> = {}
    for (const a of tenant.socialAccounts) tokenMap[a.platform] = a.accessToken

    const recentPosts = await prisma.post.findMany({
      where: {
        tenantId: tenant.id,
        status: "PUBLISHED",
        metaPostId: { not: null },
        publishedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      select: { id: true, metaPostId: true, caption: true, platform: true },
      take: 10,
    })

    for (const post of recentPosts) {
      if (!post.metaPostId) continue
      const token = tokenMap[post.platform[0]]
      if (!token) continue

      const metaComments = await getPostComments(post.metaPostId, token)

      for (const c of metaComments) {
        const existing = await prisma.postComment.findUnique({ where: { metaCommentId: c.id } })

        if (!existing) {
          await prisma.postComment.create({
            data: { metaCommentId: c.id, username: c.username, text: c.text, postId: post.id, tenantId: tenant.id },
          })
        }

        if (existing?.replied) continue

        try {
          const replyText = await generateCommentReply({
            brandVoice: {
              tone: tenant.brandVoice.tone,
              description: tenant.brandVoice.description,
              language: tenant.brandVoice.language,
              autoReplyTone: tenant.brandVoice.autoReplyTone,
            },
            commentText: c.text,
            postCaption: post.caption,
          })

          await replyToComment(c.id, token, replyText)
          await prisma.postComment.update({
            where: { metaCommentId: c.id },
            data: { replied: true, replyText, repliedAt: new Date() },
          })
          replied++
        } catch (e: any) {
          errors.push(`Comment ${c.id}: ${e.message}`)
        }
      }
    }

    summary.push({ tenant: tenant.slug, replied, errors })
  }

  return NextResponse.json({ ok: true, summary })
}

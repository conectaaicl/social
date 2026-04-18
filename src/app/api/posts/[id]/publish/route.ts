import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  publishInstagramFeed,
  publishInstagramStory,
  publishInstagramReel,
  publishFacebookPost,
  publishFacebookStory,
  getMediaInsights,
} from "@/lib/meta"
import { sendPostPublished, sendPostFailed } from "@/lib/mail"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  return publishPost(params.id, session.user.tenantId)
}

export async function publishPost(postId: string, tenantId: string) {
  const post = await prisma.post.findFirst({
    where: { id: postId, tenantId },
    include: { socialAccount: true, tenant: { include: { users: { take: 1 } } } },
  })

  if (!post) return NextResponse.json({ error: "Post no encontrado" }, { status: 404 })
  if (post.status === "PUBLISHED") return NextResponse.json({ error: "Ya publicado" }, { status: 400 })
  if (post.status === "PUBLISHING") return NextResponse.json({ error: "Publicando..." }, { status: 409 })

  if (!post.mediaUrls.length) {
    return NextResponse.json({ error: "El post no tiene media asociada" }, { status: 400 })
  }

  await prisma.post.update({ where: { id: postId }, data: { status: "PUBLISHING" } })

  const mediaUrl = post.mediaUrls[0]
  const fullCaption = `${post.caption}\n\n${post.hashtags}`.trim()
  const metaPostIds: string[] = []

  try {
    for (const platform of post.platform) {
      const account = await prisma.socialAccount.findFirst({
        where: { tenantId, platform, active: true },
      })

      if (!account) {
        throw new Error(`No hay cuenta de ${platform} conectada`)
      }

      let metaId: string

      if (platform === "INSTAGRAM") {
        if (post.type === "STORY") {
          metaId = await publishInstagramStory(account.accountId, account.accessToken, mediaUrl)
        } else if (post.type === "REEL") {
          metaId = await publishInstagramReel(account.accountId, account.accessToken, mediaUrl, fullCaption)
        } else {
          metaId = await publishInstagramFeed(account.accountId, account.accessToken, mediaUrl, fullCaption)
        }
      } else {
        if (post.type === "STORY") {
          metaId = await publishFacebookStory(account.pageId ?? account.accountId, account.accessToken, mediaUrl)
        } else {
          metaId = await publishFacebookPost(account.pageId ?? account.accountId, account.accessToken, fullCaption, mediaUrl)
        }
      }

      metaPostIds.push(metaId)
    }

    await prisma.post.update({
      where: { id: postId },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
        metaPostId: metaPostIds[0],
      },
    })

    const ownerEmail = post.tenant.users[0]?.email
    if (ownerEmail) {
      await sendPostPublished({
        email: ownerEmail,
        tenantName: post.tenant.name,
        caption: post.caption,
        platforms: post.platform,
        postType: post.type,
      }).catch(() => {})
    }

    return NextResponse.json({ success: true, metaPostIds })
  } catch (err: any) {
    console.error(`Publish error for post ${postId}:`, err)

    await prisma.post.update({
      where: { id: postId },
      data: { status: "FAILED", failReason: err.message, failedAt: new Date() },
    })

    const ownerEmail = post.tenant.users[0]?.email
    if (ownerEmail) {
      await sendPostFailed({
        email: ownerEmail,
        tenantName: post.tenant.name,
        caption: post.caption,
        platforms: post.platform,
        error: err.message,
      }).catch(() => {})
    }

    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

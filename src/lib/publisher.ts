import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  publishInstagramFeed,
  publishInstagramStory,
  publishInstagramReel,
  publishFacebookPost,
  publishFacebookStory,
} from "@/lib/meta"
import { publishTikTokVideo, publishTikTokPhoto, refreshTikTokToken } from "@/lib/tiktok"
import { publishLinkedInPost, refreshLinkedInToken } from "@/lib/linkedin"
import { publishYouTubeShort, refreshYouTubeToken } from "@/lib/youtube"
import { sendPostPublished, sendPostFailed } from "@/lib/mail"
import { sendPostPublishedWhatsApp } from "@/lib/whatsapp"

export async function publishPost(postId: string, tenantId: string) {
  const post = await prisma.post.findFirst({
    where: { id: postId, tenantId },
    include: { socialAccount: true, tenant: { include: { users: { take: 1 } } } },
  })

  if (!post) return NextResponse.json({ error: "Post no encontrado" }, { status: 404 })
  if (post.status === "PUBLISHED") return NextResponse.json({ error: "Ya publicado" }, { status: 400 })
  if (post.status === "PUBLISHING") return NextResponse.json({ error: "Publicando..." }, { status: 409 })
  if (!post.mediaUrls.length) return NextResponse.json({ error: "Sin media" }, { status: 400 })

  // Atomic claim: only proceed if still SCHEDULED
  const claimed = await prisma.post.updateMany({
    where: { id: postId, tenantId, status: "SCHEDULED" },
    data: { status: "PUBLISHING" },
  })
  if (claimed.count === 0) return NextResponse.json({ error: "Post ya está siendo procesado" }, { status: 409 })

  const mediaUrl = post.mediaUrls[0]
  const fullCaption = `${post.caption}\n\n${post.hashtags}`.trim()
  const metaPostIds: string[] = []

  try {
    const platformErrors: string[] = []

    for (const platform of post.platform) {
      try {
        const account = await prisma.socialAccount.findFirst({
          where: { tenantId, platform, active: true },
        })
        if (!account) { platformErrors.push(`${platform}: sin cuenta`); continue }

        let metaId: string

        if (platform === "INSTAGRAM") {
          if (post.type === "STORY") {
            metaId = await publishInstagramStory(account.accountId, account.accessToken, mediaUrl)
          } else if (post.type === "REEL") {
            metaId = await publishInstagramReel(account.accountId, account.accessToken, mediaUrl, fullCaption)
          } else {
            metaId = await publishInstagramFeed(account.accountId, account.accessToken, mediaUrl, fullCaption)
          }
        } else if (platform === "TIKTOK") {
          // Auto-refresh TikTok token if expired
          let tiktokToken = account.accessToken
          if (account.tokenExpiresAt && account.tokenExpiresAt < new Date()) {
            if (account.refreshToken) {
              const refreshed = await refreshTikTokToken(account.refreshToken)
              tiktokToken = refreshed.access_token
              await prisma.socialAccount.update({
                where: { id: account.id },
                data: {
                  accessToken: refreshed.access_token,
                  refreshToken: refreshed.refresh_token,
                  tokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
                },
              })
            }
          }
          if (post.type === "REEL" || post.mediaUrls[0]?.match(/\.mp4/i)) {
            metaId = await publishTikTokVideo(tiktokToken, mediaUrl, post.caption.slice(0, 150) || "Nuevo video", { privacyLevel: "PUBLIC_TO_EVERYONE" })
          } else {
            metaId = await publishTikTokPhoto(tiktokToken, post.mediaUrls, post.caption.slice(0, 150) || "Nueva publicacion", fullCaption)
          }
        } else if (platform === "LINKEDIN") {
          let liToken = account.accessToken
          if (account.tokenExpiresAt && account.tokenExpiresAt < new Date() && account.refreshToken) {
            const refreshed = await refreshLinkedInToken(account.refreshToken)
            liToken = refreshed.access_token
            await prisma.socialAccount.update({
              where: { id: account.id },
              data: { accessToken: refreshed.access_token, tokenExpiresAt: refreshed.expires_in ? new Date(Date.now() + refreshed.expires_in * 1000) : null },
            })
          }
          const authorUrn = account.openId ?? ("urn:li:person:" + account.accountId)
          metaId = await publishLinkedInPost(liToken, authorUrn, fullCaption, post.mediaUrls[0])
        } else if (platform === "YOUTUBE") {
          if (post.type !== "REEL") { platformErrors.push("YOUTUBE: solo se publican Reels/videos"); continue }
          let ytToken = account.accessToken
          if (account.tokenExpiresAt && account.tokenExpiresAt < new Date() && account.refreshToken) {
            const refreshed = await refreshYouTubeToken(account.refreshToken)
            ytToken = refreshed.access_token
            await prisma.socialAccount.update({
              where: { id: account.id },
              data: { accessToken: refreshed.access_token, tokenExpiresAt: refreshed.expires_in ? new Date(Date.now() + refreshed.expires_in * 1000) : null },
            })
          }
          metaId = await publishYouTubeShort(ytToken, post.mediaUrls[0], post.caption.slice(0, 100) || "Nuevo video", fullCaption)
        } else {
          if (post.type === "STORY") {
            metaId = await publishFacebookStory(account.pageId ?? account.accountId, account.accessToken, mediaUrl)
          } else {
            metaId = await publishFacebookPost(account.pageId ?? account.accountId, account.accessToken, fullCaption, mediaUrl)
          }
        }
        metaPostIds.push(metaId)
      } catch (platformErr: any) {
        platformErrors.push(`${platform}: ${platformErr.message}`)
        console.warn(`Platform ${platform} failed:`, platformErr.message)
      }
    }

    if (metaPostIds.length === 0 && platformErrors.length > 0) {
      throw new Error(platformErrors.join(" | "))
    }

    await prisma.post.update({
      where: { id: postId },
      data: { status: "PUBLISHED", publishedAt: new Date(), metaPostId: metaPostIds[0] },
    })

    const ownerEmail = post.tenant.users[0]?.email
    if (ownerEmail) {
      sendPostPublished({
        email: ownerEmail,
        tenantName: post.tenant.name,
        caption: post.caption,
        platforms: post.platform,
        postType: post.type,
      }).catch(() => {})
    }

    const waPhone = process.env.APPROVAL_WHATSAPP_PHONE
    if (waPhone) {
      sendPostPublishedWhatsApp({
        phone: waPhone,
        platform: post.platform.join(" + "),
        postType: post.type,
        caption: post.caption,
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
      sendPostFailed({
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

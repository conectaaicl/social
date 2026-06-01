import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getPostComments, replyToComment } from "@/lib/meta"
import { generateCommentReply } from "@/lib/claude"
import { getLinkedInPostComments } from "@/lib/linkedin"

const ADMIN_PHONE = process.env.APPROVAL_WHATSAPP_PHONE ?? ""
const EVO_BASE = process.env.EVOLUTION_API_URL ?? ""
const EVO_KEY = process.env.EVOLUTION_API_KEY ?? ""
const EVO_INSTANCE = process.env.EVOLUTION_INSTANCE ?? "social"

async function notifyWhatsApp(text: string) {
  if (!ADMIN_PHONE || !EVO_BASE) return
  await fetch(`${EVO_BASE}/message/sendText/${EVO_INSTANCE}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: EVO_KEY },
    body: JSON.stringify({ number: ADMIN_PHONE, text }),
  }).catch(() => {})
}

function verifyCronSecret(req: NextRequest) {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`
}

export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const tenants = await prisma.tenant.findMany({
    where: { active: true },
    include: {
      brandVoice: true,
      calendar: true,
      socialAccounts: { where: { active: true } },
    },
  })

  const summary: Array<{ tenant: string; replied: number; newComments: number; errors: string[] }> = []

  for (const tenant of tenants) {
    const errors: string[] = []
    let replied = 0
    let newComments = 0

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
      take: 20,
    })

    for (const post of recentPosts) {
      if (!post.metaPostId) continue

      // --- META (Instagram / Facebook) ---
      const metaPlatform = post.platform.find(p => p === "INSTAGRAM" || p === "FACEBOOK")
      if (metaPlatform) {
        const token = tokenMap[metaPlatform]
        if (token) {
          try {
            const metaComments = await getPostComments(post.metaPostId, token)
            for (const c of metaComments) {
              const existing = await prisma.postComment.findUnique({ where: { metaCommentId: c.id } })
              if (!existing) {
                await prisma.postComment.create({
                  data: { metaCommentId: c.id, username: c.username, text: c.text, postId: post.id, tenantId: tenant.id },
                })
                newComments++
                const platform = metaPlatform === "INSTAGRAM" ? "📸 Instagram" : "📘 Facebook"
                await notifyWhatsApp(
                  `💬 *Nuevo comentario en ${platform}*\n\n👤 @${c.username}:\n_"${c.text.slice(0, 200)}"_\n\n📝 Post: ${post.caption.slice(0, 80)}...\n\n🔗 Ver bandeja: https://social.conectaai.cl/dashboard/inbox`
                )
              }

              if (existing?.replied) continue
              if (!tenant.brandVoice?.autoReply || !tenant.calendar?.autoReplyComments) continue

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
          } catch (e: any) {
            errors.push(`Meta comments: ${e.message}`)
          }
        }
      }

      // --- LINKEDIN ---
      if (post.platform.includes("LINKEDIN") && tokenMap["LINKEDIN"]) {
        try {
          const liComments = await getLinkedInPostComments(tokenMap["LINKEDIN"], post.metaPostId)
          for (const c of liComments) {
            const commentKey = "li_" + c.id
            const existing = await prisma.postComment.findUnique({ where: { metaCommentId: commentKey } })
            if (!existing) {
              await prisma.postComment.create({
                data: { metaCommentId: commentKey, username: c.authorName, text: c.text, postId: post.id, tenantId: tenant.id },
              })
              newComments++
              await notifyWhatsApp(
                `💬 *Nuevo comentario en 💼 LinkedIn*\n\n👤 ${c.authorName}:\n_"${c.text.slice(0, 200)}"_\n\n📝 Post: ${post.caption.slice(0, 80)}...\n\n🔗 Ver bandeja: https://social.conectaai.cl/dashboard/inbox`
              )
            }
          }
        } catch (e: any) {
          errors.push(`LinkedIn comments: ${e.message}`)
        }
      }
    }

    summary.push({ tenant: tenant.slug, replied, newComments, errors })
  }

  return NextResponse.json({ ok: true, summary })
}

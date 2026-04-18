import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generatePostContent } from "@/lib/claude"
import { generateImage } from "@/lib/fal"
import { animateImageToVideo } from "@/lib/replicate"
import { buildDailySchedule } from "@/lib/scheduler"

function verifyCronSecret(req: NextRequest) {
  const auth = req.headers.get("authorization")
  return auth === `Bearer ${process.env.CRON_SECRET}`
}

export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const targetDate = body.date ? new Date(body.date) : new Date()
  const tenantSlug: string | undefined = body.tenant

  const tenants = await prisma.tenant.findMany({
    where: {
      active: true,
      ...(tenantSlug ? { slug: tenantSlug } : {}),
      brandVoice: { isNot: null },
      calendar: { isNot: null },
      socialAccounts: { some: { active: true } },
    },
    include: {
      brandVoice: true,
      calendar: true,
      socialAccounts: { where: { active: true } },
    },
  })

  const results: Record<string, { created: number; errors: string[] }> = {}

  for (const tenant of tenants) {
    const errors: string[] = []
    let created = 0

    if (!tenant.brandVoice || !tenant.calendar) continue

    const slots = buildDailySchedule({
      scheduleSlots: tenant.calendar.scheduleSlots as any,
      contentMix: tenant.calendar.contentMix as Record<string, number>,
      timezone: tenant.calendar.timezone,
      date: targetDate,
    })

    const platforms = [...new Set(tenant.socialAccounts.map((a) => a.platform))] as Array<"INSTAGRAM" | "FACEBOOK">
    if (!platforms.length) continue

    for (const slot of slots) {
      const alreadyExists = await prisma.post.findFirst({
        where: {
          tenantId: tenant.id,
          scheduledAt: {
            gte: new Date(slot.scheduledAt.getTime() - 5 * 60 * 1000),
            lte: new Date(slot.scheduledAt.getTime() + 5 * 60 * 1000),
          },
          status: { not: "FAILED" },
        },
      })

      if (alreadyExists) continue

      let postId: string | null = null

      try {
        const pending = await prisma.post.create({
          data: {
            type: slot.postType,
            contentType: slot.contentType,
            platform: platforms,
            status: "GENERATING",
            caption: "Generando...",
            hashtags: "",
            mediaUrls: [],
            scheduledAt: slot.scheduledAt,
            tenantId: tenant.id,
          },
        })
        postId = pending.id

        const content = await generatePostContent({
          brandVoice: {
            industry: tenant.brandVoice.industry,
            description: tenant.brandVoice.description,
            tone: tenant.brandVoice.tone,
            keywords: tenant.brandVoice.keywords,
            products: tenant.brandVoice.products,
            targetAudience: tenant.brandVoice.targetAudience,
            language: tenant.brandVoice.language,
            customPrompt: tenant.brandVoice.customPrompt,
          },
          postType: slot.postType,
          contentType: slot.contentType,
          platforms,
        })

        const imageUrl = await generateImage(content.imagePrompt, slot.postType)
        const mediaUrls: string[] = [imageUrl]
        let thumbnailUrl: string | undefined

        if (slot.postType === "REEL" && process.env.REPLICATE_API_TOKEN) {
          try {
            const videoUrl = await animateImageToVideo(imageUrl)
            mediaUrls[0] = videoUrl
            thumbnailUrl = imageUrl
          } catch (e: any) {
            errors.push(`Reel video gen failed: ${e.message}`)
          }
        }

        await prisma.post.update({
          where: { id: postId },
          data: {
            status: "SCHEDULED",
            caption: content.caption,
            hashtags: content.hashtags,
            imagePrompt: content.imagePrompt,
            videoPrompt: content.videoPrompt,
            mediaUrls,
            thumbnailUrl,
          },
        })
        created++
      } catch (err: any) {
        errors.push(err.message)
        if (postId) {
          await prisma.post.update({
            where: { id: postId },
            data: { status: "FAILED", failReason: err.message, failedAt: new Date() },
          })
        }
      }
    }

    results[tenant.slug] = { created, errors }
  }

  return NextResponse.json({ ok: true, date: targetDate.toISOString(), results })
}

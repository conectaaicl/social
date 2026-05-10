import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generatePostContent, type AIConfig } from "@/lib/claude"
import { buildTenantAIConfig } from "@/lib/ai-config"
import { generateImage, type ImageCreativeStyle } from "@/lib/fal"
import { animateImageToVideo } from "@/lib/replicate"
import { applyBrandOverlayAndUpload } from "@/lib/brand-overlay"
import { sendApprovalRequest } from "@/lib/approval-pipeline"
import { z } from "zod"

const generateSchema = z.object({
  postType: z.enum(["FEED", "STORY", "CAROUSEL", "REEL"]),
  contentType: z.enum(["PRODUCTO", "PROYECTO", "TIP", "PROMO"]),
  platforms: z.array(z.enum(["INSTAGRAM", "FACEBOOK"])).min(1),
  scheduledAt: z.string().datetime(),
  customCaption: z.string().optional(),
  customHashtags: z.string().optional(),
  libraryImageUrl: z.string().url().optional(),
  imageStyle: z.enum(["catalogo", "ugc", "emocional", "comparativo"]).optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await req.json()
  const parsed = generateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 })
  }

  const { postType, contentType, platforms, scheduledAt, customCaption, customHashtags, libraryImageUrl, imageStyle } = parsed.data

  const brandVoice = await prisma.brandVoice.findUnique({
    where: { tenantId: session.user.tenantId },
  })

  if (!brandVoice) {
    return NextResponse.json(
      { error: "Configura tu marca primero en /dashboard/brand" },
      { status: 400 }
    )
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { name: true, aiProvider: true, openaiApiKey: true, anthropicApiKey: true, groqApiKey: true },
  })

  // Build per-tenant AI config
  const aiConfig = buildTenantAIConfig(tenant)

  const socialAccount = await prisma.socialAccount.findFirst({
    where: { tenantId: session.user.tenantId, platform: platforms[0], active: true },
  })

  let postId: string | null = null

  try {
    const pendingPost = await prisma.post.create({
      data: {
        type: postType,
        contentType,
        platform: platforms,
        status: "GENERATING",
        caption: "Generando...",
        hashtags: "",
        mediaUrls: [],
        scheduledAt: new Date(scheduledAt),
        tenantId: session.user.tenantId,
        socialAccountId: socialAccount?.id,
      },
    })
    postId = pendingPost.id

    const content = await generatePostContent({
      brandVoice: {
        industry: brandVoice.industry,
        description: brandVoice.description,
        tone: brandVoice.tone,
        keywords: brandVoice.keywords,
        products: brandVoice.products,
        targetAudience: brandVoice.targetAudience,
        language: brandVoice.language,
        customPrompt: brandVoice.customPrompt,
      },
      postType,
      contentType,
      platforms,
      aiConfig,
    })

    let rawImageUrl: string
    let brandedImageUrl: string

    if (libraryImageUrl) {
      // Use library image directly — still apply brand overlay
      rawImageUrl = libraryImageUrl
      try {
        brandedImageUrl = await applyBrandOverlayAndUpload({
          imageUrl: rawImageUrl,
          brandName: tenant?.name ?? brandVoice.industry,
          brandColors: brandVoice.brandColors?.length ? brandVoice.brandColors : ["#1a1a2e"],
          postType,
        })
      } catch {
        brandedImageUrl = rawImageUrl
      }
    } else {
      // Build negative prompt: exclude common misidentification objects
      const negativePrompt = [
        'sofa', 'armchair', 'couch', 'furniture', 'chair', 'table', 'bed', 'lamp',
        'blurry', 'distorted', 'low quality', 'watermark', 'text', 'logo',
        'cartoon', 'anime', 'illustration', 'drawing', 'painting',
      ].join(', ')
      rawImageUrl = await generateImage(content.imagePrompt, postType, (imageStyle ?? "catalogo") as ImageCreativeStyle, negativePrompt)
      try {
        brandedImageUrl = await applyBrandOverlayAndUpload({
          imageUrl: rawImageUrl,
          brandName: tenant?.name ?? brandVoice.industry,
          brandColors: brandVoice.brandColors?.length ? brandVoice.brandColors : ["#1a1a2e"],
          postType,
        })
      } catch {
        brandedImageUrl = rawImageUrl
      }
    }

    const mediaUrls: string[] = [brandedImageUrl]
    let thumbnailUrl: string | undefined

    if (postType === "REEL" && process.env.REPLICATE_API_TOKEN && !libraryImageUrl) {
      try {
        const videoUrl = await animateImageToVideo(rawImageUrl)
        mediaUrls[0] = videoUrl
        thumbnailUrl = brandedImageUrl
      } catch (err) {
        console.error("Video generation failed, using image as fallback:", err)
      }
    }

    await prisma.mediaItem.create({
      data: {
        url: brandedImageUrl,
        type: postType === "REEL" && mediaUrls[0] !== brandedImageUrl ? "VIDEO" : "IMAGE",
        source: libraryImageUrl ? "UPLOADED" : "AI_GENERATED",
        prompt: libraryImageUrl ? null : content.imagePrompt,
        tenantId: session.user.tenantId,
        tags: [contentType.toLowerCase(), postType.toLowerCase()],
      },
    })

    const finalCaption = customCaption ?? content.caption
    const finalHashtags = customHashtags ?? content.hashtags

    await prisma.post.update({
      where: { id: postId },
      data: {
        status: "PENDING_APPROVAL",
        caption: finalCaption,
        hashtags: finalHashtags,
        imagePrompt: content.imagePrompt,
        videoPrompt: content.videoPrompt,
        mediaUrls,
        thumbnailUrl,
      },
    })

    const approvalPhone = process.env.APPROVAL_WHATSAPP_PHONE ?? ""
    if (approvalPhone) {
      try {
        await sendApprovalRequest(approvalPhone, {
          postId: postId!,
          tenantName: tenant?.name ?? "Social",
          caption: finalCaption,
          hashtags: finalHashtags,
          postType,
          contentType,
          platforms,
          scheduledAt: new Date(scheduledAt),
          mediaUrl: brandedImageUrl,
        })
      } catch (waErr) {
        console.error("WhatsApp approval send failed:", waErr)
      }
    } else {
      await prisma.post.update({
        where: { id: postId },
        data: { status: "SCHEDULED" },
      })
    }

    const updatedPost = await prisma.post.findUnique({ where: { id: postId! } })
    return NextResponse.json({ success: true, post: updatedPost })
  } catch (err: any) {
    console.error("Content generation error:", err)
    if (postId) {
      await prisma.post.update({
        where: { id: postId },
        data: { status: "FAILED", failReason: err.message, failedAt: new Date() },
      })
    }
    return NextResponse.json({ error: err.message ?? "Error generando contenido" }, { status: 500 })
  }
}

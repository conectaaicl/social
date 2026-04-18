import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generatePostContent } from "@/lib/claude"
import { generateImage } from "@/lib/fal"
import { animateImageToVideo } from "@/lib/replicate"
import { z } from "zod"

const generateSchema = z.object({
  postType: z.enum(["FEED", "STORY", "CAROUSEL", "REEL"]),
  contentType: z.enum(["PRODUCTO", "PROYECTO", "TIP", "PROMO"]),
  platforms: z.array(z.enum(["INSTAGRAM", "FACEBOOK"])).min(1),
  scheduledAt: z.string().datetime(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await req.json()
  const parsed = generateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 })
  }

  const { postType, contentType, platforms, scheduledAt } = parsed.data

  const brandVoice = await prisma.brandVoice.findUnique({
    where: { tenantId: session.user.tenantId },
  })

  if (!brandVoice) {
    return NextResponse.json(
      { error: "Configura tu marca primero en /dashboard/brand" },
      { status: 400 }
    )
  }

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
    })

    const imageUrl = await generateImage(content.imagePrompt, postType)

    const mediaUrls: string[] = [imageUrl]
    let thumbnailUrl: string | undefined

    if (postType === "REEL" && process.env.REPLICATE_API_TOKEN) {
      try {
        const videoUrl = await animateImageToVideo(imageUrl)
        mediaUrls[0] = videoUrl
        thumbnailUrl = imageUrl
      } catch (err) {
        console.error("Video generation failed, using image as fallback:", err)
      }
    }

    await prisma.mediaItem.create({
      data: {
        url: imageUrl,
        type: postType === "REEL" && mediaUrls[0] !== imageUrl ? "VIDEO" : "IMAGE",
        source: "AI_GENERATED",
        prompt: content.imagePrompt,
        tenantId: session.user.tenantId,
        tags: [contentType.toLowerCase(), postType.toLowerCase()],
      },
    })

    const updatedPost = await prisma.post.update({
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

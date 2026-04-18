import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generatePostContent } from "@/lib/claude"
import { generateImage } from "@/lib/fal"

const SLIDE_THEMES = [
  "opening hook — bold statement or question to grab attention",
  "problem or pain point the audience faces",
  "solution or benefit your product/service provides",
  "proof — result, testimonial, or before/after",
  "how it works — simple 3-step process",
  "call to action — save this post and contact us",
]

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await req.json()
  const { contentType = "PRODUCTO", platforms = ["INSTAGRAM"], scheduledAt, slides = 6 } = body

  const brandVoice = await prisma.brandVoice.findUnique({ where: { tenantId: session.user.tenantId } })
  if (!brandVoice) return NextResponse.json({ error: "Configura tu marca primero" }, { status: 400 })

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
    postType: "CAROUSEL",
    contentType,
    platforms,
  })

  // Generate multiple images for each slide with variation
  const slideCount = Math.min(slides, 6)
  const imagePromises = SLIDE_THEMES.slice(0, slideCount).map((theme, i) =>
    generateImage(
      `${content.imagePrompt}. Slide ${i + 1} of ${slideCount}: ${theme}. Consistent visual style, same color palette, same lighting.`,
      "CAROUSEL"
    )
  )

  let mediaUrls: string[] = []
  try {
    mediaUrls = await Promise.all(imagePromises)
  } catch {
    // Fallback: generate one image and use it for all slides
    const single = await generateImage(content.imagePrompt, "CAROUSEL")
    mediaUrls = Array(slideCount).fill(single)
  }

  const post = await prisma.post.create({
    data: {
      type: "CAROUSEL",
      contentType,
      platform: platforms,
      status: "SCHEDULED",
      caption: content.caption,
      hashtags: content.hashtags,
      imagePrompt: content.imagePrompt,
      mediaUrls,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(Date.now() + 60 * 60 * 1000),
      tenantId: session.user.tenantId,
    },
  })

  // Save all slides to media library
  await prisma.mediaItem.createMany({
    data: mediaUrls.map((url) => ({
      url,
      type: "IMAGE",
      source: "AI_GENERATED",
      prompt: content.imagePrompt,
      tenantId: session.user.tenantId,
      tags: ["carousel", contentType.toLowerCase()],
    })),
  })

  return NextResponse.json({ success: true, post, slideCount: mediaUrls.length })
}

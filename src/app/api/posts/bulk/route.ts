import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generatePostContent } from "@/lib/claude"
import { generateImage } from "@/lib/fal"
import { buildTenantAIConfig } from "@/lib/ai-config"
import { applyBrandOverlayAndUpload } from "@/lib/brand-overlay"
import { z } from "zod"

const itemSchema = z.object({
  topic: z.string().min(1),
  contentType: z.enum(["PRODUCTO", "PROYECTO", "TIP", "PROMO"]).default("PRODUCTO"),
  postType: z.enum(["FEED", "STORY", "CAROUSEL", "REEL"]).default("FEED"),
  platforms: z.array(z.enum(["INSTAGRAM", "FACEBOOK"])).default(["INSTAGRAM"]),
  scheduledAt: z.string().datetime(),
})

const bulkSchema = z.object({
  items: z.array(itemSchema).min(1).max(50),
  imageStyle: z.enum(["catalogo", "ugc", "emocional", "comparativo"]).default("catalogo"),
  generateImages: z.boolean().default(true),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const tenantId = session.user.tenantId

  const body = await req.json()
  const parsed = bulkSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 })

  const { items, imageStyle, generateImages } = parsed.data

  const [brandVoice, tenant, socialAccount] = await Promise.all([
    prisma.brandVoice.findUnique({ where: { tenantId } }),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true, aiProvider: true, openaiApiKey: true, anthropicApiKey: true, groqApiKey: true } }),
    prisma.socialAccount.findFirst({ where: { tenantId, platform: "INSTAGRAM", active: true } }),
  ])

  if (!brandVoice) return NextResponse.json({ error: "Configura tu marca primero en /dashboard/brand" }, { status: 400 })

  const aiConfig = buildTenantAIConfig(tenant)
  const results: Array<{ index: number; postId?: string; error?: string }> = []

  // Process each item sequentially to avoid rate limits
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    try {
      // Create placeholder post
      const post = await prisma.post.create({
        data: {
          type: item.postType,
          contentType: item.contentType,
          platform: item.platforms,
          status: "GENERATING",
          caption: "Generando...",
          hashtags: "",
          mediaUrls: [],
          scheduledAt: new Date(item.scheduledAt),
          tenantId,
          socialAccountId: socialAccount?.id,
        },
      })

      try {
        // Generate caption
        const content = await generatePostContent({
          postType: item.postType,
          contentType: item.contentType,

          platforms: item.platforms,
          brandVoice: { ...brandVoice, customPrompt: item.topic },

          aiConfig,
        })

        let mediaUrls: string[] = []
        if (generateImages && item.postType !== "REEL") {
          try {
            const imgUrl = await generateImage(content.imagePrompt, item.postType, imageStyle)
            const branded = await applyBrandOverlayAndUpload({
              imageUrl: imgUrl,
              brandName: brandVoice?.industry ?? tenant?.name ?? "Marca",
              brandColors: (brandVoice as any)?.brandColors?.length ? (brandVoice as any)?.brandColors : ["#1a1a2e"],
              postType: item.postType,
            })
            mediaUrls = [branded]
          } catch { /* image failed — continue without */ }
        }

        await prisma.post.update({
          where: { id: post.id },
          data: {
            status: "SCHEDULED",
            caption: content.caption,
            hashtags: content.hashtags,
            mediaUrls,
          },
        })
        results.push({ index: i, postId: post.id })
      } catch (genErr: any) {
        await prisma.post.update({
          where: { id: post.id },
          data: { status: "FAILED", failReason: genErr.message?.slice(0, 300) },
        })
        results.push({ index: i, postId: post.id, error: genErr.message?.slice(0, 100) })
      }
    } catch (e: any) {
      results.push({ index: i, error: e.message?.slice(0, 100) })
    }
  }

  const created = results.filter(r => r.postId && !r.error).length
  const failed = results.filter(r => r.error).length
  return NextResponse.json({ ok: true, total: items.length, created, failed, results })
}

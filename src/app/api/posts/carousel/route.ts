import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generatePostContent } from "@/lib/claude"
import { generateImage } from "@/lib/fal"
import { buildTenantAIConfig } from "@/lib/ai-config"
import { applyBrandOverlayAndUpload } from "@/lib/brand-overlay"

const SLIDE_THEMES = [
  "opening hook — bold statement or question to grab attention",
  "problem or pain point the audience faces",
  "solution or benefit your product/service provides",
  "proof — result, testimonial, or before/after",
  "how it works — simple 3-step process",
  "call to action — save this post and contact us",
]

const TIPS_THEMES = [
  "portada llamativa con el número de tips y tema central",
  "tip 1 — el más sorprendente o contraintuitivo",
  "tip 2 — el más práctico y fácil de aplicar hoy",
  "tip 3 — el más valioso o diferenciador",
  "resumen visual de los 3 tips con checklist",
  "llamado a la acción — guarda este post y escríbenos",
]

const ANTESDESPUES_THEMES = [
  "portada — la transformación que verás en este post",
  "situación ANTES — el problema o estado inicial",
  "detalle del problema — qué estaba mal o faltaba",
  "solución aplicada — qué se hizo diferente",
  "resultado DESPUÉS — el cambio visible y medible",
  "llamado a la acción — ¿quieres este resultado?",
]

function getThemes(template: string): string[] {
  if (template === "tips") return TIPS_THEMES
  if (template === "antes_despues") return ANTESDESPUES_THEMES
  return SLIDE_THEMES
}

function buildPromptForSlide(basePrompt: string, theme: string, slideIndex: number, total: number, template: string): string {
  if (template === "antes_despues" && slideIndex === 1) {
    return `${basePrompt}. BEFORE state — showing the problem, old condition, or initial situation. Slightly darker mood, imperfect or unfinished look. Slide ${slideIndex + 1}/${total}.`
  }
  if (template === "antes_despues" && slideIndex === 4) {
    return `${basePrompt}. AFTER state — showing the beautiful result, clean installation, perfect finish. Bright, polished, aspirational mood. Slide ${slideIndex + 1}/${total}.`
  }
  return `${basePrompt}. ${theme}. Consistent visual style, same color palette, same lighting. Slide ${slideIndex + 1}/${total}.`
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await req.json()
  const {
    contentType = "PRODUCTO",
    platforms = ["INSTAGRAM"],
    scheduledAt,
    slides = 6,
    template = "default",
  } = body

  const [brandVoice, tenant] = await Promise.all([
    prisma.brandVoice.findUnique({ where: { tenantId: session.user.tenantId } }),
    prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: { name: true, aiProvider: true, anthropicApiKey: true, openaiApiKey: true, groqApiKey: true },
    }),
  ])

  if (!brandVoice) return NextResponse.json({ error: "Configura tu marca primero" }, { status: 400 })

  const aiConfig = buildTenantAIConfig(tenant)

  // Build template-specific system hint for Claude
  const templateHint = template === "tips"
    ? "Este post es un carrusel de TIPS. El caption debe presentarlo como '3 consejos para...' o similar. Muy educativo y guardable."
    : template === "antes_despues"
    ? "Este post es un carrusel ANTES/DESPUÉS. El caption debe narrar la transformación, muy visual y aspiracional."
    : ""

  const content = await generatePostContent({
    aiConfig,
    brandVoice: {
      industry: brandVoice.industry,
      description: brandVoice.description,
      tone: brandVoice.tone,
      keywords: brandVoice.keywords,
      products: brandVoice.products,
      targetAudience: brandVoice.targetAudience,
      language: brandVoice.language,
      customPrompt: (brandVoice.customPrompt ?? "") + (templateHint ? "\n" + templateHint : ""),
    },
    postType: "CAROUSEL",
    contentType,
    platforms,
  })

  const themes = getThemes(template)
  const slideCount = Math.min(slides, 6)
  const negativePrompt = "blurry, distorted, watermark, text overlay, logo, low quality, cartoon, anime"

  const imagePromises = themes.slice(0, slideCount).map((theme, i) => {
    const slidePrompt = buildPromptForSlide(content.imagePrompt, theme, i, slideCount, template)
    return generateImage(slidePrompt, "CAROUSEL", "catalogo", negativePrompt)
      .then(url => applyBrandOverlayAndUpload({
        imageUrl: url,
        brandName: tenant?.name ?? brandVoice.industry,
        brandColors: brandVoice.brandColors?.length ? brandVoice.brandColors : ["#1a1a2e"],
        postType: "CAROUSEL",
      }).catch(() => url))
      .catch(async () => {
        // fallback: single image reused
        return generateImage(content.imagePrompt, "CAROUSEL", "catalogo").catch(() => "")
      })
  })

  let mediaUrls: string[] = []
  try {
    mediaUrls = (await Promise.all(imagePromises)).filter(Boolean)
  } catch {
    const single = await generateImage(content.imagePrompt, "CAROUSEL").catch(() => "")
    mediaUrls = Array(slideCount).fill(single).filter(Boolean)
  }

  const templateLabel = template === "tips" ? "TIPS" : template === "antes_despues" ? "ANTES/DESPUÉS" : "CARRUSEL"

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
      thumbnailUrl: mediaUrls[0] ?? null,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(Date.now() + 60 * 60 * 1000),
      tenantId: session.user.tenantId,
    },
  })

  await prisma.mediaItem.createMany({
    data: mediaUrls.filter(Boolean).map((url) => ({
      url,
      type: "IMAGE",
      source: "AI_GENERATED",
      prompt: content.imagePrompt,
      tenantId: session.user.tenantId,
      tags: ["carousel", template, contentType.toLowerCase()],
    })),
    skipDuplicates: true,
  })

  return NextResponse.json({ success: true, post, slideCount: mediaUrls.length, template: templateLabel })
}

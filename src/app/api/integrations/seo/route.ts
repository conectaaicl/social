/**
 * Integration: seo.conectaai.cl → social.conectaai.cl
 *
 * Called by n8n when a product on seo.conectaai.cl has a high health_score
 * or trending sales. Generates and schedules a social post automatically.
 *
 * Auth: Bearer token via INTEGRATION_SECRET env var
 * POST /api/integrations/seo
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generatePostContent } from "@/lib/claude"
import { generateImage } from "@/lib/fal"

function authOk(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? ""
  return auth === `Bearer ${process.env.INTEGRATION_SECRET}`
}

export async function POST(req: NextRequest) {
  if (!authOk(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await req.json()
  const {
    tenantSlug,          // slug del tenant en social.conectaai.cl
    product,             // { title, description, price, imageUrl, url, category }
    triggerReason,       // "high_health_score" | "trending" | "price_drop" | "new"
    platforms = ["INSTAGRAM", "FACEBOOK"],
  } = body

  if (!tenantSlug || !product?.title) {
    return NextResponse.json({ error: "tenantSlug y product.title son requeridos" }, { status: 400 })
  }

  // Find tenant
  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    include: { brandVoice: true },
  })
  if (!tenant || !tenant.active) {
    return NextResponse.json({ error: "Tenant no encontrado o inactivo" }, { status: 404 })
  }
  if (!tenant.brandVoice) {
    return NextResponse.json({ error: "Tenant sin configuración de marca" }, { status: 400 })
  }

  const bv = tenant.brandVoice

  // Map trigger to content type
  const contentType = triggerReason === "price_drop" ? "PROMO"
    : triggerReason === "new" ? "PRODUCTO"
    : "PRODUCTO"

  // Enrich brand voice prompt with product data
  const enrichedPrompt = `
Producto destacado: ${product.title}
${product.description ? `Descripción: ${product.description}` : ""}
${product.price ? `Precio: ${product.price}` : ""}
${product.category ? `Categoría: ${product.category}` : ""}
Motivo del post: ${
  triggerReason === "high_health_score" ? "Producto estrella con alta performance en MercadoLibre" :
  triggerReason === "trending" ? "Producto en tendencia con ventas al alza" :
  triggerReason === "price_drop" ? "Promoción especial - precio rebajado" :
  "Nuevo producto disponible"
}
${product.url ? `URL: ${product.url}` : ""}
  `.trim()

  // Generate content with Claude
  const content = await generatePostContent({
    brandVoice: {
      industry: bv.industry,
      description: bv.description,
      tone: bv.tone,
      keywords: bv.keywords,
      products: bv.products,
      targetAudience: bv.targetAudience,
      language: bv.language,
      customPrompt: enrichedPrompt,
    },
    postType: "FEED",
    contentType,
    platforms,
  })

  // Use product image if provided, otherwise generate with AI
  let mediaUrl = product.imageUrl ?? ""
  if (!mediaUrl) {
    mediaUrl = await generateImage(
      `${product.title}. ${content.imagePrompt}`,
      "FEED"
    )
  }

  // Schedule 2 hours from now (can be overridden via body.scheduledAt)
  const scheduledAt = body.scheduledAt
    ? new Date(body.scheduledAt)
    : new Date(Date.now() + 2 * 60 * 60 * 1000)

  const post = await prisma.post.create({
    data: {
      type: "FEED",
      contentType,
      platform: platforms,
      status: "SCHEDULED",
      caption: content.caption,
      hashtags: content.hashtags,
      imagePrompt: content.imagePrompt,
      mediaUrls: [mediaUrl],
      scheduledAt,
      tenantId: tenant.id,
    },
  })

  // Save to media library
  if (mediaUrl) {
    await prisma.mediaItem.create({
      data: {
        url: mediaUrl,
        type: "IMAGE",
        source: "AI_GENERATED",
        prompt: content.imagePrompt,
        tenantId: tenant.id,
        tags: ["seo-integration", contentType.toLowerCase(), product.category ?? "producto"],
      },
    })
  }

  return NextResponse.json({
    success: true,
    postId: post.id,
    scheduledAt: post.scheduledAt,
    caption: post.caption.slice(0, 100) + "…",
  })
}

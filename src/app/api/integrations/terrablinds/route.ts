/**
 * Integration: terrablinds.cl → social.conectaai.cl
 *
 * Called by terrablinds.cl FastAPI webhook when a product is created or updated.
 * Generates Feed + Story + Reel and schedules them automatically.
 *
 * Auth: Bearer token via INTEGRATION_SECRET env var
 * POST /api/integrations/terrablinds
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
    event = "product.created",  // product.created | product.updated | product.on_sale
    product,                    // { id, name, description, price, old_price?, imageUrl, url, category }
    tenantSlug = "terrablinds", // slug del tenant en social.conectaai.cl
    generateTypes = ["FEED", "STORY"],  // qué tipos de post generar
  } = body

  if (!product?.name) {
    return NextResponse.json({ error: "product.name es requerido" }, { status: 400 })
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    include: { brandVoice: true },
  })
  if (!tenant || !tenant.active) {
    return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 })
  }
  if (!tenant.brandVoice) {
    return NextResponse.json({ error: "Configura la marca primero" }, { status: 400 })
  }

  const bv = tenant.brandVoice

  const contentType = event === "product.on_sale" ? "PROMO" : "PRODUCTO"

  const productContext = `
Producto: ${product.name}
${product.description ? `Descripción: ${product.description}` : ""}
Precio: ${product.price}${product.old_price ? ` (antes: ${product.old_price})` : ""}
${product.category ? `Categoría: ${product.category}` : ""}
${product.url ? `Más info: ${product.url}` : ""}
${event === "product.on_sale" ? "¡OFERTA ESPECIAL! Aprovecha este precio limitado." : ""}
  `.trim()

  const platforms = ["INSTAGRAM", "FACEBOOK"]
  const createdPosts: { type: string; id: string; scheduledAt: Date }[] = []
  const baseDelay = 60 * 60 * 1000 // 1 hour between post types

  for (let i = 0; i < generateTypes.length; i++) {
    const postType = generateTypes[i] as "FEED" | "STORY" | "REEL"

    const content = await generatePostContent({
      brandVoice: {
        industry: bv.industry,
        description: bv.description,
        tone: bv.tone,
        keywords: bv.keywords,
        products: bv.products,
        targetAudience: bv.targetAudience,
        language: bv.language,
        customPrompt: productContext,
      },
      postType,
      contentType,
      platforms,
    })

    // Use product image for first post, generate AI images for others
    let mediaUrl = ""
    if (i === 0 && product.imageUrl) {
      mediaUrl = product.imageUrl
    } else {
      mediaUrl = await generateImage(content.imagePrompt, postType)
    }

    const scheduledAt = new Date(Date.now() + (i + 1) * baseDelay)

    const post = await prisma.post.create({
      data: {
        type: postType,
        contentType,
        platform: platforms as any,
        status: "SCHEDULED",
        caption: content.caption,
        hashtags: content.hashtags,
        imagePrompt: content.imagePrompt,
        mediaUrls: [mediaUrl],
        scheduledAt,
        tenantId: tenant.id,
      },
    })

    if (mediaUrl) {
      await prisma.mediaItem.create({
        data: {
          url: mediaUrl,
          type: "IMAGE",
          source: product.imageUrl && i === 0 ? "UPLOADED" : "AI_GENERATED",
          prompt: content.imagePrompt,
          tenantId: tenant.id,
          tags: ["terrablinds", contentType.toLowerCase(), postType.toLowerCase()],
        },
      })
    }

    createdPosts.push({ type: postType, id: post.id, scheduledAt })
  }

  return NextResponse.json({
    success: true,
    event,
    product: product.name,
    postsCreated: createdPosts.length,
    posts: createdPosts,
  })
}

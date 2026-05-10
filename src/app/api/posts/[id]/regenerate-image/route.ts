import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateImage, type ImageCreativeStyle } from "@/lib/fal"
import { applyBrandOverlayAndUpload } from "@/lib/brand-overlay"

const NEGATIVE_PROMPT = [
  'sofa', 'armchair', 'couch', 'furniture', 'chair', 'table', 'bed', 'lamp',
  'blurry', 'distorted', 'low quality', 'watermark', 'text', 'logo',
  'cartoon', 'anime', 'illustration', 'drawing', 'painting',
].join(', ')

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const post = await prisma.post.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  })
  if (!post) return NextResponse.json({ error: "Post no encontrado" }, { status: 404 })
  if (post.status === "PUBLISHED" || post.status === "PUBLISHING") {
    return NextResponse.json({ error: "No se puede editar un post publicado" }, { status: 400 })
  }

  const body = await req.json().catch(() => ({}))
  const imageStyle: ImageCreativeStyle = body.imageStyle ?? "catalogo"

  const [tenant, brandVoice] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: session.user.tenantId }, select: { name: true } }),
    prisma.brandVoice.findUnique({ where: { tenantId: session.user.tenantId } }),
  ])

  const imagePrompt = post.imagePrompt ?? post.caption.slice(0, 200)

  let rawImageUrl: string
  try {
    rawImageUrl = await generateImage(imagePrompt, post.type as any, imageStyle, NEGATIVE_PROMPT)
  } catch (err) {
    console.error("Image generation failed:", err)
    return NextResponse.json({ error: "Error al generar imagen con IA" }, { status: 500 })
  }

  let finalUrl = rawImageUrl
  try {
    finalUrl = await applyBrandOverlayAndUpload({
      imageUrl: rawImageUrl,
      brandName: tenant?.name ?? (brandVoice?.industry ?? "Marca"),
      brandColors: brandVoice?.brandColors?.length ? brandVoice.brandColors : ["#1a1a2e"],
      postType: post.type,
    })
  } catch {
    finalUrl = rawImageUrl
  }

  const updated = await prisma.post.update({
    where: { id: params.id },
    data: { mediaUrls: [finalUrl], thumbnailUrl: finalUrl },
  })

  return NextResponse.json({ success: true, mediaUrls: updated.mediaUrls, thumbnailUrl: updated.thumbnailUrl })
}

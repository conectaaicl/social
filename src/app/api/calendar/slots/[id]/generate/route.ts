import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generatePostContent } from "@/lib/claude"
import { buildTenantAIConfig } from "@/lib/ai-config"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params

  const slot = await prisma.calendarSlot.findFirst({
    where: { id, tenantId: session.user.tenantId },
  })
  if (!slot) return NextResponse.json({ error: "Slot no encontrado" }, { status: 404 })
  if (slot.postId) return NextResponse.json({ error: "Slot ya tiene post generado" }, { status: 400 })

  const brandVoice = await prisma.brandVoice.findUnique({ where: { tenantId: session.user.tenantId } })
  if (!brandVoice) return NextResponse.json({ error: "Configura tu marca primero en Mi Marca" }, { status: 400 })

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { name: true, anthropicApiKey: true, openaiApiKey: true, groqApiKey: true, aiProvider: true },
  })

  const formatMap: Record<string, string> = { carrusel: "CAROUSEL", reel: "REEL", historia: "STORY", imagen: "FEED" }
  const contentTypeMap: Record<string, string> = { educativo: "TIP", promocional: "PROMO", inspiracional: "TIP", engagement: "PRODUCTO", testimonial: "PROYECTO" }
  const postType = formatMap[slot.formato] ?? "FEED"
  const contentType = contentTypeMap[slot.objetivo] ?? "PRODUCTO"

  const aiConfig = buildTenantAIConfig(tenant)

  const content = await generatePostContent({
    brandVoice: {
      industry: brandVoice.industry,
      description: `${brandVoice.description}. Tema del post: ${slot.temaSugerido ?? "contenido de valor"}`,
      tone: brandVoice.tone,
      keywords: brandVoice.keywords ?? [],
      products: brandVoice.products ?? [],
      targetAudience: (brandVoice as any).targetAudience ?? "",
      language: (brandVoice as any).language ?? "es",
    },
    postType,
    contentType,
    platforms: ["INSTAGRAM", "FACEBOOK"],
    aiConfig,
  })

  const socialAccount = await prisma.socialAccount.findFirst({
    where: { tenantId: session.user.tenantId, active: true },
    select: { id: true },
  })

  const scheduledAt = new Date(slot.scheduledDate)
  const [h, m] = slot.timeSlot.split(":").map(Number)
  scheduledAt.setHours(h ?? 9, m ?? 0, 0, 0)

  const post = await prisma.post.create({
    data: {
      tenantId: session.user.tenantId,
      type: postType as any,
      contentType: contentType as any,
      platform: ["INSTAGRAM", "FACEBOOK"],
      status: "PENDING",
      caption: content.caption,
      hashtags: content.hashtags,
      mediaUrls: [],
      scheduledAt,
      imagePrompt: content.imagePrompt,
      videoPrompt: content.videoPrompt,
      ...(socialAccount ? { socialAccountId: socialAccount.id } : {}),
    },
  })

  await prisma.calendarSlot.update({ where: { id: slot.id }, data: { postId: post.id } })

  return NextResponse.json({ ok: true, postId: post.id, caption: content.caption })
}

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateCaptionForPhoto } from "@/lib/claude"
import { z } from "zod"

const schema = z.object({
  postType: z.enum(["FEED", "STORY", "CAROUSEL", "REEL"]),
  contentType: z.enum(["PRODUCTO", "PROYECTO", "TIP", "PROMO"]),
  platforms: z.array(z.enum(["INSTAGRAM", "FACEBOOK"])).min(1),
  imageDescription: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
  }

  const brandVoice = await prisma.brandVoice.findUnique({
    where: { tenantId: session.user.tenantId },
  })

  if (!brandVoice) {
    return NextResponse.json(
      { error: "Configura tu marca primero en Mi Marca" },
      { status: 400 }
    )
  }

  const { postType, contentType, platforms, imageDescription } = parsed.data

  const result = await generateCaptionForPhoto({
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
    imageDescription,
  })

  return NextResponse.json(result)
}

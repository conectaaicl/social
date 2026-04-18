import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generateCaptionVariants } from "@/lib/claude"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await req.json()
  const { postType, contentType, platforms } = body

  const brandVoice = await prisma.brandVoice.findUnique({
    where: { tenantId: session.user.tenantId },
  })
  if (!brandVoice) return NextResponse.json({ error: "Configura tu marca primero" }, { status: 400 })

  const variants = await generateCaptionVariants({
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
    baseImagePrompt: `${brandVoice.products[0] ?? brandVoice.industry} professional photo`,
  })

  return NextResponse.json({ variants })
}

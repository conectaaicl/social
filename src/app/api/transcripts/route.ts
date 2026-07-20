import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { analyzeTranscript } from "@/lib/claude"

export async function GET() {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const items = await prisma.transcriptInsight.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { createdAt: "desc" },
    take: 30,
  })
  return NextResponse.json({ items })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { title, sourceUrl, transcript } = await req.json()
  if (!transcript || typeof transcript !== "string" || transcript.trim().length < 100) {
    return NextResponse.json({ error: "Pega una transcripción de al menos 100 caracteres" }, { status: 400 })
  }

  const brandVoice = await prisma.brandVoice.findUnique({ where: { tenantId: session.user.tenantId } })
  if (!brandVoice) return NextResponse.json({ error: "Configura tu marca primero" }, { status: 400 })

  const result = await analyzeTranscript({
    transcript,
    brandVoice: { industry: brandVoice.industry, products: brandVoice.products },
  })

  const saved = await prisma.transcriptInsight.create({
    data: {
      tenantId: session.user.tenantId,
      title: title?.trim() || "Transcripción sin título",
      sourceUrl: sourceUrl?.trim() || null,
      transcript: transcript.slice(0, 20000),
      hooks: result.hooks,
      historias: result.historias,
      frameworks: result.frameworks,
      objeciones: result.objeciones,
      citas: result.citas,
    },
  })

  return NextResponse.json({ insight: saved })
}

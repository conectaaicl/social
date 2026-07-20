import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { analyzeConversations } from "@/lib/claude"
import { getOswConversations, getConversationMessages } from "@/lib/osw"

export async function GET() {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const items = await prisma.conversationInsight.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { createdAt: "desc" },
    take: 30,
  })
  return NextResponse.json({ items })
}

export async function POST() {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const brandVoice = await prisma.brandVoice.findUnique({ where: { tenantId: session.user.tenantId } })
  if (!brandVoice) return NextResponse.json({ error: "Configura tu marca primero" }, { status: 400 })

  let recent: Awaited<ReturnType<typeof getOswConversations>> = []
  try {
    recent = await getOswConversations(20)
  } catch {
    return NextResponse.json({ error: "No se pudo conectar con OmniFlow (OSW)" }, { status: 502 })
  }
  if (!recent.length) return NextResponse.json({ error: "No hay conversaciones en OmniFlow todavía" }, { status: 404 })

  const conversations = await Promise.all(
    recent.slice(0, 20).map(async (c) => {
      let msgs: any[] = []
      try { msgs = await getConversationMessages(c.id) } catch { msgs = [] }
      const texts = msgs
        .filter((m: any) => m.sender_type === "contact" && m.content_type === "text")
        .map((m: any) => m.content || "")
        .filter(Boolean)
      return { contactName: c.contact?.name || "Sin nombre", messages: texts }
    })
  )
  const withMessages = conversations.filter((c) => c.messages.length > 0)
  if (!withMessages.length) {
    return NextResponse.json({ error: "Las conversaciones encontradas no tienen mensajes del cliente" }, { status: 404 })
  }

  const result = await analyzeConversations({
    conversations: withMessages,
    brandVoice: { industry: brandVoice.industry, products: brandVoice.products },
  })

  const saved = await prisma.conversationInsight.create({
    data: {
      tenantId: session.user.tenantId,
      conversationsScanned: withMessages.length,
      objeciones: result.objeciones,
      urgencia: result.urgencia,
      frasesReales: result.frasesReales,
      temasComunes: result.temasComunes,
    },
  })

  return NextResponse.json({ insight: saved })
}

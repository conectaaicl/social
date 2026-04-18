import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const brandSchema = z.object({
  industry: z.string().min(2),
  description: z.string().min(10),
  tone: z.string().min(2),
  keywords: z.array(z.string()),
  products: z.array(z.string()),
  targetAudience: z.string().min(10),
  language: z.string().default("es-CL"),
  customPrompt: z.string().optional(),
  contentMix: z.record(z.number()),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const parsed = brandSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 })
    }

    const brandVoice = await prisma.brandVoice.upsert({
      where: { tenantId: session.user.tenantId },
      update: parsed.data,
      create: {
        ...parsed.data,
        tenantId: session.user.tenantId,
      },
    })

    // Crear/actualizar CalendarConfig con el contentMix
    const slots = [
      { time: "09:00", type: "feed" },
      { time: "13:00", type: "story" },
      { time: "19:00", type: "feed" },
    ]

    await prisma.calendarConfig.upsert({
      where: { tenantId: session.user.tenantId },
      update: { contentMix: parsed.data.contentMix, scheduleSlots: slots },
      create: {
        tenantId: session.user.tenantId,
        contentMix: parsed.data.contentMix,
        scheduleSlots: slots,
        postsPerDay: 3,
        autoPublish: true,
        timezone: "America/Santiago",
      },
    })

    return NextResponse.json({ success: true, id: brandVoice.id })
  } catch (error) {
    console.error("Brand save error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const brandVoice = await prisma.brandVoice.findUnique({
      where: { tenantId: session.user.tenantId },
    })

    const calendarConfig = await prisma.calendarConfig.findUnique({
      where: { tenantId: session.user.tenantId },
    })

    return NextResponse.json({ brandVoice, calendarConfig })
  } catch (error) {
    console.error("Brand get error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

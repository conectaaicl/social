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
  logoUrl: z.string().url().optional(),
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

    const { logoUrl, ...brandData } = parsed.data

    const brandVoice = await prisma.brandVoice.upsert({
      where: { tenantId: session.user.tenantId },
      update: brandData,
      create: {
        ...brandData,
        tenantId: session.user.tenantId,
      },
    })

    // Save logo to Tenant record so it appears in the sidebar
    if (logoUrl !== undefined) {
      await prisma.tenant.update({
        where: { id: session.user.tenantId },
        data: { logo: logoUrl },
      })
    }

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

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { scheduleSlots, timezone, autoPublish, autoReplyComments, contentMix } = body

    await prisma.calendarConfig.upsert({
      where: { tenantId: session.user.tenantId },
      update: {
        ...(scheduleSlots !== undefined && { scheduleSlots }),
        ...(timezone !== undefined && { timezone }),
        ...(autoPublish !== undefined && { autoPublish }),
        ...(autoReplyComments !== undefined && { autoReplyComments }),
        ...(contentMix !== undefined && { contentMix }),
      },
      create: {
        tenantId: session.user.tenantId,
        scheduleSlots: scheduleSlots ?? [
          { time: "09:00", type: "feed" },
          { time: "13:00", type: "story" },
          { time: "19:00", type: "reel" },
        ],
        contentMix: contentMix ?? { PRODUCTO: 30, PROYECTO: 25, TIP: 25, PROMO: 20 },
        postsPerDay: 3,
        autoPublish: autoPublish ?? true,
        autoReplyComments: autoReplyComments ?? false,
        timezone: timezone ?? "America/Santiago",
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("CalendarConfig update error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const [brandVoice, calendarConfig, tenant] = await Promise.all([
      prisma.brandVoice.findUnique({ where: { tenantId: session.user.tenantId } }),
      prisma.calendarConfig.findUnique({ where: { tenantId: session.user.tenantId } }),
      prisma.tenant.findUnique({ where: { id: session.user.tenantId }, select: { id: true, name: true, logo: true } }),
    ])

    return NextResponse.json({ brandVoice, calendarConfig, tenant })
  } catch (error) {
    console.error("Brand get error:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

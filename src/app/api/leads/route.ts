import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const stage = searchParams.get("stage")

  const leads = await prisma.socialLead.findMany({
    where: { tenantId: session.user.tenantId, ...(stage ? { stage } : {}) },
    include: { _count: { select: { activities: true } } },
    orderBy: { updatedAt: "desc" },
  })

  return NextResponse.json({
    leads: leads.map((l) => ({
      ...l,
      activity_count: l._count.activities,
    })),
  })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const body = await req.json()
  const lead = await prisma.socialLead.create({
    data: {
      tenantId: session.user.tenantId,
      whatsappPhone: body.whatsappPhone,
      nombre: body.nombre,
    },
  })
  return NextResponse.json({ lead })
}

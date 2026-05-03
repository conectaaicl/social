import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { nanoid } from "nanoid"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const affiliates = await prisma.affiliate.findMany({
    where: { tenantId: session.user.tenantId },
    include: {
      referrals: { select: { id: true, amount: true, commission: true, status: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ affiliates })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await req.json()
  const { name, email, phone, type, commission, notes } = body

  if (!name || !email) return NextResponse.json({ error: "Nombre y email requeridos" }, { status: 400 })

  const code = nanoid(8).toUpperCase()

  const affiliate = await prisma.affiliate.create({
    data: {
      code,
      name,
      email,
      phone: phone || null,
      type: type || "REFERRAL",
      commission: Number(commission) || 10,
      notes: notes || null,
      tenantId: session.user.tenantId,
    },
  })

  return NextResponse.json({ affiliate }, { status: 201 })
}

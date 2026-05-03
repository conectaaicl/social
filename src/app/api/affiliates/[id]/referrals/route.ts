import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const referrals = await prisma.affiliateReferral.findMany({
    where: { affiliateId: params.id, tenantId: session.user.tenantId },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ referrals })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await req.json()
  const { referredName, referredEmail, referredPhone, amount, notes } = body

  const affiliate = await prisma.affiliate.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  })
  if (!affiliate) return NextResponse.json({ error: "Afiliado no encontrado" }, { status: 404 })

  const saleAmount = Number(amount) || 0
  const commission = (saleAmount * affiliate.commission) / 100

  const referral = await prisma.affiliateReferral.create({
    data: {
      affiliateId: params.id,
      tenantId: session.user.tenantId,
      referredName: referredName || null,
      referredEmail: referredEmail || null,
      referredPhone: referredPhone || null,
      amount: saleAmount,
      commission,
      notes: notes || null,
    },
  })

  return NextResponse.json({ referral }, { status: 201 })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = req.nextUrl
  const referralId = searchParams.get("referralId")
  if (!referralId) return NextResponse.json({ error: "referralId requerido" }, { status: 400 })

  const body = await req.json()
  const { status, amount, notes } = body

  const updated: any = {}
  if (status !== undefined) {
    updated.status = status
    if (status === "PAID") updated.paidAt = new Date()
  }
  if (amount !== undefined) {
    const affiliate = await prisma.affiliate.findFirst({ where: { id: params.id, tenantId: session.user.tenantId } })
    updated.amount = Number(amount)
    updated.commission = (Number(amount) * (affiliate?.commission ?? 10)) / 100
  }
  if (notes !== undefined) updated.notes = notes

  const referral = await prisma.affiliateReferral.update({
    where: { id: referralId },
    data: updated,
  })

  return NextResponse.json({ referral })
}

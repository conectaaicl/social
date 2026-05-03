import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const affiliate = await prisma.affiliate.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    include: { referrals: { orderBy: { createdAt: "desc" } } },
  })

  if (!affiliate) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  return NextResponse.json({ affiliate })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await req.json()
  const { name, email, phone, type, commission, notes, status } = body

  const affiliate = await prisma.affiliate.update({
    where: { id: params.id, tenantId: session.user.tenantId! },
    data: {
      ...(name !== undefined && { name }),
      ...(email !== undefined && { email }),
      ...(phone !== undefined && { phone: phone || null }),
      ...(type !== undefined && { type }),
      ...(commission !== undefined && { commission: Number(commission) }),
      ...(notes !== undefined && { notes: notes || null }),
      ...(status !== undefined && { status }),
    },
  })

  return NextResponse.json({ affiliate })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  await prisma.affiliate.delete({ where: { id: params.id, tenantId: session.user.tenantId } })
  return NextResponse.json({ ok: true })
}

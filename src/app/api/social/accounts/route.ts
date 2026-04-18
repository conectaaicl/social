import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const accounts = await prisma.socialAccount.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      platform: true,
      accountId: true,
      accountName: true,
      pageId: true,
      active: true,
      tokenExpiresAt: true,
      createdAt: true,
    },
  })

  return NextResponse.json({ accounts })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 })

  const account = await prisma.socialAccount.findFirst({
    where: { id, tenantId: session.user.tenantId },
  })

  if (!account) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 })

  await prisma.socialAccount.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

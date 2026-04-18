import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get("page") ?? "1")
  const limit = Number(searchParams.get("limit") ?? "24")
  const type = searchParams.get("type") ?? undefined

  const [items, total] = await Promise.all([
    prisma.mediaItem.findMany({
      where: { tenantId: session.user.tenantId, ...(type ? { type: type as any } : {}) },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.mediaItem.count({
      where: { tenantId: session.user.tenantId, ...(type ? { type: type as any } : {}) },
    }),
  ])

  return NextResponse.json({ items, total, page, limit })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 })

  await prisma.mediaItem.deleteMany({
    where: { id, tenantId: session.user.tenantId },
  })

  return NextResponse.json({ ok: true })
}

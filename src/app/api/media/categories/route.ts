import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

function toSlug(name: string) {
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const cats = await (prisma as any).mediaCategory.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { mediaItems: true } } },
  })
  return NextResponse.json({ categories: cats })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { name, color, icon } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 })
  const slug = toSlug(name.trim())
  const id = `mcat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  try {
    const cat = await (prisma as any).mediaCategory.create({
      data: { id, name: name.trim(), slug, color: color ?? "#6366f1", icon: icon ?? "📁", tenantId: session.user.tenantId },
    })
    return NextResponse.json({ ok: true, category: cat }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Ya existe una carpeta con ese nombre" }, { status: 409 })
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, name, color, icon } = await req.json()
  const data: any = {}
  if (name) { data.name = name.trim(); data.slug = toSlug(name.trim()) }
  if (color) data.color = color
  if (icon) data.icon = icon
  const cat = await (prisma as any).mediaCategory.update({
    where: { id },
    data,
  })
  return NextResponse.json({ ok: true, category: cat })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const id = new URL(req.url).searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 })
  await (prisma as any).mediaCategory.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

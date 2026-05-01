import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { saveToStaticServer } from "@/lib/fal"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get("page") ?? "1")
  const limit = Number(searchParams.get("limit") ?? "24")
  const type = searchParams.get("type") ?? undefined
  const source = searchParams.get("source") ?? undefined

  const where: any = {
    tenantId: session.user.tenantId,
    ...(type ? { type: type as any } : {}),
    ...(source ? { source: source as any } : {}),
  }

  const [items, total] = await Promise.all([
    prisma.mediaItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.mediaItem.count({ where }),
  ])

  return NextResponse.json({ items, total, page, limit })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const contentType = req.headers.get("content-type") ?? ""

  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Se requiere multipart/form-data" }, { status: 400 })
  }

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "No se encontró el archivo" }, { status: 400 })

  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Solo se aceptan imágenes JPEG, PNG o WebP" }, { status: 400 })
  }

  const maxSize = 20 * 1024 * 1024
  if (file.size > maxSize) {
    return NextResponse.json({ error: "El archivo no puede superar 20MB" }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg"

  let url: string
  try {
    url = await saveToStaticServer(buffer, ext)
  } catch (err: any) {
    return NextResponse.json({ error: "Error subiendo archivo: " + err.message }, { status: 500 })
  }

  const mediaItem = await prisma.mediaItem.create({
    data: {
      url,
      type: "IMAGE",
      source: "UPLOADED",
      prompt: null,
      tags: ["uploaded"],
      tenantId: session.user.tenantId,
    },
  })

  return NextResponse.json({ ok: true, item: mediaItem })
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

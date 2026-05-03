import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { randomUUID } from "crypto"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 })
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Solo se permiten imágenes JPG, PNG, WEBP o GIF" },
        { status: 400 }
      )
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "El archivo supera el límite de 10MB" }, { status: 400 })
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg"
    const filename = `${randomUUID()}.${ext}`
    const uploadsDir = join(process.cwd(), "public", "uploads")

    await mkdir(uploadsDir, { recursive: true })
    const bytes = await file.arrayBuffer()
    await writeFile(join(uploadsDir, filename), Buffer.from(bytes))

    const relativeUrl = `/uploads/${filename}`

    await prisma.mediaItem.create({
      data: {
        url: relativeUrl,
        type: "IMAGE",
        source: "UPLOADED",
        tenantId: session.user.tenantId,
        tags: ["uploaded"],
      },
    })

    return NextResponse.json({ url: relativeUrl })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Error al subir archivo" }, { status: 500 })
  }
}

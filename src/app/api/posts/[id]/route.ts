import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateSchema = z.object({
  caption: z.string().min(1).optional(),
  hashtags: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
  status: z.enum(["PENDING", "SCHEDULED", "FAILED"]).optional(),
})

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const post = await prisma.post.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  })
  if (!post) return NextResponse.json({ error: "Post no encontrado" }, { status: 404 })

  return NextResponse.json({ post })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const post = await prisma.post.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  })
  if (!post) return NextResponse.json({ error: "Post no encontrado" }, { status: 404 })

  if (post.status === "PUBLISHED" || post.status === "PUBLISHING") {
    return NextResponse.json({ error: "No se puede editar un post publicado o en proceso" }, { status: 400 })
  }

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 })
  }

  const updated = await prisma.post.update({
    where: { id: params.id },
    data: {
      ...parsed.data,
      scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : undefined,
    },
  })

  return NextResponse.json({ success: true, post: updated })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const post = await prisma.post.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  })
  if (!post) return NextResponse.json({ error: "Post no encontrado" }, { status: 404 })

  if (post.status === "PUBLISHING") {
    return NextResponse.json({ error: "No se puede eliminar un post en proceso de publicación" }, { status: 400 })
  }

  await prisma.post.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}

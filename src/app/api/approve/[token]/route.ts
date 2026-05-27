import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Public — no auth needed (token acts as auth)
export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const approval = await prisma.postApproval.findUnique({
    where: { token: params.token },
    include: {
      post: {
        select: {
          id: true, caption: true, hashtags: true, mediaUrls: true,
          type: true, contentType: true, platform: true, scheduledAt: true,
          status: true,
        },
      },
    },
  })
  if (!approval) return NextResponse.json({ error: "Enlace inválido" }, { status: 404 })
  if (approval.expiresAt < new Date()) {
    await prisma.postApproval.update({ where: { id: approval.id }, data: { status: "expired" } })
    return NextResponse.json({ error: "Este enlace ha expirado" }, { status: 410 })
  }
  return NextResponse.json(approval)
}

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const body = await req.json().catch(() => ({}))
  const { action, comment } = body  // action: "approve" | "reject"

  if (!["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Acción inválida" }, { status: 400 })
  }

  const approval = await prisma.postApproval.findUnique({
    where: { token: params.token },
    include: { post: true },
  })
  if (!approval) return NextResponse.json({ error: "Enlace inválido" }, { status: 404 })
  if (approval.expiresAt < new Date()) return NextResponse.json({ error: "Enlace expirado" }, { status: 410 })
  if (approval.status !== "pending") return NextResponse.json({ error: "Ya respondido" }, { status: 409 })

  const newStatus = action === "approve" ? "approved" : "rejected"
  const postStatus = action === "approve" ? "SCHEDULED" : "FAILED"

  await Promise.all([
    prisma.postApproval.update({
      where: { id: approval.id },
      data: { status: newStatus, comment: comment?.slice(0, 500), respondedAt: new Date() },
    }),
    prisma.post.update({
      where: { id: approval.postId },
      data: {
        status: postStatus,
        failReason: action === "reject" ? ("Rechazado: " + (comment?.slice(0, 200) ?? "sin comentario")) : null,
      },
    }),
  ])

  return NextResponse.json({ ok: true, status: newStatus })
}

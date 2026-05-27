import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  approverEmail: z.string().email().optional(),
  approverName: z.string().optional(),
  expiresInHours: z.number().min(1).max(168).default(72),
})

// Create approval request — returns public link
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const tenantId = session.user.tenantId

  const post = await prisma.post.findFirst({ where: { id: params.id, tenantId } })
  if (!post) return NextResponse.json({ error: "Post no encontrado" }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })

  const { approverEmail, approverName, expiresInHours } = parsed.data
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000)

  const approval = await prisma.postApproval.upsert({
    where: { postId: params.id },
    update: { approverEmail, approverName, status: "pending", respondedAt: null, comment: null, expiresAt },
    create: { postId: params.id, tenantId, approverEmail, approverName, expiresAt },
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://social.conectaai.cl"
  const approvalUrl = `${appUrl}/aprobar/${approval.token}`

  // Update post status to PENDING_APPROVAL
  await prisma.post.update({ where: { id: params.id }, data: { status: "PENDING_APPROVAL" } })

  return NextResponse.json({ ok: true, token: approval.token, approvalUrl, expiresAt })
}

// Get approval status
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const approval = await prisma.postApproval.findFirst({
    where: { postId: params.id, tenantId: session.user.tenantId },
  })
  return NextResponse.json(approval ?? null)
}

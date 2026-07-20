import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const item = await prisma.conversationInsight.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  })
  if (!item) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  await prisma.conversationInsight.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}

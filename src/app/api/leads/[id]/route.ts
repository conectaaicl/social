import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const lead = await prisma.socialLead.update({
    where: { id, tenantId: session.user.tenantId },
    data: { stage: body.stage, updatedAt: new Date() },
  })
  return NextResponse.json({ lead })
}

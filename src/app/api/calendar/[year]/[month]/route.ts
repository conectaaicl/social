import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ year: string; month: string }> }
) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { year: yearStr, month: monthStr } = await params
  const year = parseInt(yearStr)
  const month = parseInt(monthStr)

  const slots = await prisma.calendarSlot.findMany({
    where: { tenantId: session.user.tenantId, year, month },
    include: { post: { select: { id: true, status: true, caption: true } } },
    orderBy: { scheduledDate: "asc" },
  })

  return NextResponse.json({
    slots: slots.map((s) => ({
      id: s.id,
      scheduled_date: s.scheduledDate.toISOString().split("T")[0],
      time_slot: s.timeSlot,
      formato: s.formato,
      objetivo: s.objetivo,
      tema_sugerido: s.temaSugerido,
      post_id: s.postId,
      post_status: s.post?.status?.toLowerCase() || null,
      caption_principal: s.post?.caption || null,
    })),
  })
}

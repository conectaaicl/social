import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const approvals = await prisma.postApproval.findMany({
    where: { tenantId: session.user.tenantId },
    include: {
      post: {
        select: {
          id: true,
          caption: true,
          thumbnailUrl: true,
          mediaUrls: true,
          type: true,
          scheduledAt: true,
          platform: true,
        },
      },
    },
    orderBy: { requestedAt: "desc" },
    take: 100,
  })

  return NextResponse.json({ approvals })
}

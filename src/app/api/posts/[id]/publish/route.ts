import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { publishPost } from "@/lib/publisher"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  return publishPost(params.id, session.user.tenantId)
}

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const tenantId = session.user.tenantId

  const { caption, competitorHandle } = await req.json()
  if (!caption?.trim()) return NextResponse.json({ error: "Caption requerido" }, { status: 400 })

  const account = await prisma.socialAccount.findFirst({
    where: { tenantId, active: true },
    select: { id: true },
  })

  const post = await prisma.post.create({
    data: {
      tenantId,
      socialAccountId: account?.id,
      status: "PENDING",
      type: "FEED",
      contentType: "PROYECTO",
      platform: ["INSTAGRAM"],
      caption: caption.trim(),
      hashtags: "",
      imagePrompt: competitorHandle ? `Recreacion inspirada en @${competitorHandle}` : "Imagen para post",
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      mediaUrls: [],
    },
    select: { id: true },
  })

  return NextResponse.json({ ok: true, postId: post.id })
}

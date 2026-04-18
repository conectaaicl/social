import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { replyToComment } from "@/lib/meta"
import { generateCommentReply } from "@/lib/claude"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await req.json()
  const manualReply: string | undefined = body.reply

  const comment = await prisma.postComment.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    include: { post: { select: { caption: true } } },
  })
  if (!comment) return NextResponse.json({ error: "Comentario no encontrado" }, { status: 404 })

  const brandVoice = await prisma.brandVoice.findUnique({
    where: { tenantId: session.user.tenantId },
  })
  const account = await prisma.socialAccount.findFirst({
    where: { tenantId: session.user.tenantId, active: true, platform: "INSTAGRAM" },
  })
  if (!account) return NextResponse.json({ error: "Cuenta de Instagram no conectada" }, { status: 400 })

  let replyText = manualReply
  if (!replyText && brandVoice) {
    replyText = await generateCommentReply({
      brandVoice: {
        tone: brandVoice.tone,
        description: brandVoice.description,
        language: brandVoice.language,
        autoReplyTone: brandVoice.autoReplyTone,
      },
      commentText: comment.text,
      postCaption: comment.post.caption,
    })
  }

  if (!replyText) return NextResponse.json({ error: "Sin texto de respuesta" }, { status: 400 })

  await replyToComment(comment.metaCommentId, account.accessToken, replyText)

  await prisma.postComment.update({
    where: { id: comment.id },
    data: { replied: true, replyText, repliedAt: new Date() },
  })

  return NextResponse.json({ ok: true, replyText })
}

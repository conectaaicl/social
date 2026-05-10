import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { refreshMetaLongLivedToken } from "@/lib/token-refresh"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { accountId } = await req.json()
  const account = await prisma.socialAccount.findFirst({
    where: { id: accountId, tenantId: session.user.tenantId },
  })
  if (!account) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 })

  try {
    if (account.platform === "INSTAGRAM" || account.platform === "FACEBOOK") {
      await refreshMetaLongLivedToken(account.id, account.accessToken)
      return NextResponse.json({ ok: true, message: "Token renovado por 60 dias" })
    }
    return NextResponse.json({ error: "Plataforma no soporta refresh manual" }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

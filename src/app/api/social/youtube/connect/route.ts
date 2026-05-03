import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getYouTubeAuthUrl } from "@/lib/youtube"
import { createHmac } from "crypto"

function signState(tenantId: string, userId: string, ts: number): string {
  const secret = process.env.NEXTAUTH_SECRET!
  const payload = `${tenantId}:${userId}:${ts}`
  const sig = createHmac("sha256", secret).update(payload).digest("hex")
  return Buffer.from(JSON.stringify({ tenantId, userId, ts, sig })).toString("base64url")
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const ts = Date.now()
  const state = signState(session.user.tenantId, session.user.id, ts)
  const redirectUri = process.env.NEXT_PUBLIC_APP_URL + "/api/social/youtube/callback"
  return NextResponse.redirect(getYouTubeAuthUrl(state, redirectUri))
}

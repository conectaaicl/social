import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getTikTokAuthUrl } from "@/lib/tiktok"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/accounts?error=no_session`)

  const state = Buffer.from(
    JSON.stringify({ tenantId: session.user.tenantId, userId: session.user.id, ts: Date.now() })
  ).toString("base64url")

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/social/tiktok/callback`
  return NextResponse.redirect(getTikTokAuthUrl(state, redirectUri))
}

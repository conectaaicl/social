import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const clientId = process.env.GOOGLE_BUSINESS_CLIENT_ID
  if (!clientId)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/accounts?error=${encodeURIComponent(
        "Configura Google Business Client ID en Configuracion"
      )}`
    )

  const state = Buffer.from(
    JSON.stringify({ tenantId: session.user.tenantId, ts: Date.now() })
  ).toString("base64url")
  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/social/google-business/callback`

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth")
  url.searchParams.set("client_id", clientId)
  url.searchParams.set("redirect_uri", callbackUrl)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("scope", "https://www.googleapis.com/auth/business.manage")
  url.searchParams.set("access_type", "offline")
  url.searchParams.set("prompt", "consent")
  url.searchParams.set("state", state)

  return NextResponse.redirect(url.toString())
}

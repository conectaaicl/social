import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const appId = process.env.META_APP_ID
  if (!appId)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/accounts?error=${encodeURIComponent(
        "Configura Meta App ID en Configuracion"
      )}`
    )

  const state = Buffer.from(
    JSON.stringify({ tenantId: session.user.tenantId, ts: Date.now() })
  ).toString("base64url")
  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/social/threads/callback`

  const url = new URL("https://www.threads.net/oauth/authorize")
  url.searchParams.set("client_id", appId)
  url.searchParams.set("redirect_uri", callbackUrl)
  url.searchParams.set("scope", "threads_basic,threads_content_publish")
  url.searchParams.set("response_type", "code")
  url.searchParams.set("state", state)

  return NextResponse.redirect(url.toString())
}

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"

const META_SCOPES = [
  "pages_manage_posts",
  "pages_read_engagement",
  "instagram_basic",
  "instagram_content_publish",
  "instagram_manage_insights",
  "pages_show_list",
].join(",")

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const state = Buffer.from(
    JSON.stringify({ tenantId: session.user.tenantId, userId: session.user.id, ts: Date.now() })
  ).toString("base64url")

  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/social/callback`

  const oauthUrl = new URL("https://www.facebook.com/v19.0/dialog/oauth")
  oauthUrl.searchParams.set("client_id", process.env.META_APP_ID!)
  oauthUrl.searchParams.set("redirect_uri", callbackUrl)
  oauthUrl.searchParams.set("scope", META_SCOPES)
  oauthUrl.searchParams.set("response_type", "code")
  oauthUrl.searchParams.set("state", state)

  return NextResponse.redirect(oauthUrl.toString())
}

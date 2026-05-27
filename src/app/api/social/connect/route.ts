import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createOAuthState } from "@/lib/oauth-state"

const META_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "instagram_content_publish",
  "instagram_manage_insights",
  "instagram_manage_comments",
  "pages_manage_posts",
].join(",")

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const state = createOAuthState(session.user.tenantId, session.user.id)
  const callbackUrl = process.env.NEXT_PUBLIC_APP_URL + "/api/social/callback"

  const oauthUrl = new URL("https://www.facebook.com/v21.0/dialog/oauth")
  oauthUrl.searchParams.set("client_id", process.env.META_APP_ID!)
  oauthUrl.searchParams.set("redirect_uri", callbackUrl)
  oauthUrl.searchParams.set("scope", META_SCOPES)
  oauthUrl.searchParams.set("response_type", "code")
  oauthUrl.searchParams.set("state", state)

  return NextResponse.redirect(oauthUrl.toString())
}

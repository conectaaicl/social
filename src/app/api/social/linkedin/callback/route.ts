import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { exchangeLinkedInCode, getLinkedInUserInfo } from "@/lib/linkedin"
import { createHmac } from "crypto"

function verifyState(stateRaw: string): { tenantId: string; userId: string } {
  const state = JSON.parse(Buffer.from(stateRaw, "base64url").toString())
  const { tenantId, userId, ts, sig } = state
  if (!tenantId || !userId || !ts || !sig) throw new Error("invalid_state")
  if (Date.now() - ts > 15 * 60 * 1000) throw new Error("state_expired")
  const secret = process.env.NEXTAUTH_SECRET!
  const expected = createHmac("sha256", secret).update(`${tenantId}:${userId}:${ts}`).digest("hex")
  if (sig !== expected) throw new Error("invalid_state_signature")
  return { tenantId, userId }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get("code")
  const stateRaw = searchParams.get("state")
  const error = searchParams.get("error")
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  if (error) return NextResponse.redirect(appUrl + "/dashboard/accounts?error=cancelled")
  if (!code || !stateRaw) return NextResponse.redirect(appUrl + "/dashboard/accounts?error=invalid_callback")

  let tenantId: string
  try {
    const verified = verifyState(stateRaw)
    tenantId = verified.tenantId
  } catch {
    return NextResponse.redirect(appUrl + "/dashboard/accounts?error=invalid_state")
  }

  try {
    const redirectUri = appUrl + "/api/social/linkedin/callback"
    const tokens = await exchangeLinkedInCode(code, redirectUri)
    const userInfo = await getLinkedInUserInfo(tokens.access_token)
    const authorUrn = "urn:li:person:" + userInfo.sub

    await prisma.socialAccount.upsert({
      where: { tenantId_platform_accountId: { tenantId, platform: "LINKEDIN", accountId: userInfo.sub } },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        accountName: userInfo.name,
        openId: authorUrn,
        tokenExpiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
        active: true,
      },
      create: {
        tenantId,
        platform: "LINKEDIN",
        accountId: userInfo.sub,
        accountName: userInfo.name,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        openId: authorUrn,
        tokenExpiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
      },
    })
    return NextResponse.redirect(appUrl + "/dashboard/accounts?success=1")
  } catch (err: any) {
    console.error("LinkedIn callback error:", err)
    return NextResponse.redirect(appUrl + "/dashboard/accounts?error=" + encodeURIComponent(err.message))
  }
}

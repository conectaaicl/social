import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { exchangeTikTokCode, getTikTokUserInfo } from "@/lib/tiktok"

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get("code")
  const stateRaw = searchParams.get("state")
  const error = searchParams.get("error")
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  if (error) return NextResponse.redirect(`${appUrl}/dashboard/accounts?error=tiktok_cancelled`)
  if (!code || !stateRaw) return NextResponse.redirect(`${appUrl}/dashboard/accounts?error=tiktok_invalid`)

  let tenantId: string
  try {
    const state = JSON.parse(Buffer.from(stateRaw, "base64url").toString())
    tenantId = state.tenantId
    if (!tenantId) throw new Error()
  } catch {
    return NextResponse.redirect(`${appUrl}/dashboard/accounts?error=tiktok_invalid_state`)
  }

  try {
    const redirectUri = `${appUrl}/api/social/tiktok/callback`
    const tokens = await exchangeTikTokCode(code, redirectUri)
    const userInfo = await getTikTokUserInfo(tokens.access_token)

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)
    const refreshExpiresAt = new Date(Date.now() + tokens.refresh_expires_in * 1000)

    await prisma.socialAccount.upsert({
      where: { tenantId_platform_accountId: { tenantId, platform: "TIKTOK", accountId: tokens.open_id } },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        accountName: userInfo.display_name,
        openId: tokens.open_id,
        tokenExpiresAt: expiresAt,
        active: true,
      },
      create: {
        tenantId,
        platform: "TIKTOK",
        accountId: tokens.open_id,
        openId: tokens.open_id,
        accountName: userInfo.display_name,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: expiresAt,
        active: true,
      },
    })

    return NextResponse.redirect(`${appUrl}/dashboard/accounts?success=TikTok: ${encodeURIComponent(userInfo.display_name)}`)
  } catch (err: any) {
    console.error("TikTok OAuth error:", err)
    return NextResponse.redirect(`${appUrl}/dashboard/accounts?error=${encodeURIComponent(err.message)}`)
  }
}
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get("code")
  const stateRaw = searchParams.get("state")
  const error = searchParams.get("error")
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  if (error) return NextResponse.redirect(`${appUrl}/dashboard/accounts?error=cancelled`)
  if (!code || !stateRaw) return NextResponse.redirect(`${appUrl}/dashboard/accounts?error=invalid_callback`)

  let tenantId: string
  try {
    const state = JSON.parse(Buffer.from(stateRaw, "base64url").toString())
    tenantId = state.tenantId
  } catch {
    return NextResponse.redirect(`${appUrl}/dashboard/accounts?error=invalid_state`)
  }

  try {
    const appId = process.env.PINTEREST_APP_ID!
    const appSecret = process.env.PINTEREST_APP_SECRET!
    const callbackUrl = `${appUrl}/api/social/pinterest/callback`
    const creds = Buffer.from(`${appId}:${appSecret}`).toString("base64")

    const tokenRes = await fetch("https://api.pinterest.com/v5/oauth/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${creds}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: callbackUrl }),
    })
    const tokenData = await tokenRes.json()
    if (tokenData.code && tokenData.code !== 0) throw new Error(tokenData.message)

    const accessToken = tokenData.access_token
    const refreshToken = tokenData.refresh_token
    const expiresIn = tokenData.expires_in ?? 2592000

    const userRes = await fetch("https://api.pinterest.com/v5/user_account", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const userData = await userRes.json()
    const accountId = userData.username ?? userData.id ?? "pinterest_user"

    await prisma.socialAccount.upsert({
      where: { tenantId_platform_accountId: { tenantId, platform: "PINTEREST", accountId } },
      update: {
        accessToken,
        refreshToken,
        accountName: userData.username ?? "Pinterest",
        active: true,
        tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
      },
      create: {
        tenantId,
        platform: "PINTEREST",
        accountId,
        accountName: userData.username ?? "Pinterest",
        accessToken,
        refreshToken,
        tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
      },
    })

    return NextResponse.redirect(`${appUrl}/dashboard/accounts?success=1`)
  } catch (err: any) {
    return NextResponse.redirect(
      `${appUrl}/dashboard/accounts?error=${encodeURIComponent(err.message)}`
    )
  }
}

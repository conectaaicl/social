import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getGBPAccounts, getGBPLocations } from "@/lib/google-business"

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
    const clientId = process.env.GOOGLE_BUSINESS_CLIENT_ID!
    const clientSecret = process.env.GOOGLE_BUSINESS_CLIENT_SECRET!
    const callbackUrl = `${appUrl}/api/social/google-business/callback`

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrl,
        grant_type: "authorization_code",
      }),
    })
    const tokenData = await tokenRes.json()
    if (tokenData.error) throw new Error(tokenData.error_description ?? tokenData.error)

    const { access_token, refresh_token, expires_in } = tokenData

    const accounts = await getGBPAccounts(access_token)
    const account = accounts[0]
    if (!account) throw new Error("No se encontro ninguna cuenta de Google Business")

    const accountId = account.name.split("/").pop() ?? account.name
    const locations = await getGBPLocations(access_token, accountId)
    const locationId = locations[0]?.name?.split("/").pop() ?? ""

    await prisma.socialAccount.upsert({
      where: { tenantId_platform_accountId: { tenantId, platform: "GOOGLE_BUSINESS", accountId } },
      update: {
        accessToken: access_token,
        refreshToken: refresh_token,
        accountName: account.accountName ?? "Google Business",
        active: true,
        pageId: locationId,
        tokenExpiresAt: new Date(Date.now() + expires_in * 1000),
      },
      create: {
        tenantId,
        platform: "GOOGLE_BUSINESS",
        accountId,
        accountName: account.accountName ?? "Google Business",
        accessToken: access_token,
        refreshToken: refresh_token,
        pageId: locationId,
        tokenExpiresAt: new Date(Date.now() + expires_in * 1000),
      },
    })

    return NextResponse.redirect(`${appUrl}/dashboard/accounts?success=1`)
  } catch (err: any) {
    return NextResponse.redirect(
      `${appUrl}/dashboard/accounts?error=${encodeURIComponent(err.message)}`
    )
  }
}

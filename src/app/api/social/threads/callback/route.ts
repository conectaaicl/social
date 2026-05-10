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
    const appId = process.env.META_APP_ID!
    const appSecret = process.env.META_APP_SECRET!
    const callbackUrl = `${appUrl}/api/social/threads/callback`

    const shortTokenRes = await fetch("https://graph.threads.net/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        grant_type: "authorization_code",
        redirect_uri: callbackUrl,
        code,
      }),
    })
    const shortData = await shortTokenRes.json()
    if (shortData.error) throw new Error(shortData.error.message)

    const longTokenRes = await fetch(
      `https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=${appSecret}&access_token=${shortData.access_token}`
    )
    const longData = await longTokenRes.json()
    const accessToken = longData.access_token ?? shortData.access_token
    const userId = (shortData.user_id?.toString()) ?? ""

    const profileRes = await fetch(
      `https://graph.threads.net/v1.0/me?fields=id,username&access_token=${accessToken}`
    )
    const profile = await profileRes.json()
    const accountName = profile.username ?? "Threads User"

    await prisma.socialAccount.upsert({
      where: { tenantId_platform_accountId: { tenantId, platform: "THREADS", accountId: userId } },
      update: {
        accessToken,
        accountName,
        active: true,
        tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      },
      create: {
        tenantId,
        platform: "THREADS",
        accountId: userId,
        accountName,
        accessToken,
        tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      },
    })

    return NextResponse.redirect(`${appUrl}/dashboard/accounts?success=1`)
  } catch (err: any) {
    return NextResponse.redirect(
      `${appUrl}/dashboard/accounts?error=${encodeURIComponent(err.message)}`
    )
  }
}

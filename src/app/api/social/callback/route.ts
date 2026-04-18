import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { exchangeForLongLivedToken, getUserPages, getIGUserId } from "@/lib/meta"

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get("code")
  const stateRaw = searchParams.get("state")
  const error = searchParams.get("error")
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  if (error) {
    return NextResponse.redirect(`${appUrl}/dashboard/accounts?error=cancelled`)
  }

  if (!code || !stateRaw) {
    return NextResponse.redirect(`${appUrl}/dashboard/accounts?error=invalid_callback`)
  }

  let tenantId: string
  try {
    const state = JSON.parse(Buffer.from(stateRaw, "base64url").toString())
    tenantId = state.tenantId
    if (!tenantId) throw new Error("No tenantId in state")
  } catch {
    return NextResponse.redirect(`${appUrl}/dashboard/accounts?error=invalid_state`)
  }

  try {
    const callbackUrl = `${appUrl}/api/social/callback`
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${process.env.META_APP_ID}&client_secret=${process.env.META_APP_SECRET}&redirect_uri=${encodeURIComponent(callbackUrl)}&code=${code}`
    )
    const tokenData = await tokenRes.json()
    if (tokenData.error) throw new Error(tokenData.error.message)

    const shortToken = tokenData.access_token
    const longToken = await exchangeForLongLivedToken(shortToken)

    const pages = await getUserPages(longToken)

    const created: string[] = []

    for (const page of pages) {
      await prisma.socialAccount.upsert({
        where: { tenantId_platform_accountId: { tenantId, platform: "FACEBOOK", accountId: page.id } },
        update: { accessToken: page.access_token, accountName: page.name, active: true },
        create: {
          tenantId,
          platform: "FACEBOOK",
          accountId: page.id,
          accountName: page.name,
          accessToken: page.access_token,
          pageId: page.id,
        },
      })
      created.push(`Facebook: ${page.name}`)

      const igId = await getIGUserId(page.id, longToken)
      if (igId) {
        await prisma.socialAccount.upsert({
          where: { tenantId_platform_accountId: { tenantId, platform: "INSTAGRAM", accountId: igId } },
          update: { accessToken: longToken, accountName: page.name, pageId: page.id, active: true },
          create: {
            tenantId,
            platform: "INSTAGRAM",
            accountId: igId,
            accountName: page.name,
            accessToken: longToken,
            pageId: page.id,
            tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
          },
        })
        created.push(`Instagram: ${page.name}`)
      }
    }

    return NextResponse.redirect(`${appUrl}/dashboard/accounts?success=${created.length}`)
  } catch (err: any) {
    console.error("Meta OAuth callback error:", err)
    return NextResponse.redirect(`${appUrl}/dashboard/accounts?error=${encodeURIComponent(err.message)}`)
  }
}

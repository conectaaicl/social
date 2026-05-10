import { prisma } from "@/lib/prisma"

export async function refreshMetaLongLivedToken(
  socialAccountId: string,
  currentToken: string
): Promise<string> {
  const url = new URL("https://graph.facebook.com/v21.0/oauth/access_token")
  url.searchParams.set("grant_type", "fb_exchange_token")
  url.searchParams.set("client_id", process.env.META_APP_ID ?? "")
  url.searchParams.set("client_secret", process.env.META_APP_SECRET ?? "")
  url.searchParams.set("fb_exchange_token", currentToken)

  const res = await fetch(url.toString())
  const data = await res.json()
  if (data.error) throw new Error(`Meta refresh: ${data.error.message}`)

  const newToken = data.access_token
  const expiresIn = data.expires_in ?? 5184000 // 60 days default

  await prisma.socialAccount.update({
    where: { id: socialAccountId },
    data: {
      accessToken: newToken,
      tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
    },
  })

  return newToken
}

export async function getExpiringAccounts(tenantId: string, withinDays = 10): Promise<unknown[]> {
  const cutoff = new Date(Date.now() + withinDays * 24 * 60 * 60 * 1000)
  return prisma.socialAccount.findMany({
    where: {
      tenantId,
      active: true,
      tokenExpiresAt: { lte: cutoff, not: null },
    },
  })
}

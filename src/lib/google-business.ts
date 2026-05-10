const GBP_BASE = "https://mybusiness.googleapis.com/v4"

async function gbpFetch(url: string, accessToken: string, options?: RequestInit) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...((options?.headers as Record<string, string>) ?? {}),
    },
  })
  const data = await res.json()
  if (data.error) throw new Error(`GBP API: ${data.error.message} (code ${data.error.code})`)
  return data
}

export async function publishGBPPost(
  accessToken: string,
  accountId: string,
  locationId: string,
  summary: string,
  imageUrl?: string
): Promise<string> {
  const body: Record<string, unknown> = {
    languageCode: "es",
    summary,
    callToAction: { actionType: "LEARN_MORE" },
  }
  if (imageUrl) {
    body.media = [{ mediaFormat: "PHOTO", sourceUrl: imageUrl }]
  }
  const data = await gbpFetch(
    `${GBP_BASE}/accounts/${accountId}/locations/${locationId}/localPosts`,
    accessToken,
    { method: "POST", body: JSON.stringify(body) }
  )
  return data.name
}

export async function getGBPAccounts(accessToken: string): Promise<Array<{ name: string; accountName: string }>> {
  const data = await gbpFetch(`${GBP_BASE}/accounts`, accessToken)
  return data.accounts ?? []
}

export async function getGBPLocations(
  accessToken: string,
  accountId: string
): Promise<Array<{ name: string; locationName: string; storeCode?: string }>> {
  const data = await gbpFetch(`${GBP_BASE}/accounts/${accountId}/locations?pageSize=10`, accessToken)
  return data.locations ?? []
}

export async function refreshGoogleToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_BUSINESS_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_BUSINESS_CLIENT_SECRET ?? "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  })
  return res.json()
}

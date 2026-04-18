/**
 * Google Ads API integration.
 * Uses REST API (proto-JSON) — no need for the heavy Node client.
 * Env vars required:
 *   GOOGLE_ADS_DEVELOPER_TOKEN   — from Google Ads API Center
 *   GOOGLE_ADS_CLIENT_ID         — OAuth2 client ID
 *   GOOGLE_ADS_CLIENT_SECRET     — OAuth2 client secret
 *   GOOGLE_ADS_REFRESH_TOKEN     — OAuth2 refresh token (per account or manager)
 *   GOOGLE_ADS_CUSTOMER_ID       — 10-digit customer ID (no dashes)
 */

const BASE = "https://googleads.googleapis.com/v17"

interface TokenCache { token: string; expiresAt: number }
let _tokenCache: TokenCache | null = null

async function getAccessToken(): Promise<string> {
  if (_tokenCache && Date.now() < _tokenCache.expiresAt - 60_000) {
    return _tokenCache.token
  }
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error(`Google OAuth failed: ${JSON.stringify(data)}`)
  _tokenCache = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 }
  return _tokenCache.token
}

function headers(token: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
    "login-customer-id": process.env.GOOGLE_ADS_CUSTOMER_ID!,
  }
}

export interface AdCampaignInput {
  name: string
  objective: "AWARENESS" | "TRAFFIC" | "CONVERSIONS"
  dailyBudgetMicros: number   // presupuesto diario en micros (1 CLP = 1_000_000 micros)
  startDate: string           // YYYYMMDD
  endDate?: string            // YYYYMMDD
  targetUrl: string
  headlines: string[]         // max 15, cada uno max 30 chars
  descriptions: string[]      // max 4, cada uno max 90 chars
  keywords: string[]
}

export interface AdCampaignResult {
  campaignId: string
  adGroupId: string
  adId: string
}

const OBJECTIVE_BIDDING: Record<string, object> = {
  AWARENESS: { targetCpm: { targetCpmMicros: "1000000" } },
  TRAFFIC: { targetCpa: {} },
  CONVERSIONS: { targetRoas: {} },
}

export async function createGoogleAdsCampaign(input: AdCampaignInput): Promise<AdCampaignResult> {
  const token = await getAccessToken()
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID!
  const h = headers(token)

  // 1 — Budget
  const budgetRes = await fetch(`${BASE}/customers/${customerId}/campaignBudgets:mutate`, {
    method: "POST",
    headers: h,
    body: JSON.stringify({
      operations: [{
        create: {
          name: `Budget_${input.name}_${Date.now()}`,
          amountMicros: String(input.dailyBudgetMicros),
          deliveryMethod: "STANDARD",
        },
      }],
    }),
  })
  const budgetData = await budgetRes.json()
  const budgetRn: string = budgetData.results?.[0]?.resourceName
  if (!budgetRn) throw new Error(`Budget creation failed: ${JSON.stringify(budgetData)}`)

  // 2 — Campaign (Search)
  const campRes = await fetch(`${BASE}/customers/${customerId}/campaigns:mutate`, {
    method: "POST",
    headers: h,
    body: JSON.stringify({
      operations: [{
        create: {
          name: input.name,
          status: "PAUSED",   // Always start paused — user activates manually
          advertisingChannelType: "SEARCH",
          campaignBudget: budgetRn,
          startDate: input.startDate,
          ...(input.endDate ? { endDate: input.endDate } : {}),
          manualCpc: {},
          networkSettings: {
            targetGoogleSearch: true,
            targetSearchNetwork: true,
            targetContentNetwork: false,
          },
        },
      }],
    }),
  })
  const campData = await campRes.json()
  const campRn: string = campData.results?.[0]?.resourceName
  if (!campRn) throw new Error(`Campaign creation failed: ${JSON.stringify(campData)}`)
  const campaignId = campRn.split("/").pop()!

  // 3 — Ad Group
  const agRes = await fetch(`${BASE}/customers/${customerId}/adGroups:mutate`, {
    method: "POST",
    headers: h,
    body: JSON.stringify({
      operations: [{
        create: {
          name: `${input.name}_AdGroup`,
          campaign: campRn,
          status: "ENABLED",
          type: "SEARCH_STANDARD",
          cpcBidMicros: "1000000",
        },
      }],
    }),
  })
  const agData = await agRes.json()
  const agRn: string = agData.results?.[0]?.resourceName
  if (!agRn) throw new Error(`AdGroup creation failed: ${JSON.stringify(agData)}`)
  const adGroupId = agRn.split("/").pop()!

  // 4 — Keywords
  if (input.keywords.length > 0) {
    await fetch(`${BASE}/customers/${customerId}/adGroupCriteria:mutate`, {
      method: "POST",
      headers: h,
      body: JSON.stringify({
        operations: input.keywords.slice(0, 20).map((kw) => ({
          create: {
            adGroup: agRn,
            status: "ENABLED",
            keyword: { text: kw, matchType: "PHRASE" },
          },
        })),
      }),
    })
  }

  // 5 — Responsive Search Ad
  const adRes = await fetch(`${BASE}/customers/${customerId}/ads:mutate`, {
    method: "POST",
    headers: h,
    body: JSON.stringify({
      operations: [{
        create: {
          finalUrls: [input.targetUrl],
          responsiveSearchAd: {
            headlines: input.headlines.slice(0, 15).map((h) => ({ text: h.slice(0, 30) })),
            descriptions: input.descriptions.slice(0, 4).map((d) => ({ text: d.slice(0, 90) })),
          },
        },
      }],
    }),
  })
  const adData = await adRes.json()
  const adRn: string = adData.results?.[0]?.resourceName
  if (!adRn) throw new Error(`Ad creation failed: ${JSON.stringify(adData)}`)
  const adId = adRn.split("/").pop()!

  // 6 — Ad Group Ad link
  await fetch(`${BASE}/customers/${customerId}/adGroupAds:mutate`, {
    method: "POST",
    headers: h,
    body: JSON.stringify({
      operations: [{
        create: {
          adGroup: agRn,
          status: "ENABLED",
          ad: { resourceName: adRn },
        },
      }],
    }),
  })

  return { campaignId, adGroupId, adId }
}

export async function pauseCampaign(campaignId: string): Promise<void> {
  const token = await getAccessToken()
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID!
  await fetch(`${BASE}/customers/${customerId}/campaigns:mutate`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({
      operations: [{
        update: {
          resourceName: `customers/${customerId}/campaigns/${campaignId}`,
          status: "PAUSED",
        },
        updateMask: "status",
      }],
    }),
  })
}

export async function activateCampaign(campaignId: string): Promise<void> {
  const token = await getAccessToken()
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID!
  await fetch(`${BASE}/customers/${customerId}/campaigns:mutate`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({
      operations: [{
        update: {
          resourceName: `customers/${customerId}/campaigns/${campaignId}`,
          status: "ENABLED",
        },
        updateMask: "status",
      }],
    }),
  })
}

export async function getCampaignStats(campaignId: string): Promise<{
  impressions: number; clicks: number; spend: number; conversions: number
}> {
  const token = await getAccessToken()
  const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID!
  const query = `
    SELECT campaign.id, metrics.impressions, metrics.clicks,
           metrics.cost_micros, metrics.conversions
    FROM campaign
    WHERE campaign.id = ${campaignId}
      AND segments.date DURING LAST_30_DAYS
  `
  const res = await fetch(`${BASE}/customers/${customerId}/googleAds:search`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify({ query }),
  })
  const data = await res.json()
  const row = data.results?.[0]?.metrics ?? {}
  return {
    impressions: Number(row.impressions ?? 0),
    clicks: Number(row.clicks ?? 0),
    spend: Number(row.costMicros ?? 0) / 1_000_000,
    conversions: Number(row.conversions ?? 0),
  }
}

/** Uses Claude to generate RSA-compliant headlines + descriptions from post content */
export async function generateAdCopyFromPost(params: {
  caption: string
  brandDescription: string
  targetAudience: string
  objective: string
  keywords: string[]
}): Promise<{ headlines: string[]; descriptions: string[] }> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 600,
    messages: [{
      role: "user",
      content: `Eres un experto en Google Ads RSA (Responsive Search Ads).

Negocio: ${params.brandDescription}
Audiencia: ${params.targetAudience}
Objetivo: ${params.objective}
Keywords: ${params.keywords.slice(0, 5).join(", ")}
Post de Instagram (referencia de tono y contenido):
"${params.caption.slice(0, 300)}"

Genera copy para un RSA de Google Ads. Reglas ESTRICTAS:
- Headlines: exactamente 10, máximo 30 caracteres CADA UNO (cuenta los espacios)
- Descriptions: exactamente 3, máximo 90 caracteres CADA UNO
- En español chileno
- Incluir keyword principal en al menos 2 headlines
- CTAs claros (Cotiza, Contáctanos, Ver catálogo, etc.)

Responde SOLO con JSON válido:
{"headlines":["...","...","...","...","...","...","...","...","...","..."],"descriptions":["...","...","..."]}`,
    }],
  })

  const text = message.content[0].type === "text" ? message.content[0].text.trim() : "{}"
  const clean = text.replace(/```json\s*|\s*```/g, "").trim()
  return JSON.parse(clean)
}

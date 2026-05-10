const AYRSHARE_BASE = "https://app.ayrshare.com/api"

interface AyrsharePost {
  post: string
  platforms: string[]
  mediaUrls?: string[]
  scheduleDate?: string
}

export async function publishViaAyrshare(
  apiKey: string,
  params: AyrsharePost
): Promise<{ id: string; postIds: Record<string, string> }> {
  const res = await fetch(`${AYRSHARE_BASE}/post`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(params),
  })
  const data = await res.json()
  if (data.status === "error") throw new Error(`Ayrshare: ${data.message}`)
  return { id: data.id, postIds: data.postIds ?? {} }
}

export async function getAyrshareProfiles(apiKey: string): Promise<unknown[]> {
  const res = await fetch(`${AYRSHARE_BASE}/profiles`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  return res.json()
}

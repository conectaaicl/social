const PIN_BASE = "https://api.pinterest.com/v5"

async function pinFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, options)
  const data = await res.json()
  if (data.code && data.code !== 0) throw new Error(`Pinterest API: ${data.message} (code ${data.code})`)
  return data
}

export async function publishPinterestPin(
  accessToken: string,
  boardId: string,
  imageUrl: string,
  title: string,
  description: string,
  link?: string
): Promise<string> {
  const body: Record<string, unknown> = {
    board_id: boardId,
    title: title.slice(0, 100),
    description: description.slice(0, 500),
    media_source: { source_type: "image_url", url: imageUrl },
  }
  if (link) body.link = link
  const data = await pinFetch(`${PIN_BASE}/pins`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return data.id
}

export async function getPinterestBoards(accessToken: string): Promise<Array<{ id: string; name: string }>> {
  const data = await pinFetch(`${PIN_BASE}/boards?page_size=25`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  return data.items ?? []
}

export async function refreshPinterestToken(refreshToken: string): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const appId = process.env.PINTEREST_APP_ID ?? ""
  const appSecret = process.env.PINTEREST_APP_SECRET ?? ""
  const creds = Buffer.from(`${appId}:${appSecret}`).toString("base64")
  const body = new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken })
  const res = await fetch(`${PIN_BASE}/oauth/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${creds}`, "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })
  return res.json()
}

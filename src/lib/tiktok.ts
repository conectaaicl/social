const TIKTOK_API = "https://open.tiktokapis.com/v2"
const TIKTOK_AUTH = "https://www.tiktok.com/v2/auth/authorize"
const TIKTOK_TOKEN = "https://open.tiktokapis.com/v2/oauth/token/"

export function getTikTokAuthUrl(state: string, redirectUri: string): string {
  const scopes = ["user.info.basic", "video.publish", "video.upload"].join(",")
  const url = new URL(TIKTOK_AUTH)
  url.searchParams.set("client_key", process.env.TIKTOK_CLIENT_KEY!)
  url.searchParams.set("scope", scopes)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("redirect_uri", redirectUri)
  url.searchParams.set("state", state)
  return url.toString()
}

export async function exchangeTikTokCode(code: string, redirectUri: string) {
  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY!,
    client_secret: process.env.TIKTOK_CLIENT_SECRET!,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  })
  const res = await fetch(TIKTOK_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  })
  const json = await res.json()
  if (json.error) throw new Error(json.error_description ?? json.error)
  return json.data as {
    access_token: string
    refresh_token: string
    open_id: string
    expires_in: number
    refresh_expires_in: number
    scope: string
  }
}

export async function refreshTikTokToken(refreshToken: string) {
  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY!,
    client_secret: process.env.TIKTOK_CLIENT_SECRET!,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  })
  const res = await fetch(TIKTOK_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  })
  const json = await res.json()
  if (json.error) throw new Error(json.error_description ?? json.error)
  return json.data as { access_token: string; refresh_token: string; expires_in: number; refresh_expires_in: number }
}

export async function getTikTokUserInfo(accessToken: string) {
  const res = await fetch(`${TIKTOK_API}/user/info/?fields=open_id,display_name,avatar_url`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const json = await res.json()
  if (json.error?.code && json.error.code !== "ok") throw new Error(json.error.message ?? "Error obteniendo info de usuario")
  return json.data?.user as { open_id: string; display_name: string; avatar_url?: string }
}

// Publish a single video to TikTok via URL pull
export async function publishTikTokVideo(
  accessToken: string,
  videoUrl: string,
  title: string,
  opts?: { privacyLevel?: string; disableComment?: boolean; disableDuet?: boolean; disableStitch?: boolean }
): Promise<string> {
  const body = {
    post_info: {
      title: title.slice(0, 150),
      privacy_level: opts?.privacyLevel ?? "PUBLIC_TO_EVERYONE",
      disable_duet: opts?.disableDuet ?? false,
      disable_comment: opts?.disableComment ?? false,
      disable_stitch: opts?.disableStitch ?? false,
      video_cover_timestamp_ms: 1000,
    },
    source_info: {
      source: "PULL_FROM_URL",
      video_url: videoUrl,
    },
  }
  const res = await fetch(`${TIKTOK_API}/post/publish/video/init/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok || (json.error?.code && json.error.code !== "ok")) {
    throw new Error(json.error?.message ?? `TikTok video publish failed: ${res.status}`)
  }
  return json.data?.publish_id ?? "tiktok_ok"
}

// Publish photo post (up to 35 images) to TikTok via URL pull
export async function publishTikTokPhoto(
  accessToken: string,
  imageUrls: string[],
  title: string,
  description?: string
): Promise<string> {
  const body = {
    media_type: "PHOTO",
    post_info: {
      title: title.slice(0, 150),
      description: (description ?? "").slice(0, 2200),
      privacy_level: "PUBLIC_TO_EVERYONE",
      disable_comment: false,
    },
    source_info: {
      source: "PULL_FROM_URL",
      photo_cover_index: 0,
      photo_images: imageUrls.slice(0, 35),
    },
  }
  const res = await fetch(`${TIKTOK_API}/post/publish/content/init/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok || (json.error?.code && json.error.code !== "ok")) {
    throw new Error(json.error?.message ?? `TikTok photo publish failed: ${res.status}`)
  }
  return json.data?.publish_id ?? "tiktok_ok"
}
const YOUTUBE_UPLOAD_BASE = "https://www.googleapis.com/upload/youtube/v3"

export function getYouTubeAuthUrl(state: string, redirectUri: string): string {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth")
  url.searchParams.set("client_id", process.env.YOUTUBE_CLIENT_ID!)
  url.searchParams.set("redirect_uri", redirectUri)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("scope", [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/userinfo.email",
  ].join(" "))
  url.searchParams.set("access_type", "offline")
  url.searchParams.set("prompt", "consent")
  url.searchParams.set("state", state)
  return url.toString()
}

export async function exchangeYouTubeCode(code: string, redirectUri: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.YOUTUBE_CLIENT_ID!,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  })
  if (!res.ok) throw new Error("YouTube token exchange failed: " + await res.text())
  return res.json()
}

export async function refreshYouTubeToken(refreshToken: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.YOUTUBE_CLIENT_ID!,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  })
  if (!res.ok) throw new Error("YouTube refresh failed: " + await res.text())
  return res.json()
}

export async function getYouTubeChannelInfo(accessToken: string) {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: "Bearer " + accessToken },
  })
  if (!res.ok) throw new Error("YouTube userinfo failed: " + await res.text())
  return res.json()
}

export async function publishYouTubeShort(
  accessToken: string,
  videoUrl: string,
  title: string,
  description: string
): Promise<string> {
  const videoRes = await fetch(videoUrl)
  if (!videoRes.ok) throw new Error("Failed to fetch video for YouTube upload")
  const videoBuffer = await videoRes.arrayBuffer()
  const videoSize = videoBuffer.byteLength

  const initRes = await fetch(
    YOUTUBE_UPLOAD_BASE + "/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: "Bearer " + accessToken,
        "Content-Type": "application/json",
        "X-Upload-Content-Type": "video/mp4",
        "X-Upload-Content-Length": String(videoSize),
      },
      body: JSON.stringify({
        snippet: {
          title: (title + " #shorts").slice(0, 100),
          description: description.slice(0, 5000),
          tags: ["shorts"],
          categoryId: "22",
        },
        status: { privacyStatus: "public", selfDeclaredMadeForKids: false },
      }),
    }
  )

  if (!initRes.ok) throw new Error("YouTube upload init failed: " + await initRes.text())
  const uploadUrl = initRes.headers.get("location")
  if (!uploadUrl) throw new Error("YouTube did not return upload URL")

  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "video/mp4", "Content-Length": String(videoSize) },
    body: videoBuffer,
  })

  if (!uploadRes.ok && uploadRes.status !== 200 && uploadRes.status !== 201) {
    throw new Error("YouTube upload failed: " + uploadRes.status)
  }

  const data = await uploadRes.json()
  return data.id ?? "youtube-uploaded"
}

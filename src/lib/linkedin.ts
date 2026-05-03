const LINKEDIN_BASE = "https://api.linkedin.com"

export function getLinkedInAuthUrl(state: string, redirectUri: string): string {
  const url = new URL("https://www.linkedin.com/oauth/v2/authorization")
  url.searchParams.set("response_type", "code")
  url.searchParams.set("client_id", process.env.LINKEDIN_CLIENT_ID!)
  url.searchParams.set("redirect_uri", redirectUri)
  url.searchParams.set("scope", "openid profile email w_member_social")
  url.searchParams.set("state", state)
  return url.toString()
}

export async function exchangeLinkedInCode(code: string, redirectUri: string) {
  const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
    }),
  })
  if (!res.ok) throw new Error("LinkedIn token exchange failed: " + await res.text())
  return res.json()
}

export async function refreshLinkedInToken(refreshToken: string) {
  const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
    }),
  })
  if (!res.ok) throw new Error("LinkedIn refresh failed: " + await res.text())
  return res.json()
}

export async function getLinkedInUserInfo(accessToken: string) {
  const res = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: "Bearer " + accessToken },
  })
  if (!res.ok) throw new Error("LinkedIn userinfo failed: " + await res.text())
  return res.json()
}

async function registerLinkedInImageUpload(accessToken: string, authorUrn: string) {
  const res = await fetch(LINKEDIN_BASE + "/v2/assets?action=registerUpload", {
    method: "POST",
    headers: { Authorization: "Bearer " + accessToken, "Content-Type": "application/json" },
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
        owner: authorUrn,
        serviceRelationships: [{ relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" }],
      },
    }),
  })
  if (!res.ok) throw new Error("LinkedIn register upload failed: " + await res.text())
  const data = await res.json()
  const mechanism = data.value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]
  return { uploadUrl: mechanism.uploadUrl as string, assetUrn: data.value.asset as string }
}

async function uploadLinkedInImage(uploadUrl: string, imageUrl: string, accessToken: string) {
  const imgRes = await fetch(imageUrl)
  if (!imgRes.ok) throw new Error("Failed to fetch image for LinkedIn")
  const imgBuffer = await imgRes.arrayBuffer()
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { Authorization: "Bearer " + accessToken, "Content-Type": "image/jpeg" },
    body: imgBuffer,
  })
  if (!uploadRes.ok && uploadRes.status !== 201) throw new Error("LinkedIn image upload failed: " + uploadRes.status)
}

export async function publishLinkedInPost(
  accessToken: string,
  authorUrn: string,
  caption: string,
  imageUrl?: string
): Promise<string> {
  let shareMediaCategory = "NONE"
  let media: any[] = []

  if (imageUrl) {
    const { uploadUrl, assetUrn } = await registerLinkedInImageUpload(accessToken, authorUrn)
    await uploadLinkedInImage(uploadUrl, imageUrl, accessToken)
    shareMediaCategory = "IMAGE"
    media = [{ status: "READY", media: assetUrn }]
  }

  const body: any = {
    author: authorUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text: caption.slice(0, 3000) },
        shareMediaCategory,
        ...(media.length > 0 ? { media } : {}),
      },
    },
    visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
  }

  const res = await fetch(LINKEDIN_BASE + "/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + accessToken,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) throw new Error("LinkedIn post failed: " + await res.text())
  return res.headers.get("x-restli-id") ?? "linkedin-posted"
}

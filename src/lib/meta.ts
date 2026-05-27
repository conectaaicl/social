const META_V = "v21.0"
const META_BASE = `https://graph.facebook.com/${META_V}`

export interface MetaPage {
  id: string
  name: string
  access_token: string
  instagram_business_account?: { id: string }
}

// Retryable error codes from Meta API
const RETRYABLE_META_CODES = new Set([1, 2, 4, 17, 32, 613, 500, 503])
const THROTTLE_CODES = new Set([4, 17, 32, 613])

async function metaFetch(url: string, options?: RequestInit, retries = 3): Promise<any> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await fetch(url, options)
    const data = await res.json()
    if (!data.error) return data

    const code = data.error.code as number
    const isRetryable = RETRYABLE_META_CODES.has(code) || res.status >= 500
    const isThrottle = THROTTLE_CODES.has(code)

    if (isRetryable && attempt < retries) {
      const delay = isThrottle
        ? 60_000
        : Math.min(2 ** attempt * 1000, 30_000)
      console.warn("Meta API code " + code + " (attempt " + attempt + "/" + retries + "), retrying in " + delay + "ms")
      await new Promise((r) => setTimeout(r, delay))
      continue
    }

    throw new Error("Meta API: " + data.error.message + " (code " + code + ")")
  }
}

export async function exchangeForLongLivedToken(shortToken: string): Promise<string> {
  const url = new URL(`${META_BASE}/oauth/access_token`)
  url.searchParams.set("grant_type", "fb_exchange_token")
  url.searchParams.set("client_id", process.env.META_APP_ID!)
  url.searchParams.set("client_secret", process.env.META_APP_SECRET!)
  url.searchParams.set("fb_exchange_token", shortToken)
  const data = await metaFetch(url.toString())
  return data.access_token
}

export async function getUserPages(userToken: string): Promise<MetaPage[]> {
  const url = `${META_BASE}/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${userToken}`
  const data = await metaFetch(url)
  return data.data ?? []
}

export async function getIGUserId(pageId: string, userToken: string): Promise<string | null> {
  try {
    const url = `${META_BASE}/${pageId}?fields=instagram_business_account&access_token=${userToken}`
    const data = await metaFetch(url)
    return data.instagram_business_account?.id ?? null
  } catch {
    return null
  }
}

async function createIGContainer(
  igUserId: string,
  userToken: string,
  params: Record<string, string>
): Promise<string> {
  const body = new URLSearchParams({ access_token: userToken, ...params })
  const data = await metaFetch(`${META_BASE}/${igUserId}/media`, {
    method: "POST",
    body,
  })
  return data.id
}

async function waitForIGContainer(containerId: string, userToken: string): Promise<void> {
  const maxAttempts = 30
  for (let i = 0; i < maxAttempts; i++) {
    const url = `${META_BASE}/${containerId}?fields=status_code,status&access_token=${userToken}`
    const data = await metaFetch(url)
    if (data.status_code === "FINISHED") return
    if (data.status_code === "ERROR") throw new Error(`Container error: ${data.status}`)
    await new Promise((r) => setTimeout(r, 5000))
  }
  throw new Error("Container processing timeout")
}

async function publishIGContainer(igUserId: string, containerId: string, userToken: string): Promise<string> {
  const body = new URLSearchParams({ creation_id: containerId, access_token: userToken })
  const data = await metaFetch(`${META_BASE}/${igUserId}/media_publish`, {
    method: "POST",
    body,
  })
  return data.id
}

export async function publishInstagramFeed(
  igUserId: string,
  userToken: string,
  imageUrl: string,
  caption: string
): Promise<string> {
  const containerId = await createIGContainer(igUserId, userToken, { image_url: imageUrl, caption })
  await waitForIGContainer(containerId, userToken)
  return publishIGContainer(igUserId, containerId, userToken)
}

export async function publishInstagramStory(
  igUserId: string,
  userToken: string,
  imageUrl: string
): Promise<string> {
  const containerId = await createIGContainer(igUserId, userToken, {
    image_url: imageUrl,
    media_type: "STORIES",
  })
  await waitForIGContainer(containerId, userToken)
  return publishIGContainer(igUserId, containerId, userToken)
}

export async function publishInstagramReel(
  igUserId: string,
  userToken: string,
  videoUrl: string,
  caption: string
): Promise<string> {
  const containerId = await createIGContainer(igUserId, userToken, {
    media_type: "REELS",
    video_url: videoUrl,
    caption,
    share_to_feed: "true",
  })
  await waitForIGContainer(containerId, userToken)
  return publishIGContainer(igUserId, containerId, userToken)
}


// ── Instagram Carousel (multi-image post) ────────────────────────────────────
export async function publishInstagramCarousel(
  igUserId: string,
  accessToken: string,
  mediaUrls: string[],
  caption: string
): Promise<string> {
  const base = "https://graph.facebook.com/v21.0"

  // 1. Create child containers (one per image, no caption)
  const childIds: string[] = []
  for (const url of mediaUrls.slice(0, 10)) {  // Max 10 slides
    const r = await fetch(`${base}/${igUserId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: url, is_carousel_item: true, access_token: accessToken }),
    })
    const d = await r.json()
    if (d.error) throw new Error(`Carousel child error: ${d.error.message}`)
    childIds.push(d.id)
  }

  // 2. Create carousel container
  const carouselR = await fetch(`${base}/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ media_type: "CAROUSEL", caption, children: childIds.join(","), access_token: accessToken }),
  })
  const carouselD = await carouselR.json()
  if (carouselD.error) throw new Error(`Carousel container error: ${carouselD.error.message}`)

  // 3. Publish
  const pubR = await fetch(`${base}/${igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: carouselD.id, access_token: accessToken }),
  })
  const pubD = await pubR.json()
  if (pubD.error) throw new Error(`Carousel publish error: ${pubD.error.message}`)
  return pubD.id
}

export async function publishFacebookPost(
  pageId: string,
  pageToken: string,
  message: string,
  imageUrl?: string
): Promise<string> {
  const params: Record<string, string> = { message, access_token: pageToken }
  const endpoint = imageUrl ? "photos" : "feed"
  if (imageUrl) params.url = imageUrl
  const body = new URLSearchParams(params)
  const data = await metaFetch(`${META_BASE}/${pageId}/${endpoint}`, {
    method: "POST",
    body,
  })
  return data.id ?? data.post_id
}

export async function publishFacebookStory(
  pageId: string,
  pageToken: string,
  imageUrl: string
): Promise<string> {
  const body = new URLSearchParams({
    url: imageUrl,
    published: "false",
    temporary_status: "PUBLISHED",
    access_token: pageToken,
  })
  const photo = await metaFetch(`${META_BASE}/${pageId}/photos`, { method: "POST", body })
  const storyBody = new URLSearchParams({
    photo_id: photo.id,
    access_token: pageToken,
  })
  const data = await metaFetch(`${META_BASE}/${pageId}/photo_stories`, { method: "POST", body: storyBody })
  return data.success ? photo.id : data.id
}

export async function getMediaInsights(mediaId: string, accessToken: string) {
  try {
    const url = `${META_BASE}/${mediaId}/insights?metric=reach,impressions,likes,comments,shares&access_token=${accessToken}`
    const data = await metaFetch(url)
    const metrics: Record<string, number> = {}
    for (const item of data.data ?? []) {
      metrics[item.name] = item.values?.[0]?.value ?? 0
    }
    return {
      reach: metrics.reach ?? 0,
      likes: metrics.likes ?? 0,
      comments: metrics.comments ?? 0,
    }
  } catch {
    return { reach: 0, likes: 0, comments: 0 }
  }
}

export async function getPostComments(mediaId: string, accessToken: string) {
  try {
    const url = `${META_BASE}/${mediaId}/comments?fields=id,text,username,timestamp&access_token=${accessToken}`
    const data = await metaFetch(url)
    return (data.data ?? []) as Array<{ id: string; text: string; username: string; timestamp: string }>
  } catch {
    return []
  }
}

export async function replyToComment(commentId: string, accessToken: string, message: string): Promise<string> {
  const body = new URLSearchParams({ message, access_token: accessToken })
  const data = await metaFetch(`${META_BASE}/${commentId}/replies`, { method: "POST", body })
  return data.id
}

export async function getHashtagTopPosts(hashtag: string, igUserId: string, accessToken: string) {
  try {
    // Search hashtag ID
    const hashtagData = await metaFetch(
      `${META_BASE}/ig_hashtag_search?user_id=${igUserId}&q=${encodeURIComponent(hashtag)}&access_token=${accessToken}`
    )
    const hashtagId = hashtagData.data?.[0]?.id
    if (!hashtagId) return []

    // Get top media
    const media = await metaFetch(
      `${META_BASE}/${hashtagId}/top_media?user_id=${igUserId}&fields=id,caption,media_type,like_count,comments_count,timestamp&access_token=${accessToken}`
    )
    return media.data ?? []
  } catch {
    return []
  }
}

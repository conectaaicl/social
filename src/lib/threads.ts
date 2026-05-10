const THREADS_BASE = "https://graph.threads.net/v1.0"

async function threadsFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, options)
  const data = await res.json()
  if (data.error) throw new Error(`Threads API: ${data.error.message} (code ${data.error.code})`)
  return data
}

export async function publishThreadsPost(
  userId: string,
  accessToken: string,
  text: string,
  imageUrl?: string
): Promise<string> {
  const containerBody: Record<string, string> = {
    media_type: imageUrl ? "IMAGE" : "TEXT",
    text,
    access_token: accessToken,
  }
  if (imageUrl) containerBody.image_url = imageUrl

  const container = await threadsFetch(`${THREADS_BASE}/${userId}/threads`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(containerBody),
  })

  await new Promise((r) => setTimeout(r, 3000))

  const publish = await threadsFetch(`${THREADS_BASE}/${userId}/threads_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ creation_id: container.id, access_token: accessToken }),
  })

  return publish.id
}

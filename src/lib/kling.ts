const FAL_KEY = process.env.FAL_KEY ?? ""

// Kling AI via fal.ai — real cinematic video generation
export async function generateKlingVideo(params: {
  prompt: string
  imageUrl?: string  // if provided, uses image-to-video
  duration?: 5 | 10
  aspectRatio?: "16:9" | "9:16" | "1:1"
}): Promise<string> {
  const { prompt, imageUrl, duration = 5, aspectRatio = "9:16" } = params

  const model = imageUrl
    ? "https://fal.run/fal-ai/kling-video/v1.6/pro/image-to-video"
    : "https://fal.run/fal-ai/kling-video/v1.6/pro/text-to-video"

  const body: Record<string, any> = {
    prompt,
    duration: String(duration),
    aspect_ratio: aspectRatio,
    cfg_scale: 0.5,
  }

  if (imageUrl) {
    body.image_url = imageUrl
  }

  const res = await fetch(model, {
    method: "POST",
    headers: {
      Authorization: `Key ${FAL_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Kling AI error: ${res.status} — ${err}`)
  }

  const data = await res.json()

  // fal.ai returns request_id for async jobs, or video directly
  if (data.video?.url) return data.video.url
  if (data.request_id) {
    // Poll for result
    return pollKlingResult(data.request_id)
  }

  throw new Error("Kling AI did not return a video URL")
}

async function pollKlingResult(requestId: string): Promise<string> {
  const maxAttempts = 60
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 5000))
    const res = await fetch(`https://fal.run/fal-ai/kling-video/requests/${requestId}`, {
      headers: { Authorization: `Key ${FAL_KEY}` },
    })
    const data = await res.json()
    if (data.status === "COMPLETED" && data.video?.url) return data.video.url
    if (data.status === "FAILED") throw new Error(`Kling generation failed: ${data.error}`)
  }
  throw new Error("Kling AI: timeout waiting for video")
}

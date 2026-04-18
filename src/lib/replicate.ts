const REPLICATE_BASE = "https://api.replicate.com/v1"

// Stable Video Diffusion — anima una imagen estática en un clip corto (2-4s)
// Esto permite crear Reels desde imágenes generadas por fal.ai
const SVD_MODEL = "stability-ai/stable-video-diffusion"

async function createPrediction(input: Record<string, unknown>): Promise<string> {
  const res = await fetch(`${REPLICATE_BASE}/models/${SVD_MODEL}/predictions`, {
    method: "POST",
    headers: {
      Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
      "Content-Type": "application/json",
      Prefer: "wait=60",
    },
    body: JSON.stringify({ input }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Replicate error: ${res.status} — ${err}`)
  }

  const prediction = await res.json()
  if (prediction.error) throw new Error(`Replicate: ${prediction.error}`)

  if (prediction.status === "succeeded" && prediction.output) {
    return Array.isArray(prediction.output) ? prediction.output[0] : prediction.output
  }

  return pollPrediction(prediction.id)
}

async function pollPrediction(id: string): Promise<string> {
  const maxAttempts = 40
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 5000))
    const res = await fetch(`${REPLICATE_BASE}/predictions/${id}`, {
      headers: { Authorization: `Token ${process.env.REPLICATE_API_TOKEN}` },
    })
    const prediction = await res.json()

    if (prediction.status === "succeeded") {
      return Array.isArray(prediction.output) ? prediction.output[0] : prediction.output
    }
    if (prediction.status === "failed") {
      throw new Error(`Replicate prediction failed: ${prediction.error}`)
    }
  }
  throw new Error("Replicate prediction timeout (200s)")
}

export async function animateImageToVideo(imageUrl: string): Promise<string> {
  return createPrediction({
    input_image: imageUrl,
    sizing_strategy: "maintain_aspect_ratio",
    frames_per_second: 6,
    motion_bucket_id: 100,
    cond_aug: 0.02,
    decoding_t: 7,
    output_format: "mp4",
  })
}

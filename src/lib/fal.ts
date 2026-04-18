const FAL_KEY = process.env.FAL_KEY ?? ""

type ImageSize = "square_hd" | "portrait_16_9" | "landscape_16_9"

export function imageSizeForPostType(postType: string): ImageSize {
  if (postType === "STORY" || postType === "REEL") return "portrait_16_9"
  return "square_hd"
}

// Enhance prompt for maximum professional quality
function buildEnhancedPrompt(basePrompt: string, postType: string): string {
  const styleBase = [
    "ultra high resolution commercial photography",
    "professional product photography",
    "shallow depth of field",
    "studio lighting with soft natural fill light",
    "sharp focus on subject",
    "beautiful bokeh background",
    "color graded",
    "editorial quality",
    "8K resolution",
    "photorealistic",
  ].join(", ")

  const vertical = postType === "STORY" || postType === "REEL"
  const aspectNote = vertical
    ? "vertical 9:16 composition, portrait orientation"
    : "square 1:1 composition, centered subject"

  const negative = "blurry, low quality, pixelated, watermark, text overlay, logo, amateur, overexposed, dark, noisy, distorted"

  return `${basePrompt}. ${styleBase}. ${aspectNote}. Negative prompt: ${negative}`
}

export async function generateImage(prompt: string, postType: string): Promise<string> {
  const imageSize = imageSizeForPostType(postType)
  const enhancedPrompt = buildEnhancedPrompt(prompt, postType)

  // Try Flux Pro first (best quality), fallback to Flux Dev
  const models = [
    "https://fal.run/fal-ai/flux-pro",
    "https://fal.run/fal-ai/flux/dev",
  ]

  for (const modelUrl of models) {
    try {
      const res = await fetch(modelUrl, {
        method: "POST",
        headers: {
          Authorization: `Key ${FAL_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: enhancedPrompt,
          image_size: imageSize,
          num_inference_steps: modelUrl.includes("pro") ? 40 : 28,
          guidance_scale: modelUrl.includes("pro") ? 3.5 : 7.5,
          num_images: 1,
          enable_safety_checker: false,
          output_format: "jpeg",
        }),
      })

      if (!res.ok) continue

      const data = await res.json()
      const imageUrl = data.images?.[0]?.url
      if (imageUrl) return imageUrl
    } catch {
      continue
    }
  }

  throw new Error("fal.ai: no se pudo generar la imagen con ningún modelo disponible")
}

// Generate multiple variations for A/B testing
export async function generateImageVariants(prompt: string, postType: string, count = 2): Promise<string[]> {
  const imageSize = imageSizeForPostType(postType)
  const enhancedPrompt = buildEnhancedPrompt(prompt, postType)

  const res = await fetch("https://fal.run/fal-ai/flux/dev", {
    method: "POST",
    headers: {
      Authorization: `Key ${FAL_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: enhancedPrompt,
      image_size: imageSize,
      num_inference_steps: 28,
      num_images: count,
      enable_safety_checker: false,
      output_format: "jpeg",
    }),
  })

  if (!res.ok) throw new Error(`fal.ai error: ${res.status}`)
  const data = await res.json()
  return (data.images ?? []).map((img: any) => img.url).filter(Boolean)
}

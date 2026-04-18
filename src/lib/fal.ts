const FAL_BASE = "https://fal.run/fal-ai/flux/dev"

type ImageSize = "square_hd" | "portrait_16_9" | "landscape_16_9"

export function imageSizeForPostType(postType: string): ImageSize {
  if (postType === "STORY" || postType === "REEL") return "portrait_16_9"
  if (postType === "FEED" || postType === "CAROUSEL") return "square_hd"
  return "square_hd"
}

export async function generateImage(prompt: string, postType: string): Promise<string> {
  const imageSize = imageSizeForPostType(postType)

  const res = await fetch(FAL_BASE, {
    method: "POST",
    headers: {
      Authorization: `Key ${process.env.FAL_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: `${prompt}. Ultra high quality, professional photography, sharp focus, 4K.`,
      image_size: imageSize,
      num_inference_steps: 28,
      num_images: 1,
      enable_safety_checker: false,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`fal.ai error: ${res.status} — ${err}`)
  }

  const data = await res.json()
  const imageUrl = data.images?.[0]?.url

  if (!imageUrl) throw new Error("fal.ai did not return an image URL")
  return imageUrl
}

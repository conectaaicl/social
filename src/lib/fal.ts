import crypto from "crypto"
import fs from "fs"
import path from "path"

const FAL_KEY = process.env.FAL_KEY ?? ""
const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN ?? ""
const STATIC_IMG_DIR = path.join(process.cwd(), "public", "uploads")
const STATIC_IMG_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://social.conectaai.cl") + "/uploads"

type ImageSize = "square_hd" | "portrait_16_9" | "landscape_16_9"

export function imageSizeForPostType(postType: string): ImageSize {
  if (postType === "STORY" || postType === "REEL") return "portrait_16_9"
  return "square_hd"
}

export type ImageCreativeStyle = "catalogo" | "ugc" | "emocional" | "comparativo"

const STYLE_MODIFIERS: Record<ImageCreativeStyle, string> = {
  catalogo: [
    "professional product catalog photography",
    "clean white or neutral background",
    "studio lighting with soft shadows",
    "sharp focus on product",
    "high-end commercial photography",
    "color accurate",
    "editorial quality",
    "8K resolution",
    "photorealistic",
  ].join(", "),
  ugc: [
    "user generated content style",
    "shot on smartphone camera",
    "authentic candid lifestyle photography",
    "natural ambient lighting",
    "real home or outdoor environment",
    "raw and genuine feel",
    "vertical portrait composition",
    "Instagram UGC aesthetic",
  ].join(", "),
  emocional: [
    "cinematic emotional photography",
    "dramatic golden hour lighting",
    "rich warm color palette",
    "shallow depth of field",
    "storytelling composition",
    "atmospheric mood",
    "film-grain texture",
    "8K photorealistic",
    "beautiful bokeh",
  ].join(", "),
  comparativo: [
    "split composition before and after",
    "clear visual comparison layout",
    "professional product photography",
    "clean and organized",
    "high contrast between sections",
    "infographic-style clarity",
    "brand-aligned color scheme",
    "photorealistic",
  ].join(", "),
}

function buildEnhancedPrompt(basePrompt: string, postType: string, style: ImageCreativeStyle = "catalogo"): string {
  const styleModifier = STYLE_MODIFIERS[style]
  const vertical = postType === "STORY" || postType === "REEL"
  const aspectNote = vertical
    ? "vertical 9:16 composition, portrait orientation"
    : "square 1:1 composition, centered subject"

  return `${basePrompt}. ${styleModifier}. ${aspectNote}.`
}

async function replicateGenerateImage(prompt: string, postType: string, negativePrompt?: string): Promise<string> {
  const isVertical = postType === "STORY" || postType === "REEL"
  const aspectRatio = isVertical ? "9:16" : "1:1"

  const res = await fetch("https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions", {
    method: "POST",
    headers: {
      Authorization: `Token ${REPLICATE_TOKEN}`,
      "Content-Type": "application/json",
      Prefer: "wait=60",
    },
    body: JSON.stringify({
      input: {
        prompt,
        aspect_ratio: aspectRatio,
        output_format: "jpg",
        output_quality: 90,
        num_outputs: 1,
        go_fast: true,
        ...(negativePrompt ? { negative_prompt: negativePrompt } : {}),
      },
    }),
  })

  if (!res.ok) throw new Error(`Replicate error: ${res.status}`)

  const prediction = await res.json()
  if (prediction.error) throw new Error(`Replicate: ${prediction.error}`)

  // If not done yet, poll
  if (prediction.status !== "succeeded") {
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 3000))
      const poll = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: { Authorization: `Token ${REPLICATE_TOKEN}` },
      })
      const p = await poll.json()
      if (p.status === "succeeded") {
        const url = Array.isArray(p.output) ? p.output[0] : p.output
        if (url) return url
      }
      if (p.status === "failed") throw new Error(`Replicate failed: ${p.error}`)
    }
    throw new Error("Replicate timeout")
  }

  const url = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output
  if (!url) throw new Error("Replicate: no output URL")
  return url
}

async function unsplashFallback(prompt: string, postType: string): Promise<string> {
  const keywordMap: Record<string, string> = {
    roller: "photo-1535126320463-c5c1b26b3e66",
    cortina: "photo-1598928636135-d146006ff4be",
    persiana: "photo-1618220179428-22790b461013",
    blackout: "photo-1560448204-603b3fc33ddc",
    interior: "photo-1554995207-c18c203602cb",
    ventana: "photo-1586105251261-72a756497a11",
    sala: "photo-1555041469-a586c61ea9bc",
    dormitorio: "photo-1505693416388-ac5ce068fe85",
    hogar: "photo-1484154218962-a197022b5858",
    decoracion: "photo-1524758631624-e2822e304c36",
    default: "photo-1535126320463-c5c1b26b3e66",
  }

  const lower = prompt.toLowerCase()
  for (const [keyword, photoId] of Object.entries(keywordMap)) {
    if (keyword !== "default" && lower.includes(keyword)) {
      return `https://images.unsplash.com/${photoId}?w=1080&h=1080&fit=crop&q=80`
    }
  }
  return `https://images.unsplash.com/${keywordMap.default}?w=1080&h=1080&fit=crop&q=80`
}

export async function generateImage(prompt: string, postType: string, style: ImageCreativeStyle = "catalogo", negativePrompt?: string): Promise<string> {
  const enhancedPrompt = buildEnhancedPrompt(prompt, postType, style)

  // 1. Try fal.ai
  if (FAL_KEY) {
    const models = ["https://fal.run/fal-ai/flux-pro", "https://fal.run/fal-ai/flux/dev"]
    const imageSize = imageSizeForPostType(postType)
    for (const modelUrl of models) {
      try {
        const res = await fetch(modelUrl, {
          method: "POST",
          headers: { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: enhancedPrompt,
            image_size: imageSize,
            num_inference_steps: modelUrl.includes("pro") ? 40 : 28,
            guidance_scale: modelUrl.includes("pro") ? 3.5 : 7.5,
            num_images: 1,
            enable_safety_checker: false,
            output_format: "jpeg",
            ...(negativePrompt ? { negative_prompt: negativePrompt } : {}),
          }),
        })
        if (!res.ok) continue
        const data = await res.json()
        const imageUrl = data.images?.[0]?.url
        if (imageUrl) return imageUrl
      } catch { continue }
    }
  }

  // 2. Try Replicate FLUX
  if (REPLICATE_TOKEN) {
    try {
      console.log("fal.ai unavailable, trying Replicate FLUX...")
      const url = await replicateGenerateImage(enhancedPrompt, postType, negativePrompt)
      if (url) return url
    } catch (e: any) {
      console.warn("Replicate failed:", e.message)
    }
  }

  // 3. Unsplash static fallback
  console.warn("All AI providers failed, using Unsplash fallback")
  return unsplashFallback(prompt, postType)
}

export async function generateImageVariants(prompt: string, postType: string, count = 2): Promise<string[]> {
  const enhancedPrompt = buildEnhancedPrompt(prompt, postType)
  const imageSize = imageSizeForPostType(postType)

  // 1. Try fal.ai
  if (FAL_KEY) {
    try {
      const res = await fetch("https://fal.run/fal-ai/flux/dev", {
        method: "POST",
        headers: { Authorization: `Key ${FAL_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: enhancedPrompt,
          image_size: imageSize,
          num_inference_steps: 28,
          num_images: count,
          enable_safety_checker: false,
          output_format: "jpeg",
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const urls = (data.images ?? []).map((img: any) => img.url).filter(Boolean)
        if (urls.length > 0) return urls
      }
    } catch {}
  }

  // 2. Try Replicate FLUX (generate one by one)
  if (REPLICATE_TOKEN) {
    try {
      const results = await Promise.all(
        Array(count).fill(null).map(() => replicateGenerateImage(enhancedPrompt, postType))
      )
      if (results.length > 0) return results
    } catch (e: any) {
      console.warn("Replicate variants failed:", e.message)
    }
  }

  // 3. Unsplash fallback
  const base = await unsplashFallback(prompt, postType)
  return Array(count).fill(base)
}

export async function saveToStaticServer(buf: Buffer, ext = "jpg"): Promise<string> {
  const fname = `${crypto.randomBytes(12).toString("hex")}.${ext}`
  const fpath = path.join(STATIC_IMG_DIR, fname)
  fs.writeFileSync(fpath, buf)
  return `${STATIC_IMG_URL}/${fname}`
}

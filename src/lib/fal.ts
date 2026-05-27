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


const PEXELS_KEY = process.env.PEXELS_API_KEY ?? ""

// Maps brand keywords + content context to English Pexels queries
function buildPexelsQuery(prompt: string, postType: string): string {
  const lower = prompt.toLowerCase()
  // Product terms
  const termMap: Record<string, string> = {
    roller: "roller blinds window living room",
    cortina: "elegant window curtains modern interior",
    persiana: "venetian blinds home decor",
    blackout: "blackout curtains bedroom dark",
    estores: "roman shades window treatment",
    panel: "curtain panels floor to ceiling living room",
    sheer: "sheer curtains natural light bedroom",
    zebra: "zebra blinds modern home",
    madera: "wood blinds natural light home",
    techo: "ceiling curtains luxury interior",
    terraza: "outdoor patio curtains luxury",
    oficina: "office window blinds modern workspace",
  }
  for (const [es, en] of Object.entries(termMap)) {
    if (lower.includes(es)) return en
  }
  // Default by post type context
  if (lower.includes("tip") || lower.includes("consejo") || lower.includes("decor")) {
    return "modern interior design home decor curtains"
  }
  if (lower.includes("promo") || lower.includes("oferta") || lower.includes("descuento")) {
    return "luxury home curtains window treatment elegant"
  }
  if (lower.includes("proyecto") || lower.includes("instalacion") || lower.includes("antes")) {
    return "window blinds installation modern home"
  }
  return "window curtains home interior design professional"
}

async function pexelsFallback(prompt: string, postType: string): Promise<string> {
  if (!PEXELS_KEY) return ""
  const isVertical = postType === "STORY" || postType === "REEL"
  const orientation = isVertical ? "portrait" : "landscape"
  const query = buildPexelsQuery(prompt, postType)
  try {
    const res = await fetch(
      "https://api.pexels.com/v1/search?query=" + encodeURIComponent(query) + "&per_page=10&orientation=" + orientation + "&size=large",
      { headers: { Authorization: PEXELS_KEY }, signal: AbortSignal.timeout(10_000) }
    )
    if (!res.ok) throw new Error("Pexels " + res.status)
    const data = await res.json()
    const photos = data.photos ?? []
    if (!photos.length) return ""
    // Pick a random one from top results for variety
    const photo = photos[Math.floor(Math.random() * Math.min(5, photos.length))]
    const src = isVertical ? (photo.src?.portrait ?? photo.src?.large) : (photo.src?.large2x ?? photo.src?.large)
    if (!src) return ""
    console.log("Pexels image selected:", src)
    return src
  } catch (e: any) {
    console.warn("Pexels failed:", e.message)
    return ""
  }
}

async function pollinationsFallback(prompt: string, postType: string, negativePrompt?: string): Promise<string> {
  const isVertical = postType === "STORY" || postType === "REEL"
  const width = isVertical ? 768 : 1080
  const height = isVertical ? 1350 : 1080
  const seed = Math.floor(Math.random() * 999999)
  const encoded = encodeURIComponent(prompt.slice(0, 500))
  const negEnc = negativePrompt ? "&negative=" + encodeURIComponent(negativePrompt.slice(0, 200)) : ""
  const url = "https://image.pollinations.ai/prompt/" + encoded + "?width=" + width + "&height=" + height + "&nologo=true&model=flux&seed=" + seed + negEnc
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(60_000) })
    if (!res.ok) throw new Error("Pollinations " + res.status)
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 5000) throw new Error("Pollinations: image too small")
    return await saveToStaticServer(buf, "jpg")
  } catch (e: any) {
    console.warn("Pollinations failed:", e.message)
    const isV = postType === "STORY" || postType === "REEL"
    return "https://images.unsplash.com/photo-1598928636135-d146006ff4be?w=" + (isV ? 768 : 1080) + "&h=" + (isV ? 1350 : 1080) + "&fit=crop&q=80"
  }
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

  // 3. Pexels professional stock photos (free, requires PEXELS_API_KEY)
  const pexelsUrl = await pexelsFallback(prompt, postType)
  if (pexelsUrl) return pexelsUrl

  // 4. Pollinations.ai free AI generation
  console.warn("Pexels not available, using Pollinations AI")
  return pollinationsFallback(prompt, postType, negativePrompt)
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
  const base = await pollinationsFallback(prompt, postType)
  return Array(count).fill(base)
}

export async function saveToStaticServer(buf: Buffer, ext = "jpg"): Promise<string> {
  const fname = `${crypto.randomBytes(12).toString("hex")}.${ext}`
  const fpath = path.join(STATIC_IMG_DIR, fname)
  fs.writeFileSync(fpath, buf)
  return `${STATIC_IMG_URL}/${fname}`
}

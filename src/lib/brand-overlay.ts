import sharp from "sharp"

interface BrandOverlayOptions {
  imageUrl: string
  brandName: string
  brandColors?: string[]   // hex colors, first = primary
  logoUrl?: string
  postType: string
}

function hexToRgba(hex: string, alpha = 255): { r: number; g: number; b: number; alpha: number } {
  const clean = hex.replace("#", "")
  const r = parseInt(clean.substring(0, 2), 16) || 0
  const g = parseInt(clean.substring(2, 4), 16) || 0
  const b = parseInt(clean.substring(4, 6), 16) || 0
  return { r, g, b, alpha }
}

function sanitizeText(text: string): string {
  return text.replace(/[<>&"']/g, " ").slice(0, 40)
}

async function fetchImageBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) })
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

export async function applyBrandOverlay(opts: BrandOverlayOptions): Promise<string> {
  const { imageUrl, brandName, brandColors = ["#1a1a2e"], postType } = opts

  const imageBuffer = await fetchImageBuffer(imageUrl)

  const source = sharp(imageBuffer)
  const meta = await source.metadata()
  const w = meta.width ?? 1080
  const h = meta.height ?? 1080

  const primary = hexToRgba(brandColors[0] ?? "#1a1a2e", 200)

  // Bottom banner: 12% of height
  const bannerH = Math.round(h * 0.12)
  const fontSize = Math.max(24, Math.round(bannerH * 0.4))
  const name = sanitizeText(brandName)
  const url = "social.conectaai.cl"

  const bannerSvg = `
<svg width="${w}" height="${bannerH}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="rgb(${primary.r},${primary.g},${primary.b})" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="rgb(${primary.r},${primary.g},${primary.b})" stop-opacity="0.7"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${bannerH}" fill="url(#grad)"/>
  <text
    x="${Math.round(w * 0.04)}"
    y="${Math.round(bannerH * 0.65)}"
    font-family="Arial, sans-serif"
    font-size="${fontSize}"
    font-weight="bold"
    fill="white"
  >${name}</text>
  <text
    x="${w - Math.round(w * 0.04)}"
    y="${Math.round(bannerH * 0.65)}"
    font-family="Arial, sans-serif"
    font-size="${Math.round(fontSize * 0.55)}"
    fill="rgba(255,255,255,0.7)"
    text-anchor="end"
  >${url}</text>
</svg>`

  const bannerBuffer = Buffer.from(bannerSvg)

  // Small top-right badge
  const badgeSize = Math.round(w * 0.09)
  const badgeSvg = `
<svg width="${badgeSize}" height="${badgeSize}" xmlns="http://www.w3.org/2000/svg">
  <circle cx="${badgeSize / 2}" cy="${badgeSize / 2}" r="${badgeSize / 2}"
    fill="rgb(${primary.r},${primary.g},${primary.b})" opacity="0.85"/>
  <text
    x="50%" y="57%"
    dominant-baseline="middle"
    text-anchor="middle"
    font-family="Arial, sans-serif"
    font-size="${Math.round(badgeSize * 0.32)}"
    font-weight="bold"
    fill="white"
  >${postType.slice(0, 4)}</text>
</svg>`

  const resultBuffer = await source
    .composite([
      { input: bannerBuffer, gravity: "south" },
      { input: Buffer.from(badgeSvg), top: Math.round(h * 0.02), left: w - badgeSize - Math.round(w * 0.02) },
    ])
    .jpeg({ quality: 92 })
    .toBuffer()

  // Return as data URI for immediate use in publisher
  return `data:image/jpeg;base64,${resultBuffer.toString("base64")}`
}

// Upload branded image to static HTTP server (accessible by Meta crawler)
export async function applyBrandOverlayAndUpload(opts: BrandOverlayOptions): Promise<string> {
  try {
    const dataUri = await applyBrandOverlay(opts)
    const base64 = dataUri.replace(/^data:image\/\w+;base64,/, "")
    const buf = Buffer.from(base64, "base64")
    const { saveToStaticServer } = await import("./fal")
    return await saveToStaticServer(buf, "jpg")
  } catch (e) {
    console.warn("brand overlay upload failed, using original", e)
    return opts.imageUrl
  }
}
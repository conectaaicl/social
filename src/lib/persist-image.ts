import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { randomUUID } from "crypto"

/**
 * Downloads an external image URL (e.g. fal.ai CDN, Replicate) and saves it
 * to public/uploads/ so it never expires and Meta can always access it.
 * Returns the absolute URL of the persisted image.
 */
export async function persistExternalImage(externalUrl: string): Promise<string> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://social.conectaai.cl"

  // Already on our server — nothing to do
  if (externalUrl.startsWith(appUrl)) return externalUrl

  const response = await fetch(externalUrl)
  if (!response.ok) throw new Error(`Failed to download image: ${response.status} ${externalUrl}`)

  const contentType = response.headers.get("content-type") ?? "image/jpeg"
  const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg"
  const filename = `${randomUUID()}.${ext}`

  const uploadsDir = join(process.cwd(), "public", "uploads")
  await mkdir(uploadsDir, { recursive: true })
  await writeFile(join(uploadsDir, filename), Buffer.from(await response.arrayBuffer()))

  return `${appUrl}/uploads/${filename}`
}

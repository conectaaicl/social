import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { uploadToR2 } from "@/lib/r2"
import { z } from "zod"

const schema = z.object({
  url: z.string().url(),
  categoryId: z.string().optional(),
})

const ALLOWED_HOSTS_UPLOAD = [
  '.pexels.com', '.unsplash.com', '.pixabay.com',
  '.fal.media', '.replicate.delivery',
  'pub-98c09ef624ce462a8e1f14035cc06391.r2.dev',
  '.cdninstagram.com', '.fbcdn.net',
]

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const tenantId = session.user.tenantId

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "URL inválida" }, { status: 400 })

  const { url, categoryId } = parsed.data

  // Validate host
  let host: string
  try { host = new URL(url).hostname } catch { return NextResponse.json({ error: "URL inválida" }, { status: 400 }) }
  const allowed = ALLOWED_HOSTS_UPLOAD.some(h => host.endsWith(h) || host === h.replace(/^\./, ''))
  if (!allowed) return NextResponse.json({ error: "Origen no permitido" }, { status: 403 })

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
    if (!res.ok) return NextResponse.json({ error: "No se pudo descargar la imagen" }, { status: 400 })

    const contentType = res.headers.get("content-type") ?? "image/jpeg"
    if (!contentType.startsWith("image/")) return NextResponse.json({ error: "El archivo no es una imagen" }, { status: 400 })

    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length > 10 * 1024 * 1024) return NextResponse.json({ error: "Imagen demasiado grande (max 10MB)" }, { status: 400 })

    const ext = contentType.includes("png") ? "png" : "jpg"
    const key = `${tenantId}/${Date.now()}.${ext}`
    const r2Url = await uploadToR2(key, buf, contentType)

    // Save to media library
    const item = await prisma.mediaItem.create({
      data: {
        tenantId,
        url: r2Url,
        type: "IMAGE",
        source: "UPLOADED",
        tags: [],
        categoryId: categoryId || undefined,
      },
    })

    return NextResponse.json({ ok: true, url: r2Url, mediaItemId: item.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message?.slice(0, 200) }, { status: 500 })
  }
}

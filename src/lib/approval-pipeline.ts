import { prisma } from "@/lib/prisma"
import { randomBytes } from "crypto"

const EVO_BASE = process.env.EVOLUTION_API_URL ?? "http://localhost:8082"
const EVO_KEY = process.env.EVOLUTION_API_KEY ?? ""
const EVO_INSTANCE = process.env.EVOLUTION_INSTANCE ?? "social"

async function sendWA(phone: string, text: string) {
  const url = `${EVO_BASE}/message/sendText/${EVO_INSTANCE}`
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: EVO_KEY },
    body: JSON.stringify({ number: phone, text }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Evolution API error: ${err}`)
  }
  return res.json()
}

async function sendWAImage(phone: string, imageUrl: string, caption: string) {
  const url = `${EVO_BASE}/message/sendMedia/${EVO_INSTANCE}`
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: EVO_KEY },
    body: JSON.stringify({
      number: phone,
      mediatype: "image",
      mimetype: "image/jpeg",
      media: imageUrl,
      caption,
    }),
  })
  if (!res.ok) {
    // fallback to text if image fails
    console.warn("WA image send failed, falling back to text")
    return sendWA(phone, caption)
  }
  return res.json()
}

export interface ApprovalRequest {
  postId: string
  tenantName: string
  caption: string
  hashtags: string
  postType: string
  contentType?: string
  platforms: string[]
  scheduledAt: Date
  mediaUrl: string
}

export async function sendApprovalRequest(phone: string, req: ApprovalRequest): Promise<string> {
  const token = randomBytes(4).toString("hex").toUpperCase()

  // Store token in post
  await prisma.post.update({
    where: { id: req.postId },
    data: {
      status: "PENDING_APPROVAL",
      approvalToken: token,
      approvalSentAt: new Date(),
    },
  })

  const platformEmojis = req.platforms.map(p => p === "INSTAGRAM" ? "📸 Instagram" : "📘 Facebook").join(" + ")
  const scheduledStr = new Date(req.scheduledAt).toLocaleString("es-CL", {
    timeZone: "America/Santiago",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })

  const message = `🎨 *Nuevo post listo para aprobar — ${req.tenantName}*

📋 *Tipo:* ${req.postType} · ${req.contentType ?? ""}
📱 *Plataforma:* ${platformEmojis}
🗓 *Programado:* ${scheduledStr}

📝 *Caption:*
_${req.caption.slice(0, 200)}${req.caption.length > 200 ? "..." : ""}_

🏷 *Hashtags:* ${req.hashtags.slice(0, 100)}

🔑 *Token:* \`${token}\`

✅ Responde *OK ${token}* para aprobar
❌ Responde *NO ${token}* para rechazar
✏️ Responde *EDIT ${token} <nuevo caption>* para editar`

  // Try sending with image preview first
  try {
    if (req.mediaUrl && !req.mediaUrl.startsWith("data:")) {
      await sendWAImage(phone, req.mediaUrl, message)
    } else {
      await sendWA(phone, message)
    }
  } catch (err) {
    console.error("Approval WA send error:", err)
    throw err
  }

  return token
}

export async function processApprovalResponse(body: string, fromPhone: string): Promise<void> {
  const text = body.trim().toUpperCase()

  // Match: OK ABC123 or NO ABC123 or EDIT ABC123 nuevo texto
  const okMatch = text.match(/^OK\s+([A-F0-9]{8})/)
  const noMatch = text.match(/^NO\s+([A-F0-9]{8})/)
  const editMatch = body.trim().match(/^EDIT\s+([A-F0-9]{8})\s+(.+)/i)

  if (okMatch) {
    const token = okMatch[1]
    const post = await prisma.post.findFirst({
      where: { approvalToken: token, status: "PENDING_APPROVAL" },
    })
    if (!post) return

    await prisma.post.update({
      where: { id: post.id },
      data: { status: "SCHEDULED", approvalToken: null },
    })

    await sendWA(fromPhone, `✅ Post aprobado y programado para publicación.\n\nID: ${post.id}`)
    return
  }

  if (noMatch) {
    const token = noMatch[1]
    const post = await prisma.post.findFirst({
      where: { approvalToken: token, status: "PENDING_APPROVAL" },
    })
    if (!post) return

    await prisma.post.update({
      where: { id: post.id },
      data: { status: "FAILED", failReason: "Rechazado via WhatsApp", approvalToken: null },
    })

    await sendWA(fromPhone, `❌ Post rechazado y archivado.`)
    return
  }

  if (editMatch) {
    const token = editMatch[1].toUpperCase()
    const newCaption = editMatch[2].trim()
    const post = await prisma.post.findFirst({
      where: { approvalToken: token, status: "PENDING_APPROVAL" },
    })
    if (!post) return

    await prisma.post.update({
      where: { id: post.id },
      data: { caption: newCaption, status: "SCHEDULED", approvalToken: null },
    })

    await sendWA(fromPhone, `✏️ Caption actualizado y post aprobado.\n\nNuevo caption: _${newCaption.slice(0, 100)}_`)
    return
  }
}

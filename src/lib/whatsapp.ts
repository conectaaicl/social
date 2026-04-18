const EVO_BASE = process.env.EVOLUTION_API_URL ?? "http://localhost:8080"
const EVO_KEY = process.env.EVOLUTION_API_KEY ?? ""
const EVO_INSTANCE = process.env.EVOLUTION_INSTANCE ?? "social"

async function sendWhatsAppMessage(phone: string, text: string) {
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

export async function sendWeeklyWhatsAppReport(params: {
  phone: string
  tenantName: string
  published: number
  scheduled: number
  reach: number
  likes: number
  topCaption: string
}) {
  const { phone, tenantName, published, scheduled, reach, likes, topCaption } = params
  const text = `📊 *Reporte Semanal — ${tenantName}*

✅ Posts publicados: *${published}*
📅 Posts programados: *${scheduled}*
👁 Alcance total: *${reach.toLocaleString("es-CL")}*
❤️ Likes totales: *${likes.toLocaleString("es-CL")}*

🏆 *Top post de la semana:*
_${topCaption.slice(0, 120)}..._

📱 Ver más en: https://social.conectaai.cl/dashboard/analytics`

  return sendWhatsAppMessage(phone, text)
}

export async function sendPostPublishedWhatsApp(params: {
  phone: string
  platform: string
  postType: string
  caption: string
}) {
  const { phone, platform, postType, caption } = params
  const platformEmoji = platform === "INSTAGRAM" ? "📸" : "📘"
  const text = `${platformEmoji} *Post publicado en ${platform}*
Tipo: ${postType}
_${caption.slice(0, 100)}..._`

  return sendWhatsAppMessage(phone, text).catch(() => {})
}

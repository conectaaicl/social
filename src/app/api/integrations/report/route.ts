/**
 * Integration: Reporte ejecutivo unificado
 *
 * Agrega métricas de social.conectaai.cl + (opcionalmente) seo.conectaai.cl + osw.conectaai.cl
 * y envía un resumen por WhatsApp (Evolution API) y/o email (mail.conectaai.cl)
 *
 * Called by n8n every Monday at 09:00
 * POST /api/integrations/report
 * Auth: Bearer CRON_SECRET
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import Anthropic from "@anthropic-ai/sdk"

function authOk(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? ""
  return auth === `Bearer ${process.env.CRON_SECRET}`
}

async function fetchSeoStats(tenantSlug: string): Promise<string> {
  const url = process.env.SEO_API_URL
  const key = process.env.SEO_API_KEY
  if (!url || !key) return ""
  try {
    const res = await fetch(`${url}/api/v1/analytics/summary?tenant=${tenantSlug}`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return ""
    const d = await res.json()
    return `\n📦 *MercadoLibre (seo):*\n• Ventas este mes: $${(d.revenue ?? 0).toLocaleString("es-CL")} CLP\n• Órdenes: ${d.orders ?? 0}\n• Productos activos: ${d.activeProducts ?? 0}`
  } catch { return "" }
}

async function fetchOswStats(tenantSlug: string): Promise<string> {
  const url = process.env.OSW_API_URL
  const key = process.env.OSW_API_KEY
  if (!url || !key) return ""
  try {
    const res = await fetch(`${url}/api/integrations/social-stats?tenant=${tenantSlug}`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return ""
    const d = await res.json()
    return `\n💬 *OmniFlow (osw):*\n• Conversaciones: ${d.conversations ?? 0}\n• Leads calificados: ${d.qualifiedLeads ?? 0}\n• Score promedio: ${d.avgScore ?? "N/A"}`
  } catch { return "" }
}

async function sendWhatsApp(phone: string, message: string): Promise<void> {
  const evolutionUrl = process.env.EVOLUTION_API_URL
  const evolutionKey = process.env.EVOLUTION_API_KEY
  const instanceName = process.env.EVOLUTION_INSTANCE
  if (!evolutionUrl || !evolutionKey || !instanceName) return

  await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: evolutionKey,
    },
    body: JSON.stringify({ number: phone, text: message }),
  }).catch(() => {})
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const mailUrl = process.env.MAIL_API_URL   // e.g. https://mail.conectaai.cl/api
  const mailKey = process.env.MAIL_API_KEY
  if (!mailUrl || !mailKey) {
    // Fallback: use SMTP directly (already configured for password recovery)
    const { sendEmail: smtpSend } = await import("@/lib/mail").catch(() => ({ sendEmail: null }))
    if (smtpSend) await smtpSend({ to, subject, html }).catch(() => {})
    return
  }
  await fetch(`${mailUrl}/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${mailKey}` },
    body: JSON.stringify({ to, subject, html }),
  }).catch(() => {})
}

export async function POST(req: NextRequest) {
  if (!authOk(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { tenantSlug, whatsappPhone, email } = await req.json().catch(() => ({}))

  // Fetch all tenants if no specific slug provided
  const tenants = tenantSlug
    ? [await prisma.tenant.findUnique({
        where: { slug: tenantSlug },
        include: { brandVoice: true },
      })].filter(Boolean)
    : await prisma.tenant.findMany({
        where: { active: true },
        include: { brandVoice: true },
      })

  const reports: string[] = []

  for (const tenant of tenants) {
    if (!tenant) continue

    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [weekPosts, monthPosts, pendingComments, topPost] = await Promise.all([
      prisma.post.findMany({
        where: { tenantId: tenant.id, status: "PUBLISHED", publishedAt: { gte: weekAgo } },
        select: { reach: true, likes: true, comments: true, type: true },
      }),
      prisma.post.count({ where: { tenantId: tenant.id, status: "PUBLISHED", publishedAt: { gte: monthStart } } }),
      prisma.postComment.count({ where: { tenantId: tenant.id, replied: false } }).catch(() => 0),
      prisma.post.findFirst({
        where: { tenantId: tenant.id, status: "PUBLISHED", publishedAt: { gte: weekAgo } },
        orderBy: { reach: "desc" },
        select: { caption: true, type: true, reach: true, likes: true },
      }),
    ])

    const weekReach = weekPosts.reduce((s, p) => s + (p.reach ?? 0), 0)
    const weekLikes = weekPosts.reduce((s, p) => s + (p.likes ?? 0), 0)
    const weekComments = weekPosts.reduce((s, p) => s + (p.comments ?? 0), 0)
    const engRate = weekReach > 0 ? (((weekLikes + weekComments) / weekReach) * 100).toFixed(1) : "0"

    // Fetch cross-system stats (won't fail if services are down)
    const seoBlock = await fetchSeoStats(tenant.slug)
    const oswBlock = await fetchOswStats(tenant.slug)

    // Generate AI executive summary
    const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const summaryMsg = await claude.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [{
        role: "user",
        content: `Eres un analista de marketing digital. En 2-3 oraciones concisas y motivadoras, resume la semana de ${tenant.name}:
- Posts publicados esta semana: ${weekPosts.length}
- Alcance total: ${weekReach.toLocaleString()}
- Engagement rate: ${engRate}%
- Post más exitoso: ${topPost ? `${topPost.type} con ${topPost.reach?.toLocaleString()} alcance` : "N/A"}
Tono: profesional pero entusiasta. En español chileno. Solo las 2-3 oraciones, sin saludos.`,
      }],
    }).catch(() => null)

    const aiSummary = summaryMsg?.content[0]?.type === "text"
      ? summaryMsg.content[0].text
      : ""

    const message = `📊 *Reporte Semanal — ${tenant.name}*
━━━━━━━━━━━━━━━━━━━━━
📱 *Redes Sociales (social):*
• Posts esta semana: ${weekPosts.length}
• Posts este mes: ${monthPosts}
• Alcance semanal: ${weekReach.toLocaleString()}
• Likes: ${weekLikes.toLocaleString()} · Comentarios: ${weekComments}
• Engagement rate: ${engRate}%
• Comentarios sin responder: ${pendingComments}
${topPost ? `• 🏆 Top post: ${topPost.type} (${topPost.reach?.toLocaleString()} alcance)` : ""}${seoBlock}${oswBlock}
━━━━━━━━━━━━━━━━━━━━━
💡 ${aiSummary}

Ver dashboard: ${process.env.NEXTAUTH_URL ?? "https://social.conectaai.cl"}/dashboard`

    reports.push(message)

    // Send notifications
    const phone = whatsappPhone || tenant.brandVoice?.autoReplyTone  // reuse field or override
    if (phone) await sendWhatsApp(phone, message)

    const emailTo = email || ""
    if (emailTo) {
      const html = `<pre style="font-family:monospace;white-space:pre-wrap">${message}</pre>`
      await sendEmail(emailTo, `Reporte Semanal — ${tenant.name}`, html)
    }
  }

  return NextResponse.json({ ok: true, tenants: tenants.length, reports })
}

const MAIL_API_URL = process.env.MAILSAAS_API_URL ?? "https://mail.conectaai.cl/api"
const MAIL_API_KEY = process.env.MAILSAAS_API_KEY ?? ""
const MAIL_FROM = process.env.MAIL_FROM ?? "noreply@social.conectaai.cl"

interface EmailPayload {
  to: string
  subject: string
  html: string
  from?: string
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const res = await fetch(`${MAIL_API_URL}/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${MAIL_API_KEY}`,
    },
    body: JSON.stringify({
      from: payload.from ?? MAIL_FROM,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error(`mail.conectaai.cl error: ${res.status}`, err)
  }
}

export async function sendPostPublished(params: {
  email: string
  tenantName: string
  caption: string
  platforms: string[]
  postType: string
}) {
  await sendEmail({
    to: params.email,
    subject: `✅ Post publicado — ${params.platforms.join(" & ")}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <h2 style="color:#4f46e5">ConectaAI Social</h2>
        <p>¡Tu contenido fue publicado exitosamente!</p>
        <div style="background:#f5f3ff;border-radius:8px;padding:16px;margin:16px 0">
          <p style="color:#6b7280;font-size:12px;margin:0 0 8px">${params.platforms.join(" · ")} · ${params.postType}</p>
          <p style="color:#111827;margin:0">${params.caption.slice(0, 200)}${params.caption.length > 200 ? "..." : ""}</p>
        </div>
        <p style="color:#6b7280;font-size:12px">ConectaAI Social — ${params.tenantName}</p>
      </div>
    `,
  })
}

export async function sendPostFailed(params: {
  email: string
  tenantName: string
  caption: string
  platforms: string[]
  error: string
}) {
  await sendEmail({
    to: params.email,
    subject: `⚠️ Error al publicar post — ${params.platforms.join(" & ")}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <h2 style="color:#ef4444">Error de publicación</h2>
        <p>Hubo un problema al publicar tu contenido en ${params.platforms.join(" y ")}.</p>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0">
          <p style="color:#dc2626;font-size:13px;margin:0"><strong>Error:</strong> ${params.error}</p>
        </div>
        <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:16px 0">
          <p style="color:#6b7280;font-size:12px;margin:0 0 8px">Post afectado:</p>
          <p style="color:#111827;margin:0">${params.caption.slice(0, 200)}...</p>
        </div>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/posts" style="color:#4f46e5">Ver posts fallidos →</a></p>
        <p style="color:#6b7280;font-size:12px">ConectaAI Social — ${params.tenantName}</p>
      </div>
    `,
  })
}

export async function sendWeeklyReport(params: {
  email: string
  tenantName: string
  stats: {
    published: number
    failed: number
    reach: number
    likes: number
  }
}) {
  await sendEmail({
    to: params.email,
    subject: `📊 Reporte semanal — ${params.tenantName}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <h2 style="color:#4f46e5">Resumen de la semana</h2>
        <p>Aquí está el desempeño de tu cuenta esta semana:</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:20px 0">
          <div style="background:#f0fdf4;border-radius:8px;padding:16px;text-align:center">
            <p style="font-size:32px;font-weight:bold;color:#16a34a;margin:0">${params.stats.published}</p>
            <p style="color:#6b7280;font-size:13px;margin:4px 0 0">Posts publicados</p>
          </div>
          <div style="background:#fef9c3;border-radius:8px;padding:16px;text-align:center">
            <p style="font-size:32px;font-weight:bold;color:#ca8a04;margin:0">${params.stats.reach.toLocaleString()}</p>
            <p style="color:#6b7280;font-size:13px;margin:4px 0 0">Alcance total</p>
          </div>
        </div>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/analytics" style="color:#4f46e5">Ver analytics completos →</a></p>
        <p style="color:#6b7280;font-size:12px">ConectaAI Social — ${params.tenantName}</p>
      </div>
    `,
  })
}

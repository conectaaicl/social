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
  publishedThisWeek: number
  scheduledUpcoming: number
  totalReach: number
  weekReach: number
  weekLikes: number
  weekComments: number
  topCaption: string
}) {
  await sendEmail({
    to: params.email,
    subject: `📊 Reporte semanal — ${params.tenantName}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <h2 style="color:#4f46e5">Resumen de la semana — ${params.tenantName}</h2>
        <p>Aquí está el desempeño de tu cuenta esta semana:</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:20px 0">
          <div style="background:#f0fdf4;border-radius:8px;padding:16px;text-align:center">
            <p style="font-size:32px;font-weight:bold;color:#16a34a;margin:0">${params.publishedThisWeek}</p>
            <p style="color:#6b7280;font-size:13px;margin:4px 0 0">Posts publicados</p>
          </div>
          <div style="background:#fef9c3;border-radius:8px;padding:16px;text-align:center">
            <p style="font-size:32px;font-weight:bold;color:#ca8a04;margin:0">${params.weekReach.toLocaleString()}</p>
            <p style="color:#6b7280;font-size:13px;margin:4px 0 0">Alcance esta semana</p>
          </div>
          <div style="background:#eff6ff;border-radius:8px;padding:16px;text-align:center">
            <p style="font-size:32px;font-weight:bold;color:#2563eb;margin:0">${params.weekLikes}</p>
            <p style="color:#6b7280;font-size:13px;margin:4px 0 0">Likes</p>
          </div>
          <div style="background:#fdf4ff;border-radius:8px;padding:16px;text-align:center">
            <p style="font-size:32px;font-weight:bold;color:#9333ea;margin:0">${params.scheduledUpcoming}</p>
            <p style="color:#6b7280;font-size:13px;margin:4px 0 0">Posts programados</p>
          </div>
        </div>
        ${params.topCaption !== "—" ? `
        <div style="background:#f8fafc;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #4f46e5">
          <p style="color:#6b7280;font-size:12px;margin:0 0 8px">🏆 Top post de la semana:</p>
          <p style="color:#111827;margin:0;font-style:italic">${params.topCaption.slice(0, 200)}...</p>
        </div>
        ` : ""}
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/analytics" style="color:#4f46e5;font-weight:bold">Ver analytics completos →</a></p>
        <p style="color:#6b7280;font-size:12px">ConectaAI Social — automatizado por IA</p>
      </div>
    `,
  })
}

export async function sendWelcomeCredentials(params: {
  email: string
  name: string
  tenantName: string
  password: string
  loginUrl: string
}) {
  await sendEmail({
    to: params.email,
    subject: `Bienvenido a ConectaAI Social — tus accesos`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;background:#0f0f1a;border-radius:16px;overflow:hidden">
        <div style="background:#4f46e5;padding:32px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700">ConectaAI Social</h1>
          <p style="color:rgba(255,255,255,0.7);margin:8px 0 0;font-size:14px">Tu plataforma de redes sociales con IA</p>
        </div>
        <div style="padding:32px;background:#1a1a2e">
          <p style="color:#e5e7eb;font-size:16px;margin:0 0 8px">Hola, <strong style="color:#fff">${params.name}</strong></p>
          <p style="color:#9ca3af;font-size:14px;margin:0 0 24px">Tu cuenta en <strong style="color:#a5b4fc">${params.tenantName}</strong> esta lista. Tus credenciales:</p>
          <div style="background:#0d0d1f;border:1px solid #312e81;border-radius:12px;padding:20px;margin-bottom:24px">
            <div style="margin-bottom:12px">
              <p style="color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px">Usuario</p>
              <p style="color:#e5e7eb;font-size:15px;font-family:monospace;margin:0;background:#1e1b4b;padding:8px 12px;border-radius:8px">${params.email}</p>
            </div>
            <div>
              <p style="color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px">Contrasena</p>
              <p style="color:#a5b4fc;font-size:15px;font-family:monospace;margin:0;background:#1e1b4b;padding:8px 12px;border-radius:8px;letter-spacing:2px">${params.password}</p>
            </div>
          </div>
          <div style="text-align:center;margin-bottom:24px">
            <a href="${params.loginUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:15px;font-weight:600">
              Iniciar sesion
            </a>
          </div>
          <div style="background:#111827;border-radius:8px;padding:12px 16px">
            <p style="color:#6b7280;font-size:12px;margin:0">Cambia tu contrasena despues del primer acceso en Configuracion.</p>
          </div>
        </div>
        <div style="padding:16px 32px;background:#0a0a14;text-align:center">
          <p style="color:#374151;font-size:12px;margin:0">ConectaAI Social</p>
        </div>
      </div>
    `,
  })
}

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import Link from "next/link"

async function getDashboardData(tenantId: string) {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const [
    published, scheduled, failed, generating, pendingApproval,
    monthPosts, pendingComments, nextPost, recentPosts, socialAccounts,
  ] = await Promise.all([
    prisma.post.count({ where: { tenantId, status: "PUBLISHED" } }),
    prisma.post.count({ where: { tenantId, status: "SCHEDULED" } }),
    prisma.post.count({ where: { tenantId, status: "FAILED" } }),
    prisma.post.count({ where: { tenantId, status: "GENERATING" } }),
    prisma.post.count({ where: { tenantId, status: "PENDING_APPROVAL" } }),
    prisma.post.findMany({
      where: { tenantId, status: "PUBLISHED", publishedAt: { gte: monthStart } },
      select: { reach: true, likes: true, comments: true },
    }),
    prisma.postComment.count({ where: { tenantId, replied: false } }).catch(() => 0),
    prisma.post.findFirst({
      where: { tenantId, status: "SCHEDULED", scheduledAt: { gte: now } },
      orderBy: { scheduledAt: "asc" },
      select: { caption: true, type: true, scheduledAt: true, platform: true },
    }),
    prisma.post.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, caption: true, type: true, status: true, platform: true, reach: true, likes: true, publishedAt: true, thumbnailUrl: true },
    }),
    prisma.socialAccount.findMany({
      where: { tenantId, active: true },
      select: { platform: true, accountName: true, tokenExpiresAt: true },
    }),
  ])
  const monthReach = monthPosts.reduce((s, p) => s + (p.reach ?? 0), 0)
  const monthLikes = monthPosts.reduce((s, p) => s + (p.likes ?? 0), 0)
  const monthComments = monthPosts.reduce((s, p) => s + (p.comments ?? 0), 0)
  const engRate = monthReach > 0 ? (((monthLikes + monthComments) / monthReach) * 100).toFixed(1) : "0"
  return {
    published, scheduled, failed, generating, pendingApproval,
    monthPosts: monthPosts.length, monthReach, monthLikes, monthComments, engagementRate: Number(engRate),
    pendingComments, nextPost, recentPosts, socialAccounts,
  }
}

const ST_COLOR: Record<string, string> = {
  PUBLISHED: "#22c55e", SCHEDULED: "#a78bfa", PENDING_APPROVAL: "#f59e0b",
  FAILED: "#ef4444", GENERATING: "#38bdf8", PUBLISHING: "#06b6d4",
}
const ST_LABEL: Record<string, string> = {
  PUBLISHED: "Publicado", SCHEDULED: "Programado", PENDING_APPROVAL: "Aprobación",
  FAILED: "Fallido", GENERATING: "Generando", PENDING: "Pendiente",
}
const TYPE_LABEL: Record<string, string> = { FEED: "Feed", STORY: "Story", REEL: "Reel", CAROUSEL: "Carrusel" }

function formatTime(d: Date) {
  const diff = Math.floor((d.getTime() - Date.now()) / 1000)
  if (diff < 0) return "pasado"
  const h = Math.floor(diff / 3600); const m = Math.floor((diff % 3600) / 60)
  if (h > 48) return `${Math.floor(h / 24)}d`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

const C = {
  bg: "#080c14", surf: "#0f1623", surf2: "#161d2e", surf3: "#1c2538",
  border: "rgba(255,255,255,0.06)", text: "#e2e8f0", muted: "#64748b",
  violet: "#7c3aed", violetLt: "#a78bfa", green: "#22c55e",
  red: "#ef4444", amber: "#f59e0b", blue: "#3b82f6",
}

export default async function DashboardPage() {
  const session = await auth()
  const tenantId = session?.user?.tenantId
  const name = session?.user?.name?.split(" ")[0] ?? "Usuario"

  const d = tenantId
    ? await getDashboardData(tenantId)
    : { published: 0, scheduled: 0, failed: 0, generating: 0, pendingApproval: 0, monthPosts: 0, monthReach: 0, monthLikes: 0, monthComments: 0, engagementRate: 0, pendingComments: 0, nextPost: null, recentPosts: [], socialAccounts: [] }

  const igAccount = d.socialAccounts.find(a => a.platform === "INSTAGRAM")
  const fbAccount = d.socialAccounts.find(a => a.platform === "FACEBOOK")
  const hasAccounts = d.socialAccounts.length > 0
  const hasActivity = d.published > 0 || d.scheduled > 0

  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Buenos días" : hour < 18 ? "Buenas tardes" : "Buenas noches"

  return (
    <div style={{ padding: "28px 32px", minHeight: "100vh", background: C.bg, color: C.text }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, marginBottom: 4 }}>
              {greeting},{" "}
              <span style={{ background: "linear-gradient(90deg,#a78bfa,#60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{name}</span>
            </h1>
            <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
              {new Date().toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/dashboard/monitor" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none", background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)", color: C.violetLt }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, boxShadow: `0 0 8px ${C.green}`, display: "inline-block" }} />
              Monitor en vivo
            </Link>
            <Link href="/dashboard/posts" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none", background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "white", boxShadow: "0 4px 14px rgba(124,58,237,0.3)" }}>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none"><path d="M13 3L4 14h8l-1 7 9-11h-8z" fill="white"/></svg>
              Generar post
            </Link>
          </div>
        </div>
      </div>

      {/* ── Alerts ── */}
      {d.pendingApproval > 0 && (
        <Link href="/dashboard/aprobaciones" style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 10, marginBottom: 20, textDecoration: "none", background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.25)" }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <span style={{ fontSize: 13, color: "#fde68a" }}><strong style={{ color: C.amber }}>{d.pendingApproval} post{d.pendingApproval > 1 ? "s" : ""}</strong> con imagen de stock esperando aprobación antes de publicarse</span>
          <span style={{ marginLeft: "auto", fontSize: 11, color: C.amber, fontWeight: 600 }}>Revisar →</span>
        </Link>
      )}
      {d.failed > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 10, marginBottom: 20, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <span style={{ fontSize: 16 }}>🔴</span>
          <span style={{ fontSize: 13, color: "#fca5a5" }}><strong style={{ color: C.red }}>{d.failed} post{d.failed > 1 ? "s" : ""} fallidos</strong> — revisa el monitor para reintentar</span>
        </div>
      )}

      {/* ── KPI grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Publicados", value: d.published, color: C.green, icon: "✓", glow: "rgba(34,197,94,0.15)" },
          { label: "Programados", value: d.scheduled, color: C.violetLt, icon: "◷", glow: "rgba(124,58,237,0.15)" },
          { label: "Este mes", value: d.monthPosts, color: C.blue, icon: "📅", glow: "rgba(59,130,246,0.12)" },
          { label: "Pendientes", value: d.pendingApproval, color: C.amber, icon: "⏳", glow: "rgba(245,158,11,0.12)" },
          { label: "Fallidos", value: d.failed, color: C.red, icon: "✕", glow: "rgba(239,68,68,0.12)" },
        ].map(k => (
          <div key={k.label} style={{ background: C.surf, border: `1px solid ${k.glow.replace("0.12","0.2").replace("0.15","0.2")}`, borderRadius: 12, padding: "16px 18px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -10, right: -10, fontSize: 36, opacity: 0.06, pointerEvents: "none" }}>{k.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: k.color, lineHeight: 1 }}>{k.value}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* ── Engagement strip ── */}
      {hasActivity && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 24 }}>
          {[
            { label: "Alcance mes", value: d.monthReach.toLocaleString(), color: "#c084fc" },
            { label: "Likes mes", value: d.monthLikes.toLocaleString(), color: "#f472b6" },
            { label: "Comentarios", value: d.monthComments.toLocaleString(), color: "#2dd4bf" },
            { label: "Engagement", value: `${d.engagementRate}%`, color: "#fbbf24" },
          ].map(m => (
            <div key={m.label} style={{ background: C.surf2, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: m.color }}>{m.value}</div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{m.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, alignItems: "start" }}>
        {/* ── Left: recent posts ── */}
        <div>
          {/* Connected accounts */}
          <div style={{ background: C.surf, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 18px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.muted, letterSpacing: "0.06em", textTransform: "uppercase" }}>Redes</span>
            <div style={{ display: "flex", gap: 8, flex: 1 }}>
              {[
                { label: igAccount ? `IG: ${igAccount.accountName}` : "Instagram sin conectar", ok: !!igAccount, color: "#ec4899" },
                { label: fbAccount ? `FB: ${fbAccount.accountName}` : "Facebook sin conectar", ok: !!fbAccount, color: "#3b82f6" },
              ].map(a => (
                <div key={a.label} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500, background: a.ok ? `${a.color}18` : "rgba(100,116,139,0.1)", color: a.ok ? a.color : C.muted, border: `1px solid ${a.ok ? a.color + "30" : "rgba(100,116,139,0.15)"}` }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: a.ok ? C.green : "#475569", boxShadow: a.ok ? `0 0 6px ${C.green}` : "none" }} />
                  {a.label}
                </div>
              ))}
            </div>
            {!hasAccounts && (
              <Link href="/dashboard/accounts" style={{ fontSize: 11, fontWeight: 600, color: C.violetLt, textDecoration: "none", background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)", padding: "4px 12px", borderRadius: 6 }}>Conectar →</Link>
            )}
          </div>

          {/* Recent posts */}
          {d.recentPosts.length > 0 && (
            <div style={{ background: C.surf, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Posts recientes</span>
                <Link href="/dashboard/posts" style={{ fontSize: 11, color: C.violetLt, textDecoration: "none" }}>Ver todos →</Link>
              </div>
              {d.recentPosts.map((post, i) => {
                const stColor = ST_COLOR[post.status] ?? C.muted
                return (
                  <div key={post.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 18px", borderBottom: i < d.recentPosts.length - 1 ? `1px solid ${C.border}` : "none" }}>
                    {/* thumbnail */}
                    <div style={{ width: 38, height: 38, borderRadius: 8, background: C.surf3, flexShrink: 0, overflow: "hidden" }}>
                      {(post as any).thumbnailUrl ? (
                        <img src={(post as any).thumbnailUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                          {post.type === "REEL" ? "🎬" : post.type === "STORY" ? "📱" : post.type === "CAROUSEL" ? "🎠" : "📷"}
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 2 }}>
                        {post.caption.slice(0, 70)}{post.caption.length > 70 ? "…" : ""}
                      </div>
                      <div style={{ fontSize: 10, color: C.muted }}>
                        {TYPE_LABEL[post.type] ?? post.type} · {post.platform.join(", ")}
                        {post.reach ? ` · ${post.reach.toLocaleString()} alcance` : ""}
                      </div>
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: stColor, background: `${stColor}18`, border: `1px solid ${stColor}30`, padding: "2px 8px", borderRadius: 20, flexShrink: 0 }}>
                      {ST_LABEL[post.status] ?? post.status}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Empty state */}
          {!hasActivity && hasAccounts && (
            <div style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 12, padding: "28px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⚡</div>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: C.text, margin: "0 0 8px" }}>Cuentas conectadas — listo para publicar</h3>
              <p style={{ fontSize: 13, color: C.muted, margin: "0 0 16px" }}>Genera tu primer post con IA. El sistema crea imagen, caption y hashtags automáticamente.</p>
              <Link href="/dashboard/posts" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none", background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "white", boxShadow: "0 4px 14px rgba(124,58,237,0.3)" }}>
                Generar primer post
              </Link>
            </div>
          )}

          {!hasAccounts && (
            <div style={{ background: C.surf2, border: `1px solid ${C.border}`, borderRadius: 12, padding: "28px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📲</div>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: C.text, margin: "0 0 8px" }}>Conecta tus redes sociales</h3>
              <p style={{ fontSize: 13, color: C.muted, margin: "0 0 16px" }}>Vincula tu Instagram y Facebook para que el sistema empiece a publicar contenido con IA.</p>
              <Link href="/dashboard/accounts" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none", background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "white" }}>
                Conectar cuenta
              </Link>
            </div>
          )}
        </div>

        {/* ── Right column ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Next post card */}
          {d.nextPost && (
            <div style={{ background: "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 12, padding: "16px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.violetLt, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Próximo post</div>
              <div style={{ fontSize: 12, color: C.text, marginBottom: 8, lineHeight: 1.5 }}>
                {d.nextPost.caption.slice(0, 80)}{d.nextPost.caption.length > 80 ? "…" : ""}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 11, color: C.muted }}>{d.nextPost.platform.join(" · ")}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.violetLt, background: "rgba(124,58,237,0.15)", padding: "3px 8px", borderRadius: 6 }}>
                  en {formatTime(new Date(d.nextPost.scheduledAt!))}
                </div>
              </div>
            </div>
          )}

          {/* Pending comments */}
          {d.pendingComments > 0 && (
            <Link href="/dashboard/comments" style={{ display: "block", background: "rgba(249,115,22,0.07)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: 12, padding: "14px 16px", textDecoration: "none" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#fb923c", letterSpacing: "0.08em", textTransform: "uppercase" }}>Comentarios</span>
                <span style={{ fontSize: 10, color: "#fb923c" }}>→</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#fed7aa" }}>{d.pendingComments}</div>
              <div style={{ fontSize: 11, color: C.muted }}>sin responder</div>
            </Link>
          )}

          {/* Quick actions */}
          <div style={{ background: C.surf, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>Acceso rápido</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {[
                { href: "/dashboard/autopilot", label: "Piloto Automático", icon: "🤖", color: "#a78bfa" },
                { href: "/dashboard/radar", label: "Radar Competencia", icon: "📡", color: "#c084fc" },
                { href: "/dashboard/analytics", label: "Analytics", icon: "📊", color: "#22c55e" },
                { href: "/dashboard/insights", label: "Insights IA", icon: "💡", color: "#fbbf24" },
                { href: "/dashboard/media", label: "Biblioteca de Media", icon: "🖼", color: "#2dd4bf" },
                { href: "/dashboard/brand", label: "Mi Marca", icon: "🎨", color: "#f472b6" },
              ].map(a => (
                <Link key={a.href} href={a.href} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, fontSize: 12, color: C.muted, textDecoration: "none", transition: "all 0.15s" }} className="quick-link">
                  <span style={{ fontSize: 14 }}>{a.icon}</span>
                  <span style={{ flex: 1 }}>{a.label}</span>
                  <span style={{ fontSize: 10, color: "#2a3446" }}>→</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Generating pill */}
          {d.generating > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, background: "rgba(56,189,248,0.07)", border: "1px solid rgba(56,189,248,0.2)", fontSize: 12, color: "#7dd3fc" }}>
              <span style={{ animation: "spin 1.5s linear infinite", display: "inline-block" }}>⟳</span>
              <span><strong style={{ color: "#38bdf8" }}>{d.generating}</strong> post{d.generating > 1 ? "s" : ""} generándose ahora</span>
            </div>
          )}
        </div>
      </div>

      <style>{`.quick-link:hover { background: rgba(255,255,255,0.04) !important; color: #94a3b8 !important; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

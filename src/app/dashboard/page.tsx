import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  CheckCircle2, Clock, TrendingUp, AlertCircle,
  Heart, Eye, MessageCircle, Zap, ArrowRight,
  Lightbulb, BarChart3, Image, Calendar,
} from "lucide-react"
import Link from "next/link"

async function getDashboardData(tenantId: string) {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    published, scheduled, failed,
    monthPosts, pendingComments, nextPost, recentPosts,
  ] = await Promise.all([
    prisma.post.count({ where: { tenantId, status: "PUBLISHED" } }),
    prisma.post.count({ where: { tenantId, status: "SCHEDULED" } }),
    prisma.post.count({ where: { tenantId, status: "FAILED" } }),
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
      take: 6,
      select: {
        id: true, caption: true, type: true, status: true,
        platform: true, reach: true, likes: true, publishedAt: true,
      },
    }),
  ])

  const monthReach = monthPosts.reduce((s, p) => s + (p.reach ?? 0), 0)
  const monthLikes = monthPosts.reduce((s, p) => s + (p.likes ?? 0), 0)
  const monthComments = monthPosts.reduce((s, p) => s + (p.comments ?? 0), 0)
  const engagementRate = monthReach > 0
    ? (((monthLikes + monthComments) / monthReach) * 100).toFixed(1)
    : "0"

  return {
    published, scheduled, failed,
    monthPosts: monthPosts.length,
    monthReach, monthLikes, monthComments,
    engagementRate: Number(engagementRate),
    pendingComments,
    nextPost, recentPosts,
  }
}

const STATUS_BADGE: Record<string, string> = {
  PUBLISHED: "badge-published",
  SCHEDULED: "badge-scheduled",
  PENDING: "badge-pending",
  GENERATING: "badge-pending",
  FAILED: "badge-failed",
}
const STATUS_LABEL: Record<string, string> = {
  PUBLISHED: "Publicado", SCHEDULED: "Programado",
  PENDING: "Pendiente", GENERATING: "Generando", FAILED: "Fallido",
}
const TYPE_EMOJI: Record<string, string> = {
  FEED: "📷", STORY: "📱", REEL: "🎬", CAROUSEL: "🎠",
}

export default async function DashboardPage() {
  const session = await auth()
  const tenantId = session?.user?.tenantId
  const name = session?.user?.name?.split(" ")[0] ?? ""

  const d = tenantId
    ? await getDashboardData(tenantId)
    : {
        published: 0, scheduled: 0, failed: 0, monthPosts: 0,
        monthReach: 0, monthLikes: 0, monthComments: 0, engagementRate: 0,
        pendingComments: 0, nextPost: null, recentPosts: [],
      }

  const isEmpty = d.published === 0 && d.scheduled === 0

  return (
    <div className="p-8 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-100">
            Bienvenido{name ? `, ${name}` : ""} 👋
          </h1>
          <p className="text-gray-500 mt-0.5 text-sm">
            Resumen de tu actividad en redes sociales
          </p>
        </div>
        {d.nextPost && (
          <div className="hidden md:flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-4 py-2.5">
            <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
            <div>
              <p className="text-xs text-indigo-300 font-medium">Próximo post</p>
              <p className="text-xs text-gray-400">
                {TYPE_EMOJI[d.nextPost.type]} {d.nextPost.type} ·{" "}
                {new Date(d.nextPost.scheduledAt!).toLocaleString("es-CL", {
                  weekday: "short", hour: "2-digit", minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        )}
      </div>

      {isEmpty ? (
        /* ── Empty state ── */
        <div className="card border border-indigo-500/30 bg-indigo-500/5 p-6">
          <div className="flex items-start gap-4">
            <div className="bg-indigo-500/20 p-3 rounded-lg shrink-0">
              <TrendingUp className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-100 mb-1">
                Configura tu primera cuenta de redes sociales
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                Conecta tu Instagram y Facebook para que el sistema empiece a generar y publicar contenido automáticamente.
              </p>
              <div className="flex gap-3">
                <Link href="/dashboard/accounts" className="btn-primary text-sm py-1.5 px-3">
                  Conectar cuenta
                </Link>
                <Link href="/dashboard/brand" className="btn-secondary text-sm py-1.5 px-3">
                  Configurar marca
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* ── Post stats ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Publicados", value: d.published, icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" },
              { label: "Programados", value: d.scheduled, icon: Clock, color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
              { label: "Este mes", value: d.monthPosts, icon: Calendar, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
              { label: "Fallidos", value: d.failed, icon: AlertCircle, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
            ].map((c) => (
              <div key={c.label} className={`card border ${c.border} flex items-center gap-4`}>
                <div className={`${c.bg} ${c.border} border p-3 rounded-lg shrink-0`}>
                  <c.icon className={`w-5 h-5 ${c.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-100">{c.value}</p>
                  <p className="text-sm text-gray-500">{c.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Engagement metrics ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Alcance del mes", value: d.monthReach.toLocaleString(), icon: Eye, color: "text-purple-400" },
              { label: "Likes del mes", value: d.monthLikes.toLocaleString(), icon: Heart, color: "text-pink-400" },
              { label: "Comentarios", value: d.monthComments.toLocaleString(), icon: MessageCircle, color: "text-teal-400" },
              { label: "Tasa engagement", value: `${d.engagementRate}%`, icon: TrendingUp, color: "text-yellow-400" },
            ].map((c) => (
              <div key={c.label} className="card p-4">
                <c.icon className={`w-4 h-4 ${c.color} mb-2`} />
                <p className="text-xl font-bold text-gray-100">{c.value}</p>
                <p className="text-xs text-gray-500">{c.label}</p>
              </div>
            ))}
          </div>

          {/* ── Quick actions + alerts ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Pending comments alert */}
            {d.pendingComments > 0 && (
              <Link href="/dashboard/comments" className="card border border-orange-500/20 bg-orange-500/5 p-4 hover:border-orange-500/40 transition-colors group">
                <div className="flex items-center justify-between mb-2">
                  <MessageCircle className="w-5 h-5 text-orange-400" />
                  <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-orange-400 transition-colors" />
                </div>
                <p className="text-2xl font-bold text-orange-300">{d.pendingComments}</p>
                <p className="text-xs text-gray-500">comentarios sin responder</p>
              </Link>
            )}

            {/* Insights shortcut */}
            <Link href="/dashboard/insights" className="card border border-yellow-500/20 bg-yellow-500/5 p-4 hover:border-yellow-500/40 transition-colors group">
              <div className="flex items-center justify-between mb-2">
                <Lightbulb className="w-5 h-5 text-yellow-400" />
                <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-yellow-400 transition-colors" />
              </div>
              <p className="text-sm font-semibold text-gray-200">Insights IA</p>
              <p className="text-xs text-gray-500">Sugerencias y mejores horarios</p>
            </Link>

            {/* Analytics shortcut */}
            <Link href="/dashboard/analytics" className="card border border-blue-500/20 bg-blue-500/5 p-4 hover:border-blue-500/40 transition-colors group">
              <div className="flex items-center justify-between mb-2">
                <BarChart3 className="w-5 h-5 text-blue-400" />
                <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-blue-400 transition-colors" />
              </div>
              <p className="text-sm font-semibold text-gray-200">Analytics</p>
              <p className="text-xs text-gray-500">Métricas detalladas y tendencias</p>
            </Link>

            {/* Generate post shortcut */}
            <Link href="/dashboard/posts" className="card border border-indigo-500/20 bg-indigo-500/5 p-4 hover:border-indigo-500/40 transition-colors group">
              <div className="flex items-center justify-between mb-2">
                <Zap className="w-5 h-5 text-indigo-400" />
                <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-indigo-400 transition-colors" />
              </div>
              <p className="text-sm font-semibold text-gray-200">Generar post</p>
              <p className="text-xs text-gray-500">Feed, Story, Reel o Carrusel</p>
            </Link>

            {/* Media library shortcut */}
            <Link href="/dashboard/media" className="card border border-teal-500/20 bg-teal-500/5 p-4 hover:border-teal-500/40 transition-colors group">
              <div className="flex items-center justify-between mb-2">
                <Image className="w-5 h-5 text-teal-400" />
                <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-teal-400 transition-colors" />
              </div>
              <p className="text-sm font-semibold text-gray-200">Media Library</p>
              <p className="text-xs text-gray-500">Imágenes y videos generados</p>
            </Link>
          </div>
        </>
      )}

      {/* ── Recent posts ── */}
      {d.recentPosts.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-400" />
              Posts recientes
            </h2>
            <Link href="/dashboard/posts" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1">
              Ver todos <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {d.recentPosts.map((post) => (
              <div key={post.id} className="flex items-center justify-between py-2.5 border-b border-gray-800 last:border-0 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 bg-gray-800 rounded-lg flex items-center justify-center text-sm shrink-0">
                    {TYPE_EMOJI[post.type] ?? "📄"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-200 truncate max-w-xs">
                      {post.caption.slice(0, 65)}{post.caption.length > 65 ? "…" : ""}
                    </p>
                    <p className="text-xs text-gray-500">
                      {post.platform.join(" · ")}
                      {post.reach ? ` · ${post.reach.toLocaleString()} alcance` : ""}
                    </p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full border shrink-0 ${STATUS_BADGE[post.status] ?? "badge-pending"}`}>
                  {STATUS_LABEL[post.status] ?? post.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

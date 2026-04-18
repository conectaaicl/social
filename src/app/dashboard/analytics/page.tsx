"use client"

import { useEffect, useState, useCallback } from "react"
import {
  BarChart3, Eye, Heart, MessageCircle, TrendingUp, RefreshCw,
  Image, Video, Layers, BookOpen, Send, Zap, ArrowUp, ArrowDown,
} from "lucide-react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"

interface AnalyticsData {
  overview: {
    totalPublished: number
    totalScheduled: number
    totalFailed: number
    thisMonthPosts: number
    monthReach: number
    monthLikes: number
    monthComments: number
    engagementRate: number
  }
  topPosts: Array<{
    id: string
    caption: string
    type: string
    platform: string[]
    reach: number | null
    likes: number | null
    comments: number | null
    publishedAt: string | null
    mediaUrls: string[]
    thumbnailUrl: string | null
  }>
  dailyStats: Array<{ date: string; count: number }>
  typeBreakdown: Array<{ type: string; count: number }>
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  FEED: <Image className="w-4 h-4" />,
  STORY: <Layers className="w-4 h-4" />,
  REEL: <Video className="w-4 h-4" />,
  CAROUSEL: <BookOpen className="w-4 h-4" />,
}

const TYPE_COLORS: Record<string, string> = {
  FEED: "bg-indigo-500",
  STORY: "bg-pink-500",
  REEL: "bg-purple-500",
  CAROUSEL: "bg-teal-500",
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/analytics")
      const json = await res.json()
      setData(json)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAnalytics() }, [fetchAnalytics])

  async function handleSync() {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch("/api/analytics/sync", { method: "POST" })
      const json = await res.json()
      setSyncResult(`Sincronizados ${json.synced} de ${json.total} posts`)
      fetchAnalytics()
    } catch {
      setSyncResult("Error al sincronizar")
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    )
  }

  if (!data) return null

  const { overview, topPosts, dailyStats, typeBreakdown } = data
  const maxDaily = Math.max(...dailyStats.map((d) => d.count), 1)
  const totalByType = typeBreakdown.reduce((s, t) => s + t.count, 0) || 1

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-100">Analytics</h1>
          <p className="text-gray-500 mt-0.5 text-sm">Métricas reales desde Meta</p>
        </div>
        <div className="flex items-center gap-3">
          {syncResult && (
            <span className="text-xs text-indigo-400">{syncResult}</span>
          )}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="btn-secondary flex items-center gap-2 text-sm py-2"
          >
            {syncing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            {syncing ? "Sincronizando…" : "Sync Meta"}
          </button>
          <button
            onClick={fetchAnalytics}
            className="btn-secondary p-2"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Posts publicados"
          value={overview.totalPublished}
          sub={`${overview.thisMonthPosts} este mes`}
          icon={<Send className="w-5 h-5 text-indigo-400" />}
          accent="indigo"
        />
        <StatCard
          label="Alcance mensual"
          value={overview.monthReach.toLocaleString("es-CL")}
          sub="personas alcanzadas"
          icon={<Eye className="w-5 h-5 text-teal-400" />}
          accent="teal"
        />
        <StatCard
          label="Likes totales"
          value={overview.monthLikes.toLocaleString("es-CL")}
          sub="este mes"
          icon={<Heart className="w-5 h-5 text-pink-400" />}
          accent="pink"
        />
        <StatCard
          label="Engagement"
          value={`${overview.engagementRate}%`}
          sub={`${overview.monthComments} comentarios`}
          icon={<TrendingUp className="w-5 h-5 text-purple-400" />}
          accent="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily publishing chart */}
        <div className="card col-span-2 p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-5 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-400" />
            Posts publicados — últimos 7 días
          </h2>
          <div className="flex items-end gap-2 h-32">
            {dailyStats.map((day) => (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-xs text-gray-500">{day.count}</span>
                <div
                  className="w-full bg-indigo-500/80 rounded-t-sm transition-all"
                  style={{ height: `${(day.count / maxDaily) * 100}%`, minHeight: day.count > 0 ? "4px" : "2px" }}
                />
                <span className="text-xs text-gray-600">
                  {format(parseISO(day.date), "EEE", { locale: es })}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Type breakdown */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-5">Por tipo de contenido</h2>
          <div className="space-y-3">
            {typeBreakdown.length === 0 ? (
              <p className="text-gray-500 text-sm">Sin datos aún</p>
            ) : (
              typeBreakdown.map((t) => (
                <div key={t.type}>
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                    <span className="flex items-center gap-1.5">
                      {TYPE_ICONS[t.type]}
                      {t.type}
                    </span>
                    <span>{t.count}</span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${TYPE_COLORS[t.type] ?? "bg-gray-600"} rounded-full`}
                      style={{ width: `${(t.count / totalByType) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-gray-800 space-y-1.5 text-xs text-gray-500">
            <div className="flex justify-between">
              <span>Programados</span>
              <span className="text-yellow-400">{overview.totalScheduled}</span>
            </div>
            <div className="flex justify-between">
              <span>Fallidos</span>
              <span className="text-red-400">{overview.totalFailed}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Posts */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-300 mb-5 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-indigo-400" />
          Top posts por alcance
        </h2>
        {topPosts.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            <p>Aún no hay datos de publicaciones.</p>
            <p className="mt-1">Usa "Sync Meta" para importar las métricas.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {topPosts.map((post, i) => {
              const preview = post.thumbnailUrl ?? post.mediaUrls[0]
              return (
                <div
                  key={post.id}
                  className="flex items-center gap-4 p-3 rounded-lg bg-gray-900/60 border border-gray-800 hover:border-gray-700 transition-colors"
                >
                  <span className="text-xs font-bold text-gray-600 w-4 shrink-0">#{i + 1}</span>
                  <div className="w-10 h-10 bg-gray-800 rounded-lg overflow-hidden shrink-0">
                    {preview ? (
                      <img src={preview} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600">
                        {post.type === "REEL" ? <Video className="w-5 h-5" /> : <Image className="w-5 h-5" />}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-300 truncate">{post.caption}</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {post.type} · {post.platform.join("/")} ·{" "}
                      {post.publishedAt
                        ? format(new Date(post.publishedAt), "d MMM yyyy", { locale: es })
                        : "—"}
                    </p>
                  </div>
                  <div className="flex gap-4 text-xs text-gray-400 shrink-0">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" /> {post.reach?.toLocaleString("es-CL") ?? "—"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3" /> {post.likes ?? "—"}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" /> {post.comments ?? "—"}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string
  value: string | number
  sub: string
  icon: React.ReactNode
  accent: "indigo" | "teal" | "pink" | "purple"
}) {
  const accents: Record<string, string> = {
    indigo: "from-indigo-600/10 to-transparent border-indigo-500/20",
    teal: "from-teal-600/10 to-transparent border-teal-500/20",
    pink: "from-pink-600/10 to-transparent border-pink-500/20",
    purple: "from-purple-600/10 to-transparent border-purple-500/20",
  }
  return (
    <div className={`card bg-gradient-to-br ${accents[accent]} p-5`}>
      <div className="flex items-start justify-between mb-3">
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-100">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
      <p className="text-xs text-gray-600 mt-0.5">{sub}</p>
    </div>
  )
}

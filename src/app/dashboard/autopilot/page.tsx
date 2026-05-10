"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Zap, Bot, Hand, CheckCircle2, XCircle, Clock, RefreshCw,
  Loader2, Play, AlertTriangle, Image, Video, Layers, BookOpen,
  TrendingUp, Calendar, Send, Settings,
} from "lucide-react"
import Link from "next/link"
import { format, formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

type Mode = "manual" | "asistido" | "autopiloto"

interface AutopilotData {
  mode: Mode
  ready: { hasBrand: boolean; hasSocialAccounts: boolean; hasCalendarConfig: boolean }
  stats: {
    todayCreated: number
    weekPublished: number
    totalScheduled: number
    nextScheduled: { id: string; scheduledAt: string; type: string; contentType: string; thumbnailUrl: string | null } | null
  }
  schedule: {
    slots: Array<{ time: string; type: string }>
    contentMix: Record<string, number>
    timezone: string
    postsPerDay: number
  }
  activity: Array<{
    id: string
    type: string
    contentType: string
    status: string
    scheduledAt: string
    publishedAt: string | null
    createdAt: string
    caption: string
    thumbnailUrl: string | null
  }>
}

const MODE_CONFIG = {
  manual: {
    label: "Manual",
    icon: Hand,
    color: "text-gray-400",
    bg: "bg-gray-500/10 border-gray-500/30",
    activeBg: "bg-gray-500/20 border-gray-400",
    desc: "Tú creas y publicas cada post manualmente.",
    dot: "bg-gray-500",
  },
  asistido: {
    label: "Asistido",
    icon: CheckCircle2,
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/30",
    activeBg: "bg-blue-500/20 border-blue-400",
    desc: "La IA genera posts, tú los revisas y apruebas antes de publicar.",
    dot: "bg-blue-500",
  },
  autopiloto: {
    label: "Autopiloto",
    icon: Bot,
    color: "text-brand-400",
    bg: "bg-brand-500/10 border-brand-500/30",
    activeBg: "bg-brand-500/20 border-brand-400",
    desc: "La IA genera y publica automáticamente según tu calendario.",
    dot: "bg-brand-500 animate-pulse",
  },
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Zap }> = {
  PENDING:    { label: "Pendiente",   color: "text-gray-400",   icon: Clock },
  SCHEDULED:  { label: "Programado",  color: "text-blue-400",   icon: Calendar },
  PUBLISHING: { label: "Publicando",  color: "text-yellow-400", icon: Loader2 },
  PUBLISHED:  { label: "Publicado",   color: "text-green-400",  icon: CheckCircle2 },
  FAILED:     { label: "Fallido",     color: "text-red-400",    icon: XCircle },
  GENERATING: { label: "Generando",   color: "text-purple-400", icon: Zap },
}

const TYPE_ICON: Record<string, typeof Image> = {
  FEED: Image, CAROUSEL: BookOpen, REEL: Video, STORY: Layers,
}

export default function AutopilotPage() {
  const [data, setData] = useState<AutopilotData | null>(null)
  const [loading, setLoading] = useState(true)
  const [switching, setSwitching] = useState(false)
  const [triggering, setTriggering] = useState(false)
  const [triggerMsg, setTriggerMsg] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/autopilot")
      const json = await res.json()
      setData(json)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Refresh every 30s if autopilot is active
  useEffect(() => {
    if (data?.mode !== "autopiloto") return
    const id = setInterval(fetchData, 30000)
    return () => clearInterval(id)
  }, [data?.mode, fetchData])

  async function setMode(mode: Mode) {
    if (!data || mode === data.mode) return
    setSwitching(true)
    try {
      const res = await fetch("/api/autopilot", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      })
      const json = await res.json()
      if (json.ok) {
        setData(prev => prev ? { ...prev, mode: json.mode ?? mode } : prev)
      }
    } finally {
      setSwitching(false)
    }
  }

  async function triggerNow() {
    setTriggering(true)
    setTriggerMsg(null)
    try {
      const res = await fetch("/api/autopilot/trigger", { method: "POST" })
      const json = await res.json()
      if (json.ok) {
        setTriggerMsg("Generación iniciada — los posts aparecerán en breve")
        setTimeout(() => fetchData(), 5000)
      } else {
        setTriggerMsg(json.error ?? "Error al iniciar generación")
      }
    } finally {
      setTriggering(false)
    }
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center min-h-screen">
      <Loader2 size={24} className="animate-spin text-brand-400" />
    </div>
  )
  if (!data) return null

  const { mode, ready, stats, schedule, activity } = data
  const mCfg = MODE_CONFIG[mode]
  const allReady = ready.hasBrand && ready.hasSocialAccounts
  const nextPost = stats.nextScheduled

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Bot size={20} className="text-brand-400" />
            Piloto Automático
          </h1>
          <p className="text-white/40 text-sm mt-0.5">Control de generación y publicación automática</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="p-2 rounded-xl border border-white/10 text-white/40 hover:text-white transition">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Prerequisite warnings */}
        {!allReady && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle size={16} className="text-yellow-400 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="text-yellow-300 font-medium mb-1.5">Completa la configuración para activar el piloto</p>
              <div className="space-y-1">
                {!ready.hasBrand && (
                  <div className="flex items-center gap-2 text-white/50">
                    <XCircle size={12} className="text-red-400" />
                    <Link href="/dashboard/brand" className="hover:text-white underline underline-offset-2">Configura tu marca</Link>
                  </div>
                )}
                {!ready.hasSocialAccounts && (
                  <div className="flex items-center gap-2 text-white/50">
                    <XCircle size={12} className="text-red-400" />
                    <Link href="/dashboard/accounts" className="hover:text-white underline underline-offset-2">Conecta una cuenta de Instagram/Facebook</Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Current mode + status badge */}
        <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${mCfg.dot}`} />
              <div>
                <p className="text-white font-semibold">{mCfg.label}</p>
                <p className="text-white/40 text-xs mt-0.5">{mCfg.desc}</p>
              </div>
            </div>
            {mode === "autopiloto" && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500/20 border border-brand-500/30 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
                <span className="text-xs text-brand-300 font-medium">Activo</span>
              </div>
            )}
          </div>

          {/* Mode selector */}
          <div className="grid grid-cols-3 gap-3">
            {(Object.entries(MODE_CONFIG) as [Mode, typeof MODE_CONFIG.manual][]).map(([m, cfg]) => {
              const Icon = cfg.icon
              const isActive = mode === m
              const isDisabled = switching || (!allReady && m !== "manual")
              return (
                <button key={m} onClick={() => setMode(m)} disabled={isDisabled}
                  className={'p-4 rounded-xl border text-left transition-all ' + (
                    isActive ? cfg.activeBg + ' ring-1 ring-white/10' : cfg.bg + ' hover:border-white/20'
                  ) + (isDisabled && !isActive ? ' opacity-40 cursor-not-allowed' : '')}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={16} className={isActive ? cfg.color : 'text-white/30'} />
                    <span className={'text-sm font-semibold ' + (isActive ? cfg.color : 'text-white/50')}>
                      {cfg.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/30 leading-relaxed">{cfg.desc}</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/3 border border-white/8 rounded-2xl p-4">
            <div className="text-2xl font-bold text-white">{stats.todayCreated}</div>
            <div className="text-xs text-white/40 mt-1">Posts creados hoy</div>
          </div>
          <div className="bg-white/3 border border-white/8 rounded-2xl p-4">
            <div className="text-2xl font-bold text-white">{stats.weekPublished}</div>
            <div className="text-xs text-white/40 mt-1">Publicados esta semana</div>
          </div>
          <div className="bg-white/3 border border-white/8 rounded-2xl p-4">
            <div className="text-2xl font-bold text-white">{stats.totalScheduled}</div>
            <div className="text-xs text-white/40 mt-1">Programados pendientes</div>
          </div>
          <div className="bg-white/3 border border-white/8 rounded-2xl p-4">
            <div className="text-sm font-semibold text-white">
              {nextPost
                ? format(new Date(nextPost.scheduledAt), "d MMM, HH:mm", { locale: es })
                : "—"}
            </div>
            <div className="text-xs text-white/40 mt-1">Próxima publicación</div>
            {nextPost && nextPost.thumbnailUrl && (
              <Link href={'/dashboard/posts/' + nextPost.id} className="block mt-2">
                <img src={nextPost.thumbnailUrl} alt="" className="w-full aspect-square rounded-lg object-cover opacity-60 hover:opacity-100 transition" />
              </Link>
            )}
          </div>
        </div>

        {/* Manual trigger + schedule */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trigger */}
          <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-1">Generación manual</h3>
            <p className="text-xs text-white/40 mb-4">
              Fuerza la generación de posts para hoy según tu calendario configurado.
            </p>
            {triggerMsg && (
              <div className="mb-3 text-xs bg-brand-500/10 border border-brand-500/20 text-brand-300 rounded-xl px-3 py-2">
                {triggerMsg}
              </div>
            )}
            <button onClick={triggerNow} disabled={triggering || !allReady}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-xl transition disabled:opacity-40">
              {triggering ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              {triggering ? "Generando..." : "Generar posts ahora"}
            </button>
            {!allReady && (
              <p className="text-[10px] text-white/25 text-center mt-2">Configura tu marca y conecta una cuenta primero</p>
            )}
          </div>

          {/* Schedule summary */}
          <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Horario configurado</h3>
              <Link href="/dashboard/settings" className="text-xs text-white/30 hover:text-white transition flex items-center gap-1">
                <Settings size={11} /> Editar
              </Link>
            </div>
            {schedule.slots.length === 0 ? (
              <div className="text-center py-6 text-white/30 text-sm">
                <p>Sin horario configurado.</p>
                <Link href="/dashboard/brand" className="text-brand-400 hover:text-brand-300 text-xs mt-1 block">
                  Configura tu marca →
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {schedule.slots.map((slot, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Clock size={12} className="text-white/30" />
                      <span className="text-white/70 font-mono">{slot.time}</span>
                    </div>
                    <span className="text-xs text-white/30 capitalize">{slot.type}</span>
                  </div>
                ))}
                <div className="pt-2 mt-2 border-t border-white/5">
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(schedule.contentMix).map(([k, v]) => (
                      <span key={k} className="text-[10px] px-2 py-0.5 bg-white/5 border border-white/10 rounded-full text-white/50">
                        {k} {v}%
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Activity log */}
        <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp size={14} className="text-brand-400" />
            Actividad reciente
            <span className="text-white/25 font-normal text-xs ml-auto">{activity.length} posts</span>
          </h3>

          {activity.length === 0 ? (
            <div className="text-center py-8 text-white/30 text-sm">
              <Bot size={32} className="text-white/10 mx-auto mb-3" />
              <p>Sin actividad aún — genera tu primer post para comenzar.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activity.map((post) => {
                const sCfg = STATUS_CONFIG[post.status] ?? STATUS_CONFIG.PENDING
                const SIcon = sCfg.icon
                const TIcon = TYPE_ICON[post.type] ?? Image
                const timeRef = post.publishedAt ?? post.scheduledAt ?? post.createdAt
                return (
                  <Link key={post.id} href={'/dashboard/posts/' + post.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/5 hover:border-white/10 transition">
                    {post.thumbnailUrl ? (
                      <img src={post.thumbnailUrl} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                        <TIcon size={14} className="text-white/30" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white/70 text-xs truncate">{post.caption || '(sin caption)'}</p>
                      <p className="text-white/25 text-[10px] mt-0.5 capitalize">
                        {post.type.toLowerCase()} · {post.contentType.toLowerCase()}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <div className={'flex items-center gap-1 text-xs ' + sCfg.color}>
                        <SIcon size={10} className={post.status === 'PUBLISHING' ? 'animate-spin' : ''} />
                        <span>{sCfg.label}</span>
                      </div>
                      <span className="text-[10px] text-white/20">
                        {formatDistanceToNow(new Date(timeRef), { locale: es, addSuffix: true })}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

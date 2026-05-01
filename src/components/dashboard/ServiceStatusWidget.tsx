"use client"
import { useEffect, useState } from "react"
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw, Image, Bot, Share2, Zap } from "lucide-react"

type ServiceStatus = "ok" | "error" | "warn" | "loading"

interface Service {
  id: string
  name: string
  category: string
  status: ServiceStatus
  label: string
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  image: <Image className="w-3 h-3" />,
  ai: <Bot className="w-3 h-3" />,
  social: <Share2 className="w-3 h-3" />,
  automation: <Zap className="w-3 h-3" />,
}

const CATEGORY_LABELS: Record<string, string> = {
  image: "Generación de imágenes",
  ai: "Inteligencia artificial",
  social: "Redes sociales",
  automation: "Automatización",
}

function StatusDot({ status }: { status: ServiceStatus }) {
  if (status === "loading") return <span className="w-2 h-2 rounded-full bg-gray-600 animate-pulse inline-block" />
  if (status === "ok") return <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
  if (status === "warn") return <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
  return <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
}

function StatusBadge({ status }: { status: ServiceStatus }) {
  const cls = {
    ok: "bg-green-500/10 text-green-400 border-green-500/20",
    warn: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    error: "bg-red-500/10 text-red-400 border-red-500/20",
    loading: "bg-gray-700/50 text-gray-500 border-gray-700",
  }[status]
  return <span className={`inline-block w-2 h-2 rounded-full ${status === "ok" ? "bg-green-400" : status === "warn" ? "bg-yellow-400" : status === "loading" ? "bg-gray-600" : "bg-red-400"} ${status === "ok" ? "shadow-[0_0_6px_#4ade80]" : ""}`} />
}

export function ServiceStatusWidget() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true)
    try {
      const res = await fetch("/api/status")
      if (res.ok) {
        const data = await res.json()
        setServices(data.services)
        setLastChecked(new Date())
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(() => load(), 60000)
    return () => clearInterval(interval)
  }, [])

  const categories = ["image", "ai", "social", "automation"]
  const grouped = categories.map((cat) => ({
    cat,
    items: services.filter((s) => s.category === cat),
  }))

  const okCount = services.filter((s) => s.status === "ok").length
  const total = services.length
  const overallOk = total > 0 && services.filter((s) => s.status === "error").length === 0

  if (loading) {
    return (
      <div className="card p-4 animate-pulse">
        <div className="h-4 bg-gray-800 rounded w-32 mb-3" />
        <div className="grid grid-cols-2 gap-2">
          {[1,2,3,4].map(i => <div key={i} className="h-8 bg-gray-800 rounded" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${overallOk ? "bg-green-400 shadow-[0_0_6px_#4ade80]" : "bg-yellow-400"}`} />
          <h3 className="text-sm font-semibold text-gray-200">Estado de servicios</h3>
          <span className="text-xs text-gray-500">{okCount}/{total} operativos</span>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors text-gray-500 hover:text-gray-300"
          title="Actualizar"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {grouped.map(({ cat, items }) => (
          <div key={cat} className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium mb-1">
              {CATEGORY_ICONS[cat]}
              {CATEGORY_LABELS[cat]}
            </div>
            {items.map((svc) => (
              <div key={svc.id} className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-2 border border-gray-700/50">
                <div className="flex items-center gap-2 min-w-0">
                  <StatusDot status={svc.status} />
                  <span className="text-xs text-gray-200 font-medium truncate">{svc.name}</span>
                </div>
                <span className={`text-xs shrink-0 ml-2 ${svc.status === "ok" ? "text-green-400" : svc.status === "warn" ? "text-yellow-400" : "text-red-400"}`}>
                  {svc.label}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {lastChecked && (
        <p className="text-xs text-gray-600 mt-3 text-right">
          Actualizado {lastChecked.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
        </p>
      )}
    </div>
  )
}

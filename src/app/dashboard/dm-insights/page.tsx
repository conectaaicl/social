"use client"

import { useEffect, useState, useCallback } from "react"
import {
  MessageCircle, Sparkles, Trash2, ShieldQuestion, Zap,
  Quote, HelpCircle, Loader2, Copy, Check, RefreshCw,
} from "lucide-react"

interface Insight {
  id: string
  conversationsScanned: number
  objeciones: string[]
  urgencia: string[]
  frasesReales: string[]
  temasComunes: string[]
  createdAt: string
}

const SECTIONS: { key: keyof Insight; label: string; icon: React.ReactNode; color: string }[] = [
  { key: "objeciones", label: "Objeciones reales", icon: <ShieldQuestion className="w-4 h-4" />, color: "text-amber-400" },
  { key: "urgencia", label: "Señales de urgencia", icon: <Zap className="w-4 h-4" />, color: "text-orange-400" },
  { key: "frasesReales", label: "Frases textuales de clientes", icon: <Quote className="w-4 h-4" />, color: "text-pink-400" },
  { key: "temasComunes", label: "Temas que se repiten", icon: <HelpCircle className="w-4 h-4" />, color: "text-sky-400" },
]

function CopyableItem({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <li className="group flex items-start gap-2 text-sm text-gray-300 bg-gray-900 border border-white/5 rounded-lg px-3 py-2">
      <span className="flex-1">{text}</span>
      <button
        onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-white flex-shrink-0"
        aria-label="Copiar"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </li>
  )
}

export default function DmInsightsPage() {
  const [items, setItems] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState("")
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/dm-insights")
      const data = res.ok ? await res.json() : {}
      const list = Array.isArray(data.items) ? data.items : []
      setItems(list)
      if (list.length > 0) setExpanded(list[0].id)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleScan() {
    setError("")
    setScanning(true)
    try {
      const res = await fetch("/api/dm-insights", { method: "POST" })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Error al analizar"); return }
      setItems((prev) => [data.insight, ...prev])
      setExpanded(data.insight.id)
    } catch {
      setError("Error de conexión")
    } finally {
      setScanning(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/dm-insights/${id}`, { method: "DELETE" })
      if (res.ok) setItems((prev) => prev.filter((i) => i.id !== id))
    } catch {}
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-violet-400" />
            Minería de conversaciones
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Analiza las conversaciones reales de WhatsApp/DM de OmniFlow y saca objeciones, urgencia
            y frases textuales de clientes listas para usar como copy.
          </p>
        </div>
        <button
          onClick={handleScan}
          disabled={scanning}
          className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all whitespace-nowrap"
        >
          {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {scanning ? "Analizando conversaciones..." : "Analizar conversaciones recientes"}
        </button>
      </div>

      {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mb-5">{error}</p>}

      {loading && <div className="text-center py-10 text-sm text-gray-600">Cargando...</div>}

      {!loading && items.length === 0 && !error && (
        <div className="text-center py-16 text-gray-600 text-sm">
          Aún no has analizado conversaciones. Necesitas tener OmniFlow conectado con conversaciones activas.
        </div>
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="bg-gray-900/40 border border-white/5 rounded-2xl overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === item.id ? null : item.id)}
              className="w-full flex items-center justify-between px-5 py-3.5 text-left"
            >
              <div>
                <p className="text-sm font-semibold text-white">
                  {item.conversationsScanned} conversación{item.conversationsScanned !== 1 ? "es" : ""} analizada{item.conversationsScanned !== 1 ? "s" : ""}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(item.createdAt).toLocaleString("es-CL", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(item.id) }}
                className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0"
                aria-label="Eliminar"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </button>

            {expanded === item.id && (
              <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-white/5 pt-4">
                {SECTIONS.map((sec) => {
                  const values = (item[sec.key] as string[]) || []
                  if (values.length === 0) return null
                  return (
                    <div key={sec.key}>
                      <div className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide mb-2 ${sec.color}`}>
                        {sec.icon}
                        {sec.label}
                      </div>
                      <ul className="space-y-1.5">
                        {values.map((v, i) => <CopyableItem key={i} text={v} />)}
                      </ul>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

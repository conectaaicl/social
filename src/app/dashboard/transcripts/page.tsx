"use client"

import { useEffect, useState, useCallback } from "react"
import {
  FileText, Sparkles, Trash2, Lightbulb, BookOpen, ListChecks,
  ShieldQuestion, Quote, Loader2, Copy, Check,
} from "lucide-react"

interface Insight {
  id: string
  title: string
  sourceUrl: string | null
  hooks: string[]
  historias: string[]
  frameworks: string[]
  objeciones: string[]
  citas: string[]
  createdAt: string
}

const SECTIONS: { key: keyof Insight; label: string; icon: React.ReactNode; color: string }[] = [
  { key: "hooks", label: "Hooks para reels", icon: <Sparkles className="w-4 h-4" />, color: "text-violet-400" },
  { key: "historias", label: "Historias reutilizables", icon: <BookOpen className="w-4 h-4" />, color: "text-sky-400" },
  { key: "frameworks", label: "Frameworks / métodos", icon: <ListChecks className="w-4 h-4" />, color: "text-emerald-400" },
  { key: "objeciones", label: "Objeciones detectadas", icon: <ShieldQuestion className="w-4 h-4" />, color: "text-amber-400" },
  { key: "citas", label: "Citas textuales", icon: <Quote className="w-4 h-4" />, color: "text-pink-400" },
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

export default function TranscriptsPage() {
  const [items, setItems] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState("")
  const [sourceUrl, setSourceUrl] = useState("")
  const [transcript, setTranscript] = useState("")
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState("")
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/transcripts")
      const data = res.ok ? await res.json() : {}
      const list = Array.isArray(data.items) ? data.items : []
      setItems(list)
      if (list.length > 0) setExpanded(list[0].id)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (transcript.trim().length < 100) {
      setError("Pega una transcripción de al menos 100 caracteres.")
      return
    }
    setAnalyzing(true)
    try {
      const res = await fetch("/api/transcripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, sourceUrl, transcript }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Error al analizar"); return }
      setItems((prev) => [data.insight, ...prev])
      setExpanded(data.insight.id)
      setTitle(""); setSourceUrl(""); setTranscript("")
    } catch {
      setError("Error de conexión")
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/transcripts/${id}`, { method: "DELETE" })
      if (res.ok) setItems((prev) => prev.filter((i) => i.id !== id))
    } catch {}
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FileText className="w-6 h-6 text-violet-400" />
          Minería de transcripciones
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Pega la transcripción de un video de YouTube, podcast o llamada de venta y la IA saca ganchos,
          historias, frameworks, objeciones y frases listas para convertir en contenido corto.
        </p>
      </div>

      <form onSubmit={handleAnalyze} className="bg-gray-900/60 border border-white/10 rounded-2xl p-5 mb-8 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título (ej: Video sobre cortinas blackout)"
            className="bg-gray-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
          />
          <input
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="URL de origen (opcional)"
            className="bg-gray-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
          />
        </div>
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Pega aquí la transcripción completa..."
          rows={6}
          className="w-full bg-gray-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 resize-y"
        />
        {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600">{transcript.length.toLocaleString()} caracteres</span>
          <button
            type="submit"
            disabled={analyzing}
            className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all"
          >
            {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {analyzing ? "Analizando..." : "Extraer ideas"}
          </button>
        </div>
      </form>

      {loading && <div className="text-center py-10 text-sm text-gray-600">Cargando...</div>}

      {!loading && items.length === 0 && (
        <div className="text-center py-16 text-gray-600 text-sm">
          Aún no has analizado ninguna transcripción.
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
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(item.createdAt).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" })}
                  {item.sourceUrl ? " · " + item.sourceUrl : ""}
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

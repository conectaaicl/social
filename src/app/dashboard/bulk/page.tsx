"use client"
import { useState } from "react"
import { Zap, Upload, Plus, Trash2, Calendar, Loader2, CheckCircle, AlertCircle } from "lucide-react"

type BulkItem = {
  topic: string
  contentType: "PRODUCTO" | "PROYECTO" | "TIP" | "PROMO"
  postType: "FEED" | "STORY" | "CAROUSEL" | "REEL"
  platforms: string[]
  scheduledAt: string
}

type ResultItem = { index: number; postId?: string; error?: string }

function defaultDate(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  d.setHours(19, 0, 0, 0)
  return d.toISOString().slice(0, 16)
}

function Row({ item, index, onChange, onRemove }: {
  item: BulkItem; index: number
  onChange: (i: number, k: keyof BulkItem, v: any) => void
  onRemove: (i: number) => void
}) {
  return (
    <div className="grid grid-cols-12 gap-2 items-center py-2 border-b border-white/5">
      <div className="col-span-4">
        <input value={item.topic} onChange={e => onChange(index, "topic", e.target.value)}
          placeholder="Tema del post..." className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500" />
      </div>
      <div className="col-span-2">
        <select value={item.contentType} onChange={e => onChange(index, "contentType", e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500">
          <option value="PRODUCTO">Producto</option>
          <option value="TIP">Tip</option>
          <option value="PROMO">Promo</option>
          <option value="PROYECTO">Proyecto</option>
        </select>
      </div>
      <div className="col-span-2">
        <select value={item.postType} onChange={e => onChange(index, "postType", e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500">
          <option value="FEED">Feed</option>
          <option value="STORY">Story</option>
          <option value="CAROUSEL">Carousel</option>
          <option value="REEL">Reel</option>
        </select>
      </div>
      <div className="col-span-3">
        <input type="datetime-local" value={item.scheduledAt} onChange={e => onChange(index, "scheduledAt", e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500" />
      </div>
      <div className="col-span-1 flex justify-end">
        <button onClick={() => onRemove(index)} className="text-white/30 hover:text-red-400 transition">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

export default function BulkPage() {
  const [items, setItems] = useState<BulkItem[]>([
    { topic: "", contentType: "PRODUCTO", postType: "FEED", platforms: ["INSTAGRAM"], scheduledAt: defaultDate(1) },
    { topic: "", contentType: "TIP", postType: "CAROUSEL", platforms: ["INSTAGRAM"], scheduledAt: defaultDate(3) },
    { topic: "", contentType: "PROMO", postType: "FEED", platforms: ["INSTAGRAM"], scheduledAt: defaultDate(5) },
  ])
  const [generating, setGenerating] = useState(false)
  const [results, setResults] = useState<ResultItem[] | null>(null)
  const [imageStyle, setImageStyle] = useState("catalogo")
  const [generateImages, setGenerateImages] = useState(true)

  function addRow() {
    setItems(prev => [...prev, {
      topic: "", contentType: "PRODUCTO", postType: "FEED",
      platforms: ["INSTAGRAM"], scheduledAt: defaultDate(prev.length + 1)
    }])
  }

  function change(i: number, k: keyof BulkItem, v: any) {
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [k]: v } : item))
  }

  function remove(i: number) {
    setItems(prev => prev.filter((_, idx) => idx !== i))
  }

  // CSV import
  function importCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const rows = text.split("\n").slice(1).filter(r => r.trim())
      const parsed: BulkItem[] = rows.map((row, i) => {
        const [topic, contentType, postType, date] = row.split(",").map(c => c.trim().replace(/^"|"$/g, ""))
        return {
          topic: topic || "",
          contentType: (contentType as any) || "PRODUCTO",
          postType: (postType as any) || "FEED",
          platforms: ["INSTAGRAM"],
          scheduledAt: date || defaultDate(i + 1),
        }
      })
      setItems(parsed.filter(p => p.topic))
    }
    reader.readAsText(file)
  }

  async function generate() {
    const valid = items.filter(i => i.topic.trim())
    if (!valid.length) return
    setGenerating(true)
    setResults(null)
    try {
      const r = await fetch("/api/posts/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: valid, imageStyle, generateImages }),
      })
      const d = await r.json()
      setResults(d.results ?? [])
    } finally {
      setGenerating(false)
    }
  }

  const validCount = items.filter(i => i.topic.trim()).length

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Bulk Scheduler</h1>
          <p className="text-white/40 text-sm mt-1">Genera y programa hasta 50 posts con IA en una sola pasada</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white/60 hover:text-white cursor-pointer transition">
            <Upload size={14} />
            Importar CSV
            <input type="file" accept=".csv" onChange={importCSV} className="hidden" />
          </label>
          <a href="/api/posts/bulk-template" download className="text-xs text-white/30 hover:text-white/60 transition underline">
            Descargar plantilla
          </a>
        </div>
      </div>

      {/* Options */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4 flex flex-wrap gap-6">
        <div>
          <label className="text-xs text-white/40 mb-1 block">Estilo de imagen</label>
          <select value={imageStyle} onChange={e => setImageStyle(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none">
            <option value="catalogo">Catálogo</option>
            <option value="ugc">UGC / Lifestyle</option>
            <option value="emocional">Emocional</option>
            <option value="comparativo">Comparativo</option>
          </select>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={generateImages} onChange={e => setGenerateImages(e.target.checked)}
            className="w-4 h-4 accent-indigo-500" />
          <span className="text-sm text-white/60">Generar imágenes con IA</span>
        </label>
        <div className="text-sm text-white/40 self-end">
          {validCount} posts listos para generar
        </div>
      </div>

      {/* Header row */}
      <div className="grid grid-cols-12 gap-2 px-0 py-1 text-xs text-white/30 uppercase tracking-wider mb-1">
        <div className="col-span-4">Tema del post</div>
        <div className="col-span-2">Tipo contenido</div>
        <div className="col-span-2">Formato</div>
        <div className="col-span-3">Fecha programada</div>
        <div className="col-span-1"></div>
      </div>

      {/* Rows */}
      <div className="bg-white/3 border border-white/10 rounded-xl p-4 mb-4">
        {items.map((item, i) => (
          <Row key={i} item={item} index={i} onChange={change} onRemove={remove} />
        ))}
        <button onClick={addRow} className="flex items-center gap-2 mt-3 text-sm text-white/40 hover:text-white/70 transition">
          <Plus size={14} /> Agregar fila
        </button>
      </div>

      {/* Generate button */}
      <button onClick={generate} disabled={generating || validCount === 0}
        className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl text-white font-semibold transition">
        {generating ? <><Loader2 size={16} className="animate-spin" /> Generando {validCount} posts...</> : <><Zap size={16} /> Generar {validCount} posts con IA</>}
      </button>

      {/* Results */}
      {results && (
        <div className="mt-6 bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle size={16} className="text-green-400" />
            <span className="text-white font-medium">{results.filter(r => !r.error).length} posts creados</span>
            {results.some(r => r.error) && (
              <span className="text-red-400 text-sm">{results.filter(r => r.error).length} fallidos</span>
            )}
          </div>
          <div className="space-y-1">
            {results.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                {r.error
                  ? <><AlertCircle size={12} className="text-red-400 shrink-0" /><span className="text-red-300">Post {i + 1}: {r.error}</span></>
                  : <><CheckCircle size={12} className="text-green-400 shrink-0" /><a href={r.postId ? `/dashboard/posts/${r.postId}` : "#"} className="text-green-300 hover:underline">Post {i + 1} creado →</a></>
                }
              </div>
            ))}
          </div>
          <a href="/dashboard/calendar" className="inline-flex items-center gap-2 mt-4 text-sm text-indigo-400 hover:underline">
            <Calendar size={14} /> Ver en calendario →
          </a>
        </div>
      )}
    </div>
  )
}

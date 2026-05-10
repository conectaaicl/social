'use client'
import { useState, useEffect, useRef } from 'react'

const TEMPLATES = [
  { id: 'tips',              label: '3 Tips Prácticos',      desc: 'Comparte consejos accionables en 3 slides' },
  { id: 'antes_despues',     label: 'Antes / Después',       desc: 'Muestra la transformación de tu producto' },
  { id: 'showcase',          label: 'Showcase de Producto',  desc: 'Destaca los 3 beneficios principales' },
  { id: 'problema_solucion', label: 'Problema → Solución',   desc: 'Engancha con el dolor y ofrece tu solución' },
]

interface VideoRecord {
  id: string
  template: string
  topic: string
  status: 'processing' | 'done' | 'error'
  outputUrl?: string
  thumbnailUrl?: string
  duration?: number
  error?: string
  createdAt: string
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'done'       ? 'bg-green-900/50 text-green-300 border border-green-700' :
    status === 'error'      ? 'bg-red-900/50 text-red-300 border border-red-700' :
    'bg-yellow-900/50 text-yellow-300 border border-yellow-700 animate-pulse'
  const label =
    status === 'done'       ? '✓ Listo' :
    status === 'error'      ? '✗ Error' : '⏳ Procesando…'
  return <span className={'text-xs px-2 py-0.5 rounded-full ' + cls}>{label}</span>
}

export default function VideosPage() {
  const [videos, setVideos]     = useState<VideoRecord[]>([])
  const [loading, setLoading]   = useState(true)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const [template, setTemplate]     = useState('tips')
  const [topic, setTopic]           = useState('')
  const [customPrompt, setCustom]   = useState('')

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function fetchVideos() {
    const res = await fetch('/api/videos')
    if (res.ok) {
      const data = await res.json()
      setVideos(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchVideos()
    pollingRef.current = setInterval(() => {
      setVideos(prev => {
        const hasProcessing = prev.some(v => v.status === 'processing')
        if (hasProcessing) fetchVideos()
        return prev
      })
    }, 4000)
    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!topic.trim()) return
    setCreating(true)
    const res = await fetch('/api/videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template, topic, customPrompt: customPrompt || undefined }),
    })
    if (res.ok) {
      const rec = await res.json()
      setVideos(prev => [{ ...rec, template, topic, createdAt: new Date().toISOString() }, ...prev])
      setShowForm(false)
      setTopic('')
      setCustom('')
    }
    setCreating(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este video?')) return
    await fetch('/api/videos/' + id, { method: 'DELETE' })
    setVideos(prev => prev.filter(v => v.id !== id))
  }

  const templateLabel = (id: string) => TEMPLATES.find(t => t.id === id)?.label || id

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Video Generator IA</h1>
          <p className="text-sm text-gray-400 mt-1">Reels 9:16 generados con IA + FFmpeg</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          + Nuevo Video
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Crear nuevo Reel</h2>

          <div className="grid grid-cols-2 gap-3">
            {TEMPLATES.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTemplate(t.id)}
                className={'p-3 rounded-lg border text-left transition-all ' +
                  (template === t.id
                    ? 'border-violet-500 bg-violet-900/30 text-white'
                    : 'border-gray-600 bg-gray-700/50 text-gray-300 hover:border-gray-500')}
              >
                <div className="font-medium text-sm">{t.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{t.desc}</div>
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Tema / Producto *</label>
            <input
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="ej: Cortinas roller blackout para dormitorios"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Contexto adicional (opcional)</label>
            <textarea
              value={customPrompt}
              onChange={e => setCustom(e.target.value)}
              placeholder="ej: Dirigido a departamentos en Santiago, precio desde $45.000"
              rows={2}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={creating}
              className="px-5 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {creating ? 'Generando…' : '🎬 Generar Video'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-16 text-gray-500">Cargando…</div>
      ) : videos.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-700 rounded-xl">
          <div className="text-4xl mb-3">🎬</div>
          <p className="text-gray-400">Aún no has generado ningún video.</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm"
          >
            Crear primer Reel
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map(v => (
            <div key={v.id} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
              {/* Thumbnail */}
              <div className="aspect-[9/16] bg-gray-900 relative max-h-48 overflow-hidden flex items-center justify-center">
                {v.thumbnailUrl ? (
                  <img src={v.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-gray-600 text-4xl">
                    {v.status === 'processing' ? '⏳' : v.status === 'error' ? '✗' : '🎬'}
                  </div>
                )}
                {v.duration && (
                  <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                    {v.duration}s
                  </span>
                )}
              </div>

              <div className="p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="text-xs text-violet-400 font-medium">{templateLabel(v.template)}</p>
                    <p className="text-sm text-white font-medium leading-snug mt-0.5 line-clamp-2">{v.topic}</p>
                  </div>
                  <StatusBadge status={v.status} />
                </div>

                {v.error && (
                  <p className="text-xs text-red-400 mb-2 line-clamp-2">{v.error}</p>
                )}

                <div className="flex gap-2 mt-3">
                  {v.status === 'done' && v.outputUrl && (
                    <a
                      href={v.outputUrl}
                      download
                      className="flex-1 text-center px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs rounded-lg transition-colors"
                    >
                      ⬇ Descargar
                    </a>
                  )}
                  <button
                    onClick={() => handleDelete(v.id)}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-red-900/50 text-gray-400 hover:text-red-400 text-xs rounded-lg transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

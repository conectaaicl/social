"use client"

import { useEffect, useState, useCallback } from "react"
import { Image, Video, Trash2, RefreshCw, Download, ChevronLeft, ChevronRight } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface MediaItem {
  id: string
  url: string
  type: "IMAGE" | "VIDEO"
  source: "AI_GENERATED" | "UPLOADED" | "STOCK"
  prompt: string | null
  tags: string[]
  createdAt: string
}

export default function MediaPage() {
  const [items, setItems] = useState<MediaItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState("")
  const [preview, setPreview] = useState<MediaItem | null>(null)

  const limit = 24

  const fetchMedia = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (filterType) params.set("type", filterType)
      const res = await fetch(`/api/media?${params}`)
      const data = await res.json()
      setItems(data.items ?? [])
      setTotal(data.total ?? 0)
    } finally {
      setLoading(false)
    }
  }, [page, filterType])

  useEffect(() => { fetchMedia() }, [fetchMedia])

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este archivo?")) return
    await fetch(`/api/media?id=${id}`, { method: "DELETE" })
    fetchMedia()
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-100">Biblioteca de Media</h1>
          <p className="text-gray-500 mt-0.5 text-sm">{total} archivos generados por IA</p>
        </div>
        <div className="flex gap-3">
          <select
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setPage(1) }}
            className="input w-auto text-sm py-2"
          >
            <option value="">Todos</option>
            <option value="IMAGE">Imágenes</option>
            <option value="VIDEO">Videos</option>
          </select>
          <button onClick={fetchMedia} className="btn-secondary p-2">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="card text-center py-16">
          <Image className="w-10 h-10 text-gray-600 mx-auto mb-4" />
          <h3 className="text-gray-300 font-medium mb-2">Sin archivos aún</h3>
          <p className="text-gray-500 text-sm">Los assets generados por IA aparecerán aquí automáticamente</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="group relative aspect-square bg-gray-800 rounded-lg overflow-hidden cursor-pointer"
              onClick={() => setPreview(item)}
            >
              {item.type === "VIDEO" ? (
                <video src={item.url} className="w-full h-full object-cover" muted />
              ) : (
                <img src={item.url} alt="" className="w-full h-full object-cover" />
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(item.id) }}
                  className="p-1.5 bg-red-500/80 rounded-lg text-white"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <a
                  href={item.url}
                  download
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 bg-indigo-500/80 rounded-lg text-white"
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
              {item.type === "VIDEO" && (
                <div className="absolute top-1.5 left-1.5 bg-black/60 rounded px-1 py-0.5 text-xs text-white flex items-center gap-0.5">
                  <Video className="w-2.5 h-2.5" /> MP4
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary py-1.5 px-3 disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-400">{page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn-secondary py-1.5 px-3 disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Preview modal */}
      {preview && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden max-w-2xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="aspect-square max-h-[60vh] bg-gray-800">
              {preview.type === "VIDEO" ? (
                <video src={preview.url} className="w-full h-full object-contain" controls autoPlay muted />
              ) : (
                <img src={preview.url} alt="" className="w-full h-full object-contain" />
              )}
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                {preview.tags.map((t) => (
                  <span key={t} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{t}</span>
                ))}
                <span className="ml-auto text-xs text-gray-500">
                  {format(new Date(preview.createdAt), "d MMM yyyy", { locale: es })}
                </span>
              </div>
              {preview.prompt && (
                <p className="text-xs text-gray-500 line-clamp-2 italic">{preview.prompt}</p>
              )}
              <div className="flex gap-2 mt-3">
                <a
                  href={preview.url}
                  download
                  className="btn-primary text-sm py-1.5 flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Descargar
                </a>
                <button onClick={() => setPreview(null)} className="btn-secondary text-sm py-1.5">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

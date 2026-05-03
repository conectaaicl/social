"use client"

import { useEffect, useState, useCallback } from "react"
import { Image, Video, Trash2, RefreshCw, Download, ChevronLeft, ChevronRight, Upload, X, FolderPlus, Folder } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface MediaItem {
  id: string
  url: string
  type: "IMAGE" | "VIDEO"
  source: "AI_GENERATED" | "UPLOADED" | "STOCK"
  prompt: string | null
  tags: string[]
  categoryId: string | null
  createdAt: string
}

interface MediaCategory {
  id: string
  name: string
  slug: string
  color: string
  icon: string
  _count: { mediaItems: number }
}

const EMOJI_OPTIONS = ["\u{1F4C1}","\u{1F5BC}","\u{1F3A8}","\u{1F4F8}","\u{1F3AC}","\u2B50","\u{1F6CD}","\u{1F3E0}","\u{1F37D}","\u2708","\u{1F4BC}","\u{1F3AF}","\u{1F525}","\u{1F4A1}","\u{1F308}"]

export default function MediaPage() {
  const [items, setItems] = useState<MediaItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState("")
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [preview, setPreview] = useState<MediaItem | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")
  const [categories, setCategories] = useState<MediaCategory[]>([])
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newCatName, setNewCatName] = useState("")
  const [newCatColor, setNewCatColor] = useState("#6366f1")
  const [newCatIcon, setNewCatIcon] = useState("\u{1F4C1}")
  const [savingCat, setSavingCat] = useState(false)
  const [catError, setCatError] = useState("")
  const limit = 24

  const fetchCategories = useCallback(async () => {
    const res = await fetch("/api/media/categories")
    const data = await res.json()
    setCategories(data.categories ?? [])
  }, [])

  useEffect(() => { fetchCategories() }, [fetchCategories])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError("")
    try {
      const fd = new FormData()
      fd.append("file", file)
      if (activeCategory) fd.append("categoryId", activeCategory)
      const res = await fetch("/api/media", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Error subiendo")
      await fetchMedia()
      fetchCategories()
    } catch (err: any) {
      setUploadError(err.message)
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  const fetchMedia = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (filterType) params.set("type", filterType)
      if (activeCategory) params.set("categoryId", activeCategory)
      const res = await fetch("/api/media?" + params)
      const data = await res.json()
      setItems(data.items ?? [])
      setTotal(data.total ?? 0)
    } finally {
      setLoading(false)
    }
  }, [page, filterType, activeCategory])

  useEffect(() => { fetchMedia() }, [fetchMedia])

  async function handleDelete(id: string) {
    if (!confirm("Eliminar este archivo?")) return
    await fetch("/api/media?id=" + id, { method: "DELETE" })
    fetchMedia()
    fetchCategories()
  }

  async function handleDeleteCategory(id: string, name: string) {
    if (!confirm("Eliminar carpeta " + name + "?")) return
    await fetch("/api/media/categories?id=" + id, { method: "DELETE" })
    if (activeCategory === id) setActiveCategory(null)
    fetchCategories()
  }

  async function createCategory() {
    if (!newCatName.trim()) return
    setSavingCat(true)
    setCatError("")
    try {
      const res = await fetch("/api/media/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCatName, color: newCatColor, icon: newCatIcon }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Error creando carpeta")
      setShowNewFolder(false)
      setNewCatName("")
      setNewCatColor("#6366f1")
      setNewCatIcon("\u{1F4C1}")
      fetchCategories()
    } catch (err: any) {
      setCatError(err.message)
    } finally {
      setSavingCat(false)
    }
  }

  const totalPages = Math.ceil(total / limit)
  const activeCat = categories.find((c) => c.id === activeCategory)

  return (
    <div className="flex h-full min-h-screen">
      <aside className="w-56 shrink-0 border-r border-gray-800 bg-gray-900/50 p-4 flex flex-col gap-1">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Carpetas</span>
          <button onClick={() => setShowNewFolder(true)} className="p-1 rounded hover:bg-gray-800 text-gray-400 hover:text-indigo-400 transition-colors" title="Nueva carpeta">
            <FolderPlus className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={() => { setActiveCategory(null); setPage(1) }}
          className={"flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm w-full text-left " + (activeCategory === null ? "bg-indigo-500/20 text-indigo-300" : "text-gray-400 hover:bg-gray-800 hover:text-gray-200")}
        >
          <Folder className="w-4 h-4" /><span className="flex-1">Todos</span>
        </button>
        {categories.map((cat) => (
          <div key={cat.id} className="group relative">
            <button
              onClick={() => { setActiveCategory(cat.id); setPage(1) }}
              className={"flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm w-full text-left " + (activeCategory === cat.id ? "bg-indigo-500/20 text-indigo-300" : "text-gray-400 hover:bg-gray-800 hover:text-gray-200")}
            >
              <span>{cat.icon}</span><span className="flex-1 truncate">{cat.name}</span>
              <span className="text-xs text-gray-500">{cat._count.mediaItems}</span>
            </button>
            <button onClick={() => handleDeleteCategory(cat.id, cat.name)} className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-0.5 rounded text-gray-600 hover:text-red-400">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {categories.length === 0 && !showNewFolder && <p className="text-xs text-gray-600 px-2 mt-1">Sin carpetas aun</p>}
        {showNewFolder && (
          <div className="mt-3 p-3 bg-gray-800 rounded-lg border border-gray-700 space-y-2">
            <p className="text-xs font-medium text-gray-300">Nueva carpeta</p>
            <div className="flex flex-wrap gap-1">
              {EMOJI_OPTIONS.map((em) => (
                <button key={em} onClick={() => setNewCatIcon(em)} className={"text-sm px-1 py-0.5 rounded " + (newCatIcon === em ? "bg-indigo-500/30 ring-1 ring-indigo-500" : "hover:bg-gray-700")}>{em}</button>
              ))}
            </div>
            <input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Nombre de carpeta" className="input w-full text-xs py-1.5" onKeyDown={(e) => { if (e.key === "Enter") createCategory() }} />
            <div className="flex items-center gap-2">
              <input type="color" value={newCatColor} onChange={(e) => setNewCatColor(e.target.value)} className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent" />
              <span className="text-xs text-gray-500">Color</span>
            </div>
            {catError && <p className="text-xs text-red-400">{catError}</p>}
            <div className="flex gap-1.5">
              <button onClick={createCategory} disabled={savingCat || !newCatName.trim()} className="btn-primary text-xs py-1 px-2 flex-1">{savingCat ? "..." : "Crear"}</button>
              <button onClick={() => { setShowNewFolder(false); setCatError("") }} className="btn-secondary text-xs py-1 px-2">Cancelar</button>
            </div>
          </div>
        )}
      </aside>
      <div className="flex-1 p-6 overflow-auto">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-100">{activeCat ? activeCat.icon + " " + activeCat.name : "Biblioteca de Media"}</h1>
            <p className="text-gray-500 mt-0.5 text-sm">{total} archivos</p>
          </div>
          <div className="flex gap-2">
            <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1) }} className="input w-auto text-sm py-1.5">
              <option value="">Todos</option>
              <option value="IMAGE">Imagenes</option>
              <option value="VIDEO">Videos</option>
            </select>
            <button onClick={fetchMedia} className="btn-secondary p-2"><RefreshCw className="w-4 h-4" /></button>
            <label className={"btn-primary flex items-center gap-2 cursor-pointer text-sm " + (uploading ? "opacity-60 pointer-events-none" : "")}>
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleUpload} disabled={uploading} />
              {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? "Subiendo..." : "Subir foto"}
            </label>
          </div>
        </div>
        {uploadError && (
          <div className="mb-4 flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2 text-sm text-red-400">
            <X className="w-4 h-4 shrink-0" />{uploadError}
            <button onClick={() => setUploadError("")} className="ml-auto text-gray-500">x</button>
          </div>
        )}
        {loading ? (
          <div className="flex justify-center py-20"><RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="card text-center py-16">
            <Image className="w-10 h-10 text-gray-600 mx-auto mb-4" />
            <h3 className="text-gray-300 font-medium mb-2">Sin archivos</h3>
            <p className="text-gray-500 text-sm">{activeCategory ? "Esta carpeta esta vacia." : "Las imagenes apareceran aqui"}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {items.map((item) => (
              <div key={item.id} className="group relative aspect-square bg-gray-800 rounded-lg overflow-hidden cursor-pointer" onClick={() => setPreview(item)}>
                {item.type === "VIDEO" ? (
                  <video src={item.url} className="w-full h-full object-cover" muted />
                ) : (
                  <img src={item.url} alt="" className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id) }} className="p-1.5 bg-red-500/80 rounded-lg text-white"><Trash2 className="w-4 h-4" /></button>
                  <a href={item.url} download onClick={(e) => e.stopPropagation()} className="p-1.5 bg-indigo-500/80 rounded-lg text-white"><Download className="w-4 h-4" /></a>
                </div>
                {item.type === "VIDEO" && <div className="absolute top-1.5 left-1.5 bg-black/60 rounded px-1 py-0.5 text-xs text-white flex items-center gap-0.5"><Video className="w-2.5 h-2.5" /> MP4</div>}
              </div>
            ))}
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary py-1.5 px-3 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm text-gray-400">{page} / {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary py-1.5 px-3 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
          </div>
        )}
        {preview && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setPreview(null)}>
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
              <div className="aspect-square max-h-[60vh] bg-gray-800">
                {preview.type === "VIDEO" ? <video src={preview.url} className="w-full h-full object-contain" controls autoPlay muted /> : <img src={preview.url} alt="" className="w-full h-full object-contain" />}
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  {preview.tags.map((t) => <span key={t} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{t}</span>)}
                  <span className="ml-auto text-xs text-gray-500">{format(new Date(preview.createdAt), "d MMM yyyy", { locale: es })}</span>
                </div>
                {preview.prompt && <p className="text-xs text-gray-500 line-clamp-2 italic">{preview.prompt}</p>}
                <div className="flex gap-2 mt-3">
                  <a href={preview.url} download className="btn-primary text-sm py-1.5 flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> Descargar</a>
                  <button onClick={() => setPreview(null)} className="btn-secondary text-sm py-1.5">Cerrar</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
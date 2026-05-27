"use client"
import { useState, useEffect } from "react"
import { Plus, Trash2, Save, ExternalLink, GripVertical, Eye, BarChart2 } from "lucide-react"

type BioLink = { id?: string; label: string; url: string; icon: string; active: boolean; clicks?: number }
type BioPage = { id?: string; title: string; description: string; avatarUrl: string; theme: string; published: boolean; links: BioLink[] }

const defaultPage: BioPage = {
  title: "Mi perfil", description: "", avatarUrl: "", theme: "dark", published: true,
  links: [
    { label: "Cotiza gratis", url: "https://", icon: "💬", active: true },
    { label: "Catálogo completo", url: "https://", icon: "🛍️", active: true },
    { label: "WhatsApp directo", url: "https://wa.me/", icon: "📱", active: true },
  ]
}

export default function LinkInBioPage() {
  const [page, setPage] = useState<BioPage>(defaultPage)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [slug, setSlug] = useState("")

  useEffect(() => {
    fetch("/api/bio").then(r => r.ok ? r.json() : null).then(d => {
      if (d) setPage({ title: d.title ?? "", description: d.description ?? "", avatarUrl: d.avatarUrl ?? "", theme: d.theme ?? "dark", published: d.published ?? true, links: d.links ?? [] })
    })
    fetch("/api/stats").then(r => r.ok ? r.json() : null).then(d => { if (d?.slug) setSlug(d.slug) })
  }, [])

  function setLink(i: number, k: keyof BioLink, v: any) {
    setPage(prev => ({ ...prev, links: prev.links.map((l, idx) => idx === i ? { ...l, [k]: v } : l) }))
  }
  function addLink() {
    setPage(prev => ({ ...prev, links: [...prev.links, { label: "", url: "https://", icon: "🔗", active: true }] }))
  }
  function removeLink(i: number) {
    setPage(prev => ({ ...prev, links: prev.links.filter((_, idx) => idx !== i) }))
  }

  async function save() {
    setSaving(true)
    try {
      await fetch("/api/bio", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(page) })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally { setSaving(false) }
  }

  const bioUrl = slug ? `${window.location.origin}/bio/${slug}` : null

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Link in Bio</h1>
          <p className="text-white/40 text-sm mt-1">Tu página de enlaces para Instagram, TikTok y todas tus redes</p>
        </div>
        <div className="flex items-center gap-3">
          {bioUrl && (
            <a href={bioUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white/60 hover:text-white transition">
              <Eye size={14} /> Ver página
            </a>
          )}
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm text-white font-semibold transition disabled:opacity-50">
            <Save size={14} /> {saving ? "Guardando..." : saved ? "✓ Guardado" : "Guardar"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Editor */}
        <div className="lg:col-span-3 space-y-4">
          {/* Page config */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">Página</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/40 mb-1 block">Título de la página</label>
                <input value={page.title} onChange={e => setPage(p => ({...p, title: e.target.value}))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Descripción breve</label>
                <input value={page.description} onChange={e => setPage(p => ({...p, description: e.target.value}))}
                  placeholder="Cortinas, persianas y toldos a medida..." className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">URL del avatar/logo</label>
                <input value={page.avatarUrl} onChange={e => setPage(p => ({...p, avatarUrl: e.target.value}))}
                  placeholder="https://..." className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Tema</label>
                  <select value={page.theme} onChange={e => setPage(p => ({...p, theme: e.target.value}))}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
                    <option value="dark">Oscuro</option>
                    <option value="light">Claro</option>
                    <option value="brand">Marca</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 cursor-pointer mt-4">
                  <input type="checkbox" checked={page.published} onChange={e => setPage(p => ({...p, published: e.target.checked}))} className="w-4 h-4 accent-indigo-500" />
                  <span className="text-sm text-white/60">Página publicada</span>
                </label>
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Enlaces</h2>
              <button onClick={addLink} className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition">
                <Plus size={12} /> Agregar
              </button>
            </div>
            <div className="space-y-2">
              {page.links.map((link, i) => (
                <div key={i} className="flex items-center gap-2 bg-white/3 border border-white/5 rounded-lg p-2">
                  <GripVertical size={14} className="text-white/20 shrink-0" />
                  <input value={link.icon} onChange={e => setLink(i, "icon", e.target.value)}
                    className="w-8 bg-transparent text-center text-base focus:outline-none" maxLength={2} />
                  <input value={link.label} onChange={e => setLink(i, "label", e.target.value)}
                    placeholder="Texto del botón" className="flex-1 bg-transparent text-sm text-white focus:outline-none" />
                  <input value={link.url} onChange={e => setLink(i, "url", e.target.value)}
                    placeholder="https://..." className="flex-1 bg-transparent text-xs text-white/40 focus:outline-none" />
                  {link.clicks !== undefined && (
                    <div className="flex items-center gap-1 text-xs text-white/25 shrink-0">
                      <BarChart2 size={10} /> {link.clicks}
                    </div>
                  )}
                  <label className="flex items-center gap-1 shrink-0">
                    <input type="checkbox" checked={link.active} onChange={e => setLink(i, "active", e.target.checked)} className="accent-indigo-500" />
                  </label>
                  <button onClick={() => removeLink(i)} className="text-white/20 hover:text-red-400 transition shrink-0">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {bioUrl && (
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4">
              <p className="text-xs text-indigo-300 mb-1">Tu link-in-bio:</p>
              <div className="flex items-center gap-2">
                <code className="text-sm text-indigo-200 flex-1">{bioUrl}</code>
                <button onClick={() => navigator.clipboard.writeText(bioUrl)} className="text-xs text-indigo-400 hover:text-white transition">Copiar</button>
              </div>
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="lg:col-span-2">
          <div className="sticky top-6">
            <p className="text-xs text-white/30 mb-3 text-center uppercase tracking-wider">Preview</p>
            <div className={`rounded-2xl p-6 text-center ${page.theme === "light" ? "bg-gray-100" : "bg-gray-900 border border-white/10"}`}>
              {page.avatarUrl ? (
                <img src={page.avatarUrl} alt="" className="w-16 h-16 rounded-full mx-auto mb-3 object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full mx-auto mb-3 bg-indigo-600 flex items-center justify-center text-2xl">🏠</div>
              )}
              <h3 className={`font-bold text-lg mb-1 ${page.theme === "light" ? "text-gray-900" : "text-white"}`}>{page.title || "Mi perfil"}</h3>
              {page.description && <p className={`text-sm mb-4 ${page.theme === "light" ? "text-gray-500" : "text-white/50"}`}>{page.description}</p>}
              <div className="space-y-2 mt-4">
                {page.links.filter(l => l.active).map((link, i) => (
                  <div key={i} className={`w-full py-2.5 px-4 rounded-xl text-sm font-medium flex items-center justify-center gap-2 ${page.theme === "light" ? "bg-gray-900 text-white" : "bg-white/10 text-white"}`}>
                    <span>{link.icon}</span> {link.label || "Botón"}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

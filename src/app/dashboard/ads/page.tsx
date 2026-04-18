"use client"

import { useEffect, useState } from "react"
import {
  Megaphone, Plus, RefreshCw, Play, Pause, Trash2,
  TrendingUp, MousePointerClick, Eye, DollarSign,
  Sparkles, CheckCircle, AlertCircle, Clock,
} from "lucide-react"

interface AdCampaign {
  id: string
  name: string
  status: string
  objective: string
  budget: number
  startDate: string
  endDate: string | null
  targetUrl: string
  headlines: string[]
  descriptions: string[]
  keywords: string[]
  googleCampaignId: string | null
  impressions: number | null
  clicks: number | null
  spend: number | null
  conversions: number | null
  post: { caption: string; type: string; mediaUrls: string[] } | null
}

interface Post {
  id: string
  caption: string
  type: string
  status: string
  reach: number | null
}

const STATUS_STYLES: Record<string, { cls: string; label: string; icon: React.ElementType }> = {
  DRAFT: { cls: "bg-gray-700 text-gray-300", label: "Borrador", icon: Clock },
  PENDING_REVIEW: { cls: "bg-yellow-500/20 text-yellow-300", label: "En revisión", icon: Clock },
  ACTIVE: { cls: "bg-green-500/20 text-green-300", label: "Activa", icon: Play },
  PAUSED: { cls: "bg-orange-500/20 text-orange-300", label: "Pausada", icon: Pause },
  ENDED: { cls: "bg-gray-600 text-gray-400", label: "Terminada", icon: CheckCircle },
  REJECTED: { cls: "bg-red-500/20 text-red-300", label: "Rechazada", icon: AlertCircle },
}

const OBJECTIVES = ["AWARENESS", "TRAFFIC", "CONVERSIONS"]
const OBJ_LABELS: Record<string, string> = {
  AWARENESS: "Reconocimiento de marca",
  TRAFFIC: "Tráfico al sitio web",
  CONVERSIONS: "Conversiones / ventas",
}

export default function AdsPage() {
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [generatingCopy, setGeneratingCopy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)

  // Form state
  const [selectedPostId, setSelectedPostId] = useState("")
  const [form, setForm] = useState({
    name: "", objective: "TRAFFIC", budget: 5000,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "", targetUrl: "",
    headlines: ["", "", "", "", ""],
    descriptions: ["", "", ""],
    keywords: "",
  })

  async function load() {
    setLoading(true)
    const [camRes, postRes] = await Promise.all([
      fetch("/api/ads/campaigns"),
      fetch("/api/posts?status=PUBLISHED&limit=20"),
    ])
    const camData = await camRes.json()
    const postData = await postRes.json()
    setCampaigns(camData.campaigns ?? [])
    setPosts(postData.posts ?? [])
    setLoading(false)
  }

  async function generateCopy() {
    if (!selectedPostId) return
    setGeneratingCopy(true)
    const res = await fetch("/api/ads/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "generate_copy",
        postId: selectedPostId,
        campaign: { objective: form.objective },
      }),
    })
    const data = await res.json()
    if (data.copy) {
      setForm((f) => ({
        ...f,
        headlines: [...data.copy.headlines.slice(0, 5), ...Array(5).fill("")].slice(0, 5),
        descriptions: [...data.copy.descriptions.slice(0, 3), ...Array(3).fill("")].slice(0, 3),
      }))
    }
    setGeneratingCopy(false)
  }

  async function createCampaign() {
    setSaving(true)
    const res = await fetch("/api/ads/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        postId: selectedPostId || undefined,
        campaign: {
          ...form,
          keywords: form.keywords.split(",").map((k) => k.trim()).filter(Boolean),
          headlines: form.headlines.filter(Boolean),
          descriptions: form.descriptions.filter(Boolean),
          budget: Number(form.budget),
        },
      }),
    })
    const data = await res.json()
    if (data.success) {
      setShowForm(false)
      setForm({
        name: "", objective: "TRAFFIC", budget: 5000,
        startDate: new Date().toISOString().slice(0, 10),
        endDate: "", targetUrl: "",
        headlines: ["", "", "", "", ""],
        descriptions: ["", "", ""],
        keywords: "",
      })
      setSelectedPostId("")
      await load()
    }
    setSaving(false)
  }

  async function campaignAction(id: string, action: string) {
    setActionId(id)
    await fetch(`/api/ads/campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    })
    await load()
    setActionId(null)
  }

  async function deleteCampaign(id: string) {
    if (!confirm("¿Eliminar esta campaña?")) return
    setActionId(id)
    await fetch(`/api/ads/campaigns/${id}`, { method: "DELETE" })
    await load()
    setActionId(null)
  }

  useEffect(() => { load() }, [])

  const totalSpend = campaigns.reduce((s, c) => s + (c.spend ?? 0), 0)
  const totalClicks = campaigns.reduce((s, c) => s + (c.clicks ?? 0), 0)
  const totalImpressions = campaigns.reduce((s, c) => s + (c.impressions ?? 0), 0)
  const activeCampaigns = campaigns.filter((c) => c.status === "ACTIVE").length

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-100 flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-blue-400" /> Google Ads
          </h1>
          <p className="text-gray-500 mt-0.5 text-sm">Crea campañas de búsqueda desde tus posts más exitosos</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary flex items-center gap-2 text-sm py-2"
        >
          <Plus className="w-4 h-4" /> Nueva campaña
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Campañas activas", value: activeCampaigns, icon: Play, color: "text-green-400" },
          { label: "Impresiones", value: totalImpressions.toLocaleString(), icon: Eye, color: "text-blue-400" },
          { label: "Clicks", value: totalClicks.toLocaleString(), icon: MousePointerClick, color: "text-indigo-400" },
          { label: "Gasto total", value: `$${totalSpend.toLocaleString("es-CL")}`, icon: DollarSign, color: "text-yellow-400" },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <s.icon className={`w-4 h-4 ${s.color} mb-2`} />
            <p className="text-xl font-bold text-gray-100">{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Google Ads config notice */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3">
        <p className="text-sm text-blue-300 font-medium mb-0.5">Configuración Google Ads API</p>
        <p className="text-xs text-blue-400/70">
          Para publicar campañas reales agrega al .env del servidor:{" "}
          <code className="bg-gray-900 px-1 rounded">GOOGLE_ADS_DEVELOPER_TOKEN</code>,{" "}
          <code className="bg-gray-900 px-1 rounded">GOOGLE_ADS_CLIENT_ID</code>,{" "}
          <code className="bg-gray-900 px-1 rounded">GOOGLE_ADS_CLIENT_SECRET</code>,{" "}
          <code className="bg-gray-900 px-1 rounded">GOOGLE_ADS_REFRESH_TOKEN</code>,{" "}
          <code className="bg-gray-900 px-1 rounded">GOOGLE_ADS_CUSTOMER_ID</code>.
          Sin ellas las campañas se guardan como Borrador.
        </p>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-gray-100">Nueva campaña</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Nombre de la campaña</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="input text-sm py-2"
                placeholder="Campaña Cortinas Roller Mayo"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Objetivo</label>
              <select
                value={form.objective}
                onChange={(e) => setForm((f) => ({ ...f, objective: e.target.value }))}
                className="input text-sm py-2"
              >
                {OBJECTIVES.map((o) => <option key={o} value={o}>{OBJ_LABELS[o]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Presupuesto diario (CLP)</label>
              <input
                type="number"
                value={form.budget}
                onChange={(e) => setForm((f) => ({ ...f, budget: Number(e.target.value) }))}
                className="input text-sm py-2"
                min={1000}
                step={1000}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">URL de destino</label>
              <input
                value={form.targetUrl}
                onChange={(e) => setForm((f) => ({ ...f, targetUrl: e.target.value }))}
                className="input text-sm py-2"
                placeholder="https://terrablinds.cl/productos"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Fecha inicio</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                className="input text-sm py-2"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Fecha fin (opcional)</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                className="input text-sm py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Keywords (separadas por coma)</label>
            <input
              value={form.keywords}
              onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))}
              className="input text-sm py-2"
              placeholder="cortinas roller, estores, persianas chile"
            />
          </div>

          {/* AI copy generation from post */}
          <div className="border border-gray-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-300 font-medium">Generar copy con IA desde un post</p>
              <div className="flex gap-2 items-center">
                <select
                  value={selectedPostId}
                  onChange={(e) => setSelectedPostId(e.target.value)}
                  className="input text-xs py-1.5 max-w-xs"
                >
                  <option value="">Seleccionar post publicado…</option>
                  {posts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.type} · {p.caption.slice(0, 40)}…
                    </option>
                  ))}
                </select>
                <button
                  onClick={generateCopy}
                  disabled={!selectedPostId || generatingCopy}
                  className="btn-primary flex items-center gap-1.5 text-xs py-1.5"
                >
                  {generatingCopy ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  Generar
                </button>
              </div>
            </div>

            {/* Headlines */}
            <div>
              <p className="text-xs text-gray-500 mb-2">Titulares (max 30 caracteres cada uno)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {form.headlines.map((h, i) => (
                  <div key={i} className="relative">
                    <input
                      value={h}
                      maxLength={30}
                      onChange={(e) => setForm((f) => {
                        const arr = [...f.headlines]; arr[i] = e.target.value; return { ...f, headlines: arr }
                      })}
                      className="input text-xs py-1.5 pr-10"
                      placeholder={`Titular ${i + 1}`}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-600">
                      {h.length}/30
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Descriptions */}
            <div>
              <p className="text-xs text-gray-500 mb-2">Descripciones (max 90 caracteres cada una)</p>
              <div className="space-y-2">
                {form.descriptions.map((d, i) => (
                  <div key={i} className="relative">
                    <input
                      value={d}
                      maxLength={90}
                      onChange={(e) => setForm((f) => {
                        const arr = [...f.descriptions]; arr[i] = e.target.value; return { ...f, descriptions: arr }
                      })}
                      className="input text-xs py-1.5 pr-14"
                      placeholder={`Descripción ${i + 1}`}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-600">
                      {d.length}/90
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={createCampaign}
              disabled={saving || !form.name || !form.targetUrl}
              className="btn-primary flex items-center gap-2 text-sm py-2"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
              {saving ? "Creando…" : "Crear campaña"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="text-sm text-gray-500 hover:text-gray-300 px-4 py-2"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Campaign list */}
      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin" /> Cargando campañas…
        </div>
      ) : campaigns.length === 0 ? (
        <div className="card p-10 text-center">
          <Megaphone className="w-8 h-8 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No hay campañas aún.</p>
          <p className="text-gray-600 text-xs mt-1">Crea tu primera campaña desde un post exitoso.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => {
            const st = STATUS_STYLES[c.status] ?? STATUS_STYLES.DRAFT
            const StIcon = st.icon
            const ctr = c.impressions && c.clicks
              ? ((c.clicks / c.impressions) * 100).toFixed(2)
              : null
            return (
              <div key={c.id} className="card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-gray-200">{c.name}</h3>
                      <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${st.cls}`}>
                        <StIcon className="w-3 h-3" /> {st.label}
                      </span>
                      <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">
                        {OBJ_LABELS[c.objective] ?? c.objective}
                      </span>
                      {!c.googleCampaignId && (
                        <span className="text-xs text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded">
                          Sin Google Ads API
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-4 text-xs text-gray-500 mb-2">
                      <span>Presupuesto: <span className="text-gray-300">${c.budget.toLocaleString("es-CL")}/día</span></span>
                      <span>Inicio: <span className="text-gray-300">{new Date(c.startDate).toLocaleDateString("es-CL")}</span></span>
                      {c.endDate && <span>Fin: <span className="text-gray-300">{new Date(c.endDate).toLocaleDateString("es-CL")}</span></span>}
                    </div>

                    {/* Metrics */}
                    {(c.impressions || c.clicks || c.spend) ? (
                      <div className="flex gap-4 text-xs">
                        <span className="flex items-center gap-1 text-gray-400">
                          <Eye className="w-3 h-3" /> {(c.impressions ?? 0).toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1 text-indigo-400">
                          <MousePointerClick className="w-3 h-3" /> {(c.clicks ?? 0).toLocaleString()}
                          {ctr && <span className="text-gray-600">({ctr}%)</span>}
                        </span>
                        <span className="flex items-center gap-1 text-yellow-400">
                          <DollarSign className="w-3 h-3" /> ${(c.spend ?? 0).toLocaleString("es-CL")}
                        </span>
                        {c.conversions != null && (
                          <span className="flex items-center gap-1 text-green-400">
                            <TrendingUp className="w-3 h-3" /> {c.conversions} conv.
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-600">Sin métricas aún — activa la campaña para ver datos</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5 shrink-0">
                    {c.status === "PAUSED" || c.status === "DRAFT" || c.status === "PENDING_REVIEW" ? (
                      <button
                        onClick={() => campaignAction(c.id, "activate")}
                        disabled={actionId === c.id}
                        className="flex items-center gap-1.5 text-xs bg-green-500/20 text-green-300 hover:bg-green-500/30 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        {actionId === c.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                        Activar
                      </button>
                    ) : c.status === "ACTIVE" ? (
                      <button
                        onClick={() => campaignAction(c.id, "pause")}
                        disabled={actionId === c.id}
                        className="flex items-center gap-1.5 text-xs bg-orange-500/20 text-orange-300 hover:bg-orange-500/30 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        {actionId === c.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Pause className="w-3 h-3" />}
                        Pausar
                      </button>
                    ) : null}
                    {c.googleCampaignId && (
                      <button
                        onClick={() => campaignAction(c.id, "sync_stats")}
                        disabled={actionId === c.id}
                        className="flex items-center gap-1.5 text-xs bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <RefreshCw className={`w-3 h-3 ${actionId === c.id ? "animate-spin" : ""}`} />
                        Sync stats
                      </button>
                    )}
                    <button
                      onClick={() => deleteCampaign(c.id)}
                      disabled={actionId === c.id}
                      className="flex items-center gap-1.5 text-xs bg-red-500/20 text-red-300 hover:bg-red-500/30 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3 h-3" /> Eliminar
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

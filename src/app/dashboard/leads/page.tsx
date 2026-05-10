"use client"

import { useEffect, useState, useCallback } from "react"
import { RefreshCw, Plus, X, MessageCircle, Star, Clock, ChevronDown } from "lucide-react"

interface Lead {
  id: string
  nombre: string | null
  whatsappPhone: string
  stage: string
  leadScore: number
  fuentePostId: string | null
  lastActivity: string | null
  activity_count: number
  createdAt: string
  updatedAt: string
}

const STAGES = [
  { key: "nuevo",      label: "Nuevo",      color: "border-gray-500",   bg: "bg-gray-500/10",   text: "text-gray-300" },
  { key: "contactado", label: "Contactado", color: "border-blue-500",   bg: "bg-blue-500/10",   text: "text-blue-300" },
  { key: "calificado", label: "Calificado", color: "border-indigo-500", bg: "bg-indigo-500/10", text: "text-indigo-300" },
  { key: "propuesta",  label: "Propuesta",  color: "border-yellow-500", bg: "bg-yellow-500/10", text: "text-yellow-300" },
  { key: "cliente",    label: "Cliente",    color: "border-green-500",  bg: "bg-green-500/10",  text: "text-green-300" },
  { key: "perdido",    label: "Perdido",    color: "border-red-500",    bg: "bg-red-500/10",    text: "text-red-400" },
]

function scoreColor(score: number) {
  if (score >= 80) return "text-green-400 bg-green-500/10 border-green-500/20"
  if (score >= 50) return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20"
  return "text-gray-400 bg-gray-500/10 border-gray-500/20"
}

function fmtDate(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short" })
}

function fmtPhone(p: string) {
  return p.startsWith("+") ? p : "+" + p
}

interface NewLeadFormProps {
  onCreated: () => void
  onClose: () => void
}

function NewLeadForm({ onCreated, onClose }: NewLeadFormProps) {
  const [phone, setPhone] = useState("")
  const [nombre, setNombre] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!phone.trim()) { setError("El teléfono es requerido"); return }
    setLoading(true)
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsappPhone: phone.trim(), nombre: nombre.trim() || null }),
      })
      if (!res.ok) throw new Error("Error al crear lead")
      onCreated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <h3 className="text-white font-semibold">Agregar Lead WhatsApp</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 p-1 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Teléfono WhatsApp *</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+56912345678"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Nombre (opcional)</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre del contacto"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-gray-200 text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loading ? "Guardando..." : "Agregar Lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface StageDropdownProps {
  leadId: string
  currentStage: string
  onMoved: () => void
}

function StageDropdown({ leadId, currentStage, onMoved }: StageDropdownProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function moveTo(stage: string) {
    if (stage === currentStage) { setOpen(false); return }
    setLoading(true)
    try {
      await fetch("/api/leads/" + leadId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      })
      onMoved()
    } finally {
      setLoading(false)
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={loading}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-indigo-400 transition-colors disabled:opacity-50"
      >
        <span>{loading ? "Moviendo..." : "Mover"}</span>
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-6 z-20 bg-gray-800 border border-gray-700 rounded-lg shadow-xl min-w-[130px] py-1">
            {STAGES.filter((s) => s.key !== currentStage).map((s) => (
              <button
                key={s.key}
                onClick={() => moveTo(s.key)}
                className={"block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-700 transition-colors " + s.text}
              >
                {s.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

interface LeadCardProps {
  lead: Lead
  onMoved: () => void
}

function LeadCard({ lead, onMoved }: LeadCardProps) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 space-y-2 hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-100 truncate">
            {lead.nombre || "Sin nombre"}
          </p>
          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
            <MessageCircle className="w-3 h-3 shrink-0" />
            {fmtPhone(lead.whatsappPhone)}
          </p>
        </div>
        <span className={"text-xs font-semibold px-1.5 py-0.5 rounded border " + scoreColor(lead.leadScore)}>
          {lead.leadScore}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <span className="flex items-center gap-0.5">
            <Star className="w-3 h-3" />
            {lead.activity_count} act.
          </span>
          <span className="flex items-center gap-0.5">
            <Clock className="w-3 h-3" />
            {fmtDate(lead.updatedAt)}
          </span>
        </div>
        <StageDropdown leadId={lead.id} currentStage={lead.stage} onMoved={onMoved} />
      </div>
    </div>
  )
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    try {
      const url = activeFilter ? "/api/leads?stage=" + activeFilter : "/api/leads"
      const res = await fetch(url)
      const data = await res.json()
      setLeads(data.leads ?? [])
    } finally {
      setLoading(false)
    }
  }, [activeFilter])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  const leadsForStage = (stage: string) => leads.filter((l) => l.stage === stage)
  const totalLeads = leads.length
  const clientLeads = leads.filter((l) => l.stage === "cliente").length

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-screen-2xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">CRM WhatsApp</h1>
            <p className="text-sm text-gray-500 mt-1">
              {totalLeads} leads totales &middot; {clientLeads} clientes
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchLeads}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600 text-sm transition-colors disabled:opacity-50"
            >
              <RefreshCw className={"w-4 h-4 " + (loading ? "animate-spin" : "")} />
              Actualizar
            </button>
            <button
              onClick={() => setShowNew(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nuevo Lead
            </button>
          </div>
        </div>

        {/* Integration info banner */}
        {totalLeads === 0 && !loading && (
          <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <MessageCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-indigo-300 font-medium text-sm">Conecta tu WhatsApp para capturar leads automáticamente</p>
                <p className="text-gray-500 text-xs mt-1">
                  Los contactos que interactúen con tu cuenta de WhatsApp Business aparecerán aquí como leads.
                  Configura tu instancia en Configuración &rarr; WhatsApp para activar la integración.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stage filter pills */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveFilter(null)}
            className={"px-3 py-1.5 rounded-full text-xs font-medium border transition-colors " +
              (activeFilter === null
                ? "bg-indigo-600 border-indigo-500 text-white"
                : "border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600")}
          >
            Todos ({leads.length})
          </button>
          {STAGES.map((s) => {
            const count = leadsForStage(s.key).length
            return (
              <button
                key={s.key}
                onClick={() => setActiveFilter(activeFilter === s.key ? null : s.key)}
                className={"px-3 py-1.5 rounded-full text-xs font-medium border transition-colors " +
                  (activeFilter === s.key
                    ? s.bg + " " + s.color + " " + s.text
                    : "border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600")}
              >
                {s.label} ({count})
              </button>
            )
          })}
        </div>

        {/* Kanban board */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {STAGES.map((stage) => {
              const stageLeads = leadsForStage(stage.key)
              return (
                <div key={stage.key} className="space-y-2">
                  {/* Column header */}
                  <div className={"flex items-center justify-between px-2 py-1.5 rounded-lg border " + stage.color + " " + stage.bg}>
                    <span className={"text-xs font-semibold " + stage.text}>{stage.label}</span>
                    <span className={"text-xs font-bold " + stage.text}>{stageLeads.length}</span>
                  </div>
                  {/* Lead cards */}
                  <div className="space-y-2 min-h-[80px]">
                    {stageLeads.length === 0 ? (
                      <div className="border border-dashed border-gray-800 rounded-lg h-16 flex items-center justify-center">
                        <span className="text-xs text-gray-700">Sin leads</span>
                      </div>
                    ) : (
                      stageLeads.map((lead) => (
                        <LeadCard key={lead.id} lead={lead} onMoved={fetchLeads} />
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Stats footer */}
        {leads.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {[
              { label: "Total Leads", value: totalLeads, color: "text-gray-100" },
              { label: "En progreso", value: leads.filter((l) => ["contactado","calificado","propuesta"].includes(l.stage)).length, color: "text-indigo-400" },
              { label: "Clientes", value: clientLeads, color: "text-green-400" },
              { label: "Perdidos", value: leads.filter((l) => l.stage === "perdido").length, color: "text-red-400" },
            ].map((stat) => (
              <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-500">{stat.label}</p>
                <p className={"text-2xl font-bold mt-1 " + stat.color}>{stat.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {showNew && (
        <NewLeadForm onCreated={fetchLeads} onClose={() => setShowNew(false)} />
      )}
    </div>
  )
}

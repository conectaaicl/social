"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Users, Plus, Trash2, RefreshCw, CheckCircle2, AlertCircle,
  Copy, ChevronDown, ChevronUp, DollarSign, TrendingUp, Link2,
  Mail, Phone, Tag, Edit2, X, Check, ExternalLink
} from "lucide-react"

type AffiliateType = "REFERRAL" | "RESELLER" | "INFLUENCER"
type AffiliateStatus = "ACTIVE" | "PAUSED" | "SUSPENDED"
type ReferralStatus = "PENDING" | "CONVERTED" | "APPROVED" | "PAID" | "REJECTED"

interface Referral {
  id: string
  referredName: string | null
  referredEmail: string | null
  referredPhone: string | null
  amount: number
  commission: number
  notes: string | null
  status: ReferralStatus
  paidAt: string | null
  createdAt: string
}

interface Affiliate {
  id: string
  code: string
  name: string
  email: string
  phone: string | null
  type: AffiliateType
  status: AffiliateStatus
  commission: number
  notes: string | null
  createdAt: string
  referrals: Referral[]
}

const TYPE_LABEL: Record<AffiliateType, string> = {
  REFERRAL: "Referido", RESELLER: "Revendedor", INFLUENCER: "Influencer"
}
const TYPE_COLOR: Record<AffiliateType, string> = {
  REFERRAL: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  RESELLER: "text-green-400 bg-green-500/10 border-green-500/20",
  INFLUENCER: "text-pink-400 bg-pink-500/10 border-pink-500/20",
}
const STATUS_LABEL: Record<ReferralStatus, string> = {
  PENDING: "Pendiente", CONVERTED: "Convertido", APPROVED: "Aprobado",
  PAID: "Pagado", REJECTED: "Rechazado"
}
const STATUS_COLOR: Record<ReferralStatus, string> = {
  PENDING: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  CONVERTED: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  APPROVED: "text-green-400 bg-green-500/10 border-green-500/20",
  PAID: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  REJECTED: "text-red-400 bg-red-500/10 border-red-500/20",
}

function fmt(n: number) {
  return n.toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 })
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" })
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="p-1 rounded hover:bg-gray-700 text-gray-500 hover:text-indigo-400 transition-colors">
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

function NewReferralForm({ affiliateId, commission, onCreated, onClose }: {
  affiliateId: string; commission: number; onCreated: () => void; onClose: () => void
}) {
  const [form, setForm] = useState({ referredName: "", referredEmail: "", referredPhone: "", amount: "", notes: "" })
  const [saving, setSaving] = useState(false)
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      await fetch(`/api/affiliates/${affiliateId}/referrals`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      onCreated()
    } finally { setSaving(false) }
  }

  const previewCommission = form.amount ? ((Number(form.amount) * commission) / 100) : 0

  return (
    <form onSubmit={submit} className="border border-indigo-500/20 bg-indigo-500/5 rounded-xl p-4 space-y-3 mt-3">
      <p className="text-xs font-semibold text-indigo-400 flex items-center gap-1"><Plus className="w-3 h-3" /> Nuevo referido</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Nombre</label>
          <input value={form.referredName} onChange={set("referredName")} placeholder="Juan Pérez"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-500" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Teléfono</label>
          <input value={form.referredPhone} onChange={set("referredPhone")} placeholder="56912345678"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-500" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Email</label>
          <input value={form.referredEmail} onChange={set("referredEmail")} placeholder="juan@email.cl"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-500" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Monto venta ($)</label>
          <input value={form.amount} onChange={set("amount")} placeholder="0" type="number" min="0"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-500" />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Notas</label>
        <input value={form.notes} onChange={set("notes")} placeholder="Vendió cortinas dormitorio principal..."
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-500" />
      </div>
      {previewCommission > 0 && (
        <p className="text-xs text-green-400 flex items-center gap-1">
          <DollarSign className="w-3 h-3" /> Comisión calculada: {fmt(previewCommission)} ({commission}%)
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={saving}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-3 py-2 text-xs font-medium disabled:opacity-50">
          {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          {saving ? "Guardando..." : "Guardar referido"}
        </button>
        <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xs px-3 py-2">Cancelar</button>
      </div>
    </form>
  )
}

function AffiliateCard({ affiliate, onRefresh }: { affiliate: Affiliate; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [showNewReferral, setShowNewReferral] = useState(false)
  const [updatingRef, setUpdatingRef] = useState<string | null>(null)

  const totalSales = affiliate.referrals.reduce((s, r) => s + r.amount, 0)
  const totalCommission = affiliate.referrals.reduce((s, r) => s + r.commission, 0)
  const pendingCommission = affiliate.referrals
    .filter(r => r.status === "APPROVED")
    .reduce((s, r) => s + r.commission, 0)
  const paidCommission = affiliate.referrals
    .filter(r => r.status === "PAID")
    .reduce((s, r) => s + r.commission, 0)

  const appUrl = typeof window !== "undefined" ? window.location.origin : ""
  const trackingLink = `${appUrl}/ref/${affiliate.code}`

  async function deleteAffiliate() {
    if (!confirm(`Eliminar afiliado ${affiliate.name}?`)) return
    await fetch(`/api/affiliates/${affiliate.id}`, { method: "DELETE" })
    onRefresh()
  }

  async function updateRefStatus(refId: string, status: ReferralStatus) {
    setUpdatingRef(refId)
    try {
      await fetch(`/api/affiliates/${affiliate.id}/referrals?referralId=${refId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      onRefresh()
    } finally { setUpdatingRef(null) }
  }

  return (
    <div className="card border border-gray-700/50">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-indigo-600/20 rounded-xl flex items-center justify-center text-indigo-400 font-bold text-sm shrink-0">
            {affiliate.name[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-gray-100">{affiliate.name}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${TYPE_COLOR[affiliate.type]}`}>
                {TYPE_LABEL[affiliate.type]}
              </span>
              {affiliate.status !== "ACTIVE" && (
                <span className="text-xs px-2 py-0.5 rounded-full border border-red-500/20 bg-red-500/10 text-red-400">
                  {affiliate.status}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              <span className="text-xs text-gray-500 flex items-center gap-1"><Mail className="w-3 h-3" />{affiliate.email}</span>
              {affiliate.phone && <span className="text-xs text-gray-500 flex items-center gap-1"><Phone className="w-3 h-3" />{affiliate.phone}</span>}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="hidden sm:flex items-center gap-4 shrink-0">
          <div className="text-center">
            <p className="text-sm font-bold text-gray-100">{affiliate.referrals.length}</p>
            <p className="text-xs text-gray-500">referidos</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-green-400">{fmt(totalCommission)}</p>
            <p className="text-xs text-gray-500">comisión total</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-yellow-400">{fmt(pendingCommission)}</p>
            <p className="text-xs text-gray-500">por pagar</p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button onClick={deleteAffiliate}
            className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Code + link */}
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 bg-gray-800 rounded-lg px-3 py-1.5 text-xs">
          <Tag className="w-3 h-3 text-indigo-400" />
          <span className="font-mono text-indigo-300 font-bold">{affiliate.code}</span>
          <CopyBtn text={affiliate.code} />
        </div>
        <div className="flex items-center gap-1.5 bg-gray-800 rounded-lg px-3 py-1.5 text-xs flex-1 min-w-0">
          <Link2 className="w-3 h-3 text-gray-500 shrink-0" />
          <span className="text-gray-400 truncate">{trackingLink}</span>
          <CopyBtn text={trackingLink} />
        </div>
        <span className="text-xs text-gray-600">{affiliate.commission}% comisión</span>
      </div>

      {/* Expanded referrals */}
      {expanded && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <Users className="w-3 h-3" /> Referidos ({affiliate.referrals.length})
            </p>
            <button onClick={() => setShowNewReferral(!showNewReferral)}
              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
              <Plus className="w-3 h-3" /> Agregar referido
            </button>
          </div>

          {showNewReferral && (
            <NewReferralForm
              affiliateId={affiliate.id}
              commission={affiliate.commission}
              onCreated={() => { setShowNewReferral(false); onRefresh() }}
              onClose={() => setShowNewReferral(false)}
            />
          )}

          {affiliate.referrals.length === 0 ? (
            <p className="text-xs text-gray-600 py-3 text-center">Sin referidos aún — comparte el link de afiliado</p>
          ) : (
            <div className="space-y-1.5">
              {affiliate.referrals.map((r) => (
                <div key={r.id} className="flex items-center justify-between bg-gray-800/50 rounded-xl px-3 py-2.5 gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-200 font-medium">{r.referredName ?? r.referredEmail ?? r.referredPhone ?? "Anónimo"}</p>
                    {r.referredEmail && <p className="text-xs text-gray-500">{r.referredEmail}</p>}
                    {r.notes && <p className="text-xs text-gray-600 italic">{r.notes}</p>}
                    <p className="text-xs text-gray-600">{fmtDate(r.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {r.amount > 0 && (
                      <div className="text-right">
                        <p className="text-xs text-gray-300">{fmt(r.amount)}</p>
                        <p className="text-xs text-green-400">{fmt(r.commission)} comisión</p>
                      </div>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLOR[r.status]}`}>
                      {STATUS_LABEL[r.status]}
                    </span>
                    {/* Status transitions */}
                    {r.status === "PENDING" && (
                      <button onClick={() => updateRefStatus(r.id, "CONVERTED")}
                        disabled={updatingRef === r.id}
                        className="text-xs text-blue-400 hover:text-blue-300 border border-blue-500/20 bg-blue-500/10 rounded-lg px-2 py-0.5 transition-colors">
                        Convertido
                      </button>
                    )}
                    {r.status === "CONVERTED" && (
                      <button onClick={() => updateRefStatus(r.id, "APPROVED")}
                        disabled={updatingRef === r.id}
                        className="text-xs text-green-400 hover:text-green-300 border border-green-500/20 bg-green-500/10 rounded-lg px-2 py-0.5 transition-colors">
                        Aprobar
                      </button>
                    )}
                    {r.status === "APPROVED" && (
                      <button onClick={() => updateRefStatus(r.id, "PAID")}
                        disabled={updatingRef === r.id}
                        className="text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 bg-emerald-500/10 rounded-lg px-2 py-0.5 transition-colors">
                        Pagar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function AffiliatesPage() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ name: "", email: "", phone: "", type: "REFERRAL", commission: "10", notes: "" })
  const [saving, setSaving] = useState(false)
  const [banner, setBanner] = useState<{ type: "ok" | "err"; msg: string } | null>(null)

  const fetchAffiliates = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/affiliates")
      const data = await res.json()
      setAffiliates(data.affiliates ?? [])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAffiliates() }, [fetchAffiliates])

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function createAffiliate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      const res = await fetch("/api/affiliates", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setShowNew(false)
        setForm({ name: "", email: "", phone: "", type: "REFERRAL", commission: "10", notes: "" })
        await fetchAffiliates()
        setBanner({ type: "ok", msg: "Afiliado creado exitosamente" })
        setTimeout(() => setBanner(null), 3000)
      } else {
        const d = await res.json()
        setBanner({ type: "err", msg: d.error ?? "Error al crear" })
      }
    } finally { setSaving(false) }
  }

  // Summary stats
  const totalReferrals = affiliates.reduce((s, a) => s + a.referrals.length, 0)
  const totalCommissionPending = affiliates.reduce((s, a) =>
    s + a.referrals.filter(r => r.status === "APPROVED").reduce((ss, r) => ss + r.commission, 0), 0)
  const totalCommissionPaid = affiliates.reduce((s, a) =>
    s + a.referrals.filter(r => r.status === "PAID").reduce((ss, r) => ss + r.commission, 0), 0)
  const totalSales = affiliates.reduce((s, a) =>
    s + a.referrals.reduce((ss, r) => ss + r.amount, 0), 0)

  return (
    <div className="p-4 md:p-8 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-400" /> Programa de Afiliados
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Gestiona referidos, comisiones y pagos</p>
        </div>
        <button onClick={() => setShowNew(!showNew)}
          className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nuevo afiliado
        </button>
      </div>

      {banner && (
        <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${banner.type === "ok" ? "bg-green-500/10 border-green-500/20 text-green-300" : "bg-red-500/10 border-red-500/20 text-red-300"}`}>
          {banner.type === "ok" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {banner.msg}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Afiliados activos", value: affiliates.filter(a => a.status === "ACTIVE").length, icon: Users, color: "text-indigo-400", bg: "bg-indigo-500/10" },
          { label: "Total referidos", value: totalReferrals, icon: TrendingUp, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Comisiones por pagar", value: fmt(totalCommissionPending), icon: DollarSign, color: "text-yellow-400", bg: "bg-yellow-500/10" },
          { label: "Comisiones pagadas", value: fmt(totalCommissionPaid), icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/10" },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <div className={`${s.bg} w-8 h-8 rounded-lg flex items-center justify-center mb-3`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className="text-xl font-bold text-gray-100">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* New affiliate form */}
      {showNew && (
        <div className="card border border-indigo-500/20 bg-indigo-500/5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-indigo-400 flex items-center gap-2"><Plus className="w-4 h-4" /> Nuevo afiliado</h2>
            <button onClick={() => setShowNew(false)} className="text-gray-500 hover:text-gray-300"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={createAffiliate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Nombre *</label>
                <input value={form.name} onChange={set("name")} required placeholder="María González"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Email *</label>
                <input value={form.email} onChange={set("email")} required type="email" placeholder="maria@email.cl"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Teléfono</label>
                <input value={form.phone} onChange={set("phone")} placeholder="56912345678"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Comisión (%)</label>
                <input value={form.commission} onChange={set("commission")} type="number" min="1" max="100" step="0.5"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Tipo</label>
                <select value={form.type} onChange={set("type")}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500">
                  <option value="REFERRAL">Referido</option>
                  <option value="RESELLER">Revendedor</option>
                  <option value="INFLUENCER">Influencer</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Notas</label>
                <input value={form.notes} onChange={set("notes")} placeholder="Diseñadora de interiores..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500" />
              </div>
            </div>
            <button type="submit" disabled={saving}
              className="btn-primary flex items-center gap-2">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {saving ? "Creando..." : "Crear afiliado"}
            </button>
          </form>
        </div>
      )}

      {/* Affiliates list */}
      {loading ? (
        <div className="flex justify-center py-20"><RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" /></div>
      ) : affiliates.length === 0 ? (
        <div className="card border border-dashed border-gray-700 text-center py-12">
          <Users className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400 font-medium mb-1">Sin afiliados todavía</p>
          <p className="text-gray-600 text-sm mb-4">Crea tu primer afiliado y compártele su link único de referido</p>
          <button onClick={() => setShowNew(true)} className="btn-primary inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Agregar primer afiliado
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {affiliates.map(a => <AffiliateCard key={a.id} affiliate={a} onRefresh={fetchAffiliates} />)}
        </div>
      )}
    </div>
  )
}

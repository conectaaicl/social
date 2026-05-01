"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Crown, Building2, Users, BarChart3, TrendingUp, CheckCircle2, XCircle,
  RefreshCw, Plus, Eye, EyeOff, Copy, Check, Key, MessageCircle,
  Smartphone, Globe, Zap, AlertTriangle, Settings, Lock, Instagram,
  Facebook, ChevronDown, ChevronUp, Trash2, Heart, Image, Mail, Send,
} from "lucide-react"

// ── Types ────────────────────────────────────────────────────────────────────
interface TenantUser { id: string; email: string; name: string | null; role: string; createdAt: string }
interface SocialAccount { platform: string; accountName: string | null; active: boolean; tokenExpiresAt: string | null }
interface TenantStats { published: number; scheduled: number; failed: number; totalReach: number; totalLikes: number }
interface Tenant {
  id: string; name: string; slug: string; logo: string | null; plan: string; active: boolean; createdAt: string
  notes: string | null; whatsappPhone: string | null; whatsappInstance: string | null
  metaAppId: string | null; groqApiKey: string | null; anthropicApiKey: string | null; openaiApiKey: string | null
  users: TenantUser[]; socialAccounts: SocialAccount[]
  brandVoice: { industry: string; tone: string } | null
  _count: { posts: number; mediaItems: number }; stats: TenantStats
}
interface Toast { id: number; msg: string; type: "ok" | "err" }

// ── Helpers ──────────────────────────────────────────────────────────────────
const PLAN_BADGE: Record<string, string> = {
  AGENCY: "bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-300 border border-yellow-500/30",
  PRO: "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30",
  BASIC: "bg-gray-700/50 text-gray-400 border border-gray-600/30",
}
const PLAN_AVATAR: Record<string, string> = {
  AGENCY: "from-yellow-500 to-orange-500",
  PRO: "from-indigo-500 to-purple-600",
  BASIC: "from-gray-600 to-gray-700",
}
const ROLE_BADGE: Record<string, string> = {
  SUPERADMIN: "bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-300 border border-yellow-500/30",
  OWNER: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  EDITOR: "bg-gray-700 text-gray-400 border border-gray-600",
}
function fmt(n: number) { return n.toLocaleString("es-CL") }
function fmtDate(s: string) { return new Date(s).toLocaleDateString("es-CL") }
function initials(name: string) { return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) }
function mask(s: string | null) { if (!s) return "—"; return s.slice(0, 6) + "••••••" + s.slice(-4) }

// ── CopyBtn ──────────────────────────────────────────────────────────────────
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="p-1 rounded hover:bg-gray-700 transition-colors text-gray-500 hover:text-gray-300">
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

// ── Toast ────────────────────────────────────────────────────────────────────
function Toasts({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map(t => (
        <div key={t.id} className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium shadow-xl animate-in slide-in-from-right ${t.type === "ok" ? "bg-green-500/20 border-green-500/30 text-green-300" : "bg-red-500/20 border-red-500/30 text-red-300"}`}>
          {t.type === "ok" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {t.msg}
        </div>
      ))}
    </div>
  )
}

// ── NewTenantModal ────────────────────────────────────────────────────────────
function NewTenantModal({ onClose, onCreated }: { onClose: () => void; onCreated: (msg: string) => void }) {
  const [form, setForm] = useState({ tenantName: "", email: "", name: "", password: "", plan: "PRO" })
  const [saving, setSaving] = useState(false)
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    try {
      const res = await fetch("/api/admin/tenants", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_tenant", ...form }),
      })
      if (res.ok) { onCreated("Tenant creado exitosamente"); onClose() }
      else { const d = await res.json(); onCreated("Error: " + (d.error ?? "desconocido")) }
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
            <Plus className="w-5 h-5 text-indigo-400" /> Nuevo Tenant
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xl leading-none">×</button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          {[
            { k: "tenantName", label: "Nombre del negocio", placeholder: "Ej: MiEmpresa" },
            { k: "email", label: "Email del admin", placeholder: "admin@miempresa.cl" },
            { k: "name", label: "Nombre del admin", placeholder: "Juan Pérez" },
            { k: "password", label: "Contraseña", placeholder: "mínimo 6 caracteres" },
          ].map(f => (
            <div key={f.k}>
              <label className="block text-xs text-gray-400 mb-1">{f.label}</label>
              <input type={f.k === "password" ? "password" : "text"} value={(form as any)[f.k]} onChange={set(f.k)}
                placeholder={f.placeholder} required minLength={f.k === "password" ? 6 : 2}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
            </div>
          ))}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Plan</label>
            <select value={form.plan} onChange={set("plan")}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-indigo-500">
              {["BASIC", "PRO", "AGENCY"].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <button type="submit" disabled={saving}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl py-2.5 text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {saving ? "Creando..." : "Crear Tenant"}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── TenantCard ────────────────────────────────────────────────────────────────
function TenantCard({ tenant, onUpdate, onToast }: {
  tenant: Tenant
  onUpdate: () => void
  onToast: (msg: string, type: "ok" | "err") => void
}) {
  const [showNotes, setShowNotes] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [updatingActive, setUpdatingActive] = useState(false)
  const [updatingPlan, setUpdatingPlan] = useState(false)
  const [resetPwd, setResetPwd] = useState<TenantUser | null>(null)
  const [newPwd, setNewPwd] = useState("")
  const [savingPwd, setSavingPwd] = useState(false)
  const [sendCredsUser, setSendCredsUser] = useState<TenantUser | null>(null)
  const [sendCredsPwd, setSendCredsPwd] = useState<string>()
  const [sendingCreds, setSendingCreds] = useState(false)
  const [config, setConfig] = useState({
    notes: tenant.notes ?? "",
    whatsappPhone: tenant.whatsappPhone ?? "",
    whatsappInstance: tenant.whatsappInstance ?? "",
    metaAppId: tenant.metaAppId ?? "",
    anthropicApiKey: tenant.anthropicApiKey ?? "",
    groqApiKey: tenant.groqApiKey ?? "",
    openaiApiKey: tenant.openaiApiKey ?? "",
  })
  const [savingConfig, setSavingConfig] = useState(false)

  async function patch(data: Record<string, unknown>) {
    const res = await fetch("/api/admin/tenants", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId: tenant.id, ...data }),
    })
    return res.ok
  }

  async function toggleActive() {
    setUpdatingActive(true)
    const ok = await patch({ active: !tenant.active })
    if (ok) { onToast(tenant.active ? "Tenant desactivado" : "Tenant activado", "ok"); onUpdate() }
    else onToast("Error al actualizar", "err")
    setUpdatingActive(false)
  }

  async function changePlan(plan: string) {
    setUpdatingPlan(true)
    const ok = await patch({ plan })
    if (ok) { onToast("Plan actualizado: " + plan, "ok"); onUpdate() }
    else onToast("Error al actualizar plan", "err")
    setUpdatingPlan(false)
  }

  async function saveConfig() {
    setSavingConfig(true)
    const ok = await patch(config)
    if (ok) { onToast("Configuración guardada", "ok"); setShowConfig(false); onUpdate() }
    else onToast("Error al guardar", "err")
    setSavingConfig(false)
  }

  async function doResetPwd() {
    if (!resetPwd || !newPwd) return
    setSavingPwd(true)
    const res = await fetch("/api/admin/tenants", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset_password", userId: resetPwd.id, newPassword: newPwd }),
    })
    if (res.ok) { onToast("Contraseña actualizada para " + resetPwd.email, "ok"); setResetPwd(null); setNewPwd("") }
    else onToast("Error al cambiar contraseña", "err")
    setSavingPwd(false)
  }

  async function doSendCreds() {
    if (!sendCredsUser || !sendCredsPwd) return
    setSendingCreds(true)
    const res = await fetch("/api/admin/tenants", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send_credentials", userId: sendCredsUser.id, password: sendCredsPwd, loginUrl: "https://social.conectaai.cl/auth/login" }),
    })
    if (res.ok) { onToast("Credenciales enviadas a " + sendCredsUser.email, "ok"); setSendCredsUser(null); setSendCredsPwd("") }
    else onToast("Error al enviar credenciales", "err")
    setSendingCreds(false)
  }

  const s = tenant.stats ?? { published: 0, scheduled: 0, failed: 0, totalReach: 0, totalLikes: 0 }
  const ig = tenant.socialAccounts.find(a => a.platform === "INSTAGRAM")
  const fb = tenant.socialAccounts.find(a => a.platform === "FACEBOOK")

  return (
    <div className={`rounded-2xl border ${tenant.active ? "border-gray-700/50" : "border-red-900/30 opacity-70"} bg-gray-800/40 backdrop-blur p-5 space-y-4`}>
      {/* Header row */}
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${PLAN_AVATAR[tenant.plan] ?? PLAN_AVATAR.BASIC} flex items-center justify-center text-white font-bold text-xl shrink-0 shadow-lg`}>
          {initials(tenant.name)}
        </div>
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold text-gray-100">{tenant.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${PLAN_BADGE[tenant.plan] ?? PLAN_BADGE.BASIC}`}>{tenant.plan}</span>
            <span className={`flex items-center gap-1 text-xs ${tenant.active ? "text-green-400" : "text-red-400"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${tenant.active ? "bg-green-400 animate-pulse" : "bg-red-500"}`} />
              {tenant.active ? "Activo" : "Inactivo"}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">slug: {tenant.slug} · creado {fmtDate(tenant.createdAt)}</p>
          {tenant.brandVoice && <p className="text-xs text-gray-500">{tenant.brandVoice.industry}</p>}
        </div>
        {/* Plan + Active controls */}
        <div className="flex items-center gap-2 shrink-0">
          <select value={tenant.plan} onChange={e => changePlan(e.target.value)} disabled={updatingPlan}
            className="text-xs bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-gray-300 focus:outline-none focus:border-indigo-500 disabled:opacity-50">
            {["BASIC", "PRO", "AGENCY"].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <button onClick={toggleActive} disabled={updatingActive}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors font-medium ${tenant.active ? "bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/20" : "bg-green-500/20 text-green-300 hover:bg-green-500/30 border border-green-500/20"}`}>
            {updatingActive ? <RefreshCw className="w-3 h-3 animate-spin inline" /> : tenant.active ? "Suspender" : "Activar"}
          </button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {[
          { label: "Publicados", value: s.published, color: "text-green-400" },
          { label: "Programados", value: s.scheduled, color: "text-indigo-400" },
          { label: "Fallidos", value: s.failed, color: "text-red-400" },
          { label: "Posts total", value: tenant._count.posts, color: "text-blue-400" },
          { label: "Media", value: tenant._count.mediaItems, color: "text-teal-400" },
          { label: "Alcance", value: fmt(s.totalReach), color: "text-purple-400" },
        ].map(stat => (
          <div key={stat.label} className="bg-gray-900/60 rounded-xl p-2.5 text-center">
            <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-gray-600">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Users + Social accounts row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Users */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Users className="w-3 h-3" /> Usuarios</p>
          <div className="space-y-1.5">
            {tenant.users.map(u => (
              <div key={u.id} className="flex items-center justify-between bg-gray-900/50 rounded-lg px-3 py-2">
                <div className="min-w-0">
                  <p className="text-xs text-gray-200 font-medium truncate">{u.email}</p>
                  <p className="text-xs text-gray-600">{u.name ?? "—"}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${ROLE_BADGE[u.role] ?? ROLE_BADGE.EDITOR}`}>{u.role}</span>
                  <button onClick={() => setResetPwd(u)} title="Cambiar contraseña"
                    className="p-1 rounded hover:bg-gray-700 text-gray-600 hover:text-yellow-400 transition-colors">
                    <Lock className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Social + Notes */}
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1"><Globe className="w-3 h-3" /> Redes sociales</p>
            <div className="flex gap-2">
              <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium ${ig?.active ? "bg-pink-500/10 border-pink-500/30 text-pink-300" : "bg-gray-800 border-gray-700 text-gray-500"}`}>
                <Instagram className="w-3.5 h-3.5" />
                {ig?.active ? <><CheckCircle2 className="w-3 h-3 text-green-400" />{ig.accountName ?? "Conectado"}</> : <><XCircle className="w-3 h-3" />Sin conectar</>}
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium ${fb?.active ? "bg-blue-500/10 border-blue-500/30 text-blue-300" : "bg-gray-800 border-gray-700 text-gray-500"}`}>
                <Facebook className="w-3.5 h-3.5" />
                {fb?.active ? <><CheckCircle2 className="w-3 h-3 text-green-400" />{fb.accountName ?? "Conectado"}</> : <><XCircle className="w-3 h-3" />Sin conectar</>}
              </div>
            </div>
          </div>

          {/* WhatsApp */}
          {tenant.whatsappPhone && (
            <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-900/50 rounded-lg px-3 py-2">
              <Smartphone className="w-3.5 h-3.5 text-green-400 shrink-0" />
              <span className="text-gray-300 font-mono">{tenant.whatsappPhone}</span>
              <span className="text-gray-600">({tenant.whatsappInstance ?? "—"})</span>
            </div>
          )}
        </div>
      </div>

      {/* Credentials notes */}
      {tenant.notes && (
        <div className="border border-yellow-500/20 bg-yellow-500/5 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-yellow-400 flex items-center gap-1"><Key className="w-3 h-3" /> Credenciales</span>
            <div className="flex items-center gap-1">
              <CopyBtn text={tenant.notes} />
              <button onClick={() => setShowNotes(!showNotes)} className="p-1 rounded hover:bg-gray-700 transition-colors text-gray-500 hover:text-gray-300">
                {showNotes ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          {showNotes ? (
            <pre className="text-xs font-mono text-yellow-300/80 whitespace-pre-wrap break-all">{tenant.notes}</pre>
          ) : (
            <p className="text-xs text-gray-600">••••••••••••••• <span className="text-gray-500">(click ojo para ver)</span></p>
          )}
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-gray-700/50">
        <button onClick={() => setShowConfig(!showConfig)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gray-700/60 hover:bg-gray-700 text-gray-300 transition-colors border border-gray-700">
          <Settings className="w-3 h-3" />
          {showConfig ? "Cerrar config" : "Editar config"}
          {showConfig ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        <span className="text-xs text-gray-600 ml-auto">{tenant._count.posts} posts · {fmt(s.totalLikes)} likes</span>
      </div>

      {/* Edit config inline */}
      {showConfig && (
        <div className="border border-indigo-500/20 bg-indigo-500/5 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Configuración del tenant</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1"><Smartphone className="w-3 h-3" /> WhatsApp Phone</label>
              <input value={config.whatsappPhone} onChange={e => setConfig(c => ({ ...c, whatsappPhone: e.target.value }))}
                placeholder="56912345678" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">WA Instancia</label>
              <input value={config.whatsappInstance} onChange={e => setConfig(c => ({ ...c, whatsappInstance: e.target.value }))}
                placeholder="social" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1"><Globe className="w-3 h-3" /> Meta App ID</label>
              <input value={config.metaAppId} onChange={e => setConfig(c => ({ ...c, metaAppId: e.target.value }))}
                placeholder="990865383365554" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1"><Zap className="w-3 h-3" /> Groq API Key</label>
              <div className="flex gap-1">
                <input value={config.groqApiKey} onChange={e => setConfig(c => ({ ...c, groqApiKey: e.target.value }))}
                  placeholder="gsk_..." className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-500" />
                {config.groqApiKey && <CopyBtn text={config.groqApiKey} />}
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Anthropic API Key</label>
              <div className="flex gap-1">
                <input value={config.anthropicApiKey} onChange={e => setConfig(c => ({ ...c, anthropicApiKey: e.target.value }))}
                  placeholder="sk-ant-..." className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-500" />
                {config.anthropicApiKey && <CopyBtn text={config.anthropicApiKey} />}
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">OpenAI API Key</label>
              <div className="flex gap-1">
                <input value={config.openaiApiKey} onChange={e => setConfig(c => ({ ...c, openaiApiKey: e.target.value }))}
                  placeholder="sk-..." className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-indigo-500" />
                {config.openaiApiKey && <CopyBtn text={config.openaiApiKey} />}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1"><Key className="w-3 h-3" /> Notas / Credenciales (solo visible para SuperAdmin)</label>
            <textarea value={config.notes} onChange={e => setConfig(c => ({ ...c, notes: e.target.value }))} rows={3}
              placeholder="email@ejemplo.cl / contraseña123&#10;Notas privadas del tenant..."
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 font-mono focus:outline-none focus:border-indigo-500 resize-none" />
          </div>
          <button onClick={saveConfig} disabled={savingConfig}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl px-4 py-2 text-xs font-semibold transition-all disabled:opacity-50">
            {savingConfig ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            {savingConfig ? "Guardando..." : "Guardar configuración"}
          </button>
        </div>
      )}

      {/* Reset password modal inline */}
      {resetPwd && (
        <div className="border border-orange-500/20 bg-orange-500/5 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-orange-400 flex items-center gap-1"><Lock className="w-3 h-3" /> Cambiar contraseña — {resetPwd.email}</p>
          <div className="flex gap-2">
            <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Nueva contraseña (mín. 6 chars)"
              className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-orange-500" />
            <button onClick={doResetPwd} disabled={savingPwd || newPwd.length < 6}
              className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/30 rounded-lg px-3 py-2 text-xs font-medium disabled:opacity-40">
              {savingPwd ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Cambiar"}
            </button>
            <button onClick={() => { setResetPwd(null); setNewPwd("") }} className="text-gray-500 hover:text-gray-300 text-lg leading-none px-2">×</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [search, setSearch] = useState("")

  function toast(msg: string, type: "ok" | "err" = "ok") {
    const id = Date.now()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/tenants")
      if (res.ok) { const d = await res.json(); setTenants(d.tenants ?? []) }
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = tenants.filter(t =>
    search === "" ||
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.slug.includes(search.toLowerCase()) ||
    t.users.some(u => u.email.toLowerCase().includes(search.toLowerCase()))
  )

  const totalPosts = tenants.reduce((a, t) => a + t._count.posts, 0)
  const totalReach = tenants.reduce((a, t) => a + (t.stats?.totalReach ?? 0), 0)
  const active = tenants.filter(t => t.active).length

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Crown className="w-7 h-7 text-yellow-400" />
            <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">SuperAdmin</span>
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Control total de la plataforma · {tenants.length} tenants</p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl px-4 py-2.5 text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20">
          <Plus className="w-4 h-4" /> Nuevo Tenant
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Tenants", value: tenants.length, icon: Building2, color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
          { label: "Activos", value: active, icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" },
          { label: "Posts publicados", value: fmt(totalPosts), icon: BarChart3, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
          { label: "Alcance total", value: fmt(totalReach), icon: TrendingUp, color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20" },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border ${s.border} ${s.bg} backdrop-blur p-4 flex items-center gap-3`}>
            <div className={`${s.bg} border ${s.border} p-2.5 rounded-xl`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
            <div><p className="text-xl font-bold text-gray-100">{s.value}</p><p className="text-xs text-gray-500">{s.label}</p></div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, slug o email..."
          className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
        {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">×</button>}
      </div>

      {/* Tenant list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="rounded-2xl border border-gray-700/50 bg-gray-800/40 p-5 animate-pulse">
              <div className="flex gap-4"><div className="w-14 h-14 bg-gray-700 rounded-2xl" /><div className="flex-1 space-y-2"><div className="h-4 bg-gray-700 rounded w-40" /><div className="h-3 bg-gray-800 rounded w-60" /></div></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(t => (
            <TenantCard key={t.id} tenant={t} onUpdate={load} onToast={toast} />
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-600">No se encontraron tenants</div>
          )}
        </div>
      )}

      {showNew && (
        <NewTenantModal
          onClose={() => setShowNew(false)}
          onCreated={(msg) => { toast(msg, msg.startsWith("Error") ? "err" : "ok"); if (!msg.startsWith("Error")) load() }}
        />
      )}
      <Toasts toasts={toasts} />
    </div>
  )
}

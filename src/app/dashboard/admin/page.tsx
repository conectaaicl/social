"use client"

import { useEffect, useState } from "react"
import { Building2, Users, BarChart3, RefreshCw, CheckCircle, XCircle, Crown } from "lucide-react"

interface TenantStat {
  published: number
  scheduled: number
  totalReach: number
}

interface TenantUser {
  email: string
  name: string | null
  role: string
}

interface BrandVoice {
  industry: string
  description: string
}

interface Tenant {
  id: string
  name: string
  plan: string
  active: boolean
  createdAt: string
  users: TenantUser[]
  brandVoice: BrandVoice | null
  _count: { posts: number; socialAccounts: number }
  stats: TenantStat
}

const PLAN_COLORS: Record<string, string> = {
  FREE: "bg-gray-700 text-gray-300",
  STARTER: "bg-blue-500/20 text-blue-300",
  PRO: "bg-indigo-500/20 text-indigo-300",
  AGENCY: "bg-purple-500/20 text-purple-300",
}

export default function AdminPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch("/api/admin/tenants")
    const data = await res.json()
    setTenants(data.tenants ?? [])
    setLoading(false)
  }

  async function updateTenant(tenantId: string, patch: { active?: boolean; plan?: string }) {
    setUpdating(tenantId)
    await fetch("/api/admin/tenants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId, ...patch }),
    })
    await load()
    setUpdating(null)
  }

  useEffect(() => { load() }, [])

  const totalReach = tenants.reduce((a, t) => a + (t.stats?.totalReach ?? 0), 0)
  const activeTenants = tenants.filter((t) => t.active).length

  return (
    <div className="p-8 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-semibold text-gray-100 flex items-center gap-2">
          <Crown className="w-6 h-6 text-yellow-400" /> Panel Superadmin
        </h1>
        <p className="text-gray-500 mt-0.5 text-sm">Gestión de todos los tenants de la plataforma</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total tenants", value: tenants.length, icon: Building2, color: "text-indigo-400" },
          { label: "Activos", value: activeTenants, icon: CheckCircle, color: "text-green-400" },
          { label: "Total posts", value: tenants.reduce((a, t) => a + t._count.posts, 0), icon: BarChart3, color: "text-blue-400" },
          { label: "Alcance total", value: totalReach.toLocaleString(), icon: Users, color: "text-purple-400" },
        ].map((stat) => (
          <div key={stat.label} className="card p-4">
            <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
            <p className="text-2xl font-bold text-gray-100">{stat.value}</p>
            <p className="text-xs text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Tenants list */}
      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin" /> Cargando tenants…
        </div>
      ) : (
        <div className="space-y-3">
          {tenants.map((t) => (
            <div key={t.id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-gray-200">{t.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${PLAN_COLORS[t.plan] ?? "bg-gray-700 text-gray-300"}`}>
                      {t.plan}
                    </span>
                    {t.active ? (
                      <span className="flex items-center gap-1 text-xs text-green-400">
                        <CheckCircle className="w-3 h-3" /> Activo
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-red-400">
                        <XCircle className="w-3 h-3" /> Inactivo
                      </span>
                    )}
                  </div>

                  {t.brandVoice && (
                    <p className="text-xs text-gray-500 mb-2">{t.brandVoice.industry} · {t.brandVoice.description?.slice(0, 80)}</p>
                  )}

                  <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                    <span>Posts: <span className="text-gray-300">{t._count.posts}</span></span>
                    <span>Publicados: <span className="text-gray-300">{t.stats?.published ?? 0}</span></span>
                    <span>Programados: <span className="text-gray-300">{t.stats?.scheduled ?? 0}</span></span>
                    <span>Cuentas: <span className="text-gray-300">{t._count.socialAccounts}</span></span>
                    <span>Alcance: <span className="text-gray-300">{(t.stats?.totalReach ?? 0).toLocaleString()}</span></span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1">
                    {t.users.map((u) => (
                      <span key={u.email} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">
                        {u.email} ({u.role})
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() => updateTenant(t.id, { active: !t.active })}
                    disabled={updating === t.id}
                    className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                      t.active
                        ? "bg-red-500/20 text-red-300 hover:bg-red-500/30"
                        : "bg-green-500/20 text-green-300 hover:bg-green-500/30"
                    }`}
                  >
                    {updating === t.id ? <RefreshCw className="w-3 h-3 animate-spin inline" /> : t.active ? "Desactivar" : "Activar"}
                  </button>
                  <select
                    defaultValue={t.plan}
                    onChange={(e) => updateTenant(t.id, { plan: e.target.value })}
                    className="text-xs bg-gray-800 text-gray-300 border border-gray-700 rounded-lg px-2 py-1.5"
                  >
                    {["FREE", "STARTER", "PRO", "AGENCY"].map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

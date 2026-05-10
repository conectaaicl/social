"use client"

import { useEffect, useState, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Instagram, Facebook, Link2, Trash2, RefreshCw, CheckCircle2, AlertTriangle, Plus, Music2, Linkedin, Youtube } from "lucide-react"

interface SocialAccount {
  id: string
  platform: "INSTAGRAM" | "FACEBOOK" | "TIKTOK" | "LINKEDIN" | "YOUTUBE" | "PINTEREST" | "THREADS" | "GOOGLE_BUSINESS"
  accountId: string
  accountName: string
  pageId: string | null
  openId: string | null
  active: boolean
  tokenExpiresAt: string | null
  createdAt: string
}

const PLATFORM_CONFIG = {
  INSTAGRAM:       { label: "Instagram",          icon: Instagram, connectUrl: "/api/social/connect",                    iconClass: "text-pink-400",   color: "pink-400"   },
  FACEBOOK:        { label: "Facebook",            icon: Facebook,  connectUrl: "/api/social/connect",                    iconClass: "text-blue-400",   color: "blue-400"   },
  TIKTOK:          { label: "TikTok",              icon: Music2,    connectUrl: "/api/social/tiktok/connect",             iconClass: "text-red-400",    color: "red-400"    },
  LINKEDIN:        { label: "LinkedIn",            icon: Linkedin,  connectUrl: "/api/social/linkedin/connect",           iconClass: "text-sky-400",    color: "sky-400"    },
  YOUTUBE:         { label: "YouTube",             icon: Youtube,   connectUrl: "/api/social/youtube/connect",            iconClass: "text-rose-400",   color: "rose-400"   },
  PINTEREST:       { label: "Pinterest",           icon: Link2,     connectUrl: "/api/social/pinterest/connect",          iconClass: "text-red-500",    color: "red-500"    },
  THREADS:         { label: "Threads",             icon: Link2,     connectUrl: "/api/social/threads/connect",            iconClass: "text-gray-300",   color: "gray-300"   },
  GOOGLE_BUSINESS: { label: "Google Business",    icon: Link2,     connectUrl: "/api/social/google-business/connect",    iconClass: "text-yellow-400", color: "yellow-400" },
}

function PlatformIcon({ platform }: { platform: string }) {
  const cfg = PLATFORM_CONFIG[platform as keyof typeof PLATFORM_CONFIG]
  if (!cfg) return <Link2 className="w-5 h-5 text-gray-400" />
  const Icon = cfg.icon
  return <Icon className={`w-5 h-5 ${cfg.iconClass}`} />
}

function TokenStatus({ expiresAt }: { expiresAt: string | null }) {
  if (!expiresAt) return <span className="text-green-400 text-xs">Token permanente</span>
  const daysLeft = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (daysLeft < 0) return <span className="text-red-400 text-xs flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Token expirado</span>
  if (daysLeft < 10) return <span className="text-yellow-400 text-xs flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Expira en {daysLeft}d</span>
  return <span className="text-green-400 text-xs">Expira en {daysLeft} dias</span>
}

function AccountsContent() {
  const searchParams = useSearchParams()
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState<string | null>(null)
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null)

  const fetchAccounts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/social/accounts")
      const data = await res.json()
      setAccounts(data.accounts ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAccounts()
    const success = searchParams.get("success")
    const error = searchParams.get("error")
    if (success) setBanner({ type: "success", message: "Cuenta conectada exitosamente" })
    if (error === "cancelled") setBanner({ type: "error", message: "La conexion fue cancelada" })
    else if (error) setBanner({ type: "error", message: decodeURIComponent(error) })
  }, [fetchAccounts, searchParams])

  async function handleDelete(id: string) {
    if (!confirm("Desconectar esta cuenta?")) return
    setDeleting(id)
    try {
      await fetch("/api/social/accounts?id=" + id, { method: "DELETE" })
      setAccounts((a) => a.filter((ac) => ac.id !== id))
      setBanner({ type: "success", message: "Cuenta desconectada" })
    } finally {
      setDeleting(null)
    }
  }

  async function handleRefresh(id: string) {
    setRefreshing(id)
    try {
      const res = await fetch("/api/social/accounts/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setBanner({ type: "success", message: data.message ?? "Token renovado" })
      fetchAccounts()
    } catch (err: any) {
      setBanner({ type: "error", message: err.message })
    } finally {
      setRefreshing(null)
    }
  }

  const SECTIONS: Array<keyof typeof PLATFORM_CONFIG> = ["INSTAGRAM", "FACEBOOK", "TIKTOK", "LINKEDIN", "YOUTUBE", "PINTEREST", "THREADS", "GOOGLE_BUSINESS"]

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-100">Cuentas conectadas</h1>
        <p className="text-gray-500 mt-1 text-sm">Conecta tus redes sociales para publicar automaticamente</p>
      </div>

      {banner && (
        <div className={"mb-6 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm " + (banner.type === "success" ? "bg-green-500/10 border-green-500/20 text-green-300" : "bg-red-500/10 border-red-500/20 text-red-300")}>
          {banner.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          {banner.message}
          <button onClick={() => setBanner(null)} className="ml-auto text-gray-500 hover:text-gray-300">x</button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" /></div>
      ) : (
        <div className="space-y-6">
          {SECTIONS.map((key) => {
            const cfg = PLATFORM_CONFIG[key]
            const items = accounts.filter((a) => a.platform === key)
            return (
              <div key={key} className="card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className={`text-sm font-semibold flex items-center gap-2 text-${cfg.color}`}>
                    <PlatformIcon platform={key} />
                    {cfg.label}
                    <span className="text-gray-600 font-normal">({items.length} cuenta{items.length !== 1 ? "s" : ""})</span>
                  </h2>
                  <button
                    onClick={() => (window.location.href = cfg.connectUrl)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/20 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Conectar {cfg.label}
                  </button>
                </div>

                {items.length === 0 ? (
                  <div className="border border-dashed border-gray-700 rounded-xl p-6 text-center">
                    <p className="text-gray-500 text-sm mb-3">No hay cuentas de {cfg.label} conectadas</p>
                    <button
                      onClick={() => (window.location.href = cfg.connectUrl)}
                      className="inline-flex items-center gap-2 btn-primary text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Conectar {cfg.label}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {items.map((account) => (
                      <div key={account.id} className="flex items-center justify-between bg-gray-800/50 rounded-xl px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-gray-800 rounded-full flex items-center justify-center">
                            <PlatformIcon platform={account.platform} />
                          </div>
                          <div>
                            <p className="text-gray-100 font-medium text-sm">{account.accountName}</p>
                            <p className="text-gray-500 text-xs">{account.openId ?? account.accountId}</p>
                            <TokenStatus expiresAt={account.tokenExpiresAt} />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {account.active ? (
                            <span className="text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full">Activa</span>
                          ) : (
                            <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full">Inactiva</span>
                          )}
                          {(account.platform === "INSTAGRAM" || account.platform === "FACEBOOK") && (
                            <button
                              onClick={() => handleRefresh(account.id)}
                              disabled={refreshing === account.id}
                              title="Renovar token por 60 dias"
                              className="p-1.5 rounded-lg text-gray-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                            >
                              <RefreshCw className={"w-4 h-4" + (refreshing === account.id ? " animate-spin" : "")} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(account.id)}
                            disabled={deleting === account.id}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            {deleting === account.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-8 card border-gray-800 bg-gray-900/50">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Requisitos para conectar</h3>
        <div className="grid gap-3 text-xs text-gray-500">
          <div>
            <p className="text-gray-400 font-medium mb-1">Instagram & Facebook</p>
            <p>Necesitas una pagina de Facebook y una cuenta Business o Creator de Instagram vinculada a ella.</p>
          </div>
          <div>
            <p className="text-gray-400 font-medium mb-1">TikTok</p>
            <p>Cuenta TikTok Business o Creator. Se requieren credenciales de app en developers.tiktok.com.</p>
          </div>
          <div>
            <p className="text-gray-400 font-medium mb-1">LinkedIn</p>
            <p>Cuenta LinkedIn. Se requiere app en LinkedIn Developer Portal con permisos w_member_social.</p>
          </div>
          <div>
            <p className="text-gray-400 font-medium mb-1">YouTube (Shorts)</p>
            <p>Canal de YouTube. Solo se publican Reels/videos como YouTube Shorts. Requiere app en Google Cloud Console.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AccountsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" /></div>}>
      <AccountsContent />
    </Suspense>
  )
}

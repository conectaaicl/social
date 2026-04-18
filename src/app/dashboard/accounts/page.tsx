"use client"

import { useEffect, useState, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { Instagram, Facebook, Link2, Trash2, RefreshCw, CheckCircle2, AlertTriangle, Plus } from "lucide-react"

interface SocialAccount {
  id: string
  platform: "INSTAGRAM" | "FACEBOOK"
  accountId: string
  accountName: string
  pageId: string | null
  active: boolean
  tokenExpiresAt: string | null
  createdAt: string
}

function PlatformIcon({ platform }: { platform: string }) {
  if (platform === "INSTAGRAM") return <Instagram className="w-5 h-5 text-pink-400" />
  return <Facebook className="w-5 h-5 text-blue-400" />
}

function TokenStatus({ expiresAt }: { expiresAt: string | null }) {
  if (!expiresAt) return <span className="text-green-400 text-xs">Token permanente</span>
  const daysLeft = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (daysLeft < 0) return <span className="text-red-400 text-xs flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Token expirado</span>
  if (daysLeft < 10) return <span className="text-yellow-400 text-xs flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Expira en {daysLeft}d</span>
  return <span className="text-green-400 text-xs">Expira en {daysLeft} días</span>
}

export default function AccountsPage() {
  const searchParams = useSearchParams()
  const [accounts, setAccounts] = useState<SocialAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
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
    if (success) setBanner({ type: "success", message: `${success} cuenta(s) conectada(s) exitosamente` })
    if (error === "cancelled") setBanner({ type: "error", message: "La conexión fue cancelada" })
    else if (error) setBanner({ type: "error", message: decodeURIComponent(error) })
  }, [fetchAccounts, searchParams])

  async function handleDelete(id: string) {
    if (!confirm("¿Desconectar esta cuenta? Los posts programados no podrán publicarse.")) return
    setDeleting(id)
    try {
      await fetch(`/api/social/accounts?id=${id}`, { method: "DELETE" })
      setAccounts((a) => a.filter((ac) => ac.id !== id))
      setBanner({ type: "success", message: "Cuenta desconectada" })
    } finally {
      setDeleting(null)
    }
  }

  const igAccounts = accounts.filter((a) => a.platform === "INSTAGRAM")
  const fbAccounts = accounts.filter((a) => a.platform === "FACEBOOK")

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-100">Cuentas conectadas</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Conecta tu Instagram y Facebook para publicar automáticamente
          </p>
        </div>
        <button
          onClick={() => (window.location.href = "/api/social/connect")}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Conectar cuenta
        </button>
      </div>

      {banner && (
        <div
          className={`mb-6 px-4 py-3 rounded-lg border text-sm flex items-center gap-2 ${
            banner.type === "success"
              ? "bg-green-500/10 border-green-500/20 text-green-400"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}
        >
          {banner.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {banner.message}
          <button onClick={() => setBanner(null)} className="ml-auto opacity-60 hover:opacity-100">×</button>
        </div>
      )}

      {loading ? (
        <div className="card flex items-center justify-center py-16">
          <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="card text-center py-16">
          <Link2 className="w-10 h-10 text-gray-600 mx-auto mb-4" />
          <h3 className="text-gray-300 font-medium mb-2">Sin cuentas conectadas</h3>
          <p className="text-gray-500 text-sm mb-6">
            Conecta tu cuenta de Facebook para vincular Instagram y Facebook automáticamente
          </p>
          <button
            onClick={() => (window.location.href = "/api/social/connect")}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Conectar con Facebook
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {[
            { label: "Instagram", items: igAccounts, icon: Instagram, color: "pink" },
            { label: "Facebook", items: fbAccounts, icon: Facebook, color: "blue" },
          ].map(({ label, items, icon: Icon, color }) => (
            <div key={label}>
              <h2 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                <Icon className={`w-4 h-4 text-${color}-400`} />
                {label} ({items.length})
              </h2>
              {items.length === 0 ? (
                <div className="card border-dashed text-sm text-gray-500 py-4 text-center">
                  Sin cuenta de {label}
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map((account) => (
                    <div key={account.id} className="card flex items-center justify-between py-4 px-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center">
                          <PlatformIcon platform={account.platform} />
                        </div>
                        <div>
                          <p className="text-gray-100 font-medium text-sm">{account.accountName}</p>
                          <p className="text-gray-500 text-xs">ID: {account.accountId}</p>
                          <TokenStatus expiresAt={account.tokenExpiresAt} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {account.active ? (
                          <span className="badge-published">Activa</span>
                        ) : (
                          <span className="badge-failed">Inactiva</span>
                        )}
                        <button
                          onClick={() => handleDelete(account.id)}
                          disabled={deleting === account.id}
                          className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          {deleting === account.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 card border-gray-800 bg-gray-900/50">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Cómo funciona la conexión</h3>
        <ol className="space-y-2 text-sm text-gray-500">
          <li className="flex items-start gap-2"><span className="text-indigo-400 font-medium shrink-0">1.</span> Haz clic en "Conectar cuenta" — te redirigirá a Facebook</li>
          <li className="flex items-start gap-2"><span className="text-indigo-400 font-medium shrink-0">2.</span> Autoriza el acceso a tu página de Facebook e Instagram Business</li>
          <li className="flex items-start gap-2"><span className="text-indigo-400 font-medium shrink-0">3.</span> El sistema conectará ambas plataformas automáticamente</li>
          <li className="flex items-start gap-2"><span className="text-indigo-400 font-medium shrink-0">4.</span> Instagram debe ser una cuenta Business o Creator vinculada a la página</li>
        </ol>
      </div>
    </div>
  )
}

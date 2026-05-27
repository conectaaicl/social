"use client"
import { useState, useEffect, useCallback } from "react"
import { CheckCircle, XCircle, Clock, Send, RefreshCw, ExternalLink } from "lucide-react"

type ApprovalStatus = "pending" | "approved" | "rejected" | "expired"

type PostApproval = {
  id: string
  token: string
  status: string
  approverEmail: string
  comment?: string
  expiresAt: string
  requestedAt: string
  post: {
    id: string
    caption: string
    thumbnailUrl?: string
    mediaUrls: string[]
    type: string
    scheduledAt: string
    platform: string[]
  }
}

const STATUS_COLOR: Record<string, string> = {
  pending: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  approved: "text-green-400 bg-green-400/10 border-green-400/20",
  rejected: "text-red-400 bg-red-400/10 border-red-400/20",
  expired: "text-gray-400 bg-gray-400/10 border-gray-400/20",
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
  expired: "Expirado",
}

const STATUS_ICON: Record<string, typeof Clock> = {
  pending: Clock,
  approved: CheckCircle,
  rejected: XCircle,
  expired: XCircle,
}

export default function AprobacionesPage() {
  const [approvals, setApprovals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("ALL")
  const [sending, setSending] = useState<string | null>(null)
  const [newEmail, setNewEmail] = useState("")
  const [sendTarget, setSendTarget] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/approvals")
      if (res.ok) {
        const data = await res.json()
        setApprovals(data.approvals ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function resend(postId: string, email: string) {
    setSending(postId)
    try {
      const res = await fetch(`/api/posts/${postId}/approval`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approverEmail: email }),
      })
      if (res.ok) {
        await load()
        setSendTarget(null)
        setNewEmail("")
      }
    } finally {
      setSending(null)
    }
  }

  const filtered = filter === "ALL" ? approvals : approvals.filter(a => a.status === filter)

  const counts: Record<string, number> = {
    ALL: approvals.length,
    pending: approvals.filter(a => a.status === "pending").length,
    approved: approvals.filter(a => a.status === "approved").length,
    rejected: approvals.filter(a => a.status === "rejected").length,
    expired: approvals.filter(a => a.status === "expired").length,
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Aprobaciones de Contenido</h1>
          <p className="text-gray-400 text-sm mt-1">Gestiona el flujo de aprobacion con clientes</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-gray-300 transition border border-white/10">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Actualizar
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(["ALL", "pending", "approved", "rejected", "expired"] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={"px-4 py-2 rounded-lg text-sm font-medium transition border " +
              (filter === s
                ? "bg-indigo-600/20 border-indigo-500/30 text-indigo-300"
                : "bg-white/5 border-white/10 text-gray-400 hover:text-gray-200")}>
            {s === "ALL" ? "Todas" : STATUS_LABEL[s]}
            <span className="ml-2 text-xs opacity-70">({counts[s] ?? 0})</span>
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-500">
          <RefreshCw size={20} className="animate-spin mr-2" />
          Cargando...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <CheckCircle size={40} className="mx-auto mb-3 opacity-30" />
          <p>No hay aprobaciones en esta categoria</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(approval => {
            const Icon = STATUS_ICON[approval.status]
            const expired = new Date(approval.expiresAt) < new Date()
            return (
              <div key={approval.id} className="bg-white/5 border border-white/10 rounded-xl p-5">
                <div className="flex gap-4">
                  {/* Image */}
                  {approval.post.thumbnailUrl || approval.post.mediaUrls[0] && (
                    <img src={approval.post.thumbnailUrl || approval.post.mediaUrls[0]} alt="" className="w-20 h-20 rounded-lg object-cover shrink-0 bg-white/5" />
                  )}
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="text-sm text-gray-200 line-clamp-2">{approval.post.caption}</p>
                      <span className={"flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium shrink-0 " + STATUS_COLOR[approval.status]}>
                        <Icon size={11} />
                        {STATUS_LABEL[approval.status]}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-3">
                      <span>Plataformas: {approval.post.platform.join(", ")}</span>
                      <span>Tipo: {approval.post.type}</span>
                      <span>Programado: {new Date(approval.post.scheduledAt).toLocaleDateString("es-CL")}</span>
                      <span>Aprobador: {approval.approverEmail}</span>
                      {expired && approval.status === "pending" && (
                        <span className="text-red-400">Enlace expirado</span>
                      )}
                    </div>

                    {approval.comment && (
                      <div className="bg-white/5 rounded-lg px-3 py-2 text-xs text-gray-300 mb-3">
                        <span className="text-gray-500 mr-1">Comentario:</span>
                        {approval.comment}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      {/* Open approval link */}
                      <a href={"/aprobar/" + approval.token} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-gray-400 hover:text-gray-200 transition border border-white/10">
                        <ExternalLink size={11} />
                        Ver enlace
                      </a>

                      {/* Resend / send to new email */}
                      {sendTarget === approval.post.id ? (
                        <div className="flex items-center gap-2">
                          <input value={newEmail} onChange={e => setNewEmail(e.target.value)}
                            placeholder="nuevo@email.com"
                            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500 w-44" />
                          <button onClick={() => resend(approval.post.id, newEmail || approval.approverEmail)}
                            disabled={sending === approval.post.id}
                            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs text-white transition">
                            <Send size={11} />
                            {sending === approval.post.id ? "Enviando..." : "Enviar"}
                          </button>
                          <button onClick={() => setSendTarget(null)} className="text-xs text-gray-500 hover:text-gray-300">Cancelar</button>
                        </div>
                      ) : (
                        <button onClick={() => setSendTarget(approval.post.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 rounded-lg text-xs text-indigo-300 transition border border-indigo-500/20">
                          <Send size={11} />
                          Reenviar solicitud
                        </button>
                      )}
                    </div>
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

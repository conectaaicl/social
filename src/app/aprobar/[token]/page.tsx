"use client"
import { useState, useEffect } from "react"
import { CheckCircle, XCircle, Loader2, Clock } from "lucide-react"
import { useParams } from "next/navigation"

type Approval = {
  id: string; status: string; expiresAt: string; post: {
    caption: string; hashtags: string; mediaUrls: string[]; type: string; platform: string[]; scheduledAt: string
  }
}

export default function ApprovalPage() {
  const params = useParams()
  const token = params?.token as string
  const [data, setData] = useState<Approval | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState(false)
  const [done, setDone] = useState<"approved" | "rejected" | null>(null)
  const [comment, setComment] = useState("")

  useEffect(() => {
    if (!token) return
    fetch(`/api/approve/${token}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d) })
      .catch(() => setError("Error al cargar"))
      .finally(() => setLoading(false))
  }, [token])

  async function respond(action: "approve" | "reject") {
    setResponding(true)
    try {
      const r = await fetch(`/api/approve/${token}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, comment }),
      })
      const d = await r.json()
      if (d.ok) setDone(action === "approve" ? "approved" : "rejected")
      else setError(d.error ?? "Error")
    } finally { setResponding(false) }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <Loader2 className="animate-spin text-white/40" size={32} />
    </div>
  )

  if (done) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="text-center">
        {done === "approved"
          ? <><CheckCircle size={48} className="text-green-400 mx-auto mb-4" /><h2 className="text-2xl font-bold text-white">Post aprobado</h2><p className="text-white/40 mt-2">El post quedará programado para publicarse automáticamente.</p></>
          : <><XCircle size={48} className="text-red-400 mx-auto mb-4" /><h2 className="text-2xl font-bold text-white">Post rechazado</h2><p className="text-white/40 mt-2">Se notificará al equipo para que realice los ajustes.</p></>
        }
      </div>
    </div>
  )

  if (error || !data) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="text-center">
        <XCircle size={48} className="text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white">{error || "Enlace inválido"}</h2>
      </div>
    </div>
  )

  const post = data.post
  const scheduled = new Date(post.scheduledAt).toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })
  const alreadyResponded = data.status !== "pending"

  return (
    <div className="min-h-screen bg-gray-950 p-4">
      <div className="max-w-lg mx-auto py-8">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl">📋</div>
          <h1 className="text-2xl font-bold text-white">Revisión de post</h1>
          <p className="text-white/40 text-sm mt-1">Revisa el contenido y aprueba o rechaza</p>
          <div className="flex items-center justify-center gap-1 mt-2 text-xs text-white/25">
            <Clock size={10} />
            Programado: {scheduled}
          </div>
        </div>

        {post.mediaUrls?.[0] && (
          <img src={post.mediaUrls[0]} alt="" className="w-full rounded-2xl mb-4 max-h-80 object-cover" />
        )}

        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
          <p className="text-sm text-white/80 leading-relaxed whitespace-pre-line">{post.caption}</p>
          {post.hashtags && <p className="text-xs text-indigo-400 mt-2">{post.hashtags}</p>}
        </div>

        <div className="flex gap-2 flex-wrap mb-4">
          <span className="px-2 py-1 bg-white/5 rounded text-xs text-white/40">{post.type}</span>
          {post.platform?.map(p => <span key={p} className="px-2 py-1 bg-white/5 rounded text-xs text-white/40">{p}</span>)}
        </div>

        {alreadyResponded ? (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-center">
            <p className="text-yellow-400 font-medium">Ya has respondido: {data.status}</p>
          </div>
        ) : (
          <>
            <textarea value={comment} onChange={e => setComment(e.target.value)}
              placeholder="Comentario opcional (cambios sugeridos, motivo del rechazo...)"
              rows={3} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-indigo-500 mb-4 resize-none" />

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => respond("reject")} disabled={responding}
                className="flex items-center justify-center gap-2 py-3 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 rounded-xl text-red-400 font-semibold transition disabled:opacity-50">
                <XCircle size={16} /> Rechazar
              </button>
              <button onClick={() => respond("approve")} disabled={responding}
                className="flex items-center justify-center gap-2 py-3 bg-green-500 hover:bg-green-400 rounded-xl text-white font-semibold transition disabled:opacity-50">
                {responding ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                Aprobar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

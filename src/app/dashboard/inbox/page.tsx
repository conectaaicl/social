"use client"
import { useState, useEffect, useCallback } from "react"
import { MessageSquare, Hash, Filter, RefreshCw, ExternalLink, ThumbsUp, ThumbsDown, Minus } from "lucide-react"

type InboxItem = {
  id: string
  type: "comment" | "mention"
  from: string
  text: string
  platform: string[]
  postId: string
  postCaption?: string | null
  postImage?: string | null
  replied: boolean
  sentiment: string | null
  date: string
}

function SentimentBadge({ s }: { s: string | null }) {
  if (!s || s === "neutral") return <Minus size={12} className="text-white/20" />
  if (s === "positive") return <ThumbsUp size={12} className="text-green-400" />
  return <ThumbsDown size={12} className="text-red-400" />
}

function PlatformDot({ platform }: { platform: string[] }) {
  const p = platform?.[0]?.toLowerCase() ?? "instagram"
  const colors: Record<string, string> = { instagram: "bg-pink-500", facebook: "bg-blue-500", tiktok: "bg-gray-300" }
  return <span className={`w-2 h-2 rounded-full shrink-0 ${colors[p] ?? "bg-gray-500"}`} />
}

export default function InboxPage() {
  const [items, setItems] = useState<InboxItem[]>([])
  const [filter, setFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [unreplied, setUnreplied] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/inbox?filter=${filter}`)
      const d = await r.json()
      setItems(d.items ?? [])
      setUnreplied(d.unrepliedCount ?? 0)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { load() }, [load])

  async function markReplied(id: string) {
    await fetch(`/api/comments/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ replied: true }) })
    setItems(prev => prev.map(i => i.id === id ? { ...i, replied: true } : i))
    setUnreplied(n => Math.max(0, n - 1))
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            Inbox
            {unreplied > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreplied}</span>
            )}
          </h1>
          <p className="text-white/40 text-sm mt-1">Comentarios y menciones en tus redes sociales</p>
        </div>
        <button onClick={load} className="p-2 text-white/40 hover:text-white transition">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {[
          { id: "all", label: "Todo" },
          { id: "unreplied", label: `Sin responder${unreplied > 0 ? ` (${unreplied})` : ""}` },
          { id: "comments", label: "Comentarios" },
          { id: "mentions", label: "Menciones" },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-lg text-sm transition ${filter === f.id ? "bg-indigo-600 text-white" : "bg-white/5 text-white/50 hover:text-white"}`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-white/30">Cargando...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-white/30">
          <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
          <p>No hay mensajes en esta vista</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id} className={`bg-white/5 border rounded-xl p-4 transition ${item.replied ? "border-white/5 opacity-60" : "border-white/10"}`}>
              <div className="flex items-start gap-3">
                <PlatformDot platform={item.platform} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-white/80">
                      {item.type === "comment" ? <MessageSquare size={10} className="inline mr-1" /> : <Hash size={10} className="inline mr-1" />}
                      @{item.from}
                    </span>
                    <SentimentBadge s={item.sentiment} />
                    <span className="text-xs text-white/25 ml-auto">{new Date(item.date).toLocaleDateString("es-CL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <p className="text-sm text-white/70 leading-relaxed">{item.text || "Sin texto"}</p>
                  {item.postCaption && (
                    <p className="text-xs text-white/30 mt-1 truncate">En: {item.postCaption}</p>
                  )}
                </div>
                {item.postImage && (
                  <img src={item.postImage} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0 opacity-70" />
                )}
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                {item.type === "comment" && !item.replied && (
                  <button onClick={() => markReplied(item.id)}
                    className="text-xs text-white/40 hover:text-green-400 transition">
                    Marcar respondido ✓
                  </button>
                )}
                {item.postId && item.postId.startsWith("https") ? (
                  <a href={item.postId} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-white/30 hover:text-white/60 transition ml-auto">
                    Ver post <ExternalLink size={10} />
                  </a>
                ) : item.postId ? (
                  <a href={`/dashboard/posts/${item.postId}`} className="text-xs text-white/30 hover:text-white/60 transition ml-auto">
                    Ver post →
                  </a>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

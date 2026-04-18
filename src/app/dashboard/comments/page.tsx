"use client"

import { useEffect, useState } from "react"
import { MessageCircle, RefreshCw, Send, Bot, User, ThumbsUp, ThumbsDown, Minus, CheckCircle } from "lucide-react"

interface Comment {
  id: string
  metaCommentId: string
  username: string
  text: string
  sentiment: string | null
  replied: boolean
  replyText: string | null
  repliedAt: string | null
  createdAt: string
  post: { caption: string; type: string }
}

const SENTIMENT_STYLES: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  POSITIVE: { label: "Positivo", icon: ThumbsUp, cls: "text-green-400" },
  NEGATIVE: { label: "Negativo", icon: ThumbsDown, cls: "text-red-400" },
  NEUTRAL: { label: "Neutro", icon: Minus, cls: "text-gray-400" },
}

export default function CommentsPage() {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [filter, setFilter] = useState<"ALL" | "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "PENDING">("ALL")
  const [replyingId, setReplyingId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [generatingId, setGeneratingId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch("/api/comments")
    const data = await res.json()
    setComments(data.comments ?? [])
    setLoading(false)
  }

  async function syncComments() {
    setSyncing(true)
    await fetch("/api/comments", { method: "POST" })
    await load()
    setSyncing(false)
  }

  async function generateAIReply(comment: Comment) {
    setGeneratingId(comment.id)
    const res = await fetch(`/api/comments/${comment.id}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ useAI: true, preview: true }),
    })
    const data = await res.json()
    if (data.reply) {
      setReplyingId(comment.id)
      setReplyText(data.reply)
    }
    setGeneratingId(null)
  }

  async function sendReply(comment: Comment) {
    setSendingId(comment.id)
    const res = await fetch(`/api/comments/${comment.id}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ useAI: false, replyText }),
    })
    if (res.ok) {
      setReplyingId(null)
      setReplyText("")
      await load()
    }
    setSendingId(null)
  }

  useEffect(() => { load() }, [])

  const filtered = comments.filter((c) => {
    if (filter === "PENDING") return !c.replied
    if (filter === "ALL") return true
    return c.sentiment === filter
  })

  const counts = {
    ALL: comments.length,
    PENDING: comments.filter((c) => !c.replied).length,
    POSITIVE: comments.filter((c) => c.sentiment === "POSITIVE").length,
    NEGATIVE: comments.filter((c) => c.sentiment === "NEGATIVE").length,
    NEUTRAL: comments.filter((c) => c.sentiment === "NEUTRAL").length,
  }

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-100">Comentarios</h1>
          <p className="text-gray-500 mt-0.5 text-sm">Gestiona y responde comentarios con IA</p>
        </div>
        <button
          onClick={syncComments}
          disabled={syncing}
          className="btn-primary flex items-center gap-2 text-sm py-2"
        >
          {syncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {syncing ? "Sincronizando…" : "Sincronizar"}
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {(["ALL", "PENDING", "POSITIVE", "NEGATIVE", "NEUTRAL"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f
                ? "bg-indigo-600 text-white"
                : "bg-gray-800 text-gray-400 hover:text-gray-200"
            }`}
          >
            {f === "ALL" ? "Todos" : f === "PENDING" ? "Sin responder" : SENTIMENT_STYLES[f]?.label}
            <span className="ml-1.5 opacity-60">{counts[f]}</span>
          </button>
        ))}
      </div>

      {/* Comments list */}
      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <RefreshCw className="w-4 h-4 animate-spin" /> Cargando comentarios…
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center">
          <MessageCircle className="w-8 h-8 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No hay comentarios en esta categoría.</p>
          <p className="text-gray-600 text-xs mt-1">Sincroniza para traer los últimos comentarios de Instagram.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => {
            const sent = c.sentiment ? SENTIMENT_STYLES[c.sentiment] : null
            const SentIcon = sent?.icon
            return (
              <div key={c.id} className="card p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-200">@{c.username}</span>
                      {sent && SentIcon && (
                        <span className={`flex items-center gap-1 text-xs ${sent.cls}`}>
                          <SentIcon className="w-3 h-3" /> {sent.label}
                        </span>
                      )}
                      {c.replied && (
                        <span className="flex items-center gap-1 text-xs text-green-400">
                          <CheckCircle className="w-3 h-3" /> Respondido
                        </span>
                      )}
                      <span className="text-xs text-gray-600 ml-auto">
                        {new Date(c.createdAt).toLocaleDateString("es-CL")}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 mb-1">{c.text}</p>
                    <p className="text-xs text-gray-600 truncate">Post: {c.post?.caption?.slice(0, 60)}…</p>

                    {/* Replied text */}
                    {c.replied && c.replyText && (
                      <div className="mt-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-3 py-2">
                        <p className="text-xs text-indigo-300 flex items-center gap-1 mb-0.5">
                          <Bot className="w-3 h-3" /> Tu respuesta
                        </p>
                        <p className="text-xs text-gray-300">{c.replyText}</p>
                      </div>
                    )}

                    {/* Reply box */}
                    {!c.replied && replyingId === c.id && (
                      <div className="mt-3 space-y-2">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          rows={3}
                          className="input text-sm w-full resize-none"
                          placeholder="Escribe tu respuesta…"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => sendReply(c)}
                            disabled={!!sendingId || !replyText.trim()}
                            className="btn-primary flex items-center gap-1.5 text-xs py-1.5"
                          >
                            {sendingId === c.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                            Enviar
                          </button>
                          <button
                            onClick={() => { setReplyingId(null); setReplyText("") }}
                            className="text-xs text-gray-500 hover:text-gray-300 px-3 py-1.5"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    {!c.replied && replyingId !== c.id && (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => generateAIReply(c)}
                          disabled={generatingId === c.id}
                          className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                          {generatingId === c.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Bot className="w-3 h-3" />}
                          Respuesta IA
                        </button>
                        <button
                          onClick={() => { setReplyingId(c.id); setReplyText("") }}
                          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-300 transition-colors"
                        >
                          <Send className="w-3 h-3" /> Responder
                        </button>
                      </div>
                    )}
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

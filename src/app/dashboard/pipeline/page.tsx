"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import {
  Instagram, Facebook, Image as ImageIcon, Video, RefreshCw,
  ArrowRight, RotateCcw, Clock, AlertCircle, CheckCircle2,
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

type PostStatus = "PENDING" | "GENERATING" | "SCHEDULED" | "PUBLISHING" | "PUBLISHED" | "FAILED"

interface Post {
  id: string
  type: string
  contentType: string
  platform: Array<"INSTAGRAM" | "FACEBOOK">
  status: PostStatus
  caption: string
  thumbnailUrl: string | null
  scheduledAt: string
  publishedAt: string | null
  failReason: string | null
}

interface Column {
  key: string
  label: string
  statuses: PostStatus[]
  accent: string
}

const COLUMNS: Column[] = [
  { key: "prep", label: "En preparación", statuses: ["PENDING", "GENERATING"], accent: "border-t-amber-500" },
  { key: "scheduled", label: "Programado", statuses: ["SCHEDULED"], accent: "border-t-violet-500" },
  { key: "publishing", label: "Publicando", statuses: ["PUBLISHING"], accent: "border-t-indigo-500" },
  { key: "published", label: "Publicado", statuses: ["PUBLISHED"], accent: "border-t-emerald-500" },
  { key: "failed", label: "Con error", statuses: ["FAILED"], accent: "border-t-red-500" },
]

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  INSTAGRAM: <Instagram className="w-3.5 h-3.5 text-pink-400" />,
  FACEBOOK: <Facebook className="w-3.5 h-3.5 text-blue-400" />,
}

function PostCard({ post, onAdvance, onRetry }: { post: Post; onAdvance?: () => void; onRetry?: () => void }) {
  return (
    <div className="bg-gray-900 border border-white/10 rounded-xl p-3 hover:border-white/20 transition-colors">
      <Link href={`/dashboard/posts/${post.id}`} className="flex gap-2.5">
        <div className="w-12 h-12 rounded-lg bg-gray-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
          {post.thumbnailUrl ? (
            <img src={post.thumbnailUrl} alt="" className="w-full h-full object-cover" />
          ) : post.type === "REEL" ? (
            <Video className="w-4 h-4 text-gray-600" />
          ) : (
            <ImageIcon className="w-4 h-4 text-gray-600" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-gray-300 line-clamp-2 leading-snug">{post.caption || "Sin texto"}</p>
          <div className="flex items-center gap-1.5 mt-1.5">
            {post.platform.map((p) => <span key={p}>{PLATFORM_ICONS[p]}</span>)}
            <span className="text-[10px] text-gray-500 ml-auto flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {post.scheduledAt ? format(new Date(post.scheduledAt), "d MMM, HH:mm", { locale: es }) : "—"}
            </span>
          </div>
        </div>
      </Link>
      {post.status === "FAILED" && post.failReason && (
        <p className="text-[10px] text-red-400 mt-2 bg-red-500/10 rounded-lg px-2 py-1 line-clamp-2">{post.failReason}</p>
      )}
      {(onAdvance || onRetry) && (
        <div className="flex justify-end mt-2">
          {onAdvance && (
            <button onClick={onAdvance} className="flex items-center gap-1 text-[10px] font-medium text-violet-400 hover:text-violet-300 transition-colors">
              Programar <ArrowRight className="w-3 h-3" />
            </button>
          )}
          {onRetry && (
            <button onClick={onRetry} className="flex items-center gap-1 text-[10px] font-medium text-amber-400 hover:text-amber-300 transition-colors">
              Reintentar <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function PipelinePage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/posts?limit=100")
      const data = res.ok ? await res.json() : {}
      setPosts(Array.isArray(data.posts) ? data.posts : [])
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function setStatus(id: string, status: PostStatus) {
    setBusyId(id)
    try {
      const res = await fetch(`/api/posts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)))
      }
    } catch {}
    setBusyId(null)
  }

  const grouped = COLUMNS.map((col) => ({
    ...col,
    items: posts.filter((p) => col.statuses.includes(p.status)),
  }))

  const totals = {
    prep: grouped[0].items.length,
    published: grouped[3].items.length,
    failed: grouped[4].items.length,
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Pipeline de contenido</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Todo tu contenido, de la preparación a la publicación, en un solo lugar.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </div>

      {totals.failed > 0 && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-300 text-sm rounded-xl px-4 py-2.5 mb-5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {totals.failed} publicación{totals.failed > 1 ? "es" : ""} con error necesita{totals.failed > 1 ? "n" : ""} revisión.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {grouped.map((col) => (
          <div key={col.key} className={`bg-gray-900/40 border border-white/5 border-t-2 ${col.accent} rounded-2xl p-3 flex flex-col min-h-[200px]`}>
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-xs font-bold text-gray-300 uppercase tracking-wide">{col.label}</h2>
              <span className="text-xs font-semibold text-gray-500 bg-white/5 rounded-full px-2 py-0.5">{col.items.length}</span>
            </div>
            <div className="space-y-2.5 flex-1">
              {loading && col.items.length === 0 && (
                <div className="text-center py-8 text-xs text-gray-600">Cargando…</div>
              )}
              {!loading && col.items.length === 0 && (
                <div className="text-center py-8 text-xs text-gray-600">Vacío</div>
              )}
              {col.items.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onAdvance={
                    post.status === "PENDING" && post.scheduledAt && busyId !== post.id
                      ? () => setStatus(post.id, "SCHEDULED")
                      : undefined
                  }
                  onRetry={post.status === "FAILED" && busyId !== post.id ? () => setStatus(post.id, "PENDING") : undefined}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {!loading && posts.length === 0 && (
        <div className="text-center py-16">
          <CheckCircle2 className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No hay contenido todavía.</p>
          <Link href="/dashboard/posts" className="text-violet-400 text-sm font-medium hover:underline mt-1 inline-block">
            Generar el primero →
          </Link>
        </div>
      )}
    </div>
  )
}

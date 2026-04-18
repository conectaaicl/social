"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Sparkles, RefreshCw, Trash2, Send, Filter, Calendar, Instagram, Facebook,
  Image, Video, AlertCircle, CheckCircle2, Clock, ChevronLeft, ChevronRight,
  Hash, Wand2, CheckSquare, ChevronDown, ChevronUp,
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

type PostStatus = "PENDING" | "GENERATING" | "SCHEDULED" | "PUBLISHING" | "PUBLISHED" | "FAILED"
type PostType = "FEED" | "STORY" | "CAROUSEL" | "REEL"
type ContentType = "PRODUCTO" | "PROYECTO" | "TIP" | "PROMO"

interface CaptionVariant {
  caption: string
  angle: string
}

interface HashtagResearch {
  set1: string
  set2: string
  set3: string
  explanation: string
}

interface Post {
  id: string
  type: PostType
  contentType: ContentType
  platform: Array<"INSTAGRAM" | "FACEBOOK">
  status: PostStatus
  caption: string
  hashtags: string
  mediaUrls: string[]
  thumbnailUrl: string | null
  scheduledAt: string
  publishedAt: string | null
  failReason: string | null
  reach: number | null
  likes: number | null
  comments: number | null
}

const TYPE_ICONS: Record<PostType, React.ReactNode> = {
  FEED: <Image className="w-4 h-4" />,
  STORY: <Image className="w-4 h-4" />,
  CAROUSEL: <Image className="w-4 h-4" />,
  REEL: <Video className="w-4 h-4" />,
}
const CONTENT_LABELS: Record<ContentType, string> = {
  PRODUCTO: "Producto",
  PROYECTO: "Proyecto",
  TIP: "Tip",
  PROMO: "Promoción",
}
const STATUS_BADGE: Record<PostStatus, string> = {
  PENDING: "badge-pending",
  GENERATING: "badge-pending",
  SCHEDULED: "badge-scheduled",
  PUBLISHING: "badge-scheduled",
  PUBLISHED: "badge-published",
  FAILED: "badge-failed",
}
const STATUS_LABEL: Record<PostStatus, string> = {
  PENDING: "Pendiente",
  GENERATING: "Generando…",
  SCHEDULED: "Programado",
  PUBLISHING: "Publicando…",
  PUBLISHED: "Publicado",
  FAILED: "Fallido",
}

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  INSTAGRAM: <Instagram className="w-3.5 h-3.5 text-pink-400" />,
  FACEBOOK: <Facebook className="w-3.5 h-3.5 text-blue-400" />,
}

type GenerateForm = {
  postType: PostType
  contentType: ContentType
  platforms: Array<"INSTAGRAM" | "FACEBOOK">
  scheduledAt: string
}

function todayAt(h: number, m = 0): string {
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d.toISOString().slice(0, 16)
}

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState("")
  const [filterType, setFilterType] = useState("")
  const [generating, setGenerating] = useState(false)
  const [publishing, setPublishing] = useState<string | null>(null)
  const [showGenModal, setShowGenModal] = useState(false)
  const [genForm, setGenForm] = useState<GenerateForm>({
    postType: "FEED",
    contentType: "PRODUCTO",
    platforms: ["INSTAGRAM", "FACEBOOK"],
    scheduledAt: todayAt(19),
  })
  const [genError, setGenError] = useState("")
  const [captionVariants, setCaptionVariants] = useState<CaptionVariant[]>([])
  const [selectedVariant, setSelectedVariant] = useState<number | null>(null)
  const [loadingVariants, setLoadingVariants] = useState(false)
  const [hashtagResearch, setHashtagResearch] = useState<HashtagResearch | null>(null)
  const [loadingHashtags, setLoadingHashtags] = useState(false)
  const [showHashtags, setShowHashtags] = useState(false)
  const [selectedHashtagSet, setSelectedHashtagSet] = useState<string | null>(null)

  const limit = 12

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (filterStatus) params.set("status", filterStatus)
      if (filterType) params.set("type", filterType)
      const res = await fetch(`/api/posts?${params}`)
      const data = await res.json()
      setPosts(data.posts ?? [])
      setTotal(data.total ?? 0)
    } finally {
      setLoading(false)
    }
  }, [page, filterStatus, filterType])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  async function handleGenerate() {
    setGenerating(true)
    setGenError("")
    try {
      const body: any = { ...genForm }
      if (selectedVariant !== null && captionVariants[selectedVariant]) {
        body.customCaption = captionVariants[selectedVariant].caption
      }
      if (selectedHashtagSet) {
        body.customHashtags = selectedHashtagSet
      }
      const res = await fetch("/api/posts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Error generando")
      setShowGenModal(false)
      resetModal()
      fetchPosts()
    } catch (e: any) {
      setGenError(e.message)
    } finally {
      setGenerating(false)
    }
  }

  function resetModal() {
    setCaptionVariants([])
    setSelectedVariant(null)
    setHashtagResearch(null)
    setSelectedHashtagSet(null)
    setShowHashtags(false)
    setGenError("")
  }

  async function handleGetVariants() {
    setLoadingVariants(true)
    setCaptionVariants([])
    setSelectedVariant(null)
    try {
      const res = await fetch("/api/posts/variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postType: genForm.postType,
          contentType: genForm.contentType,
          platforms: genForm.platforms,
        }),
      })
      const data = await res.json()
      setCaptionVariants(data.variants ?? [])
    } catch {}
    setLoadingVariants(false)
  }

  async function handleResearchHashtags() {
    setLoadingHashtags(true)
    setHashtagResearch(null)
    setShowHashtags(true)
    try {
      const res = await fetch("/api/hashtags/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postType: genForm.postType,
          contentType: genForm.contentType,
        }),
      })
      const data = await res.json()
      setHashtagResearch(data)
    } catch {}
    setLoadingHashtags(false)
  }

  async function handlePublish(postId: string) {
    if (!confirm("¿Publicar este post ahora?")) return
    setPublishing(postId)
    try {
      await fetch(`/api/posts/${postId}/publish`, { method: "POST" })
      fetchPosts()
    } finally {
      setPublishing(null)
    }
  }

  async function handleDelete(postId: string) {
    if (!confirm("¿Eliminar este post?")) return
    await fetch(`/api/posts/${postId}`, { method: "DELETE" })
    fetchPosts()
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-100">Posts</h1>
          <p className="text-gray-500 mt-0.5 text-sm">{total} posts en total</p>
        </div>
        <button onClick={() => setShowGenModal(true)} className="btn-primary flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Generar con IA
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1) }}
          className="input w-auto text-sm py-2"
        >
          <option value="">Todos los estados</option>
          <option value="SCHEDULED">Programados</option>
          <option value="PUBLISHED">Publicados</option>
          <option value="GENERATING">Generando</option>
          <option value="FAILED">Fallidos</option>
        </select>
        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setPage(1) }}
          className="input w-auto text-sm py-2"
        >
          <option value="">Todos los tipos</option>
          <option value="FEED">Feed</option>
          <option value="STORY">Story</option>
          <option value="REEL">Reel</option>
          <option value="CAROUSEL">Carrusel</option>
        </select>
        <button onClick={fetchPosts} className="btn-secondary flex items-center gap-2 py-2 text-sm">
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="card text-center py-16">
          <Sparkles className="w-10 h-10 text-gray-600 mx-auto mb-4" />
          <h3 className="text-gray-300 font-medium mb-2">Sin posts aún</h3>
          <p className="text-gray-500 text-sm mb-6">Genera tu primer post con IA o espera la generación automática diaria</p>
          <button onClick={() => setShowGenModal(true)} className="btn-primary inline-flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Generar con IA
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onPublish={() => handlePublish(post.id)}
              onDelete={() => handleDelete(post.id)}
              publishing={publishing === post.id}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary py-1.5 px-3 disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-400">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn-secondary py-1.5 px-3 disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Generate Modal */}
      {showGenModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-lg my-4">
            <h2 className="text-lg font-semibold text-gray-100 mb-5 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              Generar post con IA
            </h2>

            <div className="space-y-4">
              <div>
                <label className="label">Tipo de post</label>
                <div className="grid grid-cols-4 gap-2">
                  {(["FEED", "STORY", "REEL", "CAROUSEL"] as PostType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => { setGenForm((f) => ({ ...f, postType: t })); setCaptionVariants([]); setHashtagResearch(null) }}
                      className={`py-2 rounded-lg border text-xs font-medium transition-colors ${
                        genForm.postType === t
                          ? "border-indigo-500 bg-indigo-500/20 text-indigo-300"
                          : "border-gray-700 text-gray-400 hover:border-gray-600"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Tipo de contenido</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(CONTENT_LABELS) as [ContentType, string][]).map(([k, v]) => (
                    <button
                      key={k}
                      onClick={() => { setGenForm((f) => ({ ...f, contentType: k })); setCaptionVariants([]); setHashtagResearch(null) }}
                      className={`py-2 rounded-lg border text-sm transition-colors ${
                        genForm.contentType === k
                          ? "border-indigo-500 bg-indigo-500/20 text-indigo-300"
                          : "border-gray-700 text-gray-400 hover:border-gray-600"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Plataformas</label>
                <div className="flex gap-3">
                  {(["INSTAGRAM", "FACEBOOK"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        setGenForm((f) => ({
                          ...f,
                          platforms: f.platforms.includes(p)
                            ? f.platforms.filter((x) => x !== p)
                            : [...f.platforms, p],
                        }))
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-colors ${
                        genForm.platforms.includes(p)
                          ? "border-indigo-500 bg-indigo-500/20 text-indigo-300"
                          : "border-gray-700 text-gray-400"
                      }`}
                    >
                      {PLATFORM_ICONS[p]}
                      {p === "INSTAGRAM" ? "Instagram" : "Facebook"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Programar para</label>
                <input
                  type="datetime-local"
                  value={genForm.scheduledAt}
                  onChange={(e) => setGenForm((f) => ({ ...f, scheduledAt: e.target.value }))}
                  className="input"
                />
              </div>

              {/* PRO: Caption A/B Variants */}
              <div className="border border-gray-800 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-800/40">
                  <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                    <Wand2 className="w-3.5 h-3.5" />
                    A/B Testing de Captions
                  </span>
                  <button
                    onClick={handleGetVariants}
                    disabled={loadingVariants}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 disabled:opacity-50"
                  >
                    {loadingVariants ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    {loadingVariants ? "Generando…" : "Generar 3 variantes"}
                  </button>
                </div>
                {captionVariants.length > 0 && (
                  <div className="divide-y divide-gray-800">
                    {captionVariants.map((v, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedVariant(selectedVariant === i ? null : i)}
                        className={`w-full text-left px-4 py-3 transition-colors ${
                          selectedVariant === i
                            ? "bg-indigo-600/15 border-l-2 border-indigo-500"
                            : "hover:bg-gray-800/40"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className={`mt-0.5 w-4 h-4 shrink-0 rounded border text-xs flex items-center justify-center ${
                            selectedVariant === i ? "border-indigo-500 bg-indigo-500 text-white" : "border-gray-600"
                          }`}>
                            {selectedVariant === i ? "✓" : (i + 1)}
                          </span>
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wide">{v.angle}</span>
                            <p className="text-xs text-gray-300 mt-0.5 leading-relaxed line-clamp-3">{v.caption}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                    {selectedVariant !== null && (
                      <p className="px-4 py-2 text-xs text-green-400 bg-green-500/10">
                        ✓ Variante "{captionVariants[selectedVariant].angle}" seleccionada
                      </p>
                    )}
                    {selectedVariant === null && (
                      <p className="px-4 py-2 text-xs text-gray-500">
                        Sin selección → Claude generará el copy automáticamente
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* PRO: Hashtag Research */}
              <div className="border border-gray-800 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-800/40">
                  <span className="text-xs font-semibold text-teal-300 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5" />
                    Investigación de Hashtags
                  </span>
                  <button
                    onClick={handleResearchHashtags}
                    disabled={loadingHashtags}
                    className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 disabled:opacity-50"
                  >
                    {loadingHashtags ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Hash className="w-3 h-3" />}
                    {loadingHashtags ? "Analizando…" : "Investigar hashtags"}
                  </button>
                </div>
                {showHashtags && hashtagResearch && (
                  <div className="divide-y divide-gray-800">
                    {[
                      { label: "Populares (+1M)", key: "set1", color: "text-orange-400" },
                      { label: "Nicho (50K-500K)", key: "set2", color: "text-teal-400" },
                      { label: "Marca / Local", key: "set3", color: "text-blue-400" },
                    ].map(({ label, key, color }) => {
                      const val = hashtagResearch[key as keyof HashtagResearch] as string
                      return (
                        <button
                          key={key}
                          onClick={() => setSelectedHashtagSet(selectedHashtagSet === val ? null : val)}
                          className={`w-full text-left px-4 py-3 transition-colors ${
                            selectedHashtagSet === val ? "bg-teal-600/10 border-l-2 border-teal-500" : "hover:bg-gray-800/40"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-semibold ${color}`}>{label}</span>
                            {selectedHashtagSet === val && <span className="text-xs text-teal-400">✓ seleccionado</span>}
                          </div>
                          <p className="text-xs text-gray-400 leading-relaxed">{val}</p>
                        </button>
                      )
                    })}
                    <div className="px-4 py-2.5 bg-gray-900/40">
                      <p className="text-xs text-gray-500 italic">{hashtagResearch.explanation}</p>
                    </div>
                  </div>
                )}
              </div>

              {genError && (
                <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
                  {genError}
                </p>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowGenModal(false); resetModal() }}
                className="btn-secondary flex-1"
                disabled={generating}
              >
                Cancelar
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating || genForm.platforms.length === 0}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {generating ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Generando…</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Generar</>
                )}
              </button>
            </div>

            {generating && (
              <p className="text-xs text-gray-500 text-center mt-3">
                Claude + fal.ai creando imagen… puede tardar ~30s
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function PostCard({
  post,
  onPublish,
  onDelete,
  publishing,
}: {
  post: Post
  onPublish: () => void
  onDelete: () => void
  publishing: boolean
}) {
  const previewUrl = post.thumbnailUrl ?? post.mediaUrls[0]

  return (
    <div className="card flex flex-col gap-3 p-4">
      {/* Media preview */}
      <div className="relative aspect-square bg-gray-800 rounded-lg overflow-hidden">
        {previewUrl ? (
          <img src={previewUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600">
            {post.type === "REEL" ? <Video className="w-8 h-8" /> : <Image className="w-8 h-8" />}
          </div>
        )}
        {post.type === "REEL" && (
          <div className="absolute top-2 left-2 bg-black/60 rounded px-1.5 py-0.5 text-xs text-white flex items-center gap-1">
            <Video className="w-3 h-3" /> REEL
          </div>
        )}
        {post.type === "STORY" && (
          <div className="absolute top-2 left-2 bg-black/60 rounded px-1.5 py-0.5 text-xs text-white">
            STORY
          </div>
        )}
        <span className={`absolute top-2 right-2 ${STATUS_BADGE[post.status]} text-xs px-2 py-0.5 rounded-full`}>
          {STATUS_LABEL[post.status]}
        </span>
      </div>

      {/* Caption */}
      <p className="text-sm text-gray-300 line-clamp-2 leading-relaxed">{post.caption}</p>

      {/* Meta */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          {post.platform.map((p) => (
            <span key={p}>{PLATFORM_ICONS[p]}</span>
          ))}
          <span className="ml-1">{CONTENT_LABELS[post.contentType]}</span>
        </div>
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {format(new Date(post.scheduledAt), "d MMM, HH:mm", { locale: es })}
        </div>
      </div>

      {/* Published stats */}
      {post.status === "PUBLISHED" && (post.reach || post.likes) && (
        <div className="flex gap-4 text-xs text-gray-500 border-t border-gray-800 pt-2">
          {post.reach && <span>👁 {post.reach.toLocaleString()}</span>}
          {post.likes && <span>❤️ {post.likes}</span>}
          {post.comments && <span>💬 {post.comments}</span>}
        </div>
      )}

      {/* Failed reason */}
      {post.status === "FAILED" && post.failReason && (
        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-xs text-red-400">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          {post.failReason.slice(0, 100)}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-auto">
        {(post.status === "SCHEDULED" || post.status === "FAILED") && (
          <button
            onClick={onPublish}
            disabled={publishing}
            className="btn-primary flex-1 flex items-center justify-center gap-1.5 text-sm py-1.5"
          >
            {publishing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Publicar ahora
          </button>
        )}
        {post.status !== "PUBLISHING" && (
          <button
            onClick={onDelete}
            className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}

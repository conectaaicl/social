'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Image as ImageIcon, Video, Zap, Send, ArrowLeft, Loader2, Save, Trash2, AlertCircle, Clock } from 'lucide-react'

interface Post {
  id: string
  type: string
  contentType: string
  platform: string[]
  status: string
  caption: string
  hashtags: string
  imagePrompt: string | null
  mediaUrls: string[]
  thumbnailUrl: string | null
  scheduledAt: string
  publishedAt: string | null
  failReason: string | null
  reach: number | null
  likes: number | null
  comments: number | null
  createdAt: string
}

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-gray-500/20 text-gray-300 border border-gray-500/30',
  SCHEDULED: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
  PUBLISHING: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
  PUBLISHED: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  FAILED: 'bg-red-500/20 text-red-300 border border-red-500/30',
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente', SCHEDULED: 'Programado', PUBLISHING: 'Publicando',
  PUBLISHED: 'Publicado', FAILED: 'Fallido',
}

const IMAGE_STYLES = [
  { id: 'catalogo', label: 'Catálogo', desc: 'Fondo limpio, producto principal' },
  { id: 'ugc', label: 'UGC Real', desc: 'Persona real en ambiente doméstico' },
  { id: 'emocional', label: 'Emocional', desc: 'Ambiente cálido y aspiracional' },
  { id: 'comparativo', label: 'Antes/Después', desc: 'Comparación lado a lado' },
]

export default function PostDetailPage() {
  const { id } = useParams()
  const router = useRouter()

  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [generatingImg, setGeneratingImg] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [mediaItems, setMediaItems] = useState<Array<{id:string;url:string;type:string}>>([]) 
  const [loadingMedia, setLoadingMedia] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [imageStyle, setImageStyle] = useState<string>('catalogo')

  const [caption, setCaption] = useState('')
  const [hashtags, setHashtags] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')

  useEffect(() => {
    fetch('/api/posts/' + id)
      .then(r => r.json())
      .then(d => {
        if (d.post) {
          setPost(d.post)
          setCaption(d.post.caption ?? '')
          setHashtags(d.post.hashtags ?? '')
          setScheduledAt(d.post.scheduledAt ? d.post.scheduledAt.slice(0, 16) : '')
        }
      })
      .finally(() => setLoading(false))
  }, [id])

  const save = async () => {
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch('/api/posts/' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caption,
          hashtags,
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        }),
      })
      const d = await res.json()
      if (d.success) {
        setPost(d.post)
        setMsg({ type: 'ok', text: 'Cambios guardados' })
      } else {
        setMsg({ type: 'err', text: d.error ?? 'Error al guardar' })
      }
    } finally {
      setSaving(false)
    }
  }

  const publishNow = async () => {
    setPublishing(true)
    setMsg(null)
    try {
      const res = await fetch('/api/posts/' + id + '/publish', { method: 'POST' })
      const d = await res.json()
      if (d.success) {
        setMsg({ type: 'ok', text: 'Post enviado a publicar' })
        setTimeout(() => router.push('/dashboard/posts'), 1500)
      } else {
        setMsg({ type: 'err', text: d.error ?? 'Error al publicar' })
      }
    } finally {
      setPublishing(false)
    }
  }

  const regenerateImage = async () => {
    if (!post) return
    setGeneratingImg(true)
    setMsg(null)
    try {
      const res = await fetch('/api/posts/' + id + '/regenerate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageStyle }),
      })
      const d = await res.json()
      if (d.success && d.mediaUrls) {
        setPost(prev => prev ? { ...prev, mediaUrls: d.mediaUrls, thumbnailUrl: d.thumbnailUrl ?? prev.thumbnailUrl } : prev)
        setMsg({ type: 'ok', text: 'Imagen regenerada' })
      } else {
        setMsg({ type: 'err', text: d.error ?? 'Error al generar imagen' })
      }
    } finally {
      setGeneratingImg(false)
    }
  }

  const openMediaPicker = async () => {
    setShowPicker(true)
    if (mediaItems.length === 0) {
      setLoadingMedia(true)
      const r = await fetch("/api/media?limit=40&type=IMAGE")
      const d = await r.json()
      setMediaItems(d.items ?? [])
      setLoadingMedia(false)
    }
  }

  const pickMedia = async (url: string) => {
    setShowPicker(false)
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch("/api/posts/" + id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaUrl: url }),
      })
      const d = await res.json()
      if (d.success) {
        setPost(prev => prev ? { ...prev, mediaUrls: [url] } : prev)
        setMsg({ type: "ok", text: "Imagen actualizada" })
      } else {
        setMsg({ type: "err", text: d.error ?? "Error" })
      }
    } finally { setSaving(false) }
  }

  const deletePost = async () => {
    if (!confirm('Eliminar este post permanentemente?')) return
    setDeleting(true)
    try {
      const res = await fetch('/api/posts/' + id, { method: 'DELETE' })
      const d = await res.json()
      if (d.success) router.push('/dashboard/posts')
      else setMsg({ type: 'err', text: d.error ?? 'Error al eliminar' })
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center min-h-screen">
      <Loader2 size={24} className="animate-spin text-brand-400" />
    </div>
  )
  if (!post) return (
    <div className="flex-1 flex items-center justify-center text-white/40">Post no encontrado</div>
  )

  const previewUrl = post.thumbnailUrl ?? post.mediaUrls?.[0]
  const isEditable = !['PUBLISHED', 'PUBLISHING'].includes(post.status)

  return (
    <>
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5 flex items-center gap-4 sticky top-0 z-10 bg-ink">
        <button onClick={() => router.back()} className="text-white/40 hover:text-white transition">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-white font-bold">Editor de Post</h1>
          <p className="text-white/40 text-xs capitalize">
            {post.type.toLowerCase()} · {post.contentType.toLowerCase()} · {post.platform.join(', ')}
          </p>
        </div>
        <span className={'text-xs px-2.5 py-1 rounded-full ' + (STATUS_BADGE[post.status] ?? STATUS_BADGE.PENDING)}>
          {STATUS_LABEL[post.status] ?? post.status}
        </span>
        <div className="flex gap-2">
          {isEditable && (
            <>
              <button onClick={save} disabled={saving}
                className="flex items-center gap-1.5 px-3 py-2 border border-white/10 text-white/70 hover:text-white hover:border-white/20 rounded-xl text-sm transition disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Guardar
              </button>
              <button onClick={publishNow} disabled={publishing}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium rounded-xl transition disabled:opacity-50">
                {publishing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Publicar ahora
              </button>
            </>
          )}
          {isEditable && (
            <button onClick={deletePost} disabled={deleting}
              className="p-2 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition">
              {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            </button>
          )}
        </div>
      </div>

      {msg && (
        <div className={'mx-6 mt-3 px-4 py-2.5 rounded-xl text-sm border ' + (
          msg.type === 'ok'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
            : 'bg-red-500/10 border-red-500/20 text-red-300'
        )}>
          {msg.text}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Preview panel */}
        <div className="w-72 border-r border-white/5 p-5 overflow-y-auto flex-shrink-0">
          <div className="text-xs text-white/40 uppercase tracking-wider mb-3">Vista previa</div>

          <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
            {previewUrl ? (
              <img src={previewUrl} alt="" className="w-full aspect-square object-cover" />
            ) : (
              <div className="aspect-square bg-white/5 flex flex-col items-center justify-center gap-2 text-white/20">
                <ImageIcon size={32} />
                <span className="text-xs">Sin imagen</span>
              </div>
            )}
            <div className="p-3">
              <div className="text-white/80 text-xs leading-relaxed line-clamp-5">
                {caption || 'Caption del post...'}
              </div>
              {hashtags && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {hashtags.split(' ').slice(0, 6).map((h, i) => (
                    <span key={i} className="text-brand-400 text-[10px]">{h.startsWith('#') ? h : '#' + h}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Published metrics */}
          {post.status === 'PUBLISHED' && (post.reach != null || post.likes != null) && (
            <div className="mt-4 bg-white/3 border border-white/8 rounded-xl p-4">
              <div className="text-xs text-white/40 uppercase tracking-wider mb-3">Métricas</div>
              <div className="grid grid-cols-2 gap-3">
                {post.reach != null && (
                  <div>
                    <div className="text-lg font-bold text-white">{post.reach.toLocaleString()}</div>
                    <div className="text-[10px] text-white/40">Alcance</div>
                  </div>
                )}
                {post.likes != null && (
                  <div>
                    <div className="text-lg font-bold text-white">{post.likes}</div>
                    <div className="text-[10px] text-white/40">Likes</div>
                  </div>
                )}
                {post.comments != null && (
                  <div>
                    <div className="text-lg font-bold text-white">{post.comments}</div>
                    <div className="text-[10px] text-white/40">Comentarios</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Image regeneration */}
          {isEditable && (
            <div className="mt-4 space-y-3">
              <div className="text-xs text-white/40 uppercase tracking-wider">Regenerar imagen</div>
              <div className="grid grid-cols-2 gap-1.5">
                {IMAGE_STYLES.map(s => (
                  <button key={s.id} onClick={() => setImageStyle(s.id)}
                    className={'p-2 rounded-xl border text-left transition ' + (
                      imageStyle === s.id
                        ? 'border-brand-500/60 bg-brand-500/10'
                        : 'border-white/8 hover:border-white/15'
                    )}>
                    <div className="text-xs font-medium text-white/80">{s.label}</div>
                    <div className="text-[10px] text-white/35 leading-tight mt-0.5">{s.desc}</div>
                  </button>
                ))}
              </div>
              <button onClick={regenerateImage} disabled={generatingImg}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-brand-500/40 text-brand-300 hover:bg-brand-500/10 rounded-xl text-sm transition disabled:opacity-50">
                {generatingImg ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                {generatingImg ? 'Generando...' : 'Generar imagen IA'}
              </button>
              <button onClick={openMediaPicker}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-white/10 text-white/60 hover:text-white hover:border-white/20 rounded-xl text-sm transition">
                <ImageIcon size={14} />
                Elegir de biblioteca
              </button>
            </div>
          )}
        </div>

        {/* Editor panel */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {/* Caption */}
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">Caption</label>
            <textarea
              value={caption}
              onChange={e => setCaption(e.target.value)}
              disabled={!isEditable}
              rows={10}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/90 text-sm leading-relaxed resize-none focus:outline-none focus:border-brand-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Caption del post..."
            />
            <div className="text-right text-[10px] text-white/25 mt-1">{caption.length} caracteres</div>
          </div>

          {/* Hashtags */}
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">Hashtags</label>
            <input
              value={hashtags}
              onChange={e => setHashtags(e.target.value)}
              disabled={!isEditable}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/90 text-sm focus:outline-none focus:border-brand-500/40 disabled:opacity-50"
              placeholder="#cortinas #decoracion #hogar"
            />
            {hashtags && (
              <div className="flex flex-wrap gap-1 mt-2">
                {hashtags.split(/\s+/).filter(Boolean).map((h, i) => (
                  <span key={i} className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-lg text-brand-300 text-xs">
                    {h.startsWith('#') ? h : '#' + h}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Schedule */}
          {isEditable && (
            <div>
              <label className="text-xs text-white/40 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Clock size={12} /> Fecha y hora de publicación
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={e => setScheduledAt(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white/90 text-sm focus:outline-none focus:border-brand-500/40"
                style={{ colorScheme: 'dark' }}
              />
            </div>
          )}

          {/* Image prompt */}
          {post.imagePrompt && (
            <div>
              <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">Prompt de imagen (IA)</label>
              <div className="bg-white/3 border border-white/8 rounded-xl px-4 py-3 text-white/50 text-xs leading-relaxed">
                {post.imagePrompt}
              </div>
            </div>
          )}

          {/* Error reason */}
          {post.status === 'FAILED' && post.failReason && (
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs font-medium text-red-300 mb-1">Error al publicar</div>
                <div className="text-xs text-red-300/70">{post.failReason}</div>
              </div>
            </div>
          )}

          {/* All media */}
          {post.mediaUrls?.length > 0 && (
            <div>
              <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">Archivos de media</label>
              <div className="grid grid-cols-3 gap-2">
                {post.mediaUrls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer"
                    className="aspect-square rounded-xl overflow-hidden border border-white/10 hover:border-white/20 transition">
                    {(url.includes('.mp4') || url.includes('.mov')) ? (
                      <div className="w-full h-full bg-white/5 flex items-center justify-center">
                        <Video size={20} className="text-white/40" />
                      </div>
                    ) : (
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Media library picker modal */}
    {showPicker && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:"rgba(0,0,0,0.8)"}} onClick={() => setShowPicker(false)}>
        <div className="bg-gray-950 border border-white/10 rounded-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
            <h3 className="text-white font-semibold">Biblioteca de imágenes</h3>
            <button onClick={() => setShowPicker(false)} className="text-white/40 hover:text-white text-xl leading-none">×</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {loadingMedia ? (
              <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-white/40" /></div>
            ) : mediaItems.length === 0 ? (
              <div className="text-center py-12 text-white/30 text-sm">Sin imágenes en biblioteca. Sube fotos en la sección Media.</div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {mediaItems.map(item => (
                  <button key={item.id} onClick={() => pickMedia(item.url)}
                    className="aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-brand-400 transition relative group">
                    <img src={item.url} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-brand-500/0 group-hover:bg-brand-500/20 transition flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-medium bg-brand-600 px-2 py-1 rounded-lg transition">Usar</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="px-5 py-3 border-t border-white/8 text-xs text-white/30">
            Haz clic en una imagen para usarla en este post
          </div>
        </div>
      </div>
    )}
    </>
  )
}

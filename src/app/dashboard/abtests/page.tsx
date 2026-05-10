'use client'
import { useState, useEffect } from 'react'

interface PostSnippet {
  id: string
  caption?: string
  status: string
  thumbnailUrl?: string
  likes?: number
  comments?: number
  reach?: number
}

interface ABTestRecord {
  id: string
  name: string
  hypothesis?: string
  postARef: string
  postBRef?: string
  status: 'draft' | 'running' | 'completed'
  winnerId?: string
  startedAt?: string
  endedAt?: string
  createdAt: string
  postA?: PostSnippet | null
  postB?: PostSnippet | null
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'completed' ? 'bg-green-900/50 text-green-300 border border-green-700' :
    status === 'running'   ? 'bg-blue-900/50 text-blue-300 border border-blue-700 animate-pulse' :
    'bg-gray-700 text-gray-400 border border-gray-600'
  const label =
    status === 'completed' ? '✓ Finalizado' :
    status === 'running'   ? '▶ Corriendo' : '◎ Borrador'
  return <span className={'text-xs px-2 py-0.5 rounded-full ' + cls}>{label}</span>
}

function PostCard({
  post, label, isWinner, onPickWinner, canPick,
}: {
  post?: PostSnippet | null
  label: string
  isWinner: boolean
  onPickWinner?: () => void
  canPick: boolean
}) {
  if (!post) {
    return (
      <div className="flex-1 border border-dashed border-gray-600 rounded-xl p-4 flex items-center justify-center text-gray-500 text-sm min-h-[180px]">
        <span>⏳ Generando variante B…</span>
      </div>
    )
  }

  return (
    <div className={'flex-1 border rounded-xl p-4 space-y-2 transition-all ' +
      (isWinner ? 'border-yellow-500 bg-yellow-900/10' : 'border-gray-700 bg-gray-800/50')}>
      <div className="flex items-center justify-between">
        <span className={'text-xs font-bold ' + (label === 'A' ? 'text-violet-400' : 'text-blue-400')}>
          VARIANTE {label}
        </span>
        {isWinner && <span className="text-xs text-yellow-400">🏆 Ganadora</span>}
      </div>

      <p className="text-sm text-gray-300 line-clamp-4 leading-relaxed">
        {post.caption || '(sin caption)'}
      </p>

      {(post.likes != null || post.reach != null) && (
        <div className="grid grid-cols-3 gap-2 pt-1">
          {post.likes != null && (
            <div className="bg-gray-700/50 rounded-lg p-2 text-center">
              <div className="text-sm font-bold text-white">{post.likes}</div>
              <div className="text-xs text-gray-400">Likes</div>
            </div>
          )}
          {post.comments != null && (
            <div className="bg-gray-700/50 rounded-lg p-2 text-center">
              <div className="text-sm font-bold text-white">{post.comments}</div>
              <div className="text-xs text-gray-400">Coment.</div>
            </div>
          )}
          {post.reach != null && (
            <div className="bg-gray-700/50 rounded-lg p-2 text-center">
              <div className="text-sm font-bold text-white">{post.reach}</div>
              <div className="text-xs text-gray-400">Alcance</div>
            </div>
          )}
        </div>
      )}

      {canPick && !isWinner && (
        <button
          onClick={onPickWinner}
          className="w-full mt-2 px-3 py-1.5 bg-yellow-600/20 hover:bg-yellow-600/40 border border-yellow-600/50 text-yellow-300 text-xs rounded-lg transition-colors"
        >
          🏆 Marcar como ganadora
        </button>
      )}
    </div>
  )
}

export default function ABTestsPage() {
  const [tests, setTests]         = useState<ABTestRecord[]>([])
  const [posts, setPosts]         = useState<PostSnippet[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [creating, setCreating]   = useState(false)

  const [selectedPost, setSelectedPost] = useState('')
  const [testName, setTestName]         = useState('')
  const [hypothesis, setHypothesis]     = useState('')

  async function fetchAll() {
    const [testsRes, postsRes] = await Promise.all([
      fetch('/api/abtests'),
      fetch('/api/posts?status=published&limit=30'),
    ])
    if (testsRes.ok) setTests(await testsRes.json())
    if (postsRes.ok) {
      const data = await postsRes.json()
      setPosts(Array.isArray(data) ? data : data.posts || [])
    }
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedPost) return
    setCreating(true)
    const res = await fetch('/api/abtests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postARef: selectedPost,
        name: testName || undefined,
        hypothesis: hypothesis || undefined,
      }),
    })
    if (res.ok) {
      await fetchAll()
      setShowForm(false)
      setSelectedPost('')
      setTestName('')
      setHypothesis('')
    }
    setCreating(false)
  }

  async function updateStatus(id: string, status: string) {
    const res = await fetch('/api/abtests/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      const updated = await res.json()
      setTests(prev => prev.map(t => t.id === id ? { ...t, ...updated } : t))
    }
  }

  async function pickWinner(testId: string, postId: string) {
    const res = await fetch('/api/abtests/' + testId, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ winnerId: postId, status: 'completed' }),
    })
    if (res.ok) {
      const updated = await res.json()
      setTests(prev => prev.map(t => t.id === testId ? { ...t, ...updated } : t))
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este test?')) return
    await fetch('/api/abtests/' + id, { method: 'DELETE' })
    setTests(prev => prev.filter(t => t.id !== id))
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">A/B Testing</h1>
          <p className="text-sm text-gray-400 mt-1">Compara variantes de copy y descubre qué conecta más</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          + Nuevo Test
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Crear A/B Test</h2>
          <p className="text-sm text-gray-400">La IA generará automáticamente la Variante B con un hook y tono diferentes.</p>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Post base (Variante A) *</label>
            <select
              value={selectedPost}
              onChange={e => setSelectedPost(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
              required
            >
              <option value="">— Selecciona un post publicado —</option>
              {posts.map(p => (
                <option key={p.id} value={p.id}>
                  {(p.caption || '').slice(0, 80) || p.id}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Nombre del test (opcional)</label>
            <input
              value={testName}
              onChange={e => setTestName(e.target.value)}
              placeholder="ej: Hook aspiracional vs directo — Junio"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Hipótesis (opcional)</label>
            <textarea
              value={hypothesis}
              onChange={e => setHypothesis(e.target.value)}
              placeholder="ej: Un hook directo con precio generará más guardados que uno aspiracional"
              rows={2}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={creating}
              className="px-5 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
            >
              {creating ? 'Creando…' : '🧪 Crear Test'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-16 text-gray-500">Cargando…</div>
      ) : tests.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-700 rounded-xl">
          <div className="text-4xl mb-3">🧪</div>
          <p className="text-gray-400">No hay tests aún. Crea uno para empezar a optimizar tu copy.</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm"
          >
            Crear primer test
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {tests.map(t => (
            <div key={t.id} className="bg-gray-800 border border-gray-700 rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={t.status} />
                    {t.startedAt && (
                      <span className="text-xs text-gray-500">
                        Iniciado: {new Date(t.startedAt).toLocaleDateString('es-CL')}
                      </span>
                    )}
                  </div>
                  <h3 className="text-white font-medium">{t.name}</h3>
                  {t.hypothesis && (
                    <p className="text-xs text-gray-400 mt-0.5 italic">"{t.hypothesis}"</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {t.status === 'draft' && (
                    <button
                      onClick={() => updateStatus(t.id, 'running')}
                      className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-600/50 text-blue-300 text-xs rounded-lg transition-colors"
                    >
                      ▶ Iniciar
                    </button>
                  )}
                  {t.status === 'running' && !t.winnerId && (
                    <button
                      onClick={() => updateStatus(t.id, 'completed')}
                      className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg transition-colors"
                    >
                      ■ Finalizar
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-red-900/50 text-gray-400 hover:text-red-400 text-xs rounded-lg transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <PostCard
                  post={t.postA}
                  label="A"
                  isWinner={t.winnerId === t.postARef}
                  canPick={t.status === 'running' && !t.winnerId}
                  onPickWinner={() => pickWinner(t.id, t.postARef)}
                />
                <PostCard
                  post={t.postB}
                  label="B"
                  isWinner={!!(t.postBRef && t.winnerId === t.postBRef)}
                  canPick={t.status === 'running' && !t.winnerId && !!t.postBRef}
                  onPickWinner={() => t.postBRef && pickWinner(t.id, t.postBRef)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

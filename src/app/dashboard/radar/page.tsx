'use client'
import { useEffect, useState } from 'react'

const TC: Record<number, string> = { 1: '#ef4444', 2: '#f97316', 3: '#22c55e' }

type Comp = {
  id: string; name: string; handle: string; platform: string; tier: number
  active: boolean; followersCount: number | null; notes: string | null
  _count: { posts: number }; posts: { id: string }[]
}
type Post = {
  id: string; caption: string | null; mediaUrl: string | null; mediaType: string | null
  likesCount: number; commentsCount: number; viewsCount: number
  isViral: boolean; viralScore: number; postUrl: string | null; recreated: boolean
  competitor: { name: string; handle: string; tier: number; avatarUrl: string | null }
}
type Rec = { analysis: string; hook: string; caption: string; contentType: string; imagePrompt: string }
const EF = { name: '', handle: '', platform: 'instagram', tier: '2', notes: '' }

export default function RadarPage() {
  const [tab, setTab]       = useState<'viral' | 'all' | 'manage'>('viral')
  const [posts, setPosts]   = useState<Post[]>([])
  const [comps, setComps]   = useState<Comp[]>([])
  const [loading, setLoading]     = useState(false)
  const [fetching, setFetching]   = useState(false)
  const [fetchMsg, setFetchMsg]   = useState('')
  const [sel, setSel]       = useState<Post | null>(null)
  const [rec, setRec]       = useState<Rec | null>(null)
  const [recing, setRecing] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]     = useState(EF)
  const [saving, setSaving] = useState(false)
  const [fErr, setFErr]     = useState('')
  const [fOk, setFOk]       = useState('')
  const [editId, setEditId] = useState<string | null>(null)

  useEffect(() => { loadComps(); if (tab !== 'manage') loadPosts() }, [tab])

  async function loadPosts() {
    setLoading(true)
    const r = await fetch(`/api/radar/posts${tab === 'viral' ? '?viral=true' : ''}`)
    if (r.ok) setPosts(await r.json())
    setLoading(false)
  }
  async function loadComps() {
    const r = await fetch('/api/radar/competitors')
    if (r.ok) setComps(await r.json())
  }
  async function doFetch() {
    setFetching(true); setFetchMsg('')
    try {
      const r = await fetch('/api/radar/fetch')
      const d = await r.json()
      setFetchMsg(d.demo ? '⚠️ Modo demo — agrega APIFY_TOKEN en .env del servidor' : `✅ ${d.fetched} posts · ${d.viral} virales detectados`)
      await loadPosts(); await loadComps()
    } catch { setFetchMsg('❌ Error al conectar') }
    setFetching(false)
  }
  async function doSave() {
    setSaving(true); setFErr(''); setFOk('')
    if (!form.handle.trim()) { setFErr('Handle obligatorio'); setSaving(false); return }
    const r = await fetch('/api/radar/competitors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const d = await r.json()
    if (!r.ok) { setFErr(d.error || 'Error al guardar') }
    else { setFOk(`✅ @${d.handle} agregado`); setForm(EF); loadComps(); setTimeout(() => { setShowForm(false); setFOk('') }, 1500) }
    setSaving(false)
  }
  async function toggleActive(c: Comp) {
    await fetch(`/api/radar/competitors/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !c.active }),
    })
    loadComps()
  }
  async function setTier(id: string, tier: number) {
    await fetch(`/api/radar/competitors/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier }),
    })
    setEditId(null); loadComps()
  }
  async function doDelete(id: string) {
    if (!confirm('¿Desactivar competidor? Se conserva el historial de posts.')) return
    await fetch(`/api/radar/competitors/${id}`, { method: 'DELETE' })
    loadComps()
  }
  async function doRecrear(p: Post) {
    setSel(p); setRec(null); setRecing(true)
    const r = await fetch('/api/radar/recreate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId: p.id }),
    })
    if (r.ok) setRec(await r.json())
    else setRec({ analysis: 'Error al conectar con IA', hook: '', caption: '', contentType: 'foto', imagePrompt: '' })
    setRecing(false); loadPosts()
  }

  const activeComps = comps.filter(c => c.active)
  const totalViral  = comps.reduce((a, c) => a + (c.posts?.length || 0), 0)
  const totalPosts  = comps.reduce((a, c) => a + (c._count?.posts || 0), 0)

  const S: Record<string, any> = {
    btn:   (bg: string, c = '#fff') => ({ background: bg, color: c, border: 'none', padding: '9px 18px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }),
    input: { width: '100%', background: '#0a0a12', border: '1px solid #2a2a4e', color: '#e2e2e8', padding: '10px 14px', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' as const },
    card:  { background: '#0d0d18', border: '1px solid #1e1e2e', borderRadius: 8, padding: '16px 18px' },
    label: { fontSize: 11, color: '#6b6b8a', display: 'block' as const, marginBottom: 6, letterSpacing: 1 },
    tag:   (c: string) => ({ fontSize: 10, padding: '2px 7px', borderRadius: 3, background: `${c}20`, color: c, border: `1px solid ${c}40` }),
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#e2e2e8' }}>🔥 Radar de Competencia</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b6b8a' }}>Monitoreo Instagram en tiempo real · Detecta posts virales · Recrea con IA</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => { setShowForm(true); setFErr(''); setFOk('') }} style={{ ...S.btn('#1a1a2e', '#a78bfa'), border: '1px solid #3a1a6e' }}>+ Agregar competidor</button>
          <button onClick={doFetch} disabled={fetching} style={S.btn(fetching ? '#2a1a4e' : '#7c3aed')}>{fetching ? '⏳ Actualizando...' : '🔄 Actualizar ahora'}</button>
        </div>
      </div>

      {fetchMsg && <div style={{ ...S.card, marginBottom: 20, fontSize: 13, color: '#b0b0c8', padding: '10px 16px' }}>{fetchMsg}</div>}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { l: 'Competidores', v: activeComps.length,            c: '#a78bfa' },
          { l: 'Posts totales', v: totalPosts,                   c: '#60a5fa' },
          { l: '🔥 Virales',   v: totalViral,                   c: '#ef4444' },
          { l: '✅ Recreados', v: posts.filter(p => p.recreated).length, c: '#22c55e' },
        ].map(s => (
          <div key={s.l} style={S.card}>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.c }}>{s.v}</div>
            <div style={{ fontSize: 11, color: '#4a4a6a', marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1e1e2e', marginBottom: 24 }}>
        {([['viral', '🔥 Virales'], ['all', 'Todos'], ['manage', '⚙️ Gestionar']] as const).map(([id, lb]) => (
          <button key={id} onClick={() => setTab(id)} style={{ background: 'none', border: 'none', padding: '10px 18px', fontSize: 13, cursor: 'pointer', color: tab === id ? '#a78bfa' : '#4a4a6a', borderBottom: tab === id ? '2px solid #7c3aed' : '2px solid transparent', marginBottom: -1, fontFamily: 'inherit', fontWeight: tab === id ? 600 : 400 }}>{lb}</button>
        ))}
      </div>

      {/* ===== GESTIONAR ===== */}
      {tab === 'manage' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 13, color: '#6b6b8a' }}>{activeComps.length} activos · {comps.filter(c => !c.active).length} inactivos</span>
            <button onClick={() => { setShowForm(true); setFErr(''); setFOk('') }} style={S.btn('#7c3aed')}>+ Nuevo</button>
          </div>
          {comps.length === 0 && (
            <div style={{ textAlign: 'center', color: '#4a4a6a', padding: 60 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📡</div>
              <div>No hay competidores aún. Agrega el primero.</div>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {comps.map(c => (
              <div key={c.id} style={{ background: '#0d0d18', border: `1px solid ${c.active ? '#1e1e2e' : '#0f0f1a'}`, borderLeft: `3px solid ${c.active ? TC[c.tier] : '#2a2a3a'}`, borderRadius: 8, padding: '14px 18px', opacity: c.active ? 1 : 0.5, display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#e2e2e8' }}>{c.name}</span>
                    <a href={`https://instagram.com/${c.handle}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#a78bfa', textDecoration: 'none' }}>@{c.handle} ↗</a>
                    <span style={S.tag(TC[c.tier])}>TIER {c.tier}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 14, fontSize: 12, color: '#6b6b8a', flexWrap: 'wrap' }}>
                    <span>👥 {(c.followersCount || 0).toLocaleString()}</span>
                    <span>📄 {c._count?.posts || 0} posts</span>
                    <span style={{ color: '#ef4444' }}>🔥 {c.posts?.length || 0} virales</span>
                    {c.notes && <span>· {c.notes}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {editId === c.id ? (
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[1, 2, 3].map(t => (
                        <button key={t} onClick={() => setTier(c.id, t)} style={{ background: c.tier === t ? TC[t] : '#1a1a2e', color: c.tier === t ? '#fff' : TC[t], border: `1px solid ${TC[t]}`, padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>T{t}</button>
                      ))}
                      <button onClick={() => setEditId(null)} style={{ background: 'none', border: 'none', color: '#4a4a6a', cursor: 'pointer', fontSize: 16 }}>✕</button>
                    </div>
                  ) : (
                    <button onClick={() => setEditId(c.id)} style={{ background: '#1a1a2e', color: '#6b6b8a', border: '1px solid #2a2a3e', padding: '5px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>Tier</button>
                  )}
                  <button onClick={() => toggleActive(c)} style={{ background: c.active ? '#1a2a1a' : '#1a1a2e', color: c.active ? '#22c55e' : '#4a4a6a', border: `1px solid ${c.active ? '#22c55e40' : '#2a2a3e'}`, padding: '5px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>{c.active ? 'Activo' : 'Inactivo'}</button>
                  <button onClick={() => doDelete(c.id)} style={{ background: 'none', border: '1px solid #2a1a1a', color: '#4a2a2a', padding: '5px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>🗑</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== POSTS ===== */}
      {tab !== 'manage' && (
        loading ? (
          <div style={{ textAlign: 'center', color: '#4a4a6a', padding: 60 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📡</div>
            <div>Cargando posts...</div>
          </div>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#4a4a6a', padding: 60 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: 15, marginBottom: 8 }}>Sin posts aún</div>
            <div style={{ fontSize: 13 }}>Agrega competidores y haz clic en "Actualizar ahora" para traer sus posts</div>
            <div style={{ fontSize: 12, marginTop: 6, color: '#3a3a5a' }}>Requiere APIFY_TOKEN · Plan gratis en apify.com</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
            {posts.map(p => (
              <div key={p.id} style={{ background: '#0d0d18', border: `1px solid ${p.isViral ? '#7c3aed50' : '#1e1e2e'}`, borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {p.mediaUrl && (
                  <div style={{ height: 180, background: '#050508', overflow: 'hidden', flexShrink: 0 }}>
                    <img src={p.mediaUrl ? '/api/img-proxy?url=' + encodeURIComponent(p.mediaUrl) : ''} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  </div>
                )}
                <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: TC[p.competitor?.tier] || '#a78bfa', fontWeight: 700 }}>
                        {p.competitor?.name?.[0]}
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e2e8' }}>{p.competitor?.name}</div>
                        <div style={{ fontSize: 10, color: '#4a4a6a' }}>@{p.competitor?.handle}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {p.isViral && <span style={S.tag('#a78bfa')}>🔥 Viral</span>}
                      {p.recreated && <span style={S.tag('#22c55e')}>✅</span>}
                    </div>
                  </div>
                  {p.caption && (
                    <p style={{ fontSize: 12, color: '#8888aa', margin: '0 0 10px', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden', flex: 1 }}>
                      {p.caption}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: 10, fontSize: 12, color: '#6b6b8a', marginBottom: 12 }}>
                    <span>❤️ {p.likesCount?.toLocaleString()}</span>
                    <span>💬 {p.commentsCount?.toLocaleString()}</span>
                    {p.viewsCount > 0 && <span>▶️ {p.viewsCount?.toLocaleString()}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                    <button onClick={() => doRecrear(p)} disabled={recing && sel?.id === p.id} style={{ ...S.btn('#7c3aed'), flex: 1 }}>
                      {recing && sel?.id === p.id ? '⏳ Analizando...' : '⚡ Recrear con IA'}
                    </button>
                    {p.postUrl && (
                      <a href={p.postUrl} target="_blank" rel="noreferrer" style={{ background: '#1a1a2e', color: '#a78bfa', border: '1px solid #2a2a4e', padding: '9px 12px', borderRadius: 6, fontSize: 12, textDecoration: 'none' }}>↗</a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ===== MODAL: AGREGAR COMPETIDOR ===== */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: '#000000dd', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }} onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <div style={{ background: '#0d0d18', border: '1px solid #3a1a6e', borderRadius: 12, padding: 28, width: '100%', maxWidth: 460 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#e2e2e8' }}>+ Agregar Competidor</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: '#6b6b8a', cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={S.label}>HANDLE DE INSTAGRAM *</label>
                <input value={form.handle} onChange={e => setForm(f => ({ ...f, handle: e.target.value }))} placeholder="@rollercrown o rollercrown" style={S.input} />
              </div>
              <div>
                <label style={S.label}>NOMBRE (opcional)</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Roller Crown Chile" style={S.input} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={S.label}>PLATAFORMA</label>
                  <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))} style={S.input}>
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                  </select>
                </div>
                <div>
                  <label style={S.label}>NIVEL DE AMENAZA</label>
                  <select value={form.tier} onChange={e => setForm(f => ({ ...f, tier: e.target.value }))} style={S.input}>
                    <option value="1">Tier 1 — Alto</option>
                    <option value="2">Tier 2 — Medio</option>
                    <option value="3">Tier 3 — Inspiración</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={S.label}>NOTAS (opcional)</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Ej: Especialista toldos, muy activo en reels" style={S.input} />
              </div>
              {fErr && <div style={{ fontSize: 12, color: '#ef4444', padding: '8px 12px', background: '#1a0a0a', borderRadius: 6 }}>❌ {fErr}</div>}
              {fOk  && <div style={{ fontSize: 12, color: '#22c55e', padding: '8px 12px', background: '#0a1a0a', borderRadius: 6 }}>{fOk}</div>}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button onClick={() => setShowForm(false)} style={{ ...S.btn('none', '#6b6b8a'), flex: 1, border: '1px solid #2a2a3e' }}>Cancelar</button>
                <button onClick={doSave} disabled={saving} style={{ ...S.btn(saving ? '#3a1a6e' : '#7c3aed'), flex: 2 }}>{saving ? 'Guardando...' : '+ Agregar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: RECREACIÓN IA ===== */}
      {sel && (
        <div style={{ position: 'fixed', inset: 0, background: '#000000cc', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }} onClick={e => { if (e.target === e.currentTarget) { setSel(null); setRec(null) } }}>
          <div style={{ background: '#0d0d18', border: '1px solid #3a1a6e', borderRadius: 12, padding: 28, maxWidth: 560, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 16, color: '#e2e2e8' }}>⚡ Recreación con IA</h2>
              <button onClick={() => { setSel(null); setRec(null) }} style={{ background: 'none', border: 'none', color: '#6b6b8a', cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>
            <div style={{ fontSize: 12, color: '#4a4a6a', marginBottom: 16 }}>Post de <span style={{ color: '#a78bfa' }}>@{sel.competitor?.handle}</span> · {sel.likesCount?.toLocaleString()} likes</div>
            {recing ? (
              <div style={{ textAlign: 'center', padding: 48, color: '#6b6b8a' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🤖</div>
                <div>Claude está analizando y recreando el post...</div>
              </div>
            ) : rec ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Block c="#60a5fa" l="📊 ANÁLISIS">{rec.analysis}</Block>
                <Block c="#f97316" l="🎣 HOOK"><strong style={{ fontSize: 14, color: '#e2e2e8' }}>{rec.hook}</strong></Block>
                <Block c="#22c55e" l="📝 CAPTION">
                  <span style={{ whiteSpace: 'pre-wrap' }}>{rec.caption}</span>
                  <Copy text={rec.caption} />
                </Block>
                {rec.imagePrompt && (
                  <Block c="#a78bfa" l="🎨 PROMPT IMAGEN">
                    <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{rec.imagePrompt}</span>
                    <Copy text={rec.imagePrompt} label="Copiar prompt" />
                  </Block>
                )}
                <div style={{ fontSize: 12, color: '#4a4a6a', padding: '8px 12px', background: '#050508', borderRadius: 6 }}>
                  💡 Formato sugerido: <strong style={{ color: '#e2e2e8' }}>{rec.contentType}</strong>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}

function Block({ l, c, children }: { l: string; c: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#0f0f1a', borderRadius: 8, padding: 16 }}>
      <div style={{ fontSize: 10, color: c, letterSpacing: 1, marginBottom: 8, fontWeight: 700 }}>{l}</div>
      <div style={{ fontSize: 13, color: '#b0b0c8', lineHeight: 1.75 }}>{children}</div>
    </div>
  )
}

function Copy({ text, label = 'Copiar' }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 2000) }}
      style={{ display: 'block', marginTop: 10, background: 'none', border: '1px solid #2a2a4e', color: '#a78bfa', padding: '5px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}
    >
      {ok ? '✓ Copiado' : label}
    </button>
  )
}

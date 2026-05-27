'use client'
import { useEffect, useState } from 'react'

type Post = {
  id: string; postId: string; caption: string | null; recreatedCaption: string | null
  recreatedAt: string | null; mediaUrl: string | null; postUrl: string | null
  likesCount: number; isViral: boolean
  competitor: { name: string; handle: string; tier: number }
}

export default function RecreationsPage() {
  const [posts, setPosts]   = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [sel, setSel]       = useState<Post | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [drafting, setDrafting] = useState<string | null>(null)
  const [drafted, setDrafted] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/radar/posts?recreated=true')
      .then(r => r.ok ? r.json() : [])
      .then(d => { setPosts(d); setLoading(false) })
  }, [])

  function copy(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  async function createDraft(p: Post) {
    if (!p.recreatedCaption) return
    setDrafting(p.id)
    try {
      const r = await fetch('/api/radar/recreations/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption: p.recreatedCaption, competitorHandle: p.competitor?.handle }),
      })
      if (r.ok) {
        setDrafted(p.id)
        setTimeout(() => setDrafted(null), 3000)
      }
    } finally {
      setDrafting(null)
    }
  }

  const C = { background: '#0d0d18', border: '1px solid #1e1e2e', borderRadius: 8, padding: '16px 18px' }
  const B = (bg: string, c = '#fff') => ({ background: bg, color: c, border: 'none', padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' } as const)

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: '#4a4a6a' }}>Cargando recreaciones...</div>

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#e2e2e8' }}>Recreaciones con IA</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b6b8a' }}>
          Posts de competidores que recreaste — captions y prompts listos para usar
        </p>
      </div>

      <div style={{ fontSize: 13, color: '#4a4a6a', marginBottom: 20, padding: '12px 16px', background: '#0a0a12', borderRadius: 8, border: '1px solid #1e1e2e' }}>
        Como funciona: El boton Recrear analiza un post viral de un competidor y genera para ti un caption adaptado a tu marca + un prompt de imagen para crear tu propia foto con Midjourney o DALL-E. Tu pones tu propia foto y usas el caption generado para publicar en tus redes.
      </div>

      {posts.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#4a4a6a', padding: 60 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>empty</div>
          <div style={{ fontSize: 15, marginBottom: 8 }}>Sin recreaciones aun</div>
          <div style={{ fontSize: 13 }}>Ve a Radar de Competencia, haz clic en un post y presiona Recrear con IA</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))', gap: 16 }}>
          {posts.map(p => (
            <div key={p.id} style={{ ...C, display: 'flex', flexDirection: 'column', gap: 12, border: '1px solid #22c55e30' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, color: '#e2e2e8', fontWeight: 600 }}>{p.competitor?.name}</div>
                  <div style={{ fontSize: 10, color: '#4a4a6a' }}>@{p.competitor?.handle} · {p.likesCount?.toLocaleString()} likes</div>
                </div>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 3, background: '#22c55e20', color: '#22c55e', border: '1px solid #22c55e40' }}>Recreado</span>
              </div>

              {p.mediaUrl && (
                <div style={{ height: 160, background: '#050508', borderRadius: 6, overflow: 'hidden' }}>
                  <img src={'/api/img-proxy?url=' + encodeURIComponent(p.mediaUrl)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                </div>
              )}

              <div>
                <div style={{ fontSize: 10, color: '#4a4a6a', marginBottom: 4 }}>POST ORIGINAL</div>
                <div style={{ fontSize: 12, color: '#6b6b8a', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }}>
                  {p.caption || 'Sin caption'}
                </div>
              </div>

              {p.recreatedCaption && (
                <div style={{ background: '#060610', border: '1px solid #22c55e20', borderRadius: 6, padding: 12 }}>
                  <div style={{ fontSize: 10, color: '#22c55e', letterSpacing: 1, marginBottom: 6, fontWeight: 700 }}>TU CAPTION GENERADO</div>
                  <div style={{ fontSize: 12, color: '#b0b0c8', lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: 120, overflow: 'auto' }}>
                    {p.recreatedCaption}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button
                      onClick={() => copy(p.recreatedCaption!, p.id)}
                      style={{ ...B(copied === p.id ? '#0a2a1a' : '#0a0a18', copied === p.id ? '#22c55e' : '#a78bfa'), border: '1px solid ' + (copied === p.id ? '#22c55e' : '#2a2a4e'), transition: 'all .2s' }}
                    >
                      {copied === p.id ? 'Copiado!' : 'Copiar'}
                    </button>
                    <button
                      onClick={() => createDraft(p)}
                      disabled={drafting === p.id}
                      style={{ ...B(drafted === p.id ? '#0a2a1a' : '#1e1040', drafted === p.id ? '#22c55e' : '#c4b5fd'), border: '1px solid ' + (drafted === p.id ? '#22c55e30' : '#3b1f8c'), transition: 'all .2s' }}
                    >
                      {drafted === p.id ? 'Borrador creado!' : drafting === p.id ? '...' : 'Crear borrador'}
                    </button>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                <button onClick={() => setSel(p)} style={{ ...B('#7c3aed'), flex: 1 }}>Ver completo</button>
                {p.postUrl && (
                  <a href={p.postUrl} target="_blank" rel="noreferrer" style={{ ...B('#1a1a2e', '#a78bfa'), border: '1px solid #2a2a4e', textDecoration: 'none' }}>Original</a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full view modal */}
      {sel && (
        <div style={{ position: 'fixed', inset: 0, background: '#000000e0', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }} onClick={e => { if (e.target === e.currentTarget) setSel(null) }}>
          <div style={{ background: '#0d0d18', border: '1px solid #22c55e', borderRadius: 14, padding: 28, maxWidth: 580, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 16, color: '#e2e2e8' }}>Recreacion completa</h2>
              <button onClick={() => setSel(null)} style={{ background: '#1a1a2e', border: '1px solid #2a2a4e', color: '#a78bfa', cursor: 'pointer', borderRadius: 6, padding: '5px 14px', fontSize: 13, fontFamily: 'inherit' }}>Cerrar</button>
            </div>
            <div style={{ fontSize: 12, color: '#4a4a6a', marginBottom: 20 }}>Post de @{sel.competitor?.handle} · {sel.likesCount?.toLocaleString()} likes</div>
            {sel.recreatedCaption && (
              <div style={{ background: '#060610', border: '1px solid #22c55e20', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: '#22c55e', letterSpacing: 1, marginBottom: 8, fontWeight: 700 }}>CAPTION GENERADO — LISTO PARA PUBLICAR</div>
                <div style={{ fontSize: 13, color: '#b0b0c8', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{sel.recreatedCaption}</div>
                <button onClick={() => copy(sel.recreatedCaption!, 'modal')} style={{ ...B(copied === 'modal' ? '#0a2a1a' : '#0a0a18', copied === 'modal' ? '#22c55e' : '#a78bfa'), border: '1px solid ' + (copied === 'modal' ? '#22c55e' : '#2a2a4e'), marginTop: 12, transition: 'all .2s' }}>
                  {copied === 'modal' ? 'Copiado!' : 'Copiar caption completo'}
                </button>
              </div>
            )}
            <div style={{ fontSize: 12, color: '#4a4a6a', padding: '10px 14px', background: '#050508', borderRadius: 6 }}>
              Siguiente paso: Crea tu propia foto usando el prompt de imagen que se genero en Radar, o usa una foto tuya del producto. Luego pega este caption en Instagram o Facebook al publicar.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

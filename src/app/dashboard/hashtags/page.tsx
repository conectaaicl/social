'use client'
import { useEffect, useState } from 'react'

type Monitor = { id: string; hashtag: string; active: boolean; lastScan: string | null; _count: { leads: number } }
type Lead = { id: string; username: string; caption: string | null; postUrl: string | null; likesCount: number; commentsCount: number; followersCount: number | null; bio: string | null; converted: boolean; monitor: { hashtag: string } }

export default function HashtagsPage() {
  const [monitors, setMonitors]     = useState<Monitor[]>([])
  const [leads, setLeads]           = useState<Lead[]>([])
  const [tab, setTab]               = useState<'monitor' | 'leads'>('monitor')
  const [newTag, setNewTag]         = useState('')
  const [adding, setAdding]         = useState(false)
  const [scanning, setScanning]     = useState(false)
  const [msg, setMsg]               = useState('')
  const [selMonitor, setSelMonitor] = useState<string | null>(null)

  useEffect(() => { loadAll() }, [])
  useEffect(() => { loadLeads() }, [selMonitor])

  async function loadAll() { loadMonitors(); loadLeads() }
  async function loadMonitors() {
    const r = await fetch('/api/radar/hashtags'); if (r.ok) setMonitors(await r.json())
  }
  async function loadLeads() {
    const url = '/api/radar/hashtags/scan' + (selMonitor ? '?monitorId=' + selMonitor : '')
    const r = await fetch(url); if (r.ok) setLeads(await r.json())
  }
  async function addTag() {
    if (!newTag.trim()) return; setAdding(true)
    const r = await fetch('/api/radar/hashtags', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hashtag: newTag }) })
    if (r.ok) { setNewTag(''); loadMonitors() }
    setAdding(false)
  }
  async function del(id: string) {
    if (!confirm('Eliminar hashtag y sus leads?')) return
    await fetch('/api/radar/hashtags', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    loadMonitors()
  }
  async function scan(monitorId?: string) {
    setScanning(true); setMsg('')
    const r = await fetch('/api/radar/hashtags/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ monitorId }) })
    const d = await r.json()
    setMsg(r.ok ? (d.new + ' leads nuevos de ' + d.total + ' posts escaneados') : ('Error: ' + (d.error || 'fallo')))
    if (r.ok) { loadMonitors(); loadLeads() }
    setScanning(false)
  }

  const B = (bg: string, c = '#fff') => ({ background: bg, color: c, border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' } as const)
  const C = { background: '#0d0d18', border: '1px solid #1e1e2e', borderRadius: 8, padding: '16px 18px' }
  const I = { background: '#0a0a12', border: '1px solid #2a2a4e', color: '#e2e2e8', padding: '9px 14px', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }
  const T = (c: string) => ({ fontSize: 10, padding: '2px 8px', borderRadius: 3, background: c + '20', color: c, border: '1px solid ' + c + '40' } as const)

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#e2e2e8' }}>Hashtag Monitor</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b6b8a' }}>Detecta cuentas que buscan productos como los tuyos y conviertelas en clientes</p>
        </div>
        <button onClick={() => scan()} disabled={scanning} style={B(scanning ? '#2a1a4e' : '#7c3aed')}>{scanning ? 'Escaneando...' : 'Escanear todos ahora'}</button>
      </div>

      {msg && <div style={{ ...C, marginBottom: 20, fontSize: 13, color: '#22c55e', padding: '10px 16px' }}>{msg}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 12, marginBottom: 24 }}>
        {[{ l: 'Hashtags', v: monitors.length, c: '#a78bfa' }, { l: 'Leads', v: leads.length, c: '#22c55e' }, { l: 'Convertidos', v: leads.filter(l => l.converted).length, c: '#f97316' }].map(s => (
          <div key={s.l} style={C}><div style={{ fontSize: 24, fontWeight: 700, color: s.c }}>{s.v}</div><div style={{ fontSize: 11, color: '#4a4a6a', marginTop: 2 }}>{s.l}</div></div>
        ))}
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid #1e1e2e', marginBottom: 24 }}>
        {([['monitor', 'Hashtags'], ['leads', 'Leads capturados']] as const).map(([id, lb]) => (
          <button key={id} onClick={() => setTab(id)} style={{ background: 'none', border: 'none', padding: '10px 18px', fontSize: 13, cursor: 'pointer', color: tab === id ? '#a78bfa' : '#4a4a6a', borderBottom: tab === id ? '2px solid #7c3aed' : '2px solid transparent', marginBottom: -1, fontFamily: 'inherit', fontWeight: tab === id ? 600 : 400 }}>{lb}</button>
        ))}
      </div>

      {tab === 'monitor' && (
        <div>
          <div style={{ ...C, marginBottom: 20, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: '#a78bfa', fontSize: 18, fontWeight: 700 }}>#</span>
            <input value={newTag} onChange={e => setNewTag(e.target.value.replace(/^#/, ''))} onKeyDown={e => e.key === 'Enter' && addTag()} placeholder="toldos, cortinas, persianas, decoracion hogar..." style={{ ...I, flex: 1, minWidth: 200 }} />
            <button onClick={addTag} disabled={adding} style={B('#7c3aed')}>{adding ? 'Agregando...' : 'Agregar'}</button>
          </div>
          <div style={{ fontSize: 12, color: '#4a4a6a', marginBottom: 16 }}>Agrega hashtags que usan tus clientes potenciales. El sistema detecta sus posts y te entrega el usuario para que los contactes.</div>
          {monitors.length === 0 && <div style={{ textAlign: 'center', color: '#4a4a6a', padding: 60 }}>Agrega tu primer hashtag para capturar leads</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {monitors.map(m => (
              <div key={m.id} style={{ ...C, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 20, color: '#a78bfa', fontWeight: 700 }}>#</span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e2e8' }}>#{m.hashtag}</div>
                    <div style={{ fontSize: 12, color: '#4a4a6a' }}>{m._count.leads} leads{m.lastScan ? ' · ' + new Date(m.lastScan).toLocaleDateString('es-CL') : ' · Sin escanear'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setSelMonitor(m.id); setTab('leads') }} style={{ ...B('#1a1a2e', '#a78bfa'), border: '1px solid #2a2a4e', fontSize: 12 }}>Ver leads</button>
                  <button onClick={() => scan(m.id)} disabled={scanning} style={{ ...B('#1a1a6e', '#a78bfa'), border: '1px solid #2a2a6e', fontSize: 12 }}>Escanear</button>
                  <button onClick={() => del(m.id)} style={{ background: 'none', border: '1px solid #2a1a1a', color: '#6a2a2a', padding: '6px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'leads' && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <select value={selMonitor || ''} onChange={e => setSelMonitor(e.target.value || null)} style={{ ...I, minWidth: 200 }}>
              <option value="">Todos los hashtags</option>
              {monitors.map(m => <option key={m.id} value={m.id}>#{m.hashtag}</option>)}
            </select>
          </div>
          {leads.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#4a4a6a', padding: 60 }}>Sin leads aun — haz clic en Escanear para encontrar cuentas usando tus hashtags</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 14 }}>
              {leads.map(lead => (
                <div key={lead.id} style={{ ...C, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#e2e2e8', fontSize: 14 }}>@{lead.username}</div>
                      <div style={{ fontSize: 11, color: '#4a4a6a' }}>#{lead.monitor.hashtag}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {lead.converted && <span style={T('#22c55e')}>Convertido</span>}
                      {lead.followersCount && lead.followersCount > 1000 && <span style={T('#f97316')}>{(lead.followersCount/1000).toFixed(1)}k</span>}
                    </div>
                  </div>
                  {lead.bio && <div style={{ fontSize: 12, color: '#6b6b8a', lineHeight: 1.5 }}>{lead.bio}</div>}
                  {lead.caption && <div style={{ fontSize: 12, color: '#8888aa', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }}>{lead.caption}</div>}
                  <div style={{ display: 'flex', gap: 10, fontSize: 11, color: '#4a4a6a' }}>
                    <span>{lead.likesCount} likes</span><span>{lead.commentsCount} comentarios</span>
                    {lead.followersCount && <span>{lead.followersCount.toLocaleString()} seg</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    {lead.postUrl && <a href={lead.postUrl} target="_blank" rel="noreferrer" style={{ ...B('#1a1a2e', '#a78bfa'), border: '1px solid #2a2a4e', fontSize: 11, textDecoration: 'none' }}>Ver post</a>}
                    <a href={'https://instagram.com/' + lead.username} target="_blank" rel="noreferrer" style={{ ...B('#1a1a2e', '#a78bfa'), border: '1px solid #2a2a4e', fontSize: 11, textDecoration: 'none' }}>Ver perfil</a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

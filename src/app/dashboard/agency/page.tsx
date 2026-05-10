'use client'
import { useState, useEffect, useCallback } from 'react'

interface MonthStats {
  postsPublished: number
  reach: number
  likes: number
  clients: number
  revenue: number
}

interface Client {
  id: string
  name: string
  slug: string
  logo: string | null
  plan: string
  active: boolean
  domain: string | null
  notes: string | null
  createdAt: string
  users: { id: string; email: string; name: string; role: string }[]
  counts: { posts: number; socialLeads: number; videoScripts: number }
  monthStats: MonthStats
}

const PLAN_LABELS: Record<string, string> = { BASIC: 'Basic', PRO: 'Pro', AGENCY: 'Agency' }
const PLAN_COLORS: Record<string, string> = {
  BASIC: 'bg-gray-700 text-gray-300',
  PRO: 'bg-violet-900/40 text-violet-300 border border-violet-700/40',
  AGENCY: 'bg-amber-900/40 text-amber-300 border border-amber-700/40',
}

function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-white">{value}</p>
    </div>
  )
}

interface CreateForm {
  name: string; email: string; plan: string; domain: string; notes: string
}

export default function AgencyPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm]       = useState<CreateForm>({ name: '', email: '', plan: 'PRO', domain: '', notes: '' })
  const [creating, setCreating] = useState(false)
  const [creds, setCreds]     = useState<{ email: string; password: string; loginUrl: string } | null>(null)
  const [reportClientId, setReportClientId] = useState<string | null>(null)
  const [reportText, setReportText] = useState('')
  const [reportLoading, setReportLoading] = useState(false)
  const [editId, setEditId]   = useState<string | null>(null)
  const [editPatch, setEditPatch] = useState<{ active?: boolean; plan?: string; notes?: string }>({})

  const fetchClients = useCallback(async () => {
    const res = await fetch('/api/agency/clients')
    if (res.status === 403) { setError('Plan AGENCY requerido'); setLoading(false); return }
    if (res.ok) setClients(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetchClients() }, [fetchClients])

  async function createClient() {
    if (!form.name || !form.email) return
    setCreating(true)
    const res = await fetch('/api/agency/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, email: form.email, plan: form.plan, domain: form.domain || undefined, notes: form.notes || undefined }),
    })
    const data = await res.json()
    setCreating(false)
    if (!res.ok) { alert(data.error || 'Error'); return }
    setCreds(data.credentials)
    setShowCreate(false)
    setForm({ name: '', email: '', plan: 'PRO', domain: '', notes: '' })
    fetchClients()
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch('/api/agency/clients/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !current }),
    })
    fetchClients()
  }

  async function deleteClient(id: string, name: string) {
    if (!confirm('Eliminar cliente "' + name + '"? Esta accion es irreversible.')) return
    await fetch('/api/agency/clients/' + id, { method: 'DELETE' })
    fetchClients()
  }

  async function generateReport(clientId: string) {
    setReportClientId(clientId)
    setReportText('')
    setReportLoading(true)
    const res = await fetch('/api/agency/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId }),
    })
    const data = await res.json()
    setReportText(data.report || 'Error generando reporte')
    setReportLoading(false)
  }

  async function saveEdit(id: string) {
    await fetch('/api/agency/clients/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editPatch),
    })
    setEditId(null)
    setEditPatch({})
    fetchClients()
  }

  if (loading) return <div className="flex items-center justify-center h-full text-gray-500">Cargando clientes...</div>
  if (error)   return (
    <div className="flex flex-col items-center justify-center h-full gap-3">
      <p className="text-red-400 text-lg">{error}</p>
      <p className="text-gray-500 text-sm">Solo disponible para cuentas con plan AGENCY.</p>
    </div>
  )

  const reportClient = clients.find(c => c.id === reportClientId)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Panel de Agencia</h1>
          <p className="text-sm text-gray-400 mt-0.5">{clients.length} clientes gestionados</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          + Nuevo cliente
        </button>
      </div>

      {clients.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Clientes activos', value: clients.filter(c => c.active).length },
            { label: 'Posts este mes', value: clients.reduce((s, c) => s + c.monthStats.postsPublished, 0) },
            { label: 'Alcance mensual', value: clients.reduce((s, c) => s + c.monthStats.reach, 0).toLocaleString('es-CL') },
            { label: 'Clientes cerrados', value: clients.reduce((s, c) => s + c.monthStats.clients, 0) },
            { label: 'Revenue total', value: '$' + clients.reduce((s, c) => s + c.monthStats.revenue, 0).toLocaleString('es-CL') },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-800 border border-gray-700 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-400">{label}</p>
              <p className="text-xl font-bold text-white mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      )}

      {clients.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-4xl mb-3">🏢</p>
          <p>Sin clientes aun — crea el primero</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {clients.map(client => (
            <div key={client.id} className={'bg-gray-800 border rounded-xl overflow-hidden ' + (client.active ? 'border-gray-700' : 'border-gray-700/40 opacity-60')}>
              <div className="p-4 border-b border-gray-700 flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-white truncate">{client.name}</span>
                    <span className={'text-xs px-2 py-0.5 rounded-full ' + PLAN_COLORS[client.plan]}>{PLAN_LABELS[client.plan]}</span>
                    {!client.active && <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/30 text-red-400 border border-red-700/30">Inactivo</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{client.users[0]?.email || '-'}</p>
                  {client.domain && <p className="text-xs text-violet-400 mt-0.5">{client.domain}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => { setEditId(client.id); setEditPatch({ plan: client.plan, notes: client.notes || '' }) }}
                    className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
                    title="Editar"
                  >✏️</button>
                  <button
                    onClick={() => toggleActive(client.id, client.active)}
                    className={'p-1.5 hover:bg-gray-700 rounded text-xs ' + (client.active ? 'text-yellow-400' : 'text-green-400')}
                    title={client.active ? 'Desactivar' : 'Activar'}
                  >{client.active ? '⏸' : '▶'}</button>
                  <button
                    onClick={() => deleteClient(client.id, client.name)}
                    className="p-1.5 hover:bg-red-900/30 rounded text-gray-500 hover:text-red-400"
                    title="Eliminar"
                  >🗑</button>
                </div>
              </div>

              <div className="px-4 py-3 grid grid-cols-5 gap-1 border-b border-gray-700">
                <StatPill label="Posts" value={client.monthStats.postsPublished} />
                <StatPill label="Alcance" value={client.monthStats.reach > 999 ? (client.monthStats.reach / 1000).toFixed(1) + 'k' : client.monthStats.reach} />
                <StatPill label="Likes" value={client.monthStats.likes} />
                <StatPill label="Clientes" value={client.monthStats.clients} />
                <StatPill label="Revenue" value={client.monthStats.revenue > 0 ? '$' + (client.monthStats.revenue / 1000).toFixed(0) + 'k' : '-'} />
              </div>

              <div className="px-4 py-2.5 flex gap-4 text-xs text-gray-500 border-b border-gray-700">
                <span>{client.counts.posts} posts totales</span>
                <span>{client.counts.socialLeads} leads</span>
                <span>{client.counts.videoScripts} videos</span>
              </div>

              <div className="px-4 py-3 flex gap-2">
                <button
                  onClick={() => generateReport(client.id)}
                  disabled={reportLoading && reportClientId === client.id}
                  className="flex-1 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {reportLoading && reportClientId === client.id ? 'Generando...' : '📊 Reporte IA'}
                </button>
                <button
                  onClick={() => navigator.clipboard.writeText('https://social.conectaai.cl/login')}
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs transition-colors"
                  title="Copiar link de acceso"
                >🔗</button>
              </div>

              {client.notes && (
                <div className="px-4 pb-3">
                  <p className="text-xs text-gray-500 italic">{client.notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-md">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="font-semibold text-white">Nuevo cliente</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-white">X</button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Nombre empresa *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
                  placeholder="Acme S.A." />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Email del owner *</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
                  placeholder="owner@empresa.com" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Plan</label>
                <select value={form.plan} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500">
                  <option value="BASIC">Basic</option>
                  <option value="PRO">Pro</option>
                  <option value="AGENCY">Agency</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Dominio (opcional)</label>
                <input value={form.domain} onChange={e => setForm(f => ({ ...f, domain: e.target.value }))}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500"
                  placeholder="empresa.com" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Notas internas</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500 resize-none"
                  placeholder="Contexto del cliente..." />
              </div>
            </div>
            <div className="p-4 border-t border-gray-700 flex gap-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm">Cancelar</button>
              <button onClick={createClient} disabled={creating || !form.name || !form.email}
                className="flex-1 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {creating ? 'Creando...' : 'Crear cliente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {creds && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-green-700/50 rounded-xl w-full max-w-sm">
            <div className="p-4 border-b border-gray-700">
              <h2 className="font-semibold text-green-400">Cliente creado</h2>
              <p className="text-xs text-gray-400 mt-1">Comparte estas credenciales con el cliente</p>
            </div>
            <div className="p-4 space-y-3">
              <div className="bg-gray-900 rounded-lg p-3 font-mono text-sm space-y-1">
                <p className="text-gray-400">Email: <span className="text-white">{creds.email}</span></p>
                <p className="text-gray-400">Password: <span className="text-yellow-300">{creds.password}</span></p>
                <p className="text-gray-400">URL: <span className="text-violet-300">{creds.loginUrl}</span></p>
              </div>
              <button
                onClick={() => navigator.clipboard.writeText('Email: ' + creds.email + '\nPassword: ' + creds.password + '\nURL: ' + creds.loginUrl)}
                className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm"
              >Copiar credenciales</button>
            </div>
            <div className="p-4 border-t border-gray-700">
              <button onClick={() => setCreds(null)} className="w-full py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {editId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-sm">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="font-semibold text-white">Editar cliente</h2>
              <button onClick={() => setEditId(null)} className="text-gray-400 hover:text-white">X</button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Plan</label>
                <select value={editPatch.plan} onChange={e => setEditPatch(p => ({ ...p, plan: e.target.value }))}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
                  <option value="BASIC">Basic</option>
                  <option value="PRO">Pro</option>
                  <option value="AGENCY">Agency</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Notas internas</label>
                <textarea value={editPatch.notes || ''} onChange={e => setEditPatch(p => ({ ...p, notes: e.target.value }))}
                  rows={3}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm resize-none" />
              </div>
            </div>
            <div className="p-4 border-t border-gray-700 flex gap-2">
              <button onClick={() => setEditId(null)} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm">Cancelar</button>
              <button onClick={() => saveEdit(editId)} className="flex-1 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {reportClientId && reportText && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h2 className="font-semibold text-white">Reporte — {reportClient?.name}</h2>
              <button onClick={() => { setReportClientId(null); setReportText('') }} className="text-gray-400 hover:text-white">X</button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{reportText}</pre>
            </div>
            <div className="p-4 border-t border-gray-700 flex gap-2">
              <button onClick={() => navigator.clipboard.writeText(reportText)} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm">Copiar</button>
              <button onClick={() => { setReportClientId(null); setReportText('') }} className="flex-1 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

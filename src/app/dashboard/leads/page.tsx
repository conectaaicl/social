'use client'
import { useState, useEffect, useCallback } from 'react'

interface Lead {
  id: string
  nombre: string | null
  email: string | null
  whatsappPhone: string
  stage: string
  leadScore: number
  scoreReason: string | null
  closerName: string | null
  dealValue: number | null
  tags: string[]
  lastActivity: string | null
  createdAt: string
  _count: { activities: number; notes: number }
}

interface LeadDetail extends Lead {
  activities: { id: string; tipo: string; detalle: string | null; createdAt: string }[]
  notes: { id: string; body: string; createdAt: string }[]
}

const STAGES = [
  { key: 'nuevo',      label: 'Nuevo',      color: 'border-gray-500',   bg: 'bg-gray-500/10',   text: 'text-gray-300' },
  { key: 'contactado', label: 'Contactado', color: 'border-blue-500',   bg: 'bg-blue-500/10',   text: 'text-blue-300' },
  { key: 'calificado', label: 'Calificado', color: 'border-indigo-500', bg: 'bg-indigo-500/10', text: 'text-indigo-300' },
  { key: 'propuesta',  label: 'Propuesta',  color: 'border-yellow-500', bg: 'bg-yellow-500/10', text: 'text-yellow-300' },
  { key: 'cliente',    label: 'Cliente',    color: 'border-green-500',  bg: 'bg-green-500/10',  text: 'text-green-300' },
  { key: 'perdido',    label: 'Perdido',    color: 'border-red-500',    bg: 'bg-red-500/10',    text: 'text-red-400' },
]

function ScoreBadge({ score, reason }: { score: number; reason?: string | null }) {
  const cls = score >= 80 ? 'bg-green-500/20 text-green-300 border-green-500/30'
    : score >= 50 ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
    : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  return (
    <span title={reason || ''} className={'text-xs font-bold px-2 py-0.5 rounded-full border ' + cls}>
      {score}
    </span>
  )
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
}

function LeadCard({ lead, onClick, onStageChange }: {
  lead: Lead
  onClick: () => void
  onStageChange: (id: string, stage: string) => void
}) {
  const stage = STAGES.find(s => s.key === lead.stage)
  return (
    <div
      onClick={onClick}
      className={'bg-gray-800 border rounded-lg p-3 cursor-pointer hover:border-violet-500/50 transition-all mb-2 ' + (stage?.color || 'border-gray-700')}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="min-w-0">
          <p className="text-white text-sm font-medium truncate">{lead.nombre || lead.whatsappPhone}</p>
          {lead.nombre && <p className="text-gray-500 text-xs">{lead.whatsappPhone}</p>}
        </div>
        <ScoreBadge score={lead.leadScore} reason={lead.scoreReason} />
      </div>

      {lead.closerName && (
        <p className="text-xs text-gray-500 mb-1">👤 {lead.closerName}</p>
      )}
      {lead.dealValue && (
        <p className="text-xs text-green-400 mb-1">💰 ${lead.dealValue.toLocaleString('es-CL')}</p>
      )}

      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
        <span>📋 {lead._count.activities}</span>
        <span>📝 {lead._count.notes}</span>
        <span className="ml-auto">{fmtDate(lead.lastActivity || lead.createdAt)}</span>
      </div>
    </div>
  )
}

function LeadDrawer({ leadId, onClose, onUpdated }: {
  leadId: string
  onClose: () => void
  onUpdated: () => void
}) {
  const [lead, setLead] = useState<LeadDetail | null>(null)
  const [noteText, setNoteText] = useState('')
  const [scoring, setScoring] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editField, setEditField] = useState<string | null>(null)
  const [editVal, setEditVal] = useState('')

  async function load() {
    const res = await fetch('/api/leads/' + leadId)
    if (res.ok) setLead(await res.json())
  }

  useEffect(() => { load() }, [leadId])

  async function scoreWithAI() {
    setScoring(true)
    await fetch('/api/leads/' + leadId + '/score', { method: 'POST' })
    await load()
    onUpdated()
    setScoring(false)
  }

  async function addNote() {
    if (!noteText.trim()) return
    setSaving(true)
    await fetch('/api/leads/' + leadId + '/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: noteText }),
    })
    setNoteText('')
    await load()
    setSaving(false)
  }

  async function deleteNote(noteId: string) {
    await fetch('/api/leads/' + leadId + '/notes?noteId=' + noteId, { method: 'DELETE' })
    await load()
  }

  async function patch(data: Record<string, any>) {
    await fetch('/api/leads/' + leadId, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    await load()
    onUpdated()
  }

  if (!lead) return (
    <div className="fixed inset-y-0 right-0 w-96 bg-gray-900 border-l border-gray-700 flex items-center justify-center z-50">
      <p className="text-gray-500">Cargando…</p>
    </div>
  )

  const stage = STAGES.find(s => s.key === lead.stage)

  return (
    <div className="fixed inset-y-0 right-0 w-[420px] bg-gray-900 border-l border-gray-700 flex flex-col z-50 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div>
          <h3 className="text-white font-semibold">{lead.nombre || lead.whatsappPhone}</h3>
          <p className="text-xs text-gray-400">{lead.whatsappPhone}</p>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white p-1 rounded">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Score + Stage */}
        <div className="flex gap-3">
          <div className="flex-1 bg-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-1">Score IA</p>
            <div className="flex items-center gap-2">
              <span className={'text-2xl font-bold ' + (lead.leadScore >= 80 ? 'text-green-400' : lead.leadScore >= 50 ? 'text-yellow-400' : 'text-gray-400')}>
                {lead.leadScore}
              </span>
              <span className="text-gray-500 text-sm">/100</span>
              <button
                onClick={scoreWithAI}
                disabled={scoring}
                className="ml-auto text-xs px-2 py-1 bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 rounded transition-colors disabled:opacity-50"
              >
                {scoring ? '…' : '⚡ IA'}
              </button>
            </div>
            {lead.scoreReason && <p className="text-xs text-gray-400 mt-1 italic">{lead.scoreReason}</p>}
          </div>
          <div className="flex-1 bg-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-1">Etapa</p>
            <select
              value={lead.stage}
              onChange={e => patch({ stage: e.target.value })}
              className={'text-sm font-medium bg-transparent border-0 outline-none cursor-pointer ' + (stage?.text || 'text-gray-300')}
            >
              {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {/* Fields */}
        <div className="bg-gray-800 rounded-lg p-3 space-y-2">
          {[
            { key: 'closerName', label: '👤 Closer', type: 'text', placeholder: 'Nombre del closer' },
            { key: 'dealValue',  label: '💰 Valor',  type: 'number', placeholder: '0' },
            { key: 'email',      label: '✉ Email',   type: 'email', placeholder: 'email@ejemplo.com' },
          ].map(field => (
            <div key={field.key} className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-20 shrink-0">{field.label}</span>
              {editField === field.key ? (
                <div className="flex gap-1 flex-1">
                  <input
                    type={field.type}
                    value={editVal}
                    onChange={e => setEditVal(e.target.value)}
                    className="flex-1 bg-gray-700 border border-violet-500 rounded px-2 py-0.5 text-white text-xs outline-none"
                    autoFocus
                  />
                  <button onClick={() => { patch({ [field.key]: field.type === 'number' ? Number(editVal) : editVal || null }); setEditField(null) }}
                    className="text-xs text-green-400 hover:text-green-300">✓</button>
                  <button onClick={() => setEditField(null)} className="text-xs text-gray-500">✕</button>
                </div>
              ) : (
                <button
                  onClick={() => { setEditField(field.key); setEditVal(String((lead as any)[field.key] || '')) }}
                  className="flex-1 text-left text-xs text-white hover:text-violet-300 transition-colors truncate"
                >
                  {(lead as any)[field.key] ? String((lead as any)[field.key]) : <span className="text-gray-600">—</span>}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Notes */}
        <div>
          <h4 className="text-xs text-gray-400 uppercase tracking-wide mb-2">Notas</h4>
          <div className="flex gap-2 mb-3">
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Agregar nota…"
              rows={2}
              className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-violet-500 resize-none"
            />
            <button
              onClick={addNote}
              disabled={saving || !noteText.trim()}
              className="px-3 py-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs rounded-lg"
            >
              {saving ? '…' : '✓'}
            </button>
          </div>
          <div className="space-y-2">
            {lead.notes.map(n => (
              <div key={n.id} className="bg-gray-800 rounded-lg p-2 flex gap-2">
                <p className="text-xs text-gray-300 flex-1">{n.body}</p>
                <button onClick={() => deleteNote(n.id)} className="text-gray-600 hover:text-red-400 text-xs">✕</button>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div>
          <h4 className="text-xs text-gray-400 uppercase tracking-wide mb-2">Actividad</h4>
          <div className="space-y-1">
            {lead.activities.slice(0, 15).map(a => (
              <div key={a.id} className="flex gap-2 items-start">
                <span className="text-gray-600 text-xs shrink-0 mt-0.5">{fmtDate(a.createdAt)}</span>
                <p className="text-xs text-gray-400">{a.detalle || a.tipo}</p>
              </div>
            ))}
            {lead.activities.length === 0 && <p className="text-xs text-gray-600">Sin actividad aún</p>}
          </div>
        </div>
      </div>

      {/* WhatsApp CTA */}
      <div className="p-4 border-t border-gray-700">
        <a
          href={'https://wa.me/' + lead.whatsappPhone.replace(/\D/g, '')}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <span>💬</span> Abrir en WhatsApp
        </a>
      </div>
    </div>
  )
}

export default function LeadsPage() {
  const [leads, setLeads]       = useState<Lead[]>([])
  const [loading, setLoading]   = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [searchQ, setSearchQ]   = useState('')

  const [phone, setPhone]   = useState('')
  const [nombre, setNombre] = useState('')
  const [creating, setCreating] = useState(false)

  const fetchLeads = useCallback(async () => {
    const url = '/api/leads' + (searchQ ? '?q=' + encodeURIComponent(searchQ) : '')
    const res = await fetch(url)
    if (res.ok) setLeads(await res.json())
    setLoading(false)
  }, [searchQ])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!phone.trim()) return
    setCreating(true)
    await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ whatsappPhone: phone, nombre: nombre || null }),
    })
    setPhone(''); setNombre(''); setShowForm(false)
    await fetchLeads()
    setCreating(false)
  }

  const leadsByStage = STAGES.reduce((acc, s) => {
    acc[s.key] = leads.filter(l => l.stage === s.key)
    return acc
  }, {} as Record<string, Lead[]>)

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-700 shrink-0">
        <h1 className="text-lg font-bold text-white">CRM Leads</h1>
        <input
          value={searchQ}
          onChange={e => setSearchQ(e.target.value)}
          placeholder="Buscar lead…"
          className="flex-1 max-w-xs bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-violet-500"
        />
        <div className="ml-auto flex gap-2">
          <span className="text-xs text-gray-500 self-center">{leads.length} leads</span>
          <button
            onClick={() => setShowForm(true)}
            className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm"
          >
            + Lead
          </button>
        </div>
      </div>

      {/* Create form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <form onSubmit={handleCreate} className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-sm space-y-3">
            <h3 className="text-white font-semibold">Agregar Lead</h3>
            <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre (opcional)"
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500" />
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+56912345678" required
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-500" />
            <div className="flex gap-2">
              <button type="submit" disabled={creating}
                className="flex-1 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-lg text-sm">
                {creating ? 'Creando…' : 'Crear'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Kanban */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-gray-500">Cargando…</div>
      ) : (
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-3 p-4 h-full min-w-max">
            {STAGES.map(s => (
              <div key={s.key} className="w-60 shrink-0 flex flex-col">
                <div className={'flex items-center gap-2 mb-2 px-1'}>
                  <div className={'w-2 h-2 rounded-full ' + s.color.replace('border-', 'bg-')} />
                  <span className={'text-xs font-semibold ' + s.text}>{s.label}</span>
                  <span className="ml-auto text-xs text-gray-600">{leadsByStage[s.key]?.length || 0}</span>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {(leadsByStage[s.key] || []).map(lead => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      onClick={() => setSelectedId(lead.id)}
                      onStageChange={async (id, stage) => {
                        await fetch('/api/leads/' + id, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ stage }),
                        })
                        fetchLeads()
                      }}
                    />
                  ))}
                  {(leadsByStage[s.key] || []).length === 0 && (
                    <div className="border border-dashed border-gray-700 rounded-lg p-3 text-center text-xs text-gray-600">
                      Vacío
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drawer */}
      {selectedId && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setSelectedId(null)} />
          <LeadDrawer
            leadId={selectedId}
            onClose={() => setSelectedId(null)}
            onUpdated={fetchLeads}
          />
        </>
      )}
    </div>
  )
}

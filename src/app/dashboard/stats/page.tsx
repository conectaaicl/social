'use client'
import { useState, useEffect } from 'react'

interface StatsData {
  generatedAt: string
  crm: {
    totalLeads: number
    byStage: Record<string, number>
    clientes: number
    calificados: number
    hotLeads: number
    newThisWeek: number
    revenue: number
    avgScore: number
    conversionRate: number
    closers: { name: string; leads: number; clients: number; revenue: number; avgScore: number; conversionRate: number }[]
  }
  content: {
    publishedThisMonth: number
    monthReach: number
    monthLikes: number
    monthComments: number
    engagementRate: number
    videosGenerated: number
    abTestsRun: number
    bestPost: { caption: string; likes: number; comments: number; reach: number } | null
  }
  omniflow: {
    totalConversations: number
    openConversations: number
    whatsappConversations: number
    instagramConversations: number
    botActiveCount: number
    avgLeadScore: number
    topIntents: { intent: string; count: number }[]
  }
}

function Kpi({ label, value, sub, color = 'text-white' }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={'text-2xl font-bold ' + color}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mt-6 mb-3">{children}</h2>
}

const STAGE_LABELS: Record<string, string> = {
  nuevo: 'Nuevo', contactado: 'Contactado', calificado: 'Calificado',
  propuesta: 'Propuesta', cliente: 'Cliente', perdido: 'Perdido',
}

const INTENT_LABELS: Record<string, string> = {
  demo_request: 'Demo', pricing_inquiry: 'Precio', general_query: 'General',
  support: 'Soporte', purchase: 'Compra', unknown: 'Otro',
}

export default function StatsPage() {
  const [data, setData]       = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState('')

  async function fetchStats() {
    const res = await fetch('/api/stats')
    if (res.ok) {
      const d = await res.json()
      setData(d)
      setLastUpdate(new Date().toLocaleTimeString('es-CL'))
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 60000) // auto-refresh cada 60s
    return () => clearInterval(interval)
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-full text-gray-500">Cargando métricas…</div>
  )
  if (!data) return (
    <div className="flex items-center justify-center h-full text-red-400">Error cargando datos</div>
  )

  const { crm, content, omniflow } = data

  return (
    <div className="p-6 max-w-6xl mx-auto overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard Ejecutivo</h1>
          <p className="text-xs text-gray-500 mt-0.5">Actualizado: {lastUpdate} · auto-refresh 60s</p>
        </div>
        <button onClick={fetchStats} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm">
          ↻ Actualizar
        </button>
      </div>

      {/* ── VENTAS / CRM ── */}
      <SectionTitle>💰 Ventas & CRM</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Revenue total" value={'$' + crm.revenue.toLocaleString('es-CL')} color="text-green-400" />
        <Kpi label="Clientes cerrados" value={crm.clientes} sub={'de ' + crm.totalLeads + ' leads'} color="text-green-300" />
        <Kpi label="Conversión" value={crm.conversionRate + '%'} color={crm.conversionRate >= 20 ? 'text-green-400' : crm.conversionRate >= 10 ? 'text-yellow-400' : 'text-red-400'} />
        <Kpi label="Leads calientes 🔥" value={crm.hotLeads} sub={'score ≥ 80'} color="text-orange-400" />
        <Kpi label="Total leads" value={crm.totalLeads} sub={'+' + crm.newThisWeek + ' esta semana'} />
        <Kpi label="Score promedio" value={crm.avgScore + '/100'} color={crm.avgScore >= 60 ? 'text-violet-300' : 'text-gray-300'} />
        <Kpi label="En propuesta" value={crm.byStage['propuesta'] || 0} color="text-yellow-300" />
        <Kpi label="Calificados" value={crm.calificados} color="text-indigo-300" />
      </div>

      {/* Embudo */}
      <div className="mt-4 bg-gray-800 border border-gray-700 rounded-xl p-4">
        <p className="text-xs text-gray-400 mb-3 uppercase tracking-wide">Embudo de ventas</p>
        <div className="space-y-2">
          {Object.entries(crm.byStage).sort((a, b) => b[1] - a[1]).map(([stage, count]) => {
            const pct = crm.totalLeads > 0 ? (count / crm.totalLeads) * 100 : 0
            return (
              <div key={stage} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-20 shrink-0">{STAGE_LABELS[stage] || stage}</span>
                <div className="flex-1 bg-gray-700 rounded-full h-2">
                  <div className="bg-violet-500 h-2 rounded-full transition-all" style={{ width: pct + '%' }} />
                </div>
                <span className="text-xs text-white w-8 text-right">{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Closers */}
      {crm.closers.length > 0 && (
        <div className="mt-4 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <p className="text-xs text-gray-400 uppercase tracking-wide p-4 border-b border-gray-700">Performance por closer</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-700">
                <th className="text-left px-4 py-2">Closer</th>
                <th className="text-right px-4 py-2">Leads</th>
                <th className="text-right px-4 py-2">Clientes</th>
                <th className="text-right px-4 py-2">Conversión</th>
                <th className="text-right px-4 py-2">Revenue</th>
                <th className="text-right px-4 py-2">Score avg</th>
              </tr>
            </thead>
            <tbody>
              {crm.closers.map(c => (
                <tr key={c.name} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                  <td className="px-4 py-2 text-white font-medium">{c.name}</td>
                  <td className="px-4 py-2 text-right text-gray-300">{c.leads}</td>
                  <td className="px-4 py-2 text-right text-green-300">{c.clients}</td>
                  <td className="px-4 py-2 text-right">
                    <span className={c.conversionRate >= 20 ? 'text-green-400' : 'text-yellow-400'}>{c.conversionRate}%</span>
                  </td>
                  <td className="px-4 py-2 text-right text-green-400">${c.revenue.toLocaleString('es-CL')}</td>
                  <td className="px-4 py-2 text-right text-violet-300">{c.avgScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── OMNIFLOW / WHATSAPP ── */}
      <SectionTitle>💬 OmniFlow & WhatsApp</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Conversaciones totales" value={omniflow.totalConversations} />
        <Kpi label="Abiertas" value={omniflow.openConversations} color="text-yellow-300" />
        <Kpi label="WhatsApp" value={omniflow.whatsappConversations} color="text-green-400" />
        <Kpi label="Instagram DM" value={omniflow.instagramConversations} color="text-pink-400" />
        <Kpi label="Bot activo" value={omniflow.botActiveCount} sub="gestionadas por IA" color="text-violet-300" />
        <Kpi label="Score prom. OmniFlow" value={omniflow.avgLeadScore + '/100'} />
      </div>

      {omniflow.topIntents.length > 0 && (
        <div className="mt-4 bg-gray-800 border border-gray-700 rounded-xl p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Intención de compra detectada (IA)</p>
          <div className="space-y-2">
            {omniflow.topIntents.map(({ intent, count }) => {
              const pct = omniflow.totalConversations > 0 ? (count / omniflow.totalConversations) * 100 : 0
              return (
                <div key={intent} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-24 shrink-0">{INTENT_LABELS[intent] || intent}</span>
                  <div className="flex-1 bg-gray-700 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: pct + '%' }} />
                  </div>
                  <span className="text-xs text-white w-6 text-right">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── CONTENIDO ── */}
      <SectionTitle>📱 Contenido & Publicaciones</SectionTitle>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Publicados este mes" value={content.publishedThisMonth} />
        <Kpi label="Alcance mensual" value={content.monthReach.toLocaleString('es-CL')} color="text-blue-300" />
        <Kpi label="Engagement rate" value={content.engagementRate + '%'} color={content.engagementRate >= 3 ? 'text-green-400' : 'text-yellow-400'} />
        <Kpi label="Likes del mes" value={content.monthLikes.toLocaleString('es-CL')} color="text-pink-300" />
        <Kpi label="Videos IA generados" value={content.videosGenerated} color="text-violet-300" />
        <Kpi label="A/B Tests realizados" value={content.abTestsRun} />
        <Kpi label="Comentarios mes" value={content.monthComments.toLocaleString('es-CL')} />
      </div>

      {content.bestPost && (
        <div className="mt-4 bg-gray-800 border border-yellow-600/30 rounded-xl p-4">
          <p className="text-xs text-yellow-400 uppercase tracking-wide mb-2">🏆 Mejor post del mes</p>
          <p className="text-sm text-white mb-2">"{content.bestPost.caption}…"</p>
          <div className="flex gap-4 text-xs text-gray-400">
            <span>❤️ {content.bestPost.likes?.toLocaleString('es-CL') || 0}</span>
            <span>💬 {content.bestPost.comments?.toLocaleString('es-CL') || 0}</span>
            <span>👁 {content.bestPost.reach?.toLocaleString('es-CL') || 0}</span>
          </div>
        </div>
      )}
    </div>
  )
}

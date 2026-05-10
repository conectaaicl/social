'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface PlanInfo { label: string; price: number; description: string }
interface BillingData {
  currentPlan: string
  expiresAt: string | null
  plans: Record<string, PlanInfo>
}

const PLAN_FEATURES: Record<string, string[]> = {
  BASIC: [
    'Hasta 30 posts/mes',
    'Calendario de contenido',
    'Analítica básica',
    '1 cuenta de red social',
  ],
  PRO: [
    'Posts y programación ilimitados',
    'IA generación de contenido (Claude / GPT)',
    'CRM WhatsApp + Lead Scoring IA',
    'Video IA (FFmpeg + R2)',
    'A/B Testing de posts',
    'Radar de Competencia',
    'Piloto Automático',
    'Dashboard ejecutivo en tiempo real',
    'Hasta 5 cuentas sociales',
  ],
  AGENCY: [
    'Todo lo de Pro',
    'Panel de Agencia multi-cliente',
    'Reportes IA por cliente',
    'Credenciales auto-generadas para clientes',
    'White-label ready',
    'Clientes ilimitados',
  ],
}

const PLAN_COLORS: Record<string, string> = {
  BASIC:  'border-gray-600',
  PRO:    'border-violet-500',
  AGENCY: 'border-amber-500',
}

const PLAN_BADGE: Record<string, string> = {
  BASIC:  'bg-gray-700 text-gray-300',
  PRO:    'bg-violet-900/60 text-violet-200',
  AGENCY: 'bg-amber-900/60 text-amber-200',
}

export default function BillingPage() {
  const router = useRouter()
  const [data, setData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/billing').then(r => r.json()).then(d => { setData(d); setLoading(false) })
    // Check result param
    const params = new URLSearchParams(window.location.search)
    if (params.get('result') === 'ok') {
      fetch('/api/billing').then(r => r.json()).then(d => setData(d))
    }
  }, [])

  async function upgrade(plan: string) {
    setError('')
    setUpgrading(plan)
    const res = await fetch('/api/billing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetPlan: plan }),
    })
    const json = await res.json()
    setUpgrading(null)
    if (!res.ok) { setError(json.error || 'Error'); return }
    window.location.href = json.redirectUrl
  }

  if (loading) return <div className="flex items-center justify-center h-full text-gray-500">Cargando plan...</div>
  if (!data)   return null

  const { currentPlan, expiresAt, plans } = data

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Plan & Facturación</h1>
        <p className="text-sm text-gray-400 mt-1">
          Plan actual: <span className={'font-semibold px-2 py-0.5 rounded ' + PLAN_BADGE[currentPlan]}>{plans[currentPlan]?.label ?? currentPlan}</span>
          {expiresAt && (
            <span className="ml-3 text-gray-500">
              · Vence: {new Date(expiresAt).toLocaleDateString('es-CL')}
            </span>
          )}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 text-sm">
          {error}
          {error.includes('Configuración') && (
            <button onClick={() => router.push('/dashboard/settings')} className="ml-3 underline">Ir a Configuración</button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(plans).map(([key, plan]) => {
          const isCurrent  = currentPlan === key
          const isUpgrade  = key !== 'BASIC' && key !== currentPlan
          const isDowngrade = key === 'BASIC' && currentPlan !== 'BASIC'

          return (
            <div key={key} className={'relative bg-gray-800 border-2 rounded-2xl p-6 flex flex-col ' + PLAN_COLORS[key] + (isCurrent ? ' ring-2 ring-violet-400/30' : '')}>
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-violet-600 rounded-full text-xs text-white font-medium">
                  Plan actual
                </div>
              )}
              {key === 'PRO' && !isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-amber-500 rounded-full text-xs text-white font-medium">
                  Recomendado
                </div>
              )}

              <div className="mb-4">
                <h2 className="text-lg font-bold text-white">{plan.label}</h2>
                <div className="mt-2 flex items-end gap-1">
                  {plan.price === 0 ? (
                    <span className="text-3xl font-bold text-white">Gratis</span>
                  ) : (
                    <>
                      <span className="text-3xl font-bold text-white">${plan.price}</span>
                      <span className="text-gray-400 mb-1">USD/mes</span>
                    </>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">{plan.description}</p>
              </div>

              <ul className="flex-1 space-y-2 mb-6">
                {(PLAN_FEATURES[key] || []).map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="text-green-400 shrink-0 mt-0.5">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div className="w-full py-2.5 bg-gray-700 rounded-xl text-center text-sm text-gray-400 font-medium cursor-default">
                  Plan activo
                </div>
              ) : isUpgrade ? (
                <button
                  onClick={() => upgrade(key)}
                  disabled={upgrading === key}
                  className={'w-full py-2.5 rounded-xl text-sm font-medium transition-colors ' + (key === 'AGENCY' ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-violet-600 hover:bg-violet-500 text-white') + ' disabled:opacity-50'}
                >
                  {upgrading === key ? 'Redirigiendo...' : 'Actualizar a ' + plan.label}
                </button>
              ) : isDowngrade ? (
                <div className="w-full py-2.5 bg-gray-700/50 rounded-xl text-center text-xs text-gray-500 cursor-default">
                  Contacta soporte para downgrade
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      <div className="mt-8 p-4 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-400">
        <p className="font-medium text-gray-300 mb-1">Sobre los pagos</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Los pagos se procesan via Flow.cl (tarjetas, transferencias bancarias)</li>
          <li>El plan se activa inmediatamente al confirmar el pago</li>
          <li>La suscripción se renueva mensualmente — puedes cancelar en cualquier momento</li>
          <li>Para factura o boleta electrónica contacta a soporte</li>
        </ul>
      </div>
    </div>
  )
}

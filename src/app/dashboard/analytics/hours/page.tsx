'use client'
import { useEffect, useState } from 'react'

type HourData = { hour: number; label: string; avgScore: number; postCount: number }
type DayData  = { day: number; label: string; avgScore: number; postCount: number }
type Result = {
  insufficient: boolean; message?: string; generic?: any;
  totalPosts?: number; period?: string;
  bestHours?: HourData[]; allHours?: HourData[];
  bestDays?: DayData[]; allDays?: DayData[];
  recommendation?: string;
}

export default function OptimalHoursPage() {
  const [data, setData]       = useState<Result | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analytics/optimal-hours')
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false) })
  }, [])

  const maxScore = data?.allHours ? Math.max(...data.allHours.map(h => h.avgScore), 1) : 1

  const C = { background: '#0d0d18', border: '1px solid #1e1e2e', borderRadius: 8, padding: '16px 18px' }

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: '#4a4a6a' }}>Calculando horarios optimos...</div>

  if (!data) return <div style={{ padding: 48, textAlign: 'center', color: '#ef4444' }}>Error al cargar datos</div>

  if (data.insufficient) return (
    <div style={{ padding: '24px 32px', maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#e2e2e8', margin: '0 0 8px' }}>Horario Optimo de Publicacion</h1>
      <div style={{ ...C, marginTop: 24 }}>
        <div style={{ fontSize: 15, color: '#f97316', marginBottom: 12 }}>{data.message}</div>
        <div style={{ fontSize: 13, color: '#6b6b8a', marginBottom: 20 }}>Mientras tanto, estos son los mejores horarios generales para Instagram en Chile:</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {(data.generic?.instagram || []).map((h: number) => (
            <div key={h} style={{ background: '#1a1a2e', border: '1px solid #7c3aed', borderRadius: 8, padding: '12px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#a78bfa' }}>{h < 12 ? h + 'am' : h === 12 ? '12pm' : (h-12) + 'pm'}</div>
              <div style={{ fontSize: 11, color: '#4a4a6a' }}>recomendado</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#e2e2e8' }}>Horario Optimo de Publicacion</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b6b8a' }}>Basado en {data.totalPosts} posts publicados en los ultimos {data.period}</p>
      </div>

      {data.recommendation && (
        <div style={{ ...C, marginBottom: 24, border: '1px solid #7c3aed40', background: '#0f0f1e' }}>
          <div style={{ fontSize: 11, color: '#a78bfa', letterSpacing: 1, marginBottom: 6, fontWeight: 700 }}>RECOMENDACION</div>
          <div style={{ fontSize: 14, color: '#e2e2e8' }}>{data.recommendation}</div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Best hours */}
        <div style={C}>
          <div style={{ fontSize: 11, color: '#22c55e', letterSpacing: 1, marginBottom: 16, fontWeight: 700 }}>MEJORES HORAS PARA PUBLICAR</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(data.bestHours || []).map((h, i) => (
              <div key={h.hour} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: i === 0 ? '#7c3aed' : '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: i === 0 ? '#fff' : '#a78bfa', flexShrink: 0 }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#e2e2e8' }}>{h.label}</span>
                    <span style={{ fontSize: 11, color: '#4a4a6a' }}>{h.postCount} posts</span>
                  </div>
                  <div style={{ height: 4, background: '#1a1a2e', borderRadius: 2 }}>
                    <div style={{ height: '100%', background: i === 0 ? '#7c3aed' : '#3a2a6e', borderRadius: 2, width: Math.round(h.avgScore / maxScore * 100) + '%' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Best days */}
        <div style={C}>
          <div style={{ fontSize: 11, color: '#60a5fa', letterSpacing: 1, marginBottom: 16, fontWeight: 700 }}>MEJORES DIAS DE LA SEMANA</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(data.allDays || []).map((d, i) => (
              <div key={d.day} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, fontSize: 12, fontWeight: 700, color: i < 3 ? '#60a5fa' : '#4a4a6a', flexShrink: 0 }}>{d.label}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ height: 4, background: '#1a1a2e', borderRadius: 2, flex: 1, marginRight: 8 }}>
                      <div style={{ height: '100%', background: i < 3 ? '#60a5fa' : '#1e1e3e', borderRadius: 2, width: d.postCount > 0 ? Math.round(d.avgScore / (Math.max(...(data.allDays || []).map(x => x.avgScore), 1)) * 100) + '%' : '5%' }} />
                    </div>
                    <span style={{ fontSize: 11, color: '#4a4a6a', flexShrink: 0 }}>{d.postCount} posts</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 24h heatmap */}
      <div style={C}>
        <div style={{ fontSize: 11, color: '#f97316', letterSpacing: 1, marginBottom: 16, fontWeight: 700 }}>MAPA DE CALOR — ENGAGEMENT POR HORA DEL DIA</div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {(data.allHours || []).sort((a, b) => a.hour - b.hour).map(h => {
            const intensity = h.postCount > 0 ? h.avgScore / maxScore : 0
            const bg = intensity > 0.7 ? '#7c3aed' : intensity > 0.4 ? '#3a1a6e' : intensity > 0.1 ? '#1a1a3e' : '#0d0d18'
            return (
              <div key={h.hour} title={h.label + ': ' + (h.postCount > 0 ? h.avgScore + ' score' : 'sin datos')}
                style={{ width: 38, height: 38, borderRadius: 6, background: bg, border: '1px solid ' + (intensity > 0.7 ? '#7c3aed' : '#1e1e2e'), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'default' }}>
                <div style={{ fontSize: 10, color: intensity > 0.4 ? '#e2e2e8' : '#4a4a6a', fontWeight: 600 }}>{h.label}</div>
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 12, alignItems: 'center', fontSize: 11, color: '#4a4a6a' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 12, height: 12, background: '#0d0d18', border: '1px solid #1e1e2e', borderRadius: 2 }} /> Sin datos</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 12, height: 12, background: '#1a1a3e', borderRadius: 2 }} /> Bajo</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 12, height: 12, background: '#3a1a6e', borderRadius: 2 }} /> Medio</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 12, height: 12, background: '#7c3aed', borderRadius: 2 }} /> Alto engagement</div>
        </div>
      </div>
    </div>
  )
}

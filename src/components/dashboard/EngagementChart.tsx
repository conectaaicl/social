"use client"

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts"

interface DayData {
  day: string
  alcance: number
  likes: number
  comentarios: number
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: "rgba(15, 23, 42, 0.95)",
      border: "1px solid rgba(99, 102, 241, 0.3)",
      borderRadius: 10,
      padding: "10px 14px",
      backdropFilter: "blur(8px)",
    }}>
      <p style={{ color: "#94a3b8", fontSize: 11, marginBottom: 6, fontWeight: 600 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color, fontSize: 12, margin: "2px 0", fontWeight: 600 }}>
          {p.name}: <span style={{ color: "#f1f5f9" }}>{p.value.toLocaleString("es-CL")}</span>
        </p>
      ))}
    </div>
  )
}

export default function EngagementChart({ data }: { data: DayData[] }) {
  const hasData = data.some((d) => d.alcance > 0 || d.likes > 0)

  if (!hasData) {
    return (
      <div style={{
        height: 220,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "#4b5563",
        gap: 8,
      }}>
        <div style={{ fontSize: 32 }}>📊</div>
        <p style={{ fontSize: 13 }}>Sin datos de los últimos 7 días</p>
        <p style={{ fontSize: 11, color: "#374151" }}>Los datos aparecen después de publicar</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="gradAlcance" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradLikes" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradComentarios" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis
          dataKey="day"
          tick={{ fill: "#6b7280", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#6b7280", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 11, color: "#9ca3af", paddingTop: 8 }}
          iconType="circle"
          iconSize={7}
        />
        <Area type="monotone" dataKey="alcance" name="Alcance" stroke="#6366f1" strokeWidth={2} fill="url(#gradAlcance)" dot={false} activeDot={{ r: 4, fill: "#6366f1" }} />
        <Area type="monotone" dataKey="likes" name="Likes" stroke="#ec4899" strokeWidth={2} fill="url(#gradLikes)" dot={false} activeDot={{ r: 4, fill: "#ec4899" }} />
        <Area type="monotone" dataKey="comentarios" name="Comentarios" stroke="#14b8a6" strokeWidth={2} fill="url(#gradComentarios)" dot={false} activeDot={{ r: 4, fill: "#14b8a6" }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

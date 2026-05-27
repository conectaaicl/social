"use client"

import { useEffect, useState } from "react"

export default function AutopilotBanner() {
  const [mode, setMode] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    fetch("/api/autopilot").then(r => r.json()).then(d => { setMode(d.mode); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const toggle = async () => {
    if (!mode) return
    setToggling(true)
    const newMode = mode === "autopiloto" ? "asistido" : "autopiloto"
    try {
      await fetch("/api/autopilot", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: newMode }) })
      setMode(newMode)
    } finally { setToggling(false) }
  }

  if (loading) return null
  const isAuto = mode === "autopiloto"

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", borderRadius: 12, marginBottom: 20,
      background: isAuto ? "rgba(34,197,94,0.07)" : "rgba(245,158,11,0.07)",
      border: `1px solid ${isAuto ? "rgba(34,197,94,0.2)" : "rgba(245,158,11,0.2)"}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: isAuto ? "#22c55e" : "#f59e0b", boxShadow: `0 0 8px ${isAuto ? "#22c55e" : "#f59e0b"}` }} />
        <div>
          <span style={{ fontSize: 13, fontWeight: 600, color: isAuto ? "#4ade80" : "#fbbf24" }}>
            {isAuto ? "Piloto Automático activo" : "Modo Asistido (manual)"}
          </span>
          <span style={{ fontSize: 11, color: "#475569", marginLeft: 8 }}>
            {isAuto ? "Publicando contenido automáticamente" : "Publicación pausada — requiere aprobación manual"}
          </span>
        </div>
      </div>
      <button onClick={toggle} disabled={toggling} style={{
        padding: "6px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700,
        borderWidth: 1, borderStyle: "solid" as const,
        borderColor: isAuto ? "rgba(239,68,68,0.25)" : "rgba(34,197,94,0.25)",
        cursor: toggling ? "not-allowed" : "pointer",
        background: isAuto ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.12)",
        color: isAuto ? "#f87171" : "#4ade80",
        opacity: toggling ? 0.6 : 1, transition: "all 0.15s",
      }}>
        {toggling ? "…" : isAuto ? "⏸ Pausar" : "▶ Activar"}
      </button>
    </div>
  )
}

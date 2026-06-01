"use client"

import { useEffect } from "react"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Dashboard error:", error)
  }, [error])

  return (
    <div style={{ padding: 40, fontFamily: "monospace" }}>
      <h2 style={{ color: "#f87171", marginBottom: 16 }}>Error en el panel</h2>
      <pre style={{ background: "#0f1623", color: "#e2e8f0", padding: 16, borderRadius: 8, fontSize: 12, overflow: "auto", border: "1px solid rgba(248,113,113,0.3)" }}>
        {error.message || "Error desconocido"}
        {"\n\n"}
        {error.stack}
      </pre>
      <button onClick={reset} style={{ marginTop: 16, padding: "8px 16px", background: "#6366f1", color: "white", border: "none", borderRadius: 8, cursor: "pointer" }}>
        Reintentar
      </button>
    </div>
  )
}

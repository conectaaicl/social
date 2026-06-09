"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

const C = {
  muted: "#64748b", violetLt: "#a78bfa", green: "#22c55e",
}

export default function DashboardHeader({ name }: { name: string }) {
  const [greeting, setGreeting] = useState("Hola")
  const [dateStr, setDateStr] = useState("")

  useEffect(() => {
    const hour = parseInt(
      new Date().toLocaleString("en", { timeZone: "America/Santiago", hour: "numeric", hour12: false })
    )
    setGreeting(hour < 12 ? "Buenos días" : hour < 18 ? "Buenas tardes" : "Buenas noches")
    setDateStr(new Date().toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" }))
  }, [])

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, marginBottom: 4, lineHeight: 1.3 }}>
            {greeting},{" "}
            <span style={{ background: "linear-gradient(90deg,#a78bfa,#60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {name}
            </span>
          </h1>
          <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>{dateStr}</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/dashboard/monitor" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none", background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)", color: C.violetLt }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, boxShadow: `0 0 8px ${C.green}`, display: "inline-block" }} />
            Monitor en vivo
          </Link>
          <Link href="/dashboard/posts" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none", background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "white", boxShadow: "0 4px 14px rgba(124,58,237,0.3)" }}>
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none"><path d="M13 3L4 14h8l-1 7 9-11h-8z" fill="white" /></svg>
            Generar post
          </Link>
        </div>
      </div>
    </div>
  )
}

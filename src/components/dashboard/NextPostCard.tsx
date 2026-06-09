"use client"

import { useEffect, useState } from "react"

const C = { violetLt: "#a78bfa", text: "#e2e8f0", muted: "#64748b" }

function formatTime(d: Date) {
  const diff = Math.floor((d.getTime() - Date.now()) / 1000)
  if (diff < 0) return "pasado"
  const h = Math.floor(diff / 3600); const m = Math.floor((diff % 3600) / 60)
  if (h > 48) return `${Math.floor(h / 24)}d`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

interface Props {
  caption: string
  platform: string[]
  scheduledAt: string
}

export default function NextPostCard({ caption, platform, scheduledAt }: Props) {
  const [timeStr, setTimeStr] = useState("…")

  useEffect(() => {
    const update = () => setTimeStr(formatTime(new Date(scheduledAt)))
    update()
    const id = setInterval(update, 30000)
    return () => clearInterval(id)
  }, [scheduledAt])

  return (
    <div style={{ background: "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 12, padding: "16px" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.violetLt, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>Próximo post</div>
      <div style={{ fontSize: 12, color: C.text, marginBottom: 8, lineHeight: 1.5 }}>
        {caption.slice(0, 80)}{caption.length > 80 ? "…" : ""}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 11, color: C.muted }}>{platform.join(" · ")}</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.violetLt, background: "rgba(124,58,237,0.15)", padding: "3px 8px", borderRadius: 6 }}>
          en {timeStr}
        </div>
      </div>
    </div>
  )
}

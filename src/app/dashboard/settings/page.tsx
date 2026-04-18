"use client"

import { useEffect, useState } from "react"
import { Save, RefreshCw, Clock, Zap } from "lucide-react"

interface CalendarConfig {
  postsPerDay: number
  scheduleSlots: Array<{ time: string; type: "feed" | "story" | "reel" }>
  contentMix: Record<string, number>
  autoPublish: boolean
  timezone: string
}

const TIMEZONES = [
  "America/Santiago",
  "America/Buenos_Aires",
  "America/Bogota",
  "America/Mexico_City",
  "America/Lima",
  "America/Caracas",
  "Europe/Madrid",
]

const DEFAULT_SLOTS = [
  { time: "09:00", type: "feed" as const },
  { time: "13:00", type: "story" as const },
  { time: "19:00", type: "reel" as const },
]

export default function SettingsPage() {
  const [config, setConfig] = useState<CalendarConfig>({
    postsPerDay: 3,
    scheduleSlots: DEFAULT_SLOTS,
    contentMix: { PRODUCTO: 30, PROYECTO: 25, TIP: 25, PROMO: 20 },
    autoPublish: true,
    timezone: "America/Santiago",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch("/api/brand")
      .then((r) => r.json())
      .then((data) => {
        if (data.calendarConfig) {
          setConfig((c) => ({ ...c, ...data.calendarConfig }))
        }
      })
      .finally(() => setLoading(false))
  }, [])

  function updateSlot(idx: number, field: "time" | "type", value: string) {
    setConfig((c) => {
      const slots = [...c.scheduleSlots]
      slots[idx] = { ...slots[idx], [field]: value } as any
      return { ...c, scheduleSlots: slots }
    })
  }

  function addSlot() {
    setConfig((c) => ({
      ...c,
      scheduleSlots: [...c.scheduleSlots, { time: "12:00", type: "feed" }],
    }))
  }

  function removeSlot(idx: number) {
    setConfig((c) => ({
      ...c,
      scheduleSlots: c.scheduleSlots.filter((_, i) => i !== idx),
    }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const brandRes = await fetch("/api/brand")
      const brandData = await brandRes.json()
      if (!brandData.brandVoice) {
        alert("Primero configura tu marca en Mi Marca")
        return
      }

      await fetch("/api/brand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...brandData.brandVoice,
          keywords: brandData.brandVoice.keywords ?? [],
          products: brandData.brandVoice.products ?? [],
          contentMix: config.contentMix,
        }),
      })

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
      </div>
    )
  }

  const mixTotal = Object.values(config.contentMix).reduce((a, b) => a + b, 0)

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-100">Configuración</h1>
        <p className="text-gray-500 mt-1 text-sm">Ajusta el calendario y la publicación automática</p>
      </div>

      <div className="space-y-6">
        {/* Auto-publish */}
        <div className="card">
          <h2 className="font-medium text-gray-100 mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-400" />
            Publicación automática
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-300">Publicar automáticamente a la hora programada</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Si está desactivado, los posts quedan en cola para aprobación manual
              </p>
            </div>
            <button
              onClick={() => setConfig((c) => ({ ...c, autoPublish: !c.autoPublish }))}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                config.autoPublish ? "bg-indigo-600" : "bg-gray-700"
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  config.autoPublish ? "translate-x-6" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Schedule slots */}
        <div className="card">
          <h2 className="font-medium text-gray-100 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            Horarios de publicación
          </h2>
          <div className="space-y-3">
            {config.scheduleSlots.map((slot, i) => (
              <div key={i} className="flex items-center gap-3">
                <input
                  type="time"
                  value={slot.time}
                  onChange={(e) => updateSlot(i, "time", e.target.value)}
                  className="input w-32 text-sm py-2"
                />
                <select
                  value={slot.type}
                  onChange={(e) => updateSlot(i, "type", e.target.value)}
                  className="input flex-1 text-sm py-2"
                >
                  <option value="feed">Feed</option>
                  <option value="story">Story</option>
                  <option value="reel">Reel</option>
                </select>
                <button
                  onClick={() => removeSlot(i)}
                  disabled={config.scheduleSlots.length <= 1}
                  className="text-gray-500 hover:text-red-400 transition-colors disabled:opacity-30"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              onClick={addSlot}
              disabled={config.scheduleSlots.length >= 6}
              className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-30"
            >
              + Agregar horario
            </button>
          </div>
        </div>

        {/* Timezone */}
        <div className="card">
          <h2 className="font-medium text-gray-100 mb-4">Zona horaria</h2>
          <select
            value={config.timezone}
            onChange={(e) => setConfig((c) => ({ ...c, timezone: e.target.value }))}
            className="input"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>

        {/* n8n info */}
        <div className="card border-gray-800 bg-indigo-500/5 border-indigo-500/20">
          <h2 className="font-medium text-gray-100 mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-400" />
            Automatización con n8n
          </h2>
          <div className="space-y-2 text-sm text-gray-400">
            <p>En n8n.conectaai.cl configura estos workflows:</p>
            <div className="bg-gray-900 rounded-lg p-3 font-mono text-xs space-y-2">
              <div>
                <span className="text-gray-500">// Generación diaria (06:00 AM)</span>
                <br />
                <span className="text-green-400">POST</span>{" "}
                <span className="text-indigo-300">{process.env.NEXT_PUBLIC_APP_URL ?? "https://social.conectaai.cl"}/api/cron/generate</span>
                <br />
                <span className="text-yellow-400">Authorization:</span>{" "}
                <span className="text-gray-300">Bearer {"{CRON_SECRET}"}</span>
              </div>
              <div className="border-t border-gray-800 pt-2">
                <span className="text-gray-500">// Auto-publicador (cada 15 min)</span>
                <br />
                <span className="text-green-400">POST</span>{" "}
                <span className="text-indigo-300">{process.env.NEXT_PUBLIC_APP_URL ?? "https://social.conectaai.cl"}/api/cron/publish</span>
                <br />
                <span className="text-yellow-400">Authorization:</span>{" "}
                <span className="text-gray-300">Bearer {"{CRON_SECRET}"}</span>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || mixTotal !== 100}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {saving ? (
            <><RefreshCw className="w-4 h-4 animate-spin" /> Guardando…</>
          ) : saved ? (
            <><span>✓</span> ¡Guardado!</>
          ) : (
            <><Save className="w-4 h-4" /> Guardar configuración</>
          )}
        </button>
      </div>
    </div>
  )
}

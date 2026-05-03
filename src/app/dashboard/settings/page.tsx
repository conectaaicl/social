"use client"

import { useEffect, useState } from "react"
import { Save, Eye, EyeOff, RefreshCw, CheckCircle, AlertCircle, Key, Zap, MessageSquare, BarChart2 } from "lucide-react"

interface IntegrationField {
  key: string
  label: string
  placeholder?: string
  type?: "password" | "text"
}

const SECTIONS = [
  {
    id: "meta",
    title: "Meta (Instagram & Facebook)",
    icon: "📱",
    fields: [
      { key: "metaAppId", label: "App ID", placeholder: "123456789" },
      { key: "metaAppSecret", label: "App Secret", type: "password", placeholder: "abc123..." },
    ] as IntegrationField[],
  },
  {
    id: "ai_images",
    title: "Generación de Imágenes IA",
    icon: "🎨",
    fields: [
      { key: "falApiKey", label: "fal.ai API Key", type: "password", placeholder: "fal-..." },
      { key: "replicateApiToken", label: "Replicate API Token", type: "password", placeholder: "r8_..." },
      { key: "stabilityApiKey", label: "Stability AI API Key", type: "password", placeholder: "sk-..." },
    ] as IntegrationField[],
  },
  {
    id: "ai_text",
    title: "IA de Texto",
    icon: "🤖",
    fields: [
      { key: "groqApiKey", label: "Groq API Key", type: "password", placeholder: "gsk_..." },
      { key: "openaiApiKey", label: "OpenAI API Key", type: "password", placeholder: "sk-..." },
      { key: "anthropicApiKey", label: "Anthropic API Key", type: "password", placeholder: "sk-ant-..." },
    ] as IntegrationField[],
  },
  {
    id: "whatsapp",
    title: "WhatsApp (Evolution API)",
    icon: "💬",
    fields: [
      { key: "whatsappPhone", label: "Teléfono (56XXXXXXXXX)", placeholder: "56912345678" },
      { key: "whatsappInstance", label: "Instancia", placeholder: "social" },
      { key: "whatsappApiUrl", label: "API URL", placeholder: "http://localhost:8082" },
      { key: "whatsappApiKey", label: "API Key", type: "password", placeholder: "abc123..." },
    ] as IntegrationField[],
  },
  {
    id: "google_ads",
    title: "Google Ads",
    icon: "📊",
    fields: [
      { key: "googleAdsClientId", label: "Client ID", placeholder: "xxx.apps.googleusercontent.com" },
      { key: "googleAdsClientSecret", label: "Client Secret", type: "password", placeholder: "GOCSPX-..." },
      { key: "googleAdsRefreshToken", label: "Refresh Token", type: "password", placeholder: "1//0g..." },
      { key: "googleAdsDeveloperToken", label: "Developer Token", type: "password", placeholder: "abc123..." },
      { key: "googleAdsCustomerId", label: "Customer ID", placeholder: "123-456-7890" },
    ] as IntegrationField[],
  },
]

export default function SettingsPage() {
  const [values, setValues] = useState<Record<string, string>>({})
  const [visible, setVisible] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/settings/integrations")
      .then((r) => r.json())
      .then((data) => {
        setValues(data.masked ?? {})
        setLoading(false)
      })
  }, [])

  function handleChange(key: string, val: string) {
    setValues((prev) => ({ ...prev, [key]: val }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    setError("")
    try {
      const res = await fetch("/api/settings/integrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Error guardando")
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function toggleVisible(key: string) {
    setVisible((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-100">Configuración</h1>
          <p className="text-gray-500 mt-0.5 text-sm">Integraciones y claves API de tu cuenta</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2"
        >
          {saving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <CheckCircle className="w-4 h-4 text-green-400" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? "Guardando…" : saved ? "Guardado" : "Guardar cambios"}
        </button>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="space-y-6">
        {SECTIONS.map((section) => (
          <div key={section.id} className="card">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">{section.icon}</span>
              <h2 className="font-medium text-gray-100">{section.title}</h2>
            </div>
            <div className="space-y-3">
              {section.fields.map((field) => {
                const isPassword = field.type === "password"
                const isVisible = visible[field.key]
                const val = values[field.key] ?? ""
                const isMasked = isPassword && val.startsWith("•")
                return (
                  <div key={field.key}>
                    <label className="block text-xs text-gray-400 mb-1">{field.label}</label>
                    <div className="relative">
                      <input
                        type={isPassword && !isVisible ? "password" : "text"}
                        value={val}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        placeholder={isMasked ? "••••••••••••" : field.placeholder}
                        className="input w-full pr-10 text-sm"
                      />
                      {isPassword && (
                        <button
                          type="button"
                          onClick={() => toggleVisible(field.key)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                        >
                          {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </div>
  )
}

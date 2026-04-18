"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, ChevronRight, ChevronLeft, Sparkles } from "lucide-react"

const STEPS = [
  { id: 1, label: "Tu negocio" },
  { id: 2, label: "Tono de voz" },
  { id: 3, label: "Productos" },
  { id: 4, label: "Audiencia" },
  { id: 5, label: "Confirmar" },
]

const TONE_OPTIONS = [
  { value: "elegante", label: "Elegante", desc: "Sofisticado, premium, aspiracional" },
  { value: "cercano", label: "Cercano", desc: "Amigable, cotidiano, de confianza" },
  { value: "inspirador", label: "Inspirador", desc: "Emotivo, que mueve a la acción" },
  { value: "profesional", label: "Profesional", desc: "Formal, experto, técnico" },
  { value: "divertido", label: "Divertido", desc: "Ligero, con humor, dinámico" },
]

const CONTENT_MIX_OPTIONS = [
  { key: "PRODUCTO", label: "Producto / catálogo", emoji: "🛍" },
  { key: "PROYECTO", label: "Proyectos instalados", emoji: "🏠" },
  { key: "TIP", label: "Tips de decoración", emoji: "💡" },
  { key: "PROMO", label: "Promociones", emoji: "🎯" },
]

type FormData = {
  industry: string
  description: string
  tone: string
  keywords: string
  products: string
  targetAudience: string
  language: string
  customPrompt: string
  contentMix: Record<string, number>
}

const defaultForm: FormData = {
  industry: "Cortinas, persianas y estores",
  description: "",
  tone: "elegante",
  keywords: "",
  products: "",
  targetAudience: "",
  language: "es-CL",
  customPrompt: "",
  contentMix: { PRODUCTO: 30, PROYECTO: 25, TIP: 25, PROMO: 20 },
}

export default function BrandPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormData>(defaultForm)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")

  function update(field: keyof FormData, value: any) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function updateMix(key: string, value: number) {
    setForm((f) => ({ ...f, contentMix: { ...f.contentMix, [key]: value } }))
  }

  async function handleSave() {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/brand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          keywords: form.keywords.split(",").map((k) => k.trim()).filter(Boolean),
          products: form.products.split(",").map((p) => p.trim()).filter(Boolean),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al guardar")
      setSaved(true)
      setTimeout(() => router.push("/dashboard/accounts"), 1500)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const mixTotal = Object.values(form.contentMix).reduce((a, b) => a + b, 0)

  return (
    <div className="p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-100">Configura tu marca</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Esta información le dice a la IA cómo hablar en nombre de tu negocio
        </p>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <button
              onClick={() => s.id < step && setStep(s.id)}
              className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                s.id === step
                  ? "text-indigo-300"
                  : s.id < step
                  ? "text-green-400 cursor-pointer"
                  : "text-gray-600 cursor-default"
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-xs border ${
                  s.id === step
                    ? "border-indigo-500 bg-indigo-500/20 text-indigo-300"
                    : s.id < step
                    ? "border-green-500 bg-green-500/20 text-green-400"
                    : "border-gray-700 text-gray-600"
                }`}
              >
                {s.id < step ? "✓" : s.id}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-6 ${s.id < step ? "bg-green-500/30" : "bg-gray-800"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Card */}
      <div className="card min-h-72">
        {/* Step 1 — Tu negocio */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-base font-medium text-gray-100">Cuéntanos sobre tu negocio</h2>
            <div>
              <label className="label">Industria / Rubro</label>
              <input
                className="input"
                value={form.industry}
                onChange={(e) => update("industry", e.target.value)}
                placeholder="ej: Cortinas y persianas para el hogar"
              />
            </div>
            <div>
              <label className="label">Descripción del negocio</label>
              <textarea
                className="input resize-none"
                rows={4}
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="ej: TerraBlinds es una empresa chilena especializada en cortinas, persianas y estores de alta calidad para hogares y oficinas. Ofrecemos instalación incluida y medidas a pedido."
              />
              <p className="text-xs text-gray-600 mt-1">
                Sé específico — esto es lo que la IA usará para generar el contenido
              </p>
            </div>
            <div>
              <label className="label">Idioma</label>
              <select
                className="input"
                value={form.language}
                onChange={(e) => update("language", e.target.value)}
              >
                <option value="es-CL">Español Chile</option>
                <option value="es-CO">Español Colombia</option>
                <option value="es-MX">Español México</option>
                <option value="es">Español neutro</option>
                <option value="en">Inglés</option>
              </select>
            </div>
          </div>
        )}

        {/* Step 2 — Tono */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-base font-medium text-gray-100">¿Cómo quieres sonar?</h2>
            <div className="space-y-2">
              {TONE_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => update("tone", t.value)}
                  className={`w-full flex items-start gap-3 p-4 rounded-lg border text-left transition-all ${
                    form.tone === t.value
                      ? "border-indigo-500/50 bg-indigo-500/10"
                      : "border-gray-800 hover:border-gray-700 bg-gray-900/50"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0 ${
                      form.tone === t.value ? "border-indigo-500 bg-indigo-500" : "border-gray-600"
                    }`}
                  />
                  <div>
                    <p className={`text-sm font-medium ${form.tone === t.value ? "text-indigo-300" : "text-gray-300"}`}>
                      {t.label}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{t.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            <div>
              <label className="label">Mix de contenido</label>
              <p className="text-xs text-gray-600 mb-3">
                Define qué porcentaje de posts dedicar a cada tipo (total: {mixTotal}%)
              </p>
              <div className="space-y-3">
                {CONTENT_MIX_OPTIONS.map((opt) => (
                  <div key={opt.key} className="flex items-center gap-3">
                    <span className="text-sm w-40 text-gray-400 flex items-center gap-2">
                      <span>{opt.emoji}</span> {opt.label}
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={60}
                      step={5}
                      value={form.contentMix[opt.key]}
                      onChange={(e) => updateMix(opt.key, parseInt(e.target.value))}
                      className="flex-1 accent-indigo-500"
                    />
                    <span className="text-sm text-indigo-400 w-10 text-right font-medium">
                      {form.contentMix[opt.key]}%
                    </span>
                  </div>
                ))}
              </div>
              {mixTotal !== 100 && (
                <p className="text-xs text-yellow-400 mt-2">⚠ El total debe sumar 100% (actualmente {mixTotal}%)</p>
              )}
            </div>
          </div>
        )}

        {/* Step 3 — Productos */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-base font-medium text-gray-100">Tus productos y keywords</h2>
            <div>
              <label className="label">Productos principales</label>
              <textarea
                className="input resize-none"
                rows={3}
                value={form.products}
                onChange={(e) => update("products", e.target.value)}
                placeholder="cortinas blackout, persianas roller, estores, persianas de madera, cortinas zebra, cortinas romanas"
              />
              <p className="text-xs text-gray-600 mt-1">Separados por comas</p>
            </div>
            <div>
              <label className="label">Keywords del negocio</label>
              <textarea
                className="input resize-none"
                rows={3}
                value={form.keywords}
                onChange={(e) => update("keywords", e.target.value)}
                placeholder="decoración hogar, instalación incluida, medidas a pedido, calidad premium, Chile, cortinas a medida"
              />
              <p className="text-xs text-gray-600 mt-1">Palabras clave para hashtags y copy — separadas por comas</p>
            </div>
            <div>
              <label className="label">Instrucción adicional para la IA (opcional)</label>
              <textarea
                className="input resize-none"
                rows={3}
                value={form.customPrompt}
                onChange={(e) => update("customPrompt", e.target.value)}
                placeholder="ej: Siempre menciona que ofrecemos instalación gratuita en Santiago. Nunca menciones precios específicos."
              />
            </div>
          </div>
        )}

        {/* Step 4 — Audiencia */}
        {step === 4 && (
          <div className="space-y-5">
            <h2 className="text-base font-medium text-gray-100">¿A quién le hablas?</h2>
            <div>
              <label className="label">Audiencia objetivo</label>
              <textarea
                className="input resize-none"
                rows={4}
                value={form.targetAudience}
                onChange={(e) => update("targetAudience", e.target.value)}
                placeholder="ej: Dueños de casa en Santiago, entre 30 y 55 años, interesados en decoración de interiores y que valoran la calidad y el diseño. También arquitectos e interioristas que buscan proveedores confiables."
              />
            </div>
            <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-indigo-300 mb-1">Preview del prompt</p>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    La IA usará esta información para generar contenido que suene{" "}
                    <span className="text-indigo-400">{form.tone}</span>,
                    hable de{" "}
                    <span className="text-indigo-400">
                      {form.products
                        ? form.products.split(",").slice(0, 2).join(", ")
                        : "tus productos"}
                    </span>
                    {" "}y esté dirigido a{" "}
                    <span className="text-indigo-400">
                      {form.targetAudience
                        ? form.targetAudience.slice(0, 40) + "..."
                        : "tu audiencia"}
                    </span>
                    .
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 5 — Confirm */}
        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-base font-medium text-gray-100">Resumen de tu marca</h2>

            {saved ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <CheckCircle2 className="w-12 h-12 text-green-400" />
                <p className="text-gray-200 font-medium">¡Marca configurada!</p>
                <p className="text-gray-500 text-sm">Redirigiendo a cuentas...</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {[
                    { label: "Industria", value: form.industry },
                    { label: "Tono", value: form.tone },
                    { label: "Idioma", value: form.language },
                    {
                      label: "Productos",
                      value: form.products || "—",
                    },
                    {
                      label: "Keywords",
                      value: form.keywords || "—",
                    },
                    {
                      label: "Audiencia",
                      value: form.targetAudience
                        ? form.targetAudience.slice(0, 80) + "..."
                        : "—",
                    },
                    {
                      label: "Mix",
                      value: Object.entries(form.contentMix)
                        .map(([k, v]) => `${k} ${v}%`)
                        .join(" · "),
                    },
                  ].map((row) => (
                    <div key={row.label} className="flex gap-3 text-sm">
                      <span className="text-gray-500 w-24 shrink-0">{row.label}</span>
                      <span className="text-gray-300">{row.value}</span>
                    </div>
                  ))}
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleSave}
                  disabled={loading || mixTotal !== 100}
                  className="btn-primary w-full mt-2 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {loading ? "Guardando..." : "Guardar configuración"}
                </button>

                {mixTotal !== 100 && (
                  <p className="text-xs text-yellow-400 text-center">
                    El mix de contenido debe sumar 100% antes de continuar
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Nav buttons */}
      {!saved && (
        <div className="flex justify-between mt-5">
          <button
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="btn-secondary flex items-center gap-2 disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
            Atrás
          </button>
          {step < 5 && (
            <button
              onClick={() => setStep((s) => Math.min(5, s + 1))}
              className="btn-primary flex items-center gap-2"
            >
              Siguiente
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

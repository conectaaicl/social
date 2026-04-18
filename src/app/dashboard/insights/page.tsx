"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Sparkles, TrendingUp, Clock, RefreshCw, Target, Zap,
  BarChart3, Calendar, Lightbulb, Search, AlertCircle,
} from "lucide-react"

interface Suggestion {
  title: string
  type: string
  contentType: string
  why: string
  hook: string
}

interface BestTime {
  hour: number
  avg: number
}

interface BestDay {
  day: number
  name: string
  avg: number
}

interface CompetitorAnalysis {
  strengths: string[]
  opportunities: string[]
  contentIdeas: string[]
  summary: string
}

const TYPE_COLORS: Record<string, string> = {
  FEED: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  STORY: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  REEL: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  CAROUSEL: "bg-teal-500/20 text-teal-300 border-teal-500/30",
}
const CONTENT_LABELS: Record<string, string> = {
  PRODUCTO: "Producto", PROYECTO: "Proyecto", TIP: "Tip", PROMO: "Promoción",
}

export default function InsightsPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [bestTimes, setBestTimes] = useState<{ bestHours: BestTime[]; bestDays: BestDay[]; recommendation: string } | null>(null)
  const [loadingSug, setLoadingSug] = useState(false)
  const [loadingTimes, setLoadingTimes] = useState(true)
  const [competitor, setCompetitor] = useState("")
  const [hashtags, setHashtags] = useState("")
  const [competitorResult, setCompetitorResult] = useState<CompetitorAnalysis | null>(null)
  const [loadingCompetitor, setLoadingCompetitor] = useState(false)

  useEffect(() => {
    fetch("/api/insights/best-times")
      .then((r) => r.json())
      .then(setBestTimes)
      .finally(() => setLoadingTimes(false))
  }, [])

  async function handleGetSuggestions() {
    setLoadingSug(true)
    setSuggestions([])
    try {
      const res = await fetch("/api/insights/suggestions")
      const data = await res.json()
      setSuggestions(data.suggestions ?? [])
    } finally {
      setLoadingSug(false)
    }
  }

  async function handleAnalyzeCompetitor() {
    setLoadingCompetitor(true)
    setCompetitorResult(null)
    try {
      const tags = hashtags.split(",").map((t) => t.trim()).filter(Boolean)
      const res = await fetch("/api/competitor/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitorHandle: competitor, hashtags: tags }),
      })
      const data = await res.json()
      setCompetitorResult(data.analysis)
    } finally {
      setLoadingCompetitor(false)
    }
  }

  async function handleUseSuggestion(s: Suggestion) {
    const scheduledAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16)
    const res = await fetch("/api/posts/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postType: s.type,
        contentType: s.contentType,
        platforms: ["INSTAGRAM", "FACEBOOK"],
        scheduledAt,
      }),
    })
    if (res.ok) alert(`✅ Post "${s.title}" generado y programado. Ve a Posts para verlo.`)
    else alert("Error al generar el post")
  }

  return (
    <div className="p-4 md:p-8 space-y-5 md:space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold text-gray-100">Inteligencia de Contenido</h1>
        <p className="text-gray-500 mt-0.5 text-sm">IA que analiza tus datos y optimiza tu estrategia</p>
      </div>

      {/* Best Times */}
      <div className="card p-5">
        <h2 className="font-semibold text-gray-100 mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-400" />
          Mejor horario de publicación
        </h2>
        {loadingTimes ? (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <RefreshCw className="w-4 h-4 animate-spin" /> Analizando tus datos…
          </div>
        ) : !bestTimes || bestTimes.bestHours.length === 0 ? (
          <p className="text-gray-500 text-sm">Necesitas más posts publicados para generar predicciones. Sigue publicando y los datos aparecerán aquí.</p>
        ) : (
          <>
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-4 py-3 mb-5">
              <p className="text-indigo-300 text-sm font-medium flex items-center gap-2">
                <Zap className="w-4 h-4" />
                {bestTimes.recommendation}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-2 font-medium">Mejores horas</p>
                <div className="space-y-1.5">
                  {bestTimes.bestHours.slice(0, 5).map((h) => (
                    <div key={h.hour} className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-14">{h.hour}:00 hs</span>
                      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${(h.avg / (bestTimes.bestHours[0]?.avg || 1)) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{h.avg}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-2 font-medium">Mejores días</p>
                <div className="space-y-1.5">
                  {bestTimes.bestDays.slice(0, 5).map((d) => (
                    <div key={d.day} className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-12">{d.name}</span>
                      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full"
                          style={{ width: `${(d.avg / (bestTimes.bestDays[0]?.avg || 1)) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{d.avg}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* AI Content Suggestions */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-100 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-yellow-400" />
            Sugerencias inteligentes de contenido
          </h2>
          <button
            onClick={handleGetSuggestions}
            disabled={loadingSug}
            className="btn-primary flex items-center gap-2 text-sm py-1.5"
          >
            {loadingSug ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loadingSug ? "Analizando…" : "Generar 6 ideas"}
          </button>
        </div>

        {suggestions.length === 0 && !loadingSug && (
          <p className="text-gray-500 text-sm">
            Claude analizará tus métricas de rendimiento y sugerirá el tipo de contenido con mayor probabilidad de éxito.
          </p>
        )}

        {suggestions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {suggestions.map((s, i) => (
              <div key={i} className="border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-gray-200">{s.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${TYPE_COLORS[s.type] ?? "bg-gray-800 text-gray-400 border-gray-700"} shrink-0`}>
                    {s.type}
                  </span>
                </div>
                <p className="text-xs text-indigo-300 italic mb-1.5">"{s.hook}"</p>
                <p className="text-xs text-gray-500 mb-3">{s.why}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">
                    {CONTENT_LABELS[s.contentType] ?? s.contentType}
                  </span>
                  <button
                    onClick={() => handleUseSuggestion(s)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" /> Generar post
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Competitor Analysis */}
      <div className="card p-5">
        <h2 className="font-semibold text-gray-100 mb-4 flex items-center gap-2">
          <Search className="w-4 h-4 text-teal-400" />
          Análisis de competencia
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Handle del competidor (sin @)</label>
            <input
              value={competitor}
              onChange={(e) => setCompetitor(e.target.value)}
              placeholder="ejemplo: marca_competidora"
              className="input text-sm py-2"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Hashtags a analizar (separados por coma)</label>
            <input
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="#decoracion, #blinds, #hogar"
              className="input text-sm py-2"
            />
          </div>
        </div>
        <button
          onClick={handleAnalyzeCompetitor}
          disabled={loadingCompetitor || (!competitor && !hashtags)}
          className="btn-primary flex items-center gap-2 text-sm py-2 mb-4"
        >
          {loadingCompetitor ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
          {loadingCompetitor ? "Analizando…" : "Analizar competencia"}
        </button>

        {competitorResult && (
          <div className="space-y-4">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
              <p className="text-sm text-blue-300">{competitorResult.summary}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <h3 className="text-xs font-semibold text-gray-400 mb-2">💪 Fortalezas del competidor</h3>
                <ul className="space-y-1">
                  {competitorResult.strengths.map((s, i) => (
                    <li key={i} className="text-xs text-gray-300 flex gap-1.5"><span className="text-gray-600">•</span>{s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-400 mb-2">🎯 Oportunidades para ti</h3>
                <ul className="space-y-1">
                  {competitorResult.opportunities.map((o, i) => (
                    <li key={i} className="text-xs text-teal-300 flex gap-1.5"><span className="text-teal-600">→</span>{o}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-400 mb-2">✨ Ideas para superarlo</h3>
                <ul className="space-y-1">
                  {competitorResult.contentIdeas.map((idea, i) => (
                    <li key={i} className="text-xs text-indigo-300 flex gap-1.5"><span className="text-indigo-600">★</span>{idea}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

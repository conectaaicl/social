"use client"

import { useEffect, useState, useCallback } from "react"
import { ChevronLeft, ChevronRight, Zap, Loader2, Plus, CheckCircle2, Image, Video, Layers } from "lucide-react"
import { addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isToday, format } from "date-fns"
import Link from "next/link"

interface CalendarSlot {
  id: string
  scheduled_date: string
  time_slot: string
  formato: string
  objetivo: string
  tema_sugerido: string | null
  post_id: string | null
  post_status: string | null
  caption_principal: string | null
}

interface Post {
  id: string
  type: string
  status: string
  caption: string
  scheduledAt: string
}

const STATUS_DOT: Record<string, string> = {
  scheduled: "bg-indigo-400", published: "bg-green-400",
  generating: "bg-yellow-400", failed: "bg-red-400",
  pending: "bg-gray-500", publishing: "bg-blue-400",
}
const FORMAT_ICON: Record<string, any> = {
  carrusel: Layers, reel: Video, historia: Image, imagen: Image,
}
const OBJ_COLOR: Record<string, string> = {
  engagement: "text-pink-400", educativo: "text-blue-400",
  promocional: "text-yellow-400", inspiracional: "text-purple-400",
  testimonial: "text-green-400",
}
const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState<Date | null>(null)
  const [slots, setSlots] = useState<CalendarSlot[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generatingSlot, setGeneratingSlot] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<CalendarSlot | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  // defer date init to client — prevents SSR/hydration mismatch
  useEffect(() => { setCurrentMonth(new Date()) }, [])

  const year = currentMonth?.getFullYear() ?? 0
  const month = currentMonth != null ? currentMonth.getMonth() + 1 : 0

  const fetchData = useCallback(async () => {
    if (!currentMonth) return
    setLoading(true)
    try {
      const [slotsRes, postsRes] = await Promise.all([
        fetch(`/api/calendar/${year}/${month}`),
        fetch("/api/posts?limit=100"),
      ])
      const sd = await slotsRes.json()
      const pd = await postsRes.json()
      setSlots(sd.slots ?? [])
      setPosts(pd.posts ?? [])
    } finally {
      setLoading(false)
    }
  }, [year, month, currentMonth])

  useEffect(() => { fetchData() }, [fetchData])

  const generateCalendar = async () => {
    setGenerating(true)
    setMsg(null)
    try {
      const res = await fetch("/api/calendar/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month }),
      })
      const data = await res.json()
      setMsg(data.message ?? "Calendario generado")
      await fetchData()
    } catch {
      setMsg("Error al generar")
    } finally {
      setGenerating(false)
    }
  }

  const generateSlotContent = async (slot: CalendarSlot) => {
    setGeneratingSlot(slot.id)
    setMsg(null)
    try {
      const res = await fetch(`/api/calendar/slots/${slot.id}/generate`, { method: "POST" })
      const data = await res.json()
      if (data.ok) {
        setMsg("Post generado — agrega imagen en Posts")
        await fetchData()
        setSelectedSlot(null)
      } else {
        setMsg(data.error ?? "Error al generar")
      }
    } finally {
      setGeneratingSlot(null)
    }
  }

  if (!currentMonth) return (
    <div className="flex items-center justify-center h-screen bg-gray-950">
      <Loader2 size={20} className="animate-spin text-indigo-400" />
    </div>
  )

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) })
  const startDow = startOfMonth(currentMonth).getDay()

  const slotsByDate = new Map<string, CalendarSlot[]>()
  slots.forEach((s) => {
    if (!slotsByDate.has(s.scheduled_date)) slotsByDate.set(s.scheduled_date, [])
    slotsByDate.get(s.scheduled_date)!.push(s)
  })

  const postsByDate = new Map<string, Post[]>()
  posts.forEach((p) => {
    if (!p.scheduledAt) return
    const key = p.scheduledAt.split("T")[0]
    if (!postsByDate.has(key)) postsByDate.set(key, [])
    postsByDate.get(key)!.push(p)
  })

  return (
    <div className="flex flex-col h-full min-h-screen">
      <div className="px-6 py-4 border-b border-gray-800 bg-gray-950 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">Calendario Social IA</h1>
            <p className="text-xs text-gray-500 mt-0.5">{slots.length} slots planificados</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setCurrentMonth(m => subMonths(m!, 1))} className="p-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white transition">
              <ChevronLeft size={16} />
            </button>
            <span className="text-white font-semibold min-w-[140px] text-center text-sm">
              {MONTHS[month - 1]} {year}
            </span>
            <button onClick={() => setCurrentMonth(m => addMonths(m!, 1))} className="p-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white transition">
              <ChevronRight size={16} />
            </button>
            <button onClick={generateCalendar} disabled={generating}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition disabled:opacity-60">
              {generating ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
              {generating ? "Generando..." : "Generar con IA"}
            </button>
          </div>
        </div>
        {msg && (
          <div className="mt-2 text-xs text-indigo-300 bg-indigo-900/30 border border-indigo-700/40 rounded-lg px-3 py-1.5">{msg}</div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 p-4 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-gray-500">
              <Loader2 size={20} className="animate-spin mr-2" /> Cargando...
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1.5 mb-1.5">
                {["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"].map(d => (
                  <div key={d} className="text-center text-[10px] text-gray-600 uppercase tracking-widest py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: startDow }).map((_, i) => <div key={"e"+i} />)}
                {days.map((day) => {
                  const key = format(day, "yyyy-MM-dd")
                  const daySlots = slotsByDate.get(key) ?? []
                  const dayPosts = postsByDate.get(key) ?? []
                  const today = isToday(day)
                  return (
                    <div key={key}
                      className={"min-h-[88px] rounded-xl border p-1.5 transition-colors " +
                        (today ? "border-indigo-500/50 bg-indigo-900/10" : "border-gray-800 bg-gray-900/40 hover:border-gray-700")}>
                      <div className={"text-xs font-medium px-0.5 mb-1 " + (today ? "text-indigo-400" : "text-gray-500")}>
                        {day.getDate()}
                      </div>
                      <div className="space-y-0.5">
                        {daySlots.map((slot) => {
                          const Icon = FORMAT_ICON[slot.formato] ?? Image
                          return (
                            <button key={slot.id} onClick={() => setSelectedSlot(slot)}
                              className={"w-full text-left px-1.5 py-1 rounded-lg transition " +
                                (selectedSlot?.id === slot.id
                                  ? "bg-indigo-600/30 border border-indigo-500/50"
                                  : "bg-gray-800/60 hover:bg-gray-700/60 border border-transparent")}>
                              <div className="flex items-center gap-1">
                                <Icon size={8} className={slot.post_id ? "text-green-400" : "text-gray-500"} />
                                <span className="text-[9px] text-gray-400 capitalize truncate flex-1">{slot.formato}</span>
                                {slot.post_id && <div className={"w-1.5 h-1.5 rounded-full " + (STATUS_DOT[slot.post_status ?? "pending"] ?? "bg-gray-500")} />}
                              </div>
                              {slot.tema_sugerido && (
                                <div className="text-[8px] text-gray-600 truncate mt-0.5">{slot.tema_sugerido.slice(0, 28)}</div>
                              )}
                            </button>
                          )
                        })}
                        {dayPosts.filter(p => !daySlots.find(s => s.post_id === p.id)).map((post) => (
                          <Link key={post.id} href="/dashboard/posts"
                            className="w-full text-left px-1.5 py-1 rounded-lg bg-gray-800/40 hover:bg-gray-700/40 border border-transparent block">
                            <div className="flex items-center gap-1">
                              <div className={"w-1.5 h-1.5 rounded-full " + (STATUS_DOT[post.status.toLowerCase()] ?? "bg-gray-500")} />
                              <span className="text-[9px] text-gray-400 capitalize truncate">{post.type.toLowerCase()}</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
              {slots.length === 0 && (
                <div className="text-center py-16">
                  <Zap size={36} className="text-indigo-600/40 mx-auto mb-3" />
                  <h3 className="text-white font-semibold mb-1">Sin planificación aún</h3>
                  <p className="text-gray-500 text-sm mb-5">La IA genera hasta 20 posts optimizados para tu negocio.</p>
                  <button onClick={generateCalendar} disabled={generating}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl mx-auto text-sm font-medium transition disabled:opacity-60">
                    {generating ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                    Generar calendario de {MONTHS[month - 1]}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {selectedSlot && (
          <div className="w-72 border-l border-gray-800 bg-gray-900/60 p-5 overflow-y-auto flex-shrink-0">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-xs text-gray-500 capitalize mb-1">
                  {selectedSlot.formato} · <span className={OBJ_COLOR[selectedSlot.objetivo] ?? "text-gray-400"}>{selectedSlot.objetivo}</span>
                </div>
                <div className="text-xs text-gray-400">{selectedSlot.time_slot} · {selectedSlot.scheduled_date}</div>
              </div>
              <button onClick={() => setSelectedSlot(null)} className="text-gray-600 hover:text-gray-300 text-xl leading-none">x</button>
            </div>

            {selectedSlot.tema_sugerido && (
              <div className="mb-4 p-3 bg-gray-800/60 rounded-xl border border-gray-700/50">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Tema IA</div>
                <p className="text-white text-sm leading-snug">{selectedSlot.tema_sugerido}</p>
              </div>
            )}

            {selectedSlot.caption_principal && (
              <div className="mb-4 p-3 bg-gray-800/40 rounded-xl border border-gray-700/30">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Caption</div>
                <p className="text-gray-300 text-xs leading-relaxed line-clamp-6">{selectedSlot.caption_principal}</p>
              </div>
            )}

            <div className="space-y-2 mt-4">
              {!selectedSlot.post_id ? (
                <button onClick={() => generateSlotContent(selectedSlot)} disabled={!!generatingSlot}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition disabled:opacity-60">
                  {generatingSlot === selectedSlot.id ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                  {generatingSlot === selectedSlot.id ? "Generando..." : "Generar contenido IA"}
                </button>
              ) : (
                <Link href="/dashboard/posts"
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-700/40 hover:bg-green-700/60 text-green-300 text-sm font-medium rounded-xl transition border border-green-700/40">
                  <CheckCircle2 size={14} />
                  Ver post generado
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

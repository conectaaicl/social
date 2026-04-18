"use client"

import { useEffect, useState, useCallback } from "react"
import {
  ChevronLeft, ChevronRight, Instagram, Facebook, Video, Image, RefreshCw
} from "lucide-react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday } from "date-fns"
import { es } from "date-fns/locale"

interface Post {
  id: string
  type: string
  contentType: string
  platform: string[]
  status: string
  caption: string
  scheduledAt: string
  mediaUrls: string[]
  thumbnailUrl: string | null
}

const STATUS_DOT: Record<string, string> = {
  SCHEDULED: "bg-indigo-400",
  PUBLISHED: "bg-green-400",
  GENERATING: "bg-yellow-400",
  FAILED: "bg-red-400",
  PENDING: "bg-gray-500",
  PUBLISHING: "bg-blue-400",
}

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date())

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/posts?limit=200")
      const data = await res.json()
      setPosts(data.posts ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const startDow = monthStart.getDay()
  const blanks = Array.from({ length: startDow })

  function postsForDay(day: Date) {
    return posts.filter((p) => isSameDay(new Date(p.scheduledAt), day))
  }

  const selectedPosts = selectedDay ? postsForDay(selectedDay) : []

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-100">Calendario</h1>
        <p className="text-gray-500 mt-1 text-sm">Vista mensual de todos tus posts programados</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <div className="card">
            {/* Nav */}
            <div className="flex items-center justify-between mb-5">
              <button
                onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
                className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-400" />
              </button>
              <h2 className="text-base font-semibold text-gray-100 capitalize">
                {format(currentMonth, "MMMM yyyy", { locale: es })}
              </h2>
              <button
                onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
                className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Day labels */}
            <div className="grid grid-cols-7 mb-2">
              {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((d) => (
                <div key={d} className="text-center text-xs font-medium text-gray-500 py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1">
              {blanks.map((_, i) => <div key={`blank-${i}`} />)}
              {days.map((day) => {
                const dayPosts = postsForDay(day)
                const isSelected = selectedDay && isSameDay(day, selectedDay)
                const today = isToday(day)

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDay(day)}
                    className={`relative p-2 rounded-lg text-left transition-all min-h-[64px] ${
                      isSelected
                        ? "bg-indigo-600/20 border border-indigo-500/40"
                        : "hover:bg-gray-800 border border-transparent"
                    }`}
                  >
                    <span
                      className={`text-xs font-medium block mb-1 ${
                        today
                          ? "w-5 h-5 bg-indigo-500 text-white rounded-full flex items-center justify-center text-[10px]"
                          : isSelected
                          ? "text-indigo-300"
                          : "text-gray-400"
                      }`}
                    >
                      {format(day, "d")}
                    </span>
                    <div className="flex flex-wrap gap-0.5">
                      {dayPosts.slice(0, 3).map((p) => (
                        <span
                          key={p.id}
                          className={`w-2 h-2 rounded-full ${STATUS_DOT[p.status] ?? "bg-gray-600"}`}
                        />
                      ))}
                      {dayPosts.length > 3 && (
                        <span className="text-[9px] text-gray-500">+{dayPosts.length - 3}</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-5 pt-4 border-t border-gray-800">
              {[
                { label: "Programado", dot: "bg-indigo-400" },
                { label: "Publicado", dot: "bg-green-400" },
                { label: "Generando", dot: "bg-yellow-400" },
                { label: "Fallido", dot: "bg-red-400" },
              ].map(({ label, dot }) => (
                <div key={label} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className={`w-2 h-2 rounded-full ${dot}`} />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Day detail */}
        <div className="card">
          {selectedDay ? (
            <>
              <h3 className="text-sm font-semibold text-gray-200 mb-4 capitalize">
                {format(selectedDay, "EEEE d 'de' MMMM", { locale: es })}
              </h3>
              {loading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin" />
                </div>
              ) : selectedPosts.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">Sin posts este día</p>
              ) : (
                <div className="space-y-3">
                  {selectedPosts.map((post) => (
                    <div key={post.id} className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg">
                      {post.mediaUrls[0] ? (
                        <img
                          src={post.thumbnailUrl ?? post.mediaUrls[0]}
                          alt=""
                          className="w-12 h-12 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center shrink-0">
                          {post.type === "REEL" ? (
                            <Video className="w-5 h-5 text-gray-500" />
                          ) : (
                            <Image className="w-5 h-5 text-gray-500" />
                          )}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-1">
                          {post.platform.map((p) => (
                            <span key={p}>
                              {p === "INSTAGRAM" ? (
                                <Instagram className="w-3 h-3 text-pink-400" />
                              ) : (
                                <Facebook className="w-3 h-3 text-blue-400" />
                              )}
                            </span>
                          ))}
                          <span className="text-xs text-gray-500">
                            {format(new Date(post.scheduledAt), "HH:mm")}
                          </span>
                          <span
                            className={`ml-auto w-2 h-2 rounded-full ${STATUS_DOT[post.status] ?? "bg-gray-500"}`}
                          />
                        </div>
                        <p className="text-xs text-gray-300 line-clamp-2 leading-relaxed">{post.caption}</p>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {post.type} · {post.contentType}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-gray-500 text-sm text-center py-8">Selecciona un día</p>
          )}
        </div>
      </div>
    </div>
  )
}

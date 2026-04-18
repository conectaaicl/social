import { addDays, setHours, setMinutes, parseISO, isAfter, isBefore } from "date-fns"
import { toZonedTime, fromZonedTime } from "date-fns-tz"

export interface ScheduleSlot {
  time: string
  type: "feed" | "story" | "reel"
}

export interface ScheduledPost {
  scheduledAt: Date
  postType: "FEED" | "STORY" | "REEL" | "CAROUSEL"
  contentType: "PRODUCTO" | "PROYECTO" | "TIP" | "PROMO"
}

function slotToPostType(type: string): "FEED" | "STORY" | "REEL" | "CAROUSEL" {
  const map: Record<string, "FEED" | "STORY" | "REEL"> = {
    feed: "FEED",
    story: "STORY",
    reel: "REEL",
  }
  return map[type] ?? "FEED"
}

function pickContentType(
  contentMix: Record<string, number>,
  usedCounts: Record<string, number>
): "PRODUCTO" | "PROYECTO" | "TIP" | "PROMO" {
  const types = Object.keys(contentMix) as Array<"PRODUCTO" | "PROYECTO" | "TIP" | "PROMO">
  const weights = types.map((t) => {
    const target = contentMix[t] ?? 0
    const used = usedCounts[t] ?? 0
    return Math.max(0, target - used * 10)
  })
  const total = weights.reduce((a, b) => a + b, 0)
  if (total === 0) return types[Math.floor(Math.random() * types.length)]

  let rand = Math.random() * total
  for (let i = 0; i < types.length; i++) {
    rand -= weights[i]
    if (rand <= 0) return types[i]
  }
  return types[0]
}

export function buildDailySchedule(params: {
  scheduleSlots: ScheduleSlot[]
  contentMix: Record<string, number>
  timezone: string
  date?: Date
}): ScheduledPost[] {
  const { scheduleSlots, contentMix, timezone, date = new Date() } = params
  const usedCounts: Record<string, number> = {}
  const posts: ScheduledPost[] = []

  for (const slot of scheduleSlots) {
    const [hours, minutes] = slot.time.split(":").map(Number)

    const zonedDate = toZonedTime(date, timezone)
    zonedDate.setHours(hours, minutes, 0, 0)
    const scheduledAt = fromZonedTime(zonedDate, timezone)

    const contentType = pickContentType(contentMix, usedCounts)
    usedCounts[contentType] = (usedCounts[contentType] ?? 0) + 1

    posts.push({
      scheduledAt,
      postType: slotToPostType(slot.type),
      contentType,
    })
  }

  return posts
}

export function getPostsDueNow(posts: Array<{ scheduledAt: Date; status: string }>) {
  const now = new Date()
  const windowMs = 10 * 60 * 1000 // 10-minute window
  return posts.filter(
    (p) =>
      p.status === "SCHEDULED" &&
      isAfter(now, new Date(p.scheduledAt)) &&
      isBefore(now, addDays(new Date(p.scheduledAt), 1))
  )
}

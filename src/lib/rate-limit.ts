import { NextRequest, NextResponse } from "next/server"

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

setInterval(() => {
  const now = Date.now()
  Array.from(store.keys()).forEach(key => {
    const entry = store.get(key)
    if (entry && entry.resetAt < now) store.delete(key)
  })
}, 5 * 60 * 1000)

export function rateLimit(
  req: NextRequest,
  options: { limit: number; windowMs: number; keyPrefix?: string }
): NextResponse | null {
  const forwarded = req.headers.get("x-forwarded-for")
  const ip = forwarded?.split(",")[0].trim() ?? req.headers.get("x-real-ip") ?? "unknown"
  const key = (options.keyPrefix ?? "rl") + ":" + ip
  const now = Date.now()

  let entry = store.get(key)
  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + options.windowMs }
    store.set(key, entry)
  }

  entry.count++

  if (entry.count > options.limit) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((entry.resetAt - now) / 1000)),
          "X-RateLimit-Limit": String(options.limit),
          "X-RateLimit-Remaining": "0",
        },
      }
    )
  }

  return null
}

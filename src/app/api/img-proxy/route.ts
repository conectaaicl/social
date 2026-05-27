import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

const ALLOWED_EXACT: string[] = [
  'pub-98c09ef624ce462a8e1f14035cc06391.r2.dev',
  'pbs.twimg.com',
  'graph.instagram.com',
  'lookaside.instagram.com',
  'social.conectaai.cl',
]
const ALLOWED_SUFFIX: string[] = [
  '.cdninstagram.com',
  '.fbcdn.net',
  '.fal.media',
  '.replicate.delivery',
  '.pexels.com',
  '.images.unsplash.com',
]

function isPrivateIP(host: string): boolean {
  const lower = host.toLowerCase()
  const privatePrefixes = [
    'localhost', '127.', '0.0.0.0', '::1', 'db',
    '10.', '192.168.', '169.254.',
    'fe80:', 'fc00:', 'fd',
  ]
  const m = host.match(/^172\.(\d+)\./)
  if (m && +m[1] >= 16 && +m[1] <= 31) return true
  return privatePrefixes.some(p => lower.startsWith(p)) ||
    lower.endsWith('.internal') || lower.endsWith('.local')
}

function isHostAllowed(host: string): boolean {
  if (ALLOWED_EXACT.includes(host)) return true
  return ALLOWED_SUFFIX.some(s => host.endsWith(s))
}

async function fetchImage(url: string): Promise<Response | null> {
  const res = await fetch(url, {
    redirect: 'manual',
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SocialBot/1.0)', 'Accept': 'image/*,*/*' },
    signal: AbortSignal.timeout(10000),
  })
  if (res.status === 301 || res.status === 302 || res.status === 307 || res.status === 308) {
    const loc = res.headers.get('location')
    if (!loc) return null
    let redirectHost: string
    try { redirectHost = new URL(loc).hostname } catch { return null }
    if (isPrivateIP(redirectHost) || !isHostAllowed(redirectHost)) return null
    return fetch(loc, {
      redirect: 'manual',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SocialBot/1.0)', 'Accept': 'image/*,*/*' },
      signal: AbortSignal.timeout(10000),
    })
  }
  return res
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return new NextResponse('', { status: 401 })

  const raw = req.nextUrl.searchParams.get('url')
  if (!raw) return new NextResponse('', { status: 400 })

  let parsed: URL
  try { parsed = new URL(raw) } catch { return new NextResponse('', { status: 400 }) }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return new NextResponse('', { status: 400 })
  }

  const host = parsed.hostname
  if (isPrivateIP(host)) return new NextResponse('', { status: 403 })
  if (!isHostAllowed(host)) return new NextResponse('', { status: 403 })

  try {
    const res = await fetchImage(raw)
    if (!res || !res.ok) return new NextResponse('', { status: 404 })
    const buffer = Buffer.from(await res.arrayBuffer())
    const ct = res.headers.get('content-type') || 'image/jpeg'
    return new NextResponse(buffer, {
      headers: { 'Content-Type': ct, 'Cache-Control': 'public, max-age=604800, immutable' },
    })
  } catch {
    return new NextResponse('', { status: 502 })
  }
}

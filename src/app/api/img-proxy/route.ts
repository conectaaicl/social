import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

const ALLOWED_HOSTS = [
  'pub-98c09ef624ce462a8e1f14035cc06391.r2.dev',
  'cdninstagram.com',
  'scontent',
  'fbcdn.net',
  'pbs.twimg.com',
  'graph.instagram.com',
  'lookaside.instagram.com',
  'social.conectaai.cl',
]

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return new NextResponse('', { status: 401 })

  const raw = req.nextUrl.searchParams.get('url')
  if (!raw) return new NextResponse('', { status: 400 })

  let parsed: URL
  try { parsed = new URL(raw) } catch { return new NextResponse('', { status: 400 }) }

  const host = parsed.hostname
  const isInternal = host === 'localhost' || host === '127.0.0.1' || host.startsWith('10.') ||
    host.startsWith('192.168.') || host.startsWith('172.') || host === 'db' || host.endsWith('.internal')
  if (isInternal) return new NextResponse('', { status: 403 })

  const isAllowed = ALLOWED_HOSTS.some(h => host.includes(h))
  if (!isAllowed) return new NextResponse('', { status: 403 })

  try {
    const res = await fetch(raw, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)', 'Accept': 'image/*,*/*' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return new NextResponse('', { status: 404 })

    const buffer = Buffer.from(await res.arrayBuffer())
    const ct = res.headers.get('content-type') || 'image/jpeg'

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': ct,
        'Cache-Control': 'public, max-age=604800, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch {
    return new NextResponse('', { status: 502 })
  }
}

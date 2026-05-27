import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function analyzeSentiment(caption: string, apiKey: string): Promise<{ label: string; score: number }> {
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 20,
        messages: [{ role: "user", content: `Classify sentiment of this Instagram caption as exactly one word: positive, negative, or neutral. Caption: "${caption.slice(0, 300)}"` }],
      }),
      signal: AbortSignal.timeout(8000),
    })
    const d = await r.json()
    const label = (d.content?.[0]?.text ?? "neutral").toLowerCase().trim()
    const score = label === "positive" ? 1 : label === "negative" ? -1 : 0
    return { label: label.includes("pos") ? "positive" : label.includes("neg") ? "negative" : "neutral", score }
  } catch { return { label: "neutral", score: 0 } }
}


export async function POST(req: NextRequest) {
  const session = await auth()
  const tenantId = session?.user?.tenantId
  if (!tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { apifyToken: true } })
  const apifyToken = tenant?.apifyToken || process.env.APIFY_TOKEN

  if (!apifyToken || apifyToken === 'your_apify_token_here') {
    return NextResponse.json({ error: 'Apify token no configurado' }, { status: 503 })
  }

  const body = await req.json().catch(() => ({}))
  const { monitorId } = body

  const where = monitorId
    ? { id: monitorId as string, tenantId }
    : { tenantId, active: true }

  const monitors = await prisma.hashtagMonitor.findMany({ where })
  if (!monitors.length) return NextResponse.json({ error: 'No hay hashtags configurados' }, { status: 404 })

  const hashtags = monitors.map(m => m.hashtag)
  let totalLeads = 0
  let newLeads = 0
  const errors: string[] = []

  try {
    const apifyRes = await fetch(
      'https://api.apify.com/v2/acts/apify~instagram-hashtag-scraper/run-sync-get-dataset-items?token=' + apifyToken,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hashtags, resultsLimit: 20 }),
        signal: AbortSignal.timeout(120000),
      }
    )

    if (!apifyRes.ok) {
      const errText = await apifyRes.text().catch(() => apifyRes.status.toString())
      throw new Error('Apify error ' + apifyRes.status + ': ' + errText.slice(0, 200))
    }

    const items = await apifyRes.json()
    if (!Array.isArray(items)) throw new Error('Apify returned non-array: ' + JSON.stringify(items).slice(0, 100))

    for (const item of items) {
      // Apify may return hashtag in item.hashtag OR we extract it from inputUrl
      // e.g. inputUrl = "https://www.instagram.com/explore/tags/toldos"
      const rawHashtag =
        item.hashtag?.replace(/^#/, '').toLowerCase() ||
        item.inputUrl?.split('/tags/')[1]?.split('/')[0]?.toLowerCase() ||
        null

      if (!rawHashtag) continue

      const monitor = monitors.find(m => m.hashtag.toLowerCase() === rawHashtag)
      if (!monitor) continue

      const postId = item.id || item.shortCode
      if (!postId) continue

      totalLeads++

      try {
        const existing = await prisma.hashtagLead.findUnique({
          where: { monitorId_postId: { monitorId: monitor.id, postId: String(postId) } },
        })
        if (existing) continue

        const sentimentResult = item.caption && apifyToken
          ? await analyzeSentiment(item.caption, apifyToken)
          : { label: 'neutral', score: 0 }

        await prisma.hashtagLead.create({
          data: {
            monitorId: monitor.id,
            tenantId,
            postId: String(postId),
            username: item.ownerUsername || item.username || 'unknown',
            caption: item.caption ? item.caption.slice(0, 500) : null,
            mediaUrl: item.displayUrl || item.thumbnailSrc || null,
            postUrl: item.url || ('https://instagram.com/p/' + (item.shortCode || '')),
            likesCount: item.likesCount || 0,
            commentsCount: item.commentsCount || 0,
            followersCount: item.ownerFollowersCount || null,
            bio: item.ownerBiography ? item.ownerBiography.slice(0, 300) : null,
            sentiment: sentimentResult.label,
            sentimentScore: sentimentResult.score,
          },
        })
        newLeads++
      } catch (innerErr: any) {
        const msg = innerErr?.message || String(innerErr)
        if (!msg.includes('Unique constraint')) {
          errors.push('Lead save error: ' + msg.slice(0, 100))
          console.error('[hashtag-scan] lead save error:', msg)
        }
      }
    }

    await Promise.all(monitors.map(m =>
      prisma.hashtagMonitor.update({
        where: { id: m.id },
        data: { lastScan: new Date(), postsFound: { increment: newLeads } },
      })
    ))

    return NextResponse.json({ ok: true, scanned: hashtags.length, total: totalLeads, new: newLeads, errors })
  } catch (e: any) {
    console.error('[hashtag-scan] outer error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const session = await auth()
  const tenantId = session?.user?.tenantId
  if (!tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const monitorId = req.nextUrl.searchParams.get('monitorId')
  const where = monitorId ? { monitorId, tenantId } : { tenantId }

  const leads = await prisma.hashtagLead.findMany({
    where,
    include: { monitor: { select: { hashtag: true } } },
    orderBy: { scannedAt: 'desc' },
    take: 100,
  })
  return NextResponse.json(leads)
}

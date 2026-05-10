import path from 'path'
import fs from 'fs'
import { randomBytes } from 'crypto'

async function mirrorImage(url: string | null | undefined): Promise<string | null> {
  if (!url) return null
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return url
    const buf  = Buffer.from(await res.arrayBuffer())
    const ext  = res.headers.get('content-type')?.includes('png') ? 'png' : 'jpg'
    const name = randomBytes(12).toString('hex') + '.' + ext
    const dir  = path.join(process.cwd(), 'public', 'uploads')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, name), buf)
    return process.env.NEXTAUTH_URL
      ? process.env.NEXTAUTH_URL.replace(/\/$/, '') + '/uploads/' + name
      : '/uploads/' + name
  } catch {
    return url
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

const T = {
  likes:    parseInt(process.env.VIRAL_LIKES    || '300'),
  comments: parseInt(process.env.VIRAL_COMMENTS || '30'),
  views:    parseInt(process.env.VIRAL_VIEWS    || '5000'),
}

function score(l = 0, c = 0, v = 0) { return l * 1 + c * 3 + v * 0.01 }
function viral(l = 0, c = 0, v = 0) { return l >= T.likes || c >= T.comments || v >= T.views }

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  const isCron = !!secret && secret === process.env.CRON_SECRET

  let tenantId: string | undefined
  if (!isCron) {
    const session = await auth()
    if (!session?.user?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    tenantId = session.user.tenantId
  }

  const where = tenantId
    ? { active: true, platform: 'instagram', tenantId }
    : { active: true, platform: 'instagram' }

  const competitors = await prisma.competitor.findMany({ where })

  if (!process.env.APIFY_TOKEN || process.env.APIFY_TOKEN === 'your_apify_token_here') {
    return NextResponse.json({ demo: true, message: 'APIFY_TOKEN no configurado', competitors: competitors.length })
  }

  const handles = competitors.map(c => c.handle)
  let fetched = 0, viralCount = 0

  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=${process.env.APIFY_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernames: handles, resultsLimit: 12 }),
        signal: AbortSignal.timeout(120000),
      }
    )
    if (!res.ok) throw new Error(`Apify ${res.status}`)
    const profiles = await res.json()

    for (const profile of profiles) {
      const comp = competitors.find(c => c.handle === profile.username)
      if (!comp) continue
      await prisma.competitor.update({
        where: { id: comp.id },
        data: { followersCount: profile.followersCount, avatarUrl: profile.profilePicUrl },
      })
      for (const post of (profile.latestPosts || [])) {
        const l = post.likesCount || 0
        const c = post.commentsCount || 0
        const v = post.videoViewCount || 0
        const s = score(l, c, v)
        const iv = viral(l, c, v)
        await prisma.competitorPost.upsert({
          where: { competitorId_postId: { competitorId: comp.id, postId: post.id } },
          update: { likesCount: l, commentsCount: c, viewsCount: v, isViral: iv, viralScore: s },
          create: {
            competitorId: comp.id, postId: post.id, caption: post.caption,
            mediaUrl: await mirrorImage(post.displayUrl), mediaType: post.type, postUrl: post.url,
            likesCount: l, commentsCount: c, viewsCount: v, isViral: iv, viralScore: s,
            postedAt: post.timestamp ? new Date(post.timestamp) : null,
          },
        })
        fetched++
        if (iv) viralCount++
      }
    }
    return NextResponse.json({ ok: true, fetched, viral: viralCount })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

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
    const apifyRes = await fetch(
      'https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items?token=' + process.env.APIFY_TOKEN,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernames: handles, resultsLimit: 12 }),
        signal: AbortSignal.timeout(120000),
      }
    )
    if (!apifyRes.ok) throw new Error('Apify ' + apifyRes.status)
    const profiles = await apifyRes.json()

    for (const profile of profiles) {
      const comp = competitors.find(c => c.handle === profile.username)
      if (!comp) continue

      await prisma.competitor.update({
        where: { id: comp.id },
        data: { followersCount: profile.followersCount, avatarUrl: profile.profilePicUrl },
      })

      const posts = profile.latestPosts || []
      if (!posts.length) continue

      const postsData = posts.map((post: any) => {
        const l = post.likesCount || 0
        const c = post.commentsCount || 0
        const v = post.videoViewCount || 0
        const s = score(l, c, v)
        const iv = viral(l, c, v)
        if (iv) viralCount++
        fetched++
        return {
          competitorId:  comp.id,
          postId:        post.id,
          caption:       post.caption || null,
          mediaUrl:      post.displayUrl || null,
          mediaType:     post.type || null,
          postUrl:       post.url || null,
          likesCount:    l,
          commentsCount: c,
          viewsCount:    v,
          isViral:       iv,
          viralScore:    s,
          postedAt:      post.timestamp ? new Date(post.timestamp) : null,
        }
      })

      const existingIds = await prisma.competitorPost.findMany({
        where: { competitorId: comp.id, postId: { in: postsData.map((p: any) => p.postId) } },
        select: { postId: true },
      })
      const existingSet = new Set(existingIds.map((e: any) => e.postId))

      const toCreate = postsData.filter((p: any) => !existingSet.has(p.postId))
      const toUpdate = postsData.filter((p: any) =>  existingSet.has(p.postId))

      if (toCreate.length) {
        await prisma.competitorPost.createMany({ data: toCreate, skipDuplicates: true })
      }

      await Promise.all(toUpdate.map((p: any) =>
        prisma.competitorPost.update({
          where: { competitorId_postId: { competitorId: comp.id, postId: p.postId } },
          data: { likesCount: p.likesCount, commentsCount: p.commentsCount, viewsCount: p.viewsCount, isViral: p.isViral, viralScore: p.viralScore },
        })
      ))
    }

    return NextResponse.json({ ok: true, fetched, viral: viralCount })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

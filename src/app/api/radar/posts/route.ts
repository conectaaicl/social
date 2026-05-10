import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const tenantId = session.user.tenantId

  const { searchParams } = new URL(req.url)
  const onlyViral = searchParams.get('viral') === 'true'
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

  const posts = await prisma.competitorPost.findMany({
    where: onlyViral
      ? { isViral: true, competitor: { tenantId } }
      : { competitor: { tenantId } },
    include: { competitor: { select: { name: true, handle: true, tier: true, avatarUrl: true } } },
    orderBy: { viralScore: 'desc' },
    take: limit,
  })
  return NextResponse.json(posts)
}

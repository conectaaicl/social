import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { z } from 'zod'

const CreateSchema = z.object({
  handle:   z.string().min(1).max(60).transform(h => h.replace('@', '').trim().toLowerCase()),
  name:     z.string().max(120).optional(),
  platform: z.enum(['instagram', 'facebook']).default('instagram'),
  tier:     z.coerce.number().int().min(1).max(3).default(2),
  notes:    z.string().max(500).optional().nullable(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const tenantId = session.user.tenantId

  const competitors = await prisma.competitor.findMany({
    where: { tenantId },
    orderBy: [{ tier: 'asc' }, { followersCount: 'desc' }],
    include: {
      _count: { select: { posts: true } },
      posts:  { where: { isViral: true }, select: { id: true } },
    },
  })
  return NextResponse.json(competitors)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const tenantId = session.user.tenantId

  const body = await req.json()
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { handle, name, platform, tier, notes } = parsed.data

  const existing = await prisma.competitor.findUnique({ where: { tenantId_handle: { tenantId, handle } } })
  if (existing) {
    if (!existing.active) {
      const updated = await prisma.competitor.update({
        where: { tenantId_handle: { tenantId, handle } },
        data: { active: true, name: name || existing.name },
      })
      return NextResponse.json(updated)
    }
    return NextResponse.json({ error: 'Este handle ya existe' }, { status: 409 })
  }

  const competitor = await prisma.competitor.create({
    data: { tenantId, name: name || handle, handle, platform, tier, notes: notes || null, active: true },
  })
  return NextResponse.json(competitor)
}

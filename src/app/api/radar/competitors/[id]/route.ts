import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { z } from 'zod'

const PatchSchema = z.object({
  active:        z.boolean().optional(),
  tier:          z.number().int().min(1).max(3).optional(),
  name:          z.string().max(120).optional(),
  notes:         z.string().max(500).optional().nullable(),
  followersCount: z.number().int().optional(),
}).strict()

async function ownedCompetitor(tenantId: string, id: string) {
  return prisma.competitor.findFirst({ where: { id, tenantId } })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const tenantId = session.user.tenantId

  const comp = await ownedCompetitor(tenantId, params.id)
  if (!comp) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const body = await req.json()
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const updated = await prisma.competitor.update({ where: { id: params.id }, data: parsed.data })
  return NextResponse.json(updated)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const tenantId = session.user.tenantId

  const comp = await ownedCompetitor(tenantId, params.id)
  if (!comp) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  await prisma.competitor.update({ where: { id: params.id }, data: { active: false } })
  return NextResponse.json({ ok: true })
}

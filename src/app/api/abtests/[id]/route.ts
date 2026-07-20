import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const PatchSchema = z.object({
  status:   z.enum(['draft','running','completed']).optional(),
  winnerId: z.string().optional(),
  name:     z.string().max(120).optional(),
}).strict()

async function owned(tenantId: string, id: string) {
  return prisma.aBTest.findFirst({ where: { id, tenantId } })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const tenantId = session.user.tenantId

  const test = await owned(tenantId, params.id)
  if (!test) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const body = await req.json()
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { winnerId, ...rest } = parsed.data
  const data: any = { ...rest }
  if (winnerId !== undefined) data.winner = winnerId
  if (parsed.data.status === 'running' && !test.startedAt) data.startedAt = new Date()
  if (parsed.data.status === 'completed' && !test.endedAt) data.endedAt = new Date()

  const updated = await prisma.aBTest.update({ where: { id: params.id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const tenantId = session.user.tenantId

  const test = await owned(tenantId, params.id)
  if (!test) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  await prisma.aBTest.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}

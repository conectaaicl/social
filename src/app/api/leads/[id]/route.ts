import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const PatchSchema = z.object({
  nombre:     z.string().max(100).optional(),
  email:      z.string().email().optional(),
  stage:      z.string().optional(),
  leadScore:  z.number().int().min(0).max(100).optional(),
  closerName: z.string().max(60).optional(),
  dealValue:  z.number().optional(),
  tags:       z.array(z.string()).optional(),
}).strict()

async function owned(tenantId: string, id: string) {
  return prisma.socialLead.findFirst({ where: { id, tenantId } })
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const tenantId = session.user.tenantId

  const lead = await prisma.socialLead.findFirst({
    where: { id: params.id, tenantId },
    include: {
      activities: { orderBy: { createdAt: 'desc' }, take: 50 },
      notes:      { orderBy: { createdAt: 'desc' }, take: 30 },
    },
  })
  if (!lead) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json(lead)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const tenantId = session.user.tenantId

  const lead = await owned(tenantId, params.id)
  if (!lead) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const body = await req.json()
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const data = parsed.data
  const updated = await prisma.socialLead.update({
    where: { id: params.id },
    data: {
      ...data,
      lastActivity: new Date(),
    },
  })

  // Log stage change as activity
  if (data.stage && data.stage !== lead.stage) {
    await prisma.leadActivity.create({
      data: {
        leadId:  params.id,
        tipo:    'stage_change',
        detalle: 'Movido de ' + lead.stage + ' a ' + data.stage,
      },
    })
  }

  return NextResponse.json(updated)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const tenantId = session.user.tenantId

  const lead = await owned(tenantId, params.id)
  if (!lead) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  await prisma.socialLead.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}

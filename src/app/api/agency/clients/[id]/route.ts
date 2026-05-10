import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const PatchSchema = z.object({
  name:   z.string().min(2).max(100).optional(),
  plan:   z.enum(['BASIC','PRO','AGENCY']).optional(),
  active: z.boolean().optional(),
  notes:  z.string().max(300).optional(),
  domain: z.string().optional(),
}).strict()

async function requireAgency(clientId: string) {
  const session = await auth()
  if (!session?.user?.tenantId) return null
  const tenant = await prisma.tenant.findUnique({ where: { id: session.user.tenantId } })
  if (!tenant || tenant.plan !== 'AGENCY') return null
  const client = await prisma.tenant.findFirst({ where: { id: clientId, agencyId: tenant.id } })
  return client ? tenant : null
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const agency = await requireAgency(params.id)
  if (!agency) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const body = await req.json()
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const updated = await prisma.tenant.update({ where: { id: params.id }, data: parsed.data })
  return NextResponse.json(updated)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const agency = await requireAgency(params.id)
  if (!agency) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  await prisma.tenant.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}

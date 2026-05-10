import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const CreateSchema = z.object({
  whatsappPhone: z.string().min(7).max(20),
  nombre:        z.string().max(100).optional(),
  email:         z.string().email().optional(),
  tags:          z.array(z.string()).optional(),
  closerName:    z.string().max(60).optional(),
  dealValue:     z.number().optional(),
  fuentePostId:  z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const tenantId = session.user.tenantId

  const { searchParams } = new URL(req.url)
  const stage  = searchParams.get('stage')
  const search = searchParams.get('q')

  const leads = await prisma.socialLead.findMany({
    where: {
      tenantId,
      ...(stage ? { stage } : {}),
      ...(search ? {
        OR: [
          { nombre: { contains: search, mode: 'insensitive' } },
          { whatsappPhone: { contains: search } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
    },
    include: {
      _count: { select: { activities: true, notes: true } },
    },
    orderBy: [{ leadScore: 'desc' }, { lastActivity: 'desc' }],
    take: 100,
  })
  return NextResponse.json(leads)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const tenantId = session.user.tenantId

  const body = await req.json()
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const lead = await prisma.socialLead.create({
    data: { tenantId, ...parsed.data },
  })
  return NextResponse.json(lead)
}

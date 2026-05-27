import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function getTenantId() {
  const session = await auth()
  return session?.user?.tenantId || null
}

export async function GET() {
  const tenantId = await getTenantId()
  if (!tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const monitors = await prisma.hashtagMonitor.findMany({
    where: { tenantId },
    include: { _count: { select: { leads: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(monitors)
}

export async function POST(req: NextRequest) {
  const tenantId = await getTenantId()
  if (!tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { hashtag } = await req.json()
  if (!hashtag?.trim()) return NextResponse.json({ error: 'Hashtag requerido' }, { status: 400 })

  const clean = hashtag.trim().replace(/^#/, '').toLowerCase()

  try {
    const monitor = await prisma.hashtagMonitor.create({
      data: { tenantId, hashtag: clean },
    })
    return NextResponse.json(monitor, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Hashtag ya existe' }, { status: 409 })
  }
}

export async function DELETE(req: NextRequest) {
  const tenantId = await getTenantId()
  if (!tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await req.json()
  await prisma.hashtagMonitor.deleteMany({ where: { id, tenantId } })
  return NextResponse.json({ ok: true })
}

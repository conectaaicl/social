import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const tenantId = session.user.tenantId

  const video = await prisma.videoScript.findFirst({
    where: { id: params.id, tenantId },
  })
  if (!video) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  return NextResponse.json(video)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const tenantId = session.user.tenantId

  const video = await prisma.videoScript.findFirst({ where: { id: params.id, tenantId } })
  if (!video) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  await prisma.videoScript.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}

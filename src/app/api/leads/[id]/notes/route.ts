import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const Schema = z.object({ body: z.string().min(1).max(1000) })

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const tenantId = session.user.tenantId

  const lead = await prisma.socialLead.findFirst({ where: { id: params.id, tenantId } })
  if (!lead) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const body = await req.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const note = await prisma.leadNote.create({
    data: { leadId: params.id, body: parsed.data.body },
  })

  await prisma.socialLead.update({
    where: { id: params.id },
    data: { lastActivity: new Date() },
  })

  return NextResponse.json(note)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const tenantId = session.user.tenantId

  const { searchParams } = new URL(req.url)
  const noteId = searchParams.get('noteId')
  if (!noteId) return NextResponse.json({ error: 'noteId requerido' }, { status: 400 })

  const lead = await prisma.socialLead.findFirst({ where: { id: params.id, tenantId } })
  if (!lead) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  await prisma.leadNote.delete({ where: { id: noteId } })
  return NextResponse.json({ ok: true })
}

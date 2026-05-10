import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { findOswContactByPhone, updateOswContact, getConversationsByPhone } from '@/lib/osw'

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const tenantId = session.user.tenantId

  const lead = await prisma.socialLead.findFirst({ where: { id: params.id, tenantId } })
  if (!lead) return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 })

  const contact = await findOswContactByPhone(lead.whatsappPhone)
  if (!contact) {
    return NextResponse.json({
      ok: false,
      message: 'Contacto no encontrado en OmniFlow con ese número',
    })
  }

  const tags = ['social-ia', ...(lead.tags || []), lead.stage]

  const updated = await updateOswContact(contact.id, {
    lead_score: lead.leadScore,
    tags: Array.from(new Set(tags)),
  })

  // Log activity
  if (updated) {
    await prisma.leadActivity.create({
      data: {
        leadId: params.id,
        tipo: 'osw_sync',
        detalle: 'Score ' + lead.leadScore + ' sincronizado a OmniFlow (contacto #' + contact.id + ')',
      },
    })
  }

  return NextResponse.json({
    ok: updated,
    oswContactId: contact.id,
    oswName: contact.name,
  })
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const tenantId = session.user.tenantId

  const lead = await prisma.socialLead.findFirst({ where: { id: params.id, tenantId } })
  if (!lead) return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 })

  const conversations = await getConversationsByPhone(lead.whatsappPhone)
  return NextResponse.json(conversations)
}

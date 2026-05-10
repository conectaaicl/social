import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getOswContacts } from '@/lib/osw'

export async function POST(_: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const tenantId = session.user.tenantId

  const contacts = await getOswContacts(200)
  const whatsappContacts = contacts.filter(c => c.phone && c.source === 'whatsapp')

  let created = 0
  let updated = 0
  let skipped = 0

  for (const contact of whatsappContacts) {
    if (!contact.phone) continue
    const phone = contact.phone.replace(/\D/g, '')
    if (!phone) continue

    const existing = await prisma.socialLead.findFirst({
      where: { tenantId, whatsappPhone: { contains: phone } },
    })

    if (existing) {
      // Update score from OmniFlow if theirs is higher
      if (contact.lead_score > existing.leadScore) {
        await prisma.socialLead.update({
          where: { id: existing.id },
          data: {
            leadScore: contact.lead_score,
            scoreReason: 'Score importado de OmniFlow',
          },
        })
        updated++
      } else {
        skipped++
      }
    } else {
      // Create new lead from OmniFlow contact
      const stage = contact.lead_score >= 80 ? 'calificado'
        : contact.lead_score >= 50 ? 'contactado'
        : 'nuevo'

      await prisma.socialLead.create({
        data: {
          tenantId,
          nombre: contact.name || null,
          whatsappPhone: '+' + phone,
          leadScore: contact.lead_score,
          scoreReason: 'Importado de OmniFlow — intent: ' + (contact.intent || 'desconocido'),
          stage,
          tags: contact.tags || [],
          lastActivity: contact.last_interaction ? new Date(contact.last_interaction) : null,
        },
      })
      created++
    }
  }

  return NextResponse.json({
    ok: true,
    created,
    updated,
    skipped,
    total: whatsappContacts.length,
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { randomBytes } from 'crypto'

const CreateSchema = z.object({
  name:     z.string().min(2).max(100),
  email:    z.string().email(),
  plan:     z.enum(['BASIC', 'PRO', 'AGENCY']).default('PRO'),
  domain:   z.string().optional(),
  notes:    z.string().max(300).optional(),
})

async function requireAgency() {
  const session = await auth()
  if (!session?.user?.tenantId) return null
  const tenant = await prisma.tenant.findUnique({ where: { id: session.user.tenantId } })
  if (!tenant || tenant.plan !== 'AGENCY') return null
  return tenant
}

export async function GET(_: NextRequest) {
  const agency = await requireAgency()
  if (!agency) return NextResponse.json({ error: 'No autorizado — plan AGENCY requerido' }, { status: 403 })

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const clients = await prisma.tenant.findMany({
    where: { agencyId: agency.id },
    include: {
      users:  { select: { id: true, email: true, name: true, role: true }, take: 5 },
      _count: { select: { posts: true, socialLeads: true, videoScripts: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Fetch this month's post stats per client
  const clientIds = clients.map(c => c.id)
  const monthPosts = await prisma.post.groupBy({
    by: ['tenantId'],
    where: { tenantId: { in: clientIds }, status: 'PUBLISHED', publishedAt: { gte: monthStart } },
    _sum: { reach: true, likes: true },
    _count: { id: true },
  })
  const postMap = Object.fromEntries(monthPosts.map(p => [p.tenantId, p]))

  const leads = await prisma.socialLead.groupBy({
    by: ['tenantId'],
    where: { tenantId: { in: clientIds }, stage: 'cliente' },
    _sum: { dealValue: true },
    _count: { id: true },
  })
  const leadMap = Object.fromEntries(leads.map(l => [l.tenantId, l]))

  return NextResponse.json(clients.map(c => ({
    id:        c.id,
    name:      c.name,
    slug:      c.slug,
    logo:      c.logo,
    plan:      c.plan,
    active:    c.active,
    domain:    c.domain,
    notes:     c.notes,
    createdAt: c.createdAt,
    users:     c.users,
    counts:    c._count,
    monthStats: {
      postsPublished: postMap[c.id]?._count?.id || 0,
      reach:          postMap[c.id]?._sum?.reach || 0,
      likes:          postMap[c.id]?._sum?.likes || 0,
      clients:        leadMap[c.id]?._count?.id || 0,
      revenue:        leadMap[c.id]?._sum?.dealValue || 0,
    },
  })))
}

export async function POST(req: NextRequest) {
  const agency = await requireAgency()
  if (!agency) return NextResponse.json({ error: 'No autorizado — plan AGENCY requerido' }, { status: 403 })

  const body = await req.json()
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const { name, email, plan, domain, notes } = parsed.data

  // Generate slug from name
  const base = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 30)
  const slug = base + '-' + randomBytes(3).toString('hex')

  // Check email not taken
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return NextResponse.json({ error: 'Email ya registrado' }, { status: 409 })

  // Create tenant + owner user in transaction
  const password = randomBytes(8).toString('base64url').slice(0, 12)
  const { hashSync } = await import('bcryptjs')
  const hashed = hashSync(password, 10)

  const tenant = await prisma.tenant.create({
    data: {
      name, slug, plan, domain: domain || null, notes: notes || null,
      agencyId: agency.id,
      users: {
        create: { email, name, password: hashed, role: 'OWNER' },
      },
    },
    include: { users: { select: { id: true, email: true } } },
  })

  return NextResponse.json({
    tenant,
    credentials: { email, password, loginUrl: 'https://social.conectaai.cl/login' },
  }, { status: 201 })
}

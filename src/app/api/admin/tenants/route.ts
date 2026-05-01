import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { sendWelcomeCredentials } from "@/lib/mail"

async function guardSuperAdmin() {
  const session = await auth()
  if (session?.user?.role !== "SUPERADMIN") return null
  return session
}

export async function GET() {
  if (!await guardSuperAdmin()) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  const tenants = await prisma.tenant.findMany({
    include: {
      users: { select: { id: true, email: true, name: true, role: true, createdAt: true } },
      socialAccounts: { select: { platform: true, accountName: true, active: true, tokenExpiresAt: true } },
      _count: { select: { posts: true } },
      brandVoice: { select: { industry: true, tone: true } },
    },
    orderBy: { createdAt: "asc" },
  })

  const stats = await Promise.all(
    tenants.map(async (t) => {
      const [published, scheduled, failed, reach] = await Promise.all([
        prisma.post.count({ where: { tenantId: t.id, status: "PUBLISHED" } }),
        prisma.post.count({ where: { tenantId: t.id, status: "SCHEDULED" } }),
        prisma.post.count({ where: { tenantId: t.id, status: "FAILED" } }),
        prisma.post.aggregate({ where: { tenantId: t.id }, _sum: { reach: true, likes: true } }),
      ])
      return {
        tenantId: t.id, published, scheduled, failed,
        totalReach: reach._sum.reach ?? 0,
        totalLikes: reach._sum.likes ?? 0,
      }
    })
  )
  const statsMap = Object.fromEntries(stats.map((s) => [s.tenantId, s]))

  return NextResponse.json({
    tenants: tenants.map((t) => ({ ...t, stats: statsMap[t.id] })),
  })
}

export async function POST(req: NextRequest) {
  if (!await guardSuperAdmin()) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  const body = await req.json()
  const { action } = body

  if (action === "create_tenant") {
    const { tenantName, email, name, password, plan } = body
    const slug = tenantName.toLowerCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    const existing = await prisma.tenant.findUnique({ where: { slug } })
    const finalSlug = existing ? `${slug}-${Date.now()}` : slug
    const hashed = await bcrypt.hash(password, 12)

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: tenantName, slug: finalSlug, plan: plan ?? "BASIC" },
      })
      const user = await tx.user.create({
        data: { name, email, password: hashed, role: "OWNER", tenantId: tenant.id },
      })
      return { tenant, user }
    })
    return NextResponse.json({ ok: true, ...result }, { status: 201 })
  }

  if (action === "reset_password") {
    const { userId, newPassword } = body
    const hashed = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({ where: { id: userId }, data: { password: hashed } })
    return NextResponse.json({ ok: true })
  }

  if (action === "send_credentials") {
    const { userId, password, loginUrl } = body
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { tenant: { select: { name: true } } } })
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    await sendWelcomeCredentials({
      email: user.email,
      name: user.name ?? user.email,
      tenantName: user.tenant?.name ?? "ConectaAI Social",
      password,
      loginUrl: loginUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://social.conectaai.cl",
    })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "Acción inválida" }, { status: 400 })
}

export async function PATCH(req: NextRequest) {
  if (!await guardSuperAdmin()) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  const body = await req.json()
  const { tenantId, active, plan, notes, whatsappPhone, whatsappInstance,
          metaAppId, metaAppSecret, anthropicApiKey, groqApiKey, openaiApiKey } = body

  const data: Record<string, unknown> = {}
  if (active !== undefined) data.active = active
  if (plan) data.plan = plan
  if (notes !== undefined) data.notes = notes
  if (whatsappPhone !== undefined) data.whatsappPhone = whatsappPhone
  if (whatsappInstance !== undefined) data.whatsappInstance = whatsappInstance
  if (metaAppId !== undefined) data.metaAppId = metaAppId
  if (metaAppSecret !== undefined) data.metaAppSecret = metaAppSecret
  if (anthropicApiKey !== undefined) data.anthropicApiKey = anthropicApiKey
  if (groqApiKey !== undefined) data.groqApiKey = groqApiKey
  if (openaiApiKey !== undefined) data.openaiApiKey = openaiApiKey

  const tenant = await prisma.tenant.update({ where: { id: tenantId }, data })
  return NextResponse.json({ ok: true, tenant })
}

export async function DELETE(req: NextRequest) {
  if (!await guardSuperAdmin()) return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  const { tenantId } = await req.json()
  await prisma.tenant.update({ where: { id: tenantId }, data: { active: false } })
  return NextResponse.json({ ok: true })
}

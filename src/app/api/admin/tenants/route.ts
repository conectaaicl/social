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
      _count: { select: { posts: true, mediaLibrary: true } },
      brandVoice: { select: { industry: true, tone: true } },
    },
    orderBy: { createdAt: "asc" },
  })

  const tenantIds = tenants.map(t => t.id)
  const [postCountsRaw, reachRaw] = await Promise.all([
    prisma.post.groupBy({
      by: ["tenantId", "status"],
      where: { tenantId: { in: tenantIds }, status: { in: ["PUBLISHED", "SCHEDULED", "FAILED"] } },
      _count: { id: true },
    }),
    prisma.post.groupBy({
      by: ["tenantId"],
      where: { tenantId: { in: tenantIds } },
      _sum: { reach: true, likes: true },
    }),
  ])

  const statsMap: Record<string, { tenantId: string; published: number; scheduled: number; failed: number; totalReach: number; totalLikes: number }> = {}
  for (const t of tenants) {
    statsMap[t.id] = { tenantId: t.id, published: 0, scheduled: 0, failed: 0, totalReach: 0, totalLikes: 0 }
  }
  for (const r of postCountsRaw) {
    if (!statsMap[r.tenantId]) continue
    if (r.status === "PUBLISHED") statsMap[r.tenantId].published = r._count.id
    else if (r.status === "SCHEDULED") statsMap[r.tenantId].scheduled = r._count.id
    else if (r.status === "FAILED") statsMap[r.tenantId].failed = r._count.id
  }
  for (const r of reachRaw) {
    if (!statsMap[r.tenantId]) continue
    statsMap[r.tenantId].totalReach = r._sum.reach ?? 0
    statsMap[r.tenantId].totalLikes = r._sum.likes ?? 0
  }

  return NextResponse.json({
    tenants: tenants.map((t) => ({ ...t, stats: statsMap[t.id] })),
  })
}

export async function POST(req: NextRequest) {
  if (!await guardSuperAdmin()) return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  const body = await req.json()
  const { action } = body

  if (action === "create_tenant") {
    const { tenantName, domain, email, name, password, plan } = body
    const slug = tenantName.toLowerCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    const existing = await prisma.tenant.findUnique({ where: { slug } })
    const finalSlug = existing ? `${slug}-${Date.now()}` : slug
    const hashed = await bcrypt.hash(password, 12)

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: tenantName, slug: finalSlug, plan: plan ?? "BASIC", ...(domain ? { domain } : {}) },
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
  const { tenantId } = body
  const body2 = body
  const data: Record<string, unknown> = {}
  const patchFields = ["active","plan","notes","domain","whatsappPhone","whatsappInstance",
    "whatsappApiUrl","whatsappApiKey","metaAppId","metaAppSecret",
    "anthropicApiKey","groqApiKey","openaiApiKey",
    "falApiKey","replicateApiToken","stabilityApiKey",
    "googleAdsClientId","googleAdsClientSecret","googleAdsRefreshToken",
    "googleAdsDeveloperToken","googleAdsCustomerId"]
  for (const f of patchFields) {
    if (body2[f] !== undefined) data[f] = body2[f]
  }

  const tenant = await prisma.tenant.update({ where: { id: tenantId }, data })
  return NextResponse.json({ ok: true, tenant })
}

export async function DELETE(req: NextRequest) {
  if (!await guardSuperAdmin()) return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  const { tenantId } = await req.json()
  await prisma.tenant.update({ where: { id: tenantId }, data: { active: false } })
  return NextResponse.json({ ok: true })
}

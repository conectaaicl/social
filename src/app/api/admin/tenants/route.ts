import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== "SUPERADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  const tenants = await prisma.tenant.findMany({
    include: {
      users: { select: { email: true, name: true, role: true } },
      _count: { select: { posts: true, socialAccounts: true } },
      brandVoice: { select: { industry: true, description: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const stats = await Promise.all(
    tenants.map(async (t) => {
      const [published, scheduled, totalReach] = await Promise.all([
        prisma.post.count({ where: { tenantId: t.id, status: "PUBLISHED" } }),
        prisma.post.count({ where: { tenantId: t.id, status: "SCHEDULED" } }),
        prisma.post.aggregate({ where: { tenantId: t.id }, _sum: { reach: true } }),
      ])
      return { tenantId: t.id, published, scheduled, totalReach: totalReach._sum.reach ?? 0 }
    })
  )

  const statsMap = Object.fromEntries(stats.map((s) => [s.tenantId, s]))

  return NextResponse.json({
    tenants: tenants.map((t) => ({
      ...t,
      stats: statsMap[t.id],
    })),
  })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (session?.user?.role !== "SUPERADMIN") return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  const { tenantId, active, plan } = await req.json()
  const updated = await prisma.tenant.update({
    where: { id: tenantId },
    data: { ...(active !== undefined ? { active } : {}), ...(plan ? { plan } : {}) },
  })
  return NextResponse.json({ ok: true, tenant: updated })
}

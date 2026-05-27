import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

export async function GET() {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const page = await prisma.bioPage.findUnique({
    where: { tenantId: session.user.tenantId },
    include: { links: { orderBy: { sortOrder: "asc" } } },
  })
  return NextResponse.json(page ?? null)
}

const linkSchema = z.object({
  label: z.string().min(1).max(60),
  url: z.string().url(),
  icon: z.string().max(4).optional(),
  utmSource: z.string().default("bio"),
  utmMedium: z.string().default("social"),
  active: z.boolean().default(true),
})

const pageSchema = z.object({
  title: z.string().max(80).optional(),
  description: z.string().max(200).optional(),
  avatarUrl: z.string().url().optional().or(z.literal("")),
  theme: z.enum(["dark", "light", "brand"]).default("dark"),
  published: z.boolean().default(true),
  links: z.array(linkSchema).max(20).optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const tenantId = session.user.tenantId

  const body = await req.json()
  const parsed = pageSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })

  const { links, ...pageData } = parsed.data

  const existing = await prisma.bioPage.findUnique({ where: { tenantId } })

  if (existing) {
    // Update page + replace links
    await prisma.bioLink.deleteMany({ where: { bioPageId: existing.id } })
    const page = await prisma.bioPage.update({
      where: { tenantId },
      data: {
        ...pageData,
        links: links ? { create: links.map((l, i) => ({ ...l, sortOrder: i })) } : undefined,
      },
      include: { links: { orderBy: { sortOrder: "asc" } } },
    })
    return NextResponse.json(page)
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { slug: true, name: true, logo: true } })
  const page = await prisma.bioPage.create({
    data: {
      tenantId,
      title: pageData.title ?? tenant?.name ?? "Mi perfil",
      description: pageData.description,
      avatarUrl: pageData.avatarUrl || tenant?.logo || undefined,
      theme: pageData.theme,
      published: pageData.published,
      links: links ? { create: links.map((l, i) => ({ ...l, sortOrder: i })) } : undefined,
    },
    include: { links: { orderBy: { sortOrder: "asc" } } },
  })
  return NextResponse.json(page)
}

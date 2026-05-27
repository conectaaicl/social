import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: params.slug },
    select: { id: true, name: true, logo: true, slug: true },
  })
  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const page = await prisma.bioPage.findUnique({
    where: { tenantId: tenant.id },
    include: { links: { where: { active: true }, orderBy: { sortOrder: "asc" } } },
  })
  if (!page || !page.published) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({ ...page, tenant })
}

// Track click
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const body = await req.json().catch(() => ({}))
  const { linkId } = body
  if (!linkId) return NextResponse.json({ ok: false })

  await prisma.bioLink.updateMany({
    where: { id: linkId },
    data: { clicks: { increment: 1 } },
  })
  return NextResponse.json({ ok: true })
}

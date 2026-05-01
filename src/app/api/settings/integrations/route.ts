import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const FIELDS = [
  "falApiKey","replicateApiToken","stabilityApiKey",
  "metaAppId","metaAppSecret",
  "whatsappPhone","whatsappInstance","whatsappApiUrl","whatsappApiKey",
  "groqApiKey","openaiApiKey","anthropicApiKey",
  "googleAdsClientId","googleAdsClientSecret","googleAdsRefreshToken",
  "googleAdsDeveloperToken","googleAdsCustomerId",
] as const

function mask(v: string | null) {
  if (!v) return null
  if (v.length <= 8) return "••••"
  return v.slice(0, 4) + "••••••" + v.slice(-4)
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: Object.fromEntries(FIELDS.map(f => [f, true])) as any,
  })
  const masked: Record<string, string | null> = {}
  for (const f of FIELDS) masked[f] = mask((tenant as any)?.[f] ?? null)
  return NextResponse.json({ masked })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const body = await req.json()
  const data: Record<string, string | null> = {}
  for (const f of FIELDS) {
    if (f in body) data[f] = body[f] === "" ? null : body[f]
  }
  await prisma.tenant.update({ where: { id: session.user.tenantId }, data })
  return NextResponse.json({ ok: true })
}

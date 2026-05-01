import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

export async function GET() {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { aiProvider: true, openaiApiKey: true, anthropicApiKey: true, groqApiKey: true },
  })

  return NextResponse.json({
    aiProvider: tenant?.aiProvider ?? "auto",
    hasOpenaiKey: !!tenant?.openaiApiKey,
    hasAnthropicKey: !!tenant?.anthropicApiKey,
    hasGroqKey: !!tenant?.groqApiKey,
    // Masked keys for display
    openaiKeyMasked: tenant?.openaiApiKey ? "sk-..." + tenant.openaiApiKey.slice(-4) : "",
    anthropicKeyMasked: tenant?.anthropicApiKey ? "sk-ant-..." + tenant.anthropicApiKey.slice(-4) : "",
    groqKeyMasked: tenant?.groqApiKey ? "gsk_..." + tenant.groqApiKey.slice(-4) : "",
  })
}

const aiSchema = z.object({
  aiProvider: z.enum(["auto", "anthropic", "openai", "groq"]),
  openaiApiKey: z.string().optional(),
  anthropicApiKey: z.string().optional(),
  groqApiKey: z.string().optional(),
})

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await req.json()
  const parsed = aiSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })

  const { aiProvider, openaiApiKey, anthropicApiKey, groqApiKey } = parsed.data

  await prisma.tenant.update({
    where: { id: session.user.tenantId },
    data: {
      aiProvider,
      ...(openaiApiKey !== undefined && { openaiApiKey: openaiApiKey || null }),
      ...(anthropicApiKey !== undefined && { anthropicApiKey: anthropicApiKey || null }),
      ...(groqApiKey !== undefined && { groqApiKey: groqApiKey || null }),
    },
  })

  return NextResponse.json({ ok: true })
}

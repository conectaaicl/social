import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const TIMEOUT = 6000

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ])
}

async function checkFal(): Promise<{ status: "ok" | "error" | "warn"; label: string }> {
  const key = process.env.FAL_KEY
  if (!key) return { status: "error", label: "Sin API key" }
  try {
    const res = await withTimeout(
      fetch("https://fal.run/fal-ai/flux/dev", {
        method: "POST",
        headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "test", num_images: 1, num_inference_steps: 1 }),
      }),
      TIMEOUT
    )
    if (res.status === 402 || res.status === 403) return { status: "warn", label: "Sin créditos" }
    if (res.ok) return { status: "ok", label: "Activo" }
    return { status: "error", label: `Error ${res.status}` }
  } catch {
    return { status: "error", label: "No responde" }
  }
}

async function checkReplicate(): Promise<{ status: "ok" | "error" | "warn"; label: string }> {
  const token = process.env.REPLICATE_API_TOKEN
  if (!token) return { status: "error", label: "Sin API key" }
  try {
    const res = await withTimeout(
      fetch("https://api.replicate.com/v1/account", {
        headers: { Authorization: `Token ${token}` },
      }),
      TIMEOUT
    )
    if (res.ok) {
      const d = await res.json()
      return { status: "ok", label: d.username ?? "Activo" }
    }
    return { status: "error", label: `Error ${res.status}` }
  } catch {
    return { status: "error", label: "No responde" }
  }
}

async function checkGroq(tenantKey?: string | null): Promise<{ status: "ok" | "error" | "warn"; label: string }> {
  const key = tenantKey || process.env.GROQ_API_KEY
  if (!key) return { status: "error", label: "Sin API key" }
  try {
    const res = await withTimeout(
      fetch("https://api.groq.com/openai/v1/models", {
        headers: { Authorization: `Bearer ${key}` },
      }),
      TIMEOUT
    )
    if (res.ok) return { status: "ok", label: tenantKey ? "Activo (cuenta propia)" : "Activo" }
    if (res.status === 401) return { status: "error", label: "Key inválida" }
    return { status: "warn", label: `Error ${res.status}` }
  } catch {
    return { status: "error", label: "No responde" }
  }
}

async function checkOpenAI(tenantKey?: string | null): Promise<{ status: "ok" | "error" | "warn"; label: string }> {
  const key = tenantKey || process.env.OPENAI_API_KEY
  if (!key) return { status: "error", label: "Sin API key" }
  try {
    const res = await withTimeout(
      fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${key}` },
      }),
      TIMEOUT
    )
    if (res.ok) return { status: "ok", label: tenantKey ? "Activo (cuenta propia)" : "Activo" }
    if (res.status === 401) return { status: "error", label: "Key inválida" }
    return { status: "warn", label: `Error ${res.status}` }
  } catch {
    return { status: "error", label: "No responde" }
  }
}

async function checkAnthropic(tenantKey?: string | null): Promise<{ status: "ok" | "error" | "warn"; label: string }> {
  const key = tenantKey || process.env.ANTHROPIC_API_KEY
  if (!key || key === "PENDIENTE_AGREGAR") return { status: "error", label: "Sin API key" }
  try {
    const res = await withTimeout(
      fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1,
          messages: [{ role: "user", content: "hi" }],
        }),
      }),
      TIMEOUT
    )
    if (res.ok || res.status === 400) return { status: "ok", label: tenantKey ? "Activo (tu key)" : "Activo" }
    if (res.status === 401) return { status: "error", label: "Key inválida" }
    return { status: "warn", label: `Error ${res.status}` }
  } catch {
    return { status: "error", label: "No responde" }
  }
}

async function checkMeta(tenantId: string): Promise<{
  instagram: { status: "ok" | "error" | "warn"; label: string }
  facebook: { status: "ok" | "error" | "warn"; label: string }
}> {
  const accounts = await prisma.socialAccount.findMany({
    where: { tenantId, active: true },
    select: { platform: true, accountName: true, tokenExpiresAt: true },
  })
  const ig = accounts.find((a) => a.platform === "INSTAGRAM")
  const fb = accounts.find((a) => a.platform === "FACEBOOK")

  const accountStatus = (acc: typeof ig): { status: "ok" | "error" | "warn"; label: string } => {
    if (!acc) return { status: "error", label: "Sin conectar" }
    if (acc.tokenExpiresAt && acc.tokenExpiresAt < new Date())
      return { status: "warn", label: "Token expirado" }
    return { status: "ok", label: acc.accountName ?? "Conectado" }
  }

  return { instagram: accountStatus(ig), facebook: accountStatus(fb) }
}

async function checkN8n(): Promise<{ status: "ok" | "error" | "warn"; label: string }> {
  const n8nUrl = process.env.N8N_URL ?? "https://n8n.conectaai.cl"
  try {
    const res = await withTimeout(
      fetch(`${n8nUrl}/healthz`, { signal: AbortSignal.timeout(TIMEOUT) }),
      TIMEOUT
    )
    if (res.ok) return { status: "ok", label: "Online" }
    return { status: "warn", label: `HTTP ${res.status}` }
  } catch {
    return { status: "warn", label: "No alcanzable" }
  }
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  // Load tenant's own API keys from DB
  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { anthropicApiKey: true, openaiApiKey: true, groqApiKey: true, aiProvider: true },
  })

  const [fal, replicate, groq, openai, anthropic, meta, n8n] = await Promise.all([
    checkFal(),
    checkReplicate(),
    checkGroq(tenant?.groqApiKey),
    checkOpenAI(tenant?.openaiApiKey),
    checkAnthropic(tenant?.anthropicApiKey),
    checkMeta(session.user.tenantId),
    checkN8n(),
  ])

  // Determine which AI provider is actually being used
  const activeProvider =
    (tenant?.aiProvider === "anthropic" && tenant?.anthropicApiKey) ? "anthropic" :
    (tenant?.aiProvider === "openai" && tenant?.openaiApiKey) ? "openai" :
    (tenant?.aiProvider === "groq" && tenant?.groqApiKey) ? "groq" :
    // Auto mode: pick best available
    tenant?.anthropicApiKey ? "anthropic" :
    tenant?.openaiApiKey ? "openai" :
    tenant?.groqApiKey ? "groq" :
    process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== "PENDIENTE_AGREGAR" ? "anthropic" :
    process.env.GROQ_API_KEY ? "groq" :
    "none"

  return NextResponse.json({
    activeAIProvider: activeProvider,
    services: [
      { id: "replicate", name: "Replicate FLUX", category: "image", ...replicate },
      { id: "fal", name: "fal.ai", category: "image", ...fal },
      { id: "groq", name: "Groq", category: "ai", ...groq },
      { id: "openai", name: "OpenAI", category: "ai", ...openai },
      { id: "anthropic", name: "Anthropic", category: "ai", ...anthropic },
      { id: "instagram", name: "Instagram", category: "social", ...meta.instagram },
      { id: "facebook", name: "Facebook", category: "social", ...meta.facebook },
      { id: "n8n", name: "n8n", category: "automation", ...n8n },
    ],
  })
}

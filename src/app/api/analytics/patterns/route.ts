import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { buildTenantAIConfig } from "@/lib/ai-config"
import Anthropic from "@anthropic-ai/sdk"

async function callAI(apiKey: string, provider: string, prompt: string): Promise<string> {
  if (provider === "anthropic" && apiKey) {
    const client = new Anthropic({ apiKey })
    const msg = await client.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    })
    return msg.content[0].type === "text" ? msg.content[0].text : ""
  }

  // Groq via fetch (same as lib/groq.ts pattern)
  const groqKey = apiKey || process.env.GROQ_API_KEY || ""
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
    body: JSON.stringify({
      model: "llama3-70b-8192",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  })
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ""
}

export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const patterns = await prisma.winningPattern.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { avgEngagement: "desc" },
    take: 10,
  })

  return NextResponse.json({ patterns })
}

export async function POST(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const tenantId = session.user.tenantId

  const posts = await prisma.post.findMany({
    where: { tenantId, status: "PUBLISHED", publishedAt: { not: null } },
    orderBy: { publishedAt: "desc" },
    take: 30,
    select: {
      id: true, type: true, contentType: true, caption: true,
      hashtags: true, platform: true, reach: true, likes: true, comments: true,
    },
  })

  if (posts.length < 5) {
    return NextResponse.json({
      ok: false,
      message: `Necesitas al menos 5 posts publicados (tienes ${posts.length})`,
    })
  }

  const scored = posts
    .filter(p => (p.reach ?? 0) > 0)
    .map(p => {
      const reach = p.reach ?? 1
      const engagement = ((p.likes ?? 0) + (p.comments ?? 0) * 2) / reach * 100
      return { ...p, engagementScore: Math.round(engagement * 100) / 100 }
    })

  if (scored.length < 3) {
    return NextResponse.json({
      ok: false,
      message: "No hay suficientes posts con métricas de alcance para analizar",
    })
  }

  const avgEngagement = scored.reduce((s, p) => s + p.engagementScore, 0) / scored.length
  const top = scored.filter(p => p.engagementScore > avgEngagement * 1.3)
  const bottom = scored.filter(p => p.engagementScore < avgEngagement * 0.7)

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { aiProvider: true, anthropicApiKey: true, openaiApiKey: true, groqApiKey: true },
  })
  const aiConfig = buildTenantAIConfig(tenant)

  const prompt = `Eres un analista de redes sociales. Detecta PATRONES concretos que explican por qué los posts de alto engagement son exitosos.

POSTS ALTO ENGAGEMENT (top ${top.length}):
${top.slice(0, 8).map(p => `- Tipo: ${p.type}, Objetivo: ${p.contentType}, Engagement: ${p.engagementScore}%
  Caption: "${p.caption.slice(0, 120)}..."`).join('\n')}

POSTS BAJO ENGAGEMENT (${bottom.length}):
${bottom.slice(0, 5).map(p => `- Tipo: ${p.type}, Objetivo: ${p.contentType}, Engagement: ${p.engagementScore}%
  Caption: "${p.caption.slice(0, 80)}..."`).join('\n')}

Engagement promedio: ${avgEngagement.toFixed(2)}%

Detecta 3-5 patrones concretos y accionables. Solo JSON sin markdown:
{"patterns":[{"descripcion":"...","avgEngagement":4.5,"sampleSize":8,"confidenceScore":0.85}]}`

  let raw = ""
  try {
    raw = await callAI(
      aiConfig.apiKey ?? "",
      aiConfig.provider,
      prompt
    )
    const match = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").match(/\{[\s\S]*\}/)
    if (!match) throw new Error("No JSON")

    const parsed = JSON.parse(match[0])
    const patterns: any[] = parsed.patterns ?? []

    await prisma.winningPattern.deleteMany({ where: { tenantId } })
    await prisma.winningPattern.createMany({
      data: patterns.map(p => ({
        tenantId,
        descripcion: String(p.descripcion).slice(0, 500),
        avgEngagement: Number(p.avgEngagement) || avgEngagement,
        sampleSize: Number(p.sampleSize) || scored.length,
        confidenceScore: Math.min(1, Math.max(0, Number(p.confidenceScore) || 0.8)),
      })),
    })

    return NextResponse.json({
      ok: true,
      patterns: patterns.length,
      postsAnalyzed: scored.length,
      message: `${patterns.length} patrones detectados de ${scored.length} posts`,
    })
  } catch (err) {
    console.error("Pattern analysis error:", err)
    return NextResponse.json({ ok: false, error: "Error al analizar patrones" }, { status: 500 })
  }
}

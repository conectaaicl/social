import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import Anthropic from "@anthropic-ai/sdk"
import { buildTenantAIConfig } from "@/lib/ai-config"

const FORMATS = ["carrusel", "reel", "imagen", "historia"]
const OBJECTIVES = ["engagement", "educativo", "promocional", "inspiracional", "testimonial"]
const TIME_SLOTS = ["09:00", "12:00", "18:00", "20:00"]
const POST_DAYS = [1, 3, 5, 0] // Mon Wed Fri Sun

function getPostDaysInMonth(year: number, month: number): number[] {
  const days: number[] = []
  const daysInMonth = new Date(year, month, 0).getDate()
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month - 1, d).getDay()
    if (POST_DAYS.includes(dow)) days.push(d)
  }
  return days
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const now = new Date()
  const year: number = body.year ?? now.getFullYear()
  const month: number = body.month ?? (now.getMonth() + 1)

  await prisma.calendarSlot.deleteMany({
    where: { tenantId: session.user.tenantId, year, month, postId: null },
  })

  const [brandVoice, tenant, winningPatterns] = await Promise.all([
    prisma.brandVoice.findUnique({ where: { tenantId: session.user.tenantId } }),
    prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: { name: true, anthropicApiKey: true, openaiApiKey: true, groqApiKey: true, aiProvider: true },
    }),
    prisma.winningPattern.findMany({
      where: { tenantId: session.user.tenantId },
      orderBy: { avgEngagement: "desc" },
      take: 5,
    }),
  ])

  const postDays = getPostDaysInMonth(year, month)
  let topics: Array<{ day: number; formato: string; objetivo: string; tema: string; hook: string }> = []

  const aiConfig = buildTenantAIConfig(tenant)
  const apiKey = aiConfig.provider === "anthropic" ? aiConfig.apiKey : (tenant?.anthropicApiKey || process.env.ANTHROPIC_API_KEY || "")

  if (brandVoice && apiKey && !apiKey.includes("PENDIENTE")) {
    try {
      const client = new Anthropic({ apiKey })
      const monthNames = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"]

      const patternsSection = winningPatterns.length > 0
        ? `\nPATRONES GANADORES detectados de tu historial de posts (úsalos para guiar el plan):
${winningPatterns.map((p, i) => `${i + 1}. ${p.descripcion} (engagement promedio: ${p.avgEngagement.toFixed(1)}%)`).join('\n')}\n`
        : ""

      const msg = await client.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 2048,
        messages: [{
          role: "user",
          content: `Eres un estratega de contenido para redes sociales latinoamericanas.

Negocio: ${tenant?.name ?? "Empresa"}
Industria: ${brandVoice.industry}
Descripción: ${brandVoice.description}
Tono: ${brandVoice.tone}
Productos/Servicios: ${brandVoice.products?.join(", ") ?? ""}
${patternsSection}
Genera el plan para ${postDays.length} posts del mes de ${monthNames[month-1]} ${year}.
Días de publicación: ${postDays.join(", ")}.
${winningPatterns.length > 0 ? "IMPORTANTE: Prioriza los formatos y estilos de los patrones ganadores listados arriba." : ""}

Responde ÚNICAMENTE con JSON sin markdown:
{"posts":[{"day":1,"formato":"carrusel","objetivo":"engagement","tema":"Tema concreto","hook":"Hook gancho emoji máx 8 palabras"},...]}

Formatos: carrusel, reel, imagen, historia
Objetivos: engagement, educativo, promocional, inspiracional, testimonial
- Varía formatos y objetivos
- Temas específicos al negocio
- Hooks irresistibles con emojis`,
        }],
      })
      const raw = msg.content[0].type === "text" ? msg.content[0].text : ""
      const match = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").match(/\{[\s\S]*\}/)
      if (match) topics = (JSON.parse(match[0]).posts ?? [])
    } catch { /* fallback */ }
  }

  if (topics.length === 0) {
    topics = postDays.map((d, i) => ({
      day: d,
      formato: FORMATS[i % FORMATS.length],
      objetivo: OBJECTIVES[i % OBJECTIVES.length],
      tema: `${brandVoice?.products?.[i % (brandVoice?.products?.length || 1)] ?? "tu servicio"} — enfoque ${OBJECTIVES[i % OBJECTIVES.length]}`,
      hook: i % 2 === 0 ? "¿Sabías que esto puede cambiar todo? 🔥" : "El error que todos cometen 👇",
    }))
  }

  const created = await Promise.all(
    topics.slice(0, 25).map(async (t) => {
      const dayNum = Number(t.day)
      if (!dayNum || dayNum < 1 || dayNum > 31) return null
      const scheduledDate = new Date(year, month - 1, dayNum, 9, 0, 0)
      return prisma.calendarSlot.create({
        data: {
          tenantId: session.user.tenantId!,
          year, month, scheduledDate,
          timeSlot: TIME_SLOTS[Math.floor(Math.random() * TIME_SLOTS.length)],
          formato: String(t.formato ?? "imagen").toLowerCase(),
          objetivo: String(t.objetivo ?? "engagement").toLowerCase(),
          temaSugerido: `${t.hook ? t.hook + " — " : ""}${t.tema}`,
        },
      })
    })
  )

  const count = created.filter(Boolean).length
  const patternsUsed = winningPatterns.length > 0 ? ` (guiado por ${winningPatterns.length} patrones ganadores)` : ""
  return NextResponse.json({ ok: true, slots: count, message: `${count} slots generados${patternsUsed}` })
}

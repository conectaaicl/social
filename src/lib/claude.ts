import Anthropic from "@anthropic-ai/sdk"

// ─── AI Config ───────────────────────────────────────────────────────────────
export interface AIConfig {
  provider: "auto" | "anthropic" | "openai" | "groq"
  apiKey?: string
}

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY ?? ""
const GROQ_KEY = process.env.GROQ_API_KEY ?? ""
const OPENAI_KEY = process.env.OPENAI_API_KEY ?? ""
const USE_ANTHROPIC = !!ANTHROPIC_KEY && ANTHROPIC_KEY !== "PENDIENTE_AGREGAR"

// ─── Unified LLM Call ────────────────────────────────────────────────────────
async function callOpenAICompat(
  baseUrl: string,
  model: string,
  apiKey: string,
  system: string,
  user: string,
  maxTokens: number
): Promise<string> {
  const res = await fetch(baseUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`API error ${res.status}: ${err.slice(0, 200)}`)
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ""
}

async function llmWithConfig(
  config: AIConfig | undefined,
  system: string,
  user: string,
  maxTokens = 1024
): Promise<string> {
  const provider = config?.provider ?? "auto"

  if (provider === "openai") {
    const key = config?.apiKey || OPENAI_KEY
    if (!key) throw new Error("No OpenAI API key configured")
    return callOpenAICompat(
      "https://api.openai.com/v1/chat/completions",
      "gpt-4o",
      key,
      system,
      user,
      maxTokens
    )
  }

  if (provider === "anthropic" || (provider === "auto" && USE_ANTHROPIC)) {
    const key = config?.apiKey || ANTHROPIC_KEY
    const client = new Anthropic({ apiKey: key })
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    })
    return msg.content[0].type === "text" ? msg.content[0].text : ""
  }

  // Groq (default fallback)
  const key = config?.apiKey || GROQ_KEY
  if (!key) throw new Error("No AI provider configured — add an API key in Configuración")
  return callOpenAICompat(
    "https://api.groq.com/openai/v1/chat/completions",
    "llama-3.3-70b-versatile",
    key,
    system,
    user,
    maxTokens
  )
}

// Keep backward-compatible module-level llm
async function llm(system: string, user: string, maxTokens = 1024): Promise<string> {
  return llmWithConfig(undefined, system, user, maxTokens)
}

// ─── Types ───────────────────────────────────────────────────────────────────
export interface GeneratedContent {
  caption: string
  hashtags: string
  imagePrompt: string
  videoPrompt: string
}

export interface CaptionVariant {
  caption: string
  angle: string
}

const POST_TYPE_INSTRUCTIONS: Record<string, string> = {
  FEED: "post de feed de Instagram/Facebook (relación 1:1 o 4:5). Máximo 2,200 caracteres.",
  STORY: "historia de Instagram/Facebook (relación 9:16, vertical). Texto muy corto, impactante.",
  REEL: "reel de Instagram (vertical 9:16, contenido de video dinámico). Caption corto y llamativo.",
  CAROUSEL: "carrusel de Instagram (hasta 10 imágenes). Caption que invite a deslizar.",
}

const CONTENT_TYPE_INSTRUCTIONS: Record<string, string> = {
  PRODUCTO: "muestra un producto específico del catálogo, destacando sus beneficios y calidad",
  PROYECTO: "muestra un proyecto instalado/completado, inspirando confianza con resultados reales",
  TIP: "comparte un tip útil relacionado con decoración, el hogar o el producto",
  PROMO: "comunica una promoción, descuento u oferta especial",
}

// ─── Caption Generation ───────────────────────────────────────────────────────
export async function generatePostContent(params: {
  brandVoice: {
    industry: string
    description: string
    tone: string
    keywords: string[]
    products: string[]
    targetAudience: string
    language: string
    customPrompt?: string | null
  }
  postType: string
  contentType: string
  platforms: string[]
  aiConfig?: AIConfig
}): Promise<GeneratedContent> {
  const { brandVoice, postType, contentType, platforms, aiConfig } = params

  const system = `Eres un experto en social media marketing para negocios latinoamericanos.
Generas contenido auténtico, atractivo y orientado a conversión.
Respondes SIEMPRE en JSON válido con exactamente estos campos: caption, hashtags, imagePrompt, videoPrompt.
Idioma del negocio: ${brandVoice.language}.`

  const user = `Crea contenido para ${POST_TYPE_INSTRUCTIONS[postType] ?? postType} para publicar en ${platforms.join(" y ")}.

NEGOCIO:
- Industria: ${brandVoice.industry}
- Descripción: ${brandVoice.description}
- Tono de voz: ${brandVoice.tone}
- Productos: ${brandVoice.products.join(", ")}
- Palabras clave: ${brandVoice.keywords.join(", ")}
- Audiencia: ${brandVoice.targetAudience}
${brandVoice.customPrompt ? `- Instrucción adicional: ${brandVoice.customPrompt}` : ""}

TIPO DE CONTENIDO: ${CONTENT_TYPE_INSTRUCTIONS[contentType] ?? contentType}

Genera:
1. "caption": El texto del post (en tono ${brandVoice.tone}, en ${brandVoice.language}). Incluye llamada a la acción. Para STORY máx 80 palabras.
2. "hashtags": String con 20-25 hashtags relevantes separados por espacios (mezcla populares y de nicho).
3. "imagePrompt": Prompt en INGLÉS para Flux Pro (IA generadora de imágenes de calidad comercial). DEBE ser extremadamente detallado y profesional. Incluir obligatoriamente: tipo de fotografía (editorial/product/lifestyle/architecture), iluminación específica (golden hour/studio softbox/natural window light/etc), composición (rule of thirds/symmetry/close-up/wide shot), paleta de colores, texturas, materiales, atmósfera, estilo visual (luxury/minimalist/warm/modern/etc), ángulo de cámara y profundidad de campo. Para STORY/REEL especifica "vertical portrait composition 9:16". Mínimo 60 palabras.
4. "videoPrompt": Para REEL: describe la secuencia de movimiento de cámara (slow dolly in, parallax, orbital shot), transiciones, ritmo visual y mood. Para otros tipos: campo vacío "".

Responde ÚNICAMENTE con el JSON, sin texto adicional.`

  const text = await llmWithConfig(aiConfig, system, user, 1024)

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error("No JSON found")
    return JSON.parse(jsonMatch[0]) as GeneratedContent
  } catch {
    return {
      caption: text.slice(0, 500),
      hashtags: `#${brandVoice.keywords.slice(0, 10).join(" #")}`,
      imagePrompt: `Professional photo of ${brandVoice.products[0] ?? brandVoice.industry}, elegant interior design, natural lighting, high quality`,
      videoPrompt: "Smooth camera pan revealing the product in a beautiful interior setting",
    }
  }
}

// ─── Caption Variants A/B ─────────────────────────────────────────────────────
export async function generateCaptionVariants(params: {
  brandVoice: Parameters<typeof generatePostContent>[0]["brandVoice"]
  postType: string
  contentType: string
  platforms: string[]
  baseImagePrompt: string
  aiConfig?: AIConfig
}): Promise<CaptionVariant[]> {
  const { brandVoice, postType, contentType, platforms, aiConfig } = params

  const text = await llmWithConfig(
    aiConfig,
    `Eres experto en copywriting para redes sociales latinoamericanas. Respondes SOLO en JSON válido.`,
    `Genera 3 variantes de caption para un ${postType} de ${contentType} en ${platforms.join("/")} para este negocio:
- ${brandVoice.description}
- Tono: ${brandVoice.tone}
- Productos: ${brandVoice.products.join(", ")}
- Audiencia: ${brandVoice.targetAudience}
- Idioma: ${brandVoice.language}
${brandVoice.customPrompt ? `- Instrucción especial: ${brandVoice.customPrompt}` : ""}

Cada variante debe tener un ángulo diferente (emocional, informativo, urgencia/oferta).
Para STORY o REEL máx 60 palabras por caption.

Responde SOLO este JSON:
{
  "variants": [
    {"caption": "...", "angle": "emocional"},
    {"caption": "...", "angle": "informativo"},
    {"caption": "...", "angle": "urgencia"}
  ]
}`,
    1024
  )

  try {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error("No JSON")
    const parsed = JSON.parse(match[0])
    return parsed.variants ?? []
  } catch {
    return [{ caption: text.slice(0, 300), angle: "estándar" }]
  }
}

// ─── Hashtag Research ─────────────────────────────────────────────────────────
export async function researchHashtags(params: {
  brandVoice: Parameters<typeof generatePostContent>[0]["brandVoice"]
  contentType: string
  postType: string
  aiConfig?: AIConfig
}): Promise<{ set1: string; set2: string; set3: string; explanation: string }> {
  const { brandVoice, contentType, postType, aiConfig } = params

  const text = await llmWithConfig(
    aiConfig,
    `Eres experto en SEO de Instagram y Facebook. Respondes SOLO en JSON válido.`,
    `Investiga y genera 3 sets de hashtags optimizados para:
- Negocio: ${brandVoice.industry} — ${brandVoice.description}
- Tipo post: ${postType} de ${contentType}
- Audiencia: ${brandVoice.targetAudience}
- Idioma: ${brandVoice.language}
- Keywords: ${brandVoice.keywords.join(", ")}

Set 1: 8 hashtags MUY populares (>1M posts)
Set 2: 8 hashtags de nicho (50K-500K posts, mayor engagement)
Set 3: 8 hashtags de marca/local (específicos del negocio)

Responde SOLO:
{
  "set1": "#hashtag1 #hashtag2 ...",
  "set2": "#hashtag1 ...",
  "set3": "#hashtag1 ...",
  "explanation": "Por qué este mix es óptimo (1 oración)"
}`,
    800
  )

  try {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error("no JSON")
    return JSON.parse(match[0])
  } catch {
    return {
      set1: `#${brandVoice.keywords.slice(0, 8).join(" #")}`,
      set2: `#${brandVoice.products.slice(0, 8).join(" #")}`,
      set3: "#decoracion #hogar #chile",
      explanation: "Mix estándar basado en keywords del negocio",
    }
  }
}

// ─── Comment Auto-Reply ───────────────────────────────────────────────────────
export async function generateCommentReply(params: {
  brandVoice: { tone: string; description: string; language: string; autoReplyTone?: string | null }
  commentText: string
  postCaption: string
  aiConfig?: AIConfig
}): Promise<string> {
  const { brandVoice, commentText, postCaption, aiConfig } = params
  const tone = brandVoice.autoReplyTone ?? brandVoice.tone

  const text = await llmWithConfig(
    aiConfig,
    `Eres el community manager de una marca. Respondes comentarios de Instagram/Facebook de forma ${tone}. Respondes SOLO el texto de la respuesta, sin comillas, sin explicaciones. Máximo 2 oraciones. Idioma: ${brandVoice.language}.`,
    `Post: "${postCaption.slice(0, 100)}"\nComentario de @usuario: "${commentText}"\n\nEscribe UNA respuesta breve y ${tone}.`,
    200
  )
  return text.trim().replace(/^["']|["']$/g, "")
}

// ─── Content Suggestions ──────────────────────────────────────────────────────
export async function generateContentSuggestions(params: {
  brandVoice: { industry: string; description: string; tone: string; products: string[]; keywords: string[] }
  analytics: {
    topPostTypes: string[]
    bestEngagementDay: string
    avgReach: number
    totalPosts: number
  }
  aiConfig?: AIConfig
}): Promise<Array<{ title: string; type: string; contentType: string; why: string; hook: string }>> {
  const { brandVoice, analytics, aiConfig } = params

  const text = await llmWithConfig(
    aiConfig,
    `Eres un estratega de contenido experto en redes sociales latinoamericanas. Analizas datos de rendimiento y generas ideas de contenido accionables. Respondes SOLO JSON válido.`,
    `Analiza el rendimiento y sugiere 6 ideas de contenido para:
Negocio: ${brandVoice.industry} — ${brandVoice.description}
Productos: ${brandVoice.products.join(", ")}
Keywords: ${brandVoice.keywords.join(", ")}

Datos de analytics:
- Tipos de post más exitosos: ${analytics.topPostTypes.join(", ")}
- Mejor día de engagement: ${analytics.bestEngagementDay}
- Alcance promedio: ${analytics.avgReach}
- Total posts publicados: ${analytics.totalPosts}

Responde SOLO este JSON:
{
  "suggestions": [
    {
      "title": "Título de la idea",
      "type": "FEED|STORY|REEL|CAROUSEL",
      "contentType": "PRODUCTO|PROYECTO|TIP|PROMO",
      "why": "Por qué este contenido funcionará bien (1 oración con datos)",
      "hook": "El hook o primera línea del caption (máx 15 palabras)"
    }
  ]
}`,
    1500
  )

  try {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error("no JSON")
    const parsed = JSON.parse(match[0])
    return parsed.suggestions ?? []
  } catch {
    return []
  }
}

// ─── Competitor Analysis ──────────────────────────────────────────────────────
export async function analyzeCompetitor(params: {
  competitorHandle: string
  topPosts: Array<{ caption?: string; like_count?: number; comments_count?: number; media_type?: string }>
  brandVoice: { industry: string; products: string[] }
  aiConfig?: AIConfig
}): Promise<{ strengths: string[]; opportunities: string[]; contentIdeas: string[]; summary: string }> {
  const { competitorHandle, topPosts, brandVoice, aiConfig } = params

  const postsDesc = topPosts.slice(0, 10).map((p, i) =>
    `Post ${i + 1}: ${p.media_type ?? "IMAGE"}, likes: ${p.like_count ?? 0}, comentarios: ${p.comments_count ?? 0}, caption: "${(p.caption ?? "").slice(0, 80)}"`
  ).join("\n")

  const text = await llmWithConfig(
    aiConfig,
    `Eres un analista de marketing digital experto en benchmarking competitivo para Instagram. Respondes SOLO JSON válido.`,
    `Analiza los top posts de @${competitorHandle} para un negocio de ${brandVoice.industry}:\n\n${postsDesc}\n\nIdentifica:\n1. Qué hace bien (3 fortalezas)\n2. Oportunidades de diferenciación (3 puntos)\n3. Ideas de contenido para superar al competidor (3 ideas)\n\nResponde SOLO este JSON:\n{\n  "strengths": ["fortaleza1", "fortaleza2", "fortaleza3"],\n  "opportunities": ["oportunidad1", "oportunidad2", "oportunidad3"],\n  "contentIdeas": ["idea1", "idea2", "idea3"],\n  "summary": "Resumen ejecutivo en 2 oraciones"\n}`,
    1000
  )

  try {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error("no JSON")
    return JSON.parse(match[0])
  } catch {
    return { strengths: [], opportunities: [], contentIdeas: [], summary: "Error al analizar." }
  }
}

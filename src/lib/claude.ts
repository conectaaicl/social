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
Generas contenido auténtico, atractivo y de ALTO ENGAGEMENT.
Respondes SIEMPRE en JSON válido con exactamente estos campos: caption, hashtags, imagePrompt, videoPrompt.
Idioma del negocio: ${brandVoice.language}.

REGLAS DE FORMATO PARA CAPTION (fundamentales para el algoritmo de IG/FB):
- La primera línea ES EL HOOK: máximo 8 palabras, impacta inmediatamente, usa emoji relevante al inicio
- Estructura obligatoria con párrafos separados por línea en blanco:
  [emoji] HOOK impactante (1 línea)

  [emoji] Párrafo 1: contexto, historia o problema que resuelves (2-3 oraciones cortas)

  [emoji] Párrafo 2: solución, beneficio concreto o prueba social (2-3 oraciones)

  [emoji] CTA directa y específica: "Comenta ✅ si te interesa", "Escríbenos por DM", "Link en bio 👆", "Guarda este post ❤️"
- Usa emojis variados, NO repetidos, relevantes al rubro del negocio
- Para STORY: SOLO hook (1 línea) + CTA. Máx 15 palabras total.
- Para REEL: hook + 1 párrafo + CTA. Máx 80 palabras.
- NUNCA uses hashtags dentro del caption, van en campo separado`

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
1. "caption": El texto del post ESTRUCTURADO con el formato de párrafos indicado. Tono ${brandVoice.tone}. Con emojis variados y relevantes. CTA clara al final.
2. "hashtags": String con 25 hashtags estratégicos separados por espacios: 8 muy populares (+1M posts, ej: #decoracion #hogar), 10 de nicho específico (50K-500K posts), 7 de marca/local/ciudad. Sin repetir. Empieza cada uno con #.
3. "imagePrompt": REGLA CRÍTICA: El generador de imágenes NO conoce el negocio. Si no mencionas el producto EXACTO, generará algo incorrecto (ej: un sillón en vez de una cortina). OBLIGATORIO empezar con el nombre literal del producto: "${brandVoice.products[0] ?? brandVoice.industry}". Formato: "[nombre literal del producto del negocio], [tipo de fotografía: product/lifestyle/editorial], [iluminación: studio softbox/natural window light/golden hour], [composición: close-up/wide shot/rule of thirds], [paleta de colores], [materiales y texturas], [estilo: luxury/minimalist/modern], [ángulo de cámara]. Para STORY/REEL: vertical portrait composition 9:16. Mínimo 60 palabras en INGLÉS. NO menciones muebles genéricos (sofa/armchair/furniture) salvo que el producto SEA ese mueble."
4. "videoPrompt": Para REEL: describe la secuencia de movimiento de cámara (slow dolly in, parallax, orbital shot), transiciones, ritmo visual y mood. Para otros tipos: campo vacío "".

Responde ÚNICAMENTE con el JSON, sin texto adicional.`

  const text = await llmWithConfig(aiConfig, system, user, 1024)

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error("No JSON found")
    const result = JSON.parse(jsonMatch[0]) as GeneratedContent
    // Safety: force primary product mention in imagePrompt
    const primaryProduct = brandVoice.products[0] ?? brandVoice.industry
    if (result.imagePrompt && primaryProduct) {
      const firstWord = primaryProduct.toLowerCase().split(/\s+/)[0]
      if (firstWord.length > 3 && !result.imagePrompt.toLowerCase().includes(firstWord)) {
        result.imagePrompt = `${primaryProduct}, ${result.imagePrompt}`
      }
    }
    return result
  } catch {
    const primaryProduct = brandVoice.products[0] ?? brandVoice.industry
    return {
      caption: text.slice(0, 500),
      hashtags: `#${brandVoice.keywords.slice(0, 10).join(" #")}`,
      imagePrompt: `${primaryProduct}, professional product photography, studio lighting, elegant interior design, sharp focus, high quality commercial photo`,
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
// --- Caption for User Photo -------------------------------------------------------------------
export async function generateCaptionForPhoto(params: {
  brandVoice: Parameters<typeof generatePostContent>[0]["brandVoice"]
  postType: string; contentType: string; platforms: string[]; imageDescription?: string; aiConfig?: AIConfig
}): Promise<{ caption: string; hashtags: string }> {
  const { brandVoice, postType, contentType, platforms, imageDescription, aiConfig } = params
  const parts: string[] = [
    "Crea caption y hashtags para un " + (POST_TYPE_INSTRUCTIONS[postType] ?? postType) + " en " + platforms.join("/") + " con FOTO PROPIA.",
    "Negocio: " + brandVoice.industry + " - " + brandVoice.description,
    "Tono: " + brandVoice.tone + ". Productos: " + brandVoice.products.join(", "),
    "Audiencia: " + brandVoice.targetAudience + ". Idioma: " + brandVoice.language,
    ...(brandVoice.customPrompt ? ["Instruccion: " + brandVoice.customPrompt] : []),
    "Tipo contenido: " + (CONTENT_TYPE_INSTRUCTIONS[contentType] ?? contentType),
    ...(imageDescription ? ["Descripcion foto: " + imageDescription] : []),
    "Responde SOLO JSON con campos: caption (ESTRUCTURADO: emoji+hook en linea 1, linea en blanco, emoji+parrafo1, linea en blanco, emoji+parrafo2, linea en blanco, emoji+CTA) y hashtags (25 hashtags: 8 populares +1M, 10 nicho 50K-500K, 7 marca/local. Sin hashtags en el caption).",
  ]
  const text = await llmWithConfig(
    aiConfig,
    "Eres experto en copywriting para redes sociales latinoamericanas con alto engagement. Respondes SOLO JSON valido. REGLAS: caption estructurado con emojis, parrafos separados por linea en blanco, hook en primera linea, CTA al final. NUNCA mezcles hashtags en el caption.",
    parts.join("\n"),
    1200
  )
  try { const m = text.match(/\{[\s\S]*\}/); if (!m) throw new Error("No JSON"); const p = JSON.parse(m[0]); if (Array.isArray(p.hashtags)) p.hashtags = p.hashtags.join(" "); return p }
  catch { return { caption: text.slice(0, 500), hashtags: brandVoice.keywords.slice(0, 10).map(k => "#" + k).join(" ") } }
}


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

// ─── Transcript mining: extrae insumos de contenido de una transcripcion larga ──
export async function analyzeTranscript(params: {
  transcript: string
  brandVoice: { industry: string; products: string[] }
  aiConfig?: AIConfig
}): Promise<{
  hooks: string[]
  historias: string[]
  frameworks: string[]
  objeciones: string[]
  citas: string[]
}> {
  const { transcript, brandVoice, aiConfig } = params
  const trimmed = transcript.slice(0, 14000)

  const text = await llmWithConfig(
    aiConfig,
    `Eres un estratega de contenido que extrae material reutilizable de transcripciones largas (videos de YouTube, podcasts, llamadas de venta) para un negocio de ${brandVoice.industry}. Respondes SOLO JSON valido, sin texto extra.`,
    `Analiza esta transcripcion y extrae material aprovechable para crear contenido corto (reels, posts):\n\n"""${trimmed}"""\n\nExtrae:\n1. hooks: 3-5 ganchos/ideas cortas que funcionarian como apertura de un reel\n2. historias: 2-4 momentos narrativos o anecdotas reutilizables tal como aparecen\n3. frameworks: 2-3 metodos, pasos o estructuras mencionadas que se puedan convertir en contenido educativo\n4. objeciones: objeciones, dudas o resistencias del cliente/audiencia mencionadas en el texto, con una idea de como responderlas\n5. citas: 2-4 frases textuales potentes, tal como se dijeron, que sirvan como copy directo\n\nSi la transcripcion no trae suficiente material para alguna categoria, devuelve un arreglo mas corto o vacio para esa categoria en vez de inventar contenido.\n\nResponde SOLO este JSON:\n{\n  "hooks": ["..."],\n  "historias": ["..."],\n  "frameworks": ["..."],\n  "objeciones": ["..."],\n  "citas": ["..."]\n}`,
    2000
  )

  try {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error("no JSON")
    const parsed = JSON.parse(match[0])
    return {
      hooks: Array.isArray(parsed.hooks) ? parsed.hooks : [],
      historias: Array.isArray(parsed.historias) ? parsed.historias : [],
      frameworks: Array.isArray(parsed.frameworks) ? parsed.frameworks : [],
      objeciones: Array.isArray(parsed.objeciones) ? parsed.objeciones : [],
      citas: Array.isArray(parsed.citas) ? parsed.citas : [],
    }
  } catch {
    return { hooks: [], historias: [], frameworks: [], objeciones: [], citas: [] }
  }
}

// ─── DM mining: extrae objeciones, urgencia y frases reales de conversaciones OSW ──
export async function analyzeConversations(params: {
  conversations: { contactName: string; messages: string[] }[]
  brandVoice: { industry: string; products: string[] }
  aiConfig?: AIConfig
}): Promise<{
  objeciones: string[]
  urgencia: string[]
  frasesReales: string[]
  temasComunes: string[]
}> {
  const { conversations, brandVoice, aiConfig } = params
  const blocks = conversations
    .map((c, i) => `--- Conversacion ${i + 1} (${c.contactName}) ---\n${c.messages.join("\n").slice(0, 800)}`)
    .join("\n\n")
    .slice(0, 16000)

  const text = await llmWithConfig(
    aiConfig,
    `Eres un estratega de contenido que analiza conversaciones reales de WhatsApp/DM de clientes de un negocio de ${brandVoice.industry} para sacar insumos de marketing. Respondes SOLO JSON valido, sin texto extra.`,
    `Analiza estas conversaciones reales entre el negocio y sus clientes/leads:\n\n"""${blocks}"""\n\nExtrae:\n1. objeciones: dudas, resistencias o "peros" reales que ponen los clientes antes de comprar, tal como se expresan\n2. urgencia: senales de urgencia o necesidad real detectadas (ej: "lo necesito para esta semana", motivos de compra urgentes)\n3. frasesReales: frases textuales de clientes (como piden, describen su problema o reaccionan) utiles como copy porque suenan autenticas, no de marketing\n4. temasComunes: preguntas o temas que se repiten en varias conversaciones y que valdria la pena responder en un post o reel\n\nSi no hay suficiente material para alguna categoria, devuelve un arreglo mas corto o vacio en vez de inventar contenido. No inventes citas que no esten en el texto.\n\nResponde SOLO este JSON:\n{\n  "objeciones": ["..."],\n  "urgencia": ["..."],\n  "frasesReales": ["..."],\n  "temasComunes": ["..."]\n}`,
    2000
  )

  try {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error("no JSON")
    const parsed = JSON.parse(match[0])
    return {
      objeciones: Array.isArray(parsed.objeciones) ? parsed.objeciones : [],
      urgencia: Array.isArray(parsed.urgencia) ? parsed.urgencia : [],
      frasesReales: Array.isArray(parsed.frasesReales) ? parsed.frasesReales : [],
      temasComunes: Array.isArray(parsed.temasComunes) ? parsed.temasComunes : [],
    }
  } catch {
    return { objeciones: [], urgencia: [], frasesReales: [], temasComunes: [] }
  }
}

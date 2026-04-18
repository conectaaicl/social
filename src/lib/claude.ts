import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface GeneratedContent {
  caption: string
  hashtags: string
  imagePrompt: string
  videoPrompt: string
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

export interface CaptionVariant {
  caption: string
  angle: string
}

export async function generateCaptionVariants(params: {
  brandVoice: Parameters<typeof generatePostContent>[0]["brandVoice"]
  postType: string
  contentType: string
  platforms: string[]
  baseImagePrompt: string
}): Promise<CaptionVariant[]> {
  const { brandVoice, postType, contentType, platforms, baseImagePrompt } = params

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: `Eres experto en copywriting para redes sociales latinoamericanas. Respondes SOLO en JSON válido.`,
    messages: [
      {
        role: "user",
        content: `Genera 3 variantes de caption para un ${postType} de ${contentType} en ${platforms.join("/")} para este negocio:
- ${brandVoice.description}
- Tono: ${brandVoice.tone}
- Productos: ${brandVoice.products.join(", ")}
- Audiencia: ${brandVoice.targetAudience}
- Idioma: ${brandVoice.language}
${brandVoice.customPrompt ? `- Instrucción especial: ${brandVoice.customPrompt}` : ""}

Cada variante debe tener un ángulo diferente (ej: emocional, informativo, urgencia/oferta).
Para STORY o REEL máx 60 palabras por caption.

Responde SOLO este JSON:
{
  "variants": [
    {"caption": "...", "angle": "emocional"},
    {"caption": "...", "angle": "informativo"},
    {"caption": "...", "angle": "urgencia"}
  ]
}`,
      },
    ],
  })

  const text = message.content[0].type === "text" ? message.content[0].text : ""
  try {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error("No JSON")
    const parsed = JSON.parse(match[0])
    return parsed.variants ?? []
  } catch {
    return [{ caption: text.slice(0, 300), angle: "estándar" }]
  }
}

export async function researchHashtags(params: {
  brandVoice: Parameters<typeof generatePostContent>[0]["brandVoice"]
  contentType: string
  postType: string
}): Promise<{ set1: string; set2: string; set3: string; explanation: string }> {
  const { brandVoice, contentType, postType } = params

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 800,
    system: `Eres experto en SEO de Instagram y Facebook. Respondes SOLO en JSON válido.`,
    messages: [
      {
        role: "user",
        content: `Investiga y genera 3 sets de hashtags optimizados para:
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
      },
    ],
  })

  const text = message.content[0].type === "text" ? message.content[0].text : ""
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
}): Promise<GeneratedContent> {
  const { brandVoice, postType, contentType, platforms } = params

  const systemPrompt = `Eres un experto en social media marketing para negocios latinoamericanos.
Generas contenido auténtico, atractivo y orientado a conversión.
Respondes SIEMPRE en JSON válido con exactamente estos campos: caption, hashtags, imagePrompt, videoPrompt.
Idioma del negocio: ${brandVoice.language}.`

  const userPrompt = `Crea contenido para ${POST_TYPE_INSTRUCTIONS[postType] ?? postType} para publicar en ${platforms.join(" y ")}.

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
3. "imagePrompt": Prompt en inglés para IA generadora de imágenes (fal.ai/Flux). Muy descriptivo, fotorrealista, especifica: iluminación, ángulo, estilo, colores, composición. Para STORY/REEL debe ser formato vertical 9:16.
4. "videoPrompt": Descripción del concepto de video (movimiento, escenas, ritmo) si el post es REEL o STORY de video.

Responde ÚNICAMENTE con el JSON, sin texto adicional.`

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  })

  const text = message.content[0].type === "text" ? message.content[0].text : ""

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

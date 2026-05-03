const GROQ_BASE = "https://api.groq.com/openai/v1"
const GROQ_KEY = process.env.GROQ_API_KEY ?? ""

export interface GroqMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export async function chatWithGroq(
  messages: GroqMessage[],
  maxTokens = 350
): Promise<string> {
  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_KEY}`,
    },
    body: JSON.stringify({
      model: "llama3-70b-8192",
      messages,
      max_tokens: maxTokens,
      temperature: 0.6,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Groq error ${res.status}: ${err}`)
  }

  const data = await res.json()
  return (data.choices[0]?.message?.content ?? "").trim()
}

export function buildChatbotSystemPrompt(params: {
  brandName: string
  description: string
  tone: string
  products: string[]
  targetAudience: string
  language: string
  autoReplyTone?: string | null
}) {
  const { brandName, description, tone, products, targetAudience, language, autoReplyTone } = params
  const replyTone = autoReplyTone ?? tone

  return `Eres el asistente virtual de *${brandName}* en WhatsApp.

Negocio: ${description}
Productos/Servicios: ${products.join(", ")}
Audiencia: ${targetAudience}
Tono de respuesta: ${replyTone}
Idioma: ${language}

Reglas:
- Responde SIEMPRE en ${language === "es-CL" ? "español chileno" : language}, de forma concisa (máx 3 párrafos cortos).
- Usa el tono "${replyTone}" en todo momento.
- Si te preguntan por precios, di que los puede ver en el sitio web o que un asesor los contactará pronto.
- Si te preguntan algo que no sabes, ofrece derivar con un agente humano.
- NO uses markdown pesado. Puedes usar *negrita* y emojis con moderación.
- No inventes información sobre el negocio que no te fue dada.
- Siempre termina con una invitación a continuar la conversación o visitar el sitio.`
}

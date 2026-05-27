import { NextRequest, NextResponse } from "next/server"
import { processApprovalResponse } from "@/lib/approval-pipeline"

// Evolution API sends POST with JSON payload for MESSAGES_UPSERT event
export async function POST(req: NextRequest) {
  const secret = process.env.EVOLUTION_WEBHOOK_SECRET
  const provided = req.headers.get('x-evolution-secret') || req.headers.get('x-webhook-secret') || ''
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  try {
    const payload = await req.json()

    // Evolution API v2 webhook payload structure
    const event = payload?.event
    const data = payload?.data

    if (event !== "messages.upsert" && event !== "MESSAGES_UPSERT") {
      return NextResponse.json({ ok: true })
    }

    const msg = data?.message ?? data?.messages?.[0]
    if (!msg) return NextResponse.json({ ok: true })

    // Extract sender phone and text
    const fromJid: string = msg.key?.remoteJid ?? ""
    const fromPhone = fromJid.replace("@s.whatsapp.net", "").replace("@c.us", "")

    // Extract text content
    const text: string =
      msg.message?.conversation ??
      msg.message?.extendedTextMessage?.text ??
      msg.message?.buttonsResponseMessage?.selectedDisplayText ??
      ""

    if (!text || !fromPhone) return NextResponse.json({ ok: true })

    // Only process if it looks like an approval command
    const isApprovalCmd = /^(OK|NO|EDIT)\s+[A-F0-9]{8}/i.test(text.trim())
    if (!isApprovalCmd) return NextResponse.json({ ok: true })

    await processApprovalResponse(text, fromPhone)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("WA approval webhook error:", err)
    // Always return 200 to avoid Evolution API retries
    return NextResponse.json({ ok: true })
  }
}

// Health check for Evolution API webhook verification
export async function GET() {
  return NextResponse.json({ status: "ok", service: "whatsapp-approval" })
}

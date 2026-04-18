import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/mail"
import crypto from "crypto"

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: "Email requerido" }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { email } })

  // Always return 200 to avoid user enumeration
  if (!user) return NextResponse.json({ ok: true })

  const token = crypto.randomBytes(32).toString("hex")
  const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  await prisma.verificationToken.upsert({
    where: { identifier_token: { identifier: email, token } },
    create: { identifier: email, token, expires },
    update: { expires },
  })

  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${token}&email=${encodeURIComponent(email)}`

  await sendEmail({
    to: email,
    subject: "Restablecer contraseña — ConectaAI Social",
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#0f1117;color:#e5e7eb;border-radius:12px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px">
          <div style="width:36px;height:36px;background:linear-gradient(135deg,#6366f1,#9333ea);border-radius:8px;display:flex;align-items:center;justify-content:center">
            <span style="color:white;font-size:18px">⚡</span>
          </div>
          <div>
            <p style="margin:0;font-weight:bold;color:#f9fafb">ConectaAI Social</p>
          </div>
        </div>
        <h2 style="color:#f9fafb;margin:0 0 12px">Restablecer contraseña</h2>
        <p style="color:#9ca3af;margin:0 0 24px">Haz clic en el botón de abajo para crear una nueva contraseña. Este enlace expira en 1 hora.</p>
        <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#9333ea);color:white;font-weight:bold;padding:12px 28px;border-radius:10px;text-decoration:none;margin-bottom:24px">
          Restablecer contraseña
        </a>
        <p style="color:#6b7280;font-size:12px;margin:16px 0 0">Si no solicitaste este cambio, ignora este email. El enlace expirará automáticamente.</p>
        <hr style="border:none;border-top:1px solid #1f2937;margin:20px 0" />
        <p style="color:#4b5563;font-size:11px;margin:0">ConectaAI Social · ${process.env.NEXT_PUBLIC_APP_URL}</p>
      </div>
    `,
  })

  return NextResponse.json({ ok: true })
}

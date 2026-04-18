import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(req: NextRequest) {
  const { token, password, email } = await req.json()

  if (!token || !password) {
    return NextResponse.json({ error: "Token y contraseña requeridos" }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 })
  }

  // Find token — search by token value
  const record = await prisma.verificationToken.findFirst({
    where: { token, expires: { gte: new Date() } },
  })

  if (!record) {
    return NextResponse.json({ error: "Enlace inválido o expirado. Solicita uno nuevo." }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { email: record.identifier } })
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  const hashed = await bcrypt.hash(password, 12)

  await Promise.all([
    prisma.user.update({ where: { id: user.id }, data: { password: hashed } }),
    prisma.verificationToken.delete({ where: { identifier_token: { identifier: record.identifier, token } } }),
  ])

  return NextResponse.json({ ok: true })
}

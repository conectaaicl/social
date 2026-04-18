import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

// One-time setup endpoint — creates default admin if not exists
// Protected by SETUP_SECRET env var
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-setup-secret")
  if (secret !== process.env.SETUP_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const existing = await prisma.user.findUnique({
    where: { email: "corp.conectaai@gmail.com" },
  })

  if (existing) {
    return NextResponse.json({ ok: true, created: false, message: "Usuario ya existe" })
  }

  const password = process.env.ADMIN_DEFAULT_PASSWORD ?? "ConectaAI2024!"
  const hashed = await bcrypt.hash(password, 12)

  // Create tenant + user
  const tenant = await prisma.tenant.create({
    data: {
      name: "ConectaAI",
      slug: "conectaai",
      plan: "AGENCY",
      active: true,
    },
  })

  await prisma.user.create({
    data: {
      name: "ConectaAI Admin",
      email: "corp.conectaai@gmail.com",
      password: hashed,
      role: "OWNER",
      tenantId: tenant.id,
    },
  })

  return NextResponse.json({
    ok: true,
    created: true,
    email: "corp.conectaai@gmail.com",
    password,
    message: "Usuario creado exitosamente. Cambia la contraseña después del primer login.",
  })
}

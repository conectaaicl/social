import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  businessName: z.string().min(2),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
    }

    const { name, email, password, businessName } = parsed.data

    // Verificar si el email ya existe
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: "Este email ya está registrado" }, { status: 409 })
    }

    // Crear slug del tenant
    const slug = businessName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")

    // Verificar slug único
    const existingTenant = await prisma.tenant.findUnique({ where: { slug } })
    const finalSlug = existingTenant ? `${slug}-${Date.now()}` : slug

    const hashedPassword = await bcrypt.hash(password, 12)

    // Crear tenant + usuario en transacción
    const user = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: businessName,
          slug: finalSlug,
        },
      })

      const newUser = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: "OWNER",
          tenantId: tenant.id,
        },
      })

      return newUser
    })

    return NextResponse.json({ success: true, userId: user.id }, { status: 201 })
  } catch (error) {
    console.error("Register error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

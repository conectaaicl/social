import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  // ── TerraBlinds tenant ──────────────────────────────────────────────────────
  let tenant = await prisma.tenant.findUnique({ where: { slug: "terrablinds" } })
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: "TerraBlinds",
        slug: "terrablinds",
        plan: "BASIC",
        active: true,
      },
    })
    console.log("✅ Tenant terrablinds created:", tenant.id)
  } else {
    console.log("ℹ️  Tenant terrablinds already exists:", tenant.id)
  }

  // ── Owner user ─────────────────────────────────────────────────────────────
  const existing = await prisma.user.findUnique({ where: { email: "hector@conectaai.cl" } })
  if (!existing) {
    const hash = await bcrypt.hash("ConectaAI2025!", 12)
    await prisma.user.create({
      data: {
        name: "Héctor",
        email: "hector@conectaai.cl",
        password: hash,
        role: "OWNER",
        tenantId: tenant.id,
      },
    })
    console.log("✅ User hector@conectaai.cl created")
  } else {
    console.log("ℹ️  User hector@conectaai.cl already exists")
    if (!existing.tenantId) {
      await prisma.user.update({ where: { id: existing.id }, data: { tenantId: tenant.id } })
      console.log("✅ User linked to terrablinds tenant")
    }
  }

  // ── BrandVoice ─────────────────────────────────────────────────────────────
  const bv = await prisma.brandVoice.findUnique({ where: { tenantId: tenant.id } })
  if (!bv) {
    await prisma.brandVoice.create({
      data: {
        tenantId: tenant.id,
        industry: "Decoración y persianas para el hogar",
        description: "TerraBlinds fabrica e instala persianas, cortinas roller y blackout de alta calidad para hogares y empresas en Chile. Más de 10 años de experiencia.",
        tone: "cercano y profesional",
        keywords: ["persianas", "cortinas roller", "blackout", "decoración", "hogar", "chile", "instalación"],
        products: ["Persiana Roller", "Cortina Blackout", "Persiana Veneciana", "Cortina Sheer", "Instalación profesional"],
        targetAudience: "Dueños de casa y empresas en Chile que buscan decorar y climatizar sus espacios con persianas de calidad",
        language: "es-CL",
        brandColors: ["#2c3e50", "#e74c3c"],
        customPrompt: "Siempre mencionar calidad, durabilidad y servicio de instalación incluido. Evitar precios exactos.",
      },
    })
    console.log("✅ BrandVoice created for terrablinds")
  } else {
    console.log("ℹ️  BrandVoice already exists")
  }

  // ── CalendarConfig ─────────────────────────────────────────────────────────
  const cc = await prisma.calendarConfig.findUnique({ where: { tenantId: tenant.id } })
  if (!cc) {
    await prisma.calendarConfig.create({
      data: {
        tenantId: tenant.id,
        postsPerDay: 2,
        scheduleSlots: [
          { time: "09:00", type: "feed" },
          { time: "19:00", type: "story" },
        ],
        contentMix: { producto: 40, tip: 25, proyecto: 25, promo: 10 },
        autoPublish: false,
        timezone: "America/Santiago",
      },
    })
    console.log("✅ CalendarConfig created for terrablinds")
  } else {
    console.log("ℹ️  CalendarConfig already exists")
  }

  console.log("\n🚀 Seed complete!")
  console.log("   Login: hector@conectaai.cl / ConectaAI2025!")
  console.log("   Tenant: terrablinds")
}

main().catch(console.error).finally(() => prisma.$disconnect())

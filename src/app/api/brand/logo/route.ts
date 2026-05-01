import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  logoUrl: z.string().url().or(z.literal("")),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { logoUrl } = schema.parse(body)

    await prisma.tenant.update({
      where: { id: session.user.tenantId },
      data: { logo: logoUrl || null },
    })

    return NextResponse.json({ success: true, logoUrl })
  } catch (error) {
    console.error("Logo update error:", error)
    return NextResponse.json({ error: "Error al guardar logo" }, { status: 500 })
  }
}

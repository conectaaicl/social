import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createSchema = z.object({
  type: z.enum(["FEED", "STORY", "CAROUSEL", "REEL"]),
  contentType: z.enum(["PRODUCTO", "PROYECTO", "TIP", "PROMO"]),
  platform: z.array(z.enum(["INSTAGRAM", "FACEBOOK"])).min(1),
  caption: z.string().min(1),
  hashtags: z.string(),
  mediaUrls: z.array(z.string().url()),
  thumbnailUrl: z.string().url().optional(),
  scheduledAt: z.string().datetime(),
  imagePrompt: z.string().optional(),
  videoPrompt: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = req.nextUrl
  const status = searchParams.get("status")
  const type = searchParams.get("type")
  const page = parseInt(searchParams.get("page") ?? "1")
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50)
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = { tenantId: session.user.tenantId }
  if (status) where.status = status
  if (type) where.type = type

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: { scheduledAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.post.count({ where }),
  ])

  return NextResponse.json({ posts, total, page, limit })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 })
  }

  const socialAccount = await prisma.socialAccount.findFirst({
    where: { tenantId: session.user.tenantId, platform: parsed.data.platform[0], active: true },
  })

  const post = await prisma.post.create({
    data: {
      ...parsed.data,
      status: "SCHEDULED",
      scheduledAt: new Date(parsed.data.scheduledAt),
      tenantId: session.user.tenantId,
      socialAccountId: socialAccount?.id,
    },
  })

  return NextResponse.json({ success: true, post })
}

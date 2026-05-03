import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  mediaUrl: z.string().min(1),
  caption: z.string().min(1, "El caption es requerido"),
  hashtags: z.string().default(""),
  postType: z.enum(["FEED", "STORY", "CAROUSEL", "REEL"]),
  contentType: z.enum(["PRODUCTO", "PROYECTO", "TIP", "PROMO"]),
  platforms: z.array(z.enum(["INSTAGRAM", "FACEBOOK"])).min(1),
  scheduledDates: z.array(z.string()).min(1, "Selecciona al menos una fecha"),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 })
  }

  const { mediaUrl, caption, hashtags, postType, contentType, platforms, scheduledDates } = parsed.data

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://social.conectaai.cl"
  const absoluteUrl = mediaUrl.startsWith("http") ? mediaUrl : `${appUrl}${mediaUrl}`

  const socialAccount = await prisma.socialAccount.findFirst({
    where: { tenantId: session.user.tenantId, platform: platforms[0], active: true },
  })

  const posts = await prisma.$transaction(
    scheduledDates.map((dateStr) =>
      prisma.post.create({
        data: {
          tenantId: session.user!.tenantId!,
          type: postType,
          contentType,
          platform: platforms,
          caption,
          hashtags,
          mediaUrls: [absoluteUrl],
          status: "SCHEDULED",
          scheduledAt: new Date(dateStr),
          socialAccountId: socialAccount?.id ?? null,
        },
      })
    )
  )

  return NextResponse.json({ success: true, count: posts.length })
}

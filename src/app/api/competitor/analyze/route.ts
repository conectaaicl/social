import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getHashtagTopPosts } from "@/lib/meta"
import { analyzeCompetitor } from "@/lib/claude"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { hashtags = [], competitorHandle = "" } = await req.json()

  const brandVoice = await prisma.brandVoice.findUnique({ where: { tenantId: session.user.tenantId } })
  if (!brandVoice) return NextResponse.json({ error: "Configura tu marca primero" }, { status: 400 })

  const igAccount = await prisma.socialAccount.findFirst({
    where: { tenantId: session.user.tenantId, platform: "INSTAGRAM", active: true },
  })

  let topPosts: any[] = []

  if (igAccount && hashtags.length > 0) {
    // Fetch real data from Meta hashtag API
    const results = await Promise.allSettled(
      hashtags.slice(0, 3).map((h: string) =>
        getHashtagTopPosts(h.replace("#", ""), igAccount.accountId, igAccount.accessToken)
      )
    )
    topPosts = results.flatMap((r) => r.status === "fulfilled" ? r.value : [])
  }

  const analysis = await analyzeCompetitor({
    competitorHandle: competitorHandle || hashtags[0] || "competidor",
    topPosts,
    brandVoice: { industry: brandVoice.industry, products: brandVoice.products },
  })

  return NextResponse.json({ analysis, postsAnalyzed: topPosts.length })
}

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  createGoogleAdsCampaign,
  generateAdCopyFromPost,
} from "@/lib/google-ads"

// GET — list campaigns for tenant
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const campaigns = await prisma.adCampaign.findMany({
    where: { tenantId: session.user.tenantId },
    include: { post: { select: { caption: true, type: true, mediaUrls: true } } },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json({ campaigns })
}

// POST — generate ad copy from post OR create campaign in Google Ads
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await req.json()
  const { action, postId, campaign } = body

  const brandVoice = await prisma.brandVoice.findUnique({ where: { tenantId: session.user.tenantId } })
  if (!brandVoice) return NextResponse.json({ error: "Configura tu marca primero" }, { status: 400 })

  // ── Generate ad copy preview (no Google Ads call) ──
  if (action === "generate_copy") {
    const post = await prisma.post.findFirst({
      where: { id: postId, tenantId: session.user.tenantId },
    })
    if (!post) return NextResponse.json({ error: "Post no encontrado" }, { status: 404 })

    const copy = await generateAdCopyFromPost({
      caption: post.caption,
      brandDescription: brandVoice.description,
      targetAudience: brandVoice.targetAudience,
      objective: campaign?.objective ?? "TRAFFIC",
      keywords: brandVoice.keywords,
    })
    return NextResponse.json({ copy })
  }

  // ── Create campaign in Google Ads + save to DB ──
  if (action === "create") {
    const hasGoogleAds = !!(
      process.env.GOOGLE_ADS_DEVELOPER_TOKEN &&
      process.env.GOOGLE_ADS_CLIENT_ID &&
      process.env.GOOGLE_ADS_REFRESH_TOKEN &&
      process.env.GOOGLE_ADS_CUSTOMER_ID
    )

    const start = new Date(campaign.startDate)
    const startDate = start.toISOString().slice(0, 10).replace(/-/g, "")
    const endDate = campaign.endDate
      ? new Date(campaign.endDate).toISOString().slice(0, 10).replace(/-/g, "")
      : undefined

    let googleIds: { campaignId?: string; adGroupId?: string; adId?: string } = {}

    if (hasGoogleAds) {
      try {
        const result = await createGoogleAdsCampaign({
          name: campaign.name,
          objective: campaign.objective,
          dailyBudgetMicros: Math.round(campaign.budget * 1_000_000),
          startDate,
          endDate,
          targetUrl: campaign.targetUrl,
          headlines: campaign.headlines,
          descriptions: campaign.descriptions,
          keywords: campaign.keywords,
        })
        googleIds = result
      } catch (err: any) {
        // Save as DRAFT if Google Ads API not configured or fails
        console.error("Google Ads API error:", err.message)
      }
    }

    const saved = await prisma.adCampaign.create({
      data: {
        name: campaign.name,
        status: googleIds.campaignId ? "PENDING_REVIEW" : "DRAFT",
        objective: campaign.objective,
        budget: campaign.budget,
        startDate: start,
        endDate: campaign.endDate ? new Date(campaign.endDate) : undefined,
        targetUrl: campaign.targetUrl,
        headlines: campaign.headlines,
        descriptions: campaign.descriptions,
        keywords: campaign.keywords,
        googleCampaignId: googleIds.campaignId,
        googleAdGroupId: googleIds.adGroupId,
        googleAdId: googleIds.adId,
        postId: postId ?? null,
        tenantId: session.user.tenantId,
      },
    })

    return NextResponse.json({
      success: true,
      campaign: saved,
      googleAdsConnected: hasGoogleAds && !!googleIds.campaignId,
    })
  }

  return NextResponse.json({ error: "Acción no válida" }, { status: 400 })
}

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { activateCampaign, pauseCampaign, getCampaignStats } from "@/lib/google-ads"

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { action } = await req.json()
  const campaign = await prisma.adCampaign.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
  })
  if (!campaign) return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 })

  if (action === "activate" && campaign.googleCampaignId) {
    await activateCampaign(campaign.googleCampaignId)
    await prisma.adCampaign.update({ where: { id: params.id }, data: { status: "ACTIVE" } })
  } else if (action === "pause" && campaign.googleCampaignId) {
    await pauseCampaign(campaign.googleCampaignId)
    await prisma.adCampaign.update({ where: { id: params.id }, data: { status: "PAUSED" } })
  } else if (action === "sync_stats" && campaign.googleCampaignId) {
    const stats = await getCampaignStats(campaign.googleCampaignId)
    await prisma.adCampaign.update({
      where: { id: params.id },
      data: {
        impressions: stats.impressions,
        clicks: stats.clicks,
        spend: stats.spend,
        conversions: stats.conversions,
      },
    })
    return NextResponse.json({ ok: true, stats })
  } else {
    // Just update status locally (DRAFT mode, no Google Ads API)
    const statusMap: Record<string, string> = { activate: "ACTIVE", pause: "PAUSED" }
    if (statusMap[action]) {
      await prisma.adCampaign.update({
        where: { id: params.id },
        data: { status: statusMap[action] as any },
      })
    }
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  await prisma.adCampaign.deleteMany({
    where: { id: params.id, tenantId: session.user.tenantId },
  })
  return NextResponse.json({ ok: true })
}

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { refreshMetaLongLivedToken } from "@/lib/token-refresh"

function verifyCronSecret(req: NextRequest) {
  const auth = req.headers.get("authorization")
  return auth === `Bearer ${process.env.CRON_SECRET}`
}

export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Find Meta accounts expiring within 15 days
  const cutoff = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
  const expiring = await prisma.socialAccount.findMany({
    where: {
      platform: { in: ["INSTAGRAM", "FACEBOOK"] },
      active: true,
      OR: [
        { tokenExpiresAt: { lte: cutoff } },
        { tokenExpiresAt: null }, // tokens sin fecha — asumir que necesitan refresh
      ],
    },
    select: { id: true, tenantId: true, platform: true, accountName: true, accessToken: true, tokenExpiresAt: true },
    take: 50,
  })

  const results: Array<{ id: string; platform: string; name: string; ok: boolean; error?: string }> = []

  for (const account of expiring) {
    try {
      await refreshMetaLongLivedToken(account.id, account.accessToken)
      results.push({ id: account.id, platform: account.platform, name: account.accountName, ok: true })
    } catch (e: any) {
      results.push({ id: account.id, platform: account.platform, name: account.accountName, ok: false, error: e.message })
      // Mark as inactive if token is truly dead (401/invalid)
      if (e.message?.includes("Invalid OAuth") || e.message?.includes("Session has expired")) {
        await prisma.socialAccount.update({
          where: { id: account.id },
          data: { active: false },
        })
      }
    }
  }

  const refreshed = results.filter(r => r.ok).length
  const failed = results.filter(r => !r.ok).length
  console.log(`[refresh-tokens] checked=${expiring.length} refreshed=${refreshed} failed=${failed}`)

  return NextResponse.json({ ok: true, checked: expiring.length, refreshed, failed, results })
}

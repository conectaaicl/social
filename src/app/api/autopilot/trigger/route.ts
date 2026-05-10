import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function POST(_req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const cronSecret = process.env.CRON_SECRET ?? ""
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3011"

  try {
    const res = await fetch(`${baseUrl}/api/cron/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cronSecret}`,
      },
      body: JSON.stringify({ tenant: undefined }),
    })

    const data = await res.json()
    return NextResponse.json({ ok: true, result: data })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}

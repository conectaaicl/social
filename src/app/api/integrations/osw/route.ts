/**
 * Integration: social.conectaai.cl ↔ osw.conectaai.cl (OmniFlow)
 *
 * Two directions:
 * 1. POST /api/integrations/osw/briefing
 *    social → osw: Notify OmniFlow before a post goes live so the bot
 *    can pre-load product FAQ and handle incoming DMs intelligently.
 *
 * 2. POST /api/integrations/osw (called BY osw)
 *    osw → social: When a public Instagram comment is detected by OmniFlow,
 *    route it to social's comment handler instead of treating it as a DM.
 *
 * Auth: Bearer INTEGRATION_SECRET
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

function authOk(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? ""
  return auth === `Bearer ${process.env.INTEGRATION_SECRET}`
}

// ── social → osw: Send post briefing so OmniFlow bot prepares ──
export async function POST(req: NextRequest) {
  if (!authOk(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await req.json()
  const { action } = body

  // ── Direction 1: osw calls us to sync a public comment ──
  if (action === "sync_comment") {
    const { tenantSlug, postMetaId, commentId, username, text } = body
    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
    if (!tenant) return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 })

    const post = await prisma.post.findFirst({
      where: { metaPostId: postMetaId, tenantId: tenant.id },
    })
    if (!post) return NextResponse.json({ error: "Post no encontrado" }, { status: 404 })

    // Upsert comment (avoid duplicates)
    const existing = await prisma.postComment.findUnique({ where: { metaCommentId: commentId } })
    if (!existing) {
      await prisma.postComment.create({
        data: {
          metaCommentId: commentId,
          username,
          text,
          postId: post.id,
          tenantId: tenant.id,
        },
      })
    }
    return NextResponse.json({ ok: true, synced: !existing })
  }

  // ── Direction 2: n8n calls us to send briefing to osw ──
  if (action === "send_briefing") {
    const { postId } = body
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { tenant: { include: { brandVoice: true } } },
    })
    if (!post) return NextResponse.json({ error: "Post no encontrado" }, { status: 404 })

    const oswUrl = process.env.OSW_API_URL   // e.g. https://osw.conectaai.cl/api
    const oswKey = process.env.OSW_API_KEY

    if (!oswUrl || !oswKey) {
      return NextResponse.json({
        ok: false,
        message: "OSW_API_URL y OSW_API_KEY no configuradas en .env",
      })
    }

    // Send briefing to OmniFlow so it can pre-load FAQ for this product/post
    const briefing = {
      event: "post_scheduled",
      scheduledAt: post.scheduledAt,
      postType: post.type,
      caption: post.caption,
      contentType: post.contentType,
      platforms: post.platform,
      brandName: post.tenant.name,
      industry: post.tenant.brandVoice?.industry ?? "",
      products: post.tenant.brandVoice?.products ?? [],
      tone: post.tenant.brandVoice?.tone ?? "profesional",
    }

    try {
      const res = await fetch(`${oswUrl}/integrations/social-briefing`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${oswKey}`,
        },
        body: JSON.stringify(briefing),
      })
      return NextResponse.json({ ok: res.ok, status: res.status })
    } catch (err: any) {
      return NextResponse.json({ ok: false, error: err.message })
    }
  }

  return NextResponse.json({ error: "action no válida" }, { status: 400 })
}

// ── GET: Return pending comments count for osw dashboard widget ──
export async function GET(req: NextRequest) {
  if (!authOk(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = req.nextUrl
  const tenantSlug = searchParams.get("tenant")
  if (!tenantSlug) return NextResponse.json({ error: "tenant param requerido" }, { status: 400 })

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } })
  if (!tenant) return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 })

  const [pending, total, recentPosts] = await Promise.all([
    prisma.postComment.count({ where: { tenantId: tenant.id, replied: false } }),
    prisma.postComment.count({ where: { tenantId: tenant.id } }),
    prisma.post.findMany({
      where: { tenantId: tenant.id, status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take: 5,
      select: { id: true, caption: true, type: true, reach: true, publishedAt: true, metaPostId: true },
    }),
  ])

  return NextResponse.json({ pending, total, recentPosts })
}

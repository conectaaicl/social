import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  const body    = await req.formData()
  const token   = body.get('token') as string
  const orderId = body.get('commerceOrder') as string
  const s       = body.get('s') as string

  if (!token || !orderId) return new NextResponse('ok') // always 200 to Flow

  // Find tenant by pending orderId (orderId = tenantId_prefix-timestamp:targetPlan)
  const tenantRecord = await prisma.tenant.findFirst({
    where: { subscriptionOrderId: { startsWith: orderId } },
    select: { id: true, subscriptionOrderId: true, flowApiKey: true, flowSecretKey: true },
  })
  if (!tenantRecord) return new NextResponse('ok')

  const flowApiKey    = tenantRecord.flowApiKey    || process.env.FLOW_API_KEY    || ''
  const flowSecretKey = tenantRecord.flowSecretKey || process.env.FLOW_SECRET_KEY || ''
  const flowBaseUrl   = process.env.FLOW_API_URL || 'https://www.flow.cl/api'

  // Verify payment with Flow
  const params: Record<string, string> = { apiKey: flowApiKey, token }
  const keys   = Object.keys(params).sort()
  const toSign = keys.map(k => k + params[k]).join('')
  const sign   = crypto.createHmac('sha256', flowSecretKey).update(toSign).digest('hex')
  params.s     = sign

  const qs  = new URLSearchParams(params)
  const res = await fetch(flowBaseUrl + '/payment/getStatus?' + qs)
  const data = await res.json()

  // status 2 = paid
  if (data.status !== 2) return new NextResponse('ok')

  // Extract targetPlan from saved orderId
  const parts      = (tenantRecord.subscriptionOrderId || '').split(':')
  const targetPlan = parts[1] || 'PRO'

  const expiresAt = new Date()
  expiresAt.setMonth(expiresAt.getMonth() + 1)

  await prisma.tenant.update({
    where: { id: tenantRecord.id },
    data: {
      plan: targetPlan as any,
      subscriptionExpiresAt: expiresAt,
      subscriptionOrderId: null,
    },
  })

  return new NextResponse('ok')
}

// GET for Flow sandbox redirects
export async function GET() { return new NextResponse('ok') }

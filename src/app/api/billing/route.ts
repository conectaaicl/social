import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

const PLANS = {
  BASIC:  { label: 'Basic',  price: 0,   description: 'Hasta 30 posts/mes, 1 usuario, sin IA avanzada' },
  PRO:    { label: 'Pro',    price: 49,  description: 'Posts ilimitados, IA completa, CRM, Video IA, A/B Tests' },
  AGENCY: { label: 'Agency', price: 199, description: 'Multi-cliente, Panel Agencia, Reportes IA, White-label' },
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { plan: true, subscriptionExpiresAt: true, subscriptionOrderId: true, name: true },
  })

  return NextResponse.json({
    currentPlan: tenant?.plan ?? 'BASIC',
    expiresAt: tenant?.subscriptionExpiresAt ?? null,
    plans: PLANS,
  })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { targetPlan } = await req.json()
  if (!['PRO', 'AGENCY'].includes(targetPlan)) return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
    select: { id: true, name: true, flowApiKey: true, flowSecretKey: true },
  })
  if (!tenant) return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 })

  const flowApiKey    = tenant.flowApiKey    || process.env.FLOW_API_KEY    || ''
  const flowSecretKey = tenant.flowSecretKey || process.env.FLOW_SECRET_KEY || ''
  const flowBaseUrl   = process.env.FLOW_API_URL || 'https://www.flow.cl/api'

  if (!flowApiKey || !flowSecretKey) {
    return NextResponse.json({ error: 'Flow API no configurada. Ve a Configuración → Integraciones → Flow.' }, { status: 503 })
  }

  const planInfo = PLANS[targetPlan as keyof typeof PLANS]
  const commerceOrder = tenant.id.slice(0, 8) + '-' + Date.now()
  const subject       = 'Plan ' + planInfo.label + ' - ' + tenant.name
  const amount        = planInfo.price * 1000 // Flow usa CLP entero
  const confirmUrl    = (process.env.NEXTAUTH_URL || 'https://social.conectaai.cl') + '/api/billing/confirm'
  const returnUrl     = (process.env.NEXTAUTH_URL || 'https://social.conectaai.cl') + '/dashboard/billing?result=ok'

  const params: Record<string, string> = {
    apiKey: flowApiKey,
    commerceOrder,
    subject,
    amount: String(amount),
    currency: 'CLP',
    email: session.user.email || '',
    urlConfirmation: confirmUrl,
    urlReturn: returnUrl,
  }

  // Sign params alphabetically
  const keys = Object.keys(params).sort()
  const toSign = keys.map(k => k + params[k]).join('')
  const sign = crypto.createHmac('sha256', flowSecretKey).update(toSign).digest('hex')
  params.s = sign

  const body = new URLSearchParams(params)
  const res  = await fetch(flowBaseUrl + '/payment/create', { method: 'POST', body })
  const data = await res.json()

  if (!res.ok || data.code) {
    return NextResponse.json({ error: data.message || 'Error en Flow' }, { status: 502 })
  }

  // Save orderId for confirmation
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { subscriptionOrderId: commerceOrder + ':' + targetPlan },
  })

  return NextResponse.json({ redirectUrl: data.url + '?token=' + data.token })
}

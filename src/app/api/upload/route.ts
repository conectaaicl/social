import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { uploadBufferToR2 } from '@/lib/r2'
import { randomUUID } from 'crypto'
import path from 'path'

const MAX_MB = 20
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4']

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const tenantId = session.user.tenantId

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  if (!ALLOWED.includes(file.type))
    return NextResponse.json({ error: 'Tipo no permitido' }, { status: 400 })

  if (file.size > MAX_MB * 1024 * 1024)
    return NextResponse.json({ error: 'Archivo muy grande (max ' + MAX_MB + 'MB)' }, { status: 400 })

  const ext  = path.extname(file.name) || (file.type === 'video/mp4' ? '.mp4' : '.jpg')
  const key  = 'uploads/' + tenantId + '/' + randomUUID() + ext
  const buf  = Buffer.from(await file.arrayBuffer())

  const url = await uploadBufferToR2(key, buf, file.type)
  return NextResponse.json({ url })
}

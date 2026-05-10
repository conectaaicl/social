import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { Readable } from 'stream'

const R2 = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!,
  credentials: {
    accessKeyId:     process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
})

const BUCKET      = process.env.CLOUDFLARE_R2_BUCKET!
const PUBLIC_URL  = (process.env.CLOUDFLARE_R2_PUBLIC_URL || '').replace(/\/$/, '')

export async function uploadToR2(
  key: string,
  body: Buffer | Readable | ReadableStream,
  contentType: string
): Promise<string> {
  const upload = new Upload({
    client: R2,
    params: {
      Bucket:      BUCKET,
      Key:         key,
      Body:        body,
      ContentType: contentType,
    },
  })
  await upload.done()
  return PUBLIC_URL + '/' + key
}

export async function uploadBufferToR2(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  return uploadToR2(key, buffer, contentType)
}

export async function deleteFromR2(key: string): Promise<void> {
  await R2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}

export function keyFromUrl(url: string): string | null {
  if (!url.startsWith(PUBLIC_URL)) return null
  return url.slice(PUBLIC_URL.length + 1)
}

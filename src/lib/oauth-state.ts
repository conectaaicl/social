import { createHmac, timingSafeEqual } from "crypto"

function signState(payload: string): string {
  const secret = process.env.NEXTAUTH_SECRET ?? "fallback-change-me"
  return createHmac("sha256", secret).update(payload).digest("base64url")
}

export function createOAuthState(tenantId: string, userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ tenantId, userId, ts: Date.now() })
  ).toString("base64url")
  return payload + "." + signState(payload)
}

export function verifyOAuthState(stateRaw: string): { tenantId: string; userId: string } {
  const dotIdx = stateRaw.lastIndexOf(".")
  if (dotIdx === -1) throw new Error("invalid_state")
  const payloadB64 = stateRaw.slice(0, dotIdx)
  const sig = stateRaw.slice(dotIdx + 1)
  const expectedSig = signState(payloadB64)
  const sigBuf = Buffer.from(sig)
  const expBuf = Buffer.from(expectedSig)
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    throw new Error("invalid_state_signature")
  }
  const parsed = JSON.parse(Buffer.from(payloadB64, "base64url").toString())
  if (!parsed.tenantId) throw new Error("no_tenantId")
  if (Date.now() - parsed.ts > 15 * 60 * 1000) throw new Error("state_expired")
  return { tenantId: parsed.tenantId, userId: parsed.userId }
}

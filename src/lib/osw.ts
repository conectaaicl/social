/**
 * OmniFlow (osw.conectaai.cl) API client
 * Auth: form-urlencoded login → JWT Bearer token (cached in memory)
 */

const OSW_URL = process.env.OSW_API_URL || 'https://osw.conectaai.cl/api/v1'

let _token: string | null = null
let _tokenExpiry = 0

export async function getOswToken(): Promise<string> {
  if (_token && Date.now() < _tokenExpiry) return _token

  const res = await fetch(OSW_URL + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      username: process.env.OSW_EMAIL || '',
      password: process.env.OSW_PASSWORD || '',
    }),
  })
  if (!res.ok) throw new Error('OmniFlow login failed: ' + res.status)
  const data = await res.json()
  _token = data.access_token
  _tokenExpiry = Date.now() + 20 * 60 * 1000 // 20 min
  return _token!
}

async function oswFetch(path: string, opts: RequestInit = {}) {
  const token = await getOswToken()
  const res = await fetch(OSW_URL + path, {
    ...opts,
    redirect: 'manual',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token,
      ...(opts.headers || {}),
    },
  })
  // Follow 307/308 redirects while preserving Authorization header
  if (res.status === 307 || res.status === 308) {
    const location = res.headers.get('location')
    if (location) {
      return fetch(location, {
        ...opts,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
          ...(opts.headers || {}),
        },
      })
    }
  }
  return res
}

// ── Contacts ─────────────────────────────────────────────────────────────────

export interface OswContact {
  id: number
  name: string
  phone: string | null
  email: string | null
  source: string
  lead_score: number
  intent: string | null
  last_interaction: string | null
  tags: string[]
}

export async function getOswContacts(limit = 100): Promise<OswContact[]> {
  const res = await oswFetch('/crm/contacts?limit=' + limit)
  if (!res.ok) return []
  const data = await res.json()
  return data.contacts || data || []
}

export async function findOswContactByPhone(phone: string): Promise<OswContact | null> {
  const contacts = await getOswContacts(200)
  const normalized = phone.replace(/\D/g, '')
  return contacts.find(c => c.phone && c.phone.replace(/\D/g, '') === normalized) || null
}

export async function updateOswContact(
  id: number,
  data: { lead_score?: number; tags?: string[]; name?: string }
): Promise<boolean> {
  const res = await oswFetch('/crm/contacts/' + id, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
  return res.ok
}

// ── Conversations ─────────────────────────────────────────────────────────────

export interface OswConversation {
  id: number
  channel: string
  status: string
  last_message: string
  updated_at: string
  bot_active: boolean
  contact: OswContact
}

export async function getOswConversations(limit = 50): Promise<OswConversation[]> {
  const res = await oswFetch('/conversations/?limit=' + limit)
  if (!res.ok) return []
  const data = await res.json()
  return data.items || data || []
}

export async function getConversationsByPhone(phone: string): Promise<OswConversation[]> {
  const all = await getOswConversations(200)
  const normalized = phone.replace(/\D/g, '')
  return all.filter(c => c.contact?.phone && c.contact.phone.replace(/\D/g, '') === normalized)
}

export async function getConversationMessages(convId: number) {
  const res = await oswFetch('/conversations/' + convId + '/messages')
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

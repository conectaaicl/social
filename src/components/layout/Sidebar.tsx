"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { LogOut, Menu, X } from "lucide-react"

// ── Icons ─────────────────────────────────────────────────────────────────────
function Ico({ d, fill, stroke, viewBox = "0 0 24 24", size = 15 }: { d?: string; fill?: string; stroke?: string; viewBox?: string; size?: number; children?: React.ReactNode }) {
  return null // placeholder, using inline SVGs below
}

function IcoDashboard({ s = 15 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="8" height="8" rx="2" fill="#6366f1"/><rect x="13" y="3" width="8" height="8" rx="2" fill="#8b5cf6"/><rect x="3" y="13" width="8" height="8" rx="2" fill="#a78bfa"/><rect x="13" y="13" width="8" height="8" rx="2" fill="#c4b5fd"/></svg>
}
function IcoStats({ s = 15 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="3" y="14" width="4" height="7" rx="1.5" fill="#22c55e"/><rect x="10" y="9" width="4" height="12" rx="1.5" fill="#16a34a"/><rect x="17" y="4" width="4" height="17" rx="1.5" fill="#4ade80"/><polyline points="5,14 12,9 19,4" stroke="#86efac" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
}
function IcoCalendar({ s = 15 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="17" rx="3" fill="#0ea5e9" fillOpacity="0.2" stroke="#0ea5e9" strokeWidth="1.5"/><rect x="3" y="4" width="18" height="6" rx="3" fill="#0ea5e9"/><line x1="8" y1="2" x2="8" y2="6" stroke="#7dd3fc" strokeWidth="1.5" strokeLinecap="round"/><line x1="16" y1="2" x2="16" y2="6" stroke="#7dd3fc" strokeWidth="1.5" strokeLinecap="round"/><circle cx="8" cy="15" r="1.5" fill="#38bdf8"/><circle cx="12" cy="15" r="1.5" fill="#38bdf8"/><circle cx="16" cy="15" r="1.5" fill="#38bdf8"/></svg>
}
function IcoPosts({ s = 15 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="4" fill="url(#pg)"/><defs><linearGradient id="pg" x1="3" y1="21" x2="21" y2="3"><stop offset="0%" stopColor="#f59e0b"/><stop offset="50%" stopColor="#ec4899"/><stop offset="100%" stopColor="#8b5cf6"/></linearGradient></defs><rect x="7" y="7" width="10" height="10" rx="2" stroke="white" strokeWidth="1.5" fill="none"/><circle cx="12" cy="12" r="2.5" stroke="white" strokeWidth="1.5" fill="none"/><circle cx="16" cy="8" r="1" fill="white"/></svg>
}
function IcoApproval({ s = 15 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="4" fill="#f97316" fillOpacity="0.15" stroke="#f97316" strokeWidth="1.5"/><path d="M8 12l3 3 5-6" stroke="#fb923c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
}
function IcoMonitor({ s = 15 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" fill="#8b5cf6" fillOpacity="0.15" stroke="#8b5cf6" strokeWidth="1.5"/><circle cx="12" cy="12" r="1.5" fill="#a78bfa"/><line x1="12" y1="3" x2="12" y2="6" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round"/><line x1="12" y1="18" x2="12" y2="21" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round"/><line x1="3" y1="12" x2="6" y2="12" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round"/><line x1="18" y1="12" x2="21" y2="12" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round"/></svg>
}
function IcoBulk({ s = 15 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="2" fill="#f59e0b" fillOpacity="0.3" stroke="#f59e0b" strokeWidth="1.5"/><rect x="14" y="3" width="7" height="7" rx="2" fill="#fbbf24" fillOpacity="0.3" stroke="#fbbf24" strokeWidth="1.5"/><rect x="3" y="14" width="7" height="7" rx="2" fill="#fcd34d" fillOpacity="0.3" stroke="#fcd34d" strokeWidth="1.5"/><rect x="14" y="14" width="7" height="7" rx="2" fill="#fde68a" fillOpacity="0.3" stroke="#fbbf24" strokeWidth="1.5"/></svg>
}
function IcoAnalytics({ s = 15 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="3" y="14" width="4" height="7" rx="1.5" fill="#22c55e"/><rect x="10" y="9" width="4" height="12" rx="1.5" fill="#16a34a"/><rect x="17" y="4" width="4" height="17" rx="1.5" fill="#4ade80"/><polyline points="5,14 12,9 19,4" stroke="#86efac" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
}
function IcoHours({ s = 15 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#34d399" strokeWidth="1.5" fill="#10b981" fillOpacity="0.1"/><path d="M12 7v5l3 3" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round"/></svg>
}
function IcoInsights({ s = 15 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="10" r="6" fill="#fbbf24" fillOpacity="0.15" stroke="#fbbf24" strokeWidth="1.5"/><path d="M9.5 10a2.5 2.5 0 0 1 5 0c0 1.5-1 2.5-2 3v1" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round"/><path d="M10 17h4" stroke="#fde68a" strokeWidth="1.5" strokeLinecap="round"/><path d="M11 19h2" stroke="#fde68a" strokeWidth="1.5" strokeLinecap="round"/></svg>
}
function IcoComments({ s = 15 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="#f97316" fillOpacity="0.2" stroke="#f97316" strokeWidth="1.5" strokeLinejoin="round"/><circle cx="9" cy="10" r="1" fill="#fb923c"/><circle cx="12" cy="10" r="1" fill="#fb923c"/><circle cx="15" cy="10" r="1" fill="#fb923c"/></svg>
}
function IcoInbox({ s = 15 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="15" rx="3" fill="#3b82f6" fillOpacity="0.15" stroke="#3b82f6" strokeWidth="1.5"/><path d="M3 10h4l2 3h6l2-3h4" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
}
function IcoLeads({ s = 15 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" fill="#25d366" fillOpacity="0.2" stroke="#25d366" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="12" r="1" fill="#4ade80"/><circle cx="12" cy="12" r="1" fill="#4ade80"/><circle cx="15" cy="12" r="1" fill="#4ade80"/></svg>
}
function IcoRadar({ s = 15 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#a78bfa" strokeWidth="1.5" strokeOpacity="0.3"/><circle cx="12" cy="12" r="5" stroke="#a78bfa" strokeWidth="1.5" strokeOpacity="0.5"/><circle cx="12" cy="12" r="1.5" fill="#a78bfa"/><line x1="12" y1="3" x2="12" y2="12" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round"/><line x1="12" y1="12" x2="18.5" y2="8" stroke="#a78bfa" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.5"/><circle cx="17" cy="7" r="1.5" fill="#ef4444" fillOpacity="0.9"/></svg>
}
function IcoABTest({ s = 15 }: { s?: number }) {
  return <svg width={s} height={s} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#a78bfa"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 1-6.23-.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"/></svg>
}
function IcoVideo({ s = 15 }: { s?: number }) {
  return <svg width={s} height={s} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#c084fc"><path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0 1 18 18.375M3.375 5.625c0-.621.504-1.125 1.125-1.125h15c.621 0 1.125.504 1.125 1.125m-17.25 0h1.5m-1.5 0v1.5m17.25-1.5v1.5m0-1.5h-1.5m-15 0h13.5"/></svg>
}
function IcoBrand({ s = 15 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" fill="#ec4899" fillOpacity="0.1" stroke="#ec4899" strokeWidth="1.5"/><circle cx="12" cy="12" r="4" fill="#ec4899" fillOpacity="0.3"/><circle cx="12" cy="12" r="1.5" fill="#f472b6"/></svg>
}
function IcoAccounts({ s = 15 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><defs><linearGradient id="acc-g" x1="3" y1="21" x2="21" y2="3"><stop offset="0%" stopColor="#f59e0b"/><stop offset="50%" stopColor="#ec4899"/><stop offset="100%" stopColor="#8b5cf6"/></linearGradient></defs><rect x="3" y="3" width="18" height="18" rx="5" fill="url(#acc-g)"/><circle cx="12" cy="10" r="3" stroke="white" strokeWidth="1.5" fill="none"/><path d="M6 19c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none"/></svg>
}
function IcoMedia({ s = 15 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="3" fill="#14b8a6" fillOpacity="0.15" stroke="#14b8a6" strokeWidth="1.5"/><rect x="6" y="6" width="5" height="5" rx="1.5" fill="#14b8a6"/><rect x="13" y="6" width="5" height="5" rx="1.5" fill="#2dd4bf"/><rect x="6" y="13" width="5" height="5" rx="1.5" fill="#5eead4"/><rect x="13" y="13" width="5" height="5" rx="1.5" fill="#99f6e4"/></svg>
}
function IcoLink({ s = 15 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><rect x="6" y="2" width="12" height="20" rx="3" fill="#10b981" fillOpacity="0.15" stroke="#10b981" strokeWidth="1.5"/><rect x="9" y="10" width="6" height="2.5" rx="1.25" fill="#10b981" fillOpacity="0.5" stroke="#10b981" strokeWidth="1"/><rect x="9" y="14" width="6" height="2.5" rx="1.25" fill="#10b981" fillOpacity="0.5" stroke="#10b981" strokeWidth="1"/></svg>
}
function IcoPilot({ s = 15 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" fill="#7c3aed" fillOpacity="0.15" stroke="#7c3aed" strokeWidth="1.5"/><circle cx="12" cy="12" r="4" fill="#7c3aed" fillOpacity="0.3"/><circle cx="12" cy="12" r="1.5" fill="#a78bfa"/><line x1="12" y1="3" x2="12" y2="6" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round"/><line x1="12" y1="18" x2="12" y2="21" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round"/><line x1="3" y1="12" x2="6" y2="12" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round"/><line x1="18" y1="12" x2="21" y2="12" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round"/></svg>
}
function IcoAffiliates({ s = 15 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><circle cx="8" cy="8" r="3" fill="#10b981" fillOpacity="0.3" stroke="#10b981" strokeWidth="1.5"/><circle cx="16" cy="8" r="3" fill="#34d399" fillOpacity="0.3" stroke="#34d399" strokeWidth="1.5"/><circle cx="12" cy="16" r="3" fill="#6ee7b7" fillOpacity="0.3" stroke="#10b981" strokeWidth="1.5"/></svg>
}
function IcoAds({ s = 15 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5z" fill="#4285f4"/><path d="M2 17l10 5 10-5" stroke="#34a853" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/><path d="M2 12l10 5 10-5" stroke="#fbbc04" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
}
function IcoAgency({ s = 15 }: { s?: number }) {
  return <svg width={s} height={s} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#94a3b8"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"/></svg>
}
function IcoBilling({ s = 15 }: { s?: number }) {
  return <svg width={s} height={s} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#64748b"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z"/></svg>
}
function IcoSettings({ s = 15 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" fill="#64748b"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="#475569" strokeWidth="1.5" fill="none"/></svg>
}
function IcoAdmin({ s = 15 }: { s?: number }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" fill="#f59e0b" stroke="#d97706" strokeWidth="1" strokeLinejoin="round"/></svg>
}

// ── Nav groups ────────────────────────────────────────────────────────────────
type NavItem = { href: string; label: string; Icon: React.FC<{ s?: number }>; badge?: "ia" | "live" | "new" }
type NavGroup = { label: string; items: NavItem[] }

const GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", Icon: IcoDashboard },
      { href: "/dashboard/stats", label: "Estadísticas", Icon: IcoStats },
    ]
  },
  {
    label: "Contenido",
    items: [
      { href: "/dashboard/calendar", label: "Calendario", Icon: IcoCalendar },
      { href: "/dashboard/posts", label: "Posts", Icon: IcoPosts },
      { href: "/dashboard/aprobaciones", label: "Aprobaciones", Icon: IcoApproval },
      { href: "/dashboard/monitor", label: "Monitor Posts", Icon: IcoMonitor, badge: "live" },
      { href: "/dashboard/bulk", label: "Bulk Scheduler", Icon: IcoBulk },
    ]
  },
  {
    label: "Analítica",
    items: [
      { href: "/dashboard/analytics", label: "Analytics", Icon: IcoAnalytics },
      { href: "/dashboard/analytics/hours", label: "Horario Óptimo", Icon: IcoHours },
      { href: "/dashboard/insights", label: "Insights IA", Icon: IcoInsights, badge: "ia" },
    ]
  },
  {
    label: "Comunidad",
    items: [
      { href: "/dashboard/comments", label: "Comentarios", Icon: IcoComments },
      { href: "/dashboard/inbox", label: "Inbox Unificado", Icon: IcoInbox },
      { href: "/dashboard/leads", label: "CRM WhatsApp", Icon: IcoLeads },
    ]
  },
  {
    label: "Crecimiento",
    items: [
      { href: "/dashboard/radar", label: "Radar Competencia", Icon: IcoRadar, badge: "ia" },
      { href: "/dashboard/radar/recreations", label: "Mis Recreaciones", Icon: IcoRadar },
      { href: "/dashboard/hashtags", label: "Hashtag Monitor", Icon: IcoRadar },
      { href: "/dashboard/abtests", label: "A/B Tests", Icon: IcoABTest },
      { href: "/dashboard/videos", label: "Video IA", Icon: IcoVideo, badge: "ia" },
    ]
  },
  {
    label: "Marca & Cuentas",
    items: [
      { href: "/dashboard/brand", label: "Mi Marca", Icon: IcoBrand },
      { href: "/dashboard/accounts", label: "Cuentas", Icon: IcoAccounts },
      { href: "/dashboard/media", label: "Media Library", Icon: IcoMedia },
      { href: "/dashboard/linkinbio", label: "Link in Bio", Icon: IcoLink },
    ]
  },
  {
    label: "IA & Automatización",
    items: [
      { href: "/dashboard/autopilot", label: "Piloto Automático", Icon: IcoPilot, badge: "ia" },
      { href: "/dashboard/affiliates", label: "Afiliados", Icon: IcoAffiliates },
    ]
  },
  {
    label: "Negocio",
    items: [
      { href: "/dashboard/ads", label: "Google Ads", Icon: IcoAds },
      { href: "/dashboard/agency", label: "Agencia", Icon: IcoAgency },
      { href: "/dashboard/billing", label: "Plan & Billing", Icon: IcoBilling },
    ]
  },
  {
    label: "Sistema",
    items: [
      { href: "/dashboard/settings", label: "Configuración", Icon: IcoSettings },
    ]
  }
]

const ADMIN_ITEM: NavItem = { href: "/dashboard/admin", label: "Superadmin", Icon: IcoAdmin }

const MOBILE_NAV: NavItem[] = [
  { href: "/dashboard", label: "Inicio", Icon: IcoDashboard },
  { href: "/dashboard/posts", label: "Posts", Icon: IcoPosts },
  { href: "/dashboard/calendar", label: "Calendario", Icon: IcoCalendar },
  { href: "/dashboard/monitor", label: "Monitor", Icon: IcoMonitor },
  { href: "/dashboard/analytics", label: "Analytics", Icon: IcoAnalytics },
]

// ── Badge component ───────────────────────────────────────────────────────────
function Badge({ type }: { type: "ia" | "live" | "new" }) {
  if (type === "ia") return (
    <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "rgba(167,139,250,0.15)", color: "#c4b5fd", border: "1px solid rgba(167,139,250,0.2)", fontWeight: 700, letterSpacing: "0.04em", lineHeight: 1.4 }}>IA</span>
  )
  if (type === "live") return (
    <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "rgba(34,197,94,0.12)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.2)", fontWeight: 700, letterSpacing: "0.04em", lineHeight: 1.4, display: "flex", alignItems: "center", gap: 3 }}>
      <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 4px #22c55e", display: "inline-block" }} />
      LIVE
    </span>
  )
  return (
    <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "rgba(6,182,212,0.12)", color: "#67e8f9", border: "1px solid rgba(6,182,212,0.2)", fontWeight: 700, letterSpacing: "0.04em", lineHeight: 1.4 }}>NEW</span>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface SidebarProps {
  user: { name?: string | null; email?: string | null; role?: string | null }
  tenantName?: string
  tenantLogo?: string
}

export default function Sidebar({ user, tenantName, tenantLogo }: SidebarProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => {
      const el = document.getElementById("mob-sidebar")
      if (el && !el.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [open])

  const groups = [...GROUPS, ...(user.role === "SUPERADMIN" ? [{ label: "", items: [ADMIN_ITEM] }] : [])]

  function NavLink({ item }: { item: NavItem }) {
    const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
    return (
      <Link href={item.href} style={{
        display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8,
        fontSize: 13, textDecoration: "none", transition: "all 0.15s",
        color: active ? "#c4b5fd" : "#64748b",
        background: active ? "rgba(124,58,237,0.1)" : "transparent",
        borderLeft: active ? "2px solid rgba(124,58,237,0.6)" : "2px solid transparent",
        marginLeft: active ? 0 : 0,
        fontWeight: active ? 500 : 400,
      }}
        className={active ? "" : "sidebar-link-hover"}
      >
        <item.Icon s={14} />
        <span style={{ flex: 1, lineHeight: 1 }}>{item.label}</span>
        {item.badge && <Badge type={item.badge} />}
      </Link>
    )
  }

  const SidebarContent = () => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* ── Logo header ── */}
      <div style={{ padding: "18px 16px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {tenantLogo ? (
            <img src={tenantLogo} alt="" style={{ width: 32, height: 32, borderRadius: 8, objectFit: "contain", background: "white" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
          ) : (
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none"><path d="M13 3L4 14h8l-1 7 9-11h-8z" fill="white"/></svg>
            </div>
          )}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", lineHeight: 1.2 }}>{tenantName ?? "ConectaAI"}</div>
            <div style={{ fontSize: 10, background: "linear-gradient(90deg,#a78bfa,#60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: 700, letterSpacing: "0.06em" }}>SOCIAL IA</div>
          </div>
        </div>
        <button onClick={() => setOpen(false)} style={{ display: "none" }} className="mob-close" aria-label="Cerrar">
          <X size={18} color="#64748b" />
        </button>
      </div>

      {/* ── Nav ── */}
      <nav style={{ flex: 1, padding: "8px 8px", overflowY: "auto", overflowX: "hidden" }}>
        {groups.map((group, gi) => (
          <div key={gi} style={{ marginBottom: 4 }}>
            {group.label && (
              <div style={{ fontSize: 10, fontWeight: 700, color: "#334155", letterSpacing: "0.1em", textTransform: "uppercase", padding: "10px 10px 4px" }}>{group.label}</div>
            )}
            {group.items.map(item => <NavLink key={item.href} item={item} />)}
          </div>
        ))}
      </nav>

      {/* ── User ── */}
      <div style={{ padding: "10px 8px 12px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", marginBottom: 4 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "white", flexShrink: 0 }}>
            {user.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</div>
            <div style={{ fontSize: 10, color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</div>
          </div>
        </div>
        <button onClick={() => signOut({ callbackUrl: "/auth/login" })} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, fontSize: 12, color: "#475569", background: "transparent", border: "none", cursor: "pointer", width: "100%", transition: "all 0.15s" }} className="sidebar-logout-btn">
          <LogOut size={13} />
          Cerrar sesión
        </button>
      </div>
    </div>
  )

  return (
    <>
      <style>{`
        .sidebar-link-hover:hover { background: rgba(255,255,255,0.04) !important; color: #94a3b8 !important; }
        .sidebar-logout-btn:hover { background: rgba(239,68,68,0.08) !important; color: #f87171 !important; }
        @media (max-width: 767px) { .mob-close { display: flex !important; } }
      `}</style>

      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex" style={{ width: 220, background: "#070b12", borderRight: "1px solid rgba(255,255,255,0.05)", flexDirection: "column", height: "100%", flexShrink: 0 }}>
        <SidebarContent />
      </aside>

      {/* ── Mobile: top bar ── */}
      <div className="md:hidden" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 40, background: "#070b12", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none"><path d="M13 3L4 14h8l-1 7 9-11h-8z" fill="white"/></svg>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>{tenantName ?? "ConectaAI"}</span>
        </div>
        <button onClick={() => setOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
          <Menu size={20} color="#64748b" />
        </button>
      </div>

      {/* ── Mobile: slide sidebar ── */}
      {open && (
        <div className="md:hidden" style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} onClick={() => setOpen(false)} />
          <aside id="mob-sidebar" style={{ position: "relative", zIndex: 10, width: 240, background: "#070b12", height: "100%" }}>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* ── Mobile: bottom nav ── */}
      <nav className="md:hidden" style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40, background: "#070b12", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "space-around", padding: "6px 8px", paddingBottom: "max(6px,env(safe-area-inset-bottom))" }}>
        {MOBILE_NAV.map(item => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "6px 10px", borderRadius: 8, textDecoration: "none", color: active ? "#a78bfa" : "#475569", transition: "color 0.15s" }}>
              <item.Icon s={20} />
              <span style={{ fontSize: 9, fontWeight: 500 }}>{item.label}</span>
            </Link>
          )
        })}
        <button onClick={() => setOpen(true)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "6px 10px", borderRadius: 8, background: "none", border: "none", cursor: "pointer", color: "#475569" }}>
          <Menu size={20} />
          <span style={{ fontSize: 9, fontWeight: 500 }}>Más</span>
        </button>
      </nav>
    </>
  )
}

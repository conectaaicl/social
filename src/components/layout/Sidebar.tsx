"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { LogOut, Menu, X, Zap } from "lucide-react"
import { clsx } from "clsx"

// ── Colorful SVG icons for each nav item ─────────────────────────────────────

function IconDashboard({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="8" height="8" rx="2" fill="#6366f1" />
      <rect x="13" y="3" width="8" height="8" rx="2" fill="#8b5cf6" />
      <rect x="3" y="13" width="8" height="8" rx="2" fill="#a78bfa" />
      <rect x="13" y="13" width="8" height="8" rx="2" fill="#c4b5fd" />
    </svg>
  )
}

function IconCalendar({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="17" rx="3" fill="#0ea5e9" fillOpacity="0.2" stroke="#0ea5e9" strokeWidth="1.5" />
      <rect x="3" y="4" width="18" height="6" rx="3" fill="#0ea5e9" />
      <line x1="8" y1="2" x2="8" y2="6" stroke="#7dd3fc" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="2" x2="16" y2="6" stroke="#7dd3fc" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="15" r="1.5" fill="#38bdf8" />
      <circle cx="12" cy="15" r="1.5" fill="#38bdf8" />
      <circle cx="16" cy="15" r="1.5" fill="#38bdf8" />
    </svg>
  )
}

function IconPosts({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="4" fill="url(#ig-grad)" />
      <defs>
        <linearGradient id="ig-grad" x1="3" y1="21" x2="21" y2="3">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="50%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect x="7" y="7" width="10" height="10" rx="2" stroke="white" strokeWidth="1.5" fill="none" />
      <circle cx="12" cy="12" r="2.5" stroke="white" strokeWidth="1.5" fill="none" />
      <circle cx="16" cy="8" r="1" fill="white" />
    </svg>
  )
}

function IconAnalytics({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="14" width="4" height="7" rx="1.5" fill="#22c55e" />
      <rect x="10" y="9" width="4" height="12" rx="1.5" fill="#16a34a" />
      <rect x="17" y="4" width="4" height="17" rx="1.5" fill="#4ade80" />
      <polyline points="5,14 12,9 19,4" stroke="#86efac" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconInsights({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="10" r="6" fill="#fbbf24" fillOpacity="0.2" stroke="#fbbf24" strokeWidth="1.5" />
      <path d="M9.5 10a2.5 2.5 0 0 1 5 0c0 1.5-1 2.5-2 3v1" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="10" r="1" fill="#fbbf24" />
      <path d="M10 17h4" stroke="#fde68a" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M11 19h2" stroke="#fde68a" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconComments({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="#f97316" fillOpacity="0.2" stroke="#f97316" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="9" cy="10" r="1" fill="#fb923c" />
      <circle cx="12" cy="10" r="1" fill="#fb923c" />
      <circle cx="15" cy="10" r="1" fill="#fb923c" />
    </svg>
  )
}

function IconMedia({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="3" fill="#14b8a6" fillOpacity="0.2" stroke="#14b8a6" strokeWidth="1.5" />
      <rect x="6" y="6" width="5" height="5" rx="1.5" fill="#14b8a6" />
      <rect x="13" y="6" width="5" height="5" rx="1.5" fill="#2dd4bf" />
      <rect x="6" y="13" width="5" height="5" rx="1.5" fill="#5eead4" />
      <rect x="13" y="13" width="5" height="5" rx="1.5" fill="#99f6e4" />
    </svg>
  )
}

function IconAccounts({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="ig-acc" x1="3" y1="21" x2="21" y2="3">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="50%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="18" height="18" rx="5" fill="url(#ig-acc)" />
      <circle cx="12" cy="10" r="3" stroke="white" strokeWidth="1.5" fill="none" />
      <path d="M6 19c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  )
}

function IconBrand({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" fill="#ec4899" fillOpacity="0.15" stroke="#ec4899" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="4" fill="#ec4899" fillOpacity="0.4" />
      <circle cx="12" cy="12" r="1.5" fill="#f472b6" />
      <circle cx="12" cy="4" r="1.5" fill="#fb7185" />
      <circle cx="20" cy="12" r="1.5" fill="#fb7185" />
      <circle cx="12" cy="20" r="1.5" fill="#fb7185" />
      <circle cx="4" cy="12" r="1.5" fill="#fb7185" />
    </svg>
  )
}

function IconAds({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2L2 7l10 5 10-5-10-5z" fill="#4285f4" />
      <path d="M2 17l10 5 10-5" stroke="#34a853" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M2 12l10 5 10-5" stroke="#fbbc04" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

function IconSettings({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3" fill="#94a3b8" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="#64748b" strokeWidth="1.5" fill="none" />
    </svg>
  )
}

function IconAdmin({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" fill="#f59e0b" stroke="#d97706" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  )
}
function IconAffiliates({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="8" cy="8" r="3" fill="#10b981" fillOpacity="0.3" stroke="#10b981" strokeWidth="1.5" />
      <circle cx="16" cy="8" r="3" fill="#34d399" fillOpacity="0.3" stroke="#34d399" strokeWidth="1.5" />
      <circle cx="12" cy="16" r="3" fill="#6ee7b7" fillOpacity="0.3" stroke="#10b981" strokeWidth="1.5" />
      <line x1="10.5" y1="10.5" x2="13.5" y2="13.5" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="13.5" y1="10.5" x2="10.5" y2="13.5" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}


// ── Nav items with custom icon components ─────────────────────────────────────
const navItems = [
  { href: "/dashboard",           label: "Dashboard",     Icon: IconDashboard },
  { href: "/dashboard/calendar",  label: "Calendario",    Icon: IconCalendar },
  { href: "/dashboard/posts",     label: "Posts",         Icon: IconPosts },
  { href: "/dashboard/analytics", label: "Analytics",     Icon: IconAnalytics },
  { href: "/dashboard/insights",  label: "Insights IA",   Icon: IconInsights },
  { href: "/dashboard/comments",  label: "Comentarios",   Icon: IconComments },
  { href: "/dashboard/media",     label: "Media",         Icon: IconMedia },
  { href: "/dashboard/accounts",  label: "Cuentas",       Icon: IconAccounts },
  { href: "/dashboard/brand",     label: "Mi Marca",      Icon: IconBrand },
  { href: "/dashboard/ads",       label: "Google Ads",    Icon: IconAds },
  { href: "/dashboard/affiliates", label: "Afiliados",     Icon: IconAffiliates },
  { href: "/dashboard/settings",  label: "Configuración", Icon: IconSettings },
]

const adminItem = { href: "/dashboard/admin", label: "Superadmin", Icon: IconAdmin }

const mobileBottomNav = [
  { href: "/dashboard",           label: "Inicio",      Icon: IconDashboard },
  { href: "/dashboard/posts",     label: "Posts",       Icon: IconPosts },
  { href: "/dashboard/calendar",  label: "Calendario",  Icon: IconCalendar },
  { href: "/dashboard/comments",  label: "Comentarios", Icon: IconComments },
  { href: "/dashboard/analytics", label: "Analytics",   Icon: IconAnalytics },
]

interface SidebarProps {
  user: {
    name?: string | null
    email?: string | null
    role?: string | null
  }
  tenantName?: string
  tenantLogo?: string
}

export default function Sidebar({ user, tenantName, tenantLogo }: SidebarProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => { setOpen(false) }, [pathname])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const sidebar = document.getElementById("mobile-sidebar")
      if (sidebar && !sidebar.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const allItems = [...navItems, ...(user.role === "SUPERADMIN" ? [adminItem] : [])]

  function NavLink({ item }: { item: typeof navItems[0] }) {
    const active = pathname === item.href ||
      (item.href !== "/dashboard" && pathname.startsWith(item.href))
    return (
      <Link
        href={item.href}
        className={clsx(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors duration-150",
          active
            ? "bg-indigo-600/20 text-indigo-200 border border-indigo-500/20"
            : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
        )}
      >
        <item.Icon size={16} />
        {item.label}
      </Link>
    )
  }

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="p-5 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {tenantLogo ? (
            <img
              src={tenantLogo}
              alt={tenantName ?? "Logo"}
              className="w-8 h-8 rounded-lg object-contain bg-white shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
            />
          ) : (
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-white" />
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-gray-100">{tenantName ?? "ConectaAI"}</p>
            <p className="text-xs text-indigo-400 font-medium">Social</p>
          </div>
        </div>
        <button onClick={() => setOpen(false)} className="md:hidden text-gray-500 hover:text-gray-300 p-1">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {allItems.map((item) => <NavLink key={item.href} item={item} />)}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-gray-800">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0">
            {user.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-gray-200 font-medium truncate">{user.name}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/auth/login" })}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors w-full"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* ── DESKTOP sidebar ─────────────────────────────────── */}
      <aside className="hidden md:flex w-60 bg-gray-900 border-r border-gray-800 flex-col h-full shrink-0">
        {sidebarContent}
      </aside>

      {/* ── MOBILE: top bar ─────────────────────────────────── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          {tenantLogo ? (
            <img src={tenantLogo} alt={tenantName ?? "Logo"} className="w-7 h-7 rounded-lg object-contain bg-white shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
          ) : (
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
          )}
          <span className="text-sm font-semibold text-gray-100">{tenantName ?? "ConectaAI"} Social</span>
        </div>
        <button onClick={() => setOpen(true)} className="text-gray-400 hover:text-gray-200 p-1">
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* ── MOBILE: slide-over sidebar ──────────────────────── */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside id="mobile-sidebar" className="relative z-10 w-72 bg-gray-900 flex flex-col h-full shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* ── MOBILE: bottom nav ──────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-gray-900 border-t border-gray-800 flex items-center justify-around px-2 py-1 safe-bottom">
        {mobileBottomNav.map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href} className={clsx("flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors min-w-0", active ? "text-indigo-400" : "text-gray-500 hover:text-gray-300")}>
              <item.Icon size={20} />
              <span className="text-[10px] font-medium truncate">{item.label}</span>
            </Link>
          )
        })}
        <button onClick={() => setOpen(true)} className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg text-gray-500 hover:text-gray-300 transition-colors">
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-medium">Más</span>
        </button>
      </nav>
    </>
  )
}

"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  LayoutDashboard, Calendar, Image, Settings, LogOut,
  Instagram, Palette, BarChart3, Zap, FileImage,
  Lightbulb, MessageCircle, Crown, Megaphone, Menu, X,
  Kanban, FileText,
} from "lucide-react"
import { clsx } from "clsx"

const navItems = [
  { href: "/dashboard",            label: "Dashboard",     icon: LayoutDashboard },
  { href: "/dashboard/posts",      label: "Posts",         icon: Image },
  { href: "/dashboard/pipeline",   label: "Pipeline",      icon: Kanban },
  { href: "/dashboard/calendar",   label: "Calendario",    icon: Calendar },
  { href: "/dashboard/analytics",  label: "Analytics",     icon: BarChart3 },
  { href: "/dashboard/insights",   label: "Insights IA",   icon: Lightbulb },
  { href: "/dashboard/transcripts",label: "Transcripciones", icon: FileText },
  { href: "/dashboard/dm-insights", label: "Mineria de DMs", icon: MessageCircle },
  { href: "/dashboard/comments",   label: "Comentarios",   icon: MessageCircle },
  { href: "/dashboard/media",      label: "Media",         icon: FileImage },
  { href: "/dashboard/accounts",   label: "Cuentas",       icon: Instagram },
  { href: "/dashboard/brand",      label: "Mi Marca",      icon: Palette },
  { href: "/dashboard/ads",        label: "Google Ads",    icon: Megaphone },
  { href: "/dashboard/settings",   label: "Configuración", icon: Settings },
]

const adminItem = { href: "/dashboard/admin", label: "Superadmin", icon: Crown }

const mobileBottomNav = [
  { href: "/dashboard",           label: "Inicio",      icon: LayoutDashboard },
  { href: "/dashboard/posts",     label: "Posts",       icon: Image },
  { href: "/dashboard/calendar",  label: "Calendario",  icon: Calendar },
  { href: "/dashboard/comments",  label: "Comentarios", icon: MessageCircle },
  { href: "/dashboard/analytics", label: "Analytics",   icon: BarChart3 },
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
          "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 group",
          active ? "nav-active" : "text-gray-500 hover:text-gray-200 hover:bg-white/5"
        )}
      >
        <item.icon
          className={clsx(
            "w-4 h-4 shrink-0 transition-all",
            active ? "text-indigo-400 nav-icon" : "text-gray-500 group-hover:text-gray-300"
          )}
        />
        <span className={active ? "text-indigo-200 font-medium" : ""}>{item.label}</span>
        {active && (
          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" style={{ boxShadow: "0 0 6px rgba(129,140,248,0.8)" }} />
        )}
      </Link>
    )
  }

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-3">
          {tenantLogo ? (
            <img
              src={tenantLogo}
              alt={tenantName ?? "Logo"}
              className="w-9 h-9 rounded-xl object-contain bg-white shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
            />
          ) : (
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 0 16px rgba(99,102,241,0.4)" }}
            >
              <Zap className="w-4 h-4 text-white" />
            </div>
          )}
          <div>
            <p className="text-sm font-bold text-gray-100">{tenantName ?? "ConectaAI"}</p>
            <p className="text-xs font-medium" style={{ color: "#818cf8" }}>Social Manager</p>
          </div>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="md:hidden text-gray-600 hover:text-gray-400 p-1 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {allItems.map((item) => <NavLink key={item.href} item={item} />)}
      </nav>

      {/* User */}
      <div className="px-3 py-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-3 px-3 py-2.5 mb-1 rounded-xl bg-white/[0.02]">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
          >
            {user.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-gray-200 font-medium truncate">{user.name}</p>
            <p className="text-xs text-gray-600 truncate">{user.email}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/auth/login" })}
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-600 hover:text-red-400 hover:bg-red-500/8 transition-all w-full group"
        >
          <LogOut className="w-4 h-4 group-hover:text-red-400 transition-colors" />
          Cerrar sesión
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* ── DESKTOP sidebar ── */}
      <aside
        className="hidden md:flex w-60 flex-col h-full shrink-0 border-r"
        style={{
          background: "rgba(7, 10, 20, 0.97)",
          borderColor: "rgba(255,255,255,0.06)",
        }}
      >
        {sidebarContent}
      </aside>

      {/* ── MOBILE: top bar ── */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 border-b"
        style={{ background: "rgba(7,10,20,0.97)", borderColor: "rgba(255,255,255,0.06)", backdropFilter: "blur(12px)" }}
      >
        <div className="flex items-center gap-2.5">
          {tenantLogo ? (
            <img src={tenantLogo} alt={tenantName ?? "Logo"} className="w-7 h-7 rounded-lg object-contain bg-white shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
          ) : (
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
          )}
          <span className="text-sm font-bold text-gray-100">{tenantName ?? "ConectaAI"}</span>
        </div>
        <button onClick={() => setOpen(true)} className="text-gray-500 hover:text-gray-300 p-1 transition-colors">
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* ── MOBILE: slide-over sidebar ── */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside
            id="mobile-sidebar"
            className="relative z-10 w-72 flex flex-col h-full shadow-2xl border-r"
            style={{ background: "rgba(7,10,20,0.99)", borderColor: "rgba(255,255,255,0.06)" }}
          >
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* ── MOBILE: bottom nav ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-2 py-1 safe-bottom border-t"
        style={{ background: "rgba(7,10,20,0.97)", borderColor: "rgba(255,255,255,0.06)", backdropFilter: "blur(12px)" }}
      >
        {mobileBottomNav.map((item) => {
          const active = pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-all min-w-0",
                active ? "text-indigo-400" : "text-gray-600 hover:text-gray-400"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="text-[10px] font-medium truncate">{item.label}</span>
            </Link>
          )
        })}
        <button
          onClick={() => setOpen(true)}
          className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg text-gray-600 hover:text-gray-400 transition-all"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-medium">Más</span>
        </button>
      </nav>
    </>
  )
}

"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  LayoutDashboard, Calendar, Image, Settings, LogOut,
  Instagram, Palette, BarChart3, Zap, FileImage,
  Lightbulb, MessageCircle, Crown, Megaphone, Menu, X,
} from "lucide-react"
import { clsx } from "clsx"

const navItems = [
  { href: "/dashboard",            label: "Dashboard",     icon: LayoutDashboard },
  { href: "/dashboard/calendar",   label: "Calendario",    icon: Calendar },
  { href: "/dashboard/posts",      label: "Posts",         icon: Image },
  { href: "/dashboard/analytics",  label: "Analytics",     icon: BarChart3 },
  { href: "/dashboard/insights",   label: "Insights IA",   icon: Lightbulb },
  { href: "/dashboard/comments",   label: "Comentarios",   icon: MessageCircle },
  { href: "/dashboard/media",      label: "Media",         icon: FileImage },
  { href: "/dashboard/accounts",   label: "Cuentas",       icon: Instagram },
  { href: "/dashboard/brand",      label: "Mi Marca",      icon: Palette },
  { href: "/dashboard/ads",        label: "Google Ads",    icon: Megaphone },
  { href: "/dashboard/settings",   label: "Configuración", icon: Settings },
]

const adminItem = { href: "/dashboard/admin", label: "Superadmin", icon: Crown }

// Bottom nav shows only the 5 most important items on mobile
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
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // Close sidebar when route changes on mobile
  useEffect(() => { setOpen(false) }, [pathname])

  // Close on outside click
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
            ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/20"
            : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
        )}
      >
        <item.icon className="w-4 h-4 shrink-0" />
        {item.label}
      </Link>
    )
  }

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="p-5 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-100">ConectaAI</p>
            <p className="text-xs text-indigo-400 font-medium">Social</p>
          </div>
        </div>
        {/* Close button — mobile only */}
        <button
          onClick={() => setOpen(false)}
          className="md:hidden text-gray-500 hover:text-gray-300 p-1"
        >
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
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-gray-100">ConectaAI Social</span>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="text-gray-400 hover:text-gray-200 p-1"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* ── MOBILE: slide-over sidebar ──────────────────────── */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          {/* Drawer */}
          <aside
            id="mobile-sidebar"
            className="relative z-10 w-72 bg-gray-900 flex flex-col h-full shadow-2xl"
          >
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* ── MOBILE: bottom nav ──────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-gray-900 border-t border-gray-800 flex items-center justify-around px-2 py-1 safe-bottom">
        {mobileBottomNav.map((item) => {
          const active = pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors min-w-0",
                active ? "text-indigo-400" : "text-gray-500 hover:text-gray-300"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="text-[10px] font-medium truncate">{item.label}</span>
            </Link>
          )
        })}
        {/* More button → opens full sidebar */}
        <button
          onClick={() => setOpen(true)}
          className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg text-gray-500 hover:text-gray-300 transition-colors"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-medium">Más</span>
        </button>
      </nav>
    </>
  )
}

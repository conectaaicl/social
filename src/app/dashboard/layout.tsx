import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Sidebar from "@/components/layout/Sidebar"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect("/auth/login")

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      <Sidebar user={session.user} />
      {/*
        md: normal — no extra padding needed (sidebar is always visible)
        mobile: pt-14 (top bar height) + pb-16 (bottom nav height)
      */}
      <main className="flex-1 overflow-y-auto pt-14 pb-16 md:pt-0 md:pb-0">
        {children}
      </main>
    </div>
  )
}

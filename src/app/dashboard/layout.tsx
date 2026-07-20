import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Sidebar from "@/components/layout/Sidebar"
import PWAInstallBanner from "@/components/pwa/PWAInstallBanner"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect("/auth/login")

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      <Sidebar user={session.user} tenantName={session.user.tenantName} tenantLogo={session.user.tenantLogo} />
      <main className="flex-1 overflow-y-auto">
        <PWAInstallBanner />
        {children}
      </main>
    </div>
  )
}

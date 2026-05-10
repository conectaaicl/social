import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "ConectaAI Social",
  description: "Gestión autónoma de redes sociales con IA",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="dark">
      <body className="font-sans bg-gray-950 text-gray-100 antialiased">
        {children}
      </body>
    </html>
  )
}

import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "ConectaAI Social",
  description: "Gestion autonoma de redes sociales con IA",
}

export const viewport = {
  themeColor: "#4f46e5",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="dark">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="ConectaAI" />
      </head>
      <body className="font-sans bg-gray-950 text-gray-100 antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html: "if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js')})}",
          }}
        />
        {children}
      </body>
    </html>
  )
}

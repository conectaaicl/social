import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth

  const exactPublic = ["/"]
  const prefixPublic = ["/sitemap.xml", "/google39b4a51d86750223.html", "/auth/login", "/auth/register", "/bio/", "/aprobar/"]

  const isPublic = exactPublic.includes(pathname) || prefixPublic.some((p) => pathname.startsWith(p))

  if (!isLoggedIn && !isPublic) {
    return NextResponse.redirect(new URL("/auth/login", req.url))
  }

  if (isLoggedIn && pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|icon-192.png|icon-512.png|apple-touch-icon.png|uploads).*)"],
}

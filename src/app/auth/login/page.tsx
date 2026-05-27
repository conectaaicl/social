"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    const res = await signIn("credentials", { email, password, redirect: false })
    if (res?.error) {
      setError("Email o contraseña incorrectos")
      setLoading(false)
      return
    }
    router.push("/dashboard")
  }

  const C = { bg: "#070b12", surf: "#0f1623", surf2: "#161d2e", border: "rgba(255,255,255,0.07)", text: "#e2e8f0", muted: "#64748b" }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", position: "relative", overflow: "hidden" }}>
      {/* Glow orbs */}
      <div style={{ position: "absolute", top: "15%", left: "20%", width: 400, height: 400, borderRadius: "50%", background: "rgba(124,58,237,0.07)", filter: "blur(80px)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "10%", right: "15%", width: 350, height: 350, borderRadius: "50%", background: "rgba(79,70,229,0.05)", filter: "blur(80px)", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 400, position: "relative", zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 28px rgba(124,58,237,0.35)" }}>
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none"><path d="M13 3L4 14h8l-1 7 9-11h-8z" fill="white"/></svg>
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.02em" }}>ConectaAI</div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", background: "linear-gradient(90deg,#a78bfa,#60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Social IA</div>
            </div>
          </div>
          <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>Gestión autónoma de redes sociales</p>
        </div>

        {/* Card */}
        <div style={{ background: C.surf, border: `1px solid ${C.border}`, borderRadius: 16, padding: "32px 28px", boxShadow: "0 24px 60px rgba(0,0,0,0.4)" }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: "0 0 4px" }}>Iniciar sesión</h1>
          <p style={{ fontSize: 13, color: C.muted, margin: "0 0 24px" }}>Ingresa a tu panel de control</p>

          {error && (
            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", fontSize: 13, padding: "10px 14px", borderRadius: 10, marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#f87171" strokeWidth="2"/><path d="M12 8v4m0 4h.01" stroke="#f87171" strokeWidth="2" strokeLinecap="round"/></svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Email */}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Correo electrónico</label>
              <div style={{ position: "relative" }}>
                <svg width={15} height={15} viewBox="0 0 24 24" fill="none" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" stroke="#475569" strokeWidth="1.5" strokeLinecap="round"/><rect x="2" y="4" width="20" height="16" rx="2" stroke="#475569" strokeWidth="1.5"/></svg>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="tu@empresa.com"
                  style={{ width: "100%", background: C.surf2, border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 12px 11px 36px", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" }}
                  onFocus={e => (e.target.style.borderColor = "rgba(124,58,237,0.5)")}
                  onBlur={e => (e.target.style.borderColor = C.border)} />
              </div>
            </div>

            {/* Password */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>Contraseña</label>
                <Link href="/auth/forgot-password" style={{ fontSize: 11, color: "#a78bfa", textDecoration: "none" }}>¿Olvidaste tu contraseña?</Link>
              </div>
              <div style={{ position: "relative" }}>
                <svg width={15} height={15} viewBox="0 0 24 24" fill="none" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><rect x="3" y="11" width="18" height="11" rx="2" stroke="#475569" strokeWidth="1.5"/><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#475569" strokeWidth="1.5" strokeLinecap="round"/></svg>
                <input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••"
                  style={{ width: "100%", background: C.surf2, border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 40px 11px 36px", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" }}
                  onFocus={e => (e.target.style.borderColor = "rgba(124,58,237,0.5)")}
                  onBlur={e => (e.target.style.borderColor = C.border)} />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 0, display: "flex" }}>
                  {showPw
                    ? <svg width={14} height={14} viewBox="0 0 24 24" fill="none"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    : <svg width={14} height={14} viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/></svg>
                  }
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              style={{ width: "100%", padding: "12px", borderRadius: 10, border: "none", cursor: loading ? "not-allowed" : "pointer", background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "white", fontSize: 14, fontWeight: 700, opacity: loading ? 0.7 : 1, transition: "opacity 0.15s", marginTop: 4, boxShadow: "0 4px 16px rgba(124,58,237,0.3)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {loading && <svg width={14} height={14} viewBox="0 0 24 24" fill="none" style={{ animation: "spin 1s linear infinite" }}><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>}
              {loading ? "Ingresando…" : "Ingresar →"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", fontSize: 11, color: "#2a3446", marginTop: 20 }}>© {new Date().getFullYear()} ConectaAI · Plataforma de IA para redes sociales</p>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } input::placeholder { color: #334155; }`}</style>
    </div>
  )
}

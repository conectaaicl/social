"use client"
import Link from "next/link"
import { useState, useEffect } from "react"

const FEATURES = [
  { icon: "⚡", color: "#7c3aed", bg: "rgba(124,58,237,0.1)", border: "rgba(124,58,237,0.2)", title: "Piloto Automático IA", desc: "Genera, programa y publica contenido de forma autónoma. Tu marca activa 24/7 sin intervención manual." },
  { icon: "🔭", color: "#10b981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.2)", title: "Radar de Competencia", desc: "Detecta posts virales de tu competencia en tiempo real. Recrea el contenido ganador con un clic." },
  { icon: "📊", color: "#3b82f6", bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.2)", title: "Analytics Profundo", desc: "Métricas reales: alcance, engagement, horario óptimo. Toma decisiones basadas en datos." },
  { icon: "💬", color: "#f97316", bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.2)", title: "Inbox Unificado", desc: "Todos los comentarios y mensajes de Instagram y Facebook en un solo lugar. Responde 3x más rápido." },
  { icon: "📅", color: "#0ea5e9", bg: "rgba(14,165,233,0.1)", border: "rgba(14,165,233,0.2)", title: "Calendario Editorial", desc: "Planifica semanas de contenido en minutos. Vista semanal y mensual con drag & drop." },
  { icon: "🧪", color: "#a78bfa", bg: "rgba(167,139,250,0.1)", border: "rgba(167,139,250,0.2)", title: "A/B Tests Automáticos", desc: "Prueba dos versiones de un post y deja que la IA elija el ganador. Maximiza cada publicación." },
]

const SLIDES = [
  { label: "📊 Dashboard de Analytics", bg: "linear-gradient(135deg, #0d0d1a 0%, #0a0f1e 100%)" },
  { label: "📅 Calendario Editorial", bg: "linear-gradient(135deg, #0a0f1e 0%, #0d1a14 100%)" },
  { label: "⚡ Piloto Automático", bg: "linear-gradient(135deg, #0d0d1a 0%, #160d2a 100%)" },
  { label: "🔭 Radar de Competencia", bg: "linear-gradient(135deg, #0a1219 0%, #0d0d1a 100%)" },
]

const STATS = [
  { val: "10x", label: "Más contenido publicado" },
  { val: "3h", label: "Ahorradas por día" },
  { val: "+47%", label: "Engagement promedio" },
  { val: "24/7", label: "Tu marca activa" },
]

const STEPS = [
  { n: "01", title: "Conecta tus cuentas", desc: "Vincula Instagram y Facebook en segundos. Sin configuraciones complejas." },
  { n: "02", title: "Define tu marca", desc: "Cuéntale a la IA sobre tu negocio, tono y estilo. Solo una vez." },
  { n: "03", title: "La IA hace el resto", desc: "Genera contenido, lo programa y lo publica automáticamente." },
]

export default function LandingPage() {
  const [slide, setSlide] = useState(0)
  const [activeFeature, setActiveFeature] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setSlide(s => (s + 1) % SLIDES.length), 3500)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const t = setInterval(() => setActiveFeature(f => (f + 1) % FEATURES.length), 2800)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{ minHeight: "100vh", background: "#060a17", color: "#e2e8f0", fontFamily: "'Inter', -apple-system, sans-serif", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        :root { scroll-behavior: smooth; }
        .fade-in { animation: fadeUp .6s ease forwards; opacity: 0; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .float { animation: float 4s ease-in-out infinite; }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        .pulse { animation: pulse 2s ease-in-out infinite; }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        .hover-card { transition: transform .2s ease, border-color .2s ease, box-shadow .2s ease; cursor: default; }
        .hover-card:hover { transform: translateY(-4px); box-shadow: 0 20px 40px rgba(0,0,0,0.3); }
        .slide-enter { animation: slideIn .5s ease forwards; }
        @keyframes slideIn { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
        nav a { text-decoration: none; }
        @media (max-width: 768px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .hero-visual { display: none !important; }
          .features-grid { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: repeat(2,1fr) !important; }
          .steps-grid { grid-template-columns: 1fr !important; }
          h1 { font-size: 2.6rem !important; }
        }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, height: 66, padding: "0 40px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(6,10,23,0.92)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>⚡</div>
          <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "#f1f5f9" }}>ConectaAI <span style={{ color: "#a78bfa" }}>Social</span></span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {[["#características","Características"],["#cómo-funciona","Cómo funciona"],["#precios","Precios"]].map(([href, label]) => (
            <Link key={href} href={href} style={{ color: "#94a3b8", fontSize: "0.87rem", padding: "7px 13px", borderRadius: 8, transition: "all .2s" }}
              onMouseEnter={e => { (e.target as HTMLElement).style.color = "#f1f5f9"; (e.target as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.color = "#94a3b8"; (e.target as HTMLElement).style.background = "transparent"; }}>
              {label}
            </Link>
          ))}
          <Link href="/auth/login" style={{ color: "#94a3b8", fontSize: "0.87rem", padding: "7px 13px", borderRadius: 8, marginLeft: 4 }}>Iniciar sesión</Link>
          <Link href="/auth/register" style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 20px", borderRadius: "50px", background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff", fontSize: "0.85rem", fontWeight: 700, textDecoration: "none", marginLeft: 8, boxShadow: "0 4px 16px rgba(124,58,237,0.35)", transition: "all .2s" }}
            onMouseEnter={e => { (e.target as HTMLElement).style.transform = "translateY(-1px)"; (e.target as HTMLElement).style.boxShadow = "0 8px 24px rgba(124,58,237,0.5)"; }}
            onMouseLeave={e => { (e.target as HTMLElement).style.transform = "translateY(0)"; (e.target as HTMLElement).style.boxShadow = "0 4px 16px rgba(124,58,237,0.35)"; }}>
            Empezar gratis →
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ minHeight: "100vh", paddingTop: 66, display: "grid", gridTemplateColumns: "1fr 1fr", position: "relative", overflow: "hidden" }} className="hero-grid">
        {/* bg glow */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 60% at -10% 50%, rgba(124,58,237,0.3), transparent 60%), radial-gradient(ellipse 50% 40% at 110% 20%, rgba(79,70,229,0.2), transparent 60%)", pointerEvents: "none" }} />

        {/* LEFT */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "80px 48px 80px 64px", position: "relative", zIndex: 2 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 100, background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)", marginBottom: 28, width: "fit-content" }}>
            <span className="pulse" style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#a78bfa", letterSpacing: "0.08em", textTransform: "uppercase" }}>IA para redes sociales · Nuevo</span>
          </div>

          <h1 className="fade-in" style={{ fontSize: "clamp(2.4rem, 4.5vw, 3.8rem)", fontWeight: 900, lineHeight: 1.08, letterSpacing: "-2.5px", marginBottom: 22, color: "#f1f5f9", animationDelay: ".1s" }}>
            Tu marca en redes,<br />
            <span style={{ background: "linear-gradient(135deg,#a78bfa 0%,#60a5fa 50%,#34d399 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>en piloto automático</span>
          </h1>

          <p className="fade-in" style={{ fontSize: "1.05rem", color: "#94a3b8", lineHeight: 1.75, maxWidth: 480, marginBottom: 40, animationDelay: ".2s" }}>
            ConectaAI genera, programa y publica contenido por ti. Analiza tu competencia, optimiza horarios y hace crecer tu audiencia — sin que muevas un dedo.
          </p>

          <div className="fade-in" style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 48, animationDelay: ".3s" }}>
            <Link href="/auth/register" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "15px 32px", borderRadius: "50px", background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff", fontSize: "0.95rem", fontWeight: 700, textDecoration: "none", boxShadow: "0 8px 28px rgba(124,58,237,0.45)", transition: "all .2s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 14px 40px rgba(124,58,237,0.55)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 28px rgba(124,58,237,0.45)"; }}>
              ⚡ Empezar gratis — 14 días
            </Link>
            <Link href="/auth/login" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "15px 28px", borderRadius: "50px", background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "#94a3b8", fontSize: "0.95rem", fontWeight: 600, textDecoration: "none", transition: "all .2s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.25)"; (e.currentTarget as HTMLElement).style.color = "#e2e8f0"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.12)"; (e.currentTarget as HTMLElement).style.color = "#94a3b8"; }}>
              Ver demo en vivo →
            </Link>
          </div>

          {/* Stats inline */}
          <div className="fade-in" style={{ display: "flex", gap: 32, flexWrap: "wrap", animationDelay: ".4s" }}>
            {[["10x","más contenido"],["3h","ahorradas/día"],["+47%","engagement"]].map(([val,lbl]) => (
              <div key={val}>
                <div style={{ fontSize: "1.9rem", fontWeight: 900, letterSpacing: "-1.5px", background: "linear-gradient(135deg,#a78bfa,#60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", display: "block", lineHeight: 1 }}>{val}</div>
                <div style={{ fontSize: "0.76rem", color: "#64748b", marginTop: 3 }}>{lbl}</div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — Slider visual */}
        <div className="hero-visual" style={{ position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 40px 80px 20px" }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(6,10,23,0.7) 0%, rgba(6,10,23,0.2) 60%)", zIndex: 1 }} />

          {/* Dashboard mockup container with slide */}
          <div className="float" style={{ width: "100%", maxWidth: 520, position: "relative", zIndex: 2 }}>
            {/* Browser chrome */}
            <div style={{ background: "rgba(13,13,26,0.95)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: "16px", boxShadow: "0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(124,58,237,0.1)", backdropFilter: "blur(12px)" }}>
              {/* Browser bar */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ display: "flex", gap: 5 }}>
                  {["#ef4444","#f59e0b","#22c55e"].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c, opacity: 0.7 }} />)}
                </div>
                <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: 6, height: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 10, color: "#334155" }}>social.conectaai.cl/dashboard</span>
                </div>
              </div>

              {/* Slide content */}
              <div key={slide} className="slide-enter" style={{ background: SLIDES[slide].bg, borderRadius: 12, overflow: "hidden", height: 300 }}>
                {/* Sidebar + main layout */}
                <div style={{ display: "grid", gridTemplateColumns: "150px 1fr", height: "100%" }}>
                  {/* Sidebar */}
                  <div style={{ background: "rgba(7,11,18,0.9)", padding: "14px 10px", borderRight: "1px solid rgba(255,255,255,0.04)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 6px", marginBottom: 14 }}>
                      <div style={{ width: 20, height: 20, borderRadius: 6, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", flexShrink: 0 }} />
                      <div>
                        <div style={{ width: 55, height: 6, background: "rgba(255,255,255,0.12)", borderRadius: 3 }} />
                        <div style={{ width: 35, height: 4, background: "rgba(124,58,237,0.3)", borderRadius: 3, marginTop: 3 }} />
                      </div>
                    </div>
                    {[1,0,0,0,0,0,0,0].map((active, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 6px", marginBottom: 3, borderRadius: 6, background: (i === slide % 8) ? "rgba(124,58,237,0.12)" : "transparent", borderLeft: (i === slide % 8) ? "2px solid rgba(124,58,237,0.5)" : "2px solid transparent" }}>
                        <div style={{ width: 10, height: 10, borderRadius: 3, background: `rgba(167,139,250,${(i === slide % 8) ? 0.6 : 0.12})` }} />
                        <div style={{ width: [50,40,55,42,38,50,44,36][i], height: 5, background: `rgba(255,255,255,${(i === slide % 8) ? 0.15 : 0.06})`, borderRadius: 3 }} />
                      </div>
                    ))}
                  </div>

                  {/* Main content */}
                  <div style={{ padding: 14, overflow: "hidden" }}>
                    {/* KPI row */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 10 }}>
                      {[
                        { c: "#7c3aed", rgb: "124,58,237", v: "248", l: "Posts" },
                        { c: "#10b981", rgb: "16,185,129", v: "84K", l: "Alcance" },
                        { c: "#3b82f6", rgb: "59,130,246", v: "12.4K", l: "Likes" },
                        { c: "#f97316", rgb: "249,115,22", v: "4.7%", l: "Eng." },
                      ].map(k => (
                        <div key={k.l} style={{ background: `rgba(${k.rgb},0.08)`, border: `1px solid rgba(${k.rgb},0.15)`, borderRadius: 8, padding: "8px 8px" }}>
                          <div style={{ fontSize: 7, color: "#475569", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 3 }}>{k.l}</div>
                          <div style={{ fontSize: 15, fontWeight: 800, color: k.c }}>{k.v}</div>
                        </div>
                      ))}
                    </div>

                    {/* Chart area */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {/* Bar chart */}
                      <div style={{ background: "#0d0d1a", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 8, padding: "10px 10px 6px" }}>
                        <div style={{ width: 70, height: 6, background: "rgba(255,255,255,0.07)", borderRadius: 3, marginBottom: 10 }} />
                        <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 70 }}>
                          {[40,65,50,80,70,90,75,100,85,95,72,88].map((h,i) => (
                            <div key={i} style={{ flex: 1, background: `rgba(124,58,237,${0.25 + (h/100)*0.55})`, borderRadius: "2px 2px 0 0", height: `${h}%`, transition: "height .5s ease" }} />
                          ))}
                        </div>
                      </div>

                      {/* Posts preview */}
                      <div style={{ background: "#0d0d1a", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 8, padding: 10 }}>
                        <div style={{ width: 55, height: 6, background: "rgba(255,255,255,0.07)", borderRadius: 3, marginBottom: 10 }} />
                        {[["#7c3aed","90%","12.4K"],["#10b981","65%","8.2K"],["#3b82f6","45%","5.1K"]].map(([c,w,v],i) => (
                          <div key={i} style={{ marginBottom: 8 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                              <div style={{ width: 50, height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3 }} />
                              <span style={{ fontSize: 8, color: c, fontWeight: 700 }}>{v}</span>
                            </div>
                            <div style={{ height: 4, background: "rgba(255,255,255,0.04)", borderRadius: 10 }}>
                              <div style={{ height: "100%", width: w, background: c, borderRadius: 10, opacity: 0.75, transition: "width .6s ease" }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Slide dots + caption */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                <span style={{ fontSize: 11, color: "#475569", fontWeight: 600 }}>{SLIDES[slide].label}</span>
                <div style={{ display: "flex", gap: 5 }}>
                  {SLIDES.map((_,i) => (
                    <button key={i} onClick={() => setSlide(i)} style={{ width: i === slide ? 20 : 7, height: 7, borderRadius: i === slide ? 4 : "50%", background: i === slide ? "#a78bfa" : "rgba(255,255,255,0.15)", border: "none", cursor: "pointer", padding: 0, transition: "all .3s" }} />
                  ))}
                </div>
              </div>
            </div>

            {/* Floating notification card */}
            <div style={{ position: "absolute", top: -20, right: -20, background: "rgba(13,17,32,0.95)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 14, padding: "12px 16px", minWidth: 190, boxShadow: "0 8px 30px rgba(0,0,0,0.4)", zIndex: 3 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(124,58,237,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem", flexShrink: 0 }}>⚡</div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#f1f5f9", marginBottom: 2 }}>Post publicado</div>
                  <div style={{ fontSize: 10, color: "#64748b" }}>hace 2 min · 847 alcance</div>
                </div>
              </div>
            </div>

            {/* Floating active users */}
            <div style={{ position: "absolute", bottom: -16, left: -20, background: "rgba(13,17,32,0.95)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 14, padding: "12px 16px", boxShadow: "0 8px 30px rgba(0,0,0,0.4)", zIndex: 3 }}>
              <div style={{ fontSize: 10, color: "#64748b", marginBottom: 5 }}>Engagement en tiempo real</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ fontSize: "1.1rem" }}>📈</div>
                <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#10b981", letterSpacing: "-0.5px" }}>+247%</div>
                <div style={{ fontSize: 10, color: "#64748b" }}>este mes</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST BAR ── */}
      <div style={{ background: "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "20px 24px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", justifyContent: "center", gap: 40, flexWrap: "wrap" }}>
          {[["🔒","Sin tarjeta de crédito"],["🚀","Activo en 5 minutos"],["🇨🇱","Equipo en Chile"],["🔄","Cancela cuando quieras"],["📱","Instagram + Facebook"]].map(([icon, txt]) => (
            <div key={txt} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.82rem", color: "#64748b", fontWeight: 500 }}>
              <span>{icon}</span>{txt}
            </div>
          ))}
        </div>
      </div>

      {/* ── FEATURES ── */}
      <section id="características" style={{ padding: "96px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }} className="hero-grid">
            {/* Feature list interactive */}
            <div>
              <div style={{ display: "inline-block", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "1.2px", color: "#a78bfa", textTransform: "uppercase", marginBottom: 16, padding: "4px 13px", background: "rgba(124,58,237,0.1)", borderRadius: 100, border: "1px solid rgba(124,58,237,0.2)" }}>Características</div>
              <h2 style={{ fontSize: "clamp(1.9rem,3.5vw,2.8rem)", fontWeight: 800, letterSpacing: "-1.5px", color: "#f1f5f9", marginBottom: 14 }}>Todo lo que necesitas,<br /><span style={{ color: "#475569" }}>nada de lo que no</span></h2>
              <p style={{ color: "#64748b", fontSize: "0.95rem", marginBottom: 36, lineHeight: 1.75 }}>Cada función resuelve un problema real. Sin bloatware, sin curva de aprendizaje.</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {FEATURES.map((f, i) => (
                  <div key={i} onClick={() => setActiveFeature(i)} style={{ display: "flex", gap: 16, alignItems: "flex-start", padding: "16px 18px", borderRadius: 14, border: `1px solid ${i === activeFeature ? f.border : "rgba(255,255,255,0.06)"}`, background: i === activeFeature ? f.bg : "transparent", cursor: "pointer", transition: "all .2s" }}>
                    <div style={{ width: 40, height: 40, borderRadius: 11, background: i === activeFeature ? f.bg : "rgba(255,255,255,0.04)", border: `1px solid ${i === activeFeature ? f.border : "rgba(255,255,255,0.07)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0, transition: "all .2s" }}>
                      {f.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: "0.92rem", fontWeight: 700, color: i === activeFeature ? "#f1f5f9" : "#94a3b8", marginBottom: 3, transition: "color .2s" }}>{f.title}</div>
                      {i === activeFeature && <p style={{ fontSize: "0.83rem", color: "#64748b", lineHeight: 1.65 }}>{f.desc}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Feature visual */}
            <div style={{ position: "relative" }}>
              <div key={activeFeature} className="slide-enter" style={{ background: "#0d0d1a", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: 28, boxShadow: "0 30px 80px rgba(0,0,0,0.5)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: FEATURES[activeFeature].bg, border: `1px solid ${FEATURES[activeFeature].border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem" }}>{FEATURES[activeFeature].icon}</div>
                  <div>
                    <div style={{ fontSize: "1rem", fontWeight: 700, color: "#f1f5f9" }}>{FEATURES[activeFeature].title}</div>
                    <div style={{ fontSize: "0.78rem", color: "#475569" }}>ConectaAI Social</div>
                  </div>
                </div>
                {/* Fake content bars */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[90,70,80,55,75].map((w,i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 7, background: `rgba(${activeFeature===0?"124,58,237":activeFeature===1?"16,185,129":activeFeature===2?"59,130,246":activeFeature===3?"249,115,22":activeFeature===4?"14,165,233":"167,139,250"},0.12)`, flexShrink: 0 }} />
                      <div style={{ flex: 1, height: 8, background: "rgba(255,255,255,0.04)", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${w}%`, background: FEATURES[activeFeature].color, borderRadius: 4, opacity: 0.6 }} />
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "#475569", width: 30, textAlign: "right" }}>{w}%</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 20, padding: "12px 14px", background: `${FEATURES[activeFeature].bg}`, border: `1px solid ${FEATURES[activeFeature].border}`, borderRadius: 10 }}>
                  <p style={{ fontSize: "0.82rem", color: "#94a3b8", lineHeight: 1.65 }}>{FEATURES[activeFeature].desc}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <div style={{ background: "rgba(255,255,255,0.01)", borderTop: "1px solid rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)", padding: "60px 24px" }}>
        <div className="stats-grid" style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 2 }}>
          {STATS.map((s,i) => (
            <div key={i} style={{ textAlign: "center", padding: "20px 16px", borderRight: i < 3 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
              <div style={{ fontSize: "2.8rem", fontWeight: 900, letterSpacing: "-0.03em", background: "linear-gradient(135deg,#a78bfa,#60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: "0.82rem", color: "#475569", marginTop: 8, fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── STEPS ── */}
      <section id="cómo-funciona" style={{ padding: "96px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <div style={{ display: "inline-block", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "1.2px", color: "#10b981", textTransform: "uppercase", marginBottom: 16, padding: "4px 13px", background: "rgba(16,185,129,0.1)", borderRadius: 100, border: "1px solid rgba(16,185,129,0.2)" }}>Cómo funciona</div>
            <h2 style={{ fontSize: "clamp(1.9rem,3.5vw,2.8rem)", fontWeight: 800, letterSpacing: "-1.5px", color: "#f1f5f9" }}>Activo en menos de 5 minutos</h2>
          </div>
          <div className="steps-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24, position: "relative" }}>
            <div style={{ position: "absolute", top: 22, left: "16%", right: "16%", height: 1, background: "linear-gradient(90deg, rgba(124,58,237,0.3), rgba(124,58,237,0.1))" }} />
            {STEPS.map((s,i) => (
              <div key={i} style={{ textAlign: "center", padding: "20px 16px" }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg,rgba(124,58,237,0.15),rgba(79,70,229,0.08))", border: "1px solid rgba(124,58,237,0.2)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 20, position: "relative", zIndex: 1 }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#a78bfa" }}>{s.n}</span>
                </div>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#e2e8f0", marginBottom: 10 }}>{s.title}</h3>
                <p style={{ fontSize: "0.87rem", color: "#475569", lineHeight: 1.65 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ padding: "96px 24px" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <div style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.18), rgba(79,70,229,0.12))", border: "1px solid rgba(124,58,237,0.25)", borderRadius: 28, padding: "72px 48px", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -100, left: "50%", transform: "translateX(-50%)", width: 600, height: 400, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(124,58,237,0.2), transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "relative" }}>
              <div style={{ fontSize: "clamp(2.2rem,5vw,3.2rem)", fontWeight: 900, letterSpacing: "-2px", color: "#f1f5f9", lineHeight: 1.1, marginBottom: 16 }}>
                Empieza a crecer<br />
                <span style={{ background: "linear-gradient(135deg,#a78bfa,#60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>hoy mismo</span>
              </div>
              <p style={{ fontSize: "1rem", color: "#64748b", marginBottom: 36, lineHeight: 1.65 }}>14 días gratis. Sin tarjeta. Sin compromisos.<br />Cancela cuando quieras.</p>
              <Link href="/auth/register" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "16px 40px", borderRadius: "50px", background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff", fontSize: "1rem", fontWeight: 700, textDecoration: "none", boxShadow: "0 10px 36px rgba(124,58,237,0.5)", transition: "all .2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}>
                ⚡ Crear cuenta gratis →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: "#0b1120", borderTop: "1px solid rgba(255,255,255,0.05)", padding: "48px 24px 32px", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center" }}>⚡</div>
          <span style={{ fontSize: "1rem", fontWeight: 800, color: "#f1f5f9" }}>ConectaAI <span style={{ color: "#a78bfa" }}>Social</span></span>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 24, margin: "14px 0", flexWrap: "wrap" }}>
          {[["#características","Características"],["#cómo-funciona","Cómo funciona"],["#precios","Precios"],["/auth/login","Iniciar sesión"]].map(([href,lbl]) => (
            <Link key={href} href={href} style={{ color: "#334155", fontSize: "0.83rem", textDecoration: "none", transition: "color .2s" }}
              onMouseEnter={e => { (e.target as HTMLElement).style.color = "#64748b"; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.color = "#334155"; }}>
              {lbl}
            </Link>
          ))}
        </div>
        <p style={{ fontSize: "0.75rem", color: "#1e293b", marginTop: 16 }}>© {new Date().getFullYear()} ConectaAI · Plataforma de IA para redes sociales · Chile</p>
      </footer>
    </div>
  )
}

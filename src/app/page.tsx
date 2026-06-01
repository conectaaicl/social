import Link from "next/link"

const FEATURES = [
  {
    icon: <svg width={20} height={20} viewBox="0 0 24 24" fill="none"><path d="M13 3L4 14h8l-1 7 9-11h-8z" fill="#a78bfa"/></svg>,
    color: "#7c3aed", bg: "rgba(124,58,237,0.08)",
    title: "Piloto Automático IA",
    desc: "Genera, programa y publica contenido de forma autónoma. Tu marca activa 24/7 sin intervención manual.",
  },
  {
    icon: <svg width={20} height={20} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#34d399" strokeWidth="1.5" fill="#10b981" fillOpacity="0.2"/><circle cx="12" cy="12" r="1.5" fill="#4ade80"/><line x1="12" y1="3" x2="12" y2="6" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round"/><line x1="12" y1="18" x2="12" y2="21" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round"/><line x1="3" y1="12" x2="6" y2="12" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round"/><line x1="18" y1="12" x2="21" y2="12" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round"/></svg>,
    color: "#10b981", bg: "rgba(16,185,129,0.08)",
    title: "Radar de Competencia",
    desc: "Detecta posts virales de tu competencia en tiempo real. Recrea el contenido ganador con un clic.",
  },
  {
    icon: <svg width={20} height={20} viewBox="0 0 24 24" fill="none"><rect x="3" y="14" width="4" height="7" rx="1.5" fill="#60a5fa"/><rect x="10" y="9" width="4" height="12" rx="1.5" fill="#3b82f6"/><rect x="17" y="4" width="4" height="17" rx="1.5" fill="#93c5fd"/><polyline points="5,14 12,9 19,4" stroke="#bfdbfe" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    color: "#3b82f6", bg: "rgba(59,130,246,0.08)",
    title: "Analytics Profundo",
    desc: "Métricas reales: alcance, engagement, horario óptimo. Toma decisiones basadas en datos, no intuición.",
  },
  {
    icon: <svg width={20} height={20} viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="#fb923c" fillOpacity="0.2" stroke="#f97316" strokeWidth="1.5" strokeLinejoin="round"/><circle cx="9" cy="10" r="1" fill="#fb923c"/><circle cx="12" cy="10" r="1" fill="#fb923c"/><circle cx="15" cy="10" r="1" fill="#fb923c"/></svg>,
    color: "#f97316", bg: "rgba(249,115,22,0.08)",
    title: "Inbox Unificado",
    desc: "Todos los comentarios y mensajes de Instagram y Facebook en un solo lugar. Responde 3x más rápido.",
  },
  {
    icon: <svg width={20} height={20} viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="17" rx="3" fill="#0ea5e9" fillOpacity="0.15" stroke="#0ea5e9" strokeWidth="1.5"/><rect x="3" y="4" width="18" height="6" rx="3" fill="#0ea5e9" fillOpacity="0.6"/><circle cx="8" cy="15" r="1.5" fill="#38bdf8"/><circle cx="12" cy="15" r="1.5" fill="#38bdf8"/><circle cx="16" cy="15" r="1.5" fill="#38bdf8"/></svg>,
    color: "#0ea5e9", bg: "rgba(14,165,233,0.08)",
    title: "Calendario Editorial",
    desc: "Planifica semanas de contenido en minutos. Vista semanal y mensual con drag & drop.",
  },
  {
    icon: <svg width={20} height={20} viewBox="0 0 24 24" fill="none"><path d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 1-6.23-.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    color: "#a78bfa", bg: "rgba(167,139,250,0.08)",
    title: "A/B Tests Automáticos",
    desc: "Prueba dos versiones de un post y deja que la IA elija el ganador. Maximiza cada publicación.",
  },
]

const STEPS = [
  { n: "01", title: "Conecta tus cuentas", desc: "Instagram y Facebook en 2 minutos. Sin configuraciones complejas." },
  { n: "02", title: "Define tu marca", desc: "Sube tu guía de estilo, tono y audiencia. La IA aprende quién eres." },
  { n: "03", title: "Activa el piloto", desc: "La plataforma genera, programa y publica por ti. Tú solo apruebas." },
]

const STATS = [
  { val: "10x", label: "más contenido" },
  { val: "67%", label: "menos tiempo" },
  { val: "3.4x", label: "más engagement" },
  { val: "24/7", label: "siempre activo" },
]

export default function LandingPage() {
  return (
    <div style={{ background: "#07090f", color: "#e2e8f0", fontFamily: "'Inter', -apple-system, sans-serif", minHeight: "100vh", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .hover-card:hover { border-color: rgba(124,58,237,0.3) !important; transform: translateY(-2px); }
        .hover-card { transition: all 0.2s ease; }
        .cta-primary:hover { opacity: 0.92; transform: translateY(-1px); box-shadow: 0 8px 28px rgba(124,58,237,0.45) !important; }
        .cta-primary { transition: all 0.15s ease; }
        .cta-ghost:hover { background: rgba(255,255,255,0.06) !important; }
        .cta-ghost { transition: background 0.15s; }
        .nav-link:hover { color: #e2e8f0 !important; }
        .nav-link { transition: color 0.15s; }
        @keyframes float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
        @keyframes pulse-glow { 0%,100% { opacity: 0.15; } 50% { opacity: 0.25; } }
        .float { animation: float 6s ease-in-out infinite; }
        .pulse-glow { animation: pulse-glow 4s ease-in-out infinite; }
        @media (max-width: 768px) {
          .hero-title { font-size: 36px !important; }
          .features-grid { grid-template-columns: 1fr !important; }
          .steps-grid { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: repeat(2,1fr) !important; }
          .nav-links { display: none !important; }
          .hero-ctas { flex-direction: column !important; }
        }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, borderBottom: "1px solid rgba(255,255,255,0.04)", backdropFilter: "blur(16px)", background: "rgba(7,9,15,0.85)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px rgba(124,58,237,0.4)" }}>
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none"><path d="M13 3L4 14h8l-1 7 9-11h-8z" fill="white"/></svg>
            </div>
            <div>
              <span style={{ fontSize: 15, fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.02em" }}>ConectaAI</span>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", background: "linear-gradient(90deg,#a78bfa,#60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginLeft: 6 }}>SOCIAL</span>
            </div>
          </div>
          {/* Links */}
          <div className="nav-links" style={{ display: "flex", alignItems: "center", gap: 32 }}>
            {["Características", "Cómo funciona", "Precios"].map(l => (
              <a key={l} href={`#${l.toLowerCase().replace(" ", "-")}`} className="nav-link" style={{ fontSize: 13, color: "#64748b", textDecoration: "none", fontWeight: 500 }}>{l}</a>
            ))}
          </div>
          {/* CTAs */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Link href="/auth/login" className="cta-ghost" style={{ fontSize: 13, color: "#94a3b8", textDecoration: "none", padding: "8px 16px", borderRadius: 8, background: "transparent" }}>Iniciar sesión</Link>
            <Link href="/auth/register" className="cta-primary" style={{ fontSize: 13, fontWeight: 700, color: "white", textDecoration: "none", padding: "8px 18px", borderRadius: 8, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", boxShadow: "0 4px 16px rgba(124,58,237,0.35)" }}>Empieza gratis →</Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "120px 24px 80px", position: "relative" }}>
        {/* BG glows */}
        <div className="pulse-glow" style={{ position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "40%", left: "15%", width: 300, height: 300, borderRadius: "50%", background: "rgba(79,70,229,0.06)", filter: "blur(60px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "30%", right: "10%", width: 250, height: 250, borderRadius: "50%", background: "rgba(16,185,129,0.05)", filter: "blur(60px)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 780, position: "relative", zIndex: 1 }}>
          {/* Badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 100, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)", marginBottom: 32 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e", display: "inline-block" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#a78bfa", letterSpacing: "0.04em" }}>IA generativa para redes sociales · Nuevo</span>
          </div>

          {/* Headline */}
          <h1 className="hero-title" style={{ fontSize: 64, fontWeight: 900, lineHeight: 1.08, letterSpacing: "-0.03em", marginBottom: 24 }}>
            <span style={{ color: "#f1f5f9" }}>Tu marca en redes,</span>
            <br />
            <span style={{ background: "linear-gradient(135deg,#a78bfa 0%,#60a5fa 50%,#34d399 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>en piloto automático</span>
          </h1>

          {/* Sub */}
          <p style={{ fontSize: 18, color: "#64748b", lineHeight: 1.7, maxWidth: 560, margin: "0 auto 40px", fontWeight: 400 }}>
            ConectaAI genera, programa y publica contenido por ti. Analiza tu competencia, optimiza horarios y hace crecer tu audiencia — sin que muevas un dedo.
          </p>

          {/* CTAs */}
          <div className="hero-ctas" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
            <Link href="/auth/register" className="cta-primary" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 28px", borderRadius: 12, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "white", textDecoration: "none", fontSize: 15, fontWeight: 700, boxShadow: "0 6px 24px rgba(124,58,237,0.4)" }}>
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none"><path d="M13 3L4 14h8l-1 7 9-11h-8z" fill="white"/></svg>
              Empezar gratis — 14 días
            </Link>
            <Link href="/auth/login" className="cta-ghost" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "14px 24px", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8", textDecoration: "none", fontSize: 15, fontWeight: 500 }}>
              Ver demo en vivo →
            </Link>
          </div>
          <p style={{ fontSize: 12, color: "#334155", marginTop: 16 }}>Sin tarjeta de crédito · Cancela cuando quieras</p>

          {/* Dashboard preview */}
          <div className="float" style={{ marginTop: 64, position: "relative" }}>
            <div style={{ background: "rgba(13,13,26,0.9)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: "20px", backdropFilter: "blur(12px)", boxShadow: "0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,58,237,0.08)" }}>
              {/* Fake browser bar */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", opacity: 0.6 }} />
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#f59e0b", opacity: 0.6 }} />
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e", opacity: 0.6 }} />
                <div style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: 6, height: 24, marginLeft: 8, display: "flex", alignItems: "center", paddingLeft: 12 }}>
                  <span style={{ fontSize: 11, color: "#334155" }}>social.conectaai.cl/dashboard</span>
                </div>
              </div>
              {/* Dashboard mockup */}
              <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 12, height: 280, borderRadius: 10, overflow: "hidden" }}>
                {/* Sidebar */}
                <div style={{ background: "#070b12", borderRadius: 10, padding: "12px 8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", marginBottom: 12 }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }} />
                    <div>
                      <div style={{ width: 60, height: 7, background: "rgba(255,255,255,0.12)", borderRadius: 4 }} />
                      <div style={{ width: 40, height: 5, background: "rgba(124,58,237,0.3)", borderRadius: 4, marginTop: 3 }} />
                    </div>
                  </div>
                  {[1,0.6,0.4,0.3,0.5,0.3,0.4,0.3].map((o,i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 8px", marginBottom: 2, borderRadius: 6, background: i===0 ? "rgba(124,58,237,0.12)" : "transparent", borderLeft: i===0 ? "2px solid rgba(124,58,237,0.5)" : "2px solid transparent" }}>
                      <div style={{ width: 12, height: 12, borderRadius: 3, background: `rgba(167,139,250,${o * 0.3})` }} />
                      <div style={{ width: [50,40,55,45,38,50,42,35][i], height: 6, background: `rgba(255,255,255,${o * 0.12})`, borderRadius: 4 }} />
                    </div>
                  ))}
                </div>
                {/* Main */}
                <div style={{ background: "#080c14", borderRadius: 10, padding: 16 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 12 }}>
                    {[
                      { color: "#7c3aed", label: "Posts", val: "248" },
                      { color: "#10b981", label: "Reach", val: "84K" },
                      { color: "#3b82f6", label: "Likes", val: "12.4K" },
                      { color: "#f97316", label: "Engagement", val: "4.7%" },
                    ].map(c => (
                      <div key={c.label} style={{ background: `linear-gradient(135deg, rgba(${c.color === "#7c3aed" ? "124,58,237" : c.color === "#10b981" ? "16,185,129" : c.color === "#3b82f6" ? "59,130,246" : "249,115,22"},0.08) 0%, rgba(0,0,0,0) 100%)`, border: `1px solid rgba(${c.color === "#7c3aed" ? "124,58,237" : c.color === "#10b981" ? "16,185,129" : c.color === "#3b82f6" ? "59,130,246" : "249,115,22"},0.15)`, borderRadius: 8, padding: "10px 10px" }}>
                        <div style={{ fontSize: 8, color: "#475569", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>{c.label}</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: c.color }}>{c.val}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div style={{ background: "#0d0d1a", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 8, padding: 12, height: 140 }}>
                      <div style={{ width: 80, height: 7, background: "rgba(255,255,255,0.08)", borderRadius: 4, marginBottom: 12 }} />
                      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 80 }}>
                        {[40,65,50,80,70,90,75,100,85,95,72,88].map((h,i) => (
                          <div key={i} style={{ flex: 1, background: `rgba(124,58,237,${0.3 + (h/100)*0.5})`, borderRadius: "2px 2px 0 0", height: `${h}%` }} />
                        ))}
                      </div>
                    </div>
                    <div style={{ background: "#0d0d1a", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 8, padding: 12 }}>
                      <div style={{ width: 70, height: 7, background: "rgba(255,255,255,0.08)", borderRadius: 4, marginBottom: 10 }} />
                      {[
                        { w: "90%", c: "#7c3aed" }, { w: "65%", c: "#10b981" }, { w: "45%", c: "#3b82f6" },
                      ].map((b,i) => (
                        <div key={i} style={{ marginBottom: 8 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                            <div style={{ width: 50, height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 4 }} />
                            <div style={{ width: 20, height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 4 }} />
                          </div>
                          <div style={{ height: 5, background: "rgba(255,255,255,0.04)", borderRadius: 10 }}>
                            <div style={{ height: "100%", width: b.w, background: b.c, borderRadius: 10, opacity: 0.7 }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Glow under preview */}
            <div style={{ position: "absolute", bottom: -30, left: "50%", transform: "translateX(-50%)", width: "60%", height: 60, background: "rgba(124,58,237,0.2)", filter: "blur(30px)", pointerEvents: "none" }} />
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{ padding: "60px 24px", borderTop: "1px solid rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="stats-grid" style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 2 }}>
          {STATS.map((s, i) => (
            <div key={i} style={{ textAlign: "center", padding: "20px 16px", borderRight: i < 3 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
              <div style={{ fontSize: 48, fontWeight: 900, letterSpacing: "-0.03em", background: "linear-gradient(135deg,#a78bfa,#60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: 13, color: "#475569", marginTop: 6, fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="características" style={{ padding: "100px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{ display: "inline-block", fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", color: "#7c3aed", textTransform: "uppercase", marginBottom: 16, padding: "4px 12px", background: "rgba(124,58,237,0.08)", borderRadius: 100, border: "1px solid rgba(124,58,237,0.15)" }}>Características</div>
            <h2 style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.02em", color: "#f1f5f9", lineHeight: 1.2, marginBottom: 16 }}>Todo lo que necesitas,<br /><span style={{ color: "#64748b" }}>nada de lo que no</span></h2>
            <p style={{ fontSize: 16, color: "#475569", maxWidth: 480, margin: "0 auto", lineHeight: 1.7 }}>Cada función resuelve un problema real. Sin bloatware, sin curva de aprendizaje.</p>
          </div>
          <div className="features-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            {FEATURES.map((f, i) => (
              <div key={i} className="hover-card" style={{ background: "#0d0d1a", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, padding: "24px 24px 28px" }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: f.bg, border: `1px solid ${f.color}18`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0", marginBottom: 8, letterSpacing: "-0.01em" }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="cómo-funciona" style={{ padding: "100px 24px", background: "rgba(255,255,255,0.01)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{ display: "inline-block", fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", color: "#10b981", textTransform: "uppercase", marginBottom: 16, padding: "4px 12px", background: "rgba(16,185,129,0.08)", borderRadius: 100, border: "1px solid rgba(16,185,129,0.15)" }}>Cómo funciona</div>
            <h2 style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.02em", color: "#f1f5f9", lineHeight: 1.2 }}>Activo en menos de 5 minutos</h2>
          </div>
          <div className="steps-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24 }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ textAlign: "center", position: "relative" }}>
                {i < 2 && <div style={{ position: "absolute", top: 22, left: "calc(50% + 36px)", right: "calc(-50% + 36px)", height: 1, background: "linear-gradient(90deg, rgba(124,58,237,0.3), rgba(124,58,237,0.05))" }} />}
                <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg,rgba(124,58,237,0.15),rgba(79,70,229,0.08))", border: "1px solid rgba(124,58,237,0.2)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#a78bfa" }}>{s.n}</span>
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: "#e2e8f0", marginBottom: 10 }}>{s.title}</h3>
                <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.65 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ padding: "100px 24px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ maxWidth: 600, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <h2 style={{ fontSize: 44, fontWeight: 900, letterSpacing: "-0.03em", color: "#f1f5f9", lineHeight: 1.1, marginBottom: 20 }}>
            Empieza a crecer<br />
            <span style={{ background: "linear-gradient(135deg,#a78bfa,#60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>hoy mismo</span>
          </h2>
          <p style={{ fontSize: 16, color: "#475569", marginBottom: 36, lineHeight: 1.6 }}>14 días gratis. Sin tarjeta. Sin compromisos.<br />Cancela cuando quieras.</p>
          <Link href="/auth/register" className="cta-primary" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "16px 36px", borderRadius: 14, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "white", textDecoration: "none", fontSize: 16, fontWeight: 700, boxShadow: "0 8px 32px rgba(124,58,237,0.45)" }}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none"><path d="M13 3L4 14h8l-1 7 9-11h-8z" fill="white"/></svg>
            Crear cuenta gratis →
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ padding: "32px 24px", borderTop: "1px solid rgba(255,255,255,0.04)", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 12 }}>
          <div style={{ width: 24, height: 24, borderRadius: 7, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width={10} height={10} viewBox="0 0 24 24" fill="none"><path d="M13 3L4 14h8l-1 7 9-11h-8z" fill="white"/></svg>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>ConectaAI Social</span>
        </div>
        <p style={{ fontSize: 12, color: "#1e293b" }}>© {new Date().getFullYear()} ConectaAI · Plataforma de IA para redes sociales · Chile</p>
      </footer>
    </div>
  )
}

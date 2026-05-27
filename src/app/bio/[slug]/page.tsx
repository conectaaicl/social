import { notFound } from "next/navigation"

async function getBioPage(slug: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://social.conectaai.cl"
  const r = await fetch(`${base}/api/bio/${slug}`, { next: { revalidate: 60 } })
  if (!r.ok) return null
  return r.json()
}

export default async function PublicBioPage({ params }: { params: { slug: string } }) {
  const data = await getBioPage(params.slug)
  if (!data) notFound()

  const { title, description, avatarUrl, theme, links, tenant } = data
  const isDark = theme !== "light"
  const bgClass = isDark ? "min-h-screen bg-gray-950 text-white" : "min-h-screen bg-gray-50 text-gray-900"
  const cardClass = isDark ? "bg-white/10 text-white hover:bg-white/20" : "bg-gray-900 text-white hover:bg-gray-800"

  return (
    <div className={bgClass}>
      <div className="max-w-sm mx-auto py-12 px-4">
        {/* Avatar */}
        <div className="text-center mb-8">
          {(avatarUrl || tenant?.logo) ? (
            <img src={avatarUrl || tenant.logo} alt={title} className="w-20 h-20 rounded-full mx-auto mb-4 object-cover border-2 border-white/10" />
          ) : (
            <div className="w-20 h-20 rounded-full mx-auto mb-4 bg-indigo-600 flex items-center justify-center text-3xl">🏠</div>
          )}
          <h1 className="text-xl font-bold">{title || tenant?.name}</h1>
          {description && <p className={`text-sm mt-1 ${isDark ? "text-white/50" : "text-gray-500"}`}>{description}</p>}
        </div>

        {/* Links */}
        <div className="space-y-3">
          {links?.filter((l: any) => l.active).map((link: any) => (
            <a
              key={link.id}
              href={buildUrl(link)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackClick(data.id, link.id, params.slug)}
              className={`${cardClass} flex items-center justify-center gap-3 py-3.5 px-6 rounded-2xl text-sm font-semibold transition w-full block text-center`}
            >
              {link.icon && <span className="text-xl">{link.icon}</span>}
              {link.label}
            </a>
          ))}
        </div>

        <p className={`text-center text-xs mt-10 ${isDark ? "text-white/15" : "text-gray-300"}`}>
          Powered by social.conectaai.cl
        </p>
      </div>
    </div>
  )
}

function buildUrl(link: { url: string; utmSource?: string; utmMedium?: string }) {
  try {
    const u = new URL(link.url)
    if (link.utmSource) u.searchParams.set("utm_source", link.utmSource)
    if (link.utmMedium) u.searchParams.set("utm_medium", link.utmMedium)
    u.searchParams.set("utm_campaign", "linkinbio")
    return u.toString()
  } catch { return link.url }
}

function trackClick(pageId: string, linkId: string, slug: string) {
  fetch(`/api/bio/${slug}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ linkId }),
  }).catch(() => {})
}

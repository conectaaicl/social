import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { 
  BarChart3, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Image, 
  TrendingUp,
  AlertCircle
} from "lucide-react"

async function getDashboardStats(tenantId: string) {
  const [total, published, scheduled, failed] = await Promise.all([
    prisma.post.count({ where: { tenantId } }),
    prisma.post.count({ where: { tenantId, status: "PUBLISHED" } }),
    prisma.post.count({ where: { tenantId, status: "SCHEDULED" } }),
    prisma.post.count({ where: { tenantId, status: "FAILED" } }),
  ])

  const recentPosts = await prisma.post.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: 5,
  })

  return { total, published, scheduled, failed, recentPosts }
}

export default async function DashboardPage() {
  const session = await auth()
  const tenantId = session?.user?.tenantId

  const stats = tenantId
    ? await getDashboardStats(tenantId)
    : { total: 0, published: 0, scheduled: 0, failed: 0, recentPosts: [] }

  const cards = [
    {
      label: "Posts publicados",
      value: stats.published,
      icon: CheckCircle2,
      color: "text-green-400",
      bg: "bg-green-500/10",
      border: "border-green-500/20",
    },
    {
      label: "Programados",
      value: stats.scheduled,
      icon: Clock,
      color: "text-indigo-400",
      bg: "bg-indigo-500/10",
      border: "border-indigo-500/20",
    },
    {
      label: "Total generados",
      value: stats.total,
      icon: Image,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
    {
      label: "Fallidos",
      value: stats.failed,
      icon: AlertCircle,
      color: "text-red-400",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
    },
  ]

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-100">
          Bienvenido{session?.user?.name ? `, ${session.user.name.split(" ")[0]}` : ""} 👋
        </h1>
        <p className="text-gray-500 mt-1">
          Aquí tienes un resumen de tu actividad en redes sociales
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`card border ${card.border} flex items-center gap-4`}
          >
            <div className={`${card.bg} ${card.border} border p-3 rounded-lg`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-100">{card.value}</p>
              <p className="text-sm text-gray-500">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Setup callout if no posts yet */}
      {stats.total === 0 && (
        <div className="card border border-indigo-500/30 bg-indigo-500/5">
          <div className="flex items-start gap-4">
            <div className="bg-indigo-500/20 p-3 rounded-lg">
              <TrendingUp className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-100 mb-1">
                Configura tu primera cuenta de redes sociales
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                Conecta tu Instagram y Facebook para que el sistema empiece a generar y publicar contenido automáticamente.
              </p>
              <div className="flex gap-3">
                <a href="/dashboard/accounts" className="btn-primary text-sm py-1.5 px-3">
                  Conectar cuenta
                </a>
                <a href="/dashboard/brand" className="btn-secondary text-sm py-1.5 px-3">
                  Configurar marca
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent posts */}
      {stats.recentPosts.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-gray-100 mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-400" />
            Posts recientes
          </h2>
          <div className="space-y-3">
            {stats.recentPosts.map((post) => (
              <div
                key={post.id}
                className="flex items-center justify-between py-3 border-b border-gray-800 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center text-xs text-gray-500">
                    {post.type === "FEED" ? "📷" : post.type === "STORY" ? "📱" : post.type === "REEL" ? "🎬" : "🎠"}
                  </div>
                  <div>
                    <p className="text-sm text-gray-200 line-clamp-1 max-w-xs">
                      {post.caption.slice(0, 60)}...
                    </p>
                    <p className="text-xs text-gray-500">
                      {post.platform.join(" · ")} · {post.contentType.toLowerCase()}
                    </p>
                  </div>
                </div>
                <span className={`
                  text-xs px-2 py-1 rounded-full border
                  ${post.status === "PUBLISHED" ? "badge-published" : ""}
                  ${post.status === "SCHEDULED" ? "badge-scheduled" : ""}
                  ${post.status === "PENDING" || post.status === "GENERATING" ? "badge-pending" : ""}
                  ${post.status === "FAILED" ? "badge-failed" : ""}
                `}>
                  {post.status === "PUBLISHED" ? "Publicado" : 
                   post.status === "SCHEDULED" ? "Programado" :
                   post.status === "GENERATING" ? "Generando" :
                   post.status === "FAILED" ? "Fallido" : "Pendiente"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

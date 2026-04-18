"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Zap, Lock, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react"

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token") ?? ""
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError("Las contraseñas no coinciden"); return }
    if (password.length < 8) { setError("La contraseña debe tener al menos 8 caracteres"); return }
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Error")
      setSuccess(true)
      setTimeout(() => router.push("/auth/login"), 3000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-gray-300 mb-3">Enlace inválido o expirado.</p>
        <Link href="/auth/forgot-password" className="text-indigo-400 text-sm hover:text-indigo-300">
          Solicitar nuevo enlace →
        </Link>
      </div>
    )
  }

  if (success) {
    return (
      <div className="text-center py-4">
        <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-7 h-7 text-green-400" />
        </div>
        <h2 className="text-lg font-semibold text-gray-100 mb-2">¡Contraseña actualizada!</h2>
        <p className="text-gray-400 text-sm">Redirigiendo al login…</p>
      </div>
    )
  }

  return (
    <>
      <h1 className="text-xl font-semibold text-gray-100 mb-1">Nueva contraseña</h1>
      <p className="text-gray-500 text-sm mb-6">Elige una contraseña segura de al menos 8 caracteres.</p>

      {error && (
        <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl mb-4">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1.5">Nueva contraseña</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type={showPass ? "text" : "password"}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-10 py-2.5 text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-colors text-sm"
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1.5">Confirmar contraseña</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="password"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-gray-100 placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-colors text-sm"
              placeholder="Repite la contraseña"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold py-2.5 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/20 disabled:opacity-60"
        >
          {loading ? "Guardando…" : "Establecer nueva contraseña"}
        </button>
      </form>
    </>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20" />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <p className="text-lg font-bold text-gray-100 leading-none">ConectaAI</p>
              <p className="text-sm text-indigo-400 font-medium leading-none mt-0.5">Social</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-900/80 backdrop-blur border border-gray-800 rounded-2xl p-8 shadow-2xl">
          <Suspense fallback={<div className="text-center py-8 text-gray-500">Cargando…</div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

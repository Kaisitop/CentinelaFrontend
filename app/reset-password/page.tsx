"use client"

import type React from "react"

import { useState, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react"
import { AuthShell } from "@/components/auth/auth-shell"
import { authService } from "@/lib/auth-service"
import { getApiErrorMessage } from "@/lib/api"

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tokenFromUrl = searchParams.get("token") ?? ""

  const [token, setToken] = useState(tokenFromUrl)
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError("Las contraseñas no coinciden.")
      return
    }

    setLoading(true)
    try {
      await authService.resetPassword(token, password)
      setSuccess(true)
      setTimeout(() => router.push("/login"), 2000)
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudo restablecer la contraseña. El enlace puede haber expirado."))
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <AuthShell title="¡Contraseña actualizada!" subtitle="Tu contraseña se restableció correctamente.">
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <CheckCircle2 className="h-12 w-12 text-[#22c55e]" />
          <p className="text-sm text-[#94a3b8]">Redirigiendo al inicio de sesión...</p>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Nueva contraseña"
      subtitle="Ingresa tu nueva contraseña para completar el restablecimiento."
      footer={
        <Link href="/login" className="font-medium text-[#818cf8] hover:text-[#a5b4fc]">
          Volver al inicio de sesión
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-[#ef4444]/40 bg-[#ef4444]/10 px-3 py-2 text-sm text-[#fca5a5]"
          >
            {error}
          </div>
        )}

        {!tokenFromUrl && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="token" className="text-sm font-medium text-[#e2e8f0]">
              Código de restablecimiento
            </label>
            <input
              id="token"
              type="text"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Pega el código del correo"
              className="w-full rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2.5 text-sm text-[#f8fafc] placeholder:text-[#64748b] focus:border-[#6366f1] focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
            />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-medium text-[#e2e8f0]">
            Nueva contraseña
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2.5 pr-10 text-sm text-[#f8fafc] placeholder:text-[#64748b] focus:border-[#6366f1] focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-[#94a3b8]"
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="confirm" className="text-sm font-medium text-[#e2e8f0]">
            Confirmar contraseña
          </label>
          <input
            id="confirm"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2.5 text-sm text-[#f8fafc] placeholder:text-[#64748b] focus:border-[#6366f1] focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-[#6366f1] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4f46e5] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "Guardando..." : "Restablecer contraseña"}
        </button>
      </form>
    </AuthShell>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#0f172a]">
          <Loader2 className="h-6 w-6 animate-spin text-[#6366f1]" />
        </main>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  )
}

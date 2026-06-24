"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react"
import { AuthShell } from "@/components/auth/auth-shell"
import { authService } from "@/lib/auth-service"
import { getApiErrorMessage } from "@/lib/api"

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ nombre: "", email: "", telefono: "", password: "" })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await authService.register({
        nombre: form.nombre,
        email: form.email,
        password: form.password,
        telefono: form.telefono || undefined,
      })
      setSuccess(true)
      setTimeout(() => router.push("/login"), 2000)
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudo completar el registro. Intenta nuevamente."))
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <AuthShell title="¡Registro exitoso!" subtitle="Tu cuenta ha sido creada correctamente.">
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <CheckCircle2 className="h-12 w-12 text-[#22c55e]" />
          <p className="text-sm text-[#94a3b8]">Revisa tu correo para verificar tu cuenta. Redirigiendo al inicio de sesión...</p>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Crear cuenta"
      subtitle="Completa tus datos para registrarte en el sistema."
      footer={
        <span>
          ¿Ya tienes una cuenta?{" "}
          <Link href="/login" className="font-medium text-[#818cf8] hover:text-[#a5b4fc]">
            Inicia sesión
          </Link>
        </span>
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

        <div className="flex flex-col gap-1.5">
          <label htmlFor="nombre" className="text-sm font-medium text-[#e2e8f0]">
            Nombre completo
          </label>
          <input
            id="nombre"
            type="text"
            required
            value={form.nombre}
            onChange={update("nombre")}
            placeholder="Juan Pérez"
            className="w-full rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2.5 text-sm text-[#f8fafc] placeholder:text-[#64748b] focus:border-[#6366f1] focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium text-[#e2e8f0]">
            Correo electrónico
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={form.email}
            onChange={update("email")}
            placeholder="usuario@centinela.com"
            className="w-full rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2.5 text-sm text-[#f8fafc] placeholder:text-[#64748b] focus:border-[#6366f1] focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="telefono" className="text-sm font-medium text-[#e2e8f0]">
            Teléfono <span className="text-[#64748b]">(opcional)</span>
          </label>
          <input
            id="telefono"
            type="tel"
            value={form.telefono}
            onChange={update("telefono")}
            placeholder="0999999999"
            className="w-full rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2.5 text-sm text-[#f8fafc] placeholder:text-[#64748b] focus:border-[#6366f1] focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-medium text-[#e2e8f0]">
            Contraseña
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              value={form.password}
              onChange={update("password")}
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
          <p className="text-xs text-[#64748b]">Mínimo 8 caracteres, con mayúsculas, números y símbolos.</p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-[#6366f1] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4f46e5] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "Creando cuenta..." : "Crear cuenta"}
        </button>
      </form>
    </AuthShell>
  )
}

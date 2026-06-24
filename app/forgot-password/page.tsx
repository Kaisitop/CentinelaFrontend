"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2, MailCheck } from "lucide-react"
import { AuthShell } from "@/components/auth/auth-shell"
import { authService } from "@/lib/auth-service"
import { getApiErrorMessage } from "@/lib/api"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await authService.forgotPassword(email)
      setSent(true)
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudo enviar el correo de recuperación."))
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <AuthShell
        title="Revisa tu correo"
        subtitle={`Si existe una cuenta asociada a ${email}, recibirás un enlace para restablecer tu contraseña.`}
        footer={
          <Link href="/login" className="inline-flex items-center gap-1 font-medium text-[#818cf8] hover:text-[#a5b4fc]">
            <ArrowLeft className="h-4 w-4" /> Volver al inicio de sesión
          </Link>
        }
      >
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <MailCheck className="h-12 w-12 text-[#22c55e]" />
          <p className="text-sm text-[#94a3b8]">Sigue las instrucciones del correo para continuar.</p>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Recuperar contraseña"
      subtitle="Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña."
      footer={
        <Link href="/login" className="inline-flex items-center gap-1 font-medium text-[#818cf8] hover:text-[#a5b4fc]">
          <ArrowLeft className="h-4 w-4" /> Volver al inicio de sesión
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

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium text-[#e2e8f0]">
            Correo electrónico
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="usuario@centinela.com"
            className="w-full rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2.5 text-sm text-[#f8fafc] placeholder:text-[#64748b] focus:border-[#6366f1] focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-[#6366f1] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4f46e5] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "Enviando..." : "Enviar enlace"}
        </button>
      </form>
    </AuthShell>
  )
}

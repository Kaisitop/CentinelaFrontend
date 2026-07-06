"use client"

import type React from "react"

import { useState, useEffect, useRef, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Loader2, CheckCircle2, XCircle, MailCheck } from "lucide-react"
import { AuthShell } from "@/components/auth/auth-shell"
import { authService } from "@/lib/auth-service"
import { getApiErrorMessage } from "@/lib/api"

type Status = "verifying" | "success" | "error"

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token") ?? ""
  const [status, setStatus] = useState<Status>(token ? "verifying" : "error")
  const [message, setMessage] = useState<string>(
    token ? "" : "No se encontró un token de verificación válido.",
  )
  const hasRun = useRef(false)

  const [resendEmail, setResendEmail] = useState("")
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSent, setResendSent] = useState(false)
  const [resendError, setResendError] = useState<string | null>(null)

  useEffect(() => {
    if (!token || hasRun.current) return
    hasRun.current = true
    authService
      .verifyEmail(token)
      .then(() => setStatus("success"))
      .catch((err) => {
        setStatus("error")
        setMessage(getApiErrorMessage(err, "El enlace de verificación es inválido o ha expirado."))
      })
  }, [token])

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault()
    setResendError(null)
    setResendLoading(true)
    try {
      await authService.resendVerification(resendEmail)
      setResendSent(true)
    } catch (err) {
      setResendError(getApiErrorMessage(err, "No se pudo reenviar el correo de verificación."))
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <AuthShell
      title="Verificación de correo"
      subtitle="Estamos confirmando tu dirección de correo electrónico."
      footer={
        <Link href="/login" className="font-medium text-[#818cf8] hover:text-[#a5b4fc]">
          Ir al inicio de sesión
        </Link>
      }
    >
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        {status === "verifying" && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-[#6366f1]" />
            <p className="text-sm text-[#94a3b8]">Verificando tu correo electrónico...</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle2 className="h-12 w-12 text-[#22c55e]" />
            <p className="text-sm text-[#94a3b8]">Tu correo ha sido verificado correctamente. Ya puedes iniciar sesión.</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="h-12 w-12 text-[#ef4444]" />
            <p className="text-sm text-[#94a3b8]">{message}</p>

            {resendSent ? (
              <div className="mt-2 flex flex-col items-center gap-2">
                <MailCheck className="h-8 w-8 text-[#22c55e]" />
                <p className="text-sm text-[#94a3b8]">
                  Si el correo existe y aún no está verificado, te enviamos un nuevo enlace.
                </p>
              </div>
            ) : (
              <form onSubmit={handleResend} className="mt-2 flex w-full flex-col gap-3 text-left">
                <p className="text-center text-xs text-[#64748b]">
                  ¿El enlace expiró? Ingresa tu correo y te enviamos uno nuevo.
                </p>
                {resendError && (
                  <div
                    role="alert"
                    className="rounded-lg border border-[#ef4444]/40 bg-[#ef4444]/10 px-3 py-2 text-sm text-[#fca5a5]"
                  >
                    {resendError}
                  </div>
                )}
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="usuario@centinela.com"
                  className="w-full rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2.5 text-sm text-[#f8fafc] placeholder:text-[#64748b] focus:border-[#6366f1] focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
                />
                <button
                  type="submit"
                  disabled={resendLoading}
                  className="flex items-center justify-center gap-2 rounded-lg bg-[#6366f1] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4f46e5] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {resendLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {resendLoading ? "Enviando..." : "Reenviar verificación"}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </AuthShell>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#0f172a]">
          <Loader2 className="h-6 w-6 animate-spin text-[#6366f1]" />
        </main>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  )
}

"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"
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

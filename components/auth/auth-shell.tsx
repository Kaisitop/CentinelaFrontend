import type { ReactNode } from "react"
import { ShieldCheck } from "lucide-react"

interface AuthShellProps {
  title: string
  subtitle: string
  children: ReactNode
  footer?: ReactNode
}

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0f172a] px-4 py-12">
      <div className="w-full max-w-md">
        {/* Marca */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#6366f1]">
            <ShieldCheck className="h-9 w-9 text-white" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#f8fafc]">CENTINELA</h1>
          <p className="mt-1 text-sm text-[#94a3b8]">Sistema de Seguridad Ciudadana</p>
        </div>

        {/* Tarjeta */}
        <div className="rounded-2xl border border-[#334155] bg-[#1e293b] p-6 shadow-xl sm:p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-[#f8fafc] text-balance">{title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-[#94a3b8] text-pretty">{subtitle}</p>
          </div>
          {children}
        </div>

        {footer && <div className="mt-6 text-center text-sm text-[#94a3b8]">{footer}</div>}
      </div>
    </main>
  )
}

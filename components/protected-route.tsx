"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { isPolicia } from "@/lib/roles"

const POLICIA_HOME = "/patrullaje-map"
const ADMIN_PREFIXES = ["/", "/alertas", "/patrullaje", "/reportes"]

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login")
      return
    }

    if (!isLoading && isAuthenticated && isPolicia(user)) {
      const isAdminRoute =
        pathname !== POLICIA_HOME &&
        ADMIN_PREFIXES.some(
          (p) => p === pathname || (p !== "/" && pathname.startsWith(p)),
        )
      if (isAdminRoute) {
        router.replace(POLICIA_HOME)
      }
    }
  }, [isLoading, isAuthenticated, user, router, pathname])

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f172a]">
        <Loader2 className="h-6 w-6 animate-spin text-[#6366f1]" />
      </div>
    )
  }

  return <>{children}</>
}

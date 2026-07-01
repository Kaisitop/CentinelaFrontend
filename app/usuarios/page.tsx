"use client"

import type React from "react"

import { useCallback, useEffect, useState } from "react"
import { Loader2, UserPlus } from "lucide-react"
import { Sidebar } from "@/components/sidebar"
import { ProtectedRoute } from "@/components/protected-route"
import { authService, type CreatePanelUserPayload, type PanelUser } from "@/lib/auth-service"
import { getApiErrorMessage } from "@/lib/api"
import { UsuarioImportSection } from "@/components/usuarios/usuario-import-section"
import { toast } from "sonner"

const ROL_BADGE: Record<string, string> = {
  Admin: "bg-[#8b5cf6]/20 text-[#c4b5fd]",
  Operador: "bg-[#6366f1]/20 text-[#a5b4fc]",
  Policia: "bg-[#0ea5e9]/20 text-[#7dd3fc]",
}

function UsuariosContent() {
  const [users, setUsers] = useState<PanelUser[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<CreatePanelUserPayload>({
    nombre: "",
    email: "",
    telefono: "",
    rolNombre: "Operador",
  })
  const [filterRol, setFilterRol] = useState<"todos" | "Admin" | "Operador" | "Policia">("todos")

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await authService.listPanelUsers(
        filterRol === "todos" ? undefined : filterRol,
      )
      setUsers(data)
    } catch (err) {
      toast.error(getApiErrorMessage(err, "No se pudo cargar la lista de usuarios."))
    } finally {
      setLoading(false)
    }
  }, [filterRol])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const result = await authService.createPanelUser({
        ...form,
        telefono: form.telefono?.trim() || undefined,
      })
      toast.success(result.message ?? "Usuario creado correctamente.")
      setForm({ nombre: "", email: "", telefono: "", rolNombre: "Operador" })
      await loadUsers()
    } catch (err) {
      toast.error(getApiErrorMessage(err, "No se pudo crear el usuario."))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-[#0f172a]">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Gestión de usuarios</h1>
          <p className="mt-1 text-sm text-[#94a3b8]">
            Crea cuentas de operadores y patrulleros. Recibirán un correo para establecer su contraseña.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
          <div className="flex flex-col gap-8">
          <section className="rounded-xl border border-[#334155] bg-[#1e293b] p-6">
            <div className="mb-4 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-[#6366f1]" />
              <h2 className="text-lg font-semibold text-white">Nuevo usuario</h2>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label htmlFor="nombre" className="mb-1.5 block text-sm font-medium text-[#e2e8f0]">
                  Nombre completo
                </label>
                <input
                  id="nombre"
                  required
                  value={form.nombre}
                  onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  className="w-full rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2.5 text-sm text-white"
                />
              </div>
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[#e2e8f0]">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2.5 text-sm text-white"
                />
              </div>
              <div>
                <label htmlFor="telefono" className="mb-1.5 block text-sm font-medium text-[#e2e8f0]">
                  Teléfono <span className="text-[#64748b]">(opcional)</span>
                </label>
                <input
                  id="telefono"
                  value={form.telefono ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                  className="w-full rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2.5 text-sm text-white"
                />
              </div>
              <div>
                <label htmlFor="rol" className="mb-1.5 block text-sm font-medium text-[#e2e8f0]">
                  Rol
                </label>
                <select
                  id="rol"
                  value={form.rolNombre}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      rolNombre: e.target.value as CreatePanelUserPayload["rolNombre"],
                    }))
                  }
                  className="w-full rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2.5 text-sm text-white"
                >
                  <option value="Operador">Operador</option>
                  <option value="Policia">Policía</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center justify-center gap-2 rounded-lg bg-[#6366f1] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#4f46e5] disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? "Creando..." : "Crear y enviar invitación"}
              </button>
            </form>
          </section>

          <UsuarioImportSection onImported={loadUsers} />
          </div>

          <section className="rounded-xl border border-[#334155] bg-[#1e293b] overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#334155] px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Personal del panel</h2>
                {!loading && (
                  <p className="mt-0.5 text-xs text-[#64748b]">
                    {users.length} usuario{users.length !== 1 ? "s" : ""}
                    {filterRol !== "todos" ? ` · ${filterRol}` : ""}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="filter-rol" className="text-sm text-[#94a3b8]">
                  Rol
                </label>
                <select
                  id="filter-rol"
                  value={filterRol}
                  onChange={(e) =>
                    setFilterRol(e.target.value as typeof filterRol)
                  }
                  className="rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2 text-sm text-white focus:border-[#6366f1] focus:outline-none"
                >
                  <option value="todos">Todos</option>
                  <option value="Admin">Admin</option>
                  <option value="Operador">Operador</option>
                  <option value="Policia">Policía</option>
                </select>
              </div>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-[#6366f1]" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#334155] text-left text-[#94a3b8]">
                      <th className="px-6 py-3 font-medium">Nombre</th>
                      <th className="px-6 py-3 font-medium">Correo</th>
                      <th className="px-6 py-3 font-medium">Rol</th>
                      <th className="px-6 py-3 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-[#334155]/60 hover:bg-[#0f172a]/40">
                        <td className="px-6 py-3 text-white">{u.nombre}</td>
                        <td className="px-6 py-3 text-[#cbd5e1]">{u.email}</td>
                        <td className="px-6 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              ROL_BADGE[u.rol] ?? "bg-[#334155] text-[#94a3b8]"
                            }`}
                          >
                            {u.rol}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`text-xs ${u.activo ? "text-[#22c55e]" : "text-[#ef4444]"}`}
                          >
                            {u.activo ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-10 text-center text-[#64748b]">
                          {filterRol === "todos"
                            ? "No hay usuarios registrados."
                            : `No hay usuarios con rol ${filterRol}.`}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

export default function UsuariosPage() {
  return (
    <ProtectedRoute>
      <UsuariosContent />
    </ProtectedRoute>
  )
}

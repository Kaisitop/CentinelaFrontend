"use client"

import type React from "react"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  CheckCircle2,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  Search,
  Shield,
  User,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react"
import { Sidebar } from "@/components/sidebar"
import { ProtectedRoute } from "@/components/protected-route"
import { authService, type CreatePanelUserPayload, type PanelUser } from "@/lib/auth-service"
import { getApiErrorMessage } from "@/lib/api"
import { UsuarioImportSection } from "@/components/usuarios/usuario-import-section"
import { UsuarioBajaDialog } from "@/components/usuarios/usuario-baja-dialog"
import { toast } from "sonner"

const ROL_UI: Record<
  string,
  { label: string; badge: string; color: string; icon: typeof Shield }
> = {
  Admin: {
    label: "Admin",
    badge: "bg-[#8b5cf6]/15 text-[#c4b5fd] ring-1 ring-[#8b5cf6]/30",
    color: "#8b5cf6",
    icon: Shield,
  },
  Operador: {
    label: "Operador",
    badge: "bg-[#6366f1]/15 text-[#a5b4fc] ring-1 ring-[#6366f1]/30",
    color: "#6366f1",
    icon: Users,
  },
  Policia: {
    label: "Policía",
    badge: "bg-[#0ea5e9]/15 text-[#7dd3fc] ring-1 ring-[#0ea5e9]/30",
    color: "#0ea5e9",
    icon: User,
  },
}

function initials(nombre: string) {
  const parts = nombre.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

function formatRelativeDate(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffD = Math.floor(diffMs / 86400000)
  if (diffD < 1) return "hoy"
  if (diffD === 1) return "ayer"
  if (diffD < 30) return `hace ${diffD} días`
  return new Date(iso).toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function UsuariosContent() {
  const [users, setUsers] = useState<PanelUser[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<CreatePanelUserPayload>({
    nombre: "",
    email: "",
    telefono: "",
    rolNombre: "Operador",
  })
  const [filterRol, setFilterRol] = useState<"todos" | "Admin" | "Operador" | "Policia">("todos")
  const [filterEstado, setFilterEstado] = useState<"todos" | "activos" | "inactivos">("todos")
  const [searchTerm, setSearchTerm] = useState("")
  const [userToDeactivate, setUserToDeactivate] = useState<PanelUser | null>(null)
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null)

  const currentUser = authService.getCurrentUser()

  const loadUsers = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    try {
      // Cargamos todos y filtramos en cliente para que las tarjetas de resumen
      // siempre muestren la distribución completa.
      const data = await authService.listPanelUsers()
      setUsers(data)
    } catch (err) {
      toast.error(getApiErrorMessage(err, "No se pudo cargar la lista de usuarios."))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

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
      await loadUsers(true)
    } catch (err) {
      toast.error(getApiErrorMessage(err, "No se pudo crear el usuario."))
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmDeactivate = async () => {
    if (!userToDeactivate) return
    setDeactivatingId(userToDeactivate.id)
    try {
      const result = await authService.deactivateUser(userToDeactivate.id)
      toast.success(result.message ?? "Usuario dado de baja correctamente.")
      setUserToDeactivate(null)
      await loadUsers(true)
    } catch (err) {
      toast.error(getApiErrorMessage(err, "No se pudo dar de baja al usuario."))
    } finally {
      setDeactivatingId(null)
    }
  }

  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return users.filter((u) => {
      const matchRol = filterRol === "todos" || u.rol === filterRol
      const matchEstado =
        filterEstado === "todos" ||
        (filterEstado === "activos" && u.activo) ||
        (filterEstado === "inactivos" && !u.activo)
      const matchSearch =
        !q ||
        u.nombre.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.telefono ?? "").toLowerCase().includes(q)
      return matchRol && matchEstado && matchSearch
    })
  }, [users, filterRol, filterEstado, searchTerm])

  const stats = useMemo(
    () => ({
      total: users.length,
      activos: users.filter((u) => u.activo).length,
      inactivos: users.filter((u) => !u.activo).length,
      operadores: users.filter((u) => u.rol === "Operador").length,
      policias: users.filter((u) => u.rol === "Policia").length,
      admins: users.filter((u) => u.rol === "Admin").length,
    }),
    [users],
  )

  const activeFilterCount =
    (filterRol !== "todos" ? 1 : 0) +
    (filterEstado !== "todos" ? 1 : 0) +
    (searchTerm.trim() ? 1 : 0)

  const resetFilters = () => {
    setFilterRol("todos")
    setFilterEstado("todos")
    setSearchTerm("")
  }

  const inputClass =
    "w-full rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2.5 text-sm text-white placeholder-[#64748b] focus:border-[#6366f1] focus:outline-none"

  return (
    <div className="flex min-h-screen bg-[#0f172a]">
      <Sidebar />
      <main className="ml-64 flex-1 p-8">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Gestión de usuarios</h1>
            <p className="mt-1 text-[#94a3b8]">
              Crea cuentas de operadores y patrulleros, impórtalas en lote o da de baja personal
              inactivo.
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadUsers(true)}
            disabled={refreshing || loading}
            className="flex items-center gap-2 rounded-lg border border-[#334155] bg-[#1e293b] px-3 py-2 text-sm text-[#94a3b8] transition-colors hover:border-[#6366f1]/50 hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Actualizar
          </button>
        </header>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {(
            [
              {
                key: "total",
                label: "Total",
                count: stats.total,
                color: "text-white",
                onClick: () => {
                  setFilterRol("todos")
                  setFilterEstado("todos")
                },
                active: filterRol === "todos" && filterEstado === "todos",
              },
              {
                key: "activos",
                label: "Activos",
                count: stats.activos,
                color: "text-[#22c55e]",
                onClick: () => setFilterEstado("activos"),
                active: filterEstado === "activos",
              },
              {
                key: "inactivos",
                label: "Inactivos",
                count: stats.inactivos,
                color: "text-[#ef4444]",
                onClick: () => setFilterEstado("inactivos"),
                active: filterEstado === "inactivos",
              },
              {
                key: "operadores",
                label: "Operadores",
                count: stats.operadores,
                color: "text-[#a5b4fc]",
                onClick: () => setFilterRol("Operador"),
                active: filterRol === "Operador",
              },
              {
                key: "policias",
                label: "Policías",
                count: stats.policias,
                color: "text-[#7dd3fc]",
                onClick: () => setFilterRol("Policia"),
                active: filterRol === "Policia",
              },
              {
                key: "admins",
                label: "Admins",
                count: stats.admins,
                color: "text-[#c4b5fd]",
                onClick: () => setFilterRol("Admin"),
                active: filterRol === "Admin",
              },
            ] as const
          ).map((stat) => (
            <button
              key={stat.key}
              type="button"
              onClick={stat.onClick}
              className={`rounded-lg border p-4 text-left transition-colors ${
                stat.active
                  ? "border-[#6366f1] bg-[#6366f1]/10"
                  : "border-[#334155] bg-[#1e293b] hover:border-[#475569]"
              }`}
            >
              <p className="text-sm text-[#94a3b8]">{stat.label}</p>
              <p className={`text-2xl font-bold tabular-nums ${stat.color}`}>
                {loading ? "—" : stat.count}
              </p>
            </button>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
          {/* Columna izquierda: crear + importar */}
          <div className="flex flex-col gap-6">
            <section className="rounded-xl border border-[#334155] bg-[#1e293b] p-6">
              <div className="mb-1 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#6366f1]/15 ring-1 ring-[#6366f1]/30">
                  <UserPlus className="h-4 w-4 text-[#a5b4fc]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Nuevo usuario</h2>
                  <p className="text-xs text-[#64748b]">Se envía invitación por correo</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
                <div>
                  <label htmlFor="nombre" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#64748b]">
                    Nombre completo
                  </label>
                  <input
                    id="nombre"
                    required
                    placeholder="Ej. María López"
                    value={form.nombre}
                    onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#64748b]">
                    Correo electrónico
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    placeholder="usuario@institucion.gob.ec"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="telefono" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#64748b]">
                    Teléfono <span className="normal-case text-[#475569]">(opcional)</span>
                  </label>
                  <input
                    id="telefono"
                    placeholder="0999999999"
                    value={form.telefono ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="rol" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#64748b]">
                    Rol
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        { value: "Operador", label: "Operador", desc: "Centro de comando" },
                        { value: "Policia", label: "Policía", desc: "Patrullaje en campo" },
                      ] as const
                    ).map((rol) => (
                      <button
                        key={rol.value}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, rolNombre: rol.value }))}
                        className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
                          form.rolNombre === rol.value
                            ? "border-[#6366f1] bg-[#6366f1]/10"
                            : "border-[#334155] bg-[#0f172a] hover:border-[#475569]"
                        }`}
                      >
                        <p className="text-sm font-medium text-white">{rol.label}</p>
                        <p className="mt-0.5 text-[11px] text-[#64748b]">{rol.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-[#6366f1] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4f46e5] disabled:opacity-60"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {submitting ? "Creando…" : "Crear y enviar invitación"}
                </button>
              </form>
            </section>

            <UsuarioImportSection onImported={() => loadUsers(true)} />
          </div>

          {/* Columna derecha: listado */}
          <section className="overflow-hidden rounded-xl border border-[#334155] bg-[#1e293b]">
            <div className="flex flex-wrap items-center gap-3 border-b border-[#334155] px-5 py-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[#6366f1]" />
                <h2 className="text-lg font-semibold text-white">Personal del panel</h2>
                <span className="rounded-full bg-[#0f172a] px-2.5 py-1 text-[11px] text-[#64748b] ring-1 ring-[#334155]">
                  {filteredUsers.length} de {users.length}
                </span>
              </div>

              <div className="relative min-w-[200px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748b]" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, correo o teléfono…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-[#334155] bg-[#0f172a] py-2 pl-9 pr-8 text-sm text-white placeholder-[#64748b] focus:border-[#6366f1] focus:outline-none"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[#64748b] hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <select
                value={filterRol}
                onChange={(e) => setFilterRol(e.target.value as typeof filterRol)}
                className="rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2 text-sm text-white focus:border-[#6366f1] focus:outline-none"
              >
                <option value="todos">Todos los roles</option>
                <option value="Admin">Admin</option>
                <option value="Operador">Operador</option>
                <option value="Policia">Policía</option>
              </select>

              <select
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value as typeof filterEstado)}
                className="rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2 text-sm text-white focus:border-[#6366f1] focus:outline-none"
              >
                <option value="todos">Todos los estados</option>
                <option value="activos">Activos</option>
                <option value="inactivos">Inactivos</option>
              </select>

              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="flex items-center gap-1.5 rounded-lg border border-[#334155] px-3 py-2 text-sm text-[#94a3b8] transition-colors hover:border-[#ef4444]/40 hover:text-[#fca5a5]"
                >
                  <X className="h-4 w-4" />
                  Limpiar
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex flex-col items-center gap-3 py-16">
                <Loader2 className="h-6 w-6 animate-spin text-[#6366f1]" />
                <p className="text-sm text-[#94a3b8]">Cargando usuarios…</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#334155] bg-[#0f172a]">
                  <Users className="h-6 w-6 text-[#64748b]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#e2e8f0]">
                    No hay usuarios con los filtros seleccionados
                  </p>
                  {activeFilterCount > 0 && (
                    <p className="mt-1 text-xs text-[#64748b]">
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="font-medium text-[#818cf8] underline underline-offset-2 hover:text-[#a5b4fc]"
                      >
                        Restablecer los filtros
                      </button>{" "}
                      para ver todos.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="max-h-[720px] divide-y divide-[#334155] overflow-y-auto">
                {filteredUsers.map((u) => {
                  const rolUi = ROL_UI[u.rol] ?? {
                    label: u.rol,
                    badge: "bg-[#334155] text-[#94a3b8]",
                    color: "#64748b",
                    icon: User,
                  }
                  const isSelf = u.id === currentUser?.id
                  const canDeactivate = u.activo && !isSelf

                  return (
                    <div
                      key={u.id}
                      className="flex flex-wrap items-center gap-4 px-5 py-4 transition-colors hover:bg-[#334155]/25"
                    >
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-semibold ring-1"
                        style={{
                          backgroundColor: `${rolUi.color}1a`,
                          color: rolUi.color,
                          // @ts-expect-error CSS var for ring color
                          "--tw-ring-color": `${rolUi.color}40`,
                        }}
                      >
                        {initials(u.nombre)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-medium text-white">{u.nombre}</p>
                          {isSelf && (
                            <span className="rounded bg-[#334155] px-1.5 py-0.5 text-[10px] font-medium text-[#94a3b8]">
                              Tú
                            </span>
                          )}
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${rolUi.badge}`}
                          >
                            {rolUi.label}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#64748b]">
                          <span className="inline-flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {u.email}
                          </span>
                          {u.telefono && (
                            <span className="inline-flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {u.telefono}
                            </span>
                          )}
                          <span title={new Date(u.createdAt).toLocaleString()}>
                            Alta {formatRelativeDate(u.createdAt)}
                          </span>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-medium ring-1 ${
                              u.activo
                                ? "bg-[#22c55e]/15 text-[#86efac] ring-[#22c55e]/30"
                                : "bg-[#ef4444]/15 text-[#fca5a5] ring-[#ef4444]/30"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                u.activo ? "bg-[#22c55e]" : "bg-[#ef4444]"
                              }`}
                            />
                            {u.activo ? "Activo" : "Inactivo"}
                          </span>
                          {u.emailVerificado ? (
                            <span
                              className="inline-flex items-center gap-1 rounded-full bg-[#22c55e]/10 px-2 py-1 text-[11px] text-[#86efac]"
                              title="Correo verificado"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              Verificado
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 rounded-full bg-[#f59e0b]/10 px-2 py-1 text-[11px] text-[#fcd34d]"
                              title="Pendiente de verificar correo"
                            >
                              <Mail className="h-3 w-3" />
                              Sin verificar
                            </span>
                          )}
                        </div>

                        {canDeactivate ? (
                          <button
                            type="button"
                            onClick={() => setUserToDeactivate(u)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#ef4444]/30 bg-[#ef4444]/10 px-3 py-1.5 text-xs font-medium text-[#fca5a5] transition-colors hover:bg-[#ef4444]/20"
                          >
                            <UserMinus className="h-3.5 w-3.5" />
                            Dar de baja
                          </button>
                        ) : isSelf ? (
                          <span className="text-xs text-[#64748b]">Tu cuenta</span>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>

        <UsuarioBajaDialog
          user={userToDeactivate}
          open={!!userToDeactivate}
          loading={!!userToDeactivate && deactivatingId === userToDeactivate.id}
          onConfirm={handleConfirmDeactivate}
          onOpenChange={(open) => {
            if (!open) setUserToDeactivate(null)
          }}
        />
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

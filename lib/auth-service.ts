  import { api, tokenStorage } from "./api"

// ---- Tipos basados en el README de ms-auth ----
export interface AuthUser {
  id: string
  email: string
  nombre?: string
  rol?: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

export interface RegisterPayload {
  email: string
  password: string
  nombre: string
  telefono?: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface PanelUser {
  id: string
  email: string
  nombre: string
  telefono: string | null
  rol: string
  activo: boolean
  emailVerificado: boolean
  createdAt: string
}

export interface CreatePanelUserPayload {
  email: string
  nombre: string
  telefono?: string
  rolNombre: "Operador" | "Policia"
}

export interface BulkImportUsersResult {
  total: number
  created: number
  skipped: number
  failed: number
  defaultRol: string
  message: string
  results: Array<{
    row: number
    email: string
    nombre: string
    status: "created" | "skipped" | "error"
    message?: string
  }>
}

// ---- Servicio de autenticacion (rutas /api/auth) ----
export const authService = {
  // POST /api/auth/login
  async login(payload: LoginPayload): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>("/auth/login", payload)
    
    if (data.user.rol && data.user.rol.toLowerCase() === "ciudadano") {
      throw new Error("Acceso denegado: Los ciudadanos no pueden acceder al panel administrativo. Por favor use la aplicación móvil.")
    }

    tokenStorage.setSession(data.accessToken, data.refreshToken, data.user)
    return data
  },

  // POST /api/auth/refresh
  async refresh(refreshToken: string) {
    const { data } = await api.post("/auth/refresh", { refreshToken })
    return data
  },

  // POST /api/auth/logout
  async logout() {
    const refreshToken = tokenStorage.getRefreshToken()
    try {
      if (refreshToken) {
        await api.post("/auth/logout", { refreshToken })
      }
    } finally {
      tokenStorage.clear()
    }
  },

  // POST /api/auth/verify-email
  async verifyEmail(token: string) {
    const { data } = await api.post("/auth/verify-email", { token })
    return data
  },

  // POST /api/auth/forgot-password
  async forgotPassword(email: string) {
    const { data } = await api.post("/auth/forgot-password", { email })
    return data
  },

  // POST /api/auth/reset-password
  async resetPassword(token: string, newPassword: string) {
    const { data } = await api.post("/auth/reset-password", { token, newPassword })
    return data
  },

  // POST /api/auth/resend-verification
  async resendVerification(email: string) {
    const { data } = await api.post("/auth/resend-verification", { email })
    return data
  },

  // POST /api/auth/users — alta de operador/policía (solo Admin)
  async createPanelUser(payload: CreatePanelUserPayload) {
    const { data } = await api.post("/auth/users", payload)
    return data
  },

  // POST /api/auth/users/import — importación masiva CSV/XML (solo Admin)
  async importPanelUsers(
    file: File,
    rolNombre: CreatePanelUserPayload["rolNombre"],
  ): Promise<BulkImportUsersResult> {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("rolNombre", rolNombre)

    const { data } = await api.post<BulkImportUsersResult>("/auth/users/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    return data
  },

  // GET /api/auth/users — listado de personal del panel (solo Admin)
  async listPanelUsers(rol?: string): Promise<PanelUser[]> {
    const { data } = await api.get<PanelUser[]>("/auth/users", {
      params: rol ? { rol } : undefined,
    })
    return data
  },

  // DELETE /api/auth/user/:userId  (requiere permiso usuarios:update)
  async deactivateUser(userId: string) {
    const { data } = await api.delete(`/auth/user/${userId}`)
    return data
  },

  // Helpers de sesion local
  isAuthenticated: () => !!tokenStorage.getAccessToken(),
  getCurrentUser: () => tokenStorage.getUser() as AuthUser | null,
}

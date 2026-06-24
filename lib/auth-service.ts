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

// ---- Servicio de autenticacion (rutas /api/auth) ----
export const authService = {
  // POST /api/auth/register
  async register(payload: RegisterPayload) {
    const { data } = await api.post("/auth/register", payload)
    if (data.tokenVerifEmail) {
      console.log("=== TOKEN PARA VERIFICAR EMAIL (SOLO PARA PRUEBAS) ===")
      console.log(`URL sugerida: /verify-email?token=${data.tokenVerifEmail}`)
      console.log("Token:", data.tokenVerifEmail)
    }
    return data
  },

  // POST /api/auth/login
  async login(payload: LoginPayload): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>("/auth/login", payload)
    
    // RESTRICCIÓN DE DASHBOARD: No permitir acceso a ciudadanos
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
    if (data.tokenResetPwd) {
      console.log("=== TOKEN PARA RESETEAR CONTRASEÑA (SOLO PARA PRUEBAS) ===")
      console.log(`URL sugerida: /reset-password?token=${data.tokenResetPwd}`)
      console.log("Token:", data.tokenResetPwd)
    }
    return data
  },

  // POST /api/auth/reset-password
  async resetPassword(token: string, newPassword: string) {
    const { data } = await api.post("/auth/reset-password", { token, newPassword })
    return data
  },

  // DELETE /api/auth/user/:userId  (requiere permiso usuarios:eliminar)
  async deactivateUser(userId: string) {
    const { data } = await api.delete(`/auth/user/${userId}`)
    return data
  },

  // Helpers de sesion local
  isAuthenticated: () => !!tokenStorage.getAccessToken(),
  getCurrentUser: () => tokenStorage.getUser() as AuthUser | null,
}

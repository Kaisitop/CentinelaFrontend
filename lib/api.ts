import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios"

// Base URL del gateway.
// En Vercel usa "/gateway" (rewrite HTTPS → EC2) para evitar Mixed Content.
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/gateway"

// Claves de almacenamiento para los tokens
const ACCESS_TOKEN_KEY = "centinela_access_token"
const REFRESH_TOKEN_KEY = "centinela_refresh_token"
const USER_KEY = "centinela_user"

// ---- Helpers de almacenamiento de tokens ----
export const tokenStorage = {
  getAccessToken: () => (typeof window !== "undefined" ? localStorage.getItem(ACCESS_TOKEN_KEY) : null),
  getRefreshToken: () => (typeof window !== "undefined" ? localStorage.getItem(REFRESH_TOKEN_KEY) : null),
  getUser: () => {
    if (typeof window === "undefined") return null
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  },
  setSession: (accessToken: string, refreshToken: string, user: unknown) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  },
  setAccessToken: (accessToken: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  },
  clear: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  },
}

// ---- Instancia principal de axios ----
export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

// Interceptor de request: agrega el accessToken a cada peticion
api.interceptors.request.use((config) => {
  const token = tokenStorage.getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ---- Manejo de refresh token automatico ----
let isRefreshing = false
let pendingRequests: Array<(token: string) => void> = []

function onTokenRefreshed(token: string) {
  pendingRequests.forEach((cb) => cb(token))
  pendingRequests = []
}

// Interceptor de response: si 401, intenta refrescar el token una vez
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // Solo intentamos refrescar en 401 que no sea de las rutas de auth
    const isAuthRoute = originalRequest.url?.includes("/auth/login") || originalRequest.url?.includes("/auth/refresh")

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      const refreshToken = tokenStorage.getRefreshToken()

      if (!refreshToken) {
        tokenStorage.clear()
        if (typeof window !== "undefined") window.location.href = "/login"
        return Promise.reject(error)
      }

      // Si ya hay un refresh en curso, encolamos esta peticion
      if (isRefreshing) {
        return new Promise((resolve) => {
          pendingRequests.push((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            resolve(api(originalRequest))
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken })
        const newAccessToken = data.accessToken
        tokenStorage.setAccessToken(newAccessToken)
        if (data.refreshToken) {
          localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken)
        }
        onTokenRefreshed(newAccessToken)
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return api(originalRequest)
      } catch (refreshError) {
        tokenStorage.clear()
        if (typeof window !== "undefined") window.location.href = "/login"
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  },
)

// Helper para extraer un mensaje de error legible
export function getApiErrorMessage(error: unknown, fallback = "Ocurrió un error. Intenta nuevamente."): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[] } | undefined
    if (data?.message) {
      return Array.isArray(data.message) ? data.message.join(", ") : data.message
    }
    if (error.code === "ERR_NETWORK") {
      return "No se pudo conectar con el servidor. Verifica que la API esté disponible."
    }
  } else if (error instanceof Error) {
    return error.message
  }
  return fallback
}

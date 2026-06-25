import type { AuthUser } from "./auth-service";

export function isPolicia(user: AuthUser | null | undefined): boolean {
  return user?.rol?.toLowerCase() === "policia";
}

export function getDefaultRouteForRole(rol?: string): string {
  if (rol?.toLowerCase() === "policia") return "/patrullaje-map";
  return "/";
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { PushNotificationsControl } from "@/components/push-notifications-control";
import { coreService } from "@/lib/core-service";
import { useCentinelaRealtime } from "@/lib/use-centinela-realtime";
import { isAdmin } from "@/lib/roles";

const navigation = [
  {
    name: "Dashboard",
    href: "/",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    name: "Alertas",
    href: "/alertas",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  {
    name: "Patrullaje",
    href: "/patrullaje",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
  },
  {
    name: "Reportes",
    href: "/reportes",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
];

function isNavActive(pathname: string, href: string) {
  if (href === "#") return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [alertasAbiertas, setAlertasAbiertas] = useState(0);

  const loadAlertasCount = useCallback(async () => {
    try {
      const alertas = await coreService.getAlertas();
      setAlertasAbiertas(
        alertas.filter((a) => a.estado === "activa" || a.estado === "reconocida").length,
      );
    } catch {
      setAlertasAbiertas(0);
    }
  }, []);

  useEffect(() => {
    void loadAlertasCount();
  }, [loadAlertasCount]);

  useCentinelaRealtime({
    "alerta.created": () => void loadAlertasCount(),
    "alerta.updated": () => void loadAlertasCount(),
  });

  const displayName = user?.nombre || user?.email?.split("@")[0] || "Usuario";
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-[#1e293b] border-r border-[#334155] flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-[#334155]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center shadow-lg shadow-[#6366f1]/30">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">CENTINELA</h1>
            <p className="text-xs text-[#94a3b8]">Seguridad Ciudadana</p>
          </div>
        </div>
      </div>

      {/* Status indicator */}
      <div className="px-6 py-3 border-b border-[#334155]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse"></span>
          <span className="text-xs text-[#94a3b8]">Sistema Operativo</span>
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs">
          <span className="text-[#64748b]">Nodos: <span className="text-[#22c55e]">48/52</span></span>
          <span className="text-[#64748b]">Alertas: <span className="text-[#ef4444]">{alertasAbiertas}</span></span>
        </div>
      </div>

      {/* Push notifications */}
      <div className="px-2 py-3 border-b border-[#334155]">
        <PushNotificationsControl />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <p className="px-4 text-xs font-medium text-[#64748b] uppercase tracking-wider mb-2">Menu Principal</p>
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive = isNavActive(pathname, item.href);
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-[#6366f1] text-white"
                      : "text-[#94a3b8] hover:bg-[#334155] hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span className="font-medium">{item.name}</span>
                  </div>
                  {item.name === "Alertas" && alertasAbiertas > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      isActive ? "bg-white/20 text-white" : "bg-[#ef4444] text-white"
                    }`}>
                      {alertasAbiertas}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        <p className="px-4 text-xs font-medium text-[#64748b] uppercase tracking-wider mb-2 mt-6">Sistema</p>
        <ul className="space-y-1">
          {isAdmin(user) && (
            <li>
              <Link
                href="/usuarios"
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isNavActive(pathname, "/usuarios")
                    ? "bg-[#6366f1] text-white"
                    : "text-[#94a3b8] hover:bg-[#334155] hover:text-white"
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span className="font-medium">Usuarios</span>
              </Link>
            </li>
          )}
          <li>
            <Link
              href="/nodos-iot"
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isNavActive(pathname, "/nodos-iot")
                  ? "bg-[#6366f1] text-white"
                  : "text-[#94a3b8] hover:bg-[#334155] hover:text-white"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
              <span className="font-medium">Nodos IoT</span>
            </Link>
          </li>
          <li>
            <Link
              href="#"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-[#94a3b8] hover:bg-[#334155] hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="font-medium">Configuracion</span>
            </Link>
          </li>
        </ul>
      </nav>

      {/* User */}
      <div className="p-4 border-t border-[#334155]">
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[#334155] transition-colors">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center shrink-0">
            <span className="text-sm font-medium text-white">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{displayName}</p>
            <p className="text-xs text-[#94a3b8] truncate">{user?.email || "Sin sesión"}</p>
          </div>
          <button
            onClick={() => logout()}
            className="text-[#64748b] hover:text-[#ef4444] transition-colors"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}

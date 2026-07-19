"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  Map,
  Settings,
  Shield,
  Trash2,
  User,
  Wifi,
} from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/components/auth-provider";
import { isAdmin, isPolicia } from "@/lib/roles";
import { CuentaSection } from "@/components/configuracion/cuenta-section";
import { AlertasSection } from "@/components/configuracion/alertas-section";
import { VistaSection } from "@/components/configuracion/vista-section";
import { SistemaSection } from "@/components/configuracion/sistema-section";
import { MantenimientoSection } from "@/components/configuracion/mantenimiento-section";

const NAV_ITEMS = [
  { id: "cuenta", label: "Mi cuenta", icon: User },
  { id: "alertas", label: "Alertas", icon: Bell },
  { id: "vista", label: "Vista del mapa", icon: Map },
  { id: "patrullaje", label: "Patrullaje", icon: Shield, policiaOnly: true },
  { id: "sistema", label: "Sistema", icon: Wifi },
  { id: "mantenimiento", label: "Mantenimiento", icon: Trash2, adminOnly: true },
] as const;

export default function ConfiguracionPage() {
  const { user } = useAuth();
  const [activeId, setActiveId] = useState("cuenta");
  const showPatrullaje = isPolicia(user);
  const showMantenimiento = isAdmin(user);

  const navItems = NAV_ITEMS.filter((item) => {
    if ("policiaOnly" in item && item.policiaOnly && !showPatrullaje) return false;
    if ("adminOnly" in item && item.adminOnly && !showMantenimiento) return false;
    return true;
  });

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    const ids = navItems.map((n) => n.id);

    for (const id of ids) {
      const el = document.getElementById(id);
      if (!el) continue;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveId(id);
        },
        { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
      );
      observer.observe(el);
      observers.push(observer);
    }

    return () => observers.forEach((o) => o.disconnect());
  }, [navItems.length, showPatrullaje, showMantenimiento]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#0f172a]">
        <Sidebar />
        <main className="ml-64 p-8">
          <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[#6366f1]">
                <Settings className="h-5 w-5" />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  Preferencias
                </span>
              </div>
              <h1 className="text-3xl font-bold text-white">Configuración</h1>
              <p className="mt-1 text-[#94a3b8]">
                Cuenta, notificaciones, mapa y conexión con el sistema.
              </p>
            </div>
          </header>

          <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
            {/* Nav lateral */}
            <nav className="lg:sticky lg:top-8">
              <ul className="space-y-1 rounded-xl border border-[#334155] bg-[#1e293b] p-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = activeId === item.id;
                  return (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        onClick={() => setActiveId(item.id)}
                        className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                          active
                            ? "bg-[#6366f1]/15 text-white"
                            : "text-[#94a3b8] hover:bg-[#334155]/40 hover:text-white"
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 ${
                            active ? "text-[#a5b4fc]" : "text-[#64748b]"
                          }`}
                        />
                        {item.label}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Secciones */}
            <div className="max-w-3xl space-y-6">
              <CuentaSection />
              <AlertasSection />
              <VistaSection />
              <SistemaSection />
              <MantenimientoSection />
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

"use client";

import { Globe, Radio, Wifi } from "lucide-react";
import { SettingsCard } from "@/components/configuracion/settings-card";

const WS_ENABLED = process.env.NEXT_PUBLIC_WS_ENABLED === "true";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api";
const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ?? API_URL.replace(/\/api\/?$/, "");

export function SistemaSection() {
  return (
    <section id="sistema" className="scroll-mt-24">
      <SettingsCard
        icon={Wifi}
        title="Sistema"
        description="Conexión con el backend (solo lectura)"
        accent="#94a3b8"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-[#334155]/60 bg-[#0f172a]/50 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[#64748b]">
              <Globe className="h-3.5 w-3.5" />
              API REST
            </div>
            <p className="break-all font-mono text-sm text-[#e2e8f0]">{API_URL}</p>
          </div>
          <div className="rounded-xl border border-[#334155]/60 bg-[#0f172a]/50 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[#64748b]">
              <Radio className="h-3.5 w-3.5" />
              WebSocket
            </div>
            <p className="break-all font-mono text-sm text-[#e2e8f0]">{WS_URL}</p>
          </div>
        </div>

        <div
          className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
            WS_ENABLED
              ? "border-[#22c55e]/25 bg-[#22c55e]/10"
              : "border-[#334155] bg-[#0f172a]/50"
          }`}
        >
          <span className="relative flex h-2.5 w-2.5">
            {WS_ENABLED && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22c55e] opacity-60" />
            )}
            <span
              className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                WS_ENABLED ? "bg-[#22c55e]" : "bg-[#64748b]"
              }`}
            />
          </span>
          <div>
            <p
              className={`text-sm font-medium ${
                WS_ENABLED ? "text-[#86efac]" : "text-[#94a3b8]"
              }`}
            >
              Tiempo real {WS_ENABLED ? "habilitado" : "deshabilitado"}
            </p>
            <p className="text-xs text-[#64748b]">
              {WS_ENABLED
                ? "El panel recibe alertas y actualizaciones al instante."
                : "El panel usa refresco por intervalo según tus preferencias."}
            </p>
          </div>
        </div>
      </SettingsCard>
    </section>
  );
}

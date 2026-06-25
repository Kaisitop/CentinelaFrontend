"use client";

import { Bell, BellOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useOneSignalPush } from "@/components/onesignal-provider";

export function PushNotificationsControl() {
  const { configured, pushState, subscribed, enablePush } = useOneSignalPush();

  if (!configured) {
    return (
      <p className="px-4 text-[11px] text-[#64748b] leading-snug">
        Push web: configura <code className="text-[#94a3b8]">NEXT_PUBLIC_ONESIGNAL_APP_ID</code>
      </p>
    );
  }

  if (pushState === "loading") {
    return (
      <div className="flex items-center gap-2 px-4 py-2 text-xs text-[#64748b]">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Conectando notificaciones…
      </div>
    );
  }

  if (pushState === "granted" && subscribed) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 text-xs text-[#22c55e]">
        <Bell className="w-3.5 h-3.5" />
        Alertas push activas
      </div>
    );
  }

  if (pushState === "denied") {
    return (
      <div className="px-4 py-2 text-[11px] text-[#f59e0b] leading-snug">
        <div className="flex items-center gap-2 mb-1">
          <BellOff className="w-3.5 h-3.5 shrink-0" />
          Push bloqueado en el navegador
        </div>
        Habilítalo en la configuración del sitio (candado → Notificaciones).
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={async () => {
        const ok = await enablePush();
        if (ok) toast.success("Notificaciones push activadas");
        else toast.message("Permiso pendiente o denegado");
      }}
      className="mx-4 mb-2 w-[calc(100%-2rem)] flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#6366f1]/20 hover:bg-[#6366f1]/30 text-[#a5b4fc] text-xs font-medium transition-colors"
    >
      <Bell className="w-3.5 h-3.5" />
      Activar alertas push
    </button>
  );
}

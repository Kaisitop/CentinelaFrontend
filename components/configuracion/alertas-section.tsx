"use client";

import { Bell, BellOff, Loader2, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { useOneSignalPush } from "@/components/onesignal-provider";
import { useUserPreferences } from "@/lib/use-user-preferences";
import { Switch } from "@/components/ui/switch";
import {
  SettingsCard,
  SettingsRow,
} from "@/components/configuracion/settings-card";

export function AlertasSection() {
  const { configured, pushState, subscribed, enablePush } = useOneSignalPush();
  const { prefs, update } = useUserPreferences();

  return (
    <section id="alertas" className="scroll-mt-24">
      <SettingsCard
        icon={Bell}
        title="Alertas"
        description="Sonido del panel y notificaciones push del navegador"
        accent="#f59e0b"
      >
        <SettingsRow
          label="Sonido al recibir alerta"
          description="Emite un tono breve cuando llega una alerta por tiempo real."
        >
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-[#64748b]" />
            <Switch
              id="alert-sound"
              checked={prefs.alertSoundEnabled}
              onCheckedChange={(checked) => update({ alertSoundEnabled: checked })}
            />
          </div>
        </SettingsRow>

        <div className="border-t border-[#334155] pt-5">
          <p className="mb-3 text-sm font-medium text-white">
            Notificaciones push (OneSignal)
          </p>

          {!configured && (
            <div className="rounded-lg border border-[#334155] bg-[#0f172a]/60 px-4 py-3 text-xs text-[#94a3b8]">
              Push web no configurado. Define{" "}
              <code className="rounded bg-[#1e293b] px-1 text-[#cbd5e1]">
                NEXT_PUBLIC_ONESIGNAL_APP_ID
              </code>{" "}
              en el entorno.
            </div>
          )}

          {configured && pushState === "loading" && (
            <div className="flex items-center gap-2 rounded-lg border border-[#334155] bg-[#0f172a]/60 px-4 py-3 text-sm text-[#94a3b8]">
              <Loader2 className="h-4 w-4 animate-spin text-[#6366f1]" />
              Conectando notificaciones…
            </div>
          )}

          {configured && pushState === "granted" && subscribed && (
            <div className="flex items-center gap-2 rounded-lg border border-[#22c55e]/25 bg-[#22c55e]/10 px-4 py-3 text-sm text-[#86efac]">
              <Bell className="h-4 w-4" />
              Alertas push activas en este navegador
            </div>
          )}

          {configured && pushState === "denied" && (
            <div className="space-y-1 rounded-lg border border-[#f59e0b]/25 bg-[#f59e0b]/10 px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-[#fcd34d]">
                <BellOff className="h-4 w-4" />
                Push bloqueado en el navegador
              </div>
              <p className="text-xs text-[#94a3b8]">
                Habilítalo en la configuración del sitio (candado → Notificaciones).
              </p>
            </div>
          )}

          {configured &&
            pushState !== "loading" &&
            !(pushState === "granted" && subscribed) &&
            pushState !== "denied" && (
              <button
                type="button"
                onClick={async () => {
                  const ok = await enablePush();
                  if (ok) toast.success("Notificaciones push activadas");
                  else toast.message("Permiso pendiente o denegado");
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-[#6366f1]/20 px-4 py-2.5 text-sm font-medium text-[#a5b4fc] transition-colors hover:bg-[#6366f1]/30"
              >
                <Bell className="h-4 w-4" />
                Activar alertas push
              </button>
            )}
        </div>
      </SettingsCard>
    </section>
  );
}

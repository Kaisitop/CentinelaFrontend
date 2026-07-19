"use client";

import { Map, Navigation, RefreshCw } from "lucide-react";
import { useUserPreferences } from "@/lib/use-user-preferences";
import type { GpsIntervalSec, RefreshIntervalSec } from "@/lib/user-preferences";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isPolicia } from "@/lib/roles";
import { useAuth } from "@/components/auth-provider";
import {
  SettingsCard,
  SettingsRow,
} from "@/components/configuracion/settings-card";

export function VistaSection() {
  const { prefs, update } = useUserPreferences();
  const { user } = useAuth();
  const showPatrullaje = isPolicia(user);

  return (
    <>
      <section id="vista" className="scroll-mt-24">
        <SettingsCard
          icon={Map}
          title="Vista del mapa"
          description="Capas visibles y refresco automático del panel"
          accent="#22c55e"
        >
          <SettingsRow
            label="Mostrar zonas"
            description="Polígonos de riesgo en el mapa principal."
          >
            <Switch
              checked={prefs.mapShowZonas}
              onCheckedChange={(checked) => update({ mapShowZonas: checked })}
            />
          </SettingsRow>
          <SettingsRow
            label="Mostrar nodos IoT"
            description="Marcadores de sensores instalados."
          >
            <Switch
              checked={prefs.mapShowNodos}
              onCheckedChange={(checked) => update({ mapShowNodos: checked })}
            />
          </SettingsRow>
          <SettingsRow
            label="Mostrar alertas activas"
            description="Incidentes abiertos sobre el mapa."
          >
            <Switch
              checked={prefs.mapShowAlertas}
              onCheckedChange={(checked) => update({ mapShowAlertas: checked })}
            />
          </SettingsRow>

          <div className="border-t border-[#334155] pt-5">
            <SettingsRow
              label="Actualización automática"
              description="Intervalo de refresco en dashboard y patrullaje (además del tiempo real)."
            >
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-[#64748b]" />
                <Select
                  value={String(prefs.refreshIntervalSec)}
                  onValueChange={(value) =>
                    update({ refreshIntervalSec: Number(value) as RefreshIntervalSec })
                  }
                >
                  <SelectTrigger className="w-44 border-[#334155] bg-[#0f172a] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-[#334155] bg-[#1e293b] text-white">
                    <SelectItem value="0">Solo tiempo real</SelectItem>
                    <SelectItem value="30">Cada 30 segundos</SelectItem>
                    <SelectItem value="60">Cada 1 minuto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </SettingsRow>
          </div>
        </SettingsCard>
      </section>

      {showPatrullaje && (
        <section id="patrullaje" className="scroll-mt-24">
          <SettingsCard
            icon={Navigation}
            title="Patrullaje"
            description="Ubicación GPS compartida con el centro de operaciones"
            accent="#0ea5e9"
          >
            <SettingsRow
              label="Compartir ubicación GPS"
              description="Envía tu posición mientras la pestaña de patrullaje está abierta."
            >
              <Switch
                checked={prefs.gpsSharingEnabled}
                onCheckedChange={(checked) => update({ gpsSharingEnabled: checked })}
              />
            </SettingsRow>

            <SettingsRow
              label="Intervalo de envío GPS"
              description="Frecuencia con la que se reporta la posición al servidor."
            >
              <Select
                value={String(prefs.gpsIntervalSec)}
                onValueChange={(value) =>
                  update({ gpsIntervalSec: Number(value) as GpsIntervalSec })
                }
                disabled={!prefs.gpsSharingEnabled}
              >
                <SelectTrigger className="w-44 border-[#334155] bg-[#0f172a] text-white disabled:opacity-50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-[#334155] bg-[#1e293b] text-white">
                  <SelectItem value="15">Cada 15 segundos</SelectItem>
                  <SelectItem value="30">Cada 30 segundos</SelectItem>
                  <SelectItem value="60">Cada 1 minuto</SelectItem>
                </SelectContent>
              </Select>
            </SettingsRow>
          </SettingsCard>
        </section>
      )}
    </>
  );
}

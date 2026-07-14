"use client";

import { useEffect, useState } from "react";
import type { Alerta, Reporte } from "@/lib/core-service";
import { coreService } from "@/lib/core-service";
import {
  getAlertaInformeCampo,
  getAlertaNotasOperador,
} from "@/lib/alert-utils";
import { parseMediaUrls } from "@/lib/parse-media-urls";
import { MediaGallery } from "@/components/ui/media-gallery";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Flag,
  Link2,
  MapPin,
  Shield,
  ShieldAlert,
  User,
  XCircle,
} from "lucide-react";

const ESTADOS: Record<
  string,
  { label: string; bg: string; ring: string; dot: string }
> = {
  PENDIENTE: {
    label: "Pendiente",
    bg: "bg-[#ef4444]/15 text-[#fca5a5]",
    ring: "ring-[#ef4444]/30",
    dot: "bg-[#ef4444]",
  },
  EN_PROCESO: {
    label: "En proceso",
    bg: "bg-[#f59e0b]/15 text-[#fcd34d]",
    ring: "ring-[#f59e0b]/30",
    dot: "bg-[#f59e0b]",
  },
  RESUELTO: {
    label: "Resuelto",
    bg: "bg-[#22c55e]/15 text-[#86efac]",
    ring: "ring-[#22c55e]/30",
    dot: "bg-[#22c55e]",
  },
  FALSO: {
    label: "Falso",
    bg: "bg-[#64748b]/20 text-[#cbd5e1]",
    ring: "ring-[#64748b]/30",
    dot: "bg-[#64748b]",
  },
};

const TIPOS: Record<
  string,
  { label: string; color: string; accent: string; icon: typeof ShieldAlert }
> = {
  PANICO: {
    label: "Pánico",
    color: "text-[#ef4444]",
    accent: "from-[#ef4444]/20 to-transparent",
    icon: ShieldAlert,
  },
  HOMICIDIO_SICARIATO: {
    label: "Homicidio / Sicariato",
    color: "text-[#dc2626]",
    accent: "from-[#dc2626]/20 to-transparent",
    icon: ShieldAlert,
  },
  SECUESTRO: {
    label: "Secuestro",
    color: "text-[#7c3aed]",
    accent: "from-[#7c3aed]/20 to-transparent",
    icon: User,
  },
  ROBO: {
    label: "Robo",
    color: "text-[#f59e0b]",
    accent: "from-[#f59e0b]/20 to-transparent",
    icon: AlertTriangle,
  },
  EXTORSION: {
    label: "Extorsión",
    color: "text-[#ec4899]",
    accent: "from-[#ec4899]/20 to-transparent",
    icon: Flag,
  },
  PERSONA_SOSPECHOSA: {
    label: "Persona sospechosa",
    color: "text-[#6366f1]",
    accent: "from-[#6366f1]/20 to-transparent",
    icon: User,
  },
  VEHICULO_SOSPECHOSO: {
    label: "Vehículo sospechoso",
    color: "text-[#0ea5e9]",
    accent: "from-[#0ea5e9]/20 to-transparent",
    icon: AlertTriangle,
  },
};

function getTipo(tipo: string) {
  return (
    TIPOS[tipo] ?? {
      label: tipo.replace(/_/g, " "),
      color: "text-[#94a3b8]",
      accent: "from-[#334155]/40 to-transparent",
      icon: FileText,
    }
  );
}

function formatFecha(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-EC", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function PrioridadMeter({ nivel = 1 }: { nivel?: number }) {
  const max = 5;
  const color =
    nivel >= 4 ? "bg-[#ef4444]" : nivel >= 3 ? "bg-[#f59e0b]" : "bg-[#22c55e]";

  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1">
        {Array.from({ length: max }, (_, i) => (
          <span
            key={i}
            className={`h-2 w-5 rounded-full transition-colors ${
              i < nivel ? color : "bg-[#334155]"
            }`}
          />
        ))}
      </div>
      <span className="text-sm font-medium text-[#e2e8f0]">{nivel}/5</span>
    </div>
  );
}

function InfoBlock({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof MapPin;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#334155]/80 bg-[#0f172a]/60 p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[#64748b]">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="text-sm leading-relaxed text-[#e2e8f0]">{children}</div>
    </div>
  );
}

export interface ReporteDetailPanelProps {
  reporte: Reporte | null;
  loading?: boolean;
  error?: string | null;
  actionLoading: string | null;
  onTomar: (id: string) => void;
  onResolver: (id: string) => void;
  onMarcarFalso: (id: string) => void;
}

export function ReporteDetailPanel({
  reporte,
  loading,
  error,
  actionLoading,
  onTomar,
  onResolver,
  onMarcarFalso,
}: ReporteDetailPanelProps) {
  const [alertaVinculada, setAlertaVinculada] = useState<Alerta | null>(null);

  useEffect(() => {
    if (!reporte?.id) {
      setAlertaVinculada(null);
      return;
    }
    let cancelled = false;
    coreService
      .getAlertas()
      .then((alertas) => {
        if (cancelled) return;
        setAlertaVinculada(alertas.find((a) => a.reporteId === reporte.id) ?? null);
      })
      .catch(() => {
        if (!cancelled) setAlertaVinculada(null);
      });
    return () => {
      cancelled = true;
    };
  }, [reporte?.id]);

  if (loading && !reporte) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-12">
        <div className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-[#6366f1] border-t-transparent" />
        <p className="text-sm text-[#94a3b8]">Cargando detalle…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center px-6 py-10 text-center">
        <XCircle className="mb-3 h-10 w-10 text-[#ef4444]" />
        <p className="text-sm text-[#fca5a5]">{error}</p>
      </div>
    );
  }

  if (!reporte) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-12 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0f172a] ring-1 ring-[#334155]">
          <FileText className="h-8 w-8 text-[#475569]" />
        </div>
        <p className="text-base font-medium text-[#e2e8f0]">Selecciona un reporte</p>
        <p className="mt-1 max-w-[220px] text-sm text-[#64748b]">
          Elige un caso del listado para ver el detalle y gestionarlo.
        </p>
      </div>
    );
  }

  const tipo = getTipo(reporte.tipo);
  const estado = ESTADOS[reporte.estado ?? ""] ?? {
    label: reporte.estado ?? "—",
    bg: "bg-[#334155]/30 text-[#94a3b8]",
    ring: "ring-[#334155]",
    dot: "bg-[#64748b]",
  };
  const TipoIcon = tipo.icon;
  const zonaNombre =
    reporte.zonaNombre ?? reporte.zona?.nombre ?? "Sin zona asignada";
  const isLoading = actionLoading === reporte.id;
  const canAct =
    reporte.estado === "PENDIENTE" || reporte.estado === "EN_PROCESO";
  const fotosCiudadano = parseMediaUrls(reporte.fotosUrls);
  const informeCampo = alertaVinculada ? getAlertaInformeCampo(alertaVinculada) : null;
  const notasOperadorAlerta = alertaVinculada ? getAlertaNotasOperador(alertaVinculada) : null;
  const notasReporteSolo =
    !alertaVinculada && reporte.notasOperador?.trim() ? reporte.notasOperador.trim() : null;

  return (
    <div className="flex max-h-[calc(100vh-12rem)] flex-col">
      {/* Hero */}
      <div
        className={`relative overflow-hidden border-b border-[#334155] bg-gradient-to-br ${tipo.accent} px-5 py-5`}
      >
        <div className="relative flex items-start gap-4">
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#0f172a]/80 ring-1 ring-[#334155] ${tipo.color}`}
          >
            <TipoIcon className="h-7 w-7" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-[#64748b]">
              Reporte ciudadano
            </p>
            <h3 className="mt-0.5 text-lg font-semibold leading-tight text-white">
              {tipo.label}
            </h3>
            <p className="mt-1 font-mono text-xs text-[#64748b]">
              #{reporte.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
        </div>

        <div className="relative mt-4 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${estado.bg} ${estado.ring}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${estado.dot}`} />
            {estado.label}
          </span>
          {reporte.eventoId && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#6366f1]/15 px-2.5 py-1 text-xs font-medium text-[#a5b4fc] ring-1 ring-inset ring-[#6366f1]/25">
              <Link2 className="h-3 w-3" />
              Con alerta
            </span>
          )}
        </div>
      </div>

      {/* Body scroll */}
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        <InfoBlock icon={MapPin} label="Ubicación">
          {zonaNombre}
        </InfoBlock>

        <InfoBlock icon={FileText} label="Descripción del ciudadano">
          <p className="whitespace-pre-wrap text-[#cbd5e1]">
            {reporte.descripcion?.trim() || "Sin descripción proporcionada."}
          </p>
        </InfoBlock>

        {informeCampo && (
          <div className="rounded-xl border border-[#f59e0b]/25 bg-[#f59e0b]/10 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[#fcd34d]">
              <Shield className="h-3.5 w-3.5" />
              Informe de campo (policía)
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#fde68a]">
              {informeCampo}
            </p>
          </div>
        )}

        {notasOperadorAlerta && (
          <div className="rounded-xl border border-[#22c55e]/25 bg-[#22c55e]/10 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[#86efac]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Cierre del operador
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#bbf7d0]">
              {notasOperadorAlerta}
            </p>
          </div>
        )}

        {notasReporteSolo && (
          <div className="rounded-xl border border-[#f59e0b]/25 bg-[#f59e0b]/10 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[#fcd34d]">
              <FileText className="h-3.5 w-3.5" />
              Notas del operador
            </div>
            <p className="whitespace-pre-wrap text-sm italic leading-relaxed text-[#fde68a]">
              {notasReporteSolo}
            </p>
          </div>
        )}

        {fotosCiudadano.length > 0 && (
          <MediaGallery urls={fotosCiudadano} title="Fotos del ciudadano" />
        )}

        <div className="grid grid-cols-2 gap-3">
          <InfoBlock icon={Calendar} label="Recibido">
            {formatFecha(reporte.createdAt)}
          </InfoBlock>
          <InfoBlock icon={Clock} label="Prioridad">
            <PrioridadMeter nivel={reporte.prioridad} />
          </InfoBlock>
        </div>

        {reporte.eventoId && (
          <div className="rounded-xl border border-[#6366f1]/25 bg-[#6366f1]/10 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[#818cf8]">
              <Link2 className="h-3.5 w-3.5" />
              Evento correlacionado
            </div>
            <p className="break-all font-mono text-xs text-[#c7d2fe]">
              {reporte.eventoId}
            </p>
          </div>
        )}

        {reporte.operadorId && (
          <InfoBlock icon={User} label="Operador asignado">
            <span className="font-mono text-xs">{reporte.operadorId}</span>
          </InfoBlock>
        )}

        {reporte.cerradoEn && (
          <InfoBlock icon={CheckCircle2} label="Cerrado">
            {formatFecha(reporte.cerradoEn)}
          </InfoBlock>
        )}
      </div>

      {/* Actions */}
      {canAct && (
        <div className="space-y-2 border-t border-[#334155] bg-[#0f172a]/40 p-4">
          {reporte.estado === "PENDIENTE" && (
            <button
              type="button"
              disabled={isLoading}
              onClick={() => onTomar(reporte.id)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#f59e0b] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#d97706] disabled:opacity-50"
            >
              <Clock className="h-4 w-4" />
              {isLoading ? "Procesando…" : "Tomar caso"}
            </button>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => onResolver(reporte.id)}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#22c55e] px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#16a34a] disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              Resolver
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => onMarcarFalso(reporte.id)}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#ef4444]/90 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#dc2626] disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" />
              Falso
            </button>
          </div>
        </div>
      )}

      {!canAct && (
        <div className="border-t border-[#334155] bg-[#0f172a]/40 px-4 py-3 text-center text-xs text-[#64748b]">
          Este reporte ya fue cerrado y no admite más acciones.
        </div>
      )}
    </div>
  );
}

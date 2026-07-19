"use client";

import type { Alerta } from "@/lib/core-service";
import {
  getAlertaConfianzaPct,
  getAlertaDescripcion,
  getAlertaGeneradaPorLabel,
  getAlertaInformeCampo,
  getAlertaNotasOperador,
  getAlertaSeveridad,
  getAlertaSubtipo,
  getAlertaTipoLabel,
  getAlertaTipoUi,
} from "@/lib/alert-utils";
import { parseMediaUrls } from "@/lib/parse-media-urls";
import { MediaGallery } from "@/components/ui/media-gallery";
import {
  Activity,
  Bot,
  Calendar,
  CheckCircle2,
  Cpu,
  FileText,
  MapPin,
  Mic,
  PenLine,
  Radio,
  Shield,
  ShieldAlert,
  User,
  XCircle,
} from "lucide-react";

const ESTADOS: Record<
  string,
  { label: string; bg: string; ring: string; dot: string }
> = {
  activa: {
    label: "Activa",
    bg: "bg-[#ef4444]/15 text-[#fca5a5]",
    ring: "ring-[#ef4444]/30",
    dot: "bg-[#ef4444]",
  },
  en_proceso: {
    label: "En camino",
    bg: "bg-[#0ea5e9]/15 text-[#7dd3fc]",
    ring: "ring-[#0ea5e9]/30",
    dot: "bg-[#0ea5e9]",
  },
  reconocida: {
    label: "Reconocida",
    bg: "bg-[#f59e0b]/15 text-[#fcd34d]",
    ring: "ring-[#f59e0b]/30",
    dot: "bg-[#f59e0b]",
  },
  cerrada: {
    label: "Cerrada",
    bg: "bg-[#22c55e]/15 text-[#86efac]",
    ring: "ring-[#22c55e]/30",
    dot: "bg-[#22c55e]",
  },
  falsa_alarma: {
    label: "Falsa alarma",
    bg: "bg-[#64748b]/20 text-[#cbd5e1]",
    ring: "ring-[#64748b]/30",
    dot: "bg-[#64748b]",
  },
  completada: {
    label: "Completada",
    bg: "bg-[#22c55e]/15 text-[#86efac]",
    ring: "ring-[#22c55e]/30",
    dot: "bg-[#22c55e]",
  },
};

const TIPOS_UI: Record<
  string,
  { label: string; color: string; accent: string; icon: typeof Mic }
> = {
  audio: {
    label: "Audio IA",
    color: "text-[#6366f1]",
    accent: "from-[#6366f1]/25 to-transparent",
    icon: Mic,
  },
  ciudadano: {
    label: "Ciudadano",
    color: "text-[#0ea5e9]",
    accent: "from-[#0ea5e9]/25 to-transparent",
    icon: User,
  },
  manual: {
    label: "Manual",
    color: "text-[#f59e0b]",
    accent: "from-[#f59e0b]/25 to-transparent",
    icon: PenLine,
  },
};

function getTipoUi(alerta: Alerta) {
  const key = getAlertaTipoUi(alerta);
  return (
    TIPOS_UI[key] ?? {
      label: getAlertaTipoLabel(alerta),
      color: "text-[#94a3b8]",
      accent: "from-[#334155]/40 to-transparent",
      icon: ShieldAlert,
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

function formatMetadatoKey(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatMetadatoValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function SeveridadMeter({ nivel = 1 }: { nivel?: number }) {
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

function ConfianzaBar({ pct }: { pct: number }) {
  const color =
    pct >= 80 ? "bg-[#22c55e]" : pct >= 50 ? "bg-[#f59e0b]" : "bg-[#ef4444]";

  return (
    <div className="space-y-1.5">
      <div className="h-2 overflow-hidden rounded-full bg-[#334155]">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
      <span className="text-sm font-medium text-[#c7d2fe]">{pct.toFixed(1)}%</span>
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

export interface AlertaDetailPanelProps {
  alerta: Alerta | null;
  loading?: boolean;
  error?: string | null;
  actionLoading?: string | null;
  onReconocer?: (id: string) => void;
  onCerrar?: (id: string) => void;
  onFalsaAlarma?: (id: string) => void;
}

export function AlertaDetailPanel({
  alerta,
  loading,
  error,
  actionLoading,
  onReconocer,
  onCerrar,
  onFalsaAlarma,
}: AlertaDetailPanelProps) {
  if (loading && !alerta) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center px-6 py-12">
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

  if (!alerta) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center px-6 py-12 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0f172a] ring-1 ring-[#334155]">
          <ShieldAlert className="h-8 w-8 text-[#475569]" />
        </div>
        <p className="text-base font-medium text-[#e2e8f0]">Sin alerta seleccionada</p>
        <p className="mt-1 max-w-[240px] text-sm text-[#64748b]">
          Elige una alerta del listado para ver el detalle completo.
        </p>
      </div>
    );
  }

  const tipo = getTipoUi(alerta);
  const TipoIcon = tipo.icon;
  const estado = ESTADOS[alerta.estado] ?? {
    label: alerta.estado.replace(/_/g, " "),
    bg: "bg-[#334155]/30 text-[#94a3b8]",
    ring: "ring-[#334155]",
    dot: "bg-[#64748b]",
  };
  const subtipo = getAlertaSubtipo(alerta);
  const severidad = getAlertaSeveridad(alerta);
  const confianzaPct = getAlertaConfianzaPct(alerta);
  const descripcion = getAlertaDescripcion(alerta);
  const informeCampo = getAlertaInformeCampo(alerta);
  const notasOperador = getAlertaNotasOperador(alerta);
  const zonaNombre = alerta.zonaNombre ?? alerta.zona?.nombre ?? "Sin zona asignada";
  const metadatos = alerta.evento?.metadatos as Record<string, unknown> | null | undefined;
  const isLoading = actionLoading === alerta.id;
  const canReconocer = alerta.estado === "activa";
  const canCerrar =
    alerta.estado === "activa" ||
    alerta.estado === "en_proceso" ||
    alerta.estado === "reconocida";
  const hasActions = canReconocer || canCerrar;
  const evidenciaFotos = parseMediaUrls(alerta.evidenciaUrls);
  const reporteFotos = parseMediaUrls(alerta.reporte?.fotosUrls);

  return (
    <div className="flex max-h-[calc(90vh-2rem)] flex-col">
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
              Alerta operativa
            </p>
            <h3 className="mt-0.5 text-lg font-semibold leading-tight text-white">
              {alerta.codigo}
            </h3>
            <p className="mt-1 text-sm capitalize text-[#94a3b8]">
              {subtipo || tipo.label}
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
          <span className="inline-flex items-center gap-1 rounded-full bg-[#0f172a]/60 px-2.5 py-1 text-xs font-medium text-[#94a3b8] ring-1 ring-inset ring-[#334155]">
            <Bot className="h-3 w-3" />
            {getAlertaGeneradaPorLabel(alerta)}
          </span>
          {confianzaPct != null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#6366f1]/15 px-2.5 py-1 text-xs font-medium text-[#a5b4fc] ring-1 ring-inset ring-[#6366f1]/25">
              <Activity className="h-3 w-3" />
              IA {confianzaPct.toFixed(0)}%
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        <InfoBlock icon={MapPin} label="Ubicación">
          <p>{zonaNombre}</p>
          {alerta.latitud != null && alerta.longitud != null && (
            <p className="mt-1 font-mono text-xs text-[#64748b]">
              {alerta.latitud.toFixed(6)}, {alerta.longitud.toFixed(6)}
            </p>
          )}
        </InfoBlock>

        <InfoBlock icon={FileText} label="Descripción">
          <p className="whitespace-pre-wrap text-[#cbd5e1]">
            {descripcion.trim() || "Sin descripción registrada."}
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

        {notasOperador && (
          <div className="rounded-xl border border-[#22c55e]/25 bg-[#22c55e]/10 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[#86efac]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Cierre del operador
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#bbf7d0]">
              {notasOperador}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <InfoBlock icon={Calendar} label="Creada">
            {formatFecha(alerta.createdAt)}
          </InfoBlock>
          <InfoBlock icon={ShieldAlert} label="Severidad">
            <SeveridadMeter nivel={severidad} />
          </InfoBlock>
        </div>

        {(alerta.reconocidaEn || alerta.cerradaEn) && (
          <div className="grid grid-cols-2 gap-3">
            {alerta.reconocidaEn && (
              <InfoBlock icon={CheckCircle2} label="Reconocida">
                {formatFecha(alerta.reconocidaEn)}
              </InfoBlock>
            )}
            {alerta.cerradaEn && (
              <InfoBlock icon={CheckCircle2} label="Cerrada">
                {formatFecha(alerta.cerradaEn)}
              </InfoBlock>
            )}
          </div>
        )}

        {alerta.evento && (
          <div className="rounded-xl border border-[#6366f1]/25 bg-[#6366f1]/10 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[#818cf8]">
              <Cpu className="h-3.5 w-3.5" />
              Evento IoT / IA
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-[#64748b]">ID evento</dt>
                <dd className="break-all font-mono text-xs text-[#c7d2fe]">
                  {alerta.evento.id.slice(0, 12)}…
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#64748b]">Fuente</dt>
                <dd className="text-[#e2e8f0]">{alerta.evento.fuente ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#64748b]">Nodo</dt>
                <dd className="text-[#e2e8f0]">
                  {alerta.evento.nodoCodigo ?? alerta.evento.nodoId ?? "—"}
                </dd>
              </div>
              {"procesado" in alerta.evento && (
                <div className="flex justify-between gap-4">
                  <dt className="text-[#64748b]">Procesado IA</dt>
                  <dd className="text-[#e2e8f0]">
                    {alerta.evento.procesado ? "Sí" : "No"}
                  </dd>
                </div>
              )}
              {alerta.evento.createdAt && (
                <div className="flex justify-between gap-4">
                  <dt className="text-[#64748b]">Registrado</dt>
                  <dd className="text-[#e2e8f0]">
                    {formatFecha(alerta.evento.createdAt)}
                  </dd>
                </div>
              )}
            </dl>
            {confianzaPct != null && (
              <div className="mt-4 border-t border-[#6366f1]/20 pt-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[#818cf8]">
                  Confianza IA
                </p>
                <ConfianzaBar pct={confianzaPct} />
              </div>
            )}
          </div>
        )}

        {metadatos && Object.keys(metadatos).length > 0 && (
          <div className="rounded-xl border border-[#334155]/80 bg-[#0f172a]/60 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[#64748b]">
              <Radio className="h-3.5 w-3.5" />
              Metadatos del nodo
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {Object.entries(metadatos).map(([key, value]) => (
                <div
                  key={key}
                  className="rounded-lg border border-[#334155]/60 bg-[#0f172a]/80 px-3 py-2"
                >
                  <p className="text-[10px] font-medium uppercase tracking-wider text-[#64748b]">
                    {formatMetadatoKey(key)}
                  </p>
                  <p className="mt-0.5 break-words text-xs text-[#e2e8f0]">
                    {formatMetadatoValue(value)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {alerta.reporte && (
          <div className="rounded-xl border border-[#0ea5e9]/25 bg-[#0ea5e9]/10 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[#38bdf8]">
              <User className="h-3.5 w-3.5" />
              Reporte ciudadano vinculado
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-[#64748b]">Tipo</dt>
                <dd className="capitalize text-[#e2e8f0]">
                  {alerta.reporte.tipo.replace(/_/g, " ")}
                </dd>
              </div>
              {"estado" in alerta.reporte && alerta.reporte.estado && (
                <div className="flex justify-between gap-4">
                  <dt className="text-[#64748b]">Estado</dt>
                  <dd className="text-[#e2e8f0]">{alerta.reporte.estado}</dd>
                </div>
              )}
              {"prioridad" in alerta.reporte && alerta.reporte.prioridad != null && (
                <div className="flex justify-between gap-4">
                  <dt className="text-[#64748b]">Prioridad</dt>
                  <dd className="text-[#e2e8f0]">{alerta.reporte.prioridad}/5</dd>
                </div>
              )}
              {alerta.reporte.descripcion && (
                <p className="mt-2 whitespace-pre-wrap text-xs italic leading-relaxed text-[#bae6fd]">
                  {alerta.reporte.descripcion}
                </p>
              )}
            </dl>
          </div>
        )}

        {evidenciaFotos.length > 0 && (
          <MediaGallery urls={evidenciaFotos} title="Evidencia policial" />
        )}

        {reporteFotos.length > 0 && (
          <MediaGallery urls={reporteFotos} title="Fotos del ciudadano" />
        )}
      </div>

      {/* Actions */}
      {hasActions && (onReconocer || onCerrar || onFalsaAlarma) && (
        <div className="space-y-2 border-t border-[#334155] bg-[#0f172a]/40 p-4">
          {canReconocer && onReconocer && (
            <button
              type="button"
              disabled={isLoading}
              onClick={() => onReconocer(alerta.id)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#f59e0b] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#d97706] disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              {isLoading ? "Procesando…" : "Reconocer alerta"}
            </button>
          )}
          {canCerrar && (
            <div className="grid grid-cols-2 gap-2">
              {onCerrar && (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => onCerrar(alerta.id)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#22c55e] px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#16a34a] disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Cerrar
                </button>
              )}
              {onFalsaAlarma && (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => onFalsaAlarma(alerta.id)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#ef4444]/90 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#dc2626] disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4" />
                  Falsa alarma
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {!hasActions && (
        <div className="border-t border-[#334155] bg-[#0f172a]/40 px-4 py-3 text-center text-xs text-[#64748b]">
          Esta alerta ya fue cerrada y no admite más acciones.
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { coreService, Alerta } from "@/lib/core-service";
import {
  getAlertaConfianzaPct,
  getAlertaDescripcion,
  getAlertaGeneradaPorLabel,
  getAlertaSeveridad,
  getAlertaSubtipo,
  getAlertaTipoLabel,
} from "@/lib/alert-utils";
import { getApiErrorMessage } from "@/lib/api";

interface AlertaDetailDialogProps {
  alertaId: string | null;
  preview?: Alerta | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-EC");
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:gap-4 py-2 border-b border-[#334155] last:border-0">
      <dt className="text-xs font-medium text-[#64748b] uppercase tracking-wide sm:w-36 shrink-0">
        {label}
      </dt>
      <dd className="text-sm text-[#e2e8f0] flex-1 break-words">{value}</dd>
    </div>
  );
}

function formatMetadatoKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatMetadatoValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function AlertaDetailDialog({
  alertaId,
  preview,
  open,
  onOpenChange,
}: AlertaDetailDialogProps) {
  const [alerta, setAlerta] = useState<Alerta | null>(preview ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !alertaId) return;

    setAlerta(preview ?? null);
    setError(null);
    setLoading(true);

    coreService
      .getAlerta(alertaId)
      .then(setAlerta)
      .catch((err) => setError(getApiErrorMessage(err, "No se pudo cargar la alerta")))
      .finally(() => setLoading(false));
  }, [open, alertaId]);

  const confianzaPct = alerta ? getAlertaConfianzaPct(alerta) : null;
  const metadatos = alerta?.evento?.metadatos as Record<string, unknown> | null | undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1e293b] border-[#334155] text-white sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl text-white">
            {alerta?.codigo ?? "Detalle de alerta"}
          </DialogTitle>
        </DialogHeader>

        {loading && !alerta && (
          <p className="text-sm text-[#94a3b8] py-8 text-center">Cargando detalle...</p>
        )}

        {error && (
          <p className="text-sm text-[#ef4444] py-4">{error}</p>
        )}

        {alerta && (
          <div className="space-y-6">
            <section>
              <h3 className="text-sm font-semibold text-[#94a3b8] mb-2">Alerta</h3>
              <dl>
                <DetailRow label="Código" value={alerta.codigo} />
                <DetailRow label="Tipo" value={getAlertaTipoLabel(alerta)} />
                <DetailRow label="Subtipo" value={getAlertaSubtipo(alerta) || "—"} />
                <DetailRow label="Estado" value={alerta.estado.replace(/_/g, " ")} />
                <DetailRow label="Severidad" value={getAlertaSeveridad(alerta)} />
                <DetailRow label="Generada por" value={getAlertaGeneradaPorLabel(alerta)} />
                <DetailRow label="Zona" value={alerta.zonaNombre ?? alerta.zona?.nombre ?? "—"} />
                <DetailRow label="Descripción" value={getAlertaDescripcion(alerta) || "—"} />
                <DetailRow label="Creada" value={formatDate(alerta.createdAt)} />
                {alerta.reconocidaEn && (
                  <DetailRow label="Reconocida" value={formatDate(alerta.reconocidaEn)} />
                )}
                {alerta.cerradaEn && (
                  <DetailRow label="Cerrada" value={formatDate(alerta.cerradaEn)} />
                )}
                {alerta.notas && (
                  <DetailRow label="Notas" value={alerta.notas} />
                )}
              </dl>
            </section>

            {(alerta.latitud != null && alerta.longitud != null) && (
              <section>
                <h3 className="text-sm font-semibold text-[#94a3b8] mb-2">Ubicación</h3>
                <dl>
                  <DetailRow
                    label="Coordenadas"
                    value={`${alerta.latitud.toFixed(6)}, ${alerta.longitud.toFixed(6)}`}
                  />
                </dl>
              </section>
            )}

            {alerta.evento && (
              <section>
                <h3 className="text-sm font-semibold text-[#94a3b8] mb-2">Evento IoT / IA</h3>
                <dl>
                  <DetailRow label="ID evento" value={<span className="font-mono text-xs">{alerta.evento.id}</span>} />
                  <DetailRow label="Fuente" value={alerta.evento.fuente ?? "—"} />
                  <DetailRow label="Nodo" value={alerta.evento.nodoCodigo ?? alerta.evento.nodoId ?? "—"} />
                  {confianzaPct != null && (
                    <DetailRow label="Confianza IA" value={`${confianzaPct.toFixed(1)}%`} />
                  )}
                  {"procesado" in alerta.evento && (
                    <DetailRow
                      label="Procesado IA"
                      value={alerta.evento.procesado ? "Sí" : "No"}
                    />
                  )}
                  {alerta.evento.createdAt && (
                    <DetailRow label="Evento registrado" value={formatDate(alerta.evento.createdAt)} />
                  )}
                </dl>
              </section>
            )}

            {metadatos && Object.keys(metadatos).length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-[#94a3b8] mb-2">Metadatos del nodo</h3>
                <dl>
                  {Object.entries(metadatos).map(([key, value]) => (
                    <DetailRow
                      key={key}
                      label={formatMetadatoKey(key)}
                      value={formatMetadatoValue(value)}
                    />
                  ))}
                </dl>
              </section>
            )}

            {alerta.reporte && (
              <section>
                <h3 className="text-sm font-semibold text-[#94a3b8] mb-2">Reporte ciudadano</h3>
                <dl>
                  <DetailRow label="Tipo" value={alerta.reporte.tipo.replace(/_/g, " ")} />
                  <DetailRow label="Descripción" value={alerta.reporte.descripcion ?? "—"} />
                  {"estado" in alerta.reporte && alerta.reporte.estado && (
                    <DetailRow label="Estado reporte" value={alerta.reporte.estado} />
                  )}
                  {"prioridad" in alerta.reporte && alerta.reporte.prioridad != null && (
                    <DetailRow label="Prioridad" value={alerta.reporte.prioridad} />
                  )}
                </dl>
              </section>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

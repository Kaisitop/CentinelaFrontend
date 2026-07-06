"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertaDetailPanel } from "@/components/alertas/alerta-detail-panel";
import { coreService, Alerta } from "@/lib/core-service";
import { getApiErrorMessage } from "@/lib/api";

interface AlertaDetailDialogProps {
  alertaId: string | null;
  preview?: Alerta | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionLoading?: string | null;
  onReconocer?: (id: string) => void;
  onCerrar?: (id: string) => void;
  onFalsaAlarma?: (id: string) => void;
}

export function AlertaDetailDialog({
  alertaId,
  preview,
  open,
  onOpenChange,
  actionLoading,
  onReconocer,
  onCerrar,
  onFalsaAlarma,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden border-[#334155] bg-[#1e293b] p-0 text-white sm:max-w-2xl [&_[data-slot=dialog-close]]:z-10 [&_[data-slot=dialog-close]]:text-[#94a3b8] [&_[data-slot=dialog-close]]:hover:text-white">
        <DialogTitle className="sr-only">
          {alerta?.codigo ? `Detalle de alerta ${alerta.codigo}` : "Detalle de alerta"}
        </DialogTitle>
        <AlertaDetailPanel
          alerta={alerta}
          loading={loading}
          error={error}
          actionLoading={actionLoading}
          onReconocer={onReconocer}
          onCerrar={onCerrar}
          onFalsaAlarma={onFalsaAlarma}
        />
      </DialogContent>
    </Dialog>
  );
}

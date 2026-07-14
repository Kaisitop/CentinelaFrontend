"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alerta } from "@/lib/core-service";
import { coreService } from "@/lib/core-service";
import { getAlertaDescripcion, getAlertaTipoLabel } from "@/lib/alert-utils";
import { getApiErrorMessage } from "@/lib/api";
import { mediaService } from "@/lib/media-service";
import { toast } from "sonner";

interface AlertaCierreModalProps {
  alerta: Alerta | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted: () => void;
}

export function AlertaCierreModal({
  alerta,
  open,
  onOpenChange,
  onCompleted,
}: AlertaCierreModalProps) {
  const [comentario, setComentario] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const puedeAtender = alerta?.estado === "activa";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alerta || !puedeAtender) return;
    if (!comentario.trim()) {
      toast.error("Escribe el informe de lo encontrado en el sitio");
      return;
    }

    setSubmitting(true);
    try {
      const evidenciaUrls: string[] = [];
      if (foto) {
        const uploaded = await mediaService.uploadImage(foto, "evidencia");
        evidenciaUrls.push(uploaded.url);
      }

      await coreService.atenderAlertaCampo(alerta.id, {
        comentarioCierre: comentario.trim(),
        evidenciaUrls: evidenciaUrls.length ? evidenciaUrls : undefined,
      });

      toast.success("Informe enviado. El operador cerrará el caso.");
      setComentario("");
      setFoto(null);
      onOpenChange(false);
      onCompleted();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "No se pudo enviar el informe"));
    } finally {
      setSubmitting(false);
    }
  };

  if (!alerta) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1e293b] border-[#334155] text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Informe de campo</DialogTitle>
        </DialogHeader>

        <div className="mb-4 rounded-lg bg-[#0f172a] p-3 border border-[#334155]">
          <p className="font-mono text-sm text-[#6366f1]">{alerta.codigo}</p>
          <p className="text-sm text-[#94a3b8]">{getAlertaTipoLabel(alerta)}</p>
          <p className="text-xs text-[#64748b] mt-1">{getAlertaDescripcion(alerta)}</p>
        </div>

        {!puedeAtender ? (
          <p className="text-sm text-[#fcd34d] rounded-lg border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-3 py-3">
            Esta alerta ya está <strong>reconocida</strong>. El operador del centro de comando
            la marcará como cerrada o falsa alarma.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-[#94a3b8] mb-2">
                Informe de lo encontrado *
              </label>
              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                rows={4}
                placeholder="Describe la situación en el lugar..."
                className="w-full rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2 text-sm text-white placeholder:text-[#64748b] focus:border-[#6366f1] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-[#94a3b8] mb-2">
                Foto de evidencia (opcional)
              </label>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-[#94a3b8] file:mr-3 file:rounded file:border-0 file:bg-[#6366f1] file:px-3 file:py-2 file:text-white"
              />
            </div>

            <p className="text-xs text-[#64748b]">
              La alerta quedará en estado <strong className="text-[#fcd34d]">reconocida</strong>.
              No cierras el caso: el operador revisará tu informe y evidencia.
            </p>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-[#f59e0b] py-3 text-sm font-semibold text-white hover:bg-[#d97706] disabled:opacity-50"
            >
              {submitting ? "Enviando…" : "Enviar reconocimiento"}
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

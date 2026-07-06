"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

interface AlertaCierreDialogProps {
  open: boolean;
  falsaAlarma: boolean;
  notas: string;
  loading?: boolean;
  onNotasChange: (value: string) => void;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}

export function AlertaCierreDialog({
  open,
  falsaAlarma,
  notas,
  loading,
  onNotasChange,
  onConfirm,
  onOpenChange,
}: AlertaCierreDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="z-[100] bg-black/70 backdrop-blur-sm"
        className="z-[100] border-[#334155] bg-[#1e293b] text-white sm:max-w-md"
        showCloseButton={false}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          const textarea = document.getElementById("alerta-cierre-notas");
          textarea?.focus();
        }}
      >
        <DialogTitle className="text-lg font-semibold text-white">
          {falsaAlarma ? "Marcar falsa alarma" : "Cerrar alerta"}
        </DialogTitle>
        <DialogDescription className="text-sm text-[#94a3b8]">
          Opcionalmente documenta el cierre. Las notas quedan en el historial de la alerta.
        </DialogDescription>
        <textarea
          id="alerta-cierre-notas"
          value={notas}
          onChange={(e) => onNotasChange(e.target.value)}
          rows={4}
          placeholder="Notas de cierre (opcional)..."
          className="mt-2 w-full resize-none rounded-xl border border-[#334155] bg-[#0f172a] px-3 py-2.5 text-sm text-white placeholder-[#64748b] focus:border-[#6366f1] focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
        />
        <div className="mt-2 flex gap-3">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="flex-1 rounded-xl border border-[#334155] bg-[#0f172a] px-4 py-2.5 text-sm text-white transition-colors hover:bg-[#334155] disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
              falsaAlarma
                ? "bg-[#ef4444] hover:bg-[#dc2626]"
                : "bg-[#22c55e] hover:bg-[#16a34a]"
            }`}
          >
            {loading ? "Procesando…" : "Confirmar"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

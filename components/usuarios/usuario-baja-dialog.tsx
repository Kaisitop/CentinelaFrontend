"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PanelUser } from "@/lib/auth-service";
import { AlertTriangle, Loader2 } from "lucide-react";

interface UsuarioBajaDialogProps {
  user: PanelUser | null;
  open: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}

export function UsuarioBajaDialog({
  user,
  open,
  loading,
  onConfirm,
  onOpenChange,
}: UsuarioBajaDialogProps) {
  if (!user) return null;

  const isAdminTarget = user.rol === "Admin";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="z-[100] bg-black/70 backdrop-blur-sm"
        className="z-[100] border-[#334155] bg-[#1e293b] text-white sm:max-w-md"
      >
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#ef4444]/15">
          <AlertTriangle className="h-5 w-5 text-[#fca5a5]" />
        </div>
        <DialogTitle className="text-lg font-semibold text-white">
          Dar de baja usuario
        </DialogTitle>
        <DialogDescription asChild>
          <div className="space-y-3 text-sm text-[#94a3b8]">
            <p>
              ¿Confirmas dar de baja a{" "}
              <span className="font-medium text-white">{user.nombre}</span> (
              {user.email})?
            </p>
            <p>
              La cuenta quedará inactiva, se revocarán sus sesiones y no podrá
              volver a iniciar sesión en el panel.
            </p>
            {isAdminTarget && (
              <p className="rounded-lg border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-3 py-2 text-[#fcd34d]">
                Estás dando de baja a un administrador. Asegúrate de que otro
                admin pueda seguir operando el sistema.
              </p>
            )}
          </div>
        </DialogDescription>
        <div className="mt-4 flex gap-3">
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
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#ef4444] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#dc2626] disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Procesando…" : "Dar de baja"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { isAdmin } from "@/lib/roles";
import { adminService } from "@/lib/admin-service";
import { getApiErrorMessage } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { SettingsCard } from "@/components/configuracion/settings-card";

const CONFIRM_PHRASE = "LIMPIAR DATOS";

export function MantenimientoSection() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isAdmin(user)) {
    return null;
  }

  const canSubmit = confirmPhrase === CONFIRM_PHRASE && !submitting;

  const handlePurge = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const result = await adminService.purgeDemoData(CONFIRM_PHRASE);
      toast.success(result.message ?? "Base de datos limpiada correctamente.");
      setOpen(false);
      setConfirmPhrase("");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "No se pudo limpiar la base de datos."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="mantenimiento" className="scroll-mt-24">
      <SettingsCard
        icon={Trash2}
        title="Mantenimiento"
        description="Herramientas de administración del entorno de pruebas"
        accent="#ef4444"
        danger
      >
        <div className="rounded-xl border border-[#7f1d1d]/40 bg-[#7f1d1d]/10 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[#fca5a5]">
            <AlertTriangle className="h-4 w-4" />
            Zona peligrosa
          </div>
          <p className="text-xs leading-relaxed text-[#94a3b8]">
            Elimina alertas, eventos, reportes, notificaciones, posiciones GPS, rutas y
            usuarios extra. Se conservan{" "}
            <strong className="text-[#e2e8f0]">admin@centinela.com</strong>,{" "}
            <strong className="text-[#e2e8f0]">operador@centinela.com</strong> y{" "}
            <strong className="text-[#e2e8f0]">policia@centinela.com</strong>, además de
            zonas y nodos IoT.
          </p>
          <p className="mt-2 text-xs font-medium text-[#f87171]">
            Esta acción no se puede deshacer.
          </p>
        </div>

        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg bg-[#991b1b] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#7f1d1d]"
            >
              <Trash2 className="h-4 w-4" />
              Limpiar base de datos
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="border-[#334155] bg-[#1e293b] text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>¿Limpiar toda la data operativa?</AlertDialogTitle>
              <AlertDialogDescription className="text-[#94a3b8]">
                Se borrarán alertas, reportes, eventos, notificaciones y usuarios que no
                sean los tres por defecto. Escribe{" "}
                <strong className="text-white">{CONFIRM_PHRASE}</strong> para confirmar.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-2">
              <Label htmlFor="confirm-purge" className="text-[#94a3b8]">
                Confirmación
              </Label>
              <Input
                id="confirm-purge"
                value={confirmPhrase}
                onChange={(e) => setConfirmPhrase(e.target.value)}
                placeholder={CONFIRM_PHRASE}
                className="border-[#334155] bg-[#0f172a] text-white"
                autoComplete="off"
              />
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel
                className="border-[#334155] bg-transparent text-[#94a3b8] hover:bg-[#334155]"
                onClick={() => setConfirmPhrase("")}
              >
                Cancelar
              </AlertDialogCancel>
              <button
                type="button"
                disabled={!canSubmit}
                onClick={() => void handlePurge()}
                className="inline-flex items-center gap-2 rounded-lg bg-[#991b1b] px-4 py-2 text-sm font-medium text-white hover:bg-[#7f1d1d] disabled:opacity-50"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Sí, limpiar todo
              </button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SettingsCard>
    </section>
  );
}

"use client";

import type React from "react";
import { useState } from "react";
import { Eye, EyeOff, KeyRound, Loader2, Mail, Shield, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { authService } from "@/lib/auth-service";
import { getApiErrorMessage } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SettingsCard } from "@/components/configuracion/settings-card";

const ROL_LABEL: Record<string, string> = {
  admin: "Administrador",
  operador: "Operador",
  policia: "Policía",
};

const ROL_BADGE: Record<string, string> = {
  admin: "bg-[#8b5cf6]/15 text-[#c4b5fd] ring-1 ring-[#8b5cf6]/30",
  operador: "bg-[#6366f1]/15 text-[#a5b4fc] ring-1 ring-[#6366f1]/30",
  policia: "bg-[#0ea5e9]/15 text-[#7dd3fc] ring-1 ring-[#0ea5e9]/30",
};

function initials(nombre: string) {
  const parts = nombre.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function CuentaSection() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  const displayName = user?.nombre || user?.email?.split("@")[0] || "Usuario";
  const rolKey = user?.rol?.toLowerCase() ?? "";
  const rolLabel = ROL_LABEL[rolKey] ?? user?.rol ?? "—";
  const rolBadge =
    ROL_BADGE[rolKey] ?? "bg-[#334155] text-[#94a3b8] ring-1 ring-[#334155]";

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("La nueva contraseña y la confirmación no coinciden.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await authService.changePassword(currentPassword, newPassword);
      toast.success(result.message ?? "Contraseña actualizada correctamente.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "No se pudo cambiar la contraseña."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    if (!user?.email) return;
    setResending(true);
    try {
      const result = await authService.resendVerification(user.email);
      toast.success(result.message ?? "Correo de verificación enviado.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "No se pudo reenviar el correo."));
    } finally {
      setResending(false);
    }
  };

  return (
    <section id="cuenta" className="scroll-mt-24">
      <SettingsCard
        icon={UserRound}
        title="Mi cuenta"
        description="Perfil de sesión y seguridad de acceso"
        accent="#6366f1"
      >
        {/* Perfil */}
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-[#334155]/60 bg-[#0f172a]/50 p-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#6366f1]/15 text-lg font-semibold text-[#a5b4fc] ring-1 ring-[#6366f1]/30">
            {initials(displayName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold text-white">{displayName}</p>
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-[#94a3b8]">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              {user?.email ?? "—"}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${rolBadge}`}
          >
            <Shield className="h-3 w-3" />
            {rolLabel}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#334155]/50 bg-[#0f172a]/40 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-white">Verificación de correo</p>
            <p className="text-xs text-[#64748b]">
              Reenvía el enlace si aún no confirmaste tu cuenta.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleResendVerification()}
            disabled={resending || !user?.email}
            className="inline-flex items-center gap-2 rounded-lg border border-[#334155] bg-[#1e293b] px-3 py-2 text-xs font-medium text-[#a5b4fc] transition-colors hover:border-[#6366f1]/40 disabled:opacity-50"
          >
            {resending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Mail className="h-3.5 w-3.5" />
            )}
            {resending ? "Enviando…" : "Reenviar verificación"}
          </button>
        </div>

        {/* Contraseña */}
        <form
          onSubmit={handleChangePassword}
          className="space-y-4 rounded-xl border border-[#334155]/60 bg-[#0f172a]/40 p-4"
        >
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-[#6366f1]" />
            <div>
              <h3 className="text-sm font-medium text-white">Cambiar contraseña</h3>
              <p className="text-xs text-[#64748b]">
                Mínimo 8 caracteres con mayúsculas, minúsculas, números y símbolos.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="current-password" className="text-xs uppercase tracking-wider text-[#64748b]">
              Contraseña actual
            </Label>
            <div className="relative">
              <Input
                id="current-password"
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="border-[#334155] bg-[#0f172a] pr-10 text-white"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-[#94a3b8]"
                aria-label={showCurrent ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-xs uppercase tracking-wider text-[#64748b]">
                Nueva contraseña
              </Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  className="border-[#334155] bg-[#0f172a] pr-10 text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-[#94a3b8]"
                  aria-label={showNew ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-xs uppercase tracking-wider text-[#64748b]">
                Confirmar contraseña
              </Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="border-[#334155] bg-[#0f172a] text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-[#6366f1] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#5558e3] disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar contraseña
          </button>
        </form>
      </SettingsCard>
    </section>
  );
}

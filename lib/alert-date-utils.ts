import type { Alerta } from "@/lib/core-service";

/** Fecha de creación de la alerta (createdAt o timestamp del backend). */
export function getAlertaDate(alert: Alerta): Date {
  if (alert.createdAt) {
    const d = new Date(alert.createdAt);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (alert.timestamp != null) {
    return new Date(alert.timestamp);
  }
  return new Date(0);
}

function parseDateInput(value: string, endOfDay: boolean): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return endOfDay
    ? new Date(y, m - 1, d, 23, 59, 59, 999)
    : new Date(y, m - 1, d, 0, 0, 0, 0);
}

export function isAlertaInDateRange(
  alert: Alerta,
  desde?: string,
  hasta?: string,
): boolean {
  if (!desde && !hasta) return true;

  const alertDate = getAlertaDate(alert);
  const from = parseDateInput(desde ?? "", false);
  const to = parseDateInput(hasta ?? "", true);

  if (from && alertDate < from) return false;
  if (to && alertDate > to) return false;
  return true;
}

export function formatAlertaFecha(alert: Alerta): string {
  const d = getAlertaDate(alert);
  if (d.getTime() <= 0) return "—";
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export type FechaPreset = "todas" | "hoy" | "7d" | "30d";

export function getDateRangeForPreset(preset: FechaPreset): { desde: string; hasta: string } {
  const hoy = new Date();
  const hasta = toDateInputValue(hoy);

  if (preset === "todas") return { desde: "", hasta: "" };
  if (preset === "hoy") return { desde: hasta, hasta };

  const desdeDate = new Date(hoy);
  if (preset === "7d") desdeDate.setDate(desdeDate.getDate() - 6);
  if (preset === "30d") desdeDate.setDate(desdeDate.getDate() - 29);

  return { desde: toDateInputValue(desdeDate), hasta };
}

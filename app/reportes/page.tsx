"use client";

import { useEffect, useState, useCallback } from "react";
import { Sidebar } from "@/components/sidebar";
import { ProtectedRoute } from "@/components/protected-route";
import { coreService, Reporte } from "@/lib/core-service";
import { useCentinelaRealtime } from "@/lib/use-centinela-realtime";
import { ReporteDetailPanel } from "@/components/reportes/reporte-detail-panel";
import { parseMediaUrls } from "@/lib/parse-media-urls";
import { getApiErrorMessage } from "@/lib/api";
import { toast } from "sonner";
import {
  AlertTriangle,
  Car,
  FileText,
  Flag,
  ImageIcon,
  Inbox,
  MapPin,
  RefreshCw,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  User,
  X,
} from "lucide-react";

// ─── Helpers de UI ────────────────────────────────────────────────────────────

const ESTADOS: Record<string, { label: string; badge: string; dot: string; color: string }> = {
  PENDIENTE:  { label: "Pendiente",  badge: "bg-[#ef4444]/15 text-[#fca5a5] ring-1 ring-[#ef4444]/30", dot: "bg-[#ef4444]", color: "text-[#ef4444]" },
  EN_PROCESO: { label: "En proceso", badge: "bg-[#f59e0b]/15 text-[#fcd34d] ring-1 ring-[#f59e0b]/30", dot: "bg-[#f59e0b]", color: "text-[#f59e0b]" },
  RESUELTO:   { label: "Resuelto",   badge: "bg-[#22c55e]/15 text-[#86efac] ring-1 ring-[#22c55e]/30", dot: "bg-[#22c55e]", color: "text-[#22c55e]" },
  FALSO:      { label: "Falso",      badge: "bg-[#64748b]/20 text-[#cbd5e1] ring-1 ring-[#64748b]/30", dot: "bg-[#64748b]", color: "text-[#64748b]" },
};

const TIPOS: Record<string, { label: string; color: string; icon: typeof ShieldAlert }> = {
  PANICO:              { label: "Pánico",              color: "#ef4444", icon: ShieldAlert },
  HOMICIDIO_SICARIATO: { label: "Homicidio/Sicariato", color: "#dc2626", icon: ShieldAlert },
  SECUESTRO:           { label: "Secuestro",           color: "#a78bfa", icon: User },
  ROBO:                { label: "Robo",                color: "#f59e0b", icon: AlertTriangle },
  EXTORSION:           { label: "Extorsión",           color: "#ec4899", icon: Flag },
  PERSONA_SOSPECHOSA:  { label: "Persona sospechosa",  color: "#6366f1", icon: User },
  VEHICULO_SOSPECHOSO: { label: "Vehículo sospechoso", color: "#0ea5e9", icon: Car },
};

const getTipo = (tipo: string) =>
  TIPOS[tipo] ?? { label: tipo.replace(/_/g, " "), color: "#94a3b8", icon: FileText };

const prioridadColor = (p: number) =>
  p >= 4 ? "#ef4444" : p >= 3 ? "#f59e0b" : "#22c55e";

function formatRelativeTime(iso?: string | null) {
  if (!iso) return "—";
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "hace instantes";
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `hace ${diffH} h`;
  const diffD = Math.floor(diffMin / 1440);
  if (diffD === 1) return "ayer";
  if (diffD < 7) return `hace ${diffD} días`;
  return new Date(iso).toLocaleDateString();
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function ReportesPage() {
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedReporte, setSelectedReporte] = useState<Reporte | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [filterTipo, setFilterTipo] = useState("todos");
  const [filterEstado, setFilterEstado] = useState("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [modalNotas, setModalNotas] = useState<{ id: string; action: "resolver" | "falso" } | null>(null);
  const [notas, setNotas] = useState("");

  const fetchReportes = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await coreService.getReportes();
      setReportes(data);
    } catch {
      toast.error("Error al cargar los reportes");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchReportes(); }, [fetchReportes]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedReporte(null);
      setDetailError(null);
      return;
    }

    setDetailLoading(true);
    setDetailError(null);

    coreService
      .getReporte(selectedId)
      .then(setSelectedReporte)
      .catch((err) =>
        setDetailError(getApiErrorMessage(err, "No se pudo cargar el reporte")),
      )
      .finally(() => setDetailLoading(false));
  }, [selectedId]);

  useCentinelaRealtime({
    "reporte.created": () => {
      toast.info("Nuevo reporte ciudadano recibido");
      fetchReportes();
    },
    "reporte.updated": () => fetchReportes(),
  });

  // ─── Acciones ────────────────────────────────────────────────────────────

  const handleTomar = async (id: string) => {
    setActionLoading(id);
    try {
      await coreService.tomarReporte(id);
      toast.success("Caso tomado — estado actualizado a EN PROCESO");
      fetchReportes();
      setSelectedId(null);
    } catch {
      toast.error("Error al tomar el caso");
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmAction = async () => {
    if (!modalNotas) return;
    if (!notas.trim()) { toast.error("Las notas son obligatorias"); return; }
    setActionLoading(modalNotas.id);
    try {
      if (modalNotas.action === "resolver") {
        await coreService.resolverReporte(modalNotas.id, notas);
        toast.success("Reporte resuelto correctamente");
      } else {
        await coreService.marcarFalsoReporte(modalNotas.id, notas);
        toast.success("Reporte marcado como falso");
      }
      fetchReportes();
      setSelectedId(null);
    } catch {
      toast.error("Error al actualizar el reporte");
    } finally {
      setActionLoading(null);
      setModalNotas(null);
      setNotas("");
    }
  };

  // ─── Filtrado ────────────────────────────────────────────────────────────

  // Filtros base (sin estado) — los contadores por estado se calculan sobre esta lista
  const baseFiltered = reportes.filter((r) => {
    const matchTipo = filterTipo === "todos" || r.tipo === filterTipo;
    const q = searchTerm.trim().toLowerCase();
    const matchSearch =
      !q ||
      r.descripcion.toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q) ||
      (r.zonaNombre ?? r.zona?.nombre ?? "").toLowerCase().includes(q);
    return matchTipo && matchSearch;
  });

  const filtered = baseFiltered.filter(
    (r) => filterEstado === "todos" || r.estado === filterEstado,
  );

  const activeFilterCount =
    (filterTipo !== "todos" ? 1 : 0) +
    (filterEstado !== "todos" ? 1 : 0) +
    (searchTerm.trim() ? 1 : 0);

  const resetFilters = () => {
    setFilterTipo("todos");
    setFilterEstado("todos");
    setSearchTerm("");
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#0f172a]">
        <Sidebar />
        <main className="ml-64 p-8">
          {/* Header */}
          <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">Reportes Ciudadanos</h1>
              <p className="mt-1 text-[#94a3b8]">
                Gestión de reportes enviados desde la app móvil ciudadana
              </p>
            </div>
            <button
              type="button"
              onClick={() => fetchReportes()}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-lg border border-[#334155] bg-[#1e293b] px-3 py-2 text-sm text-[#94a3b8] transition-colors hover:border-[#6366f1]/50 hover:text-white disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Actualizar
            </button>
          </header>

          {/* Stats — clic para filtrar por estado */}
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
            {(
              [
                { key: "todos", label: "Total (filtro)", color: "text-white", count: baseFiltered.length },
                { key: "PENDIENTE", label: "Pendientes", color: ESTADOS.PENDIENTE.color, count: baseFiltered.filter((r) => r.estado === "PENDIENTE").length },
                { key: "EN_PROCESO", label: "En proceso", color: ESTADOS.EN_PROCESO.color, count: baseFiltered.filter((r) => r.estado === "EN_PROCESO").length },
                { key: "RESUELTO", label: "Resueltos", color: ESTADOS.RESUELTO.color, count: baseFiltered.filter((r) => r.estado === "RESUELTO").length },
                { key: "FALSO", label: "Falsos", color: ESTADOS.FALSO.color, count: baseFiltered.filter((r) => r.estado === "FALSO").length },
              ] as const
            ).map((stat) => (
              <button
                key={stat.key}
                type="button"
                onClick={() => setFilterEstado(stat.key)}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  filterEstado === stat.key
                    ? "border-[#6366f1] bg-[#6366f1]/10"
                    : "border-[#334155] bg-[#1e293b] hover:border-[#475569]"
                }`}
                title={`Filtrar por: ${stat.label}`}
              >
                <p className="text-sm text-[#94a3b8]">{stat.label}</p>
                <p className={`text-2xl font-bold tabular-nums ${stat.color}`}>
                  {loading ? "—" : stat.count}
                </p>
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-[#334155] bg-[#1e293b] px-5 py-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <SlidersHorizontal className="h-4 w-4 text-[#6366f1]" />
              Filtros
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-[#6366f1]/20 px-2 py-0.5 text-[11px] font-medium text-[#a5b4fc]">
                  {activeFilterCount}
                </span>
              )}
            </div>

            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748b]" />
              <input
                type="text"
                placeholder="Buscar por descripción, zona o ID…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-[#334155] bg-[#0f172a] py-2 pl-9 pr-8 text-sm text-white placeholder-[#64748b] focus:border-[#6366f1] focus:outline-none"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-[#64748b] hover:text-white"
                  title="Limpiar búsqueda"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2 text-sm text-white focus:border-[#6366f1] focus:outline-none"
              title="Tipo de reporte"
            >
              <option value="todos">Todos los tipos</option>
              {Object.entries(TIPOS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>

            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2 text-sm text-white focus:border-[#6366f1] focus:outline-none"
              title="Estado del reporte"
            >
              <option value="todos">Todos los estados</option>
              {Object.entries(ESTADOS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={resetFilters}
              disabled={activeFilterCount === 0}
              className="flex items-center gap-1.5 rounded-lg border border-[#334155] px-3 py-2 text-sm text-[#94a3b8] transition-colors hover:border-[#ef4444]/40 hover:text-[#fca5a5] disabled:cursor-not-allowed disabled:opacity-40"
              title="Restablecer filtros"
            >
              <X className="h-4 w-4" />
              Limpiar
            </button>
          </div>

          {/* Main content: list + detail */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* List */}
            <div className="rounded-xl border border-[#334155] bg-[#1e293b] lg:col-span-2">
              <div className="flex items-center justify-between border-b border-[#334155] p-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#6366f1]" />
                  <h2 className="text-lg font-semibold text-white">Listado de reportes</h2>
                </div>
                <span className="rounded-full bg-[#0f172a] px-2.5 py-1 text-[11px] text-[#64748b] ring-1 ring-[#334155]">
                  {filtered.length} de {reportes.length}
                </span>
              </div>

              {loading ? (
                <div className="flex flex-col items-center gap-3 p-12 text-center">
                  <RefreshCw className="h-6 w-6 animate-spin text-[#6366f1]" />
                  <p className="text-sm text-[#94a3b8]">Cargando reportes…</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-3 p-12 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#334155] bg-[#0f172a]">
                    <Inbox className="h-6 w-6 text-[#64748b]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#e2e8f0]">
                      No hay reportes con los filtros seleccionados
                    </p>
                    {activeFilterCount > 0 && (
                      <p className="mt-1 text-xs text-[#64748b]">
                        <button
                          type="button"
                          onClick={resetFilters}
                          className="font-medium text-[#818cf8] underline underline-offset-2 hover:text-[#a5b4fc]"
                        >
                          Restablecer los filtros
                        </button>{" "}
                        para ver todos.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="max-h-[640px] divide-y divide-[#334155] overflow-y-auto">
                  {filtered.map((r) => {
                    const tipo = getTipo(r.tipo);
                    const TipoIcon = tipo.icon;
                    const estado = ESTADOS[r.estado ?? ""] ?? {
                      label: r.estado ?? "—",
                      badge: "bg-[#334155] text-[#94a3b8]",
                      dot: "bg-[#64748b]",
                      color: "text-[#94a3b8]",
                    };
                    const fotoCount = parseMediaUrls(r.fotosUrls).length;
                    const prioridad = r.prioridad ?? 0;
                    const zonaNombre = r.zonaNombre ?? r.zona?.nombre;
                    const isSelected = selectedId === r.id;
                    return (
                      <button
                        key={r.id}
                        onClick={() => setSelectedId(r.id)}
                        className={`w-full p-4 text-left transition-colors hover:bg-[#334155]/30 ${
                          isSelected ? "border-l-4 border-[#6366f1] bg-[#334155]/50 pl-3" : ""
                        }`}
                      >
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <div
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1"
                              style={{
                                backgroundColor: `${tipo.color}1a`,
                                // @ts-expect-error CSS var for ring color
                                "--tw-ring-color": `${tipo.color}40`,
                              }}
                            >
                              <TipoIcon className="h-5 w-5" style={{ color: tipo.color }} />
                            </div>
                            <div className="min-w-0">
                              <div className="mb-0.5 flex flex-wrap items-center gap-2">
                                <span className="text-sm font-semibold text-white">
                                  {tipo.label}
                                </span>
                                {r.eventoId && (
                                  <span className="rounded bg-[#6366f1]/20 px-1.5 py-0.5 text-[10px] font-medium text-[#a5b4fc]">
                                    Con alerta
                                  </span>
                                )}
                                {fotoCount > 0 && (
                                  <span className="inline-flex items-center gap-0.5 rounded bg-[#0ea5e9]/15 px-1.5 py-0.5 text-[10px] font-medium text-[#7dd3fc]">
                                    <ImageIcon className="h-3 w-3" />
                                    {fotoCount}
                                  </span>
                                )}
                              </div>
                              <span className="font-mono text-xs text-[#64748b]">
                                #{r.id.slice(0, 8).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <span
                            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-medium ${estado.badge}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${estado.dot}`} />
                            {estado.label}
                          </span>
                        </div>
                        <p className="line-clamp-2 pl-[52px] text-sm text-[#94a3b8]">{r.descripcion}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 pl-[52px] text-xs text-[#64748b]">
                          <span title={r.createdAt ? new Date(r.createdAt).toLocaleString() : undefined}>
                            {formatRelativeTime(r.createdAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {zonaNombre ?? "Sin zona"}
                          </span>
                          <span className="ml-auto flex items-center gap-1.5 font-medium" style={{ color: prioridadColor(prioridad) }}>
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: prioridadColor(prioridad) }}
                            />
                            Prioridad {prioridad}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Detail */}
            <div className="overflow-hidden rounded-xl border border-[#334155] bg-[#1e293b] lg:sticky lg:top-8 lg:self-start">
              <ReporteDetailPanel
                reporte={selectedReporte}
                loading={detailLoading}
                error={detailError}
                actionLoading={actionLoading}
                onTomar={handleTomar}
                onResolver={(id) => {
                  setModalNotas({ id, action: "resolver" });
                  setNotas("");
                }}
                onMarcarFalso={(id) => {
                  setModalNotas({ id, action: "falso" });
                  setNotas("");
                }}
              />
            </div>
          </div>
        </main>

        {/* Modal de notas */}
        {modalNotas && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-[#334155] bg-[#1e293b] p-6 shadow-2xl">
              <h3 className="text-lg font-semibold text-white">
                {modalNotas.action === "resolver" ? "Resolver reporte" : "Marcar como falso"}
              </h3>
              <p className="mt-1 text-sm text-[#94a3b8]">
                Documenta el cierre del caso. Las notas quedan registradas en el historial.
              </p>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={4}
                placeholder="Describe la resolución o el motivo del cierre..."
                className="mt-4 w-full resize-none rounded-xl border border-[#334155] bg-[#0f172a] px-3 py-2.5 text-sm text-white placeholder-[#64748b] focus:border-[#6366f1] focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
              />
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => { setModalNotas(null); setNotas(""); }}
                  className="flex-1 rounded-xl border border-[#334155] bg-[#0f172a] px-4 py-2.5 text-sm text-white transition-colors hover:bg-[#334155]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAction}
                  disabled={!!actionLoading}
                  className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
                    modalNotas.action === "resolver"
                      ? "bg-[#22c55e] hover:bg-[#16a34a]"
                      : "bg-[#ef4444] hover:bg-[#dc2626]"
                  }`}
                >
                  {actionLoading ? "Procesando…" : "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

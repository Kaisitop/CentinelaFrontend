"use client";

import { useEffect, useState, useCallback } from "react";
import { Sidebar } from "@/components/sidebar";
import { ProtectedRoute } from "@/components/protected-route";
import { coreService, Reporte } from "@/lib/core-service";
import { toast } from "sonner";

// ─── Helpers de UI ────────────────────────────────────────────────────────────

const ESTADOS: Record<string, { label: string; bg: string }> = {
  PENDIENTE:  { label: "Pendiente",  bg: "bg-[#ef4444] text-white" },
  EN_PROCESO: { label: "En Proceso", bg: "bg-[#f59e0b] text-white" },
  RESUELTO:   { label: "Resuelto",   bg: "bg-[#22c55e] text-white" },
  FALSO:      { label: "Falso",      bg: "bg-[#64748b] text-white" },
};

const TIPOS: Record<string, { label: string; color: string; icon: string }> = {
  PANICO:               { label: "Pánico",              color: "bg-[#ef4444]/20 text-[#ef4444]",   icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" },
  HOMICIDIO_SICARIATO:  { label: "Homicidio/Sicariato", color: "bg-[#dc2626]/20 text-[#dc2626]",   icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" },
  SECUESTRO:            { label: "Secuestro",            color: "bg-[#7c3aed]/20 text-[#7c3aed]",   icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  ROBO:                 { label: "Robo",                 color: "bg-[#f59e0b]/20 text-[#f59e0b]",   icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
  EXTORSION:            { label: "Extorsión",            color: "bg-[#ec4899]/20 text-[#ec4899]",   icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  PERSONA_SOSPECHOSA:   { label: "Persona Sospechosa",  color: "bg-[#6366f1]/20 text-[#6366f1]",   icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  VEHICULO_SOSPECHOSO:  { label: "Vehículo Sospechoso", color: "bg-[#0ea5e9]/20 text-[#0ea5e9]",   icon: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" },
};

const getTipo = (tipo: string) =>
  TIPOS[tipo] ?? { label: tipo, color: "bg-[#334155]/20 text-[#94a3b8]", icon: "M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" };

const getPrioridadColor = (p: number) =>
  p >= 4 ? "text-[#ef4444]" : p >= 3 ? "text-[#f59e0b]" : "text-[#22c55e]";

// ─── Componente ───────────────────────────────────────────────────────────────

export default function ReportesPage() {
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterTipo, setFilterTipo] = useState("todos");
  const [filterEstado, setFilterEstado] = useState("todos");
  const [modalNotas, setModalNotas] = useState<{ id: string; action: "resolver" | "falso" } | null>(null);
  const [notas, setNotas] = useState("");

  const fetchReportes = useCallback(async () => {
    try {
      const data = await coreService.getReportes();
      setReportes(data);
    } catch {
      toast.error("Error al cargar los reportes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReportes(); }, [fetchReportes]);

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

  const filtered = reportes.filter((r) => {
    const matchTipo = filterTipo === "todos" || r.tipo === filterTipo;
    const matchEstado = filterEstado === "todos" || r.estado === filterEstado;
    return matchTipo && matchEstado;
  });

  const selected = reportes.find((r) => r.id === selectedId) ?? null;

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#0f172a]">
        <Sidebar />
        <main className="ml-64 p-8">
          {/* Header */}
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-white">Reportes Ciudadanos</h1>
            <p className="text-[#94a3b8] mt-1">Gestión de reportes enviados desde la app móvil ciudadana</p>
          </header>

          {/* Stats */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            {[
              { label: "Total", value: reportes.length, color: "text-white" },
              { label: "Pendientes",  value: reportes.filter(r => r.estado === "PENDIENTE").length,  color: "text-[#ef4444]" },
              { label: "En Proceso",  value: reportes.filter(r => r.estado === "EN_PROCESO").length, color: "text-[#f59e0b]" },
              { label: "Resueltos",   value: reportes.filter(r => r.estado === "RESUELTO").length,   color: "text-[#22c55e]" },
              { label: "Falsos",      value: reportes.filter(r => r.estado === "FALSO").length,       color: "text-[#64748b]" },
            ].map(s => (
              <div key={s.label} className="bg-[#1e293b] rounded-lg p-4 border border-[#334155]">
                <p className="text-[#94a3b8] text-sm">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{loading ? "—" : s.value}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="bg-[#1e293b] rounded-xl p-4 border border-[#334155] mb-6">
            <div className="flex flex-wrap gap-4 items-center">
              <div>
                <label className="block text-sm text-[#94a3b8] mb-1">Tipo</label>
                <select
                  value={filterTipo}
                  onChange={(e) => setFilterTipo(e.target.value)}
                  className="px-3 py-2 bg-[#0f172a] border border-[#334155] rounded-lg text-sm text-white focus:outline-none focus:border-[#6366f1]"
                >
                  <option value="todos">Todos</option>
                  {Object.entries(TIPOS).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-[#94a3b8] mb-1">Estado</label>
                <select
                  value={filterEstado}
                  onChange={(e) => setFilterEstado(e.target.value)}
                  className="px-3 py-2 bg-[#0f172a] border border-[#334155] rounded-lg text-sm text-white focus:outline-none focus:border-[#6366f1]"
                >
                  <option value="todos">Todos</option>
                  {Object.entries(ESTADOS).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div className="self-end ml-auto">
                <button
                  onClick={fetchReportes}
                  className="px-4 py-2 bg-[#334155] hover:bg-[#475569] text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Actualizar
                </button>
              </div>
            </div>
          </div>

          {/* Main content: list + detail */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* List */}
            <div className="lg:col-span-2 bg-[#1e293b] rounded-xl border border-[#334155]">
              <div className="p-4 border-b border-[#334155]">
                <h2 className="text-lg font-semibold text-white">Listado de Reportes</h2>
                <p className="text-sm text-[#64748b]">{filtered.length} reportes encontrados</p>
              </div>

              {loading ? (
                <div className="p-8 text-center text-[#94a3b8]">Cargando reportes...</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-[#94a3b8]">No hay reportes que coincidan con los filtros.</div>
              ) : (
                <div className="divide-y divide-[#334155] max-h-[600px] overflow-y-auto">
                  {filtered.map((r) => {
                    const tipo = getTipo(r.tipo);
                    const estado = ESTADOS[r.estado] ?? { label: r.estado, bg: "bg-[#334155] text-[#94a3b8]" };
                    return (
                      <button
                        key={r.id}
                        onClick={() => setSelectedId(r.id)}
                        className={`w-full p-4 text-left hover:bg-[#334155]/30 transition-colors ${selectedId === r.id ? "bg-[#334155]/50 border-l-4 border-[#6366f1]" : ""}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-[#0f172a] flex items-center justify-center shrink-0">
                              <svg className="w-5 h-5 text-[#6366f1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tipo.icon} />
                              </svg>
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-white font-mono">{r.id.slice(0, 8)}…</span>
                                {r.eventoId && (
                                  <span className="px-1.5 py-0.5 bg-[#6366f1]/20 text-[#6366f1] rounded text-[10px] font-medium">Con Alerta</span>
                                )}
                              </div>
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${tipo.color}`}>
                                {tipo.label}
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${estado.bg}`}>
                              {estado.label}
                            </span>
                            <p className="text-xs text-[#64748b] mt-2">{r.zona?.nombre ?? "Sin zona"}</p>
                          </div>
                        </div>
                        <p className="text-sm text-[#94a3b8] line-clamp-2">{r.descripcion}</p>
                        <div className="flex items-center justify-between mt-2 text-xs text-[#64748b]">
                          <span>{new Date(r.createdAt).toLocaleString()}</span>
                          <span className={`font-medium ${getPrioridadColor(r.prioridad)}`}>
                            Prioridad {r.prioridad}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Detail */}
            <div className="bg-[#1e293b] rounded-xl border border-[#334155]">
              <div className="p-4 border-b border-[#334155]">
                <h2 className="text-lg font-semibold text-white">Detalle del Reporte</h2>
              </div>

              {selected ? (
                <div className="p-4 space-y-4">
                  <div>
                    <p className="text-xs text-[#64748b] uppercase tracking-wider mb-1">ID</p>
                    <p className="text-sm text-white font-mono break-all">{selected.id}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${ESTADOS[selected.estado]?.bg ?? ""}`}>
                      {ESTADOS[selected.estado]?.label ?? selected.estado}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getTipo(selected.tipo).color}`}>
                      {getTipo(selected.tipo).label}
                    </span>
                    <span className={`text-xs font-medium ${getPrioridadColor(selected.prioridad)}`}>
                      Prioridad {selected.prioridad}
                    </span>
                  </div>

                  <div>
                    <p className="text-xs text-[#64748b] mb-1">Zona</p>
                    <p className="text-sm text-white">{selected.zona?.nombre ?? "Sin zona asignada"}</p>
                  </div>

                  <div>
                    <p className="text-xs text-[#64748b] mb-1">Descripción</p>
                    <p className="text-sm text-[#94a3b8] leading-relaxed">{selected.descripcion || "—"}</p>
                  </div>

                  <div>
                    <p className="text-xs text-[#64748b] mb-1">Fecha</p>
                    <p className="text-sm text-white">{new Date(selected.createdAt).toLocaleString()}</p>
                  </div>

                  {selected.eventoId && (
                    <div className="p-3 bg-[#6366f1]/10 rounded-lg border border-[#6366f1]/30">
                      <p className="text-xs text-[#6366f1] mb-1">Evento Correlacionado</p>
                      <p className="text-sm text-white font-mono break-all">{selected.eventoId}</p>
                    </div>
                  )}

                  {selected.operadorId && (
                    <div>
                      <p className="text-xs text-[#64748b] mb-1">Operador Asignado</p>
                      <p className="text-sm text-white font-mono">{selected.operadorId}</p>
                    </div>
                  )}

                  {selected.notasOperador && (
                    <div>
                      <p className="text-xs text-[#64748b] mb-1">Notas del Operador</p>
                      <p className="text-sm text-[#94a3b8] italic leading-relaxed">{selected.notasOperador}</p>
                    </div>
                  )}

                  {/* Acciones según estado */}
                  <div className="pt-2 space-y-2">
                    {selected.estado === "PENDIENTE" && (
                      <button
                        disabled={actionLoading === selected.id}
                        onClick={() => handleTomar(selected.id)}
                        className="w-full px-4 py-2 bg-[#f59e0b] hover:bg-[#d97706] disabled:opacity-50 text-white rounded-lg font-medium transition-colors text-sm"
                      >
                        {actionLoading === selected.id ? "Procesando…" : "Tomar Caso"}
                      </button>
                    )}
                    {(selected.estado === "PENDIENTE" || selected.estado === "EN_PROCESO") && (
                      <>
                        <button
                          disabled={actionLoading === selected.id}
                          onClick={() => { setModalNotas({ id: selected.id, action: "resolver" }); setNotas(""); }}
                          className="w-full px-4 py-2 bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 text-white rounded-lg font-medium transition-colors text-sm"
                        >
                          Resolver Reporte
                        </button>
                        <button
                          disabled={actionLoading === selected.id}
                          onClick={() => { setModalNotas({ id: selected.id, action: "falso" }); setNotas(""); }}
                          className="w-full px-4 py-2 bg-[#ef4444] hover:bg-[#dc2626] disabled:opacity-50 text-white rounded-lg font-medium transition-colors text-sm"
                        >
                          Marcar como Falso
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <svg className="w-16 h-16 text-[#334155] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-[#94a3b8]">Selecciona un reporte para ver sus detalles</p>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Modal de notas */}
        {modalNotas && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-[#1e293b] rounded-xl border border-[#334155] p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-white mb-4">
                {modalNotas.action === "resolver" ? "Resolver Reporte" : "Marcar como Falso"}
              </h3>
              <p className="text-sm text-[#94a3b8] mb-3">Ingresa las notas de cierre (obligatorio):</p>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={4}
                placeholder="Describe la resolución del caso..."
                className="w-full px-3 py-2 bg-[#0f172a] border border-[#334155] rounded-lg text-white text-sm placeholder-[#64748b] focus:outline-none focus:border-[#6366f1] resize-none"
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => { setModalNotas(null); setNotas(""); }}
                  className="flex-1 px-4 py-2 bg-[#0f172a] border border-[#334155] hover:bg-[#334155] text-white rounded-lg text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmAction}
                  disabled={!!actionLoading}
                  className={`flex-1 px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
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

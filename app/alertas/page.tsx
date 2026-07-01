"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { coreService, Alerta } from "@/lib/core-service";
import { useCentinelaRealtime } from "@/lib/use-centinela-realtime";
import {
  getAlertaConfianzaPct,
  getAlertaDescripcion,
  getAlertaGeneradaPorLabel,
  getAlertaMetadatosResumen,
  getAlertaSeveridad,
  getAlertaSubtipo,
  getAlertaTipoLabel,
  getAlertaTipoUi,
} from "@/lib/alert-utils";
import { toast } from "sonner"; // webcentinela uses sonner for toasts based on package.json
import { AlertaDetailDialog } from "@/components/alerta-detail-dialog";
import { parseMediaUrls } from "@/lib/parse-media-urls";
import { ImageIcon } from "lucide-react";
import {
  formatAlertaFecha,
  getDateRangeForPreset,
  isAlertaInDateRange,
  type FechaPreset,
} from "@/lib/alert-date-utils";

const getEstadoColor = (estado: string) => {
  switch (estado) {
    case "activa": return "bg-[#ef4444] text-white";
    case "reconocida": return "bg-[#f59e0b] text-white";
    case "cerrada": return "bg-[#22c55e] text-white";
    case "falsa_alarma": return "bg-[#64748b] text-white";
    case "completada": return "bg-[#22c55e] text-white";
    default: return "bg-[#334155] text-[#94a3b8]";
  }
};

const getEstadoLabel = (estado: string) => {
  switch (estado) {
    case "activa": return "Activa";
    case "reconocida": return "Reconocida";
    case "cerrada": return "Cerrada";
    case "falsa_alarma": return "Falsa Alarma";
    case "completada": return "Completada";
    default: return estado;
  }
};

const getSeveridadColor = (severidad: number) => {
  if (severidad >= 4) return "text-[#ef4444]";
  if (severidad >= 3) return "text-[#f59e0b]";
  return "text-[#22c55e]";
};

const getTipoIcon = (tipo: string) => {
  switch (tipo) {
    case "audio": return "M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3";
    case "ciudadano": return "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z";
    case "manual": return "M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z";
    default: return "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z";
  }
};

function AlertasPageContent() {
  const searchParams = useSearchParams();
  const alertaQuery = searchParams.get("alerta");
  const [alertsData, setAlertsData] = useState<Alerta[]>([]);
  const [filterEstado, setFilterEstado] = useState("todas");
  const [filterTipo, setFilterTipo] = useState("todos");
  const [filterSeveridad, setFilterSeveridad] = useState("todas");
  const [filterFechaDesde, setFilterFechaDesde] = useState("");
  const [filterFechaHasta, setFilterFechaHasta] = useState("");
  const [fechaPreset, setFechaPreset] = useState<FechaPreset | "custom">("todas");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailAlertaId, setDetailAlertaId] = useState<string | null>(null);
  const [detailPreview, setDetailPreview] = useState<Alerta | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [modalCierre, setModalCierre] = useState<{ id: string; falsaAlarma: boolean } | null>(null);
  const [notasCierre, setNotasCierre] = useState("");

  const fetchAlerts = useCallback(async () => {
    try {
      const data = await coreService.getAlertas();
      setAlertsData(data);
    } catch (error) {
      toast.error("Error al obtener las alertas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  useCentinelaRealtime({
    "alerta.created": () => {
      toast.info("Nueva alerta operativa");
      fetchAlerts();
    },
    "alerta.updated": () => fetchAlerts(),
  });

  useEffect(() => {
    if (!alertaQuery || alertsData.length === 0) return;
    const match = alertsData.find((a) => a.id === alertaQuery);
    if (match) {
      setDetailAlertaId(match.id);
      setDetailPreview(match);
      setDetailOpen(true);
    }
  }, [alertaQuery, alertsData]);

  const handleReconocer = async (id: string) => {
    setActionLoading(id);
    try {
      await coreService.reconocerAlerta(id);
      toast.success("Alerta reconocida");
      fetchAlerts();
      if (detailAlertaId === id) {
        const updated = await coreService.getAlerta(id);
        setDetailPreview(updated);
      }
    } catch {
      toast.error("Error al reconocer alerta");
    } finally {
      setActionLoading(null);
    }
  };

  const openModalCierre = (id: string, falsaAlarma: boolean) => {
    setModalCierre({ id, falsaAlarma });
    setNotasCierre("");
  };

  const handleConfirmCierre = async () => {
    if (!modalCierre) return;
    setActionLoading(modalCierre.id);
    try {
      await coreService.cerrarAlerta(modalCierre.id, {
        notas: notasCierre.trim() || undefined,
        falsaAlarma: modalCierre.falsaAlarma,
      });
      toast.success(
        modalCierre.falsaAlarma ? "Marcada como falsa alarma" : "Alerta cerrada",
      );
      setModalCierre(null);
      setNotasCierre("");
      fetchAlerts();
      if (detailAlertaId === modalCierre.id) {
        const updated = await coreService.getAlerta(modalCierre.id);
        setDetailPreview(updated);
      }
    } catch {
      toast.error("Error al cerrar alerta");
    } finally {
      setActionLoading(null);
    }
  };

  const handleVerDetalle = (alert: Alerta) => {
    setDetailAlertaId(alert.id);
    setDetailPreview(alert);
    setDetailOpen(true);
  };

  const applyFechaPreset = (preset: FechaPreset) => {
    setFechaPreset(preset);
    const { desde, hasta } = getDateRangeForPreset(preset);
    setFilterFechaDesde(desde);
    setFilterFechaHasta(hasta);
  };

  const filteredAlerts = alertsData.filter((alert) => {
    const severidad = getAlertaSeveridad(alert);
    const tipo = getAlertaTipoUi(alert);
    const subtipo = getAlertaSubtipo(alert);

    const matchesEstado = filterEstado === "todas" || alert.estado === filterEstado;
    const matchesTipo = filterTipo === "todos" || tipo === filterTipo;
    const matchesSeveridad = filterSeveridad === "todas" || 
      (filterSeveridad === "alta" && severidad >= 4) ||
      (filterSeveridad === "media" && severidad >= 2 && severidad < 4) ||
      (filterSeveridad === "baja" && severidad < 2);
    const matchesFecha = isAlertaInDateRange(alert, filterFechaDesde, filterFechaHasta);
    
    const matchesSearch = alert.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          subtipo.toLowerCase().includes(searchTerm.toLowerCase());
                          
    return matchesEstado && matchesTipo && matchesSeveridad && matchesFecha && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#0f172a]">
      <Sidebar />
      <main className="ml-64 p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-white">Gestion de Alertas</h1>
          <p className="text-[#94a3b8] mt-1">Administra el ciclo de vida de alertas: activa - reconocida - cerrada</p>
        </header>

        {/* Filters */}
        <div className="bg-[#1e293b] rounded-xl p-6 border border-[#334155] mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm text-[#94a3b8] mb-2">Buscar</label>
              <input
                type="text"
                placeholder="Buscar por codigo, subtipo o zona..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 bg-[#0f172a] border border-[#334155] rounded-lg text-white placeholder-[#64748b] focus:outline-none focus:border-[#6366f1]"
              />
            </div>
            <div>
              <label className="block text-sm text-[#94a3b8] mb-2">Estado</label>
              <select
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value)}
                className="px-4 py-2 bg-[#0f172a] border border-[#334155] rounded-lg text-white focus:outline-none focus:border-[#6366f1]"
              >
                <option value="todas">Todos</option>
                <option value="activa">Activa</option>
                <option value="reconocida">Reconocida</option>
                <option value="cerrada">Cerrada</option>
                <option value="falsa_alarma">Falsa Alarma</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-[#94a3b8] mb-2">Tipo</label>
              <select
                value={filterTipo}
                onChange={(e) => setFilterTipo(e.target.value)}
                className="px-4 py-2 bg-[#0f172a] border border-[#334155] rounded-lg text-white focus:outline-none focus:border-[#6366f1]"
              >
                <option value="todos">Todos</option>
                <option value="audio">Audio (YAMNet)</option>
                <option value="ciudadano">Ciudadano</option>
                <option value="manual">Manual</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-[#94a3b8] mb-2">Severidad</label>
              <select
                value={filterSeveridad}
                onChange={(e) => setFilterSeveridad(e.target.value)}
                className="px-4 py-2 bg-[#0f172a] border border-[#334155] rounded-lg text-white focus:outline-none focus:border-[#6366f1]"
              >
                <option value="todas">Todas</option>
                <option value="alta">Alta (4-5)</option>
                <option value="media">Media (2-3)</option>
                <option value="baja">Baja (1)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-[#94a3b8] mb-2">Desde</label>
              <input
                type="date"
                value={filterFechaDesde}
                onChange={(e) => {
                  setFilterFechaDesde(e.target.value);
                  setFechaPreset("custom");
                }}
                className="px-4 py-2 bg-[#0f172a] border border-[#334155] rounded-lg text-white focus:outline-none focus:border-[#6366f1] [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-sm text-[#94a3b8] mb-2">Hasta</label>
              <input
                type="date"
                value={filterFechaHasta}
                onChange={(e) => {
                  setFilterFechaHasta(e.target.value);
                  setFechaPreset("custom");
                }}
                min={filterFechaDesde || undefined}
                className="px-4 py-2 bg-[#0f172a] border border-[#334155] rounded-lg text-white focus:outline-none focus:border-[#6366f1] [color-scheme:dark]"
              />
            </div>
            <div className="self-end">
              <button className="px-6 py-2 bg-[#6366f1] hover:bg-[#5558e3] text-white rounded-lg font-medium transition-colors">
                Nueva Alerta Manual
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[#334155]">
            <span className="text-xs text-[#64748b] self-center mr-1">Rango rápido:</span>
            {(
              [
                ["todas", "Todas las fechas"],
                ["hoy", "Hoy"],
                ["7d", "Últimos 7 días"],
                ["30d", "Últimos 30 días"],
              ] as const
            ).map(([preset, label]) => (
              <button
                key={preset}
                type="button"
                onClick={() => applyFechaPreset(preset)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  fechaPreset === preset
                    ? "bg-[#6366f1] text-white"
                    : "bg-[#0f172a] text-[#94a3b8] border border-[#334155] hover:border-[#6366f1]/50"
                }`}
              >
                {label}
              </button>
            ))}
            {(filterFechaDesde || filterFechaHasta) && (
              <button
                type="button"
                onClick={() => applyFechaPreset("todas")}
                className="px-3 py-1.5 rounded-lg text-xs text-[#94a3b8] hover:text-white"
              >
                Limpiar fechas
              </button>
            )}
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-[#1e293b] rounded-lg p-4 border border-[#334155]">
            <p className="text-[#94a3b8] text-sm">Total (filtro)</p>
            <p className="text-2xl font-bold text-white">{filteredAlerts.length}</p>
          </div>
          <div className="bg-[#1e293b] rounded-lg p-4 border border-[#334155]">
            <p className="text-[#94a3b8] text-sm">Activas</p>
            <p className="text-2xl font-bold text-[#ef4444]">{filteredAlerts.filter(a => a.estado === "activa").length}</p>
          </div>
          <div className="bg-[#1e293b] rounded-lg p-4 border border-[#334155]">
            <p className="text-[#94a3b8] text-sm">Reconocidas</p>
            <p className="text-2xl font-bold text-[#f59e0b]">{filteredAlerts.filter(a => a.estado === "reconocida").length}</p>
          </div>
          <div className="bg-[#1e293b] rounded-lg p-4 border border-[#334155]">
            <p className="text-[#94a3b8] text-sm">Cerradas</p>
            <p className="text-2xl font-bold text-[#22c55e]">{filteredAlerts.filter(a => a.estado === "cerrada").length}</p>
          </div>
          <div className="bg-[#1e293b] rounded-lg p-4 border border-[#334155]">
            <p className="text-[#94a3b8] text-sm">Falsas Alarmas</p>
            <p className="text-2xl font-bold text-[#64748b]">{filteredAlerts.filter(a => a.estado === "falsa_alarma").length}</p>
          </div>
        </div>

        {/* Alerts Table */}
        <div className="bg-[#1e293b] rounded-xl border border-[#334155] overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#0f172a]">
              <tr>
                <th className="px-4 py-4 text-left text-xs font-medium text-[#94a3b8] uppercase tracking-wider">Codigo</th>
                <th className="px-4 py-4 text-left text-xs font-medium text-[#94a3b8] uppercase tracking-wider">Fecha</th>
                <th className="px-4 py-4 text-left text-xs font-medium text-[#94a3b8] uppercase tracking-wider">Tipo</th>
                <th className="px-4 py-4 text-left text-xs font-medium text-[#94a3b8] uppercase tracking-wider">Descripcion</th>
                <th className="px-4 py-4 text-left text-xs font-medium text-[#94a3b8] uppercase tracking-wider">Zona</th>
                <th className="px-4 py-4 text-left text-xs font-medium text-[#94a3b8] uppercase tracking-wider">Severidad</th>
                <th className="px-4 py-4 text-left text-xs font-medium text-[#94a3b8] uppercase tracking-wider">Estado</th>
                <th className="px-4 py-4 text-left text-xs font-medium text-[#94a3b8] uppercase tracking-wider">Generada Por</th>
                <th className="px-4 py-4 text-left text-xs font-medium text-[#94a3b8] uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#334155]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-[#94a3b8]">Cargando alertas...</td>
                </tr>
              ) : filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-[#94a3b8]">
                    No hay alertas con los filtros seleccionados.
                  </td>
                </tr>
              ) : filteredAlerts.map((alert) => {
                const tipoUi = getAlertaTipoUi(alert);
                const subtipo = getAlertaSubtipo(alert);
                const descripcion = getAlertaDescripcion(alert);
                const metadatosResumen = getAlertaMetadatosResumen(alert);
                const severidad = getAlertaSeveridad(alert);
                const confianzaPct = getAlertaConfianzaPct(alert);
                const mediaCount =
                  parseMediaUrls(alert.evidenciaUrls).length +
                  parseMediaUrls(alert.reporte?.fotosUrls).length;
                
                return (
                <tr key={alert.id} className="hover:bg-[#334155]/30 transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#0f172a] flex items-center justify-center">
                        <svg className="w-4 h-4 text-[#6366f1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getTipoIcon(tipoUi)} />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-white">{alert.codigo}</span>
                      {mediaCount > 0 && (
                        <span
                          className="inline-flex items-center gap-0.5 rounded bg-[#0ea5e9]/15 px-1.5 py-0.5 text-[10px] font-medium text-[#7dd3fc]"
                          title="Fotos adjuntas"
                        >
                          <ImageIcon className="h-3 w-3" />
                          {mediaCount}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-[#94a3b8] whitespace-nowrap">
                    {formatAlertaFecha(alert)}
                  </td>
                  <td className="px-4 py-4">
                    <div>
                      <p className="text-sm text-white">{getAlertaTipoLabel(alert)}</p>
                      <p className="text-xs text-[#64748b] capitalize">{subtipo || "—"}</p>
                      {confianzaPct != null && (
                        <p className="text-xs text-[#6366f1]">Confianza: {confianzaPct.toFixed(0)}%</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm text-[#94a3b8] max-w-[220px] truncate">{descripcion}</p>
                    {metadatosResumen && (
                      <p className="text-xs text-[#64748b] max-w-[220px] truncate mt-1">{metadatosResumen}</p>
                    )}
                  </td>
                  <td className="px-4 py-4 text-sm text-white">{alert.zonaNombre ?? "—"}</td>
                  <td className="px-4 py-4">
                    <span className={`text-lg font-bold ${getSeveridadColor(severidad)}`}>
                      {severidad}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEstadoColor(alert.estado)}`}>
                      {getEstadoLabel(alert.estado)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-[#94a3b8]">{getAlertaGeneradaPorLabel(alert)}</span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => handleVerDetalle(alert)}
                        className="p-2 hover:bg-[#334155] rounded-lg transition-colors"
                        title="Ver detalles"
                      >
                        <svg className="w-4 h-4 text-[#94a3b8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      {alert.estado === "activa" && (
                        <button 
                          onClick={() => handleReconocer(alert.id)}
                          className="p-2 hover:bg-[#f59e0b]/20 rounded-lg transition-colors" title="Reconocer">
                          <svg className="w-4 h-4 text-[#f59e0b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                      )}
                      {(alert.estado === "activa" || alert.estado === "reconocida") && (
                        <>
                          <button 
                            onClick={() => openModalCierre(alert.id, false)}
                            className="p-2 hover:bg-[#22c55e]/20 rounded-lg transition-colors" title="Cerrar">
                            <svg className="w-4 h-4 text-[#22c55e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button 
                            onClick={() => openModalCierre(alert.id, true)}
                            className="p-2 hover:bg-[#ef4444]/20 rounded-lg transition-colors" title="Falsa Alarma">
                            <svg className="w-4 h-4 text-[#ef4444]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-[#94a3b8]">
            Mostrando {filteredAlerts.length} de {alertsData.length} alertas
          </p>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-[#1e293b] border border-[#334155] rounded-lg text-[#94a3b8] hover:bg-[#334155] transition-colors">
              Anterior
            </button>
            <button className="px-4 py-2 bg-[#6366f1] rounded-lg text-white">1</button>
            <button className="px-4 py-2 bg-[#1e293b] border border-[#334155] rounded-lg text-[#94a3b8] hover:bg-[#334155] transition-colors">
              Siguiente
            </button>
          </div>
        </div>
      </main>

      <AlertaDetailDialog
        alertaId={detailAlertaId}
        preview={detailPreview}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        actionLoading={actionLoading}
        onReconocer={handleReconocer}
        onCerrar={(id) => openModalCierre(id, false)}
        onFalsaAlarma={(id) => openModalCierre(id, true)}
      />

      {modalCierre && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[#334155] bg-[#1e293b] p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-white">
              {modalCierre.falsaAlarma ? "Marcar falsa alarma" : "Cerrar alerta"}
            </h3>
            <p className="mt-1 text-sm text-[#94a3b8]">
              Opcionalmente documenta el cierre. Las notas quedan en el historial de la alerta.
            </p>
            <textarea
              value={notasCierre}
              onChange={(e) => setNotasCierre(e.target.value)}
              rows={4}
              placeholder="Notas de cierre (opcional)..."
              className="mt-4 w-full resize-none rounded-xl border border-[#334155] bg-[#0f172a] px-3 py-2.5 text-sm text-white placeholder-[#64748b] focus:border-[#6366f1] focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
            />
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => { setModalCierre(null); setNotasCierre(""); }}
                className="flex-1 rounded-xl border border-[#334155] bg-[#0f172a] px-4 py-2.5 text-sm text-white transition-colors hover:bg-[#334155]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmCierre}
                disabled={!!actionLoading}
                className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
                  modalCierre.falsaAlarma
                    ? "bg-[#ef4444] hover:bg-[#dc2626]"
                    : "bg-[#22c55e] hover:bg-[#16a34a]"
                }`}
              >
                {actionLoading ? "Procesando…" : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AlertasPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-[#94a3b8]">
          Cargando alertas…
        </div>
      }
    >
      <AlertasPageContent />
    </Suspense>
  );
}

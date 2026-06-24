"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { coreService, Alerta } from "@/lib/core-service";
import { toast } from "sonner"; // webcentinela uses sonner for toasts based on package.json

const getEstadoColor = (estado: string) => {
  switch (estado) {
    case "activa": return "bg-[#ef4444] text-white";
    case "reconocida": return "bg-[#f59e0b] text-white";
    case "cerrada": return "bg-[#22c55e] text-white";
    case "falsa_alarma": return "bg-[#64748b] text-white";
    default: return "bg-[#334155] text-[#94a3b8]";
  }
};

const getEstadoLabel = (estado: string) => {
  switch (estado) {
    case "activa": return "Activa";
    case "reconocida": return "Reconocida";
    case "cerrada": return "Cerrada";
    case "falsa_alarma": return "Falsa Alarma";
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

export default function AlertasPage() {
  const [alertsData, setAlertsData] = useState<Alerta[]>([]);
  const [filterEstado, setFilterEstado] = useState("todas");
  const [filterTipo, setFilterTipo] = useState("todos");
  const [filterSeveridad, setFilterSeveridad] = useState("todas");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    try {
      const data = await coreService.getAlertas();
      setAlertsData(data);
    } catch (error) {
      toast.error("Error al obtener las alertas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleReconocer = async (id: string) => {
    try {
      await coreService.reconocerAlerta(id);
      toast.success("Alerta reconocida");
      fetchAlerts();
    } catch (e) {
      toast.error("Error al reconocer alerta");
    }
  };

  const handleCerrar = async (id: string, falsaAlarma = false) => {
    try {
      const notas = prompt("Ingrese notas de cierre (opcional):");
      await coreService.cerrarAlerta(id, { notas: notas || undefined, falsaAlarma });
      toast.success(falsaAlarma ? "Marcada como falsa alarma" : "Alerta cerrada");
      fetchAlerts();
    } catch (e) {
      toast.error("Error al cerrar alerta");
    }
  };

  const filteredAlerts = alertsData.filter((alert) => {
    const severidad = alert.evento?.severidad || 1;
    const tipo = alert.evento?.tipo || alert.reporte?.tipo || "manual";
    const subtipo = alert.evento?.subtipo || alert.reporte?.tipo || "";

    const matchesEstado = filterEstado === "todas" || alert.estado === filterEstado;
    const matchesTipo = filterTipo === "todos" || tipo === filterTipo;
    const matchesSeveridad = filterSeveridad === "todas" || 
      (filterSeveridad === "alta" && severidad >= 4) ||
      (filterSeveridad === "media" && severidad >= 2 && severidad < 4) ||
      (filterSeveridad === "baja" && severidad < 2);
    
    const matchesSearch = alert.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          subtipo.toLowerCase().includes(searchTerm.toLowerCase());
                          
    return matchesEstado && matchesTipo && matchesSeveridad && matchesSearch;
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
            <div className="self-end">
              <button className="px-6 py-2 bg-[#6366f1] hover:bg-[#5558e3] text-white rounded-lg font-medium transition-colors">
                Nueva Alerta Manual
              </button>
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-[#1e293b] rounded-lg p-4 border border-[#334155]">
            <p className="text-[#94a3b8] text-sm">Total</p>
            <p className="text-2xl font-bold text-white">{alertsData.length}</p>
          </div>
          <div className="bg-[#1e293b] rounded-lg p-4 border border-[#334155]">
            <p className="text-[#94a3b8] text-sm">Activas</p>
            <p className="text-2xl font-bold text-[#ef4444]">{alertsData.filter(a => a.estado === "activa").length}</p>
          </div>
          <div className="bg-[#1e293b] rounded-lg p-4 border border-[#334155]">
            <p className="text-[#94a3b8] text-sm">Reconocidas</p>
            <p className="text-2xl font-bold text-[#f59e0b]">{alertsData.filter(a => a.estado === "reconocida").length}</p>
          </div>
          <div className="bg-[#1e293b] rounded-lg p-4 border border-[#334155]">
            <p className="text-[#94a3b8] text-sm">Cerradas</p>
            <p className="text-2xl font-bold text-[#22c55e]">{alertsData.filter(a => a.estado === "cerrada").length}</p>
          </div>
          <div className="bg-[#1e293b] rounded-lg p-4 border border-[#334155]">
            <p className="text-[#94a3b8] text-sm">Falsas Alarmas</p>
            <p className="text-2xl font-bold text-[#64748b]">{alertsData.filter(a => a.estado === "falsa_alarma").length}</p>
          </div>
        </div>

        {/* Alerts Table */}
        <div className="bg-[#1e293b] rounded-xl border border-[#334155] overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#0f172a]">
              <tr>
                <th className="px-4 py-4 text-left text-xs font-medium text-[#94a3b8] uppercase tracking-wider">Codigo</th>
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
                  <td colSpan={8} className="px-4 py-8 text-center text-[#94a3b8]">Cargando alertas...</td>
                </tr>
              ) : filteredAlerts.map((alert) => {
                const tipo = alert.evento?.tipo || alert.reporte?.tipo || "manual";
                const subtipo = alert.evento?.subtipo || alert.reporte?.tipo || "";
                const descripcion = alert.evento?.descripcion || alert.reporte?.descripcion || alert.notas || "";
                const severidad = alert.evento?.severidad || 1;
                
                return (
                <tr key={alert.id} className="hover:bg-[#334155]/30 transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#0f172a] flex items-center justify-center">
                        <svg className="w-4 h-4 text-[#6366f1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getTipoIcon(tipo)} />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-white">{alert.codigo}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div>
                      <p className="text-sm text-white capitalize">{tipo}</p>
                      <p className="text-xs text-[#64748b] capitalize">{subtipo.replace("_", " ")}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm text-[#94a3b8] max-w-[200px] truncate">{descripcion}</p>
                  </td>
                  <td className="px-4 py-4 text-sm text-white">Milagro</td>
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
                    <span className="text-sm text-[#94a3b8] capitalize">{alert.evento ? 'YAMNet' : 'Ciudadano'}</span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-1">
                      <button className="p-2 hover:bg-[#334155] rounded-lg transition-colors" title="Ver detalles">
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
                            onClick={() => handleCerrar(alert.id, false)}
                            className="p-2 hover:bg-[#22c55e]/20 rounded-lg transition-colors" title="Cerrar">
                            <svg className="w-4 h-4 text-[#22c55e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button 
                            onClick={() => handleCerrar(alert.id, true)}
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
    </div>
  );
}

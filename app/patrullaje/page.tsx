"use client";

import { useEffect, useState, useCallback } from "react";
import { Sidebar } from "@/components/sidebar";
import { ProtectedRoute } from "@/components/protected-route";
import { coreService, Zona, Nodo } from "@/lib/core-service";
import { toast } from "sonner";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getEstadoNodoColor = (estado: string) => {
  switch (estado) {
    case "activo": return "bg-[#22c55e] text-white";
    case "inactivo": return "bg-[#ef4444] text-white";
    case "mantenimiento": return "bg-[#f59e0b] text-white";
    default: return "bg-[#334155] text-[#94a3b8]";
  }
};

const getEstadoNodoLabel = (estado: string) => {
  switch (estado) {
    case "activo": return "Online";
    case "inactivo": return "Offline";
    case "mantenimiento": return "Mantenimiento";
    default: return estado;
  }
};

const getRiesgoColor = (nivel: number) => {
  if (nivel >= 4) return "text-[#ef4444] bg-[#ef4444]/20";
  if (nivel >= 3) return "text-[#f59e0b] bg-[#f59e0b]/20";
  return "text-[#22c55e] bg-[#22c55e]/20";
};

const getRiesgoLabel = (nivel: number) => {
  if (nivel >= 5) return "Crítico";
  if (nivel >= 4) return "Alto";
  if (nivel >= 3) return "Medio";
  return "Bajo";
};

// Parsea WKT POINT para mostrar coordenadas legibles
const parsePoint = (wkt?: string) => {
  if (!wkt) return "N/A";
  const match = wkt.match(/POINT\s*\(\s*([\d.,-]+)\s+([\d.,-]+)\s*\)/i);
  if (!match) return wkt;
  return `${parseFloat(match[2]).toFixed(5)}, ${parseFloat(match[1]).toFixed(5)}`;
};

// ─── Componente ───────────────────────────────────────────────────────────────

export default function PatrullajePage() {
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [nodos, setNodos] = useState<Nodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedZonaId, setSelectedZonaId] = useState<string | null>(null);
  const [filterEstado, setFilterEstado] = useState("todos");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [z, n] = await Promise.allSettled([
      coreService.getZonas(),
      coreService.getNodos(),
    ]);

    if (z.status === "fulfilled") {
      setZonas(z.value.filter((zona) => zona.activa));
    } else {
      toast.error("No se pudieron cargar las zonas");
    }

    if (n.status === "fulfilled") {
      setNodos(n.value);
    } else {
      toast.error("Sin permiso para ver nodos. Cierra sesión y vuelve a entrar.");
    }

    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Nodos filtrados por zona y estado
  const nodosFiltrados = nodos.filter((n) => {
    const matchZona = !selectedZonaId || n.zonaId === selectedZonaId;
    const matchEstado = filterEstado === "todos" || n.estado === filterEstado;
    return matchZona && matchEstado;
  });

  const zonaSeleccionada = zonas.find((z) => z.id === selectedZonaId) ?? null;

  // Contadores por zona
  const nodosPorZona = (zonaId: string) => nodos.filter((n) => n.zonaId === zonaId);
  const nodosActivosPorZona = (zonaId: string) => nodos.filter((n) => n.zonaId === zonaId && n.estado === "activo");

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#0f172a]">
        <Sidebar />
        <main className="ml-64 p-8">
          {/* Header */}
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-white">Zonas y Nodos IoT</h1>
            <p className="text-[#94a3b8] mt-1">
              Monitoreo de zonas geográficas y estado de nodos de detección acústica
            </p>
          </header>

          {/* Stats globales */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: "Zonas Activas",   value: zonas.length,                                               color: "text-white" },
              { label: "Nodos Totales",   value: nodos.length,                                               color: "text-white" },
              { label: "Nodos Online",    value: nodos.filter(n => n.estado === "activo").length,            color: "text-[#22c55e]" },
              { label: "Nodos Offline",   value: nodos.filter(n => n.estado === "inactivo").length,          color: "text-[#ef4444]" },
            ].map((s) => (
              <div key={s.label} className="bg-[#1e293b] rounded-lg p-4 border border-[#334155]">
                <p className="text-[#94a3b8] text-sm">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{loading ? "—" : s.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Panel de Zonas */}
            <div className="bg-[#1e293b] rounded-xl border border-[#334155]">
              <div className="p-4 border-b border-[#334155] flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Zonas de Milagro</h2>
                <button onClick={fetchData} className="text-[#6366f1] hover:text-[#818cf8] transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>

              {loading ? (
                <div className="p-8 text-center text-[#94a3b8]">Cargando zonas...</div>
              ) : (
                <div className="divide-y divide-[#334155] max-h-[560px] overflow-y-auto">
                  {/* Opción "Todas" */}
                  <button
                    onClick={() => setSelectedZonaId(null)}
                    className={`w-full p-4 text-left hover:bg-[#334155]/30 transition-colors ${!selectedZonaId ? "border-l-4 border-[#6366f1] bg-[#334155]/30" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium">Todas las zonas</span>
                      <span className="text-xs text-[#94a3b8]">{nodos.length} nodos</span>
                    </div>
                  </button>
                  {zonas.map((zona) => {
                    const total = nodosPorZona(zona.id).length;
                    const activos = nodosActivosPorZona(zona.id).length;
                    return (
                      <button
                        key={zona.id}
                        onClick={() => setSelectedZonaId(zona.id)}
                        className={`w-full p-4 text-left hover:bg-[#334155]/30 transition-colors ${selectedZonaId === zona.id ? "border-l-4 border-[#6366f1] bg-[#334155]/30" : ""}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <p className="text-white font-medium text-sm">{zona.nombre}</p>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getRiesgoColor(zona.riesgoNivel)}`}>
                            {getRiesgoLabel(zona.riesgoNivel)}
                          </span>
                        </div>
                        {zona.descripcion && (
                          <p className="text-xs text-[#64748b] mb-2 line-clamp-1">{zona.descripcion}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-[#94a3b8]">
                          <span>{total} nodos</span>
                          <span className="text-[#22c55e]">{activos} online</span>
                          {total - activos > 0 && (
                            <span className="text-[#ef4444]">{total - activos} offline</span>
                          )}
                        </div>
                        {/* Barra de salud */}
                        <div className="mt-2 h-1.5 bg-[#0f172a] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#22c55e] transition-all"
                            style={{ width: total > 0 ? `${(activos / total) * 100}%` : "0%" }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Panel de Nodos */}
            <div className="lg:col-span-2 bg-[#1e293b] rounded-xl border border-[#334155]">
              <div className="p-4 border-b border-[#334155] flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Nodos IoT {zonaSeleccionada ? `— ${zonaSeleccionada.nombre}` : ""}
                  </h2>
                  <p className="text-xs text-[#64748b]">{nodosFiltrados.length} nodos</p>
                </div>
                <div>
                  <select
                    value={filterEstado}
                    onChange={(e) => setFilterEstado(e.target.value)}
                    className="px-3 py-1.5 bg-[#0f172a] border border-[#334155] rounded-lg text-sm text-white focus:outline-none focus:border-[#6366f1]"
                  >
                    <option value="todos">Todos</option>
                    <option value="activo">Online</option>
                    <option value="inactivo">Offline</option>
                    <option value="mantenimiento">Mantenimiento</option>
                  </select>
                </div>
              </div>

              {loading ? (
                <div className="p-8 text-center text-[#94a3b8]">Cargando nodos...</div>
              ) : nodosFiltrados.length === 0 ? (
                <div className="p-8 text-center text-[#94a3b8]">
                  {selectedZonaId
                    ? "Esta zona no tiene nodos registrados aún."
                    : "No hay nodos que coincidan con los filtros."}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#0f172a]">
                      <tr>
                        {["Código", "Estado", "Zona", "Heartbeat", "Firmware", "Ubicación"].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[#94a3b8] uppercase tracking-wider">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#334155]">
                      {nodosFiltrados.map((nodo) => (
                        <tr key={nodo.id} className="hover:bg-[#334155]/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${nodo.estado === "activo" ? "bg-[#22c55e] animate-pulse" : nodo.estado === "inactivo" ? "bg-[#ef4444]" : "bg-[#f59e0b]"}`} />
                              <span className="text-sm font-medium text-white font-mono">{nodo.codigo}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEstadoNodoColor(nodo.estado)}`}>
                              {getEstadoNodoLabel(nodo.estado)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-[#94a3b8]">
                            {nodo.zona?.nombre ?? zonas.find(z => z.id === nodo.zonaId)?.nombre ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-sm text-[#94a3b8]">
                            {nodo.ultimoHeartbeat
                              ? new Date(nodo.ultimoHeartbeat).toLocaleTimeString()
                              : "N/A"}
                          </td>
                          <td className="px-4 py-3 text-sm text-[#94a3b8] font-mono">
                            {nodo.versionFw ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-[#64748b] font-mono">
                            {parsePoint(nodo.ubicacion)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Info de zona seleccionada */}
          {zonaSeleccionada && (
            <div className="mt-6 bg-[#1e293b] rounded-xl border border-[#334155] p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Detalle — {zonaSeleccionada.nombre}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-[#64748b] mb-1">Nivel de Riesgo</p>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getRiesgoColor(zonaSeleccionada.riesgoNivel)}`}>
                    {zonaSeleccionada.riesgoNivel}/5 — {getRiesgoLabel(zonaSeleccionada.riesgoNivel)}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-[#64748b] mb-1">Total Nodos</p>
                  <p className="text-white font-medium">{nodosPorZona(zonaSeleccionada.id).length}</p>
                </div>
                <div>
                  <p className="text-xs text-[#64748b] mb-1">Nodos Online</p>
                  <p className="text-[#22c55e] font-medium">{nodosActivosPorZona(zonaSeleccionada.id).length}</p>
                </div>
                <div>
                  <p className="text-xs text-[#64748b] mb-1">Descripción</p>
                  <p className="text-sm text-[#94a3b8]">{zonaSeleccionada.descripcion ?? "Sin descripción"}</p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}

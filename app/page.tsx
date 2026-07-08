"use client";

import { useEffect, useState, useCallback } from "react";
import { Sidebar } from "@/components/sidebar";
import { ProtectedRoute } from "@/components/protected-route";
import { coreService, Zona, Nodo, Alerta, Evento, Reporte } from "@/lib/core-service";
import { useCentinelaRealtime } from "@/lib/use-centinela-realtime";
import {
  getAlertaConfianzaPct,
  getAlertaSubtipo,
  getAlertaTipoLabel,
} from "@/lib/alert-utils";
import Map from "@/components/Map";

const getEstadoColor = (estado: string) => {
  switch (estado) {
    case "activa": return "bg-[#ef4444] text-white";
    case "reconocida": return "bg-[#f59e0b] text-white";
    case "cerrada": return "bg-[#22c55e] text-white";
    case "falsa_alarma": return "bg-[#64748b] text-white";
    default: return "bg-[#334155] text-[#94a3b8]";
  }
};

const getSubtipoIcon = (subtipo: string) => {
  switch (subtipo) {
    case "disparo": return "M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z";
    case "moto_sin_silenciador": return "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4";
    case "petardo": return "M13 10V3L4 14h7v7l9-11h-7z";
    case "fuego_artificial": return "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z";
    default: return "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z";
  }
};

const getRiesgoColor = (nivel: number) => {
  if (nivel >= 4) return "text-[#ef4444] bg-[#ef4444]/20";
  if (nivel >= 3) return "text-[#f59e0b] bg-[#f59e0b]/20";
  return "text-[#22c55e] bg-[#22c55e]/20";
};

export default function Dashboard() {
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [nodos, setNodos] = useState<Nodo[]>([]);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const results = await Promise.allSettled([
      coreService.getZonas(),
      coreService.getNodos(),
      coreService.getAlertas(),
      coreService.getEventos(),
      coreService.getReportes(),
    ]);

    const [z, n, a, e, r] = results;

    if (z.status === "fulfilled") setZonas(z.value);
    else console.error("GET /zonas:", z.reason);

    if (n.status === "fulfilled") setNodos(n.value);
    else console.error("GET /nodos:", n.reason);

    if (a.status === "fulfilled") setAlertas(a.value);
    else console.error("GET /alertas:", a.reason);

    if (e.status === "fulfilled") setEventos(e.value);
    else console.error("GET /eventos:", e.reason);

    if (r.status === "fulfilled") setReportes(r.value);
    else console.error("GET /reportes:", r.reason);

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useCentinelaRealtime({
    "reporte.created": () => fetchData(),
    "reporte.updated": () => fetchData(),
    "alerta.created": () => fetchData(),
    "alerta.updated": () => fetchData(),
    "evento.created": () => fetchData(),
    "evento.updated": () => fetchData(),
  });

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-white">
          Cargando métricas...
        </div>
      </ProtectedRoute>
    );
  }

  const alertasActivas = alertas.filter(a => a.estado === "activa").length;

  const hace24h = Date.now() - 24 * 60 * 60 * 1000;
  const eventosUltimas24h = eventos.filter((e) => {
    if (!e.createdAt) return false;
    return new Date(e.createdAt).getTime() >= hace24h;
  });

  // Agrupar eventos por tipo (últimas 24h)
  const eventosPorTipo: Record<string, number> = {};
  eventosUltimas24h.forEach((e) => {
    eventosPorTipo[e.subtipo] = (eventosPorTipo[e.subtipo] || 0) + 1;
  });
  
  const eventsByType = Object.entries(eventosPorTipo).map(([subtipo, cantidad], idx) => {
    const colors = ["#ef4444", "#f59e0b", "#8b5cf6", "#6366f1", "#22c55e"];
    return { tipo: subtipo.replace("_", " "), cantidad, color: colors[idx % colors.length] };
  });

  const stats = [
    { label: "Eventos Detectados", value: eventos.length, change: "Total", icon: "wave", color: "#6366f1" },
    { label: "Alertas Activas", value: alertasActivas, change: "Hoy", icon: "alert", color: "#ef4444" },
    { label: "Nodos IoT", value: nodos.length, change: "Instalados", icon: "cpu", color: "#22c55e" },
    { label: "Reportes Ciudadanos", value: reportes.length, change: "Recibidos", icon: "document", color: "#f59e0b" },
  ];

  const recentAlerts = alertas.slice(0, 5); // Tomamos las últimas 5 (el backend suele devolverlas ordenadas desc)

  return (
    <ProtectedRoute>
    <div className="min-h-screen bg-[#0f172a]">
      <Sidebar />
      <main className="ml-64 p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-white">Dashboard CENTINELA</h1>
          <p className="text-[#94a3b8] mt-1">Sistema de Seguridad Ciudadana - Milagro, Ecuador</p>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-[#1e293b] rounded-xl p-6 border border-[#334155]">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${stat.color}20` }}>
                  {stat.icon === "wave" && (
                    <svg className="w-6 h-6" style={{ color: stat.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                  )}
                  {stat.icon === "alert" && (
                    <svg className="w-6 h-6" style={{ color: stat.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  )}
                  {stat.icon === "cpu" && (
                    <svg className="w-6 h-6" style={{ color: stat.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                  )}
                  {stat.icon === "document" && (
                    <svg className="w-6 h-6" style={{ color: stat.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  )}
                </div>
                <span className={`text-sm font-medium ${stat.change.startsWith("+") ? "text-[#22c55e]" : "text-[#ef4444]"}`}>
                  {stat.change}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">{stat.value}</h3>
              <p className="text-[#94a3b8] text-sm">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8 lg:items-stretch">
          {/* Map Section */}
          <div className="lg:col-span-2 flex flex-col bg-[#1e293b] rounded-xl border border-[#334155] overflow-hidden min-h-[480px]">
            <div className="shrink-0 p-4 border-b border-[#334155] flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Mapa de Eventos y Alertas</h2>
              <div className="flex gap-4">
                <span className="flex items-center gap-1 text-xs text-[#94a3b8]">
                  <span className="w-2 h-2 rounded-full bg-[#ef4444]"></span> Disparo
                </span>
                <span className="flex items-center gap-1 text-xs text-[#94a3b8]">
                  <span className="w-2 h-2 rounded-full bg-[#f59e0b]"></span> Moto
                </span>
                <span className="flex items-center gap-1 text-xs text-[#94a3b8]">
                  <span className="w-2 h-2 rounded-full bg-[#8b5cf6]"></span> Petardo
                </span>
                <span className="flex items-center gap-1 text-xs text-[#94a3b8]">
                  <span className="w-3 h-3 rounded bg-[#22c55e]"></span> Nodo IoT
                </span>
              </div>
            </div>
            <div className="relative flex-1 min-h-[400px] bg-[#0f172a] overflow-hidden">
              <Map zonas={zonas} nodos={nodos} alertas={alertas} />
            </div>
          </div>

          {/* Alertas Recientes */}
          <div className="flex flex-col bg-[#1e293b] rounded-xl border border-[#334155]">
            <div className="p-4 border-b border-[#334155] flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Alertas Recientes</h2>
              <a href="/alertas" className="text-sm text-[#6366f1] hover:underline">Ver todas</a>
            </div>
            <div className="divide-y divide-[#334155] flex-1">
              {recentAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0f172a] border border-[#334155]">
                    <svg className="h-6 w-6 text-[#64748b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#e2e8f0]">Sin alertas recientes</p>
                    <p className="mt-1 text-xs text-[#64748b]">
                      No se han registrado alertas en el sistema.
                    </p>
                  </div>
                </div>
              ) : (
                recentAlerts.map((alert) => (
                <div key={alert.id} className="p-4 hover:bg-[#334155]/30 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#0f172a] flex items-center justify-center">
                        <svg className="w-4 h-4 text-[#6366f1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getSubtipoIcon(alert.evento?.subtipo ?? "")} />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-medium text-white text-sm">{alert.codigo}</h3>
                        <p className="text-xs text-[#94a3b8] capitalize">
                          {getAlertaSubtipo(alert) || getAlertaTipoLabel(alert)}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEstadoColor(alert.estado)}`}>
                      {alert.estado}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#94a3b8]">{new Date(alert.createdAt).toLocaleString()}</span>
                    {getAlertaConfianzaPct(alert) != null && (
                      <span className="text-[#6366f1]">
                        Conf: {getAlertaConfianzaPct(alert)!.toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Eventos por Tipo */}
          <div className="bg-[#1e293b] rounded-xl border border-[#334155] p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Eventos por Tipo (Ultimas 24h)</h2>
            {eventsByType.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[#334155] bg-[#0f172a]/60 px-6 py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1e293b] border border-[#334155]">
                  <svg className="h-6 w-6 text-[#64748b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-[#e2e8f0]">Sin eventos en las últimas 24 horas</p>
                  <p className="mt-1 text-xs text-[#64748b]">
                    Los nodos IoT no han detectado actividad en este período.
                  </p>
                </div>
              </div>
            ) : (
            <div className="space-y-4">
              {eventsByType.map((evento) => (
                <div key={evento.tipo} className="flex items-center gap-4">
                  <div className="w-32 text-sm text-[#94a3b8]">{evento.tipo}</div>
                  <div className="flex-1 h-6 bg-[#0f172a] rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all" 
                      style={{ 
                        width: `${(evento.cantidad / 200) * 100}%`, 
                        backgroundColor: evento.color 
                      }}
                    ></div>
                  </div>
                  <div className="w-12 text-right text-sm font-medium text-white">{evento.cantidad}</div>
                </div>
              ))}
            </div>
            )}
          </div>

          {/* Zonas por Nivel de Riesgo */}
          <div className="bg-[#1e293b] rounded-xl border border-[#334155] p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Zonas - Nivel de Riesgo</h2>
            <div className="space-y-3">
              {zonas.map((zona) => (
                <div key={zona.id} className="flex items-center justify-between p-3 bg-[#0f172a] rounded-lg border border-[#334155]/50">
                  <div>
                    <p className="text-white font-medium">{zona.nombre}</p>
                    <p className="text-xs text-[#64748b]">Nivel de Riesgo {zona.riesgoNivel}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-semibold ${getRiesgoColor(zona.riesgoNivel)}`}>
                    Nivel {zona.riesgoNivel}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
    </ProtectedRoute>
  );
}

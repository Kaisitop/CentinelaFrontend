"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ChevronRight,
  Cpu,
  FileText,
  Loader2,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Wifi,
} from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { ProtectedRoute } from "@/components/protected-route";
import { coreService, Zona, Nodo, Alerta, Evento, Reporte } from "@/lib/core-service";
import { useCentinelaRealtime } from "@/lib/use-centinela-realtime";
import { useRefreshInterval } from "@/lib/use-user-preferences";
import {
  getAlertaConfianzaPct,
  getAlertaInformeCampo,
  getAlertaNotasOperador,
  getAlertaSubtipo,
  getAlertaTipoLabel,
} from "@/lib/alert-utils";
import Map from "@/components/Map";
import { ZONA_COLORS } from "@/lib/map-markers-meta";

const ESTADO_UI: Record<string, { label: string; className: string; dot: string }> = {
  activa: { label: "Activa", className: "bg-[#ef4444]/15 text-[#fca5a5] ring-1 ring-[#ef4444]/30", dot: "bg-[#ef4444]" },
  en_proceso: { label: "En camino", className: "bg-[#0ea5e9]/15 text-[#7dd3fc] ring-1 ring-[#0ea5e9]/30", dot: "bg-[#0ea5e9]" },
  reconocida: { label: "Reconocida", className: "bg-[#f59e0b]/15 text-[#fcd34d] ring-1 ring-[#f59e0b]/30", dot: "bg-[#f59e0b]" },
  cerrada: { label: "Cerrada", className: "bg-[#22c55e]/15 text-[#86efac] ring-1 ring-[#22c55e]/30", dot: "bg-[#22c55e]" },
  completada: { label: "Completada", className: "bg-[#22c55e]/15 text-[#86efac] ring-1 ring-[#22c55e]/30", dot: "bg-[#22c55e]" },
  falsa_alarma: { label: "Falsa alarma", className: "bg-[#64748b]/15 text-[#cbd5e1] ring-1 ring-[#64748b]/30", dot: "bg-[#64748b]" },
};

const EVENT_BAR_COLORS = ["#ef4444", "#f59e0b", "#8b5cf6", "#6366f1", "#22c55e", "#0ea5e9"];

function formatRelativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "hace instantes";
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `hace ${diffH} h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "ayer";
  if (diffD < 7) return `hace ${diffD} días`;
  return new Date(iso).toLocaleDateString();
}

function severidadColor(severidad: number) {
  if (severidad >= 4) return "#ef4444";
  if (severidad >= 3) return "#f59e0b";
  return "#22c55e";
}

function RiskLevelBar({ nivel, max = 5 }: { nivel: number; max?: number }) {
  const color = nivel >= 4 ? "#ef4444" : nivel >= 3 ? "#f59e0b" : "#22c55e";
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className="h-1.5 w-4 rounded-full transition-colors"
          style={{ backgroundColor: i < nivel ? color : "#334155" }}
        />
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [nodos, setNodos] = useState<Nodo[]>([]);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    setRefreshing(true);
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
    setRefreshing(false);
    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useRefreshInterval(() => void fetchData());

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
        <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center gap-3 text-[#94a3b8]">
          <Loader2 className="h-8 w-8 animate-spin text-[#6366f1]" />
          <p className="text-sm">Cargando métricas del sistema…</p>
        </div>
      </ProtectedRoute>
    );
  }

  const alertasActivas = alertas.filter((a) => a.estado === "activa").length;
  const alertasEnCamino = alertas.filter((a) => a.estado === "en_proceso").length;
  const alertasReconocidas = alertas.filter((a) => a.estado === "reconocida").length;
  const alertasAbiertas = alertasActivas + alertasEnCamino + alertasReconocidas;

  const hace24h = Date.now() - 24 * 60 * 60 * 1000;
  const eventosUltimas24h = eventos.filter((e) => {
    if (!e.createdAt) return false;
    return new Date(e.createdAt).getTime() >= hace24h;
  });

  const hace5min = Date.now() - 5 * 60 * 1000;
  const nodosOnline = nodos.filter(
    (n) => n.ultimoHeartbeat && new Date(n.ultimoHeartbeat).getTime() >= hace5min,
  ).length;

  const reportesPendientes = reportes.filter(
    (r) => (r.estado ?? "").toLowerCase() === "pendiente",
  ).length;

  const eventosPorTipo: Record<string, number> = {};
  eventosUltimas24h.forEach((e) => {
    eventosPorTipo[e.subtipo] = (eventosPorTipo[e.subtipo] || 0) + 1;
  });

  const eventsByType = Object.entries(eventosPorTipo)
    .sort(([, a], [, b]) => b - a)
    .map(([subtipo, cantidad], idx) => ({
      tipo: subtipo.replace(/_/g, " "),
      cantidad,
      color: EVENT_BAR_COLORS[idx % EVENT_BAR_COLORS.length],
    }));
  const maxEventCount = Math.max(1, ...eventsByType.map((e) => e.cantidad));

  const stats = [
    {
      label: "Eventos detectados",
      value: eventos.length,
      detail: `${eventosUltimas24h.length} en las últimas 24 h`,
      icon: Activity,
      color: "#6366f1",
      href: "/eventos",
    },
    {
      label: "Alertas abiertas",
      value: alertasAbiertas,
      detail:
        alertasAbiertas === 0
          ? "Sin casos pendientes"
          : `${alertasActivas} activas · ${alertasEnCamino} en camino · ${alertasReconocidas} reconocidas`,
      icon: AlertTriangle,
      color: alertasAbiertas > 0 ? "#ef4444" : "#22c55e",
      href: "/alertas",
      pulse: alertasActivas > 0,
    },
    {
      label: "Nodos IoT",
      value: nodos.length,
      detail: `${nodosOnline} en línea (últimos 5 min)`,
      icon: Cpu,
      color: "#22c55e",
      href: "/patrullaje",
    },
    {
      label: "Reportes ciudadanos",
      value: reportes.length,
      detail:
        reportesPendientes > 0
          ? `${reportesPendientes} pendientes de atender`
          : "Todos gestionados",
      icon: FileText,
      color: "#f59e0b",
      href: "/reportes",
    },
  ];

  const recentAlerts = alertas.slice(0, 5);
  const zonasOrdenadas = [...zonas].sort((a, b) => b.riesgoNivel - a.riesgoNivel);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#0f172a]">
        <Sidebar />
        <main className="ml-64 p-8">
          {/* Header */}
          <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-white">Dashboard CENTINELA</h1>
                <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[#22c55e]/10 px-2.5 py-1 text-[11px] font-medium text-[#86efac] ring-1 ring-[#22c55e]/25">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22c55e] opacity-60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
                  </span>
                  En vivo
                </span>
              </div>
              <p className="mt-1 text-[#94a3b8]">
                Sistema de Seguridad Ciudadana — Milagro, Ecuador
              </p>
            </div>
            <div className="flex items-center gap-3">
              {lastUpdated && (
                <span className="text-xs text-[#64748b]">
                  Actualizado {lastUpdated.toLocaleTimeString()}
                </span>
              )}
              <button
                type="button"
                onClick={() => fetchData()}
                disabled={refreshing}
                className="flex items-center gap-2 rounded-lg border border-[#334155] bg-[#1e293b] px-3 py-2 text-sm text-[#94a3b8] transition-colors hover:border-[#6366f1]/50 hover:text-white disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                Actualizar
              </button>
            </div>
          </header>

          {/* Stats Grid */}
          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <Link
                  key={stat.label}
                  href={stat.href}
                  className="group relative overflow-hidden rounded-xl border border-[#334155] bg-[#1e293b] p-6 transition-all hover:-translate-y-0.5 hover:border-[#475569] hover:shadow-lg hover:shadow-black/20"
                >
                  <div
                    className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-[0.07] blur-2xl transition-opacity group-hover:opacity-[0.14]"
                    style={{ backgroundColor: stat.color }}
                  />
                  <div className="mb-4 flex items-center justify-between">
                    <div
                      className="relative flex h-12 w-12 items-center justify-center rounded-xl ring-1"
                      style={{
                        backgroundColor: `${stat.color}1a`,
                        // @ts-expect-error CSS var for ring color
                        "--tw-ring-color": `${stat.color}40`,
                      }}
                    >
                      <Icon className="h-6 w-6" style={{ color: stat.color }} />
                      {stat.pulse && (
                        <span className="absolute -right-1 -top-1 flex h-3 w-3">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ef4444] opacity-60" />
                          <span className="relative inline-flex h-3 w-3 rounded-full bg-[#ef4444]" />
                        </span>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-[#475569] transition-transform group-hover:translate-x-0.5 group-hover:text-[#94a3b8]" />
                  </div>
                  <h3 className="text-3xl font-bold tracking-tight text-white">{stat.value}</h3>
                  <p className="mt-1 text-sm font-medium text-[#e2e8f0]">{stat.label}</p>
                  <p className="mt-1.5 text-xs text-[#64748b]">{stat.detail}</p>
                </Link>
              );
            })}
          </div>

          <div className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-3 lg:items-stretch">
            {/* Map Section */}
            <div className="flex min-h-[480px] flex-col overflow-hidden rounded-xl border border-[#334155] bg-[#1e293b] lg:col-span-2">
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#334155] p-4">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#6366f1]" />
                  <h2 className="text-lg font-semibold text-white">Mapa de eventos y alertas</h2>
                </div>
                <div className="flex flex-wrap justify-end gap-3">
                  {zonas.map((zona, index) => (
                    <span key={zona.id} className="flex items-center gap-1.5 text-xs text-[#94a3b8]">
                      <span
                        className="h-3 w-3 rounded border border-white/20"
                        style={{ backgroundColor: ZONA_COLORS[index % ZONA_COLORS.length] }}
                      />
                      {zona.nombre}
                    </span>
                  ))}
                </div>
              </div>
              <div className="relative min-h-[400px] flex-1 overflow-hidden bg-[#0f172a]">
                <Map zonas={zonas} nodos={nodos} alertas={alertas} />
              </div>
            </div>

            {/* Alertas Recientes */}
            <div className="flex flex-col rounded-xl border border-[#334155] bg-[#1e293b]">
              <div className="flex items-center justify-between border-b border-[#334155] p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-[#f59e0b]" />
                  <h2 className="text-lg font-semibold text-white">Alertas recientes</h2>
                </div>
                <Link
                  href="/alertas"
                  className="flex items-center gap-0.5 text-sm text-[#6366f1] hover:text-[#818cf8]"
                >
                  Ver todas
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="flex-1 divide-y divide-[#334155] overflow-y-auto">
                {recentAlerts.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-12 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#22c55e]/30 bg-[#22c55e]/10">
                      <ShieldCheck className="h-6 w-6 text-[#4ade80]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#e2e8f0]">Todo en orden</p>
                      <p className="mt-1 text-xs text-[#64748b]">
                        No se han registrado alertas en el sistema.
                      </p>
                    </div>
                  </div>
                ) : (
                  recentAlerts.map((alert) => {
                    const informeCampo = getAlertaInformeCampo(alert);
                    const notasOperador = getAlertaNotasOperador(alert);
                    const estadoUi = ESTADO_UI[alert.estado] ?? {
                      label: alert.estado,
                      className: "bg-[#334155] text-[#94a3b8]",
                      dot: "bg-[#64748b]",
                    };
                    const confianza = getAlertaConfianzaPct(alert);
                    return (
                      <Link
                        key={alert.id}
                        href={`/alertas?alerta=${alert.id}`}
                        className="block p-4 transition-colors hover:bg-[#334155]/30"
                      >
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div className="flex min-w-0 items-start gap-3">
                            <span
                              className="mt-1 h-8 w-1 shrink-0 rounded-full"
                              style={{ backgroundColor: severidadColor(alert.severidad) }}
                              title={`Severidad ${alert.severidad}`}
                            />
                            <div className="min-w-0">
                              <h3 className="truncate font-mono text-sm font-semibold text-white">
                                {alert.codigo}
                              </h3>
                              <p className="truncate text-xs capitalize text-[#94a3b8]">
                                {getAlertaSubtipo(alert) || getAlertaTipoLabel(alert)}
                                {alert.zonaNombre ? ` · ${alert.zonaNombre}` : ""}
                              </p>
                            </div>
                          </div>
                          <span
                            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-medium ${estadoUi.className}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${estadoUi.dot}`} />
                            {estadoUi.label}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pl-4 text-xs">
                          <span className="text-[#64748b]" title={new Date(alert.createdAt).toLocaleString()}>
                            {formatRelativeTime(alert.createdAt)}
                          </span>
                          {confianza != null && (
                            <span className="text-[#818cf8]">IA {confianza.toFixed(0)}%</span>
                          )}
                        </div>
                        {informeCampo && (
                          <p className="mt-2 line-clamp-2 pl-4 text-xs text-[#fcd34d]">
                            <span className="font-medium text-[#fbbf24]">Informe policía:</span>{" "}
                            {informeCampo}
                          </p>
                        )}
                        {notasOperador && (
                          <p className="mt-1 line-clamp-2 pl-4 text-xs text-[#86efac]">
                            <span className="font-medium text-[#4ade80]">Cierre operador:</span>{" "}
                            {notasOperador}
                          </p>
                        )}
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Eventos por Tipo */}
            <div className="rounded-xl border border-[#334155] bg-[#1e293b] p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-[#6366f1]" />
                  <h2 className="text-lg font-semibold text-white">Eventos por tipo</h2>
                </div>
                <span className="rounded-full bg-[#0f172a] px-2.5 py-1 text-[11px] text-[#64748b] ring-1 ring-[#334155]">
                  Últimas 24 h
                </span>
              </div>
              {eventsByType.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[#334155] bg-[#0f172a]/60 px-6 py-10 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#334155] bg-[#1e293b]">
                    <Activity className="h-6 w-6 text-[#64748b]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#e2e8f0]">
                      Sin eventos en las últimas 24 horas
                    </p>
                    <p className="mt-1 text-xs text-[#64748b]">
                      Los nodos IoT no han detectado actividad en este período.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {eventsByType.map((evento) => (
                    <div key={evento.tipo} className="flex items-center gap-4">
                      <div className="w-32 truncate text-sm capitalize text-[#94a3b8]" title={evento.tipo}>
                        {evento.tipo}
                      </div>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#0f172a]">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${(evento.cantidad / maxEventCount) * 100}%`,
                            backgroundColor: evento.color,
                          }}
                        />
                      </div>
                      <div className="w-12 text-right text-sm font-semibold tabular-nums text-white">
                        {evento.cantidad}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Zonas por Nivel de Riesgo */}
            <div className="rounded-xl border border-[#334155] bg-[#1e293b] p-6">
              <div className="mb-4 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#f59e0b]" />
                <h2 className="text-lg font-semibold text-white">Zonas — nivel de riesgo</h2>
              </div>
              {zonasOrdenadas.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[#334155] bg-[#0f172a]/60 px-6 py-10 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#334155] bg-[#1e293b]">
                    <MapPin className="h-6 w-6 text-[#64748b]" />
                  </div>
                  <p className="text-sm font-medium text-[#e2e8f0]">No hay zonas registradas</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {zonasOrdenadas.map((zona) => (
                    <div
                      key={zona.id}
                      className="flex items-center justify-between gap-4 rounded-lg border border-[#334155]/50 bg-[#0f172a] p-3 transition-colors hover:border-[#334155]"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">{zona.nombre}</p>
                        {zona.descripcion && (
                          <p className="mt-0.5 truncate text-xs text-[#64748b]">{zona.descripcion}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <RiskLevelBar nivel={zona.riesgoNivel} />
                        <span className="text-[11px] text-[#64748b]">
                          Riesgo {zona.riesgoNivel}/5
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer status strip */}
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-[#334155] bg-[#1e293b] px-5 py-3 text-xs text-[#64748b]">
            <span className="flex items-center gap-1.5">
              <Wifi className="h-3.5 w-3.5 text-[#22c55e]" />
              {nodosOnline}/{nodos.length} nodos en línea
            </span>
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-[#f59e0b]" />
              {alertasAbiertas} caso{alertasAbiertas === 1 ? "" : "s"} abierto{alertasAbiertas === 1 ? "" : "s"}
            </span>
            <span className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-[#6366f1]" />
              {reportesPendientes} reporte{reportesPendientes === 1 ? "" : "s"} pendiente{reportesPendientes === 1 ? "" : "s"}
            </span>
            <span className="ml-auto">
              {zonas.length} zona{zonas.length === 1 ? "" : "s"} monitoreada{zonas.length === 1 ? "" : "s"} · Milagro, Ecuador
            </span>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

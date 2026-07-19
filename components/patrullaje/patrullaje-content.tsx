"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { ProtectedRoute } from "@/components/protected-route";
import { Sidebar } from "@/components/sidebar";
import { useOneSignalPush } from "@/components/onesignal-provider";
import { useAuth } from "@/components/auth-provider";
import { AlertaCierreModal } from "@/components/patrullero/alerta-cierre-modal";
import { coreService, Alerta, HeatMapPoint, PosicionPatrullero } from "@/lib/core-service";
import { useCentinelaRealtime } from "@/lib/use-centinela-realtime";
import { useUserPreferences, useRefreshInterval } from "@/lib/use-user-preferences";
import { usePatrulleroGpsTracking } from "@/lib/use-patrullero-gps";
import { getAlertaGeneradaPorLabel, getAlertaSubtipo, getAlertaTipoLabel } from "@/lib/alert-utils";
import { getApiErrorMessage } from "@/lib/api";
import { MAP_LEGEND_ITEMS } from "@/lib/map-markers-meta";
import { isPolicia } from "@/lib/roles";
import { toast } from "sonner";
import { ExternalLink, Loader2, LogOut, MapPin, Navigation, RefreshCw, ShieldAlert, Bell, X } from "lucide-react";
import {
  buildGoogleMapsDirectionsUrl,
  formatRouteDistance,
  formatRouteDuration,
  type DrivingRoute,
  type RoutePoint,
} from "@/lib/routing";

const PatrulleroMapClient = dynamic(
  () => import("@/components/patrullero/patrullero-map-client"),
  { ssr: false, loading: () => <div className="h-full min-h-[240px] bg-[#0f172a]" /> },
);

function estadoBadge(estado: string) {
  const styles: Record<string, string> = {
    activa: "bg-[#ef4444]/20 text-[#fca5a5]",
    en_proceso: "bg-[#38bdf8]/20 text-[#7dd3fc]",
    reconocida: "bg-[#f59e0b]/20 text-[#fcd34d]",
    completada: "bg-[#22c55e]/20 text-[#86efac]",
    cerrada: "bg-[#22c55e]/20 text-[#86efac]",
    falsa_alarma: "bg-[#64748b]/20 text-[#cbd5e1]",
  };
  return styles[estado] ?? "bg-[#334155] text-[#94a3b8]";
}

function isAlertaCerrada(estado: string) {
  return estado === "cerrada" || estado === "falsa_alarma" || estado === "completada";
}

function AlertasList({
  alertasLista,
  alertasActivas,
  tab,
  setTab,
  selectedAlerta,
  onSelectAlerta,
  onNavigateToAlerta,
  modoPatrullero,
  navigationAlertaId,
}: {
  alertasLista: Alerta[];
  alertasActivas: Alerta[];
  tab: "activas" | "todas";
  setTab: (tab: "activas" | "todas") => void;
  selectedAlerta: Alerta | null;
  onSelectAlerta: (alerta: Alerta) => void;
  onNavigateToAlerta?: (alerta: Alerta, mode?: "en-camino" | "ruta") => void;
  modoPatrullero: boolean;
  navigationAlertaId?: string | null;
}) {
  return (
    <>
      <div className="flex items-center justify-between border-b border-[#334155] px-4 py-3">
        <h2 className="text-sm font-semibold text-white">
          {modoPatrullero ? "Alertas asignadas" : "Alertas en curso"}
        </h2>
        <div className="flex rounded-lg border border-[#334155] overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => setTab("activas")}
            className={`px-3 py-1.5 ${tab === "activas" ? "bg-[#6366f1] text-white" : "text-[#94a3b8]"}`}
          >
            Activas ({alertasActivas.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("todas")}
            className={`px-3 py-1.5 ${tab === "todas" ? "bg-[#6366f1] text-white" : "text-[#94a3b8]"}`}
          >
            Todas
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {alertasLista.length === 0 ? (
          <div className="text-center py-8 text-[#64748b] text-sm space-y-2">
            <p>No hay alertas {tab === "activas" ? "activas" : "registradas"}.</p>
            <p className="text-xs">
              Cuando un nodo detecte un evento y la IA confirme, aparecerá aquí y en el mapa.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {alertasLista.map((a) => (
              <li key={a.id}>
                <div
                  className={`w-full rounded-xl border transition-colors ${
                    selectedAlerta?.id === a.id
                      ? "border-[#6366f1] bg-[#6366f1]/10"
                      : "border-[#334155] bg-[#0f172a] hover:border-[#6366f1]/50"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectAlerta(a)}
                    className="w-full text-left px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-semibold text-white">{a.codigo}</p>
                        <p className="text-xs text-[#94a3b8] mt-0.5">
                          {getAlertaTipoLabel(a)}
                          {getAlertaSubtipo(a) ? ` · ${getAlertaSubtipo(a)}` : ""}
                        </p>
                        <p className="text-xs text-[#64748b] mt-1 line-clamp-2">
                          {a.descripcion || "Sin descripción"}
                        </p>
                        <p className="text-[10px] text-[#6366f1] mt-1">
                          {getAlertaGeneradaPorLabel(a)} · {a.zonaNombre ?? "Zona N/A"}
                        </p>
                        {a.reconocidaPor && (
                          <p className="text-[10px] text-[#fcd34d] mt-1">
                            Reconocida por patrullero
                          </p>
                        )}
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${estadoBadge(a.estado)}`}>
                        {a.estado.replace(/_/g, " ")}
                      </span>
                    </div>
                    {modoPatrullero && a.estado === "activa" && (
                      <p className="mt-2 text-xs text-[#94a3b8]">
                        Usa <strong className="text-[#7dd3fc]">En camino</strong> cuando te dirijas al lugar
                      </p>
                    )}
                    {modoPatrullero && a.estado === "en_proceso" && (
                      <p className="mt-2 text-xs text-[#6366f1] font-medium">
                        Toca para informe en sitio al llegar →
                      </p>
                    )}
                    {modoPatrullero && a.estado === "reconocida" && (
                      <p className="mt-2 text-xs text-[#fcd34d]">
                        Atendida — pendiente de cierre por operador
                      </p>
                    )}
                    {!modoPatrullero && (
                      <p className="mt-2 text-xs text-[#94a3b8]">
                        Toca para centrar en el mapa
                      </p>
                    )}
                  </button>
                  {modoPatrullero &&
                    a.latitud != null &&
                    a.longitud != null &&
                    onNavigateToAlerta &&
                    (a.estado === "activa" || a.estado === "en_proceso") && (
                      <div className="px-4 pb-3 flex flex-wrap gap-2">
                        {a.estado === "activa" && (
                          <button
                            type="button"
                            onClick={() => onNavigateToAlerta(a, "en-camino")}
                            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors bg-[#38bdf8]/20 text-[#7dd3fc] border border-[#38bdf8]/40 hover:bg-[#38bdf8]/30"
                          >
                            <Navigation className="h-3.5 w-3.5" />
                            En camino
                          </button>
                        )}
                        {a.estado === "en_proceso" && (
                          <button
                            type="button"
                            onClick={() => onNavigateToAlerta(a, "ruta")}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                              navigationAlertaId === a.id
                                ? "bg-[#38bdf8]/20 text-[#7dd3fc] border border-[#38bdf8]/40"
                                : "bg-[#0f172a] text-[#94a3b8] border border-[#334155] hover:border-[#38bdf8]/50 hover:text-[#7dd3fc]"
                            }`}
                          >
                            <Navigation className="h-3.5 w-3.5" />
                            {navigationAlertaId === a.id ? "Ruta activa" : "Ver ruta"}
                          </button>
                        )}
                      </div>
                    )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function MapLegend({
  showPatrulleros = false,
  showOwnLocation = false,
}: {
  showPatrulleros?: boolean;
  showOwnLocation?: boolean;
}) {
  const items = MAP_LEGEND_ITEMS.filter(
    (item) => showPatrulleros || item.shape !== "unit",
  );

  return (
    <div className="pointer-events-none absolute top-3 left-3 z-[1000] rounded-md bg-white/95 px-3 py-2.5 text-[11px] text-slate-600 border border-slate-200/80 shadow-sm backdrop-blur-sm">
      <p className="font-medium text-slate-900 mb-2 text-xs">Leyenda</p>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2">
            {item.shape === "pin" ? (
              <span
                className="inline-block h-3 w-2.5 rounded-t-full rounded-b-[999px] border border-white shadow-sm"
                style={{ backgroundColor: item.color }}
              />
            ) : (
              <span
                className="inline-block h-3 w-3 rounded-full border border-white shadow-sm"
                style={{ backgroundColor: item.color }}
              />
            )}
            <span>{item.label}</span>
          </li>
        ))}
        {showOwnLocation && (
          <li className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full border border-white shadow-sm bg-[#10B981]" />
            <span>Tu ubicación</span>
          </li>
        )}
        <li className="flex items-center gap-2 pt-0.5 border-t border-slate-100 mt-1">
          <span className="inline-block h-3 w-3 rounded-full border border-red-300 bg-red-500/15" />
          <span>Calor IA (zona)</span>
        </li>
      </ul>
    </div>
  );
}

function mergePatrullero(
  list: PosicionPatrullero[],
  incoming: PosicionPatrullero,
): PosicionPatrullero[] {
  const idx = list.findIndex((p) => p.usuarioId === incoming.usuarioId);
  if (idx === -1) return [...list, incoming];
  const next = [...list];
  next[idx] = incoming;
  return next;
}

export default function PatrullajeContent() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const modoPatrullero = isPolicia(user);
  const { prefs } = useUserPreferences();
  const { configured: pushConfigured, subscribed: pushSubscribed, enablePush } = useOneSignalPush();
  const searchParams = useSearchParams();
  const alertaQuery = searchParams.get("alerta");

  const [heatPoints, setHeatPoints] = useState<HeatMapPoint[]>([]);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [focusPosition, setFocusPosition] = useState<[number, number] | null>(null);
  const [selectedAlerta, setSelectedAlerta] = useState<Alerta | null>(null);
  const [navigationAlerta, setNavigationAlerta] = useState<Alerta | null>(null);
  const [activeRoute, setActiveRoute] = useState<DrivingRoute | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [cierreOpen, setCierreOpen] = useState(false);
  const [tab, setTab] = useState<"activas" | "todas">("activas");
  const [patrulleros, setPatrulleros] = useState<PosicionPatrullero[]>([]);
  const gps = usePatrulleroGpsTracking(
    modoPatrullero && prefs.gpsSharingEnabled,
    user?.nombre || user?.email,
    prefs.gpsIntervalSec * 1000,
  );
  const gpsState = gps.state;
  const ownMapPosition = useMemo<[number, number] | null>(() => {
    if (gps.position) return [gps.position.lat, gps.position.lng];
    return userLocation;
  }, [gps.position, userLocation]);
  const centeredOnGpsRef = useRef(false);
  const navigationAlertaRef = useRef<Alerta | null>(null);
  const routeDismissedForRef = useRef<string | null>(null);

  useEffect(() => {
    navigationAlertaRef.current = navigationAlerta;
  }, [navigationAlerta]);

  useEffect(() => {
    if (!modoPatrullero || !gps.position || centeredOnGpsRef.current) return;
    centeredOnGpsRef.current = true;
    setFocusPosition([gps.position.lat, gps.position.lng]);
  }, [modoPatrullero, gps.position]);

  const loadPatrulleros = useCallback(async () => {
    if (modoPatrullero || isPolicia(user)) return;
    try {
      const rows = await coreService.getPosicionesPatrulleros(180);
      setPatrulleros(rows);
    } catch (err) {
      setPatrulleros([]);
      if (
        axios.isAxiosError(err) &&
        err.response?.status === 403 &&
        !isPolicia(user)
      ) {
        toast.error("Sin permiso para ver patrulleros. Cierra sesión y vuelve a entrar.");
      }
    }
  }, [modoPatrullero, user]);

  const loadData = useCallback(async (silent = false) => {
    setLoading(true);
    setLoadError(null);

    let heatCount = 0;
    let alertasCount = 0;
    const errors: string[] = [];

    try {
      const heat = await coreService.getHeatMap(30);
      heatCount = heat.points.length;
      setHeatPoints(heat.points);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        errors.push("Sin permiso para mapa de calor. Cierra sesión y vuelve a entrar.");
      } else {
        errors.push(`Mapa de calor: ${getApiErrorMessage(err)}`);
      }
      setHeatPoints([]);
    }

    try {
      const alertasData = await coreService.getAlertas();
      alertasCount = alertasData.length;
      setAlertas(alertasData);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        errors.push("Sin permiso para ver alertas. Cierra sesión y vuelve a entrar.");
      } else {
        errors.push(`Alertas: ${getApiErrorMessage(err)}`);
      }
      setAlertas([]);
    }

    if (errors.length > 0) {
      setLoadError(errors.join(" "));
      if (!silent) toast.error("Algunos datos no cargaron");
    } else if (!silent) {
      toast.success(`Actualizado: ${alertasCount} alertas, ${heatCount} puntos de calor`);
    }

    setLoading(false);
    if (!isPolicia(user)) {
      await loadPatrulleros();
    }
  }, [loadPatrulleros, user]);

  useEffect(() => {
    if (authLoading || !user) return;
    loadData(true);
  }, [loadData, authLoading, user]);

  useRefreshInterval(() => void loadData(true), !authLoading && !!user);

  const clearNavigation = useCallback(() => {
    setNavigationAlerta(null);
    setActiveRoute(null);
    setRouteLoading(false);
  }, []);

  const dismissRouteIfAlertClosed = useCallback(
    (alertaId: string, estado: string, codigo?: string) => {
      if (!modoPatrullero) return;
      if (routeDismissedForRef.current === alertaId) return;
      const nav = navigationAlertaRef.current;
      if (!nav || nav.id !== alertaId) return;
      if (!isAlertaCerrada(estado)) return;

      routeDismissedForRef.current = alertaId;
      clearNavigation();
      setCierreOpen(false);
      toast.info(`La alerta ${codigo ?? nav.codigo} fue cerrada. Se canceló la ruta.`);
    },
    [modoPatrullero, clearNavigation],
  );

  useCentinelaRealtime({
    "alerta.created": () => loadData(true),
    "alerta.updated": (payload) => {
      if (payload && typeof payload === "object") {
        const updated = payload as Alerta;
        if (updated.id && updated.estado) {
          dismissRouteIfAlertClosed(updated.id, updated.estado, updated.codigo);
        }
      }
      void loadData(true);
    },
    "patrullero.position": (payload) => {
      if (modoPatrullero || !payload || typeof payload !== "object") return;
      const p = payload as PosicionPatrullero;
      if (!p.usuarioId || p.latitud == null || p.longitud == null) return;
      setPatrulleros((prev) => mergePatrullero(prev, p));
    },
  });

  useEffect(() => {
    if (!modoPatrullero || !navigationAlerta) return;
    const current = alertas.find((a) => a.id === navigationAlerta.id);
    if (!current) {
      dismissRouteIfAlertClosed(navigationAlerta.id, "cerrada", navigationAlerta.codigo);
      return;
    }
    dismissRouteIfAlertClosed(current.id, current.estado, current.codigo);
    if (
      !isAlertaCerrada(current.estado) &&
      (current.estado !== navigationAlerta.estado ||
        current.updatedAt !== navigationAlerta.updatedAt)
    ) {
      setNavigationAlerta(current);
      if (selectedAlerta?.id === current.id) {
        setSelectedAlerta(current);
      }
    }
  }, [
    alertas,
    navigationAlerta,
    modoPatrullero,
    dismissRouteIfAlertClosed,
    selectedAlerta?.id,
  ]);

  const handleSelectAlerta = (alerta: Alerta) => {
    setSelectedAlerta(alerta);
    if (modoPatrullero) {
      if (alerta.estado === "en_proceso") {
        setCierreOpen(true);
      } else if (alerta.estado === "activa") {
        toast.info("Marca la alerta como «En camino» antes de enviar el informe en sitio.");
      } else if (alerta.estado === "reconocida") {
        toast.info("Alerta ya reconocida. El operador cerrará el caso.");
      }
    }
    if (alerta.latitud != null && alerta.longitud != null) {
      setFocusPosition([alerta.latitud, alerta.longitud]);
    }
  };

  const handleNavigateToAlerta = useCallback(
    async (alerta: Alerta, mode: "en-camino" | "ruta" = "ruta") => {
      if (alerta.latitud == null || alerta.longitud == null) {
        toast.error("Esta alerta no tiene ubicación en el mapa.");
        return;
      }
      if (!ownMapPosition) {
        toast.error("Activa tu GPS para calcular la ruta.");
        return;
      }

      let target = alerta;
      if (mode === "en-camino" && alerta.estado === "activa") {
        try {
          target = await coreService.marcarEnCaminoAlerta(alerta.id);
          setAlertas((prev) =>
            prev.map((a) => (a.id === target.id ? { ...a, ...target } : a)),
          );
          toast.success("Alerta marcada en camino");
        } catch (err) {
          toast.error(getApiErrorMessage(err, "No se pudo marcar en camino"));
          return;
        }
      }

      routeDismissedForRef.current = null;
      setNavigationAlerta(target);
      setSelectedAlerta(target);
      setActiveRoute(null);
      setRouteLoading(true);
      setFocusPosition(null);
    },
    [ownMapPosition],
  );

  const routeFrom: RoutePoint | null = ownMapPosition
    ? { lat: ownMapPosition[0], lng: ownMapPosition[1] }
    : null;
  const routeTo: RoutePoint | null =
    navigationAlerta?.latitud != null && navigationAlerta?.longitud != null
      ? { lat: navigationAlerta.latitud, lng: navigationAlerta.longitud }
      : null;

  const googleMapsUrl =
    routeFrom && routeTo ? buildGoogleMapsDirectionsUrl(routeFrom, routeTo) : null;

  useEffect(() => {
    if (!alertaQuery || alertas.length === 0) return;
    const found = alertas.find((a) => a.id === alertaQuery);
    if (found) handleSelectAlerta(found);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertaQuery, alertas]);

  useEffect(() => {
    if (!alertaQuery || !modoPatrullero || !ownMapPosition || alertas.length === 0) return;
    if (navigationAlerta?.id === alertaQuery) return;
    const found = alertas.find((a) => a.id === alertaQuery);
    if (found?.latitud != null && found?.longitud != null) {
      handleNavigateToAlerta(found);
    }
  }, [
    alertaQuery,
    alertas,
    modoPatrullero,
    ownMapPosition,
    navigationAlerta?.id,
    handleNavigateToAlerta,
  ]);

  const handleMiUbicacion = () => {
    if (gps.position) {
      const loc: [number, number] = [gps.position.lat, gps.position.lng];
      setUserLocation(loc);
      setFocusPosition(loc);
      toast.success("Ubicación actualizada");
      return;
    }
    if (!navigator.geolocation) {
      toast.error("GPS no disponible en este dispositivo");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(loc);
        setFocusPosition(loc);
        if (modoPatrullero) {
          void coreService.updatePosicionPatrullero({
            latitud: pos.coords.latitude,
            longitud: pos.coords.longitude,
            precisionM: pos.coords.accuracy,
            nombre: user?.nombre || user?.email,
          });
        }
        toast.success("Ubicación actualizada");
      },
      () => toast.error("No se pudo obtener la ubicación"),
      { enableHighAccuracy: true },
    );
  };

  const alertasActivas = alertas.filter((a) =>
    ["activa", "en_proceso", "reconocida"].includes(a.estado),
  );
  const alertasLista = tab === "activas" ? alertasActivas : alertas;

  const statsBar = (
    <div className="flex flex-wrap gap-2 text-xs">
      <span className="rounded-full bg-[#ef4444]/20 px-3 py-1 text-[#fca5a5]">
        {alertasActivas.length} alertas activas
      </span>
      <span className="rounded-full bg-[#6366f1]/20 px-3 py-1 text-[#a5b4fc]">
        {heatPoints.length} puntos calor (30 días)
      </span>
      <span className="rounded-full bg-[#334155] px-3 py-1 text-[#94a3b8]">
        {alertas.length} alertas totales
      </span>
      {!modoPatrullero && (
        <span className="rounded-full bg-[#3b82f6]/20 px-3 py-1 text-[#93c5fd]">
          {patrulleros.length} patrullero{patrulleros.length === 1 ? "" : "s"} en mapa
        </span>
      )}
    </div>
  );

  const errorBanner = loadError && (
    <div className="shrink-0 mx-4 mt-3 rounded-lg border border-[#ef4444]/40 bg-[#ef4444]/10 px-4 py-3 text-sm text-[#fca5a5] flex gap-2 items-start">
      <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
      <div>
        <p>{loadError}</p>
        <button
          type="button"
          onClick={() => logout()}
          className="mt-2 text-xs underline text-[#fca5a5]"
        >
          Cerrar sesión y volver a entrar
        </button>
      </div>
    </div>
  );

  const routeNavigationBar = navigationAlerta ? (
    <div
      className={
        modoPatrullero
          ? "shrink-0 flex flex-wrap items-center gap-2 border-b border-[#334155] bg-[#1e293b] px-3 py-2.5 text-xs"
          : "pointer-events-auto flex flex-wrap items-center gap-2 rounded-xl border border-[#334155] bg-[#1e293b]/95 px-3 py-2 text-xs shadow-lg backdrop-blur-sm"
      }
    >
      <Navigation className="h-4 w-4 text-[#38bdf8] shrink-0" />
      <span className="text-white font-medium truncate max-w-[140px] sm:max-w-none">
        {navigationAlerta.codigo}
      </span>
      {routeLoading && (
        <span className="text-[#94a3b8] inline-flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Calculando ruta…
        </span>
      )}
      {activeRoute && !routeLoading && (
        <span className="text-[#7dd3fc]">
          {formatRouteDistance(activeRoute.distanceM)} · {formatRouteDuration(activeRoute.durationSec)}
        </span>
      )}
      {googleMapsUrl && (
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-lg bg-[#6366f1] px-2.5 py-1 text-white font-medium hover:bg-[#5558e3]"
        >
          <ExternalLink className="h-3 w-3" />
          Abrir en Maps
        </a>
      )}
      <button
        type="button"
        onClick={clearNavigation}
        className="ml-auto rounded-lg border border-[#334155] p-1 text-[#94a3b8] hover:text-white"
        title="Ocultar ruta"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  ) : null;

  const mapBlock = (
    <div className={`relative overflow-hidden ${modoPatrullero ? "min-h-[38vh] flex-1 border-b border-[#334155]" : "h-full min-h-[420px] rounded-xl border border-[#334155] overflow-hidden"}`}>
      {loading && alertas.length === 0 && heatPoints.length === 0 ? (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#6366f1]" />
        </div>
      ) : (
        <PatrulleroMapClient
          heatPoints={heatPoints}
          alertas={alertas}
          patrulleros={modoPatrullero ? [] : patrulleros}
          selectedAlerta={selectedAlerta}
          selectedAlertaId={selectedAlerta?.id}
          onSelectAlerta={handleSelectAlerta}
          onNavigateToAlerta={modoPatrullero ? handleNavigateToAlerta : undefined}
          userLocation={ownMapPosition}
          focusPosition={focusPosition}
          showOwnLocation={modoPatrullero && !!ownMapPosition}
          ownLocationLabel={user?.nombre || user?.email || "Tu ubicación"}
          ownLocationPrecisionM={gps.position?.precisionM}
          routeFrom={modoPatrullero ? routeFrom : null}
          routeTo={modoPatrullero ? routeTo : null}
          onRouteChange={(route) => {
            setActiveRoute(route);
            setRouteLoading(false);
          }}
          onRouteError={(message) => {
            setRouteLoading(false);
            toast.error(message);
          }}
        />
      )}
      {!modoPatrullero && navigationAlerta && (
        <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-[1000] flex justify-center">
          {routeNavigationBar}
        </div>
      )}
      <MapLegend showPatrulleros={!modoPatrullero} showOwnLocation={modoPatrullero} />
    </div>
  );

  const alertasPanel = (
    <section className={`flex flex-col bg-[#1e293b] ${modoPatrullero ? "shrink-0 min-h-[42vh] max-h-[48vh]" : "h-full min-h-[420px] rounded-xl border border-[#334155] overflow-hidden"}`}>
      <AlertasList
        alertasLista={alertasLista}
        alertasActivas={alertasActivas}
        tab={tab}
        setTab={setTab}
        selectedAlerta={selectedAlerta}
        onSelectAlerta={handleSelectAlerta}
        onNavigateToAlerta={modoPatrullero ? handleNavigateToAlerta : undefined}
        modoPatrullero={modoPatrullero}
        navigationAlertaId={navigationAlerta?.id ?? null}
      />
    </section>
  );

  if (modoPatrullero) {
    return (
      <ProtectedRoute>
        <div className="flex h-[100dvh] flex-col bg-[#0f172a]">
          <header className="shrink-0 border-b border-[#334155] bg-[#1e293b] px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-white truncate">CENTINELA Patrulla</h1>
                <p className="text-xs text-[#94a3b8] truncate">
                  {user?.nombre || user?.email} · Policía
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                {pushConfigured && !pushSubscribed && (
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await enablePush();
                      if (ok) toast.success("Alertas push activadas");
                    }}
                    className="rounded-lg border border-[#6366f1]/50 bg-[#6366f1]/20 p-2 text-[#a5b4fc]"
                    title="Activar notificaciones push"
                  >
                    <Bell className="h-5 w-5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => loadData(false)}
                  disabled={loading}
                  className="rounded-lg border border-[#334155] p-2 text-[#94a3b8] hover:bg-[#334155] disabled:opacity-50"
                  title="Actualizar"
                >
                  <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
                </button>
                <button
                  type="button"
                  onClick={handleMiUbicacion}
                  className="rounded-lg bg-[#6366f1] px-3 py-2 text-sm font-medium text-white flex items-center gap-1"
                >
                  <MapPin className="h-4 w-4" />
                  <span className="hidden sm:inline">Mi ubicación</span>
                </button>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="rounded-lg border border-[#334155] p-2 text-[#94a3b8] hover:text-[#ef4444]"
                  title="Salir"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {statsBar}
              {modoPatrullero && (
                <span className={`rounded-full px-3 py-1 text-[10px] ${
                  gpsState === "active"
                    ? "bg-[#22c55e]/20 text-[#86efac]"
                    : gpsState === "denied"
                      ? "bg-[#ef4444]/20 text-[#fca5a5]"
                      : gpsState === "error"
                        ? "bg-[#ef4444]/20 text-[#fca5a5]"
                        : "bg-[#f59e0b]/20 text-[#fcd34d]"
                }`}>
                  {gpsState === "active" && "GPS compartido con el centro de comando"}
                  {gpsState === "waiting" && "Obteniendo ubicación…"}
                  {gpsState === "denied" && "Ubicación bloqueada — actívala en el navegador"}
                  {gpsState === "error" && (
                    gps.errorKind === "geo"
                      ? "No se pudo leer el GPS del dispositivo"
                      : gps.errorMessage?.includes("403") || gps.errorMessage?.toLowerCase().includes("permiso")
                        ? "Sin permiso GPS — cierra sesión y vuelve a entrar"
                        : "Error al enviar GPS — recarga la página"
                  )}
                  {gpsState === "idle" && "GPS inactivo"}
                </span>
              )}
            </div>
          </header>

          {errorBanner}
          {mapBlock}
          {modoPatrullero && routeNavigationBar}
          {alertasPanel}

          <AlertaCierreModal
            alerta={selectedAlerta}
            open={cierreOpen}
            onOpenChange={setCierreOpen}
            onCompleted={loadData}
          />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#0f172a]">
        <Sidebar />
        <main className="ml-64 flex flex-col h-screen p-6 gap-4">
          <header className="shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white">Patrullaje operativo</h1>
                <p className="text-sm text-[#94a3b8] mt-1">
                  Mapa de alertas en tiempo real. Gestión detallada en{" "}
                  <Link href="/alertas" className="text-[#6366f1] hover:underline">
                    Alertas
                  </Link>
                  .
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => loadData(false)}
                  disabled={loading}
                  className="rounded-lg border border-[#334155] px-3 py-2 text-sm text-[#94a3b8] hover:bg-[#334155] disabled:opacity-50 flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  Actualizar
                </button>
                {selectedAlerta && (
                  <Link
                    href={`/alertas?alerta=${selectedAlerta.id}`}
                    className="rounded-lg bg-[#6366f1] px-3 py-2 text-sm font-medium text-white flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Gestionar alerta
                  </Link>
                )}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {statsBar}
            </div>
          </header>

          {errorBanner}

          <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2 min-h-0">{mapBlock}</div>
            <div className="xl:col-span-1 min-h-0">{alertasPanel}</div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

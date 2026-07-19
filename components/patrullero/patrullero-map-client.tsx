"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Circle, Marker, Popup, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Alerta, HeatMapPoint, PosicionPatrullero } from "@/lib/core-service";
import {
  ensureMapMarkerStyles,
  getAlertMapMarkerKind,
  getAlertMapMarkerLabel,
  getAlertMarkerIcon,
  getOwnLocationMarkerIcon,
  getPatrolMarkerIcon,
  MAP_LEGEND_ITEMS,
} from "@/lib/map-markers";
import { getAlertaSubtipo, getAlertaTipoLabel } from "@/lib/alert-utils";
import { AlertRouteLayer } from "@/components/patrullero/alert-route-layer";
import type { DrivingRoute, RoutePoint } from "@/lib/routing";

function FlyToPosition({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 16, { duration: 1 });
  }, [map, position]);
  return null;
}

function formatUpdatedAt(iso: string) {
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diffSec < 60) return `hace ${diffSec}s`;
  const mins = Math.floor(diffSec / 60);
  return `hace ${mins} min`;
}

interface PatrulleroMapClientProps {
  heatPoints: HeatMapPoint[];
  alertas: Alerta[];
  patrulleros?: PosicionPatrullero[];
  selectedAlerta?: Alerta | null;
  selectedAlertaId?: string | null;
  onSelectAlerta: (alerta: Alerta) => void;
  onNavigateToAlerta?: (alerta: Alerta) => void;
  userLocation: [number, number] | null;
  focusPosition?: [number, number] | null;
  showOwnLocation?: boolean;
  ownLocationLabel?: string;
  ownLocationPrecisionM?: number;
  routeFrom?: RoutePoint | null;
  routeTo?: RoutePoint | null;
  onRouteChange?: (route: DrivingRoute | null) => void;
  onRouteError?: (message: string) => void;
}

export default function PatrulleroMapClient({
  heatPoints,
  alertas,
  patrulleros = [],
  selectedAlerta = null,
  selectedAlertaId,
  onSelectAlerta,
  onNavigateToAlerta,
  userLocation,
  focusPosition = null,
  showOwnLocation = true,
  ownLocationLabel = "Tu ubicación",
  ownLocationPrecisionM,
  routeFrom = null,
  routeTo = null,
  onRouteChange,
  onRouteError,
}: PatrulleroMapClientProps) {
  useEffect(() => {
    ensureMapMarkerStyles();
  }, []);

  const center = useMemo<[number, number]>(() => {
    if (showOwnLocation && userLocation) {
      return userLocation;
    }
    if (alertas.length > 0 && alertas[0].latitud != null && alertas[0].longitud != null) {
      return [alertas[0].latitud, alertas[0].longitud];
    }
    if (patrulleros.length > 0) {
      return [patrulleros[0].latitud, patrulleros[0].longitud];
    }
    if (heatPoints.length > 0) {
      return [heatPoints[0].lat, heatPoints[0].lng];
    }
    return [-2.14, -79.59];
  }, [alertas, heatPoints, patrulleros, showOwnLocation, userLocation]);

  const alertasActivas = alertas.filter((a) =>
    ["activa", "en_proceso", "reconocida"].includes(a.estado),
  );

  const selectedId = selectedAlerta?.id ?? selectedAlertaId ?? null;
  const linkedPatrolId = selectedAlerta?.reconocidaPor ?? null;

  const linkLine = useMemo(() => {
    if (!selectedAlerta?.reconocidaPor) return null;
    if (selectedAlerta.latitud == null || selectedAlerta.longitud == null) return null;
    const patrullero = patrulleros.find((p) => p.usuarioId === selectedAlerta.reconocidaPor);
    if (!patrullero) return null;
    return [
      [patrullero.latitud, patrullero.longitud],
      [selectedAlerta.latitud, selectedAlerta.longitud],
    ] as [number, number][];
  }, [selectedAlerta, patrulleros]);

  return (
    <MapContainer
      center={center}
      zoom={14}
      className="h-full w-full z-0"
      style={{ height: "100%", minHeight: 240, background: "#0f172a" }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <FlyToPosition position={focusPosition} />

      {routeFrom && routeTo && (
        <AlertRouteLayer
          from={routeFrom}
          to={routeTo}
          onRouteChange={onRouteChange}
          onRouteError={onRouteError}
        />
      )}

      {showOwnLocation && userLocation && (
        <Marker position={userLocation} icon={getOwnLocationMarkerIcon()} zIndexOffset={950}>
          <Popup>
            <div className="text-sm min-w-[140px]">
              <p className="font-semibold text-white">{ownLocationLabel}</p>
              <p className="text-xs text-slate-400 mt-1">Tu ubicación en patrulla</p>
              {ownLocationPrecisionM != null && (
                <p className="text-xs text-slate-500">±{Math.round(ownLocationPrecisionM)} m</p>
              )}
            </div>
          </Popup>
        </Marker>
      )}

      {patrulleros.map((p) => {
        const isLinked = p.usuarioId === linkedPatrolId;
        return (
          <Marker
            key={p.usuarioId}
            position={[p.latitud, p.longitud]}
            icon={getPatrolMarkerIcon(isLinked)}
            zIndexOffset={isLinked ? 900 : 700}
          >
            <Popup>
              <div className="text-sm min-w-[140px]">
                <p className="font-semibold text-white">
                  {p.nombre || "Patrullero"}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Actualizado {formatUpdatedAt(p.updatedAt)}
                </p>
                {p.precisionM != null && (
                  <p className="text-xs text-slate-500">±{Math.round(p.precisionM)} m</p>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}

      {linkLine && (
        <Polyline
          positions={linkLine}
          pathOptions={{ color: "#6366f1", weight: 2, dashArray: "6 8", opacity: 0.8 }}
        />
      )}

      {heatPoints.map((point) => (
        <Circle
          key={point.eventoId}
          center={[point.lat, point.lng]}
          radius={80 + point.intensity * 120}
          pathOptions={{
            color: point.subtipo === "grito" ? "#B45309" : "#BE123C",
            fillColor: point.subtipo === "grito" ? "#B45309" : "#BE123C",
            fillOpacity: 0.08 + point.intensity * 0.22,
            weight: 1,
            opacity: 0.55,
          }}
        />
      ))}

      {alertasActivas.map((alerta) => {
        if (alerta.latitud == null || alerta.longitud == null) return null;
        const isSelected = alerta.id === selectedId;
        const kind = getAlertMapMarkerKind(alerta);
        const subtipo = getAlertaSubtipo(alerta);

        return (
          <Marker
            key={alerta.id}
            position={[alerta.latitud, alerta.longitud]}
            icon={getAlertMarkerIcon(alerta, isSelected)}
            eventHandlers={{ click: () => onSelectAlerta(alerta) }}
            zIndexOffset={isSelected ? 1000 : kind === "disparo" ? 500 : 400}
          >
            <Popup>
              <div className="text-sm min-w-[160px]">
                <p className="font-bold text-white">{alerta.codigo}</p>
                <p className="text-xs font-medium text-slate-200 mt-0.5">
                  {getAlertMapMarkerLabel(kind)}
                  {subtipo ? ` · ${subtipo}` : ""}
                </p>
                <p className="text-xs text-slate-400">{getAlertaTipoLabel(alerta)}</p>
                {alerta.descripcion && (
                  <p className="text-xs text-slate-300 mt-1">{alerta.descripcion}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="text-xs text-indigo-400 underline"
                    onClick={() => onSelectAlerta(alerta)}
                  >
                    Ver detalle
                  </button>
                  {onNavigateToAlerta && (
                    <button
                      type="button"
                      className="text-xs text-sky-400 underline"
                      onClick={() => onNavigateToAlerta(alerta)}
                    >
                      Ver ruta
                    </button>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}

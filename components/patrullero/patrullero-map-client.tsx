"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Circle, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Alerta, HeatMapPoint, PosicionPatrullero } from "@/lib/core-service";
import { getAlertaTipoLabel } from "@/lib/alert-utils";

const alertIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const patrolIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

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
  userLocation: [number, number] | null;
  focusPosition?: [number, number] | null;
  showOwnLocation?: boolean;
}

export default function PatrulleroMapClient({
  heatPoints,
  alertas,
  patrulleros = [],
  selectedAlerta = null,
  selectedAlertaId,
  onSelectAlerta,
  userLocation,
  focusPosition = null,
  showOwnLocation = true,
}: PatrulleroMapClientProps) {
  const center = useMemo<[number, number]>(() => {
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
  }, [alertas, heatPoints, patrulleros]);

  const alertasActivas = alertas.filter((a) =>
    ["activa", "reconocida"].includes(a.estado),
  );

  const selectedId = selectedAlerta?.id ?? selectedAlertaId ?? null;

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
      style={{ height: "100%", minHeight: 240 }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FlyToPosition position={focusPosition ?? userLocation} />

      {showOwnLocation && userLocation && (
        <Marker position={userLocation}>
          <Popup>Tu ubicación</Popup>
        </Marker>
      )}

      {patrulleros.map((p) => (
        <Marker
          key={p.usuarioId}
          position={[p.latitud, p.longitud]}
          icon={patrolIcon}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-bold text-blue-700">
                {p.nombre || "Patrullero"}
              </p>
              <p className="text-xs text-gray-600">
                Actualizado {formatUpdatedAt(p.updatedAt)}
              </p>
              {p.precisionM != null && (
                <p className="text-xs text-gray-500">±{Math.round(p.precisionM)} m</p>
              )}
            </div>
          </Popup>
        </Marker>
      ))}

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
            color: "#ef4444",
            fillColor: "#ef4444",
            fillOpacity: 0.15 + point.intensity * 0.35,
            weight: 1,
          }}
        />
      ))}

      {alertasActivas.map((alerta) => {
        if (alerta.latitud == null || alerta.longitud == null) return null;
        const isSelected = alerta.id === selectedId;
        return (
          <Marker
            key={alerta.id}
            position={[alerta.latitud, alerta.longitud]}
            icon={alertIcon}
            eventHandlers={{ click: () => onSelectAlerta(alerta) }}
            opacity={isSelected ? 1 : 0.85}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-bold text-red-700">{alerta.codigo}</p>
                <p>{getAlertaTipoLabel(alerta)}</p>
                <p className="text-xs">{alerta.descripcion}</p>
                <button
                  type="button"
                  className="mt-2 text-xs text-blue-600 underline"
                  onClick={() => onSelectAlerta(alerta)}
                >
                  Ver detalle
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}

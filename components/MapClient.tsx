"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMap } from "react-leaflet";

function MapResize() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 0);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import wellknown from "wellknown";
import { Zona, Nodo, Alerta } from "@/lib/core-service";
import { getAlertaGeneradaPorLabel, getAlertaSubtipo, getAlertaTipoLabel } from "@/lib/alert-utils";
import {
  ensureMapMarkerStyles,
  getAlertMapMarkerKind,
  getAlertMapMarkerLabel,
  getAlertMarkerIcon,
} from "@/lib/map-markers";

// Corrección de íconos por defecto de Leaflet en React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Iconos personalizados
const nodoIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface MapClientProps {
  zonas: Zona[];
  nodos: Nodo[];
  alertas: Alerta[];
}

// Colores únicos por zona para evitar que se confundan al superponerse
const ZONA_COLORS = [
  "#6366f1", // Indigo
  "#06b6d4", // Cyan
  "#f59e0b", // Amber
  "#10b981", // Emerald
  "#ec4899", // Pink
  "#8b5cf6", // Violet
  "#f97316", // Orange
  "#14b8a6", // Teal
];

const getRiesgoLabel = (nivel: number) => {
  if (nivel >= 4) return "Crítico";
  if (nivel === 3) return "Alto";
  if (nivel === 2) return "Medio";
  return "Bajo";
};

export default function MapClient({ zonas, nodos, alertas }: MapClientProps) {
  const milagroCenter: [number, number] = [-2.14, -79.59];

  useEffect(() => {
    ensureMapMarkerStyles();
  }, []);

  // Parsea POINT(lon lat) a [lat, lon]
  const parsePoint = (wkt: string | undefined | null): [number, number] | null => {
    if (!wkt) return null;
    try {
      const geojson = wellknown(wkt);
      if (geojson && geojson.type === "Point") {
        return [geojson.coordinates[1], geojson.coordinates[0]];
      }
    } catch (e) {
      console.error("Error parseando punto WKT", e);
    }
    return null;
  };

  return (
    <MapContainer
      center={milagroCenter}
      zoom={12}
      className="h-full w-full z-0"
      style={{ height: "100%", width: "100%", background: "#0f172a" }}
    >
      <MapResize />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      {/* Capa de Zonas (Polígonos) */}
      {zonas.map((zona, index) => {
        if (!zona.geomWkt) return null;
        try {
          const geojson = wellknown(zona.geomWkt);
          if (geojson && (geojson.type === "Polygon" || geojson.type === "MultiPolygon")) {
            let positions: any[] = [];
            
            if (geojson.type === "Polygon") {
              positions = geojson.coordinates[0].map((coord: any) => [coord[1], coord[0]]);
            } else if (geojson.type === "MultiPolygon") {
              positions = geojson.coordinates.map((poly: any) => 
                poly[0].map((coord: any) => [coord[1], coord[0]])
              );
            }

            const color = ZONA_COLORS[index % ZONA_COLORS.length];

            return (
              <Polygon 
                key={zona.id}
                positions={positions}
                pathOptions={{ 
                  color: color,
                  fillColor: color,
                  fillOpacity: 0.08,
                  weight: 2,
                  opacity: 0.8,
                  dashArray: "6 4",
                }}
              >
                <Popup>
                  <div style={{ minWidth: 160 }}>
                    <div className="text-sm font-bold" style={{ color }}>{zona.nombre}</div>
                    <div className="text-xs text-slate-400 mt-1">
                      Riesgo: <strong className="text-slate-200">{getRiesgoLabel(zona.riesgoNivel)}</strong> (Nivel {zona.riesgoNivel})
                    </div>
                    <div className="text-xs text-slate-300 mt-1">{zona.descripcion}</div>
                  </div>
                </Popup>
              </Polygon>
            );
          }
        } catch (e) {
          console.error("Error renderizando zona", zona.nombre, e);
        }
        return null;
      })}

      {/* Capa de Nodos IoT */}
      {nodos.map((nodo) => {
        const pos = parsePoint(nodo.ubicacion);
        if (!pos) return null;

        return (
          <Marker key={nodo.id} position={pos} icon={nodoIcon}>
            <Popup>
              <div className="text-sm font-bold text-emerald-400">Nodo: {nodo.codigo}</div>
              <div className="text-xs text-slate-300">{nodo.descripcion}</div>
            </Popup>
          </Marker>
        );
      })}

      {/* Capa de Alertas Activas */}
      {alertas.filter(a => a.estado === "activa").map((alerta) => {
        let pos: [number, number] | null = null;
        if (alerta.latitud && alerta.longitud) {
          pos = [alerta.latitud, alerta.longitud];
        } else {
          const ubicacionRaw = alerta.evento?.ubicacion || alerta.reporte?.ubicacion;
          if (ubicacionRaw) {
            pos = parsePoint(ubicacionRaw);
          }
        }

        if (!pos) return null;

        const kind = getAlertMapMarkerKind(alerta);
        const subtipo = getAlertaSubtipo(alerta);

        return (
          <Marker key={alerta.id} position={pos} icon={getAlertMarkerIcon(alerta)}>
            <Popup>
              <div className="text-sm font-bold text-white">Alerta {alerta.codigo}</div>
              <div className="text-xs font-medium text-slate-200">{getAlertMapMarkerLabel(kind)}</div>
              {subtipo && (
                <div className="text-xs capitalize text-slate-400">Subtipo: {subtipo}</div>
              )}
              {alerta.descripcion && <div className="text-xs text-slate-300">{alerta.descripcion}</div>}
              <div className="text-xs text-slate-400">Generada por: {getAlertaGeneradaPorLabel(alerta)}</div>
              <div className="text-xs text-slate-400">Estado: {alerta.estado}</div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}


"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import wellknown from "wellknown";
import { Zona, Nodo, Alerta } from "@/lib/core-service";

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

const alertaIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
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

const getRiesgoColor = (nivel: number) => {
  if (nivel >= 4) return "#ef4444"; // Rojo
  if (nivel === 3) return "#f59e0b"; // Naranja
  if (nivel === 2) return "#eab308"; // Amarillo
  return "#22c55e"; // Verde
};

export default function MapClient({ zonas, nodos, alertas }: MapClientProps) {
  const milagroCenter: [number, number] = [-2.14, -79.59]; // Centro aproximado de Milagro

  // Parsea POINT(lon lat) a [lat, lon]
  const parsePoint = (wkt: string): [number, number] | null => {
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
      zoom={13} 
      style={{ height: "100%", width: "100%", background: "#0f172a" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      {/* Capa de Zonas (Polígonos) */}
      {zonas.map((zona) => {
        if (!zona.geomWkt) return null;
        try {
          const geojson = wellknown(zona.geomWkt);
          if (geojson && (geojson.type === "Polygon" || geojson.type === "MultiPolygon")) {
            // Leaflet espera LatLng, GeoJSON es LngLat.
            // Para polígonos, react-leaflet usa [lat, lng]
            let positions: any[] = [];
            
            if (geojson.type === "Polygon") {
              positions = geojson.coordinates[0].map((coord: any) => [coord[1], coord[0]]);
            } else if (geojson.type === "MultiPolygon") {
              positions = geojson.coordinates.map((poly: any) => 
                poly[0].map((coord: any) => [coord[1], coord[0]])
              );
            }

            return (
              <Polygon 
                key={zona.id}
                positions={positions}
                pathOptions={{ 
                  color: getRiesgoColor(zona.riesgoNivel), 
                  fillColor: getRiesgoColor(zona.riesgoNivel),
                  fillOpacity: 0.2,
                  weight: 2
                }}
              >
                <Popup>
                  <div className="text-sm font-semibold">{zona.nombre}</div>
                  <div className="text-xs text-gray-500">Riesgo: Nivel {zona.riesgoNivel}</div>
                  <div className="text-xs">{zona.descripcion}</div>
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
              <div className="text-sm font-bold text-green-700">Nodo: {nodo.codigo}</div>
              <div className="text-xs">{nodo.descripcion}</div>
            </Popup>
          </Marker>
        );
      })}

      {/* Capa de Alertas Activas */}
      {alertas.filter(a => a.estado === "activa").map((alerta) => {
        // En una alerta real, su ubicación viene del evento asociado o del reporte
        const ubicacionRaw = alerta.evento?.ubicacion || alerta.reporte?.ubicacion;
        if (!ubicacionRaw) return null;

        const pos = parsePoint(ubicacionRaw);
        if (!pos) return null;

        return (
          <Marker key={alerta.id} position={pos} icon={alertaIcon}>
            <Popup>
              <div className="text-sm font-bold text-red-600">Alerta {alerta.codigo}</div>
              <div className="text-xs capitalize">Tipo: {alerta.evento?.tipo || alerta.reporte?.tipo} - {alerta.evento?.subtipo}</div>
              <div className="text-xs">Estado: {alerta.estado}</div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}

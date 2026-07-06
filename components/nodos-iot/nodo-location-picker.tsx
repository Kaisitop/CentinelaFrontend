"use client";

import { useEffect } from "react";
import { MapContainer, Marker, Polygon, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type { LatLng } from "@/lib/zona-geometry";

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function MapResize() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 0);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

function FitZonaBounds({ polygons }: { polygons: LatLng[][] }) {
  const map = useMap();

  useEffect(() => {
    if (polygons.length === 0) return;
    const bounds = L.latLngBounds(polygons.flat());
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 16 });
  }, [map, polygons]);

  return null;
}

function PickLocation({
  enabled,
  onPick,
}: {
  enabled: boolean;
  onPick: (pos: LatLng) => void;
}) {
  useMapEvents({
    click: (e) => {
      if (!enabled) return;
      onPick([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

export interface NodoLocationPickerProps {
  zonaId: string;
  center: LatLng;
  polygons: LatLng[][];
  position: LatLng | null;
  onPick: (pos: LatLng) => void;
  onDragEnd: (lat: number, lng: number) => void;
}

export default function NodoLocationPicker({
  zonaId,
  center,
  polygons,
  position,
  onPick,
  onDragEnd,
}: NodoLocationPickerProps) {
  return (
    <MapContainer
      key={zonaId}
      center={center}
      zoom={14}
      className="h-full w-full z-0"
      style={{ height: "100%", width: "100%", background: "#0f172a" }}
      scrollWheelZoom
    >
      <MapResize />
      <FitZonaBounds polygons={polygons} />
      <PickLocation enabled onPick={onPick} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      {polygons.map((positions, index) => (
        <Polygon
          key={`${zonaId}-${index}`}
          positions={positions}
          pathOptions={{
            color: "#6366f1",
            fillColor: "#6366f1",
            fillOpacity: 0.12,
            weight: 2,
            dashArray: "6 4",
          }}
        />
      ))}

      {position && (
        <Marker
          key={`${position[0]}-${position[1]}`}
          position={position}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const latlng = (e.target as L.Marker).getLatLng();
              onDragEnd(latlng.lat, latlng.lng);
            },
          }}
        />
      )}
    </MapContainer>
  );
}

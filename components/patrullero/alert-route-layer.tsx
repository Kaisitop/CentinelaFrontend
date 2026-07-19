"use client";

import { useEffect, useRef, useState } from "react";
import { Polyline, useMap } from "react-leaflet";
import {
  fetchDrivingRoute,
  roundRoutePoint,
  type DrivingRoute,
  type RoutePoint,
} from "@/lib/routing";

function FitRouteBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length < 2) return;
    map.fitBounds(positions, { padding: [56, 56], maxZoom: 16 });
  }, [map, positions]);

  return null;
}

interface AlertRouteLayerProps {
  from: RoutePoint | null;
  to: RoutePoint | null;
  onRouteChange?: (route: DrivingRoute | null) => void;
  onError?: (message: string) => void;
}

export function AlertRouteLayer({
  from,
  to,
  onRouteChange,
  onError,
}: AlertRouteLayerProps) {
  const [route, setRoute] = useState<DrivingRoute | null>(null);
  const onRouteChangeRef = useRef(onRouteChange);
  const onErrorRef = useRef(onError);
  onRouteChangeRef.current = onRouteChange;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!from || !to) {
      setRoute(null);
      onRouteChangeRef.current?.(null);
      return;
    }

    const origin = roundRoutePoint(from);
    const destination = roundRoutePoint(to);

    let cancelled = false;

    void (async () => {
      try {
        const result = await fetchDrivingRoute(origin, destination);
        if (cancelled) return;
        setRoute(result);
        onRouteChangeRef.current?.(result);
      } catch (err) {
        if (cancelled) return;
        setRoute(null);
        onRouteChangeRef.current?.(null);
        onErrorRef.current?.(
          err instanceof Error ? err.message : "No se pudo calcular la ruta",
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [from?.lat, from?.lng, to?.lat, to?.lng]);

  if (!route || route.coordinates.length < 2) {
    return null;
  }

  return (
    <>
      <FitRouteBounds positions={route.coordinates} />
      <Polyline
        positions={route.coordinates}
        pathOptions={{
          color: "#38bdf8",
          weight: 6,
          opacity: 0.92,
          lineJoin: "round",
          lineCap: "round",
        }}
      />
      <Polyline
        positions={route.coordinates}
        pathOptions={{
          color: "#6366f1",
          weight: 3,
          opacity: 0.95,
          dashArray: "1 12",
          lineJoin: "round",
        }}
      />
    </>
  );
}

export type RoutePoint = {
  lat: number;
  lng: number;
};

export type DrivingRoute = {
  coordinates: [number, number][];
  distanceM: number;
  durationSec: number;
};

export function formatRouteDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatRouteDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} s`;
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}

export function buildGoogleMapsDirectionsUrl(from: RoutePoint, to: RoutePoint): string {
  const params = new URLSearchParams({
    api: "1",
    origin: `${from.lat},${from.lng}`,
    destination: `${to.lat},${to.lng}`,
    travelmode: "driving",
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function roundCoord(value: number): number {
  return Math.round(value * 10000) / 10000;
}

export function roundRoutePoint(p: RoutePoint): RoutePoint {
  return { lat: roundCoord(p.lat), lng: roundCoord(p.lng) };
}

export async function fetchDrivingRoute(
  from: RoutePoint,
  to: RoutePoint,
): Promise<DrivingRoute> {
  const params = new URLSearchParams({
    fromLat: String(from.lat),
    fromLng: String(from.lng),
    toLat: String(to.lat),
    toLng: String(to.lng),
  });

  const res = await fetch(`/api/routing?${params.toString()}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message ?? "No se pudo calcular la ruta");
  }

  return res.json() as Promise<DrivingRoute>;
}

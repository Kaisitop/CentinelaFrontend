import wellknown from "wellknown";

export type LatLng = [number, number];

function ringToLatLng(ring: number[][]): LatLng[] {
  return ring.map(([lng, lat]) => [lat, lng]);
}

/** Polígonos en formato Leaflet: cada entrada es un anillo exterior [lat, lng][] */
export function parseZonaPolygons(geomWkt?: string | null): LatLng[][] {
  if (!geomWkt) return [];

  try {
    const geojson = wellknown(geomWkt);
    if (!geojson) return [];

    if (geojson.type === "Polygon") {
      return [ringToLatLng(geojson.coordinates[0])];
    }

    if (geojson.type === "MultiPolygon") {
      return geojson.coordinates.map((poly) => ringToLatLng(poly[0]));
    }
  } catch {
    return [];
  }

  return [];
}

function pointInRing(lat: number, lng: number, ring: LatLng[]): boolean {
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [yi, xi] = ring[i];
    const [yj, xj] = ring[j];
    const intersect =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

export function zonaHasGeometry(geomWkt?: string | null): boolean {
  return parseZonaPolygons(geomWkt).length > 0;
}

export function isPointInZona(lat: number, lng: number, geomWkt?: string | null): boolean {
  const polygons = parseZonaPolygons(geomWkt);
  if (polygons.length === 0) return true;
  return polygons.some((ring) => pointInRing(lat, lng, ring));
}

export function getZonaCentroid(geomWkt?: string | null): LatLng | null {
  const polygons = parseZonaPolygons(geomWkt);
  if (polygons.length === 0) return null;

  const ring = polygons[0];
  if (ring.length === 0) return null;

  const sum = ring.reduce<[number, number]>(
    (acc, [lat, lng]) => [acc[0] + lat, acc[1] + lng],
    [0, 0],
  );

  return [sum[0] / ring.length, sum[1] / ring.length];
}

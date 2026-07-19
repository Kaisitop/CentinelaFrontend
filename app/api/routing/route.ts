import { NextRequest, NextResponse } from "next/server";

const OSRM_BASE =
  process.env.OSRM_URL?.replace(/\/$/, "") ??
  "https://router.project-osrm.org";

function parseCoord(value: string | null, min: number, max: number, label: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) {
    throw new Error(`Coordenada inválida: ${label}`);
  }
  return n;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const fromLat = parseCoord(searchParams.get("fromLat"), -90, 90, "fromLat");
    const fromLng = parseCoord(searchParams.get("fromLng"), -180, 180, "fromLng");
    const toLat = parseCoord(searchParams.get("toLat"), -90, 90, "toLat");
    const toLng = parseCoord(searchParams.get("toLng"), -180, 180, "toLng");

    const url =
      `${OSRM_BASE}/route/v1/driving/` +
      `${fromLng},${fromLat};${toLng},${toLat}` +
      "?overview=full&geometries=geojson&steps=false";

    const osrmRes = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 0 },
    });

    if (!osrmRes.ok) {
      return NextResponse.json(
        { message: "El servicio de rutas no respondió correctamente" },
        { status: 502 },
      );
    }

    const data = await osrmRes.json();
    const route = data?.routes?.[0];
    if (!route?.geometry?.coordinates?.length) {
      return NextResponse.json(
        { message: "No hay ruta disponible entre estos puntos" },
        { status: 404 },
      );
    }

    const coordinates = (route.geometry.coordinates as [number, number][]).map(
      ([lng, lat]) => [lat, lng] as [number, number],
    );

    return NextResponse.json({
      coordinates,
      distanceM: Math.round(route.distance ?? 0),
      durationSec: Math.round(route.duration ?? 0),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al calcular ruta";
    return NextResponse.json({ message }, { status: 400 });
  }
}

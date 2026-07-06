"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { getApiErrorMessage } from "@/lib/api";
import { coreService, type CreateNodoPayload, type Zona } from "@/lib/core-service";
import {
  getZonaCentroid,
  isPointInZona,
  parseZonaPolygons,
  zonaHasGeometry,
  type LatLng,
} from "@/lib/zona-geometry";

const NodoLocationPicker = dynamic(() => import("./nodo-location-picker"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#0f172a] text-sm text-[#94a3b8]">
      Cargando mapa…
    </div>
  ),
});

const inputClass =
  "w-full rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2.5 text-sm text-white placeholder:text-[#64748b] focus:border-[#6366f1] focus:outline-none focus:ring-1 focus:ring-[#6366f1]";

const MILAGRO_CENTER: LatLng = [-2.14, -79.59];

interface NodoCreateDialogProps {
  open: boolean;
  zonas: Zona[];
  defaultZonaId?: string | null;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const emptyForm = (zonaId = ""): CreateNodoPayload & { latitudStr: string; longitudStr: string } => ({
  codigo: "",
  zonaId,
  descripcion: "",
  versionFw: "",
  latitudStr: "",
  longitudStr: "",
});

export function NodoCreateDialog({
  open,
  zonas,
  defaultZonaId,
  onOpenChange,
  onCreated,
}: NodoCreateDialogProps) {
  const [form, setForm] = useState(emptyForm(defaultZonaId ?? ""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationHint, setLocationHint] = useState<string | null>(null);
  const [position, setPosition] = useState<LatLng | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [locationValid, setLocationValid] = useState<boolean | null>(null);

  const selectedZona = useMemo(
    () => zonas.find((z) => z.id === form.zonaId) ?? null,
    [zonas, form.zonaId],
  );

  const zonaPolygons = useMemo(
    () => parseZonaPolygons(selectedZona?.geomWkt ?? selectedZona?.geom),
    [selectedZona],
  );

  const hasZonaGeometry = zonaHasGeometry(selectedZona?.geomWkt ?? selectedZona?.geom);

  const validateAndSetPosition = useCallback(
    (lat: number, lng: number, updateFields = true): boolean => {
      const geom = selectedZona?.geomWkt ?? selectedZona?.geom;
      const inside = isPointInZona(lat, lng, geom);

      setLocationValid(inside);

      if (!inside) {
        setLocationHint("La ubicación debe estar dentro de la zona seleccionada.");
        return false;
      }

      setLocationHint(null);
      setPosition([lat, lng]);

      if (updateFields) {
        setForm((f) => ({
          ...f,
          latitudStr: lat.toFixed(6),
          longitudStr: lng.toFixed(6),
        }));
      }

      return true;
    },
    [selectedZona],
  );

  useEffect(() => {
    if (open) {
      setForm(emptyForm(defaultZonaId ?? ""));
      setError(null);
      setLocationHint(null);
      setPosition(null);
      setLocationValid(null);
      setGeoLoading(false);
    }
  }, [open, defaultZonaId]);

  useEffect(() => {
    if (!open || !form.zonaId) return;

    setPosition(null);
    setLocationValid(null);
    setLocationHint(null);
    setForm((f) => ({ ...f, latitudStr: "", longitudStr: "" }));
  }, [open, form.zonaId]);

  useEffect(() => {
    if (!open || !form.zonaId || !selectedZona) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const ok = validateAndSetPosition(lat, lng);

        if (!ok) {
          const centroid = getZonaCentroid(selectedZona.geomWkt ?? selectedZona.geom);
          if (centroid) {
            setLocationHint(
              "Tu ubicación actual está fuera de la zona. Marca el nodo dentro del polígono.",
            );
          }
        }

        setGeoLoading(false);
      },
      () => {
        setGeoLoading(false);
        if (hasZonaGeometry) {
          setLocationHint("No se pudo obtener tu ubicación. Marca el punto dentro de la zona.");
        }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  }, [open, form.zonaId, selectedZona, hasZonaGeometry, validateAndSetPosition]);

  useEffect(() => {
    if (!open || !form.zonaId) return;

    const latStr = form.latitudStr.trim();
    const lonStr = form.longitudStr.trim();
    if (!latStr || !lonStr) {
      setPosition(null);
      setLocationValid(null);
      return;
    }

    const lat = Number(latStr);
    const lng = Number(lonStr);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return;

    const geom = selectedZona?.geomWkt ?? selectedZona?.geom;
    const inside = isPointInZona(lat, lng, geom);
    setLocationValid(inside);
    setPosition([lat, lng]);

    if (!inside) {
      setLocationHint("Las coordenadas ingresadas están fuera de la zona seleccionada.");
    } else {
      setLocationHint(null);
    }
  }, [open, form.zonaId, form.latitudStr, form.longitudStr, selectedZona]);

  const handleZonaChange = (zonaId: string) => {
    setForm((f) => ({
      ...f,
      zonaId,
      latitudStr: "",
      longitudStr: "",
    }));
    setPosition(null);
    setLocationValid(null);
    setLocationHint(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const codigo = form.codigo.trim();
    if (!codigo) {
      setError("El código del nodo es obligatorio.");
      return;
    }
    if (codigo.length > 50) {
      setError("El código no puede superar 50 caracteres.");
      return;
    }
    if (!form.zonaId) {
      setError("Selecciona una zona.");
      return;
    }

    const latStr = form.latitudStr.trim();
    const lonStr = form.longitudStr.trim();

    if (!latStr || !lonStr) {
      setError(
        hasZonaGeometry
          ? "Marca la ubicación del nodo dentro de la zona en el mapa."
          : "Ingresa latitud y longitud, o marca el punto en el mapa.",
      );
      return;
    }

    const latitud = Number(latStr);
    const longitud = Number(lonStr);

    if (!Number.isFinite(latitud) || !Number.isFinite(longitud)) {
      setError("Latitud y longitud deben ser números válidos.");
      return;
    }
    if (latitud < -90 || latitud > 90 || longitud < -180 || longitud > 180) {
      setError("Coordenadas fuera de rango (lat: -90 a 90, lon: -180 a 180).");
      return;
    }

    const geom = selectedZona?.geomWkt ?? selectedZona?.geom;
    if (!isPointInZona(latitud, longitud, geom)) {
      setError("El nodo debe ubicarse dentro de la zona seleccionada.");
      return;
    }

    const payload: CreateNodoPayload = {
      codigo,
      zonaId: form.zonaId,
      latitud,
      longitud,
      ...(form.descripcion?.trim() ? { descripcion: form.descripcion.trim() } : {}),
      ...(form.versionFw?.trim() ? { versionFw: form.versionFw.trim() } : {}),
    };

    setLoading(true);
    try {
      await coreService.createNodo(payload);
      onCreated();
      onOpenChange(false);
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudo crear el nodo."));
    } finally {
      setLoading(false);
    }
  };

  const mapCenter =
    position ?? getZonaCentroid(selectedZona?.geomWkt ?? selectedZona?.geom) ?? MILAGRO_CENTER;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="z-[100] bg-black/70 backdrop-blur-sm"
        className="z-[100] max-h-[90vh] overflow-y-auto border-[#334155] bg-[#1e293b] text-white sm:max-w-lg"
      >
        <DialogTitle className="text-lg font-semibold text-white">Registrar nodo IoT</DialogTitle>
        <DialogDescription className="text-sm text-[#94a3b8]">
          Primero elige el código y la zona. Luego marca en el mapa la ubicación del nodo dentro de esa zona.
        </DialogDescription>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-[#ef4444]/40 bg-[#ef4444]/10 px-3 py-2 text-sm text-[#fca5a5]"
            >
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="nodo-codigo" className="text-sm font-medium text-[#e2e8f0]">
              Código <span className="text-[#ef4444]">*</span>
            </label>
            <input
              id="nodo-codigo"
              type="text"
              required
              maxLength={50}
              value={form.codigo}
              onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))}
              placeholder="NODO-MIL-001"
              className={`${inputClass} font-mono`}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="nodo-zona" className="text-sm font-medium text-[#e2e8f0]">
              Zona <span className="text-[#ef4444]">*</span>
            </label>
            <select
              id="nodo-zona"
              required
              value={form.zonaId}
              onChange={(e) => handleZonaChange(e.target.value)}
              className={inputClass}
            >
              <option value="">Seleccionar zona…</option>
              {zonas.map((zona) => (
                <option key={zona.id} value={zona.id}>
                  {zona.nombre}
                </option>
              ))}
            </select>
          </div>

          {!form.zonaId ? (
            <div className="rounded-xl border border-dashed border-[#334155] bg-[#0f172a]/60 px-4 py-8 text-center text-sm text-[#94a3b8]">
              Selecciona una zona para ver el mapa y marcar la ubicación del nodo.
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-medium text-[#e2e8f0]">
                    Ubicación en {selectedZona?.nombre}
                  </label>
                  <span className="text-xs text-[#64748b]">
                    {geoLoading
                      ? "Obteniendo tu ubicación…"
                      : "Clic en el mapa o arrastra el marcador"}
                  </span>
                </div>

                <div className="overflow-hidden rounded-xl border border-[#334155] bg-[#0f172a]">
                  <div className="h-[260px] w-full">
                    <NodoLocationPicker
                      zonaId={form.zonaId}
                      center={mapCenter}
                      polygons={zonaPolygons}
                      position={position}
                      onPick={([lat, lng]) => validateAndSetPosition(lat, lng)}
                      onDragEnd={(lat, lng) => validateAndSetPosition(lat, lng)}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-[#334155] px-3 py-2 text-xs">
                    <span
                      className={
                        locationValid === false
                          ? "text-[#fca5a5]"
                          : locationValid === true
                            ? "text-[#86efac]"
                            : "text-[#94a3b8]"
                      }
                    >
                      {locationHint ??
                        (locationValid === true
                          ? "Ubicación válida dentro de la zona."
                          : "El polígono resaltado es la zona seleccionada.")}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setPosition(null);
                        setLocationValid(null);
                        setLocationHint(null);
                        setForm((f) => ({ ...f, latitudStr: "", longitudStr: "" }));
                      }}
                      className="shrink-0 text-[#818cf8] hover:text-[#a5b4fc]"
                    >
                      Limpiar
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="nodo-lat" className="text-sm font-medium text-[#e2e8f0]">
                    Latitud <span className="text-[#ef4444]">*</span>
                  </label>
                  <input
                    id="nodo-lat"
                    type="text"
                    inputMode="decimal"
                    required
                    value={form.latitudStr}
                    onChange={(e) => setForm((f) => ({ ...f, latitudStr: e.target.value }))}
                    placeholder="-2.13450"
                    className={inputClass}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="nodo-lon" className="text-sm font-medium text-[#e2e8f0]">
                    Longitud <span className="text-[#ef4444]">*</span>
                  </label>
                  <input
                    id="nodo-lon"
                    type="text"
                    inputMode="decimal"
                    required
                    value={form.longitudStr}
                    onChange={(e) => setForm((f) => ({ ...f, longitudStr: e.target.value }))}
                    placeholder="-79.59321"
                    className={inputClass}
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="nodo-descripcion" className="text-sm font-medium text-[#e2e8f0]">
              Descripción
            </label>
            <textarea
              id="nodo-descripcion"
              rows={2}
              value={form.descripcion ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
              placeholder="Ubicación física, referencia de calle, etc."
              className={`${inputClass} resize-none`}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="nodo-fw" className="text-sm font-medium text-[#e2e8f0]">
              Versión firmware
            </label>
            <input
              id="nodo-fw"
              type="text"
              maxLength={50}
              value={form.versionFw ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, versionFw: e.target.value }))}
              placeholder="v1.2.0"
              className={`${inputClass} font-mono`}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1 rounded-xl border border-[#334155] bg-[#0f172a] px-4 py-2.5 text-sm text-white transition-colors hover:bg-[#334155] disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || zonas.length === 0 || !form.zonaId || locationValid === false}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#6366f1] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4f46e5] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Creando…" : "Crear nodo"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import L from "leaflet";
import type { Alerta } from "./core-service";
import {
  COLORS,
  GPS_COLOR,
  PATROL_COLOR,
  PIN_W,
  PIN_H,
  PIN_ANCHOR,
  UNIT,
  UNIT_ANCHOR,
  getAlertMapMarkerKind,
  glyphFor,
  pinSvg,
  unitSvg,
} from "./map-markers-meta";

export type { AlertMapMarkerKind } from "./map-markers-meta";
export {
  getAlertMapMarkerKind,
  getAlertMapMarkerLabel,
  MAP_LEGEND_ITEMS,
} from "./map-markers-meta";

const cache = new Map<string, L.DivIcon>();

function divIcon(
  html: string,
  size: [number, number],
  anchor: [number, number],
): L.DivIcon {
  return L.divIcon({
    className: "centinela-map-icon",
    html,
    iconSize: size,
    iconAnchor: anchor,
    popupAnchor: [0, -anchor[1] + 6],
  });
}

export function getAlertMarkerIcon(alerta: Alerta, selected = false): L.DivIcon {
  const kind = getAlertMapMarkerKind(alerta);
  const key = `alert-${kind}-${selected}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const color = COLORS[kind];
  const icon = divIcon(
    pinSvg(color, glyphFor(kind, color), selected, key),
    [PIN_W, PIN_H],
    PIN_ANCHOR,
  );
  cache.set(key, icon);
  return icon;
}

export function getPatrolMarkerIcon(selected = false): L.DivIcon {
  const key = `patrol-${selected}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const icon = divIcon(
    unitSvg(PATROL_COLOR, glyphFor("patrol", PATROL_COLOR), selected, key),
    [UNIT, UNIT],
    UNIT_ANCHOR,
  );
  cache.set(key, icon);
  return icon;
}

export function getOwnLocationMarkerIcon(): L.DivIcon {
  const key = "gps";
  const hit = cache.get(key);
  if (hit) return hit;

  const icon = divIcon(
    unitSvg(GPS_COLOR, glyphFor("gps", GPS_COLOR), false, key),
    [UNIT, UNIT],
    UNIT_ANCHOR,
  );
  cache.set(key, icon);
  return icon;
}

export function ensureMapMarkerStyles(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById("centinela-map-marker-styles")) return;
  const style = document.createElement("style");
  style.id = "centinela-map-marker-styles";
  style.textContent = `
    .centinela-map-icon {
      background: transparent !important;
      border: none !important;
    }
    /* Popups oscuros */
    .leaflet-popup-content-wrapper {
      background: #0f172a;
      color: #e2e8f0;
      border: 1px solid #334155;
      border-radius: 10px;
      box-shadow: 0 10px 30px rgba(2,6,23,0.55);
    }
    .leaflet-popup-tip {
      background: #0f172a;
      border: 1px solid #334155;
    }
    .leaflet-popup-content { margin: 10px 12px; }
    .leaflet-popup-content a { color: #818cf8; }
    .leaflet-container a.leaflet-popup-close-button { color: #94a3b8; }
    .leaflet-container a.leaflet-popup-close-button:hover { color: #e2e8f0; }
    /* Atribución sutil sobre fondo oscuro */
    .leaflet-control-attribution {
      background: rgba(15,23,42,0.7) !important;
      color: #64748b !important;
    }
    .leaflet-control-attribution a { color: #94a3b8 !important; }
  `;
  document.head.appendChild(style);
}

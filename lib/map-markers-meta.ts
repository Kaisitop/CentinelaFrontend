import type { Alerta } from "./core-service";

export type AlertMapMarkerKind =
  | "disparo"
  | "grito"
  | "explosion"
  | "ciudadano"
  | "manual"
  | "default";

/** Pin tipo gota (eventos / alertas) */
export const PIN_W = 32;
export const PIN_H = 42;
export const PIN_ANCHOR: [number, number] = [PIN_W / 2, PIN_H];

/** Badge circular (unidades móviles: patrulla, GPS) */
export const UNIT = 34;
export const UNIT_ANCHOR: [number, number] = [UNIT / 2, UNIT / 2];

export const COLORS: Record<AlertMapMarkerKind, string> = {
  disparo: "#E11D48",
  grito: "#D97706",
  explosion: "#EA580C",
  ciudadano: "#4F46E5",
  manual: "#64748B",
  default: "#DC2626",
};

export const PATROL_COLOR = "#2563EB";
export const GPS_COLOR = "#10B981";

/** Glifos en viewBox 0 0 24 24, silueta blanca rellena. */
const GLYPH: Record<string, string> = {
  disparo: `<path fill="#fff" d="M21 7.5H10.2L8.9 6H6.4c-.6 0-1.1.5-1.1 1.1V9H3.4c-.5 0-.9.5-.7 1l1.1 2.4c.2.4.6.6 1 .6h1.9l1.2 3.4c.2.5.6.8 1.1.8h1.5c.7 0 1.2-.7.9-1.4L11.2 13h3.5c1 0 1.9-.7 2.1-1.7l.5-1.8H21c.6 0 1-.4 1-1s-.4-1-1-1Z"/>`,
  grito: `<path fill="#fff" d="M4 9.5v5c0 .6.4 1 1 1h1.3l1.1 3.3c.1.4.5.7 1 .7h1c.7 0 1.2-.7.9-1.3l-1-2.7 9 2.6c.6.2 1.3-.3 1.3-1V5.9c0-.7-.7-1.2-1.3-1L6 8.5H5c-.6 0-1 .4-1 1Z"/>`,
  explosion: `<path fill="#fff" d="m12 2 1.9 3.6L18 4.7l-1.4 4 3.8 1.6-3.6 1.9L18 16l-4-.9-.9 4-2.6-3.2L7 18l.6-4.2L3.5 13l3.4-2.3L5.4 7l4 .9L12 2Z"/>`,
  ciudadano: `<circle cx="12" cy="8" r="3.4" fill="#fff"/><path fill="#fff" d="M5.5 19c0-3.2 2.9-5.6 6.5-5.6S18.5 15.8 18.5 19c0 .6-.4 1-1 1h-11c-.6 0-1-.4-1-1Z"/>`,
  manual: `<path fill="#fff" d="M9 3.2h6c.5 0 1 .4 1 1V5h1.5c.8 0 1.5.7 1.5 1.5v11c0 .8-.7 1.5-1.5 1.5h-11C5.7 19 5 18.3 5 17.5v-11C5 5.7 5.7 5 6.5 5H8v-.8c0-.6.4-1 1-1Z"/><path fill="__COLOR__" d="M9.3 4.7h5.4V6H9.3z"/>`,
  default: `<path fill="#fff" d="M12 3.3c.5 0 1 .3 1.3.8l8 13.9c.6 1-.1 2.3-1.3 2.3H4c-1.2 0-1.9-1.3-1.3-2.3l8-13.9c.3-.5.8-.8 1.3-.8Z"/><path fill="#DC2626" d="M11 9h2v5h-2zM11 15.5h2v2h-2z"/>`,
  patrol: `<path fill="#fff" d="M12 2.5c2 1.5 4.5 2.6 6.6 2.7.6 0 1 .5 1 1.1V11c0 5-3.4 8.3-7.2 9.9-.3.1-.5.1-.8 0C7.8 19.3 4.4 16 4.4 11V6.3c0-.6.4-1.1 1-1.1C7.5 5.1 10 4 12 2.5Z"/><path fill="__COLOR__" d="m12 7.2 1.1 2.3 2.5.3-1.8 1.7.5 2.5-2.3-1.2-2.3 1.2.5-2.5-1.8-1.7 2.5-.3L12 7.2Z"/>`,
  gps: `<circle cx="12" cy="12" r="3.4" fill="#fff"/><circle cx="12" cy="12" r="7.5" fill="none" stroke="#fff" stroke-width="2" opacity="0.55"/>`,
};

function normalizeAlertText(alerta: Alerta): string {
  const meta = alerta.evento?.metadatos as Record<string, unknown> | null | undefined;
  const parts = [
    alerta.evento?.subtipo,
    meta?.ia_class,
    meta?.subtipo,
    alerta.descripcion,
    alerta.reporte?.tipo,
    alerta.tipo,
  ];
  return parts.filter(Boolean).join(" ").toLowerCase();
}

export function getAlertMapMarkerKind(alerta: Alerta): AlertMapMarkerKind {
  const text = normalizeAlertText(alerta);

  if (/disparo|gunshot|pistol|tiro|balacera/.test(text)) return "disparo";
  if (/grito|scream|shout|grit/.test(text)) return "grito";
  if (/explosion|petardo|fuego_artificial|firework|detonacion/.test(text)) return "explosion";
  if (alerta.tipo === "reporte_ciudadano") return "ciudadano";
  if (alerta.tipo === "manual") return "manual";
  return "default";
}

export function getAlertMapMarkerLabel(kind: AlertMapMarkerKind): string {
  switch (kind) {
    case "disparo": return "Disparo";
    case "grito": return "Grito";
    case "explosion": return "Explosión / petardo";
    case "ciudadano": return "Reporte ciudadano";
    case "manual": return "Alerta manual";
    default: return "Alerta";
  }
}

export function glyphFor(name: string, color: string): string {
  return GLYPH[name].replaceAll("__COLOR__", color);
}

export function pinSvg(color: string, glyph: string, selected: boolean, uid: string): string {
  const halo = selected
    ? `<circle cx="16" cy="15" r="15" fill="none" stroke="#FFFFFF" stroke-width="2"/>
       <circle cx="16" cy="15" r="14.5" fill="none" stroke="${color}" stroke-width="3" opacity="0.5"/>`
    : "";

  return `
    <svg width="${PIN_W}" height="${PIN_H}" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="csh-${uid}" x="-40%" y="-20%" width="180%" height="150%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#020617" flood-opacity="0.45"/>
        </filter>
      </defs>
      <g filter="url(#csh-${uid})">
        ${halo}
        <path d="M16 41c0 0 12-12.4 12-23.2C28 9.6 22.6 4 16 4S4 9.6 4 17.8C4 28.6 16 41 16 41Z"
          fill="${color}" stroke="#FFFFFF" stroke-width="2"/>
        <svg x="6" y="5" width="20" height="20" viewBox="0 0 24 24">${glyph}</svg>
      </g>
    </svg>
  `;
}

export function unitSvg(color: string, glyph: string, selected: boolean, uid: string): string {
  const halo = selected
    ? `<circle cx="17" cy="17" r="16" fill="none" stroke="#FFFFFF" stroke-width="2"/>`
    : "";

  return `
    <svg width="${UNIT}" height="${UNIT}" viewBox="0 0 34 34" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="csh-${uid}" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.75" flood-color="#020617" flood-opacity="0.45"/>
        </filter>
      </defs>
      <g filter="url(#csh-${uid})">
        ${halo}
        <circle cx="17" cy="17" r="14" fill="${color}" stroke="#FFFFFF" stroke-width="2"/>
        <svg x="7" y="7" width="20" height="20" viewBox="0 0 24 24">${glyph}</svg>
      </g>
    </svg>
  `;
}

/** Leyenda compacta para UI del mapa */
export const MAP_LEGEND_ITEMS = [
  { label: "Disparo", color: COLORS.disparo, shape: "pin" as const },
  { label: "Grito", color: COLORS.grito, shape: "pin" as const },
  { label: "Patrullero", color: PATROL_COLOR, shape: "unit" as const },
] as const;

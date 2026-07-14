import type { Alerta } from "./core-service";

/** Valor de filtro UI: audio | ciudadano | manual */
export function getAlertaTipoUi(alerta: Alerta): string {
  switch (alerta.tipo) {
    case "audio_ia":
      return "audio";
    case "reporte_ciudadano":
      return "ciudadano";
    default:
      return "manual";
  }
}

export function getAlertaTipoLabel(alerta: Alerta): string {
  switch (alerta.tipo) {
    case "audio_ia":
      return "Audio IA";
    case "reporte_ciudadano":
      return "Ciudadano";
    case "manual":
      return "Manual";
    default:
      return alerta.tipo;
  }
}

export function getAlertaSubtipo(alerta: Alerta): string {
  if (alerta.evento?.subtipo) {
    return alerta.evento.subtipo.replace(/_/g, " ");
  }
  if (alerta.reporte?.tipo) {
    return alerta.reporte.tipo.replace(/_/g, " ");
  }
  return "";
}

export function getAlertaGeneradaPorLabel(alerta: Alerta): string {
  switch (alerta.generadaPor) {
    case "yamnet_auto":
      return "YAMNet";
    case "operador":
      return "Operador";
    case "sistema":
      return "Sistema";
    default:
      return alerta.generadaPor || "—";
  }
}

export function getAlertaSeveridad(alerta: Alerta): number {
  return alerta.evento?.severidad ?? alerta.severidad ?? 1;
}

export function getAlertaDescripcion(alerta: Alerta): string {
  return (
    alerta.descripcion ||
    alerta.evento?.descripcion ||
    alerta.reporte?.descripcion ||
    ""
  );
}

export function getAlertaConfianzaPct(alerta: Alerta): number | null {
  const confianza = alerta.evento?.confianza;
  if (confianza == null) return null;
  return confianza <= 1 ? confianza * 100 : confianza;
}

const ESTADOS_CERRADOS = new Set(["cerrada", "completada", "falsa_alarma"]);

/** Informe del patrullero al reconocer/atender en campo. */
export function getAlertaInformeCampo(alerta: Alerta): string | null {
  const texto = alerta.comentarioCierre?.trim();
  return texto || null;
}

/** Notas del operador al cerrar el caso (distintas del informe de campo). */
export function getAlertaNotasOperador(alerta: Alerta): string | null {
  if (!ESTADOS_CERRADOS.has(alerta.estado)) return null;
  const notas = alerta.notas?.trim();
  if (!notas) return null;
  const informe = alerta.comentarioCierre?.trim();
  if (informe && notas === informe) return null;
  return notas;
}

export function getAlertaMetadatosResumen(alerta: Alerta): string {
  const meta = alerta.evento?.metadatos as Record<string, unknown> | null | undefined;
  if (!meta) return "";

  const partes: string[] = [];
  const nodo = meta?.codigo_nodo ?? alerta.evento?.nodoCodigo;
  if (nodo) partes.push(`Nodo: ${nodo}`);
  if (meta.nivel_audio_db != null) partes.push(`${Number(meta.nivel_audio_db).toFixed(1)} dB`);
  if (meta.ia_confidence_pct != null) partes.push(`IA ${meta.ia_confidence_pct}%`);
  if (meta.ia_class) partes.push(String(meta.ia_class));

  return partes.join(" · ");
}

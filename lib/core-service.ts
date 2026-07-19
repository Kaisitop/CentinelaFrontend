import { api } from "./api";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface Zona {
  id: string;
  nombre: string;
  descripcion: string | null;
  geomWkt?: string;
  geom?: string;
  riesgoNivel: number;
  activa: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Nodo {
  id: string;
  codigo: string;
  descripcion: string | null;
  ubicacion: string; // "POINT(lon lat)"
  zonaId: string;
  zona?: { nombre: string };
  estado: string; // activo | inactivo | mantenimiento
  versionFw: string | null;
  ultimoHeartbeat: string | null;
  activo: boolean;
}

export interface CreateNodoPayload {
  codigo: string;
  zonaId: string;
  descripcion?: string;
  latitud?: number;
  longitud?: number;
  versionFw?: string;
}

export interface Evento {
  id: string;
  tipo: string;
  subtipo: string;
  descripcion?: string | null;
  severidad: number;
  confianza: number | null;
  ubicacion?: string;
  zonaId?: string;
  nodoId: string | null;
  fuente: string;
  audioUrl?: string | null;
  metadatos?: Record<string, unknown> | null;
  nodoCodigo?: string | null;
  procesado?: boolean;
  createdAt?: string | null;
}

export interface Reporte {
  id: string;
  tipo: string;
  descripcion: string;
  ubicacion?: string;
  zonaId?: string | null;
  zonaNombre?: string | null;
  zona?: { nombre: string } | null;
  usuarioId?: string | null;
  estado?: string;
  prioridad?: number;
  fotosUrls?: string | null;
  eventoId?: string | null;
  operadorId?: string | null;
  notasOperador?: string | null;
  createdAt?: string | null;
  updatedAt?: string;
  cerradoEn?: string | null;
}

export interface HeatMapPoint {
  lat: number;
  lng: number;
  intensity: number;
  subtipo: string;
  confianza: number | null;
  eventoId: string;
  createdAt: string;
}

export interface HeatMapResponse {
  points: HeatMapPoint[];
}

export interface PosicionPatrullero {
  usuarioId: string;
  nombre: string | null;
  latitud: number;
  longitud: number;
  precisionM: number | null;
  updatedAt: string;
}

export interface Alerta {
  id: string;
  codigo: string;
  tipo: string;
  descripcion: string | null;
  estado: "activa" | "en_proceso" | "reconocida" | "cerrada" | "falsa_alarma" | "completada";
  severidad: number;
  zonaId: string | null;
  zona?: { nombre: string } | null;
  eventoId: string | null;
  reporteId: string | null;
  generadaPor: string;
  reconocidaPor: string | null;
  reconocidaEn: string | null;
  cerradaPor: string | null;
  cerradaEn: string | null;
  notas: string | null;
  comentarioCierre?: string | null;
  evidenciaUrls?: string | null;
  createdAt: string;
  updatedAt: string;
  // Relaciones anidadas
  evento?: Evento | null;
  reporte?: Reporte | null;
  zonaNombre?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  timestamp?: number;
}

export interface RutaPatrullaje {
  id: string;
  nombre: string;
  zonaId: string;
  zona?: { nombre: string };
  geom: string;
  prioridad: number;
  turno: string; // diurno | nocturno | 24h
  activa: boolean;
  generadaPorIa: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Servicio ─────────────────────────────────────────────────────────────────

export const coreService = {

  // ─── ZONAS ───────────────────────────────────────────────────────────────

  async getZonas(): Promise<Zona[]> {
    const { data } = await api.get("/zonas");
    return data;
  },

  async getZona(id: string): Promise<Zona> {
    const { data } = await api.get(`/zonas/${id}`);
    return data;
  },

  // ─── NODOS ───────────────────────────────────────────────────────────────

  async getNodos(zonaId?: string): Promise<Nodo[]> {
    const params = zonaId ? { zonaId } : {};
    const { data } = await api.get("/nodos", { params });
    return data;
  },

  async getNodo(id: string): Promise<Nodo> {
    const { data } = await api.get(`/nodos/${id}`);
    return data;
  },

  async createNodo(payload: CreateNodoPayload): Promise<Nodo> {
    const { data } = await api.post("/nodos", payload);
    return data;
  },

  // ─── EVENTOS ─────────────────────────────────────────────────────────────

  async getEventos(): Promise<Evento[]> {
    const { data } = await api.get("/eventos");
    return data;
  },

  // ─── REPORTES ────────────────────────────────────────────────────────────

  async getReportes(): Promise<Reporte[]> {
    const { data } = await api.get("/reportes");
    return data;
  },

  async getReporte(id: string): Promise<Reporte> {
    const { data } = await api.get(`/reportes/${id}`);
    return data;
  },

  /** Operador toma el caso → EN_PROCESO */
  async tomarReporte(id: string, notasOperador?: string): Promise<Reporte> {
    const { data } = await api.put(`/reportes/${id}/estado`, {
      id,
      estado: "EN_PROCESO",
      notasOperador: notasOperador || "Caso tomado por operador.",
    });
    return data;
  },

  /** Operador cierra el reporte → RESUELTO */
  async resolverReporte(id: string, notasOperador: string): Promise<Reporte> {
    const { data } = await api.put(`/reportes/${id}/estado`, {
      id,
      estado: "RESUELTO",
      notasOperador,
    });
    return data;
  },

  /** Operador marca como falso → FALSO */
  async marcarFalsoReporte(id: string, notasOperador: string): Promise<Reporte> {
    const { data } = await api.put(`/reportes/${id}/estado`, {
      id,
      estado: "FALSO",
      notasOperador,
    });
    return data;
  },

  // ─── ALERTAS ─────────────────────────────────────────────────────────────

  async getAlertas(): Promise<Alerta[]> {
    const { data } = await api.get("/alertas");
    return data;
  },

  async getAlerta(id: string): Promise<Alerta> {
    const { data } = await api.get(`/alertas/${id}`);
    return data;
  },

  async reconocerAlerta(id: string): Promise<Alerta> {
    const { data } = await api.post(`/alertas/${id}/reconocer`);
    return data;
  },

  /** Patrullero: marca que va en camino hacia la alerta. */
  async marcarEnCaminoAlerta(id: string): Promise<Alerta> {
    const { data } = await api.post(`/alertas/${id}/en-camino`);
    return data;
  },

  /** Patrullero: reconoce en campo con informe y evidencia (no cierra). */
  async atenderAlertaCampo(
    id: string,
    payload: {
      comentarioCierre: string;
      evidenciaUrls?: string[];
    },
  ): Promise<Alerta> {
    const { data } = await api.post(`/alertas/${id}/atender-campo`, payload);
    return data;
  },

  async cerrarAlerta(id: string, payload: { notas?: string; falsaAlarma?: boolean }): Promise<Alerta> {
    const { data } = await api.post(`/alertas/${id}/cerrar`, payload);
    return data;
  },

  /** Cierra en lote alertas activas/reconocidas — solo para pruebas locales. */
  async cerrarAlertasAbiertasParaPruebas(
    notas = "Cierre masivo de pruebas",
  ): Promise<{ cerradas: number; errores: number; total: number }> {
    const alertas = await this.getAlertas();
    const abiertas = alertas.filter(
      (a) =>
        a.estado === "activa" ||
        a.estado === "en_proceso" ||
        a.estado === "reconocida",
    );
    let cerradas = 0;
    let errores = 0;
    for (const alerta of abiertas) {
      try {
        await this.cerrarAlerta(alerta.id, { notas });
        cerradas++;
      } catch {
        errores++;
      }
    }
    return { cerradas, errores, total: abiertas.length };
  },

  async cerrarAlertaPatrullero(
    id: string,
    payload: {
      comentarioCierre: string;
      evidenciaUrls?: string[];
    },
  ): Promise<Alerta> {
    return this.atenderAlertaCampo(id, payload);
  },

  async getHeatMap(dias = 30): Promise<HeatMapResponse> {
    const { data } = await api.get("/analytics/heat-map", { params: { dias } });
    return data;
  },

  async updatePosicionPatrullero(payload: {
    latitud: number;
    longitud: number;
    precisionM?: number;
    nombre?: string;
  }): Promise<PosicionPatrullero> {
    const { data } = await api.put("/patrullaje/posicion", payload);
    return data;
  },

  async getPosicionesPatrulleros(maxAgeSec = 180): Promise<PosicionPatrullero[]> {
    const { data } = await api.get("/patrullaje/posiciones", { params: { maxAgeSec } });
    return data;
  },
};

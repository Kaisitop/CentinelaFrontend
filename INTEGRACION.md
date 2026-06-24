# Integración Frontend - Centinela

Este documento resume los cambios realizados en el proyecto `webcentinela` para su integración con el backend de microservicios (a través de `c-gateway`).

## Resumen de Cambios

Se eliminó el uso de datos estáticos (mock data) en el Dashboard y el Gestor de Alertas, sustituyéndolos por conexiones reales al API. Adicionalmente, se implementó un mapa interactivo para visualizar el cantón Milagro y la ubicación geoespacial de las alertas y nodos.

### 1. Dependencias Añadidas
Para manejar la cartografía y conversión de geometrías, se instalaron las siguientes librerías:
- `leaflet` y `react-leaflet`: Renderizado del mapa interactivo.
- `wellknown`: Parseo de polígonos desde el formato WKT (Well-Known Text) devuelto por PostgreSQL/PostGIS.
- `@types/leaflet` y `@types/wellknown` para el tipado estricto en TypeScript.

### 2. Capa de Servicios (`lib/core-service.ts`)
Se centralizó la comunicación con los microservicios core (`ms-core`) mediante un nuevo archivo cliente `core-service.ts` utilizando la instancia pre-configurada de `axios` (`api.ts`), la cual ya gestiona inyección y refresco de tokens JWT.

Funciones implementadas:
- `getZonas()`: Obtiene las zonas de Milagro con sus polígonos reales.
- `getNodos()`, `getEventos()`, `getReportes()`.
- `getAlertas()`: Obtiene el listado de alertas de la plataforma.
- `reconocerAlerta(id)` y `cerrarAlerta(id, payload)`: Ejecutan transacciones en el backend.

### 3. Dashboard Dinámico (`app/page.tsx`)
- Transformado en un *"Client Component"* (`"use client"`).
- Se implementó `Promise.all` para obtener de manera concurrente las métricas de Zonas, Nodos, Alertas, Eventos y Reportes.
- Se reemplazó el contenedor estático de mapa por el nuevo componente `<Map />`.

### 4. Renderizado del Mapa (`components/Map.tsx` y `MapClient.tsx`)
- Se dividió en dos componentes para evitar el SSR (Server-Side Rendering) de Next.js, el cual no es compatible con el objeto `window` de Leaflet (`dynamic import`).
- El mapa pinta los polígonos recibidos desde `ms-core`, aplicando un color de acuerdo con el `riesgoNivel` de cada zona.
- Renderiza marcadores dinámicos para los Nodos IoT y las Alertas que se encuentren en estado `activa`.

### 5. Gestor de Alertas (`app/alertas/page.tsx`)
- La tabla ahora se alimenta con los datos de `coreService.getAlertas()`.
- Se integraron los botones de Acción de cada fila de alerta:
  - Al hacer clic en **"Reconocer"**, se consume la API correspondiente y se notifica al usuario con `sonner`.
  - Al hacer clic en **"Cerrar"** (o "Falsa Alarma"), se permite ingresar notas opcionales antes de enviar la transacción.
  - La tabla se vuelve a cargar tras cada acción exitosa.

## Validaciones
Todo el proyecto fue verificado utilizando el compilador de Next.js (`npm run build`). No se detectaron errores de Typescript ni conflictos entre los tipos provenientes del API y las interfaces declaradas en el frontend.

# Centinela Frontend (webcentinela)

Dashboard web para administradores, operadores y patrulleros del sistema CENTINELA. Consume la API HTTP de `c-gateway` (`/api`).

Repositorio backend (monorepo con submódulos): [CentinelaProject](https://github.com/Kaisitop/CentinelaProject).

## Requisitos

- Node.js 20+
- `c-gateway`, `ms-auth` y `ms-core` en ejecución (Docker Compose o local)

## Configuración

```bash
npm install
copy .env.example .env   # Windows
# NEXT_PUBLIC_API_URL=http://localhost:3000/api
npm run dev
```

Por defecto el frontend corre en `http://localhost:3001`.

## Roles y rutas principales

| Rol | Rutas |
|---|---|
| Admin / operador | `/reportes`, `/alertas`, `/usuarios`, mapas |
| Patrullero | `/patrullaje-map` (cierre de alertas con evidencia) |

## Fotos y evidencia en el panel

Las imágenes se alojan en **Cloudinary** (subida vía gateway). El frontend solo muestra las URLs que devuelve `ms-core`.

### Componentes

| Archivo | Función |
|---|---|
| `lib/media-service.ts` | `POST /api/media/upload` (multipart) |
| `lib/parse-media-urls.ts` | Parsea `fotosUrls` / `evidenciaUrls` (JSON string o array) |
| `components/ui/media-gallery.tsx` | Galería en grid; clic abre imagen en nueva pestaña |

### Reportes (`/reportes`) — admin y operador

1. Al seleccionar un reporte se carga `GET /api/reportes/:id` (incluye `fotosUrls`).
2. El panel lateral (`components/reportes/reporte-detail-panel.tsx`) muestra **Fotos del ciudadano**.
3. En el listado aparece un indicador con el número de fotos adjuntas.

### Alertas (`/alertas`) — admin y operador

1. **Ver detalles** abre un modal que carga `GET /api/alertas/:id`.
2. `components/alertas/alerta-detail-panel.tsx` muestra:
   - **Evidencia policial** (`evidenciaUrls`)
   - **Fotos del ciudadano** del reporte vinculado (`reporte.fotosUrls`)
3. La tabla lista un contador de fotos cuando hay adjuntos.

### Patrullero — cierre con evidencia

`components/patrullero/alerta-cierre-modal.tsx`:

1. Sube cada foto con `media-service.upload(tipo: 'evidencia')`.
2. Envía `PATCH /api/alertas/:id/cerrar` con `evidenciaUrls: [url, ...]`.

### Flujo ciudadano (app móvil / futuro)

```text
1. POST /api/media/upload?tipo=reporte  (Bearer + reportes:create)
2. POST /api/reportes  { ..., fotosUrls: ["https://res.cloudinary.com/..."] }
```

## Desarrollo

```bash
npm run dev      # servidor de desarrollo
npm run build    # build producción
npm run lint     # ESLint
```

## Variables de entorno

Ver `.env.example`. La URL del API debe apuntar al gateway (`NEXT_PUBLIC_API_URL`).

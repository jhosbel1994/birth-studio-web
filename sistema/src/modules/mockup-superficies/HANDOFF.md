# Handoff: Módulo "Mockup Vitrina" — Birth Studio Sistema Interno

> Documento de contexto para continuar/mejorar este módulo (ej. con Codex u
> otro agente). Describe qué es, dónde está, qué falta y qué NO se debe romper.

## Contexto del proyecto
- **Repo:** `birth-studio-web` (GitHub: jhosbel1994/birth-studio-web). Público.
- **App:** `sistema/` — React 18 + Vite 5 + Tailwind, panel admin con sidebar. Enrutado con **HashRouter** (`#/ruta`).
- **Deploy:** Vercel, auto-deploy en cada push a `main`. El build se compila a la
  carpeta `cotizador/` (esa carpeta **se versiona en git** y es lo que sirve
  producción en `bspublicidad.cl/cotizador`).
  **Regla operativa: cada cambio de código va con `npm run build` + commit +
  push juntos, o no llega a producción.**
- **Persistencia:** Firebase (Firestore + Storage). Config en
  `sistema/src/firebase.js`. Helpers generales en `sistema/src/utils/storage.js`.
- **Íconos:** `lucide-react@0.344.0` (versión antigua — verificar que un ícono
  exista antes de importarlo).
- **Estilo:** sistema de diseño "Aetheric Minimal" (glassmorphism, Tailwind +
  tokens `on-surface`, `primary`, `secondary`, clases `.glass-panel`). No hay
  tema oscuro. No hay librería de componentes compartida (cada página define su
  estilo con clases Tailwind inline).

## Qué es el módulo
Simulador de mockups de gráfica (adhesivos/vinilos) sobre fotos reales de
**vitrinas de vidrio y muros**. El usuario sube o elige una foto de un local con
puerta/ventanales de vidrio, marca las zonas (puerta, ventanal), sube su
adhesivo, y lo calza en perspectiva para presentar al cliente.

**Visión del dueño (Jhosbel / Birth Studio):** tener **~5 plantillas de vitrina
genéricas listas** (tipo stock, análogo al Prototipo de Fachada de logos) +
poder subir foto propia de un local.

## Regla Cero (crítica, NO romper)
Existe un módulo `Prototipo Logo` (`sistema/src/pages/Prototipo.jsx`, Three.js) y
un `Cotizador` (`sistema/src/pages/Cotizador.jsx`).
**Prohibido tocarlos, refactorizarlos o cambiar su estado/rutas.** El módulo
nuevo es independiente en `sistema/src/modules/mockup-superficies/`. Solo se
permite: crear archivos nuevos, agregar entrada al sidebar y una ruta.
La única edición futura autorizada a un archivo existente es montar
`AdjuntarMockup.jsx` dentro de `Cotizador.jsx` (ver Pendientes #8).

## Arquitectura actual (ya construida)
Todo en `sistema/src/modules/mockup-superficies/`:
- `index.jsx` — página contenedora. Toolbar vertical
  (Escena · Zonas · Diseño · Escala · Acabado · Luz · Ajustes) + canvas + panel
  derecho contextual. Solo **Escena / Zonas / Diseño** están activos; el resto
  son placeholders "Próximamente".
- `hooks/useSceneStore.js` — estado local de la escena + acciones CRUD. No usa
  store global (Regla Cero).
- `components/SceneCanvas.jsx` — Canvas2D dibuja foto base + capas de diseño ya
  warpeadas y recortadas a su zona; un `<svg>` superpuesto (viewBox = tamaño de
  imagen real) dibuja los handles arrastrables de zonas/capas. Las imágenes
  cargan async y disparan `redraw()` vía ref (no vía estado de React).
- `components/ZoneEditor.jsx` — panel: crear / nombrar / tipar (vidrio|pared) /
  eliminar zonas.
- `components/DesignLayer.jsx` — panel: subir adhesivo a una zona, "ajustar a
  zona" (auto-snap del corner-pin a los 4 puntos de la zona), eliminar.
- `utils/warpQuad.js` — corner-pin de 4 puntos vía afinidad de 2 triángulos
  sobre Canvas2D (sin dependencias, nativo) + clip a polígono. Visualmente
  equivalente a una homografía en ángulos moderados.
- `utils/loadImage.js` — carga con corrección EXIF + reescalado a lado máximo;
  helpers `canvasToBlob` (JPEG) y `canvasToPngBlob` (PNG, para preservar la
  transparencia del adhesivo).
- `utils/firestore.js` — CRUD Firestore (colección `mockupsVitrina`) + upload a
  Storage + `ensureAuth()`.

### Formas de datos
```
Escena: {
  id, nombre, fotoUrl, fotoW, fotoH, storagePath,
  esPlantilla: bool, zonas: Zona[], capas: Capa[]
}
Zona:  { id, nombre, tipo: 'vidrio' | 'pared', puntos: [{x,y} ×4] }  // TL,TR,BR,BL
Capa:  { id, zonaId, imgUrl, imgW, imgH, puntos: [{x,y} ×4] }        // corner-pin
```
Todas las coordenadas están en **espacio-imagen** (px reales de la foto).

### Plantillas
Una escena con `esPlantilla: true` se abre siempre como **copia nueva** (mismas
zonas, sin diseños, sin `id`) para no pisar el original entre cotizaciones.
Mismo motor que "foto propia" — no hay sistema paralelo.

## Problema conocido / a verificar
Firebase Storage y Firestore usan **reglas de seguridad tipo allowlist por
ruta/colección** (no versionadas; viven en la consola de Firebase). Subir a una
carpeta de Storage nueva rebota como **error de CORS** (rechazo de reglas
disfrazado; Firebase no manda cabeceras CORS en la respuesta de rechazo).
- **Workaround aplicado:** los archivos se suben bajo el prefijo `galeria/`
  (ruta ya permitida por la feature Galería) en `utils/firestore.js`. La
  colección Firestore sigue siendo `mockupsVitrina` (separada); estos archivos
  NO aparecen en la galería pública (esa se arma desde la colección, no listando
  el folder de Storage).
- **Auth:** el login del sistema es por `localStorage` (`BIRTH_LOGGED_IN`),
  independiente de Firebase Auth, así que `auth.currentUser` puede estar vacío
  aunque la UI diga "logueado" → Storage/Firestore rechazan escrituras sin
  `request.auth`. Se agregó `ensureAuth()` (espera `onAuthStateChanged`, 8s) con
  mensaje accionable si no hay sesión.
- **Pendiente:** confirmar en producción que subir foto/adhesivo y guardar
  escena funciona de punta a punta.

## Pendiente (orden sugerido)
1. Confirmar que subir foto/adhesivo y guardar escena funciona en producción.
2. **Diferenciar vidrio vs pared en el render.** Hoy no hay diferencia visual.
   - Vidrio = translúcido, con blend mode + opacidad ajustables y subtipos:
     impreso opaco, microperforado (~40% transparencia), esmerilado/frost (capa
     blanca semitranslúcida difuminada), vinilo de corte (colores planos).
   - Pared = sólido, con multiply suave para tomar grano/sombra del muro.
3. **Zonas de oclusión:** polígonos que van POR DELANTE del diseño (marcos,
   manillas, columnas, plantas) — máscara negativa. Es lo que hace que el mockup
   se vea real (la gráfica queda detrás del marco). Marcado a mano, sin
   auto-detección.
4. **Calibración de escala:** el usuario traza una línea sobre una medida
   conocida (alto de la puerta, del panel) y escribe los cm reales → cálculo de
   ancho×alto y m² por zona (alimenta la cotización).
5. **Modo patrón/tile** (repetir el diseño en mosaico) y **capas múltiples** con
   orden (subir/bajar).
6. **Realismo:** slider "integración con luz" (multiplicar el diseño por la
   luminosidad de la foto en esa zona), sombra proyectada sutil, comparador
   antes/después.
7. **Export** PNG/JPG en alta resolución (mínimo el tamaño de la foto base) +
   marca de agua opcional con logo Birth Studio.
8. **Enviar a cotización:** crear key propia `BIRTH_MOCKUP_VITRINA`
   (localStorage) + componente `AdjuntarMockup.jsx` (calcado de
   `components/AdjuntarPrototipo.jsx`) y montarlo en `Cotizador.jsx` (única
   edición autorizada a archivo existente). **Debe limpiarse la key al enviar**
   para no arrastrar mockups viejos.

## Prioridad de mejora que pide el dueño
- Las **5 plantillas de vitrina genéricas** listas para usar.
- Que la colocación del adhesivo en **vidrio se vea realista**: transparencia,
  reflejos del vidrio visibles a través de las zonas sin tinta, y que el adhesivo
  tome la luz/sombra de la foto — no un rectángulo plano pegado encima.

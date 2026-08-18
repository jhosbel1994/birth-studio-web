# Logo360Generator — arquitectura real (documentación, no código)

> **Nota de nombres:** este documento se llama `Logo360Generator.md` por
> continuidad con la planificación original, pero el archivo real en este
> repo es **`sistema/src/pages/Prototipo.jsx`** (~2640 líneas), integrado
> como la página "Prototipo Logo" del sistema interno (React + Vite +
> Three.js). No existe ningún `Logo360Generator.jsx`.

Objetivo: que un agente que va a tocar una sola zona (texto, fachadas,
render, foto) entienda qué existe y qué NO debe tocar, sin releer el
archivo completo.

---

## Pipeline de trazado — NO TOCAR sin razón explícita

Cadena: imagen/canvas → máscara b/n → contornos vectoriales → extrusión 3D.

- `buildMask(imageData, threshold, invert, detect)` — decide qué píxeles
  son "letra" según 3 modos: `alpha` (transparencia), `dark` (tonos
  oscuros), `light` (tonos claros).
- `traceLoops(mask, w, h)` — algoritmo de trazado de contornos. Cada
  vértice guarda **todas** sus aristas salientes (no solo una), porque
  donde dos formas se tocan en diagonal salen dos aristas del mismo punto;
  guardar una sola fusiona letras y las hace desaparecer. Es la parte más
  delicada del sistema.
- `traceContours` — arma pares outer/holes (para que la O, la A, la P
  conserven sus huecos).
- `simplify(points, tol)` — reduce puntos (Douglas-Peucker) sin perder
  forma.
- `buildLetters(imageData, { threshold, invert, detect, anchoM, altoM })`
  — combina todo lo anterior y devuelve `{ shapes, mPerPx, cx, cy, realW,
  realH, perim, faceArea, count }`. La escala usa **un solo factor**
  (`mPerPx = Math.min(anchoM/pxW, altoM/pxH)`) para ancho y alto — así
  nunca deforma el texto/logo. Cualquier módulo nuevo que genere texto o
  arte debe entregarle un canvas a este pipeline, **no reimplementar
  trazado propio**.

`buildLightbox` es el camino paralelo para caja de luz: no traza nada,
genera directamente un rectángulo o círculo (`panelShape`) y estampa el
arte como textura plana (`panelCanvas`, con `contentBounds` para recortar
el margen vacío del archivo subido).

---

## Módulo de texto (ya implementado)

Convierte texto escrito en un canvas negro-sobre-blanco que se entrega a
`loadCanvas(canvas, nombre, forceDetect)` con `forceDetect: "dark"` (nunca
se deja a la heurística automática, porque el canvas siempre es texto
negro sobre fondo blanco).

- `FONT_MATRIX` — matriz grosor (1-5) × estilo (`sans`/`serif`/`script`),
  resuelta a fuentes open-license (Barlow, Roboto Serif, Dancing Script)
  cargadas de forma diferida (`cargarFuentesBase`, solo al abrir la
  herramienta Texto). `resolverFuente(step, style, customFont)` cae al
  paso más cercano disponible si la combinación no existe (ej. manuscrita
  muy gruesa) y lo informa vía `fell: true`.
- `dibujarTextoCanvas` — dibuja el canvas final (hasta 3 líneas,
  alineación, interlineado, espaciado, MAYÚSCULAS).
- `medirTrazo(family, weight)` — mide el grosor real de una fuente para
  ubicar una fuente propia (`FontFace` cargada por archivo) en la escala
  de 5 pasos.
- `STROKE_PCT` — % del alto de letra que ocupa el trazo por paso; se usa
  para calcular el trazo real en mm y disparar avisos (rojo <20mm, ámbar
  <30mm).
- **Pendiente conocido (tarea `texto-escala`):** el tamaño por defecto
  hereda `anchoM`/`altoM` de lo último usado (puede venir de 3m×1m de una
  escena de fachada), no arranca en un % moderado del ancho disponible.
  Ya existen campos de Ancho/Alto directo en el panel Texto — falta el
  *valor inicial* inteligente y el aviso de "no entra en la fachada".

---

## Fachadas y entorno de calle

`FACADE_STYLES` (5 hoy: `calle`, `vitrina`, `esquina`, `marquesina`,
`portal`) + `buildStorefront(style, { signW, signH, standoff, wallMat,
night })` que arma el local completo y devuelve `{ group, facW, bandH,
shopH, upperH, yGround, zWall }` (estas medidas las usa el caller para
alinear el fondo/vecinos/calzada y reposicionar el letrero según el tipo
de escenario — totem/interior/fachada).

Reglas de diseño ya corregidas, no repetir el error:
- La banda del letrero **siempre** va plana y al ras del muro
  (`addBox(facW, bandH, 0.14, wallMat, 0, 0, zWall - 0.07, g)`). Marquesina
  antes tenía un marco hueco (túnel abierto) — se sacó, ahora es un toldo
  sólido sobre fachada cerrada.
- `buildStreetEnv(envGroup, storeMeta, { night, standoff })` agrega cielo
  con montañas/ciudad (`skyTexture`), edificios vecinos, calzada, y de
  noche postes de alumbrado **visibles** (poste + brazo + cabezal
  emisivo, no una luz flotando sin geometría).

**Cache del entorno (importante para cualquier tarea que toque fachadas):**
en `build()`, el entorno se reconstruye solo si cambia su "firma"
(`envSig`, un string con scene/facadeStyle/material/night/etc). Si no
cambió, se reutiliza tal cual — así escribir en el módulo de texto no
regenera fachadas completas en cada tecla. Cualquier fachada nueva debe
respetar este patrón (agregar sus variables relevantes a `envSig`).

**Aleatoriedad con semilla:** `rnd()`/`resetRng()` (mulberry32) reemplaza
`Math.random()` en todo lo que se dibuja dentro del entorno cacheado. Sin
esto, las ventanas de los edificios se re-sortean en cada rebuild y
parpadean. `resetRng()` se llama al inicio de cada armado de entorno.

---

## Materiales

- `makeFacadeMaterial(material, hex, rough, metal, spanM, dir)` — arma
  `MeshStandardMaterial` con textura (`facadeTexture`) + bump
  (`facadeBump`) generados en canvas 2D (no son imágenes, son patrones
  dibujados: acanalada, ACM, wall panel —horizontal o vertical, `dir`—,
  internit, madera). `BUMP_SCALE` por material controla cuánto relieve.
- `FINISHES` (madera/metal/negro mate/blanco brillante) definen
  `rough`/`metal` que se le pasan a `makeFacadeMaterial`.

---

## Posición, espejo y captura (ya implementado)

- Caja de luz: `offsetX`/`offsetY` (-1..1) desplazan el arte **dentro**
  del panel en `panelCanvas`, acotado al margen que deja `artScale`.
- Letras corpóreas: `posX`/`posY` (cm) desplazan el grupo `sign` completo
  **sobre la fachada**, aplicado después del centrado automático.
- Espejo (`flipH`/`flipV`): se guarda `S.current.originalCanvas` intacto;
  cada toggle recalcula desde ese original (nunca desde uno ya volteado)
  vía un `useEffect` dedicado — no se recalcula en cada `build()`, sería
  trabajo redundante.
- `captureOriented()` — exporta la imagen respetando la orientación real
  del letrero (horizontal/vertical), re-renderiza a resolución fija
  (1600-1800px lado largo) independiente del tamaño de pantalla.

---

## Render loop / escena base

Setup en el primer `useEffect` del componente: `WebGLRenderer` (con
`preserveDrawingBuffer` para poder exportar imagen), un `PMREMGenerator`
con un env map mínimo pintado a mano (no HDRI externo), luces
`ambient/key/fill/rim/spill/wallWash`, arrastre con puntero para girar,
zoom con rueda/pellizco (`setZoom`, clamp 0.45-5), giro automático con
curva seno. `frameObject()`/`applyZoom()` encuadran la cámara según el
bounding box del `sign` actual.

**Pendiente conocido (tarea `render-calidad`):** todo esto es
`MeshStandardMaterial` + sombras PCF suaves, sin líneas de borde, sin
oclusión ambiental/sombra de contacto, y el zoom/inercia son instantáneos
(sin `lerp`). No toca el trazador ni el UV — es una capa puramente visual
sobre lo que ya existe.

---

## Build y despliegue (importante, no es solo código)

Este repo **no tiene build automático en Vercel** para `sistema/`. El
flujo real:
```
cd sistema && npm run build     # vite build → sale a ../cotizador (vite.config.js: outDir)
```
El contenido de `cotizador/` (HTML/JS/CSS ya compilados) es lo que
Vercel sirve tal cual y **está commiteado en git**. Cualquier cambio en
`sistema/src/**` que no se compile y cuyo `cotizador/` no se suba **no se
despliega**, aunque el commit de `sistema/` esté en `main`.

`three` está en su propio chunk (`vite.config.js`,
`rollupOptions.manualChunks`) y la página se carga con `React.lazy()` —
no infla el bundle principal del sistema.

---

## Qué NO tocar salvo que la tarea lo pida explícitamente

- `buildMask`, `traceLoops`, `traceContours`, `simplify`, `buildLetters`
  (trazador y cálculo de escala en metros — probado, no reescribir).
- El cálculo de UV (`applyUV`).
- Las 5 ramas existentes de `buildStorefront` (agregar, no modificar).
- El patrón `envSig`/`resetRng()` — romperlo reintroduce el parpadeo.

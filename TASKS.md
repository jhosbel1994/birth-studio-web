# TASKS.md — Ledger, Prototipo Logo (ex "Logo360Generator")

Cada agente lee este archivo antes de tocar código y lo actualiza en dos
momentos: al tomar una tarea (estado → `en curso`, con su nombre) y al
terminarla (estado → `listo`, con una línea de qué archivo/función tocó).

**Archivo real:** `sistema/src/pages/Prototipo.jsx` (no `Logo360Generator.jsx`
— ver nota en `Logo360Generator.md`).

Si una tarea ya dice `en curso` con otro nombre, no la repitas: esperá o
avisá acá mismo.

---

## Estado general

| # | Tarea | Agente | Depende de | Estado | Nota |
|---|---|---|---|---|---|
| 1 | Tamaño de texto por defecto + aviso de ancho | `texto-escala` | — | `listo` | Ver Registro de cambios |
| 2 | Fachada mall / centro comercial | `fachada-mall` | — | `listo` | Ver Registro de cambios |
| 3 | Calidad visual tipo SketchUp | `render-calidad` | 1, 2 | `pendiente` | |
| 4 | Foto real + perspectiva + posicionamiento | `foto-perspectiva` | 3 | `pendiente` | Falta `prompt-foto-y-posicion.md` — evaluar alcance antes de construir |

---

## Detalle tarea 1 — `texto-escala`

**Ya resuelto antes de esta tarea (no repetir):** escala de grosor 5
pasos con vista previa, estilo (sin serifa/serifa/manuscrita), fuente
propia por archivo, trazo real en mm con avisos rojo/ámbar, campos
Ancho/Alto directo en el panel Texto, fix de bug de zoom que se
reseteaba en cada letra.

**Qué falta (esto sí toca hacer):**
- [x] Valor por defecto al escribir texto nuevo: 35%–50% del ancho de
      fachada disponible, no heredar el último `anchoM`/`altoM` usado
- [x] Aviso si el ancho total del texto supera el ancho de la fachada
      elegida, indicando qué % sí entra

**Archivos que toca:** `sistema/src/pages/Prototipo.jsx` — módulo de
texto y su panel.
**Archivos que NO debe tocar:** `traceContours`, `buildMask`,
`buildLetters`.

---

## Detalle tarea 2 — `fachada-mall`

**Qué hacer:**
- [x] Nuevo id en `FACADE_STYLES`
- [x] Rama nueva en `buildStorefront`, sin tocar las 5 existentes
- [x] Altura de local 4.0–4.5 m (4.2 m)
- [x] Vidriera piso a techo, sin cortina metálica
- [x] Banda de letrero elevada sobre la vidriera
- [x] Piso porcelanato pulido, distinto al exterior (`roughness` bajo)
- [x] Sin cielo/vereda — contexto de pasillo de mall, iluminación cenital
      difusa en vez de direccional

**Archivos que toca:** `FACADE_STYLES`, `buildStorefront`, texturas de
piso si hace falta variante nueva.
**Archivos que NO debe tocar:** las 5 ramas de fachada existentes.

---

## Detalle tarea 3 — `render-calidad`

**Qué hacer:**
- [ ] Líneas de borde (`EdgesGeometry` + `LineSegments` + `polygonOffset`)
      sobre el letrero y volúmenes principales del escenario
- [ ] Sombra de contacto (textura de sombra suave bajo objetos) o SSAO
- [ ] Calmar rango de `roughness`/`metalness` en materiales (0.3–0.7
      salvo vidrio/metal pulido)
- [ ] Zoom con interpolación (`lerp`), no salto instantáneo
- [ ] Inercia al soltar el arrastre de giro
- [ ] (Opcional) Marca de agua Birth Studio en la descarga

**Archivos que toca:** render loop, `makeFacadeMaterial`,
`facadeTexture`/`facadeBump`, nuevo módulo de posproceso.
**Archivos que NO debe tocar:** trazador de contornos, cálculo de UV.

**Depende de:** tareas 1 y 2 terminadas (toca materiales compartidos).

---

## Detalle tarea 4 — `foto-perspectiva`

**Bloqueo conocido:** el archivo `prompt-foto-y-posicion.md` referenciado
para el detalle completo (calibración de escala con regla, resplandor
nocturno sobre la foto, controles de arrastre) **no existe en este
repo**. Antes de construir, evaluar con el dueño del proyecto si:
(a) se redacta ese detalle ahora, o (b) se construye solo lo que ya está
especificado en `Logo360Generator.md`/este archivo y se deja lo demás
para una vuelta siguiente.

**Qué hacer (lo que sí está especificado):**
- [ ] Carga de foto con corrección EXIF
- [ ] Marcado de 4 puntos sobre un rectángulo real de la foto
- [ ] Cálculo de homografía y orientación aproximada del plano
- [ ] Rotar el grupo del letrero según esa orientación antes de
      superponerlo
- [ ] Sliders manuales de ajuste fino (horizontal ±40°, vertical ±25°)
      como capa **sobre** el resultado automático, no como reemplazo

**Qué falta detalle (viene de `prompt-foto-y-posicion.md`, ausente):**
- [ ] Calibración de escala con regla de referencia
- [ ] Arrastre del letrero (mover vs. girar escena, con raycaster)
- [ ] Controles numéricos de posición X/Y en cm
- [ ] Resplandor nocturno sobre la foto en modo retroiluminado

**Archivos que toca:** módulo nuevo de foto, posicionamiento, controles
de arrastre.
**Archivos que NO debe tocar:** nada del pipeline de trazado ni de los
escenarios generados por código (fachadas, tótem, interior) — la foto es
un modo aparte, no reemplaza a los otros.

**Depende de:** tarea 3 terminada.

---

## Registro de cambios

*(cada agente agrega una línea acá al terminar, formato: fecha — agente —
qué tocó)*

- 2026-08-18 — `texto-escala` — `Prototipo.jsx`: `regenerarTexto` calcula
  `altoM` inicial (~40% del ancho disponible) solo la primera vez que se
  escribe texto (flag `S.current.textSizedOnce`, se resetea al borrar el
  campo); nuevo aviso ámbar en el panel Texto cuando `altoM × aspecto`
  del texto supera `anchoM`, con el % que sí entra.
- 2026-08-18 — `fachada-mall` — `Prototipo.jsx`: nuevo id `"mall"` en
  `FACADE_STYLES`; `buildStorefront` gana un flag `isMall` que solo
  cambia `shopH`/`upperH`/vereda/pano-de-ventanas de forma condicional
  (comportamiento de las 5 fachadas existentes sin cambios) + rama nueva
  con vidriera piso a techo y montantes; `floorTexture("mall")` (piso
  pulido, formato grande); `buildMallEnv` nueva (piso continuo +
  cielorraso + luminarias, sin calle/cielo/vecinos); luz cenital difusa
  específica para `facadeStyle === "mall"` en `build()`.

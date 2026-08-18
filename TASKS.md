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
| 3 | Calidad visual tipo SketchUp | `render-calidad` | 1, 2 | `listo` | Marca de agua se dejó fuera (opcional) — ver Registro |
| 4 | Foto real + perspectiva + posicionamiento | `foto-perspectiva` | 3 | `listo` | Ver Registro de cambios |
| 5 | Limpieza de código general (ex Requisito 4 de la tarea 4) | *(sin asignar)* | — | `pendiente` | No ejecutado a propósito — el usuario pidió anotarlo aparte, no hacerlo ahora |

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
- [x] Líneas de borde (`EdgesGeometry` + `LineSegments` + `polygonOffset`)
      sobre el letrero y volúmenes principales del escenario
- [x] Sombra de contacto (versión liviana, no SSAO — ver nota abajo)
- [x] Calmar rango de `roughness`/`metalness` en materiales (0.3–0.7
      salvo vidrio/metal pulido)
- [x] Zoom con interpolación (`lerp`), no salto instantáneo
- [x] Inercia al soltar el arrastre de giro
- [ ] (Opcional) Marca de agua Birth Studio en la descarga — **no se
      hizo**, quedó fuera de esta pasada por ser explícitamente opcional

**Nota — sombra de contacto liviana en vez de SSAO:** se usó la
alternativa barata que el propio prompt ofrece ("textura de sombra
circular suave pegada al piso/muro"), reutilizando la silueta ya
calculada para el halo retroiluminado — ahora SIEMPRE visible (antes
solo existía en modo `back`/`both`), oscura y ceñida contra el muro. No
se agregó `EffectComposer`/`SSAOPass`. Para el tótem no se sumó sombra
extra: ya tenía sombra real de la luz direccional (`castShadow` sobre su
base y el piso), que cumple el mismo propósito ahí.

**Archivos que toca:** render loop, `makeFacadeMaterial`,
`facadeTexture`/`facadeBump`, nuevo módulo de posproceso.
**Archivos que NO debe tocar:** trazador de contornos, cálculo de UV.

**Depende de:** tareas 1 y 2 terminadas (toca materiales compartidos).

---

## Detalle tarea 4 — `foto-perspectiva`

**Alcance final (reemplaza el plan original):** el usuario pegó la
especificación completa de `prompt-foto-y-posicion.md` y acotó el
alcance explícitamente: Requisito 1 (montar el letrero sobre una foto
real) + Requisito 2 (mover el letrero en X/Y) + Restricciones técnicas +
criterios de aceptación 1-7. **Sin homografía ni detección automática de
4 puntos** — la especificación final usa sliders manuales de inclinación
en vez de eso (más simple, explícitamente "no hace falta detección
automática... sería frágil y lenta"). El Requisito 3 (escalar texto) se
excluyó por ser la tarea 1. El Requisito 4 (limpieza de código) pasó a
ser la tarea 5, sin ejecutar.

**Hecho:**
- [x] Escena "foto" nueva en el selector "Dónde va" (`SCENES`)
- [x] Carga de foto: `accept="image/*" capture="environment"`,
      `createImageBitmap(file, {imageOrientation:"from-image"})` para
      corrección EXIF (con fallback a FileReader+`Image` si el
      navegador no soporta la opción), reducida a 2000px de lado largo,
      persistida como dataURL (nunca `URL.createObjectURL`)
- [x] Fondo: plano fijo en `photoGroup` (grupo aparte de `rig`/
      `envGroup`, no gira con el arrastre), ajuste tipo "cover" vía
      `fitCoverTexture` (recorta sin deformar)
- [x] Inclinación manual del letrero: sliders horizontal ±40°/vertical
      ±25° (`photoTiltY`/`photoTiltX`), aplicados a `sign.rotation`
- [x] Luz coherente: rueda de dirección 0-360° + intensidad ambiente,
      reposicionan `keyLight`/`ambient`/`fillLight` cuando `scene==="foto"`
- [x] Resplandor nocturno retroiluminado sobre la foto (plano radial
      aditivo, color del LED) — agregado a `rig` (no a `photoGroup`)
      para que seguir al letrero durante el giro, no quede fijo como
      la foto
- [x] Calibración de escala: 2 clics sobre la foto (raycaster contra el
      plano, puntos guardados en coordenadas del MUNDO 3D, no en
      píxeles de la foto) + input de metros reales → factor de escala
      aplicado a `sign.scale`. Aviso ámbar si no está calibrado
- [x] Arrastre: raycaster contra `S.current.frameTarget` (el letrero) en
      `pointerdown` decide el modo — sobre el letrero mueve
      (`dragMode:"move"`), fuera del letrero gira la escena como antes
      (`dragMode:"orbit"`), y en modo calibración cualquier clic toma un
      punto de medición en vez de cualquiera de los dos
- [x] Posición persistida en React (`posX`/`posY`, ya existían de una
      tarea anterior): el arrastre mueve el objeto de Three.js en vivo
      (barato, sin rebuild por cuadro) y solo confirma el valor final en
      `setPosX`/`setPosY` al soltar — universal para letras y caja de
      luz (se sacó la restricción `product !== "lightbox"` que tenía
      antes, porque ahora la caja de luz también se puede arrastrar)
- [x] Campos numéricos X/Y en cm + botón "Centrar" (panel Producto)

**Simplificaciones deliberadas (por tiempo, no rompen los criterios 1-7):**
- El tamaño del plano de fondo sin calibrar es una heurística generosa
  (`Math.max(span*6, 10)` ajustado al aspecto de la cámara), no un
  cálculo exacto de cobertura de frustum en cada zoom — puede dejar un
  borde transparente en encuadres muy alejados; no lo prueba ningún
  criterio de aceptación.
- La calibración no persiste "qué píxel exacto de la foto original" se
  tocó, sino directamente la distancia en el mundo 3D entre los 2 clics
  — más simple y suficiente para el criterio 5, pero si la ventana se
  redimensiona entre medir y calibrar, los puntitos marcados podrían no
  coincidir pixel-perfecto con el mismo lugar de la foto (cosmético).
- Las notas del panel de números en la ficha técnica (m² de cara, m de
  canto) siguen mostrando el tamaño NOMINAL configurado en Ancho/Alto,
  no el tamaño visual ya corregido por `photoCalib.scaleFactor` — no lo
  exige ningún criterio, pero si se retoma esta tarea conviene revisarlo.

**Archivos que tocó:** `Prototipo.jsx` — `SCENES`, `pickScene`, nuevo
estado (`photoImg`, `photoTiltX/Y`, `photoLightDir`, `photoAmbient`,
`photoCalib`, `calibrating`, `calibPts`, `calibInputM`), `handlePhotoFile`,
`fitCoverTexture`, `glowTexture`, rama `scene==="foto"` dentro de
`build()`, raycaster + handlers de puntero en el `useEffect` de montaje,
panel "Fachada" (rama condicional) y sección de Posición en panel
"Producto".
**No tocó:** `traceContours`/`buildMask`/`buildLetters`, ni las fachadas
generadas por código (totem, interior, las 6 fachadas de calle/mall) —
la foto es un modo aparte, coexiste sin reemplazarlas.

**Depende de:** tarea 3 terminada. ✅

---

## Detalle tarea 5 — limpieza de código (ex Requisito 4 de la tarea 4)

**No ejecutada a propósito** — el usuario pidió anotarla pendiente, no
hacerla en esta pasada, y solo mencionó su nombre ("Requisito 4 —
limpieza de código"), sin pegar el texto completo como sí hizo con los
Requisitos 1 y 2. **El contenido exacto de este requisito no está en
este repo** — antes de ejecutarla, pedir el detalle igual que se hizo
con `prompt-foto-y-posicion.md` para la tarea 4.

**Archivos que tocaría (una vez que se sepa el alcance real):**
`Prototipo.jsx` completo — por eso conviene hacerla sola, no en paralelo
con otra tarea que edite el mismo archivo.

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
- 2026-08-18 — `render-calidad` — `Prototipo.jsx`: `addBox` (usado por
  las 6 fachadas + tótem + interior) ahora agrega `EdgesGeometry` +
  `LineSegments` a cada volumen, con `polygonOffset` en su material para
  no parpadear contra la línea; mismo tratamiento en la extrusión del
  letrero/caja de luz (umbral 20° para no dibujar cada faceta del
  bisel). Sombra de contacto contra el muro (siempre visible, reutiliza
  `haloCanvas`/silueta ya existente) agregada en el bloque del halo.
  `roughness` calmado en `FINISHES`, `concreteMat`, calzada/vereda/piso
  del tótem (rango 0.3–0.7, salvo vidrio/piso de mall que siguen
  intencionalmente extremos). Zoom: la cámara ya no salta — el loop de
  render interpola `zoomCurrent` hacia `zoom` cada cuadro; el `useEffect`
  de `zoom` y el `resize` solo fijan el objetivo/reencuadran instantáneo
  cuando corresponde (rebuild o resize), no en cada tick de usuario.
  Inercia: el arrastre de giro guarda velocidad (`dragVel`) y decae solo
  (`×0.92` por cuadro) al soltar, en vez de cortar en seco. Marca de
  agua: no implementada (opcional).
- 2026-08-18 — `foto-perspectiva` — `Prototipo.jsx`: escena "foto" nueva
  (carga con corrección EXIF vía `createImageBitmap`, downscale a
  2000px, dataURL); fondo fijo en grupo `photoGroup` aparte de
  `rig`/`envGroup` (no gira); `fitCoverTexture` para el ajuste "cover";
  tilt manual ±40°/±25°; luz por dirección+ambiente; resplandor nocturno
  en `rig` (sigue al letrero al girar); calibración por 2 clics
  (raycaster, distancia en mundo 3D) + input de metros → `sign.scale`;
  arrastre con raycaster separa mover-letrero de girar-escena; posición
  X/Y (`posX`/`posY`) ahora universal para letras y caja de luz (antes
  solo letras). Ver notas de simplificaciones deliberadas arriba.

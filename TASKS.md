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
| 6 | Ronda de feedback: zoom directo, ancho de wall panel, esquina en altura | `feedback-r7` | — | `listo` | Ver Registro de cambios |
| 7 | Zoom v2: separar reencuadre de reaplicar zoom del usuario | `zoom-v2` | — | `listo` | De `prompt-seis-mejoras.md` paso 1. Ver Registro |
| 8 | Candado ancho/alto en Texto (deformación con aviso) | `candado-wh` | — | `listo` | De `prompt-seis-mejoras.md` paso 2. Ver Registro |
| 9 | Medidas reales de fachada + aviso de encaje | `medidas-reales` | — | `listo` | De `prompt-seis-mejoras.md` paso 3. Ver Registro |
| 10 | Temperatura de luz (K → RGB cuerpo negro) | `temp-luz` | — | `listo` | De `prompt-seis-mejoras.md` paso 4. Ver Registro |
| 11 | Regla de los 10 cm (auto-conversión a caja de luz) | `regla-10cm` | 8, 9 | `listo` | De `prompt-seis-mejoras.md` paso 5. Ver Registro |
| 12 | Múltiples logos/textos (lista de elementos) | `multi-logo` | 4 (posicionamiento, ✅) | `pendiente` | De `prompt-seis-mejoras.md` paso 6. Pausado a pedido del usuario: probar primero los pasos 1-5 en el sistema real antes de arrancar el cambio de arquitectura |

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

## Detalle tarea 6 — `feedback-r7` (ronda de feedback con capturas)

**Qué hacer (feedback directo del usuario, 4 puntos):**
- [x] Zoom reportado roto — diagnóstico y fix
- [x] Quitar el texto "Generando…" del overlay de carga
- [x] Marca de agua — verificado que no existe en el código
- [x] Wall panel: ancho de tabla ajustable (antes fijo en 102px/~22cm)
- [x] Fachada de edificio en altura (mockups tipo "Plaza Maule") — alcance
      acotado con el usuario vía preguntas: extender el estilo `esquina`
      existente (no un estilo nuevo), reusar `mall` tal cual para locales
      de un piso, reusar `buildStreetEnv` tal cual para el paisaje

**Archivos que tocó:** `Prototipo.jsx` — loop de render (se sacó el lerp
de zoom por cuadro), `resize`/`build` (aplican zoom directo), overlay de
carga, `facadeTexture`/`facadeBump`/`makeFacadeMaterial` (parámetro
`slatM`/`slatPx`), `buildStorefront` (rama `esquina` gana
`buildingFloors` opcional, retrocompatible en 0).
**Archivos que NO tocó:** `traceContours`/`buildMask`/`buildLetters`,
las otras 5 ramas de fachada.

**Nota:** este fix de zoom (sacar el lerp, aplicar directo) fue el
diagnóstico propio de esta sesión, hecho ANTES de recibir
`prompt-seis-mejoras.md`. Ese documento trae un diagnóstico distinto
(`build()` reencuadra en cada rebuild así sea un cambio cosmético) — ver
tarea 7, que lo revisa y corrige sobre esta base, no lo repite desde
cero.

---

## Detalle tarea 7 — `zoom-v2`

**Diagnóstico del documento, verificado contra el código actual:**
`build()` recalcula `center`/`baseDist` y llama `applyZoom` con
`S.current.zoom` **en cada rebuild**, y `build()` tiene 20+ dependencias
(cualquier cosmético dispara rebuild). Como `applyZoom` siempre usa el
`zoom` actual (no lo pisa a 1), un cambio de color de LED **no** saltaba
a 100% — pero si `frameObject` devolvía un `center`/`dist` distinto (por
cualquier motivo, incluido drift de punto flotante), la cámara se movía
igual aunque el % mostrado no cambiara. El fix separa las dos cosas.

**Qué se hizo:**
- [x] `build()` sigue recalculando `center`/`baseDist` siempre (barato,
      los mantiene frescos para el botón "Encuadrar")
- [x] `applyZoom` (mover la cámara) solo se llama cuando cambia una
      firma `frameSig` = `scene, product, form, sourceType, genSeq,
      realW, realH, depthCm, showFacade` — lo que cambia el tamaño real
      o el tipo de encuadre, no el color/material/finish/posición
- [x] Verificado con lectura de código: `material`, `wallColor`,
      `finish`, `ledColor`, `mode`, `night`, `wallPanelDir`,
      `wallPanelSize`, `facadeStyle`, `buildingFloors`, `posX/Y`,
      `offsetX/Y`, `edgeColor/Metal`, `artScale` NO están en `frameSig`
- [x] El botón "Encuadrar" (`setZoom(1)`) sigue siendo el único que
      fuerza 100%, sin cambios

**No cubierto a propósito (fuera del alcance de este paso):** los
sliders de la escena "foto" (`photoTiltX/Y`, calibración) tampoco
reencuadran — mismo criterio que posición, es ajuste manual del usuario,
no un cambio de tamaño real.

**Archivos que tocó:** `Prototipo.jsx` — bloque final de `build()`
(framing). No tocó el loop de render ni `applyZoom`/`frameObject`.

---

## Detalle tarea 8 — `candado-wh`

**Decisión de arquitectura:** en vez de tocar `buildLetters` (fuera de
los límites, calcula el escalado con un solo factor por diseño — ver
`Logo360Generator.md`), la deformación se aplica como un escalado NO
uniforme sobre el grupo `sign` ya construido (`sign.scale.set(scaleX,
scaleY, 1)`), después de que `buildLetters` ya hizo su ajuste uniforme
normal. El trazador nunca se entera de que hay deformación.

**Qué se hizo:**
- [x] Candado (ícono `lock`/`unlock` nuevo en `Icon`) entre los campos
      Ancho/Alto del panel Texto — estado `whLocked`, default cerrado
- [x] Cerrado: editar un campo recalcula el otro con la proporción
      natural del texto (`textAspect`, ya existía)
- [x] Abierto: campos independientes; `sign.scale.set(anchoM/realW,
      altoM/realH, 1)` aplicado al grupo justo antes del centrado
      (`Box3().setFromObject`), así el bbox y el offset de posición ya
      ven la forma deformada. Z no se toca — el canto no se estira
- [x] Aviso de % de deformación ("condensado/extendido al X%") cuando el
      candado está abierto, con aviso más fuerte sobre 40% de
      deformación (`Math.abs(relScale-1) > 0.4`)
- [x] El aviso de trazo en mm se recalcula con `relScale` (proporción
      pedida / proporción natural) multiplicando el cálculo existente —
      el trazo vertical real escala con el eje ancho, no con el alto
- [x] El aviso "no cabe" (tarea 1, `texto-escala`) sigue existiendo pero
      solo se muestra con candado cerrado — con candado abierto la
      distorsión es intencional, no un ajuste por falta de espacio
- [x] `whLocked` sumado a `frameSig` (tarea 7): togglear el candado sí
      reencuadra, cambia el tamaño real del letrero
- [x] **Bug encontrado y corregido de paso:** en la escena "foto", la
      calibración de escala hacía `sign.scale.setScalar(...)` (uniforme)
      DESPUÉS de armar el letrero — con el candado abierto esto borraba
      por completo la deformación no uniforme. Cambiado a
      `multiplyScalar` para que ambas escalas compongan en vez de que
      una pise a la otra.
- [x] Logos subidos y cajas de luz no tocados: `sign.scale` solo se
      toca cuando `sourceType === "texto" && !whLocked`

**Archivos que tocó:** `Prototipo.jsx` — nuevos íconos `lock`/`unlock`,
estado `whLocked`, bloque de escalado en `build()` (rama letras, antes
del centrado), fix de `setScalar`→`multiplyScalar` en la rama foto,
panel Texto (campos + candado + avisos), `frameSig` y dependencias de
`build()`.
**Archivos que NO tocó:** `buildLetters`, `buildMask`, `traceContours`,
`applyUV` — la deformación vive enteramente fuera del trazador.

---

## Detalle tarea 9 — `medidas-reales`

**Decisión de compatibilidad:** en vez de invertir por completo el
cálculo de `facW`/`shopH` (como pide el prompt literalmente), se agregó
un interruptor "Automática/Personalizada" (`facadeAuto`, default
`true`). Automática = exactamente el cálculo de siempre (`facW =
max(signW*1.7, 3.8)`, `shopH = isMall?4.2:2.55`) — cero cambio de
comportamiento para escenas ya guardadas. Personalizada = el usuario fija
`facadeWidthM`/`facadeHeightM` y esos valores pasan directo a
`buildStorefront` como `facadeW`/`facadeH`, con precedencia sobre el
cálculo derivado del letrero.

**Qué se hizo:**
- [x] Campos "Ancho"/"Alto" de fachada (metros) en el panel Fachada,
      solo visibles con "Personalizada" y `scene === "fachada"`
- [x] `buildStorefront` prioriza `facadeW`/`facadeH` sobre el cálculo
      derivado del letrero cuando vienen definidos
- [x] Sin clamping a `>= signW`: si el letrero es más ancho que la
      fachada elegida, se ve así literalmente en la escena 3D (el aviso
      de texto es la explicación, no un ajuste silencioso que lo oculte)
- [x] Aviso de encaje comparando el letrero ya construido (`info.realW`/
      `realH`) contra `facadeWidthM`/`facadeHeightM`: neutro si ≤80%,
      ámbar "Justo" si 80-100%, rojo "No entra" con la medida máxima que
      sí cabe si supera el 100% en cualquier eje
- [x] Las 6 fachadas existentes (no solo las 5 originales) respetan
      `facW`/`shopH` sin cambios de código — ya estaban parametrizadas
      sobre esas dos variables, cambiar su origen no tocó ninguna rama
- [x] `facadeAuto`/`facadeWidthM`/`facadeHeightM` sumados a `envSig` y a
      las dependencias de `build()`

**No cubierto a propósito:** el tope normal de banda (`bandH`, crece si
`signH` lo exige) no se tocó — sigue igual, el prompt no pedía cambiarlo.
`facadeHeightM` se compara contra el alto del letrero (`info.realH`)
para el aviso, no contra `bandH` internamente — es la comparación más
directa/entendible para alguien no técnico, aunque `shopH` y `bandH` son
conceptos distintos puertas adentro del código.

**Archivos que tocó:** `Prototipo.jsx` — `buildStorefront` (nuevos
parámetros `facadeW`/`facadeH`), estado nuevo, panel Fachada, `envSig`,
dependencias de `build()`.
**Archivos que NO tocó:** las 6 ramas de estilo en sí (siguen usando
`facW`/`shopH` tal cual, sin saber de dónde vienen).

---

## Detalle tarea 10 — `temp-luz`

**Decisión de arquitectura:** `ledColor` (hex) ya era la única fuente de
verdad para el color del LED en todo `build()` (cara emisiva, halo,
reflejo en piso, luces puntuales) — la temperatura no necesitó tocar
ninguno de esos consumidores, solo agrega una FORMA MÁS de calcular el
hex que ya existía (`setLedColor(kelvinToHex(k))`), en vez de tipearlo o
elegirlo de una paleta fija.

**Qué se hizo:**
- [x] `kelvinToHex(kelvin)` — aproximación de cuerpo negro de Tanner
      Helland (la misma que usan herramientas de fotografía/iluminación
      reales, no colores inventados), verificada numéricamente: 6500K→
      `#fffefa` (casi blanco puro), 4000K→`#ffcea6` (blanco cálido),
      3000K→`#ffb16e` (ámbar, sin llegar a naranja)
- [x] `LIGHT_TEMPS` (Fría 6500K / Neutra 4000K / Cálida 3000K) como
      `Seg` de 3 opciones en el panel Luz, separado de `LED_COLORS`
- [x] Sin estado nuevo: qué temperatura está "activa" se deriva
      comparando `ledColor === kelvinToHex(t.k)` al vuelo — elegir un
      color de la paleta automáticamente deja de mostrar ninguna
      temperatura seleccionada (son excluyentes por construcción, no
      hace falta sincronizar dos estados a mano)
- [x] Se sacaron `"Blanco frio"/"Blanco calido"` de `LED_COLORS` (hex
      elegidos a ojo) — quedan redundantes con la temperatura real;
      `LED_COLORS` ahora son solo colores de verdad (rojo/azul/verde)

**No cubierto a propósito:** el valor inicial de `ledColor` no se tocó
(sigue en `#ffffff` literal) — no se fuerza "Neutra" como default para
no cambiar el look de arranque de escenas existentes.

**Archivos que tocó:** `Prototipo.jsx` — `LED_COLORS`, `LIGHT_TEMPS` y
`kelvinToHex` nuevos, panel Luz.
**Archivos que NO tocó:** `build()` (ledColor ya fluía a todos lados
igual), ninguna dependencia nueva hizo falta.

---

## Detalle tarea 11 — `regla-10cm`

**Decisión de arquitectura:** cero canvas nuevo — `loadCanvas` ya
guardaba el canvas del texto en `S.current.srcCanvas`
incondicionalmente (lo usa el trazador para letras), y `build()` ya
sabía leer `srcCanvas` vía `panelCanvas()` para el producto "lightbox"
(el mismo camino que usa un logo subido en modo caja de luz). Solo hizo
falta que `product` pudiera valer `"lightbox"` con `sourceType==="texto"`
sin que se pisara solo.

**El pisado que había que resolver:** `loadCanvas` forzaba
`setProduct("letters")` sin condición en su rama de texto — cada tecla
tipeada lo habría revertido. Se agregó `textAsLightbox` (estado +
espejo en `S.current`, mismo patrón que `calibrating`/`sourceType`) que
`loadCanvas` consulta antes de decidir `product`.

**Qué se hizo:**
- [x] Bajo 10cm de alto de letra (por línea) y sin convertir todavía:
      aviso rojo explicando por qué (canto mínimo 4cm no deja espacio
      para el LED) + botón "Convertir a caja de luz"
- [x] Al aceptar: `setTextAsLightbox(true)`, `product→"lightbox"`,
      `form→"rect"` — el texto pasa a placa impresa con el mismo canvas
- [x] Ficha técnica: ya decía "placa" vs "piezas" según `product` sin
      saber de dónde viene — no hizo falta tocarla
- [x] Si ya convertido y la altura vuelve a superar 10cm: aviso neutro +
      botón "Volver a letras corpóreas" (no revierte solo, mismo
      criterio que la conversión: nada en silencio)

**No cubierto a propósito:** si el usuario cambia `product` a mano desde
el panel Producto (no con el botón de esta regla) mientras el texto
sigue siendo muy chico, `textAsLightbox` no se sincroniza y el próximo
build por tecla lo revierte a `letters` — comportamiento preexistente
(ya pasaba antes de esta tarea), no se tocó por estar fuera del alcance
del paso 5.

**Archivos que tocó:** `Prototipo.jsx` — estado `textAsLightbox` +
espejo en `S.current`, rama `forceDetect` de `loadCanvas`, panel Texto
(aviso + botones).
**Archivos que NO tocó:** `panelCanvas`, `buildLightbox`, el trazador —
la ruta de caja de luz para texto ya existía completa.

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
- 2026-08-18 — `feedback-r7` — `Prototipo.jsx`: se sacó el `lerp` de zoom
  por cuadro del loop de render (commit `6882a9d`); `resize`/`build`/el
  `useEffect` de `zoom` aplican la cámara directo con `applyZoom`, sin
  `zoomCurrent`. Overlay "Generando…" eliminado. `facadeTexture`/
  `facadeBump` ganan parámetro `slatPx` (antes `slat=102` fijo), seam
  proporcional; `makeFacadeMaterial` gana `slatM` (metros reales, UI:
  slider "Ancho de tabla" 10-40cm, estado `wallPanelSize`). `buildStorefront`
  rama `esquina` gana `buildingFloors` (0-14, UI: slider "Pisos de
  altura"): pisos con ventanas bajo el local, baja `yGroundOut` para que
  vereda/calzada/vecinos nazcan del suelo real (commit `639b75c`).
  `Logo360Generator.md` actualizado a la arquitectura real (commit
  `5aa4cc6`).
- 2026-08-18 — `zoom-v2` — `Prototipo.jsx`: el bloque final de `build()`
  ahora arma `frameSig` (scene/product/form/sourceType/genSeq/
  realW/realH/depthCm/showFacade) y solo llama `applyZoom` cuando cambia
  respecto al build anterior; `center`/`baseDist` se siguen recalculando
  siempre. Antes `build()` reencuadraba en cada rebuild sin importar la
  causa (aunque el zoom del usuario no se perdía, la cámara podía
  reposicionarse por cambios puramente cosméticos).
- 2026-08-18 — `regla-10cm` — `Prototipo.jsx`: `textAsLightbox` (estado +
  espejo en `S.current`) evita que `loadCanvas` pise `product` de vuelta
  a `"letters"` en cada tecla una vez convertido. Aviso rojo bajo 10cm de
  alto de letra con botón "Convertir a caja de luz" (`product→lightbox`,
  `form→rect`); aviso neutro + botón para volver si vuelve a entrar como
  corpórea. Reutiliza `panelCanvas`/`srcCanvas` que ya existían, sin
  generar ningún canvas nuevo.
- 2026-08-19 — seguimiento zoom (usuario reporta que sigue sin andar tras
  `zoom-v2`) — `vercel.json`: la regla de `Cache-Control: no-cache` solo
  cubría la ruta literal `/cotizador/index.html`, que el navegador nunca
  pide tal cual (pide `/cotizador` o `/cotizador/`) — sumada a esas dos
  rutas (commit `a7e9132`). `Prototipo.jsx`: listeners de rueda/pellizco
  movidos de `renderer.domElement` (canvas, gestionado por Three.js) a
  `mount` (el div contenedor, objetivo de evento estable) — mismo cambio
  no aplicado a pointerdown/drag porque el arrastre no fue reportado
  como roto. Contador de debug temporal (`wheelHits`, visible en la
  barra de zoom) para confirmar si el evento wheel llega o no en el
  próximo reporte — **sacar una vez confirmado el fix**.
- 2026-08-19 — zoom RESUELTO — `Prototipo.jsx`: el debug confirmó que
  `wheelHits` subía y `zoom` cambiaba (450%→45%) pero `S.current.center`
  quedaba `undefined` (`c=false cam=true`) — `center` solo se seteaba
  dentro de `if (f)` en `build()`, y `frameObject` devolvía `null`
  (`Box3.setFromObject` con matrices del mundo desactualizadas dando caja
  vacía). Fix en 3 capas: (1) el zoom se aplica ahora en el LOOP de
  render cada cuadro leyendo `S.current.zoom` — ya no depende de que un
  efecto de React corra en el instante justo con el centro cacheado;
  (2) el loop recalcula `center` desde `frameTarget` (que `build` setea
  SIEMPRE, fuera del `if`) cuando falta; (3) `frameObject` fuerza
  `updateWorldMatrix(true,true)` antes de medir y ya nunca devuelve
  `null` (cae a la posición del objeto + distancia por defecto). Aplicar
  el zoom cada cuadro no pelea con el giro (orbit rota `rig`, no la
  cámara) ni con el arrastre del letrero (mueve `sign.position`, el
  centro cacheado no se recalcula). Debug temporal removido.
- 2026-08-18 — `candado-wh` — `Prototipo.jsx`: candado ancho/alto en el
  panel Texto (`whLocked`, íconos `lock`/`unlock`). Abierto, aplica
  `sign.scale.set(anchoM/realW, altoM/realH, 1)` al grupo ya construido
  (no toca `buildLetters`). Aviso de % de deformación + aviso fuerte
  sobre 40%; trazo en mm corregido por `relScale`. Fix de bug real:
  `sign.scale.setScalar` en la rama foto (calibración) pisaba la
  deformación no uniforme — cambiado a `multiplyScalar`.
- 2026-08-18 — `medidas-reales` — `Prototipo.jsx`: `buildStorefront`
  acepta `facadeW`/`facadeH` opcionales (metros reales), con precedencia
  sobre el cálculo derivado del letrero cuando el usuario elige
  "Personalizada" (`facadeAuto=false`) en el panel Fachada. Sin
  clamping — el letrero se ve literalmente más grande que la fachada si
  no entra. Aviso de encaje (neutro/ámbar/rojo) comparando
  `info.realW/realH` contra las medidas de fachada. Default
  `facadeAuto=true` mantiene el cálculo automático de siempre, cero
  cambio para escenas existentes.
- 2026-08-18 — `temp-luz` — `Prototipo.jsx`: `kelvinToHex` (blackbody de
  Tanner Helland) + `LIGHT_TEMPS` (Fría/Neutra/Cálida) como control
  separado en el panel Luz; escriben sobre el mismo `ledColor` de
  siempre (`setLedColor(kelvinToHex(k))`), sin tocar `build()`. Se
  sacaron los dos "blanco" hardcodeados de `LED_COLORS` por quedar
  redundantes con la temperatura real.

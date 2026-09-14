# 📋 INFORME CONSOLIDADO — Auditoría 360° Birth Studio

**Orquestado por:** TEAM COMMANDER · 5 agentes en paralelo (solo lectura)
**Fecha:** 2026-09-13
**Hallazgos brutos:** 40 · **Consolidados (deduplicados):** 21

Prioridad: 🔴 CRÍTICO · 🟠 ALTO · 🟡 MEDIO · 🟢 BAJO

---

## 🔴 CRÍTICOS — arreglar antes de seguir vendiendo con esto

### C1 · Acceso a datos sin protección verificable (🔒)
Las reglas de Firestore/Storage **no están en el repo** y el login es **cosmético** (allowlist de correos vive solo en el navegador + flag en `sessionStorage`). Cualquiera puede evadirlo desde la consola. `request.auth != null` no basta: cualquier cuenta Google entra.
- **Riesgo:** datos financieros y de clientes efectivamente abiertos.
- **Fix:** versionar `firestore.rules`/`storage.rules` con `request.auth.token.email in [allowlist]` para toda lectura/escritura sensible.
- Fuente: Seguridad #1, #2 · `Login.jsx:12-24`, `storage.js:455-458`

### C2 · API key de Anthropic filtrada en el bundle (🔒)
`scanner.js:17,27` usa `VITE_ANTHROPIC_API_KEY` con `anthropic-dangerous-direct-browser-access`. Toda `VITE_*` se incrusta en el JS servido → robo inmediato de la clave y cargos ilimitados.
- **Fix:** mover el escaneo a una Cloud Function/proxy server-side. Rotar la clave YA.
- Fuente: Seguridad #3 · `sistema/src/utils/scanner.js:17,27,29`

### C3 · HTML roto en la sección #agenda (🎨)
`index.html:982` — no se cierran `schedule__grid`, `container` ni `section#agenda`; Mapa, Marcas y Footer quedan anidados dentro de Agenda.
- **Fix:** cerrar las 3 etiquetas antes de `<section id="ubicacion">` (línea 1054).
- Fuente: UX #1 · `index.html:982-1054`

### C4 · Imágenes crudas multi-MB sin lazy-load (⚡ + 🎨) — [FUSIONADO]
`assets/oxxo 2.jpeg` = 4.58 MB; ~39 `<img>` en la landing, solo 1 con `loading="lazy"`; el logo del nav carga la OG de 1200×630. Cero WebP/AVIF.
- **Riesgo:** LCP/CLS pésimos en móvil, ~15-25 MB de transferencia innecesaria, penalización SEO.
- **Fix:** convertir a WebP (~150-250 KB) con `<picture>`, `loading="lazy"` + `width/height` a todo lo below-the-fold, logo del nav → `logo-birth.png`.
- Fuente: Performance #1, #2 + UX #2, #3

### C5 · Margen vacío colapsa la venta a $0 (🧮)
`materialesCalc.js:18-19` y `costeoLetrasCalc.js:65` usan `parseFloat(x) || 0` en el multiplicador. Campo vacío → multiplicador 0 → **venta $0, utilidad negativa**. Se puede emitir y enviar una cotización en $0.
- **Fix:** fallback `|| 1` (o default de negocio 2.5) y bloquear guardado si `ventaNeta < costoTotal`.
- Fuente: Negocio #2

---

## 🟠 ALTOS

### A1 · Dashboard y Gastos descuadran por zona horaria (🧮)
`Dashboard.jsx:72,88` usa `new Date("YYYY-MM-DD").getMonth()` → se parsea como UTC y cae al mes anterior en horario Chile. Gastos usa comparación de string (correcta). Un pago del `2026-09-01` se cuenta en agosto en el Dashboard.
- **Fix:** filtrar con `fecha.slice(0,7) === 'YYYY-MM'` en el Dashboard.
- Fuente: Negocio #1

### A2 · `saldo` mal calculado al crear cotización (🧮)
`Cotizador.jsx:1908` guarda `saldo = anticipo` en vez de `total − anticipo`. Edición y PDF esperan lo segundo → `anticipo + saldo ≠ total`.
- **Fix:** `saldo: total - anticipo`.
- Fuente: Negocio #3

### A3 · Doble IVA en bastidores + traslado post-IVA (🧮)
Precio proveedor "IVA incluido" (`productos.js:184`) se multiplica y se le vuelve a sumar IVA. El traslado se suma después del IVA (`Cotizador.jsx:1897-1899`) y no se redondea.
- **Fix:** normalizar precios base a neto antes de multiplicar/IVA; definir si el traslado es afecto.
- Fuente: Negocio #4, #5

### A4 · Bundle del cotizador monolítico de 1.5 MB (⚡)
`cotizador/assets/index-Bj6jnhXx.js` = 1.54 MB: 11 páginas importadas estáticamente + Firebase completo + jspdf/html2canvas eager (~375 KB) aunque nunca se genere un PDF.
- **Fix:** `React.lazy()` por ruta, Firebase modular, `import()` dinámico de `pdf.js` al pulsar "Generar PDF".
- Fuente: Performance #3, #4

### A5 · PIN en texto plano, default `2025` (🔒)
`storage.js:23-29` guarda el PIN legible desde el cliente, sin hash ni rate-limiting.
- **Fix:** restringir lectura de `settings` en reglas y guardar solo un hash.
- Fuente: Seguridad #4

---

## 🟡 MEDIOS

### M1 · God files (🏛️)
`Prototipo.jsx` = 4493 líneas (motor three.js + UI en un archivo); `Cotizador.jsx` = 2590 líneas (24 componentes + 4 contextos inline).
- **Fix:** extraer motor 3D a `modules/prototipo-3d/engine/`; dividir `Cotizador` en `pages/Cotizador/` un archivo por panel. Usar `modules/mockup-superficies/` como plantilla (ya está bien modularizado).
- Fuente: Arquitectura #1, #2, #7

### M2 · Event bus global para el carrito (🏛️)
`window.CustomEvent('cotizador:agregar')` disparado en 14 sitios con un solo listener. Rompe el flujo de datos de React, no es type-safe.
- **Fix:** `CarritoContext` con acción `agregarItem()`.
- Fuente: Arquitectura #3

### M3 · Lógica de IVA duplicada e inconsistente (🏛️ + 🧮) — [FUSIONADO]
El cálculo subtotal + IVA 19% está copiado 6+ veces y con **3 fórmulas distintas** que difieren por redondeo: `round(neto*1.19)` vs `neto + round(neto*0.19)` vs `round(subtotal*0.19)`.
- **Fix:** un único helper `aplicarIva(neto)` en `utils/totales.js` consumido en todos lados.
- Fuente: Arquitectura #4 + Negocio #8

### M4 · Mockups PNG de 19 MB duplicados (⚡)
`sistema/public/mockup-vitrina/` (9.5 MB) y `cotizador/mockup-vitrina/` (9.5 MB) — mismo set, PNG de ~2 MB c/u.
- **Fix:** convertir a WebP (~200-300 KB) y dejar una sola fuente.
- Fuente: Performance #5

### M5 · Sin validación de montos negativos (🧮)
`Gastos.jsx` solo verifica existencia; `min="0"` no impide pegar negativos. Un abono puede dejar `saldoPorCobrar` negativo sin aviso.
- **Fix:** validar `monto > 0` + `Number.isFinite`; advertir si el abono excede el saldo.
- Fuente: Negocio #6

### M6 · Detalles de conversión/accesibilidad en la landing (🎨)
CTA de visita con texto roto ("costo $5000 dentro de talca..."), grupos de radios sin `fieldset/legend`, precio de vinilos inconsistente con el JSON-LD.
- **Fix:** reescribir CTA, envolver radios en `fieldset`, alinear precio de vinilos.
- Fuente: UX #4, #5, #6

### M7 · Caché e imágenes muertas (⚡)
Sin `Cache-Control` para `/assets/` en `vercel.json`; HEIC/JPEG gigantes muertos versionados (`IMG_1882.heic`, `instalacion01.jpeg` 4.5 MB) no referenciados.
- **Fix:** header immutable para `/assets/(.*)`; mover originales fuera del deploy.
- Fuente: Performance #6, #7

---

## 🟢 BAJOS

- **B1** · Modales de PDF y de cotización duplicados entre `Cotizador.jsx` y `Cotizaciones.jsx` → unificar (Arq #5, #6).
- **B2** · Persistencia dispersa: `getX().then(setX)` + `saveX().catch(()=>{})` silencia errores → encapsular en hooks tipo `useSceneStore` (Arq #8).
- **B3** · Precio "libre" e ítems no redondeados propagan decimales a total/anticipo (Negocio #7).
- **B4** · Cero tests en un dominio de dinero → tests unitarios sobre `costeoLetrasCalc`, `materialesCalc`, `calcularTotales` (Negocio #8, QA).
- **B5** · `sitemap.xml` con `lastmod` estático; enlace "Administrador" en el nav público (UX #7, #8).
- **B6** · three.js (508 KB) ya está bien aislado y diferido; matiz: tree-shaking de imports específicos (Performance #8).

---

## ✅ Lo que YA está bien
- Sin XSS; escape de HTML correcto en emails (`escapeHtml` en `email.js`).
- JSON-LD `LocalBusiness` completo, un solo `h1`, OG/Twitter/canónica correctos, `prefers-reduced-motion`.
- `three.js` diferido con `lazy()` + `Suspense`; caché inmutable en `cotizador/assets`; `assets/fotos/` en `.gitignore`.
- `modules/mockup-superficies/` y `components/CosteoLetras/` bien modularizados: el equipo sabe hacerlo.

---

## 🗺️ Plan de acción recomendado (secuencia)

**Sprint 0 — Seguridad y dinero (esta semana):** C1, C2, C5, A1, A2, A3, A5. Nada nuevo hasta cerrar esto.
**Sprint 1 — Rendimiento visible:** C3, C4, A4, M4, M7.
**Sprint 2 — Deuda técnica:** M1, M2, M3, B1, B2, B4.
**Sprint 3 — Pulido:** M5, M6, B3, B5, B6.

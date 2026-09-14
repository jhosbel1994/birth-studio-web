# 🎯 WAR ROOM — Auditoría 360° Birth Studio

**Orquestador:** TEAM COMMANDER
**Modo:** Solo lectura (cero riesgo, sin tocar código)
**Fecha:** 2026-09-13

---

## Reglas de coordinación (anti-duplicación / anti-sobrecarga)

1. Cada agente tiene un **dominio exclusivo**. No sale de su carril.
2. Un archivo puede leerse por más de un agente, pero cada uno lo mira con **su lente**: no reportan lo mismo.
3. Ningún agente edita nada. Solo leen y reportan hallazgos.
4. TEAM COMMANDER consolida, deduplica y prioriza.

---

## Reparto de dominios

| # | Agente | Lente / Rol | Dominio exclusivo |
|---|--------|-------------|-------------------|
| 1 | 🔒 Seguridad | Vulnerabilidades, secretos, auth, XSS | `sistema/src/firebase.js`, `Login.jsx`, `utils/email.js`, `utils/storage.js`, manejo de datos, exposición de API keys, uso de DOMPurify |
| 2 | 🏛️ Arquitectura + Código | Estructura, SOLID, acoplamiento, duplicación | `sistema/src/App.jsx`, `components/`, `pages/` (ESTRUCTURA), `modules/`, patrones React/estado |
| 3 | ⚡ Performance + DevOps | Velocidad, bundles, assets, build, deploy | `vite.config.js`, `vercel.json`, `assets/` (imágenes HEIC/JPG pesadas), tamaños de bundle, lazy-load, caché |
| 4 | 🎨 UX/UI + SEO | Landing, accesibilidad, conversión, SEO | `index.html`, `css/styles.css`, `js/*.js`, `robots.txt`, `sitemap.xml`, meta tags, responsive |
| 5 | 🧮 Negocio + Datos + QA | Correctitud de cálculos, integridad de datos, tests | `sistema/src/utils/*Calc.js`, `nestingLetras.js`, `data/*.js`, lógica financiera en `Dashboard/Gastos/Cotizaciones` (NÚMEROS) |

**Nota de frontera 2↔5:** El Agente 2 mira *cómo está organizado* el código; el Agente 5 mira *si los números/lógica son correctos*. Mismo archivo, distinta lente → sin duplicación.

---

## Estado (lo llena TEAM COMMANDER)

| Agente | Estado | Hallazgos críticos | Hallazgos totales |
|--------|--------|--------------------|--------------------|
| 1 🔒 | ✅ listo | Reglas Firestore ausentes/no verificables; auth 100% client-side evadible; API key Anthropic filtrada en bundle | 8 |
| 2 🏛️ | ✅ listo | God files (Prototipo.jsx 4493 líneas, Cotizador.jsx 2590); event bus global window.CustomEvent; lógica IVA duplicada 6+ veces | 8 |
| 3 ⚡ | ✅ listo | JPEG de 4.5MB en landing; 38/39 imgs sin lazy; bundle cotizador 1.5MB monolítico; mockups PNG 19MB duplicados | 8 |
| 4 🎨 | ✅ listo | HTML roto en #agenda (secciones anidadas mal); ~30 imgs sin lazy/dimensiones (CWV); logo del nav usa OG 1200×630 | 8 |
| 5 🧮 | ✅ listo | Dashboard vs Gastos descuadran por timezone; margen vacío colapsa venta a $0; saldo=anticipo mal al crear; doble IVA en bastidores | 8 |

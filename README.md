# Birth Studio Publicidad — Sitio Web

## Estructura de archivos

```
birth-studio-web/
├── index.html          ← Página principal
├── css/
│   └── styles.css      ← TODO el CSS (variables, secciones, responsive)
├── js/
│   ├── animations.js   ← Intro "PUBLICIDAD" + mosaico + scroll reveal
│   ├── main.js         ← Nav, menú mobile, smooth scroll
│   └── form.js         ← Formularios de cotización y agenda (→ WhatsApp)
├── assets/
│   ├── logo.png        ← Copia aquí el archivo "Recurso_9birth.png"
│   ├── service-*.jpg   ← Fotos de tus servicios (ver detalle abajo)
│   └── about.jpg       ← Foto del taller o equipo
└── README.md
```

---

## Pasos para poner en marcha

### 1. Logo
Copia el archivo `Recurso_9birth.png` dentro de `assets/` y renómbralo `logo.png`.

### 2. Correo electrónico
En `js/form.js`, línea 12, cambia:
```js
var MAIL_TO = 'birth.publicidad@gmail.com';
```
por tu correo real de Birth Studio.

### 3. Imágenes de servicios
Agrega fotos en `assets/` con estos nombres exactos:

| Archivo                   | Sección                |
|---------------------------|------------------------|
| `service-corpóreas.jpg`   | Letras Corpóreas       |
| `service-bastidores.jpg`  | Bastidores             |
| `service-cajetin.jpg`     | Cajétín Luminoso       |
| `service-web.jpg`         | Páginas Web            |
| `service-palomas.jpg`     | Palomas / Pósteres     |
| `about.jpg`               | Quiénes Somos          |

Luego en `css/styles.css`, busca los comentarios marcados con `IMAGEN:` y reemplaza el gradiente CSS por:
```css
background-image: url('../assets/nombre-foto.jpg');
```

### 4. Colores / fuentes
Todos los colores están en `css/styles.css`, sección `:root` al inicio.
Cambia solo esas variables y todo el sitio se actualiza solo.

### 5. WhatsApp
El número ya está configurado: **+56 9 7724 7545**
Si cambia, edita `js/form.js`, línea 11:
```js
var WA_NUMBER = '56977247545';
```

---

## Funcionalidades principales

| Feature | Cómo funciona |
|---------|--------------|
| Intro animado | Letras "PUBLICIDAD" entran y salen antes de mostrar el logo |
| Mosaico de fondo | 18 celdas CSS animadas que pulsan; reemplaza los gradientes con fotos reales |
| Logo flotante | Animación CSS pura (`@keyframes heroFloat`), no requiere JS |
| Nav adaptativa | Transparente → sólida al hacer scroll; menú hamburger en mobile |
| Formulario cotización | Construye un correo con mailto: y lo abre en tu cliente de correo |
| Campos dinámicos | "Con fachada" aparece solo si se elige Bastidor o Letras Corpóreas |
| Slots de horario | Se generan automáticamente de 9:00 a 17:30 cada 30 minutos |
| Agenda → WhatsApp | Genera y envía el mensaje pre-formateado directo al +56977247545 |
| Scroll reveal | Elementos aparecen con animación al entrar al viewport |
| WhatsApp esfera | Botón flotante con efecto glassmorphism y pulso de luz |

---

## Notas técnicas

- **Sin dependencias externas** (excepto Google Fonts vía CDN)
- Compatible con Chrome, Firefox, Safari, Edge
- 100% responsive (mobile-first breakpoints en 768px y 480px)
- Para modificar una sección, busca el comentario `═══ NOMBRE DE SECCIÓN ═══` en el HTML
- Para cambiar estilos de una sección, busca `── NOMBRE ──` en el CSS

---

Birth Studio Publicidad SpA · RUT 77.990.344-3 · Talca, Chile

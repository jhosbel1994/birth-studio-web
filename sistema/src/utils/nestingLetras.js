// ─── ANÁLISIS SVG + NESTING PARA LETRAS CORPÓREAS ────────────────────────────
// Lógica pura (sin React). Usa solo APIs nativas del navegador: DOMParser,
// SVGGraphicsElement.getBBox()/getTotalLength() y <canvas>. Nesting por
// bounding box (shelf packing greedy) — no es nesting por contorno real,
// la vista previa en <canvas> permite validar manualmente (fuera de alcance
// según el spec del módulo).

const SELECTOR_PIEZAS = 'path, polygon, polyline, rect, circle, ellipse'

function esFormaValida(el) {
  return !el.closest('defs, clipPath, mask, symbol')
}

// Parsea el SVG, detecta una pieza por cada forma de nivel de corte (un <path>
// compuesto con hueco — ej. la "O" de un logo — ya es un solo elemento, por lo
// tanto una sola pieza, sin lógica adicional) y devuelve sus bbox/perímetro en
// las unidades originales del SVG.
export function parseSvgPiezas(svgText) {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml')
  if (doc.querySelector('parsererror')) {
    throw new Error('El archivo SVG no se pudo leer (formato inválido).')
  }

  const svgEl = doc.documentElement
  document.adoptNode(svgEl)
  const host = document.createElement('div')
  host.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden;'
  document.body.appendChild(host)
  host.appendChild(svgEl)

  try {
    const nodos = Array.from(svgEl.querySelectorAll(SELECTOR_PIEZAS)).filter(esFormaValida)
    if (nodos.length === 0) {
      throw new Error('No se detectaron piezas (path/polygon/rect/circle) en el SVG.')
    }

    const piezas = nodos
      .map((el, i) => {
        const bbox = el.getBBox()
        const perimetro = typeof el.getTotalLength === 'function' ? el.getTotalLength() : 2 * (bbox.width + bbox.height)
        return { id: `pieza_${i}`, x: bbox.x, y: bbox.y, w: bbox.width, h: bbox.height, perimetro }
      })
      .filter(p => p.w > 0 && p.h > 0)

    if (piezas.length === 0) {
      throw new Error('Las piezas detectadas no tienen área (¿SVG vacío o solo trazos sin relleno?).')
    }

    const minX = Math.min(...piezas.map(p => p.x))
    const minY = Math.min(...piezas.map(p => p.y))
    const maxX = Math.max(...piezas.map(p => p.x + p.w))
    const maxY = Math.max(...piezas.map(p => p.y + p.h))
    const bboxUnion = { x: minX, y: minY, width: maxX - minX, height: maxY - minY }

    // Recorta el viewBox exactamente al bbox unión de las piezas: así el
    // rasterizado (calcularAreaRellena) no arrastra márgenes vacíos del
    // canvas original de Corel/Illustrator y el ancho real ingresado por el
    // usuario corresponde 1:1 al ancho de este bbox.
    svgEl.setAttribute('viewBox', `${bboxUnion.x} ${bboxUnion.y} ${bboxUnion.width} ${bboxUnion.height}`)
    svgEl.setAttribute('width', String(bboxUnion.width))
    svgEl.setAttribute('height', String(bboxUnion.height))

    return { piezas, bboxUnion, svgTextNormalizado: new XMLSerializer().serializeToString(svgEl) }
  } finally {
    document.body.removeChild(host)
  }
}

// mm por unidad SVG, calibrado con el ancho real del diseño ingresado por el usuario
export function calcularEscala(bboxUnion, anchoRealCm) {
  if (!bboxUnion?.width) return 0
  return (anchoRealCm * 10) / bboxUnion.width
}

export function escalarPiezas(piezas, mmPorUnidad) {
  return piezas.map(p => ({
    ...p,
    wMm: p.w * mmPorUnidad,
    hMm: p.h * mmPorUnidad,
    perimetroMm: p.perimetro * mmPorUnidad,
  }))
}

// Rasteriza el SVG normalizado y devuelve la fracción de píxeles con alpha>10
// (área realmente rellena vs. el rectángulo del bbox completo).
export function calcularAreaRellena(svgTextNormalizado, targetPx = 900) {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgTextNormalizado], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      try {
        const aspecto = (img.naturalHeight / img.naturalWidth) || 1
        const canvas = document.createElement('canvas')
        canvas.width = targetPx
        canvas.height = Math.max(1, Math.round(targetPx * aspecto))
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
        let rellenos = 0
        for (let i = 3; i < data.length; i += 4) if (data[i] > 10) rellenos++
        resolve(rellenos / (canvas.width * canvas.height))
      } catch (err) {
        reject(err)
      } finally {
        URL.revokeObjectURL(url)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo rasterizar el SVG para calcular el área.'))
    }
    img.src = url
  })
}

// ─── NESTING: MaxRects (Best Short Side Fit) con rotación 0°/90° ──────────────
// Empaqueta las cajas envolventes lo más apretado posible probando ambas
// orientaciones (0° y 90°) para aprovechar mejor la plancha (menos planchas).
// Sigue siendo por CAJA (no por contorno real ni ángulos libres). La separación
// se modela inflando la plancha y cada pieza en `sep`, así el borde no pierde.
export function nestearPiezas(piezasMm, mesaAncho, mesaAlto, separacion) {
  const sep = Math.max(0, Number(separacion) || 0)
  const binW = mesaAncho + sep
  const binH = mesaAlto + sep

  const piezasGigantes = []
  const colocables = []
  for (const p of piezasMm) {
    const it = { id: p.id, w: p.wMm, h: p.hMm }
    const cabe = (it.w <= mesaAncho && it.h <= mesaAlto) || (it.h <= mesaAncho && it.w <= mesaAlto)
    if (cabe) colocables.push(it)
    else piezasGigantes.push(it)
  }
  // Piezas más grandes primero: mejor empaque.
  colocables.sort((a, b) => (b.w * b.h) - (a.w * a.h))

  const mesas = []
  for (const it of colocables) {
    let colocada = false
    for (const mesa of mesas) {
      if (colocarMaxRects(mesa, it, sep)) { colocada = true; break }
    }
    if (!colocada) {
      const mesa = { items: [], free: [{ x: 0, y: 0, w: binW, h: binH }] }
      colocarMaxRects(mesa, it, sep)
      mesas.push(mesa)
    }
  }

  return { mesas: mesas.map(m => ({ items: m.items })), piezasGigantes }
}

function colocarMaxRects(mesa, it, sep) {
  // Elige el free-rect con mejor "short side fit" entre las dos orientaciones.
  let best = null
  const orientaciones = [
    { ow: it.w + sep, oh: it.h + sep, rot: false, rw: it.w, rh: it.h },
    { ow: it.h + sep, oh: it.w + sep, rot: true, rw: it.h, rh: it.w },
  ]
  for (const o of orientaciones) {
    for (const fr of mesa.free) {
      if (o.ow <= fr.w && o.oh <= fr.h) {
        const shortFit = Math.min(fr.w - o.ow, fr.h - o.oh)
        const longFit = Math.max(fr.w - o.ow, fr.h - o.oh)
        if (!best || shortFit < best.shortFit || (shortFit === best.shortFit && longFit < best.longFit)) {
          best = { x: fr.x, y: fr.y, ...o, shortFit, longFit }
        }
      }
    }
  }
  if (!best) return false

  mesa.items.push({ id: it.id, x: best.x, y: best.y, w: best.rw, h: best.rh, rot: best.rot })

  // Recalcula los free-rects: divide los que se solapan con el ocupado.
  const usado = { x: best.x, y: best.y, w: best.ow, h: best.oh }
  const nuevos = []
  for (const fr of mesa.free) {
    if (!seSolapan(fr, usado)) { nuevos.push(fr); continue }
    if (usado.x > fr.x) nuevos.push({ x: fr.x, y: fr.y, w: usado.x - fr.x, h: fr.h })
    if (usado.x + usado.w < fr.x + fr.w) nuevos.push({ x: usado.x + usado.w, y: fr.y, w: fr.x + fr.w - usado.x - usado.w, h: fr.h })
    if (usado.y > fr.y) nuevos.push({ x: fr.x, y: fr.y, w: fr.w, h: usado.y - fr.y })
    if (usado.y + usado.h < fr.y + fr.h) nuevos.push({ x: fr.x, y: usado.y + usado.h, w: fr.w, h: fr.y + fr.h - usado.y - usado.h })
  }
  mesa.free = podarContenidos(nuevos.filter(r => r.w > 1 && r.h > 1))
  return true
}

function seSolapan(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}
function contenidoEn(a, b) {
  return a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h
}
function podarContenidos(rects) {
  return rects.filter((r, i) => !rects.some((o, j) => i !== j && contenidoEn(r, o)))
}

// ─── CANTOS ───────────────────────────────────────────────────────────────
// tiras: cada una mide el ancho de la mesa (largo de la plancha, 1220mm por
// defecto); tirasPorPlancha: cuántas caben apiladas en el alto de la mesa.
export function calcularCantos(perimetroTotalMm, mesaAncho, mesaAlto, altoCantoMm, separacion) {
  if (!perimetroTotalMm || perimetroTotalMm <= 0 || !altoCantoMm) {
    return { tiras: 0, tirasPorPlancha: 0, planchasCantos: 0 }
  }
  const tiras = Math.ceil(perimetroTotalMm / mesaAncho)
  const tirasPorPlancha = Math.max(1, Math.floor(mesaAlto / (altoCantoMm + separacion)))
  const planchasCantos = Math.ceil(tiras / tirasPorPlancha)
  return { tiras, tirasPorPlancha, planchasCantos }
}

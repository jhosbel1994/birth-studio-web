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

// ─── NESTING: shelf packing greedy con rotación 90° ──────────────────────────
// Ordena piezas por lado mayor descendente, prueba ambas orientaciones,
// acomoda en "estantes" horizontales dentro de cada mesa y abre mesa nueva
// cuando ya no cabe. Piezas más grandes que la mesa en ambas orientaciones
// se reportan aparte.
export function nestearPiezas(piezasMm, mesaAncho, mesaAlto, separacion) {
  const ordenadas = [...piezasMm].sort((a, b) => Math.max(b.wMm, b.hMm) - Math.max(a.wMm, a.hMm))
  const mesas = []
  const piezasGigantes = []

  for (const pieza of ordenadas) {
    const cabeNormal = pieza.wMm <= mesaAncho && pieza.hMm <= mesaAlto
    const cabeRotada = pieza.hMm <= mesaAncho && pieza.wMm <= mesaAlto
    if (!cabeNormal && !cabeRotada) {
      piezasGigantes.push(pieza)
      continue
    }

    let colocada = false
    for (const mesaExistente of mesas) {
      if (colocarEnMesa(mesaExistente, pieza, mesaAncho, mesaAlto, separacion, cabeNormal, cabeRotada)) {
        colocada = true
        break
      }
    }
    if (!colocada) {
      const mesaNueva = { shelves: [], items: [] }
      colocarEnMesa(mesaNueva, pieza, mesaAncho, mesaAlto, separacion, cabeNormal, cabeRotada)
      mesas.push(mesaNueva)
    }
  }

  return { mesas, piezasGigantes }
}

function colocarEnMesa(mesa, pieza, mesaAncho, mesaAlto, separacion, cabeNormal, cabeRotada) {
  // 1) Intenta sumarse a un estante ya abierto
  for (const shelf of mesa.shelves) {
    for (const rot of [false, true]) {
      if (rot ? !cabeRotada : !cabeNormal) continue
      const w = rot ? pieza.hMm : pieza.wMm
      const h = rot ? pieza.wMm : pieza.hMm
      if (h <= shelf.height && shelf.usedWidth + separacion + w <= mesaAncho) {
        mesa.items.push({ id: pieza.id, x: shelf.usedWidth + separacion, y: shelf.y, w, h, rot })
        shelf.usedWidth += separacion + w
        return true
      }
    }
  }
  // 2) No entró en ningún estante: abre uno nuevo si hay alto disponible
  const ultimo = mesa.shelves[mesa.shelves.length - 1]
  const yBase = ultimo ? ultimo.y + ultimo.height + separacion : 0
  for (const rot of [false, true]) {
    if (rot ? !cabeRotada : !cabeNormal) continue
    const w = rot ? pieza.hMm : pieza.wMm
    const h = rot ? pieza.wMm : pieza.hMm
    if (yBase + h <= mesaAlto) {
      mesa.shelves.push({ y: yBase, height: h, usedWidth: w })
      mesa.items.push({ id: pieza.id, x: 0, y: yBase, w, h, rot })
      return true
    }
  }
  return false
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

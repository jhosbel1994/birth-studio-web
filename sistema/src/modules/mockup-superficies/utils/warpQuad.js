// Corner-pin de 4 puntos (estilo After Effects) sobre Canvas2D.
//
// Canvas2D no soporta transformadas de perspectiva (projective) de forma
// nativa — ctx.setTransform solo hace afines (rotar/escalar/inclinar). El
// truco estandar: partir el cuadrilatero en 2 triangulos y aplicar una
// transformada afin distinta a cada uno (drawImage recortado con clip +
// transform). Con angulos moderados (vitrina real, no un ojo de pez) el
// resultado es visualmente indistinguible de una homografia real, y sale
// gratis en rendimiento porque usa drawImage nativo en vez de recorrer
// pixel a pixel en JS.
function solveAffine3(src, dst) {
  // Resuelve A,t tal que dst_i = A * src_i + t, para 3 pares de puntos.
  const [s0, s1, s2] = src
  const [d0, d1, d2] = dst
  const x0 = s1.x - s0.x, y0 = s1.y - s0.y
  const x1 = s2.x - s0.x, y1 = s2.y - s0.y
  const det = x0 * y1 - x1 * y0
  if (Math.abs(det) < 1e-9) return null
  const dx0 = d1.x - d0.x, dy0 = d1.y - d0.y
  const dx1 = d2.x - d0.x, dy1 = d2.y - d0.y
  const a = (dx0 * y1 - dx1 * y0) / det
  const b = (dy0 * y1 - dy1 * y0) / det
  const c = (dx1 * x0 - dx0 * x1) / det
  const d = (dy1 * x0 - dy0 * x1) / det
  const e = d0.x - a * s0.x - c * s0.y
  const f = d0.y - b * s0.x - d * s0.y
  return [a, b, c, d, e, f]
}

function clipTriangle(ctx, p0, p1, p2) {
  ctx.beginPath()
  ctx.moveTo(p0.x, p0.y)
  ctx.lineTo(p1.x, p1.y)
  ctx.lineTo(p2.x, p2.y)
  ctx.closePath()
  ctx.clip()
}

// dstQuad/srcQuad: [{x,y}×4] en orden TL, TR, BR, BL.
export function drawImageQuad(ctx, img, dstQuad, srcQuad) {
  const iw = img.naturalWidth || img.width
  const ih = img.naturalHeight || img.height
  const src = srcQuad || [
    { x: 0, y: 0 }, { x: iw, y: 0 }, { x: iw, y: ih }, { x: 0, y: ih },
  ]
  const triangles = [
    [0, 1, 2],
    [0, 2, 3],
  ]
  for (const [i, j, k] of triangles) {
    const m = solveAffine3([src[i], src[j], src[k]], [dstQuad[i], dstQuad[j], dstQuad[k]])
    if (!m) continue
    ctx.save()
    clipTriangle(ctx, dstQuad[i], dstQuad[j], dstQuad[k])
    ctx.transform(...m)
    ctx.drawImage(img, 0, 0)
    ctx.restore()
  }
}

// Recorta el contexto a un poligono arbitrario (usado para que el diseño
// nunca se salga de los bordes reales de la zona, aunque su propio
// corner-pin quede mas grande que la zona).
export function clipToPolygon(ctx, puntos) {
  ctx.beginPath()
  puntos.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
  ctx.closePath()
  ctx.clip()
}

export function quadDefault(x, y, w, h) {
  return [
    { x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h },
  ]
}

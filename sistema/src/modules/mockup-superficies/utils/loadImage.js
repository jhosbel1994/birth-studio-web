// Carga una foto subida por el usuario corrigiendo la orientacion EXIF (una
// foto vertical de telefono llega "acostada" sin esto) y la reescala a un
// lado maximo razonable. Mismo patron que usa Prototipo.jsx (handlePhotoFile)
// para el mismo problema, reescrito aca porque no hay una utilidad
// compartida de carga de imagenes en el sistema (confirmado en la
// exploracion previa) — el modulo es independiente a proposito.
const MAX_SIDE = 2400

export async function loadImageFile(file) {
  let bitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    const dataUrl = await new Promise((res, rej) => {
      const r = new FileReader()
      r.onload = () => res(String(r.result))
      r.onerror = rej
      r.readAsDataURL(file)
    })
    bitmap = await new Promise((res, rej) => {
      const img = new Image()
      img.onload = () => res(img)
      img.onerror = rej
      img.src = dataUrl
    })
  }
  const iw = bitmap.width, ih = bitmap.height
  const scale = Math.min(1, MAX_SIDE / Math.max(iw, ih))
  const w = Math.max(1, Math.round(iw * scale))
  const h = Math.max(1, Math.round(ih * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h)
  bitmap.close?.()
  return { canvas, w, h }
}

// Quita el fondo CLARO (blanco/casi-blanco) de un adhesivo, dejándolo
// transparente para que sobre el vidrio no se vea un rectángulo sólido.
// Solo borra el fondo conectado a los BORDES (flood-fill), así los blancos
// internos del diseño (texto blanco, detalles) se conservan. Si el PNG ya
// viene recortado (esquinas transparentes) o el fondo no es claro, no toca
// nada. Modifica el canvas in situ y lo devuelve.
export function knockoutBackground(canvas, tol = 26) {
  const w = canvas.width, h = canvas.height
  if (!w || !h) return canvas
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  let imgData
  try { imgData = ctx.getImageData(0, 0, w, h) } catch { return canvas }
  const d = imgData.data
  const at = (x, y) => (y * w + x) * 4
  const corners = [at(0, 0), at(w - 1, 0), at(0, h - 1), at(w - 1, h - 1)]
  // Ya viene con transparencia -> no hay nada que recortar.
  if (corners.some(i => d[i + 3] < 12)) return canvas
  let br = 0, bg = 0, bb = 0
  for (const i of corners) { br += d[i]; bg += d[i + 1]; bb += d[i + 2] }
  br /= 4; bg /= 4; bb /= 4
  // Solo tratamos fondos claros/uniformes (blanco). Un fondo oscuro o de
  // color podría ser parte del diseño; ahí no tocamos nada.
  if (!(br > 232 && bg > 232 && bb > 232)) return canvas
  const t2 = tol * tol * 3
  const near = (i) => {
    const dr = d[i] - br, dg = d[i + 1] - bg, db = d[i + 2] - bb
    return dr * dr + dg * dg + db * db <= t2
  }
  const visited = new Uint8Array(w * h)
  const stack = []
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return
    const p = y * w + x
    if (!visited[p]) { visited[p] = 1; stack.push(x, y) }
  }
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1) }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y) }
  while (stack.length) {
    const y = stack.pop(), x = stack.pop()
    const i = (y * w + x) * 4
    if (!near(i)) continue
    d[i + 3] = 0
    push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1)
  }
  ctx.putImageData(imgData, 0, 0)
  return canvas
}

export function canvasToBlob(canvas, quality = 0.9) {
  return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
}

// PNG (sin perdida, con canal alfa) — usado para los adhesivos/diseños: si
// se comprimieran como JPEG se perderia la transparencia y el "recorte"
// del sticker se veria como un rectangulo solido tapando el vidrio.
export function canvasToPngBlob(canvas) {
  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
}

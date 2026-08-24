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

export function canvasToBlob(canvas, quality = 0.9) {
  return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
}

// PNG (sin perdida, con canal alfa) — usado para los adhesivos/diseños: si
// se comprimieran como JPEG se perderia la transparencia y el "recorte"
// del sticker se veria como un rectangulo solido tapando el vidrio.
export function canvasToPngBlob(canvas) {
  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
}

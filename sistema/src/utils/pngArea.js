// Lee la proporción de una imagen (alto/ancho). Sirve para PNG, JPG y SVG:
// con el alto que da el cliente + esta proporción se calcula el ancho.
export async function proporcionImagen(file) {
  if (!file) throw new Error('Sin archivo')

  // SVG: se lee por TEXTO (width/height o viewBox). Muchos SVG de Illustrator
  // no traen tamaño intrínseco al cargarlos como imagen, así que esto es más
  // confiable que usar <img>.
  const esSvg = file.type === 'image/svg+xml' || /\.svg$/i.test(file.name || '')
  if (esSvg) {
    const texto = await file.text()
    const svg = new DOMParser().parseFromString(texto, 'image/svg+xml').documentElement
    let w = parseFloat(svg.getAttribute('width'))
    let h = parseFloat(svg.getAttribute('height'))
    if (!(w > 0) || !(h > 0)) {
      const vb = (svg.getAttribute('viewBox') || '').split(/[\s,]+/).map(parseFloat)
      if (vb.length === 4 && vb[2] > 0 && vb[3] > 0) { w = vb[2]; h = vb[3] }
    }
    if (!(w > 0) || !(h > 0)) throw new Error('El SVG no trae tamaño ni viewBox. Prueba con un PNG.')
    return { aspecto: h / w, ancho: w, alto: h }
  }

  // Raster (PNG/JPG…): se lee con <img>.
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const w = img.naturalWidth || img.width
      const h = img.naturalHeight || img.height
      URL.revokeObjectURL(url)
      if (!w || !h) { reject(new Error('No se pudo leer el tamaño del logo. Prueba con un PNG.')); return }
      resolve({ aspecto: h / w, ancho: w, alto: h })
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer el logo. Prueba con un PNG.')) }
    img.src = url
  })
}

// Estima el área "rellena" de un logo en PNG: la fracción de píxeles NO
// transparentes sobre el total, más la proporción alto/ancho de la imagen.
// Pensado para logos exportados con FONDO TRANSPARENTE. Solo usa APIs del
// navegador (Image + canvas). Es una ESTIMACIÓN (no vectorial como el SVG).
export function estimarAreaPng(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type?.startsWith('image/')) {
      reject(new Error('Sube una imagen PNG (idealmente con fondo transparente).'))
      return
    }
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      try {
        // Reduce el tamaño para que el conteo de píxeles sea rápido.
        const maxLado = 600
        const escala = Math.min(1, maxLado / Math.max(img.width, img.height))
        const w = Math.max(1, Math.round(img.width * escala))
        const h = Math.max(1, Math.round(img.height * escala))
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, w, h)
        ctx.drawImage(img, 0, 0, w, h)
        const { data } = ctx.getImageData(0, 0, w, h)
        let opacos = 0
        // Cuenta los píxeles con opacidad real (alpha > umbral).
        for (let i = 3; i < data.length; i += 4) if (data[i] > 24) opacos++
        URL.revokeObjectURL(url)
        const fraccion = opacos / (w * h)
        if (!fraccion) {
          reject(new Error('La imagen no tiene zonas visibles sobre fondo transparente. Exporta el PNG del logo con fondo transparente.'))
          return
        }
        resolve({ fraccion, aspecto: img.height / img.width })
      } catch (err) {
        URL.revokeObjectURL(url)
        reject(err)
      }
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen.')) }
    img.src = url
  })
}

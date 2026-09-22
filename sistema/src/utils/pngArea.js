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

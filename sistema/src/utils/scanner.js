import { auth } from '../firebase'

const MAX_SIDE = 1800
const JPEG_QUALITY = 0.84

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1])
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'))
    reader.readAsDataURL(file)
  })
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('No se pudo preparar la fotografía')),
      'image/jpeg',
      JPEG_QUALITY,
    )
  })
}

async function loadBitmap(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      // Safari puede requerir el camino clásico con HTMLImageElement.
    }
  }

  const url = URL.createObjectURL(file)
  try {
    return await new Promise((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error('Formato de imagen no compatible'))
      image.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function prepararImagenBoleta(file) {
  if (!file?.type?.startsWith('image/')) throw new Error('Selecciona una fotografía de la boleta')
  const bitmap = await loadBitmap(file)
  const sourceWidth = bitmap.width || bitmap.naturalWidth
  const sourceHeight = bitmap.height || bitmap.naturalHeight
  if (!sourceWidth || !sourceHeight) throw new Error('La imagen está vacía o dañada')

  const scale = Math.min(1, MAX_SIDE / Math.max(sourceWidth, sourceHeight))
  const width = Math.max(1, Math.round(sourceWidth * scale))
  const height = Math.max(1, Math.round(sourceHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { alpha: false })
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.drawImage(bitmap, 0, 0, width, height)
  if (typeof bitmap.close === 'function') bitmap.close()

  const blob = await canvasToBlob(canvas)
  const safeName = String(file.name || 'boleta').replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 60)
  return new File([blob], `${safeName || 'boleta'}.jpg`, { type: 'image/jpeg' })
}

export async function escanearBoleta(file) {
  const user = auth.currentUser
  if (!user) throw new Error('Vuelve a iniciar sesión con Google para usar el escáner')

  const archivo = await prepararImagenBoleta(file)
  const [imageBase64, idToken] = await Promise.all([
    fileToBase64(archivo),
    user.getIdToken(),
  ])

  const response = await fetch('/api/scan-receipt', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ imageBase64, mediaType: archivo.type }),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || 'No se pudo leer la boleta')
  return { datos: result.datos, archivo }
}

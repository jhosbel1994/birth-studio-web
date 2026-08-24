import { useEffect, useRef } from 'react'

// Canvas principal de la escena. Paso 1: solo dibuja la foto base a su
// resolucion real (asi las coordenadas quedan listas en px reales para las
// zonas/homografia de los pasos siguientes). Escalado a pantalla via CSS.
export default function SceneCanvas({ fotoUrl, fotoW, fotoH }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!fotoUrl || !fotoW || !fotoH) {
      canvas.width = 0
      canvas.height = 0
      return
    }
    canvas.width = fotoW
    canvas.height = fotoH
    const img = new Image()
    img.onload = () => ctx.drawImage(img, 0, 0, fotoW, fotoH)
    img.src = fotoUrl
  }, [fotoUrl, fotoW, fotoH])

  if (!fotoUrl) {
    return (
      <div className="flex h-full min-h-[420px] flex-col items-center justify-center gap-2 text-center">
        <p className="font-dm text-lg text-on-surface-variant">Sube una foto del local</p>
        <p className="font-dm text-sm text-on-surface-variant/60">Vitrina, muro o fachada — el punto de partida del mockup</p>
      </div>
    )
  }

  return (
    <div className="flex h-full items-center justify-center overflow-auto p-4">
      <canvas ref={canvasRef} className="max-w-full h-auto rounded-2xl shadow-lg" />
    </div>
  )
}

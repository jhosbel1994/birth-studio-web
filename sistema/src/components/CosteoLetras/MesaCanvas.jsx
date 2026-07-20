import { useEffect, useRef } from 'react'

// Dibuja una mesa de corte con las piezas ya posicionadas por nestearPiezas().
// Componente puramente presentacional — no calcula nada de negocio.
export default function MesaCanvas({ mesa, mesaAncho, mesaAlto, indice }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const anchoPx = canvas.clientWidth || 320
    const escala = anchoPx / mesaAncho
    const altoPx = Math.round(mesaAlto * escala)
    canvas.width = anchoPx
    canvas.height = altoPx

    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, anchoPx, altoPx)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, anchoPx, altoPx)
    ctx.strokeStyle = '#0a0a0a'
    ctx.lineWidth = 1.5
    ctx.strokeRect(0, 0, anchoPx, altoPx)

    for (const item of mesa.items) {
      const x = item.x * escala
      const y = item.y * escala
      const w = item.w * escala
      const h = item.h * escala
      ctx.fillStyle = 'rgba(232, 0, 13, 0.35)'
      ctx.strokeStyle = '#e8000d'
      ctx.lineWidth = 1
      ctx.fillRect(x, y, w, h)
      ctx.strokeRect(x, y, w, h)
    }
  }, [mesa, mesaAncho, mesaAlto])

  return (
    <div className="space-y-1">
      <p className="text-[11px] font-dm font-medium text-birth-gray-4">
        Mesa {indice + 1} · {mesaAncho}×{mesaAlto}mm · {mesa.items.length} pieza{mesa.items.length !== 1 ? 's' : ''}
      </p>
      <canvas
        ref={canvasRef}
        className="w-full border border-birth-gray-2 rounded bg-white block"
        style={{ aspectRatio: `${mesaAncho} / ${mesaAlto}` }}
      />
    </div>
  )
}

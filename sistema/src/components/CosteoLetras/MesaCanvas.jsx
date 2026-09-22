import { useEffect, useRef } from 'react'

// Dibuja una mesa de corte con las piezas ya posicionadas por nestearPiezas().
// Si recibe el logo rasterizado (logoImg) y el mapa de piezas (piezasMap),
// dibuja cada LETRA REAL recortada del logo en su lugar; si no, cae a
// rectángulos. Componente puramente presentacional.
export default function MesaCanvas({ mesa, mesaAncho, mesaAlto, indice, logoImg, piezasMap }) {
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

    const iw = logoImg?.naturalWidth || 0
    const ih = logoImg?.naturalHeight || 0

    for (const item of mesa.items) {
      const x = item.x * escala
      const y = item.y * escala
      const w = item.w * escala
      const h = item.h * escala
      const frac = piezasMap?.[item.id]

      if (logoImg && frac && iw > 0 && ih > 0) {
        // Recorte de la letra en el raster del logo.
        const sx = frac.fx * iw
        const sy = frac.fy * ih
        const sw = Math.max(1, frac.fw * iw)
        const sh = Math.max(1, frac.fh * ih)
        ctx.save()
        if (item.rot) {
          // La pieza va rotada 90°: encaja en el rect w×h (dims ya intercambiadas).
          ctx.translate(x + w, y)
          ctx.rotate(Math.PI / 2)
          ctx.drawImage(logoImg, sx, sy, sw, sh, 0, 0, h, w)
        } else {
          ctx.drawImage(logoImg, sx, sy, sw, sh, x, y, w, h)
        }
        ctx.restore()
        ctx.strokeStyle = 'rgba(232, 0, 13, 0.45)'
        ctx.lineWidth = 0.75
        ctx.strokeRect(x, y, w, h)
      } else {
        // Fallback: rectángulo.
        ctx.fillStyle = 'rgba(232, 0, 13, 0.35)'
        ctx.strokeStyle = '#e8000d'
        ctx.lineWidth = 1
        ctx.fillRect(x, y, w, h)
        ctx.strokeRect(x, y, w, h)
      }
    }
  }, [mesa, mesaAncho, mesaAlto, logoImg, piezasMap])

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

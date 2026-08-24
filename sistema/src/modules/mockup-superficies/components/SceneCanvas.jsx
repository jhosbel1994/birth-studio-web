import { useCallback, useEffect, useRef, useState } from 'react'
import { drawImageQuad, clipToPolygon } from '../utils/warpQuad'

const COLOR_ZONA = { vidrio: '#0058bc', pared: '#bc000a' }

function useImageCache() {
  const cache = useRef(new Map())
  return useCallback((url, onLoad) => {
    if (!url) return null
    let img = cache.current.get(url)
    if (img) return img.complete ? img : null
    img = new Image()
    img.onload = onLoad
    img.src = url
    cache.current.set(url, img)
    return null
  }, [])
}

// Canvas principal: dibuja la foto base + las capas de diseño ya warpeadas
// (corner-pin) y recortadas a su zona — eso es lo que queda "horneado" en
// los pixeles, listo para exportar mas adelante. Los contornos/handles de
// edicion van en un <svg> superpuesto con viewBox = tamaño real de la foto,
// asi las coordenadas de zonas/capas (en espacio-imagen) se plotean directo
// sin matemática de escala manual.
export default function SceneCanvas({
  fotoUrl, fotoW, fotoH, zonas = [], capas = [],
  herramienta, zonaActivaId, capaActivaId,
  onZonaPuntoChange, onCapaPuntoChange,
}) {
  const canvasRef = useRef(null)
  const svgRef = useRef(null)
  const dragRef = useRef(null)
  const [, forceRedraw] = useState(0)
  const getImg = useImageCache()

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !fotoUrl || !fotoW || !fotoH) return
    const ctx = canvas.getContext('2d')
    canvas.width = fotoW
    canvas.height = fotoH
    const base = getImg(fotoUrl, () => forceRedraw(n => n + 1))
    if (!base) return
    ctx.clearRect(0, 0, fotoW, fotoH)
    ctx.drawImage(base, 0, 0, fotoW, fotoH)
    for (const capa of capas) {
      const zona = zonas.find(z => z.id === capa.zonaId)
      const img = getImg(capa.imgUrl, () => forceRedraw(n => n + 1))
      if (!img || !zona) continue
      ctx.save()
      clipToPolygon(ctx, zona.puntos)
      drawImageQuad(ctx, img, capa.puntos)
      ctx.restore()
    }
  }, [fotoUrl, fotoW, fotoH, zonas, capas, getImg])

  useEffect(() => { redraw() }, [redraw])

  const puntoDesdeEvento = useCallback((e) => {
    const svg = svgRef.current
    if (!svg) return null
    const rect = svg.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * fotoW
    const y = ((e.clientY - rect.top) / rect.height) * fotoH
    return {
      x: Math.min(fotoW, Math.max(0, x)),
      y: Math.min(fotoH, Math.max(0, y)),
    }
  }, [fotoW, fotoH])

  const handlePointerDown = (kind, id, idx) => (e) => {
    e.preventDefault()
    e.target.setPointerCapture?.(e.pointerId)
    dragRef.current = { kind, id, idx }
  }

  const handlePointerMove = (e) => {
    const drag = dragRef.current
    if (!drag) return
    const p = puntoDesdeEvento(e)
    if (!p) return
    if (drag.kind === 'zona') onZonaPuntoChange(drag.id, drag.idx, p)
    else onCapaPuntoChange(drag.id, drag.idx, p)
  }

  const handlePointerUp = () => { dragRef.current = null }

  if (!fotoUrl) {
    return (
      <div className="flex h-full min-h-[420px] flex-col items-center justify-center gap-2 text-center">
        <p className="font-dm text-lg text-on-surface-variant">Sube una foto del local</p>
        <p className="font-dm text-sm text-on-surface-variant/60">Vitrina, muro o fachada — el punto de partida del mockup</p>
      </div>
    )
  }

  const handleR = fotoW * 0.011

  return (
    <div className="flex h-full items-center justify-center overflow-auto p-4">
      <div className="relative inline-block max-w-full">
        <canvas ref={canvasRef} className="block max-w-full h-auto rounded-2xl shadow-lg" />
        <svg
          ref={svgRef}
          viewBox={`0 0 ${fotoW} ${fotoH}`}
          className="absolute inset-0 h-full w-full touch-none select-none"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {herramienta === 'zonas' && zonas.map(z => (
            <g key={z.id}>
              <polygon
                points={z.puntos.map(p => `${p.x},${p.y}`).join(' ')}
                fill={COLOR_ZONA[z.tipo] || '#888'}
                fillOpacity={z.id === zonaActivaId ? 0.22 : 0.1}
                stroke={COLOR_ZONA[z.tipo] || '#888'}
                strokeWidth={fotoW * 0.0025}
                strokeDasharray={z.id === zonaActivaId ? 'none' : `${fotoW * 0.008} ${fotoW * 0.006}`}
              />
              {z.id === zonaActivaId && z.puntos.map((p, idx) => (
                <circle
                  key={idx} cx={p.x} cy={p.y} r={handleR}
                  fill="#fff" stroke={COLOR_ZONA[z.tipo] || '#888'} strokeWidth={fotoW * 0.003}
                  onPointerDown={handlePointerDown('zona', z.id, idx)}
                  style={{ cursor: 'grab' }}
                />
              ))}
            </g>
          ))}

          {herramienta === 'diseno' && capas.filter(c => c.id === capaActivaId).map(c => (
            <g key={c.id}>
              <polygon
                points={c.puntos.map(p => `${p.x},${p.y}`).join(' ')}
                fill="none" stroke="#00647f" strokeWidth={fotoW * 0.0025}
              />
              {c.puntos.map((p, idx) => (
                <circle
                  key={idx} cx={p.x} cy={p.y} r={handleR}
                  fill="#fff" stroke="#00647f" strokeWidth={fotoW * 0.003}
                  onPointerDown={handlePointerDown('capa', c.id, idx)}
                  style={{ cursor: 'grab' }}
                />
              ))}
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}

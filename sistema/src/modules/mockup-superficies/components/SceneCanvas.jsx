import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import { drawImageQuad, clipToPolygon } from '../utils/warpQuad'

const COLOR_ZONA = { vidrio: '#0058bc', pared: '#bc000a' }

function polygonPath(ctx, puntos) {
  ctx.beginPath()
  puntos.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
  ctx.closePath()
}

function polygonBounds(puntos) {
  const xs = puntos.map(p => p.x)
  const ys = puntos.map(p => p.y)
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    w: Math.max(...xs) - Math.min(...xs),
    h: Math.max(...ys) - Math.min(...ys),
  }
}

function drawPerforation(ctx, puntos, textura = 0.5) {
  const b = polygonBounds(puntos)
  const step = Math.max(5, Math.min(9, Math.min(b.w, b.h) * 0.018))
  // Microperforado real: la grafica queda casi completa y solo una trama
  // fina de orificios deja ver el interior. El slider mueve la apertura
  // aprox. entre 7% y 13%, con 10% como punto medio.
  const openArea = 0.07 + textura * 0.06
  const r = step * Math.sqrt(openArea / Math.PI)
  ctx.save()
  clipToPolygon(ctx, puntos)
  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillStyle = '#000'
  for (let y = b.y - step; y <= b.y + b.h + step; y += step) {
    for (let x = b.x - step; x <= b.x + b.w + step; x += step) {
      ctx.beginPath()
      ctx.arc(x + ((Math.round(y / step) % 2) * step * 0.5), y, r, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()

  ctx.save()
  clipToPolygon(ctx, puntos)
  ctx.globalAlpha = 0.12
  ctx.fillStyle = '#111'
  for (let y = b.y - step; y <= b.y + b.h + step; y += step) {
    for (let x = b.x - step; x <= b.x + b.w + step; x += step) {
      ctx.beginPath()
      ctx.arc(x + ((Math.round(y / step) % 2) * step * 0.5), y, Math.max(0.55, r * 0.55), 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()
}

function drawFrostNoise(ctx, puntos, textura = 0.5) {
  const b = polygonBounds(puntos)
  const lines = Math.max(10, Math.round((b.w + b.h) / 36))
  ctx.save()
  clipToPolygon(ctx, puntos)
  ctx.globalAlpha = 0.12 + textura * 0.16
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = Math.max(1, Math.min(b.w, b.h) * 0.004)
  for (let i = 0; i < lines; i += 1) {
    const y = b.y + (b.h * i) / lines
    ctx.beginPath()
    ctx.moveTo(b.x - b.w * 0.2, y + Math.sin(i) * 8)
    ctx.lineTo(b.x + b.w * 1.2, y + Math.cos(i * 1.7) * 8)
    ctx.stroke()
  }
  ctx.restore()
}

function renderCapa(ctx, base, img, capa, zona, fotoW, fotoH) {
  const acabado = capa.acabado || 'impreso-opaco'
  const opacidad = acabado === 'microperforado' ? (capa.opacidad ?? 0.96) : (capa.opacidad ?? 0.88)
  const luz = capa.luz ?? 0.22
  const textura = capa.textura ?? 0.5
  const layer = document.createElement('canvas')
  layer.width = fotoW
  layer.height = fotoH
  const lctx = layer.getContext('2d')

  lctx.save()
  clipToPolygon(lctx, zona.puntos)

  if (acabado.includes('empavonado')) {
    lctx.filter = `blur(${2 + textura * 4}px) saturate(0.65)`
    lctx.globalAlpha = 0.65
    lctx.drawImage(base, 0, 0, fotoW, fotoH)
    lctx.filter = 'none'
    lctx.globalAlpha = acabado === 'empavonado-sin-diseno' ? 0.52 + textura * 0.18 : 0.26 + textura * 0.12
    lctx.fillStyle = '#f7fbff'
    polygonPath(lctx, zona.puntos)
    lctx.fill()
  }

  if (img) {
    lctx.globalAlpha = acabado === 'empavonado-troquelado' ? 0.74 : 1
    if (acabado === 'vinil-corte') lctx.filter = 'contrast(1.15) saturate(1.2)'
    if (acabado === 'microperforado') lctx.filter = 'contrast(1.05) saturate(0.95)'
    drawImageQuad(lctx, img, capa.puntos)
    lctx.filter = 'none'
  }

  if (!img && !acabado.includes('empavonado')) {
    lctx.globalAlpha = 0.35
    lctx.fillStyle = zona.tipo === 'pared' ? '#ffffff' : '#dceffc'
    polygonPath(lctx, zona.puntos)
    lctx.fill()
  }

  lctx.restore()

  if (acabado === 'microperforado') drawPerforation(lctx, zona.puntos, textura)
  if (acabado.includes('empavonado')) drawFrostNoise(lctx, zona.puntos, textura)

  if (luz > 0) {
    lctx.save()
    clipToPolygon(lctx, zona.puntos)
    lctx.globalCompositeOperation = zona.tipo === 'pared' ? 'multiply' : 'source-atop'
    lctx.globalAlpha = luz * (zona.tipo === 'pared' ? 0.55 : 0.32)
    lctx.drawImage(base, 0, 0, fotoW, fotoH)
    lctx.restore()
  }

  ctx.save()
  ctx.globalAlpha = opacidad
  ctx.drawImage(layer, 0, 0)
  ctx.restore()
}

// Canvas principal: dibuja la foto base + las capas de diseño ya warpeadas
// (corner-pin) y recortadas a su zona — eso es lo que queda "horneado" en
// los pixeles, listo para exportar mas adelante. Los contornos/handles de
// edicion van en un <svg> superpuesto con viewBox = tamaño real de la foto,
// asi las coordenadas de zonas/capas (en espacio-imagen) se plotean directo
// sin matemática de escala manual.
const SceneCanvas = forwardRef(function SceneCanvas({
  fotoUrl, fotoW, fotoH, zonas = [], capas = [],
  herramienta, zonaActivaId, capaActivaId,
  zoom = 1, mostrarGuias = true, calidad = 'alta',
  onZoomChange,
  onZonaPuntoChange, onCapaPuntoChange,
}, ref) {
  const canvasRef = useRef(null)
  const svgRef = useRef(null)
  const dragRef = useRef(null)
  const imgCache = useRef(new Map())
  // Las imagenes (foto base, adhesivos) cargan async — cuando terminan hay
  // que volver a dibujar. Antes esto pasaba por un contador de estado +
  // useEffect([redraw]), pero como `redraw` es la MISMA referencia
  // memoizada mientras fotoUrl/zonas/capas no cambien, el efecto nunca se
  // volvia a disparar y el canvas quedaba en blanco para siempre (bug
  // reportado: sube la foto, el boton cambia a "Cambiar foto", pero no se
  // ve nada). El fix: la carga de imagen llama a redraw() DIRECTO via ref,
  // sin pasar por el ciclo de render de React.
  const redrawRef = useRef(() => {})

  const getImg = useCallback((url) => {
    if (!url) return null
    let img = imgCache.current.get(url)
    if (img) return img.complete ? img : null
    img = new Image()
    img.onload = () => redrawRef.current()
    img.src = url
    imgCache.current.set(url, img)
    return null
  }, [])

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !fotoUrl || !fotoW || !fotoH) return
    const ctx = canvas.getContext('2d')
    canvas.width = fotoW
    canvas.height = fotoH
    const base = getImg(fotoUrl)
    if (!base) return
    ctx.clearRect(0, 0, fotoW, fotoH)
    ctx.imageSmoothingEnabled = calidad !== 'rapida'
    ctx.imageSmoothingQuality = calidad === 'rapida' ? 'low' : 'high'
    ctx.drawImage(base, 0, 0, fotoW, fotoH)
    for (const capa of capas) {
      const zona = zonas.find(z => z.id === capa.zonaId)
      const img = capa.imgUrl ? getImg(capa.imgUrl) : null
      if (!zona || (capa.imgUrl && !img)) continue
      renderCapa(ctx, base, img, capa, zona, fotoW, fotoH)
    }
  }, [fotoUrl, fotoW, fotoH, zonas, capas, getImg, calidad])

  useEffect(() => { redrawRef.current = redraw }, [redraw])
  useEffect(() => { redraw() }, [redraw])

  useImperativeHandle(ref, () => ({
    exportImage({ type = 'image/jpeg', quality = 0.88, maxWidth = 1600 } = {}) {
      const canvas = canvasRef.current
      if (!canvas || !fotoUrl || !canvas.width || !canvas.height) return null
      redrawRef.current?.()
      // toDataURL lanza SecurityError si el canvas quedó "tainted" (alguna
      // imagen remota sin CORS). Lo capturamos para NO morir en silencio:
      // devolvemos null y el llamador muestra un mensaje claro.
      try {
        if (!maxWidth || canvas.width <= maxWidth) {
          return { dataUrl: canvas.toDataURL(type, quality), w: canvas.width, h: canvas.height }
        }
        const scale = maxWidth / canvas.width
        const out = document.createElement('canvas')
        out.width = Math.round(canvas.width * scale)
        out.height = Math.round(canvas.height * scale)
        const ctx = out.getContext('2d')
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(canvas, 0, 0, out.width, out.height)
        return { dataUrl: out.toDataURL(type, quality), w: out.width, h: out.height }
      } catch {
        return null
      }
    },
  }), [fotoUrl])

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
  const mostrarZonas = herramienta === 'zonas' || herramienta === 'escala'
  const mostrarCapa = ['diseno', 'acabado', 'luz'].includes(herramienta)

  return (
    <div className="relative flex h-full items-center justify-center overflow-auto p-4">
      <div className="absolute left-4 top-4 z-10 flex items-center gap-1 rounded-full border border-white/60 bg-white/80 px-2 py-1 shadow-sm backdrop-blur">
        <button
          type="button"
          onClick={() => onZoomChange?.(Math.max(0.35, Number((zoom - 0.1).toFixed(2))))}
          className="h-7 w-7 rounded-full text-sm font-dm text-on-surface-variant hover:bg-white"
          title="Alejar"
        >
          -
        </button>
        <span className="min-w-[46px] text-center text-[11px] font-dm font-medium text-on-surface-variant">{Math.round(zoom * 100)}%</span>
        <button
          type="button"
          onClick={() => onZoomChange?.(Math.min(2.5, Number((zoom + 0.1).toFixed(2))))}
          className="h-7 w-7 rounded-full text-sm font-dm text-on-surface-variant hover:bg-white"
          title="Acercar"
        >
          +
        </button>
      </div>
      <div
        className="relative inline-block"
        style={{ width: `${fotoW * zoom}px`, maxWidth: zoom <= 1 ? '100%' : 'none' }}
      >
        <canvas ref={canvasRef} className="block h-auto w-full rounded-2xl shadow-lg" />
        <svg
          ref={svgRef}
          viewBox={`0 0 ${fotoW} ${fotoH}`}
          className="absolute inset-0 h-full w-full touch-none select-none"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {mostrarGuias && mostrarZonas && zonas.map(z => (
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

          {mostrarGuias && mostrarCapa && capas.filter(c => c.id === capaActivaId).map(c => (
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
})

export default SceneCanvas

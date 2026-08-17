import { useState } from 'react'
import { Box, X, Upload } from 'lucide-react'
import { obtenerPrototipo } from '../utils/prototipoStore'

// Comprime una imagen subida a JPEG (lado largo máx. 1400px) para que no
// infle el documento de la cotización ni el PDF.
function comprimir(file, cb) {
  const reader = new FileReader()
  reader.onload = () => {
    const img = new Image()
    img.onload = () => {
      const long = 1400
      const scale = Math.min(1, long / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const c = document.createElement('canvas')
      c.width = w; c.height = h
      c.getContext('2d').drawImage(img, 0, 0, w, h)
      cb(c.toDataURL('image/jpeg', 0.82))
    }
    img.onerror = () => cb(null)
    img.src = String(reader.result)
  }
  reader.onerror = () => cb(null)
  reader.readAsDataURL(file)
}

// Selector para adjuntar el render del prototipo al PDF de la cotización.
// `value` es el dataURL adjunto (o null). `onChange(dataURL | null)`.
export default function AdjuntarPrototipo({ value, onChange }) {
  const [stored] = useState(() => obtenerPrototipo())
  const [enabled, setEnabled] = useState(!!value)

  const toggle = (on) => {
    setEnabled(on)
    if (!on) onChange(null)
    else if (!value && stored?.dataUrl) onChange(stored.dataUrl)
  }

  const subir = (file) => {
    if (!file) return
    comprimir(file, (dataUrl) => { if (dataUrl) onChange(dataUrl) })
  }

  return (
    <div className="border border-birth-gray-2 rounded p-3">
      <label className="flex items-center gap-2.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => toggle(e.target.checked)}
          className="w-4 h-4 accent-birth-red"
        />
        <span className="text-sm font-dm text-birth-black flex items-center gap-1.5">
          <Box size={14} className="text-birth-gray-4" />
          Adjuntar prototipo del letrero al PDF
        </span>
      </label>

      {enabled && (
        <div className="mt-3">
          {value ? (
            <div className="flex items-center gap-3">
              <img src={value} alt="Prototipo"
                className="w-24 h-16 object-contain bg-birth-gray rounded border border-birth-gray-2" />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-dm text-birth-black border border-birth-gray-2 rounded px-2.5 py-1 cursor-pointer hover:border-birth-black inline-flex items-center gap-1.5 w-fit">
                  <Upload size={11} /> Cambiar imagen
                  <input type="file" accept="image/*" className="hidden"
                    onChange={(e) => subir(e.target.files?.[0])} />
                </label>
                <button type="button" onClick={() => onChange(null)}
                  className="text-xs font-dm text-birth-red inline-flex items-center gap-1 w-fit">
                  <X size={11} /> Quitar
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-birth-gray-4 font-dm leading-relaxed">
                {stored
                  ? 'Se usará el último prototipo generado. También puedes subir otra imagen.'
                  : 'Genera un prototipo en la sección "Prototipo Logo", o sube una imagen aquí.'}
              </p>
              <div className="flex gap-2">
                {stored && (
                  <button type="button" onClick={() => onChange(stored.dataUrl)}
                    className="text-xs font-dm text-white bg-birth-black rounded px-3 py-1.5 hover:bg-birth-red transition-colors">
                    Usar último prototipo
                  </button>
                )}
                <label className="text-xs font-dm text-birth-black border border-birth-gray-2 rounded px-3 py-1.5 cursor-pointer hover:border-birth-black inline-flex items-center gap-1.5">
                  <Upload size={11} /> Subir imagen
                  <input type="file" accept="image/*" className="hidden"
                    onChange={(e) => subir(e.target.files?.[0])} />
                </label>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

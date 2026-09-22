import { useState, useEffect } from 'react'
import { MESA_DEFAULT, SEPARACION_DEFAULT_MM, PRECIOS_M2_LETRAS } from '../../data/costeoLetras'
import { getCosteoLetrasPrecios, saveCosteoLetrasPrecios } from '../../utils/storage'
import { clp } from '../../utils/formatters'
import TamanoLetrasSection from './TamanoLetrasSection'
import ResumenPorM2 from './ResumenPorM2'

// Costeo de letras corpóreas — modelo POR M²: precio = m² × precio/m² (según
// material e iluminación) + instalación aparte, con un multiplicador opcional.
// El detalle de costos por materiales quedó fuera del flujo (se prioriza la
// forma en que el usuario realmente cobra).
export default function CosteoLetrasPanel() {
  const [m2Proyecto, setM2Proyecto] = useState('')
  const [material, setMaterial] = useState('acrilico') // 'acrilico' | 'trovicel'
  const [iluminacion, setIluminacion] = useState('con') // 'con' | 'sin'
  const [preciosM2, setPreciosM2] = useState(PRECIOS_M2_LETRAS) // matriz editable
  const [multActivo, setMultActivo] = useState(false)
  const [mult, setMult] = useState(2)
  const [instalacion, setInstalacion] = useState('')
  const [mesa, setMesa] = useState(MESA_DEFAULT)
  const [separacion, setSeparacion] = useState(SEPARACION_DEFAULT_MM)

  useEffect(() => {
    getCosteoLetrasPrecios().then(g => {
      if (g?.precios_m2) {
        setPreciosM2({
          acrilico: { ...PRECIOS_M2_LETRAS.acrilico, ...(g.precios_m2.acrilico || {}) },
          trovicel: { ...PRECIOS_M2_LETRAS.trovicel, ...(g.precios_m2.trovicel || {}) },
        })
      }
    }).catch(() => {})
  }, [])

  const precioM2Actual = preciosM2[material]?.[iluminacion] ?? PRECIOS_M2_LETRAS[material][iluminacion]

  const setPrecioM2Actual = (valor) => {
    setPreciosM2(prev => ({ ...prev, [material]: { ...prev[material], [iluminacion]: valor } }))
  }
  const guardarPreciosM2 = () => {
    getCosteoLetrasPrecios()
      .then(g => saveCosteoLetrasPrecios({ ...g, precios_m2: preciosM2 }))
      .catch(() => {})
  }

  const m2 = parseFloat(m2Proyecto) || 0
  const precioM2Num = parseFloat(precioM2Actual) || 0
  const subtotalLetrero = Math.round(m2 * precioM2Num)
  const multNum = Number(mult) || 1.5
  const subtotalFinal = multActivo ? Math.round(subtotalLetrero * multNum) : subtotalLetrero
  const instalacionNum = Math.round(parseFloat(instalacion) || 0)
  const totalNeto = subtotalFinal + instalacionNum

  // El SVG/PNG solo alimentan el m² (el precio es por m², no por planchas).
  const handleAplicarSugerencias = ({ areaM2 }) => {
    if (areaM2 > 0) setM2Proyecto(String(Math.round(areaM2 * 100) / 100))
  }

  const construirDescripcion = () => {
    const mat = material === 'acrilico' ? 'Acrílico' : 'Trovicel'
    const luz = iluminacion === 'con' ? 'con iluminación' : 'sin iluminación'
    const partes = [`Letras corpóreas ${mat} ${luz}`]
    if (m2 > 0) partes.push(`${m2.toFixed(2)} m² × ${clp(precioM2Num)}/m²`)
    if (multActivo) partes.push(`×${multNum.toFixed(1)}`)
    if (instalacionNum > 0) partes.push(`Instalación ${clp(instalacionNum)}`)
    return partes.join(' | ')
  }

  const handleAgregar = () => {
    if (!totalNeto) return
    window.dispatchEvent(new CustomEvent('cotizador:agregar', {
      detail: {
        descripcion: construirDescripcion(),
        cantidad: 1,
        precioUnitario: totalNeto,
        total: totalNeto,
        costeoSnapshot: {
          m2Proyecto, material, iluminacion, precioM2: precioM2Num,
          multActivo, mult: multNum, instalacion: instalacionNum,
          subtotalLetrero, subtotalFinal, totalNeto,
        },
      },
    }))
  }

  return (
    <div className="p-2.5 md:p-4 space-y-4">
      <div className="border border-birth-gray-2 rounded">
        <TamanoLetrasSection
          mesa={mesa} setMesa={setMesa}
          separacion={separacion} setSeparacion={setSeparacion}
          onAplicarSugerencias={handleAplicarSugerencias}
          setM2Proyecto={setM2Proyecto}
        />
      </div>

      <ResumenPorM2
        m2Proyecto={m2Proyecto} setM2Proyecto={setM2Proyecto}
        material={material} setMaterial={setMaterial}
        iluminacion={iluminacion} setIluminacion={setIluminacion}
        precioM2={precioM2Actual} setPrecioM2={setPrecioM2Actual} onPrecioM2Blur={guardarPreciosM2}
        multActivo={multActivo} setMultActivo={setMultActivo} mult={mult} setMult={setMult}
        instalacion={instalacion} setInstalacion={setInstalacion}
        subtotalLetrero={subtotalLetrero} subtotalFinal={subtotalFinal} totalNeto={totalNeto}
        onAgregar={handleAgregar}
      />
    </div>
  )
}

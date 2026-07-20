import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  GRUPO_ACRILICO, GRUPO_TROVICEL, GRUPO_INSUMOS, GRUPO_LOGISTICA_FIJA, GRUPO_FACHADA,
  MESA_DEFAULT, SEPARACION_DEFAULT_MM, MARGEN_DEFAULT, PRECIO_CALLE_M2_DEFAULT,
  PRODUCCION_DEFAULT,
} from '../../data/costeoLetras'
import { calcularCosteoLetras, sumarFachada } from '../../utils/costeoLetrasCalc'
import { getCosteoLetrasPrecios, saveCosteoLetrasPrecios } from '../../utils/storage'
import SvgAnalisisSection from './SvgAnalisisSection'
import GrupoCostosSection from './GrupoCostosItems'
import FachadaCosteoSection from './FachadaCosteoSection'
import ProduccionLogisticaSection from './ProduccionLogisticaSection'
import ResumenSticky from './ResumenSticky'

// Orquestador del módulo de costeo de letras corpóreas. Dueño de todo el
// estado: `precios` es lo único que persiste (Firestore settings/costeoLetras);
// toggles, cantidades y datos del proyecto son de la sesión actual y viajan
// como snapshot dentro del ítem al agregarlo a la cotización.
export default function CosteoLetrasPanel() {
  const [precios, setPrecios] = useState({})
  const [itemsState, setItemsStateRaw] = useState({})
  const [fachadaRows, setFachadaRows] = useState({})
  const [horasCnc, setHorasCnc] = useState('')
  const [desgastePct, setDesgastePct] = useState(String(PRODUCCION_DEFAULT.desgastePct))
  const [logisticaLibre, setLogisticaLibre] = useState({ trasladoFueraTalca: '', diasAndamio: '', diasEmpleado: '' })
  const [margen, setMargen] = useState(MARGEN_DEFAULT)
  const [m2Proyecto, setM2Proyecto] = useState('')
  const [precioCalleM2, setPrecioCalleM2] = useState(String(PRECIO_CALLE_M2_DEFAULT))
  const [mesa, setMesa] = useState(MESA_DEFAULT)
  const [separacion, setSeparacion] = useState(SEPARACION_DEFAULT_MM)

  useEffect(() => {
    getCosteoLetrasPrecios().then(guardados => {
      setPrecios(guardados)
      if (guardados.precio_calle_m2 != null) setPrecioCalleM2(String(guardados.precio_calle_m2))
    })
  }, [])

  const guardarPrecios = useCallback((preciosActuales) => {
    saveCosteoLetrasPrecios(preciosActuales).catch(() => {})
  }, [])

  const setPrecioValor = (id, value) => setPrecios(p => ({ ...p, [id]: value }))
  const handlePrecioBlur = () => guardarPrecios(precios)
  const handlePrecioCalleBlur = () => {
    const actualizados = { ...precios, precio_calle_m2: parseFloat(precioCalleM2) || 0 }
    setPrecios(actualizados)
    guardarPrecios(actualizados)
  }

  const setItemActivo = (id, activo) => setItemsStateRaw(s => ({ ...s, [id]: { activo, cantidad: s[id]?.cantidad ?? '' } }))
  const setItemCantidad = (id, cantidad) => setItemsStateRaw(s => ({ ...s, [id]: { ...s[id], cantidad } }))

  const fachadaTotal = useMemo(
    () => sumarFachada(GRUPO_FACHADA, fachadaRows, precios),
    [fachadaRows, precios]
  )

  const resultado = useMemo(() => calcularCosteoLetras({
    gruposSimples: { acrilico: GRUPO_ACRILICO, trovicel: GRUPO_TROVICEL, insumos: GRUPO_INSUMOS, logisticaFija: GRUPO_LOGISTICA_FIJA },
    itemsState, precios, fachadaTotal, horasCnc, desgastePct, logisticaLibre, margen, m2Proyecto, precioCalleM2,
  }), [itemsState, precios, fachadaTotal, horasCnc, desgastePct, logisticaLibre, margen, m2Proyecto, precioCalleM2])

  const handleAplicarSugerencias = ({ materialId, totalPlanchas, areaM2 }) => {
    setItemsStateRaw(s => ({
      ...s,
      [materialId]: { activo: true, cantidad: String(totalPlanchas) },
      calugas_led: { activo: true, cantidad: String(Math.ceil(areaM2)) },
      adhesivo_transp: { activo: true, cantidad: String(Math.round(areaM2 * 1.15 * 100) / 100) },
    }))
    setM2Proyecto(String(Math.round(areaM2 * 100) / 100))
  }

  const construirDescripcion = () => {
    const nombresActivos = (items) => items
      .filter(it => itemsState[it.id]?.activo)
      .map(it => {
        const cant = itemsState[it.id]?.cantidad
        return `${it.nombre}${cant > 1 ? ` ×${cant}` : ''}`
      })

    const materiales = [...nombresActivos(GRUPO_ACRILICO), ...nombresActivos(GRUPO_TROVICEL)]
    const fachadaActiva = GRUPO_FACHADA
      .filter(it => fachadaRows[it.id]?.activo)
      .map(it => `${it.nombre} ×${fachadaRows[it.id].cantidad}`)
    const insumosActivos = nombresActivos(GRUPO_INSUMOS)
    const logisticaActiva = [
      ...nombresActivos(GRUPO_LOGISTICA_FIJA),
      ...(parseFloat(logisticaLibre.trasladoFueraTalca) > 0 ? ['Traslado fuera de Talca'] : []),
      ...(parseFloat(logisticaLibre.diasAndamio) > 0 ? [`Andamios ×${logisticaLibre.diasAndamio}d`] : []),
      ...(parseFloat(logisticaLibre.diasEmpleado) > 0 ? [`Instalación ×${logisticaLibre.diasEmpleado}d`] : []),
    ]

    const partes = ['Letras corpóreas']
    if (parseFloat(m2Proyecto) > 0) partes.push(`${parseFloat(m2Proyecto).toFixed(2)} m²`)
    if (materiales.length || fachadaActiva.length) partes.push([...materiales, ...fachadaActiva].join(', '))
    if (insumosActivos.length) partes.push(insumosActivos.join(', '))
    if (parseFloat(horasCnc) > 0) partes.push(`CNC ${horasCnc}h`)
    if (logisticaActiva.length) partes.push(logisticaActiva.join(', '))
    partes.push(`Margen ×${margen}`)
    return partes.join(' | ')
  }

  const handleAgregar = () => {
    if (!resultado.ventaNeta) return
    window.dispatchEvent(new CustomEvent('cotizador:agregar', {
      detail: {
        descripcion: construirDescripcion(),
        cantidad: 1,
        precioUnitario: resultado.ventaNeta,
        total: resultado.ventaNeta,
        costeoSnapshot: { itemsState, fachadaRows, horasCnc, desgastePct, logisticaLibre, margen, m2Proyecto, resultado },
      },
    }))
  }

  return (
    <div className="lg:grid lg:grid-cols-3 lg:gap-4 lg:p-4 lg:items-start">
      <div className="lg:col-span-2 divide-y divide-birth-gray-2 lg:divide-y-0 lg:space-y-4">
        <div className="lg:border lg:border-birth-gray-2 lg:rounded">
          <SvgAnalisisSection
            mesa={mesa} setMesa={setMesa}
            separacion={separacion} setSeparacion={setSeparacion}
            onAplicarSugerencias={handleAplicarSugerencias}
          />
        </div>

        <div className="lg:border lg:border-birth-gray-2 lg:rounded">
          <GrupoCostosSection
            titulo="Planchas — Acrílico (1220×2440)" items={GRUPO_ACRILICO}
            itemsState={itemsState} precios={precios}
            onToggle={setItemActivo} onCantidad={setItemCantidad}
            onPrecioChange={setPrecioValor} onPrecioBlur={handlePrecioBlur}
          />
          <GrupoCostosSection
            titulo="Planchas — Trovicel / PVC espumado" items={GRUPO_TROVICEL}
            itemsState={itemsState} precios={precios}
            onToggle={setItemActivo} onCantidad={setItemCantidad}
            onPrecioChange={setPrecioValor} onPrecioBlur={handlePrecioBlur}
          />
        </div>

        <div className="lg:border lg:border-birth-gray-2 lg:rounded">
          <FachadaCosteoSection
            rows={fachadaRows} precios={precios}
            onChangeRow={(id, row) => setFachadaRows(r => ({ ...r, [id]: row }))}
            onPrecioChange={setPrecioValor} onPrecioBlur={handlePrecioBlur}
          />
        </div>

        <div className="lg:border lg:border-birth-gray-2 lg:rounded">
          <GrupoCostosSection
            titulo="Insumos" items={GRUPO_INSUMOS}
            itemsState={itemsState} precios={precios}
            onToggle={setItemActivo} onCantidad={setItemCantidad}
            onPrecioChange={setPrecioValor} onPrecioBlur={handlePrecioBlur}
          />
        </div>

        <div className="lg:border lg:border-birth-gray-2 lg:rounded">
          <ProduccionLogisticaSection
            horasCnc={horasCnc} setHorasCnc={setHorasCnc}
            desgastePct={desgastePct} setDesgastePct={setDesgastePct}
            precios={precios} onPrecioChange={setPrecioValor} onPrecioBlur={handlePrecioBlur}
            itemsState={itemsState} onToggle={setItemActivo} onCantidad={setItemCantidad}
            logisticaLibre={logisticaLibre} setLogisticaLibre={setLogisticaLibre}
          />
        </div>
      </div>

      <div className="mt-4 lg:mt-0">
        <ResumenSticky
          resultado={resultado}
          margen={margen} setMargen={setMargen}
          m2Proyecto={m2Proyecto} setM2Proyecto={setM2Proyecto}
          precioCalleM2={precioCalleM2} setPrecioCalleM2={setPrecioCalleM2}
          onPrecioCalleBlur={handlePrecioCalleBlur}
          onAgregar={handleAgregar}
        />
      </div>
    </div>
  )
}

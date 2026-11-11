import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, RotateCcw } from 'lucide-react'
import {
  CATEGORIAS_COSTEO_LETRAS,
  MESA_DEFAULT,
  SEPARACION_DEFAULT_MM,
} from '../../data/costeoLetras'
import { getCosteoLetrasPrecios, saveCosteoLetrasPrecios } from '../../utils/storage'
import { clp } from '../../utils/formatters'
import TamanoLetrasSection from './TamanoLetrasSection'

const ITEMS = CATEGORIAS_COSTEO_LETRAS.flatMap((categoria) => categoria.items)
const PRECIOS_DEFAULT = Object.fromEntries(ITEMS.map((item) => [item.id, item.precio]))

function subtotalItem(item, estado, precios) {
  if (!estado?.activo) return 0
  const cantidad = parseFloat(estado.cantidad) || 0
  const precio = parseFloat(precios[item.id] ?? item.precio) || 0
  return Math.round(cantidad * precio)
}

function FilaCosto({ item, estado, precio, onToggle, onCantidad, onPrecio, onGuardar }) {
  const subtotal = subtotalItem(item, estado, { [item.id]: precio })

  return (
    <div className={`grid gap-2 border-b border-white/50 px-3 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_82px_118px_105px] sm:items-center ${estado?.activo ? 'bg-white/35' : ''}`}>
      <label className="flex min-w-0 cursor-pointer items-start gap-2.5">
        <input
          type="checkbox"
          checked={Boolean(estado?.activo)}
          onChange={(event) => onToggle(event.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
        />
        <span className="min-w-0">
          <span className="block text-sm font-medium leading-tight text-on-surface">{item.nombre}</span>
          <span className="mt-0.5 block text-[11px] text-on-surface-variant">
            {item.unidad}{item.nota ? ` · ${item.nota}` : ''}
          </span>
        </span>
      </label>

      <label className="flex items-center gap-1 sm:block">
        <span className="w-20 text-[10px] uppercase text-on-surface-variant sm:hidden">Cantidad</span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={estado?.cantidad ?? ''}
          onChange={(event) => onCantidad(event.target.value)}
          disabled={!estado?.activo}
          placeholder="0"
          aria-label={`Cantidad de ${item.nombre}`}
          className="h-9 w-full rounded-lg border border-white/70 bg-white/70 px-2 text-center text-sm tabular-nums focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-45"
        />
      </label>

      <label className="flex items-center gap-1 rounded-lg border border-white/70 bg-white/70 px-2">
        <span className="text-xs text-on-surface-variant">$</span>
        <input
          type="number"
          min="0"
          step="1"
          value={precio ?? ''}
          onChange={(event) => onPrecio(event.target.value)}
          onBlur={onGuardar}
          aria-label={`Precio de ${item.nombre}`}
          className="h-9 min-w-0 flex-1 bg-transparent text-right text-sm tabular-nums focus:outline-none"
        />
      </label>

      <div className="flex items-center justify-between sm:block sm:text-right">
        <span className="text-[10px] uppercase text-on-surface-variant sm:hidden">Subtotal</span>
        <span className={`font-barlow text-base font-bold tabular-nums ${subtotal > 0 ? 'text-on-surface' : 'text-on-surface-variant/50'}`}>
          {subtotal > 0 ? clp(subtotal) : '—'}
        </span>
      </div>
    </div>
  )
}

function CategoriaCostos({ categoria, estados, precios, onToggle, onCantidad, onPrecio, onGuardar }) {
  const subtotal = categoria.items.reduce(
    (suma, item) => suma + subtotalItem(item, estados[item.id], precios),
    0,
  )

  return (
    <section className="overflow-hidden rounded-widget border border-white/50 bg-white/35">
      <div className="flex items-center justify-between gap-3 border-b border-white/50 bg-white/45 px-4 py-3">
        <div>
          <h2 className="font-barlow text-base font-bold uppercase tracking-wide text-on-surface">{categoria.nombre}</h2>
          <p className="text-[11px] text-on-surface-variant">Selecciona lo que utilizarás y ajusta cantidad o precio.</p>
        </div>
        <span className="shrink-0 font-barlow text-lg font-bold tabular-nums text-on-surface">{clp(subtotal)}</span>
      </div>
      <div>
        {categoria.items.map((item) => (
          <FilaCosto
            key={item.id}
            item={item}
            estado={estados[item.id]}
            precio={precios[item.id] ?? item.precio}
            onToggle={(activo) => onToggle(item, activo)}
            onCantidad={(cantidad) => onCantidad(item.id, cantidad)}
            onPrecio={(precio) => onPrecio(item.id, precio)}
            onGuardar={onGuardar}
          />
        ))}
      </div>
    </section>
  )
}

export default function CosteoLetrasPanel() {
  const [precios, setPrecios] = useState(PRECIOS_DEFAULT)
  const [estados, setEstados] = useState({})
  const [m2Proyecto, setM2Proyecto] = useState('')
  const [mesa, setMesa] = useState(MESA_DEFAULT)
  const [separacion, setSeparacion] = useState(SEPARACION_DEFAULT_MM)
  const [estadoGuardado, setEstadoGuardado] = useState('')

  useEffect(() => {
    getCosteoLetrasPrecios()
      .then((guardados) => setPrecios({ ...PRECIOS_DEFAULT, ...guardados }))
      .catch(() => setPrecios(PRECIOS_DEFAULT))
  }, [])

  const guardarPrecios = useCallback(() => {
    setEstadoGuardado('guardando')
    saveCosteoLetrasPrecios(precios)
      .then(() => {
        setEstadoGuardado('guardado')
        window.setTimeout(() => setEstadoGuardado(''), 1800)
      })
      .catch(() => setEstadoGuardado('error'))
  }, [precios])

  const setItemActivo = (item, activo) => {
    setEstados((actuales) => ({
      ...actuales,
      [item.id]: {
        ...actuales[item.id],
        activo,
        cantidad: actuales[item.id]?.cantidad || String(item.cantidadSugerida || 1),
      },
    }))
  }

  const setItemCantidad = (id, cantidad) => {
    setEstados((actuales) => ({ ...actuales, [id]: { ...actuales[id], cantidad } }))
  }

  const setPrecio = (id, precio) => setPrecios((actuales) => ({ ...actuales, [id]: precio }))

  const subtotales = useMemo(
    () => CATEGORIAS_COSTEO_LETRAS.map((categoria) => ({
      id: categoria.id,
      nombre: categoria.nombre,
      total: categoria.items.reduce(
        (suma, item) => suma + subtotalItem(item, estados[item.id], precios),
        0,
      ),
    })),
    [estados, precios],
  )

  const totalCosto = subtotales.reduce((suma, categoria) => suma + categoria.total, 0)
  const m2 = parseFloat(m2Proyecto) || 0
  const costoM2 = m2 > 0 ? Math.round(totalCosto / m2) : 0

  const limpiarProyecto = () => {
    setEstados({})
    setM2Proyecto('')
  }

  const aplicarMedidas = ({ areaM2 }) => {
    if (areaM2 > 0) setM2Proyecto(String(Math.round(areaM2 * 1000) / 1000))
  }

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
      <div className="min-w-0 space-y-4">
        <section className="overflow-hidden rounded-widget border border-white/50 bg-white/35">
          <TamanoLetrasSection
            mesa={mesa}
            setMesa={setMesa}
            separacion={separacion}
            setSeparacion={setSeparacion}
            onAplicarSugerencias={aplicarMedidas}
            setM2Proyecto={setM2Proyecto}
          />
        </section>

        {CATEGORIAS_COSTEO_LETRAS.map((categoria) => (
          <CategoriaCostos
            key={categoria.id}
            categoria={categoria}
            estados={estados}
            precios={precios}
            onToggle={setItemActivo}
            onCantidad={setItemCantidad}
            onPrecio={setPrecio}
            onGuardar={guardarPrecios}
          />
        ))}
      </div>

      <aside className="glass-panel rounded-widget p-5 xl:sticky xl:top-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-on-surface-variant">Resumen del proyecto</p>
            <h2 className="mt-1 font-barlow text-xl font-bold text-on-surface">COSTO REAL</h2>
          </div>
          <button
            type="button"
            onClick={limpiarProyecto}
            title="Limpiar cantidades seleccionadas"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/60 text-on-surface-variant transition-colors hover:text-primary"
          >
            <RotateCcw size={15} />
          </button>
        </div>

        <div className="mt-4 space-y-2 border-y border-white/50 py-4">
          {subtotales.map((categoria) => (
            <div key={categoria.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-on-surface-variant">{categoria.nombre}</span>
              <span className="font-medium tabular-nums text-on-surface">{clp(categoria.total)}</span>
            </div>
          ))}
        </div>

        <div className="py-4">
          <div className="flex items-end justify-between gap-3">
            <span className="text-sm font-medium text-on-surface">Total a costo</span>
            <span className="font-barlow text-3xl font-bold tabular-nums text-on-surface">{clp(totalCosto)}</span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-on-surface-variant">
            No se aplica margen ni IVA adicional. Los materiales marcados “+ IVA” ya usan su costo final.
          </p>
        </div>

        <div className="rounded-xl border border-white/60 bg-white/45 p-3">
          <label className="block text-[10px] uppercase tracking-wider text-on-surface-variant">Área del proyecto</label>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="number"
              min="0"
              step="0.001"
              value={m2Proyecto}
              onChange={(event) => setM2Proyecto(event.target.value)}
              placeholder="0"
              className="h-10 min-w-0 flex-1 rounded-lg border border-white/70 bg-white px-3 text-right text-sm tabular-nums focus:border-primary focus:outline-none"
            />
            <span className="text-sm text-on-surface-variant">m²</span>
          </div>
          <div className="mt-2 flex justify-between text-xs">
            <span className="text-on-surface-variant">Costo por m²</span>
            <span className="font-semibold tabular-nums text-on-surface">{costoM2 > 0 ? clp(costoM2) : '—'}</span>
          </div>
        </div>

        <div className="mt-3 flex min-h-5 items-center gap-1.5 text-[11px] text-on-surface-variant">
          {estadoGuardado === 'guardando' && 'Guardando precios…'}
          {estadoGuardado === 'guardado' && <><Check size={13} className="text-green-600" /> Precios guardados</>}
          {estadoGuardado === 'error' && <span className="text-primary">No se pudieron guardar los precios.</span>}
          {!estadoGuardado && 'Los precios se guardan al salir de cada campo.'}
        </div>
      </aside>
    </div>
  )
}

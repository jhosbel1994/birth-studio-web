import { clp } from '../../utils/formatters'

// Fila reutilizable: toggle + cantidad (si aplica) + precio editable + subtotal.
// Ítems con unidad 'fijo' no muestran cantidad (siempre cuentan como 1).
function FilaCosteoItem({ item, activo, cantidad, precio, onToggle, onCantidad, onPrecioChange, onPrecioBlur }) {
  const esFijo = item.unidad === 'fijo'
  const cantidadNum = esFijo ? 1 : (parseFloat(cantidad) || 0)
  const subtotal = activo ? Math.round(cantidadNum * (parseFloat(precio) || 0)) : 0

  return (
    <div className={`flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-birth-gray-2 transition-opacity ${activo ? '' : 'opacity-50'}`}>
      <label className="flex items-center gap-2.5 flex-1 min-w-[10rem] cursor-pointer">
        <input type="checkbox" checked={activo} onChange={e => onToggle(e.target.checked)} className="accent-birth-black shrink-0" />
        <span className="text-sm font-dm font-medium text-birth-black">{item.nombre}</span>
      </label>

      {!esFijo && (
        <input
          type="number" min="0" step="1" value={cantidad ?? ''} disabled={!activo}
          onChange={e => onCantidad(e.target.value)}
          placeholder="0"
          className="w-16 text-center border border-birth-gray-2 rounded px-1 py-1.5 text-sm font-dm focus:outline-none focus:border-birth-black disabled:bg-birth-gray"
        />
      )}

      <div className="flex items-center gap-1 shrink-0">
        <span className="text-birth-gray-3 text-xs">$</span>
        <input
          type="number" min="0" value={precio ?? ''} disabled={!activo}
          onChange={e => onPrecioChange(e.target.value)}
          onBlur={onPrecioBlur}
          className="w-20 text-right border border-birth-gray-2 rounded px-1.5 py-1.5 text-sm font-dm focus:outline-none focus:border-birth-black disabled:bg-birth-gray"
        />
      </div>

      <span className="text-sm font-barlow font-bold w-20 text-right shrink-0">{subtotal > 0 ? clp(subtotal) : '—'}</span>
    </div>
  )
}

export default function GrupoCostosSection({ titulo, items, itemsState, precios, onToggle, onCantidad, onPrecioChange, onPrecioBlur }) {
  return (
    <div>
      <div className="px-4 py-2 bg-birth-gray border-y border-birth-gray-2">
        <p className="text-[10px] font-dm font-bold uppercase tracking-wider text-birth-gray-4">{titulo}</p>
      </div>
      {items.map(item => (
        <FilaCosteoItem
          key={item.id}
          item={item}
          activo={itemsState[item.id]?.activo || false}
          cantidad={itemsState[item.id]?.cantidad}
          precio={precios[item.id] ?? item.precio}
          onToggle={v => onToggle(item.id, v)}
          onCantidad={v => onCantidad(item.id, v)}
          onPrecioChange={v => onPrecioChange(item.id, v)}
          onPrecioBlur={onPrecioBlur}
        />
      ))}
    </div>
  )
}

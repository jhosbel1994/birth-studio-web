import { Trash2 } from 'lucide-react'

// Panel lateral del tab "Zonas": crear/nombrar/tipear/eliminar zonas. El
// dibujo y arrastre de los 4 puntos vive en SceneCanvas (ahi esta el
// contexto de coordenadas imagen<->pantalla); este panel solo dispara
// acciones sobre el estado.
export default function ZoneEditor({ zonas, zonaActivaId, onSelectZona, onAddZona, onSetNombre, onRemoveZona }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onAddZona('vidrio')}
          className="rounded-full border border-white/60 bg-white/50 px-3 py-2 text-xs font-dm font-medium text-secondary hover:bg-white/80 transition-colors"
        >
          + Ventanal/Vidrio
        </button>
        <button
          onClick={() => onAddZona('pared')}
          className="rounded-full border border-white/60 bg-white/50 px-3 py-2 text-xs font-dm font-medium text-primary hover:bg-white/80 transition-colors"
        >
          + Zona pared
        </button>
      </div>

      {zonas.length === 0 && (
        <p className="text-xs font-dm text-on-surface-variant/60">
          Sin zonas todavía. Agrega una y arrastra sus 4 esquinas sobre la foto para calzarla con la puerta o el ventanal.
        </p>
      )}

      <div className="space-y-2">
        {zonas.map(z => (
          <div
            key={z.id}
            onClick={() => onSelectZona(z.id)}
            className={`rounded-xl p-2.5 cursor-pointer transition-colors ${
              zonaActivaId === z.id ? 'bg-secondary-container/60' : 'hover:bg-white/50 bg-white/30'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-dm font-semibold uppercase px-2 py-0.5 rounded-full ${
                z.tipo === 'vidrio' ? 'bg-secondary/15 text-secondary' : 'bg-primary/15 text-primary'
              }`}>
                {z.tipo === 'vidrio' ? 'Vidrio' : 'Pared'}
              </span>
              <input
                value={z.nombre}
                onClick={e => e.stopPropagation()}
                onChange={e => onSetNombre(z.id, e.target.value)}
                className="flex-1 min-w-0 bg-transparent text-xs font-dm font-medium text-on-surface focus:outline-none"
              />
              <button
                onClick={e => { e.stopPropagation(); onRemoveZona(z.id) }}
                className="text-on-surface-variant/50 hover:text-primary shrink-0"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {zonaActivaId && (
        <p className="text-[11px] font-dm text-on-surface-variant/70">
          Arrastra las 4 esquinas azules/rojas sobre la foto para calzar la zona con el borde real del vidrio o muro.
        </p>
      )}
    </div>
  )
}

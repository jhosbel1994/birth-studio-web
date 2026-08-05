// ─── MATERIALES — base de datos inicial (seed) ────────────────────────────
// Se inserta una sola vez en Firestore (colección `materiales`) si la
// colección está vacía — ver utils/storage.js `seedMaterialesSiVacio`.
// `precio: null` significa "sin precio fijo" — se ingresa manualmente en
// cada cotización (ej. traslados fuera de Talca, desgaste de herramientas).
export const MATERIALES_SEED = [
  { nombre: 'Cloroformo', unidad: 'unidad', precio: 30000 },
  { nombre: 'Akfix (adhesivo estructural)', unidad: 'unidad', precio: 10000 },
  { nombre: 'Tornillos', unidad: 'caja de 1000 unidades', precio: 8000 },
  { nombre: 'Acrílico 3mm de color', unidad: 'plancha', precio: 89000 },
  { nombre: 'Acrílico 5mm de color', unidad: 'plancha', precio: 112000 },
  { nombre: 'Acrílico 3mm transparente/blanco/negro', unidad: 'plancha', precio: 65000 },
  { nombre: 'Acrílico 5mm transparente/blanco/negro', unidad: 'plancha', precio: 89000 },
  { nombre: 'Tiempo de corte láser', unidad: 'por corte/servicio', precio: 25000 },
  { nombre: 'Traslado en gasolina', unidad: 'servicio', precio: 60000 },
  { nombre: 'Traslado dentro de Talca', unidad: 'servicio', precio: 35000 },
  { nombre: 'Traslado fuera de Talca', unidad: 'servicio', precio: null, nota: 'A convenir — ingresar manualmente' },
  { nombre: 'Jeringas', unidad: 'unidad', precio: 5000 },
  { nombre: 'Desgaste de herramientas de doblado de acrílico', unidad: 'servicio', precio: null, nota: 'Definir por proyecto' },
  { nombre: 'Aluminio compuesto', unidad: 'plancha 120×240cm', precio: 89000 },
  { nombre: 'Galón de pintura Acrizinc', unidad: 'galón', precio: 135000 },
  { nombre: 'Pistola de pintura', unidad: 'unidad', precio: 60000 },
  { nombre: 'Rodillo', unidad: 'unidad', precio: 12000 },
  { nombre: 'Calugas LED', unidad: 'aprox. 200 unidades', precio: 40000 },
  { nombre: 'Cable paralelo', unidad: 'cada 100 metros', precio: 38000 },
  { nombre: 'Perfil de aluminio', unidad: 'unidad', precio: 18000 },
  { nombre: 'Ángulo de aluminio', unidad: 'unidad', precio: 8000 },
  { nombre: 'Perfil 1.5mm', unidad: 'unidad', precio: 5000 },
  { nombre: 'Perfil 2mm', unidad: 'unidad', precio: 8000 },
  { nombre: 'Perfil 50mm', unidad: 'unidad', precio: 22000 },
  { nombre: 'Perfil 75mm', unidad: 'unidad', precio: 47000 },
  { nombre: 'Electrodo', unidad: 'kilo', precio: 5000 },
  { nombre: 'Mano de obra empleado', unidad: 'día', precio: 35000 },
  { nombre: 'Huincha aislante', unidad: 'unidad', precio: 3000 },
  { nombre: 'Estaño', unidad: 'unidad', precio: 3500, nota: 'Dura mucho, bajo consumo' },
  { nombre: 'Fuente de alimentación interna 400W', unidad: 'unidad', precio: 25000 },
  { nombre: 'Fuente de alimentación externa 250W', unidad: 'unidad', precio: 60000 },
  { nombre: 'Ángulos de hierro pequeños', unidad: 'unidad', precio: 450 },
  { nombre: 'Adhesivo transparente', unidad: 'm²', precio: 8000 },
  { nombre: 'Adhesivo vinil blanco', unidad: 'm²', precio: 6000 },
  { nombre: 'Cinta adhesiva LED 5m zigzag blanco frío', unidad: 'unidad', precio: 22000 },
]

// Accesos rápidos del multiplicador de venta (botones) + valor de referencia
// usado en otras cotizaciones Birth Studio cuando no hay un default guardado.
// ×1 = "Costo": vende exactamente al costo directo, sin margen (útil para
// ver cuánto cuesta el proyecto antes de decidir el margen real).
export const MULTIPLICADORES_MATERIALES = [
  { valor: 1, label: 'Costo' },
  { valor: 2.0, label: '×2.0' },
  { valor: 2.1, label: '×2.1' },
  { valor: 2.3, label: '×2.3' },
]
export const MULTIPLICADOR_MATERIALES_DEFAULT = 2.5

// Sugerencias para el datalist de unidades al crear/editar un material.
export const UNIDADES_MATERIAL = [
  'unidad', 'm²', 'ml', 'plancha', 'caja', 'kilo', 'galón', 'día', 'hora', 'servicio', 'set',
]

// ─── COSTEO DE LETRAS CORPÓREAS — tablas de precios y constantes ─────────────
// Fuente: MODULO_LETRAS_CORPOREAS.md sección 3.3. Todos los precios son
// defaults iniciales; se pueden editar inline y persisten en Firestore
// (settings/costeoLetras) vía utils/storage.js.

export const MESA_DEFAULT = { ancho: 1220, alto: 2440 } // mm
export const SEPARACION_DEFAULT_MM = 10
export const ALTURAS_CANTO_CM = [5, 6, 7, 7.5, 8]
export const ALTO_CANTO_DEFAULT_CM = 7

export const MARGENES_LETRAS = [1.5, 2, 2.5, 3]
export const MARGEN_DEFAULT = 2

export const PRECIO_CALLE_M2_DEFAULT = 390000

// unidad: 'plancha' | 'unidad' | 'caja' | 'm2' | 'tira' | 'fijo'
export const GRUPO_ACRILICO = [
  { id: 'acr_bnt_2mm', nombre: 'Acrílico Blanco/Negro/Transparente 2mm', precio: 55000, unidad: 'plancha' },
  { id: 'acr_bnt_3mm', nombre: 'Acrílico Blanco/Negro/Transparente 3mm', precio: 70000, unidad: 'plancha' },
  { id: 'acr_bnt_5mm', nombre: 'Acrílico Blanco/Negro/Transparente 5mm', precio: 85000, unidad: 'plancha' },
  { id: 'acr_color_2mm', nombre: 'Acrílico Color 2mm', precio: 85000, unidad: 'plancha' },
  { id: 'acr_color_3mm', nombre: 'Acrílico Color 3mm', precio: 85000, unidad: 'plancha' },
  { id: 'acr_color_5mm', nombre: 'Acrílico Color 5mm', precio: 110000, unidad: 'plancha' },
]

export const GRUPO_TROVICEL = [
  { id: 'trov_5mm', nombre: 'Trovicel / PVC espumado 5mm', precio: 15000, unidad: 'plancha' },
  { id: 'trov_10mm', nombre: 'Trovicel / PVC espumado 10mm', precio: 30000, unidad: 'plancha' },
  { id: 'trov_20mm', nombre: 'Trovicel / PVC espumado 20mm', precio: 45000, unidad: 'plancha' },
]

// Fachada se maneja aparte (cantidad + precio + medida de plancha editable),
// ver FachadaCosteoSection.jsx — acá solo viven los defaults.
export const GRUPO_FACHADA = [
  { id: 'fachada_acm4', nombre: 'Aluminio compuesto 4mm', precio: 85000, medida: { ancho: 1220, alto: 2440 } },
  { id: 'fachada_metaldising', nombre: 'Metaldising', precio: 0, medida: { ancho: 1000, alto: 3000 } },
  { id: 'fachada_lamina_acanalada', nombre: 'Lámina acanalada', precio: 0, medida: { ancho: 895, alto: 3000 } },
]

export const GRUPO_INSUMOS = [
  { id: 'calugas_led', nombre: 'Calugas LED (caja de módulos)', precio: 40000, unidad: 'caja' },
  { id: 'cloroformo', nombre: 'Cloroformo (pegado de acrílico)', precio: 30000, unidad: 'unidad' },
  { id: 'pegamento_akfix', nombre: 'Pegamento mágico Akfix', precio: 8000, unidad: 'unidad' },
  { id: 'adhesivo_transp', nombre: 'Adhesivo transparente', precio: 8000, unidad: 'm2' },
  { id: 'adhesivo_blanco', nombre: 'Adhesivo blanco', precio: 6000, unidad: 'm2' },
  { id: 'perfil_20x20', nombre: 'Perfil 20×20', precio: 10000, unidad: 'tira' },
  { id: 'perfil_10x10', nombre: 'Perfil 10×10', precio: 7000, unidad: 'tira' },
]

export const PRODUCCION_DEFAULT = {
  precioCncHora: 20000,
  precioLuzHora: 2000,
  desgastePct: 5,
}

// Logística de monto fijo (toggle simple, sin cantidad)
export const GRUPO_LOGISTICA_FIJA = [
  { id: 'log_traslado_talca', nombre: 'Traslado dentro de Talca', precio: 30000, unidad: 'fijo' },
  { id: 'log_traslado_fabrica', nombre: 'Traslado de compra desde fábrica', precio: 60000, unidad: 'fijo' },
  { id: 'log_gasolina', nombre: 'Gasolina del proyecto', precio: 40000, unidad: 'fijo' },
]

// Logística por día (cantidad de días × tarifa/día editable)
export const LOGISTICA_POR_DIA_DEFAULT = {
  precioAndamioDia: 30000,
  precioEmpleadoDia: 30000,
}

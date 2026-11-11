// ─── COSTEO DE LETRAS CORPÓREAS — tablas de precios y constantes ─────────────
// Fuente: MODULO_LETRAS_CORPOREAS.md sección 3.3. Todos los precios son
// defaults iniciales; se pueden editar inline y persisten en Firestore
// (settings/costeoLetras) vía utils/storage.js.

export const MESA_DEFAULT = { ancho: 1220, alto: 2440 } // mm
export const SEPARACION_DEFAULT_MM = 10
export const ALTURAS_CANTO_CM = [5, 6, 7, 7.5, 8]
export const ALTO_CANTO_DEFAULT_CM = 7

export const MARGENES_LETRAS = [1.5, 2, 2.5, 3]

// Costos reales de Birth Studio. Los valores que el proveedor entrega + IVA
// ya están convertidos a costo final; el módulo no vuelve a sumar IVA.
// Cada precio es editable y el override se guarda en settings/costeoLetras.
export const CATEGORIAS_COSTEO_LETRAS = [
  {
    id: 'planchas',
    nombre: 'Planchas y láminas',
    items: [
      { id: 'acr_3mm', nombre: 'Acrílico 3mm', precio: 66640, unidad: 'plancha', nota: '$56.000 + IVA' },
      { id: 'acr_negro_2mm', nombre: 'Acrílico negro 2mm', precio: 72590, unidad: 'plancha', nota: '$61.000 + IVA' },
      { id: 'acr_rojo', nombre: 'Acrílico rojo', precio: 89000, unidad: 'plancha', nota: 'IVA incluido' },
      { id: 'trov_5mm_real', nombre: 'Trovicel 5mm', precio: 23800, unidad: 'plancha', nota: '$20.000 + IVA' },
      { id: 'trov_10mm_real', nombre: 'Trovicel 10mm', precio: 35000, unidad: 'plancha', nota: 'Bases, contra-fondos y soportes' },
      { id: 'canto_acr_2mm', nombre: 'Canto acrílico 2mm · tiras 5cm × 2,4m', precio: 50000, unidad: 'plancha' },
      { id: 'acr_opal_2mm', nombre: 'Acrílico opal blanco 2mm', precio: 50000, unidad: 'plancha' },
      { id: 'acr_opal_3mm', nombre: 'Acrílico opal blanco 3mm', precio: 89000, unidad: 'plancha', nota: 'Frontal / difusor' },
      { id: 'acr_opal_5mm', nombre: 'Acrílico opal blanco 5mm', precio: 112000, unidad: 'plancha' },
      { id: 'acr_color_3mm_real', nombre: 'Acrílico de color 3mm', precio: 89000, unidad: 'plancha' },
      { id: 'acr_transp_3mm', nombre: 'Acrílico transparente 3mm', precio: 55000, unidad: 'plancha' },
      { id: 'acr_transp_5mm', nombre: 'Acrílico transparente 5mm', precio: 100000, unidad: 'plancha' },
      { id: 'aluminio_compuesto_4mm', nombre: 'Aluminio compuesto 4mm', precio: 90000, unidad: 'plancha' },
      { id: 'caja_aluminio', nombre: 'Caja de aluminio', precio: 35000, unidad: 'unidad' },
    ],
  },
  {
    id: 'iluminacion',
    nombre: 'Iluminación y electricidad',
    items: [
      { id: 'cinta_led_2835', nombre: 'Cinta LED SMD 2835 · 12V · 120 LED/m · 10000K', precio: 17451, unidad: 'rollo' },
      { id: 'calugas_led_real', nombre: 'Calugas LED', precio: 28000, unidad: 'paquete de 200', cantidadSugerida: 2 },
      { id: 'fuente_led', nombre: 'Fuente de alimentación LED', precio: 30000, unidad: 'unidad', cantidadSugerida: 2 },
      { id: 'cable_electrico_rollo', nombre: 'Cable eléctrico', precio: 38000, unidad: 'rollo de 100m', nota: '$380 por metro' },
      { id: 'enchufe', nombre: 'Enchufe', precio: 2500, unidad: 'unidad', cantidadSugerida: 2 },
      { id: 'timer', nombre: 'Timer', precio: 20000, unidad: 'unidad' },
      { id: 'canaleta', nombre: 'Canaleta', precio: 1000, unidad: 'unidad', nota: 'Pack de 10: $10.000' },
      { id: 'tubo_naranja', nombre: 'Tubo naranja para cable', precio: 3000, unidad: 'unidad' },
      { id: 'termofit', nombre: 'Termofit', precio: 3000, unidad: 'unidad' },
      { id: 'estano', nombre: 'Estaño', precio: 5000, unidad: 'unidad' },
    ],
  },
  {
    id: 'insumos',
    nombre: 'Insumos, químicos y fijación',
    items: [
      { id: 'akfix', nombre: 'Akfix · pegamento / sellador', precio: 10000, unidad: 'unidad', cantidadSugerida: 2 },
      { id: 'silicona', nombre: 'Silicona', precio: 10000, unidad: 'unidad' },
      { id: 'cloroformo_real', nombre: 'Cloroformo para acrílico', precio: 30000, unidad: 'unidad' },
      { id: 'barniz', nombre: 'Barniz', precio: 25000, unidad: 'unidad' },
      { id: 'jeringa', nombre: 'Jeringa', precio: 5000, unidad: 'unidad' },
      { id: 'tornillos', nombre: 'Tornillos', precio: 5000, unidad: 'set' },
      { id: 'perfil', nombre: 'Perfil', precio: 5000, unidad: 'unidad', cantidadSugerida: 3 },
      { id: 'pintura_anticorrosiva', nombre: 'Pintura anticorrosiva', precio: 3500, unidad: 'lata' },
    ],
  },
  {
    id: 'servicios',
    nombre: 'Cortes y servicios',
    items: [
      { id: 'corte_cnc_laser', nombre: 'Corte CNC láser', precio: 70000, unidad: 'servicio' },
      { id: 'corte_router', nombre: 'Corte router', precio: 30000, unidad: 'servicio' },
      { id: 'flete_perfiles', nombre: 'Flete de perfiles', precio: 15000, unidad: 'servicio' },
      { id: 'flete_letras', nombre: 'Flete de letras', precio: 40000, unidad: 'servicio' },
      { id: 'flete_traslado', nombre: 'Flete de traslado', precio: 40000, unidad: 'servicio' },
      { id: 'gasolina', nombre: 'Gasolina · traslados', precio: 40000, unidad: 'servicio' },
      { id: 'andamio', nombre: 'Andamio', precio: 30000, unidad: 'servicio' },
    ],
  },
  {
    id: 'mano_obra',
    nombre: 'Mano de obra',
    items: [
      { id: 'mo_fabricacion', nombre: 'Fabricación · Jhosbel', precio: 0, unidad: 'día' },
      { id: 'mo_instalacion', nombre: 'Instalación · Jhosbel', precio: 0, unidad: 'día' },
      { id: 'mo_ayudante', nombre: 'Ayudante de instalación', precio: 0, unidad: 'día' },
    ],
  },
]

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

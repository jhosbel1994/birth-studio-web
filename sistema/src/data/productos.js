// ─── MULTIPLICADORES DE INSTALACIÓN ───────────────────────────────────────────
export const MULTIPLICADORES = [
  { id: 'sin_instalacion', label: 'Sin instalación', valor: 2 },
  { id: 'con_instalacion', label: 'Con instalación sin andamio', valor: 3 },
  { id: 'con_andamio', label: 'Con instalación con andamio', valor: 4 },
]

// ─── CATEGORÍAS ───────────────────────────────────────────────────────────────
export const CATEGORIAS = [
  { id: 'acrilico', label: 'Acrílico / Letras Corpóreas' },
  { id: 'adhesivo', label: 'Adhesivo' },
  { id: 'bandera_vela', label: 'Bandera Vela' },
  { id: 'bastidor', label: 'Bastidores' },
  { id: 'web', label: 'Desarrollo Web' },
  { id: 'empavonado', label: 'Empavonado' },
  { id: 'iluminacion', label: 'Iluminación LED' },
  { id: 'iman', label: 'Imán' },
  { id: 'insumos', label: 'Insumos' },
  { id: 'logistica', label: 'Instalación y Logística' },
  { id: 'manual', label: 'Ítem manual (precio libre)' },
  { id: 'microperforado', label: 'Microperforado' },
  { id: 'miscelaneos', label: 'Misceláneos' },
  { id: 'pendon', label: 'Pendones Roller' },
  { id: 'pliegos', label: 'Pliegos Troquelados' },
  { id: 'plotter', label: 'Plotter de Corte' },
  { id: 'reflectante', label: 'Reflectante' },
  { id: 'sintra', label: 'Sintra / PVC Rígido' },
  { id: 'tarjetas', label: 'Tarjetas de Presentación' },
  { id: 'tela', label: 'Tela' },
  { id: 'volantes', label: 'Volantes' },
]

// unidad: 'm2' | 'ml' | 'unidad' | 'plancha' | 'hora' | 'lookup' | 'libre'
// aplicaMultiplicador: true = precio proveedor × mult; false = precio fijo de Birth

export const PRODUCTOS = {
  tela: [
    { id: 'tela_blackout', nombre: 'Tela Blackout', precio: 5000, unidad: 'm2', aplicaMultiplicador: true },
    { id: 'tela_pvc_exc', nombre: 'Tela PVC con excedente', precio: 5000, unidad: 'm2', aplicaMultiplicador: true },
    { id: 'tela_pvc_sellada', nombre: 'Tela PVC sellada', precio: 5000, unidad: 'm2', aplicaMultiplicador: true },
    { id: 'backlit', nombre: 'Backlit', precio: 9500, unidad: 'm2', aplicaMultiplicador: true },
    { id: 'tela_bandera', nombre: 'Tela de bandera', precio: 10500, unidad: 'm2', aplicaMultiplicador: true },
  ],
  adhesivo: [
    { id: 'adhesivo', nombre: 'Adhesivo', precio: 5000, unidad: 'm2', aplicaMultiplicador: true },
    { id: 'adhesivo_blackout', nombre: 'Adhesivo Blackout', precio: 6000, unidad: 'm2', aplicaMultiplicador: true },
    { id: 'adhesivo_transp', nombre: 'Adhesivo Transparente', precio: 6000, unidad: 'm2', aplicaMultiplicador: true },
    { id: 'adhesivo_transp_si', nombre: 'Adhesivo Transparente sin imprimir', precio: 4500, unidad: 'm2', aplicaMultiplicador: true },
    { id: 'papel_sintetico', nombre: 'Papel Sintético', precio: 6000, unidad: 'm2', aplicaMultiplicador: true },
    { id: 'adhesivo_reflectante', nombre: 'Adhesivo Reflectante impreso', precio: 9500, unidad: 'm2', aplicaMultiplicador: true },
  ],
  empavonado: [
    { id: 'empavonado_impreso', nombre: 'Empavonado impreso', precio: 9500, unidad: 'm2', aplicaMultiplicador: true },
    { id: 'empavonado_127', nombre: 'Empavonado sin imprimir m lineal 1.27', precio: 6500, unidad: 'ml', aplicaMultiplicador: true },
    { id: 'empavonado_152', nombre: 'Empavonado sin imprimir m lineal 1.52', precio: 7500, unidad: 'ml', aplicaMultiplicador: true },
  ],
  microperforado: [
    { id: 'microperforado', nombre: 'Microperforado', precio: 9500, unidad: 'm2', aplicaMultiplicador: true },
  ],
  reflectante: [
    { id: 'reflectante_corte', nombre: 'Reflectante metro lineal para corte', precio: 4000, unidad: 'ml', aplicaMultiplicador: true },
    { id: 'reflectante_sin_corte', nombre: 'Reflectante metro lineal sin corte', precio: 8000, unidad: 'ml', aplicaMultiplicador: true },
  ],
  pliegos: [
    { id: 'pliego_14x05', nombre: 'Pliego troquelado 1.4×0.5m', precio: 9000, unidad: 'unidad', aplicaMultiplicador: true },
    { id: 'pliego_doble', nombre: 'Pliego troquelado doble cara', precio: 25000, unidad: 'unidad', aplicaMultiplicador: true },
  ],
  iman: [
    { id: 'iman_normal', nombre: 'Imán normal sin adhesivo', precio: 4500, unidad: 'unidad', aplicaMultiplicador: true },
    { id: 'iman_vehicular', nombre: 'Imán vehicular sin adhesivo', precio: 6500, unidad: 'unidad', aplicaMultiplicador: true },
    { id: 'iman_adhesivo_m2', nombre: 'Imán con adhesivo m²', precio: 20000, unidad: 'm2', aplicaMultiplicador: true },
    { id: 'iman_vehicular_adhesivo', nombre: 'Imán vehicular con adhesivo', precio: 35000, unidad: 'unidad', aplicaMultiplicador: true },
  ],
  sintra: [
    { id: 'sintra_3mm_recto', nombre: 'Sintra 3mm corte recto', precio: 16000, unidad: 'm2', aplicaMultiplicador: true },
    { id: 'sintra_3mm_forma', nombre: 'Sintra 3mm forma y base', precio: 20000, unidad: 'm2', aplicaMultiplicador: true },
    { id: 'sintra_5mm_recto', nombre: 'Sintra 5mm corte recto', precio: 20000, unidad: 'm2', aplicaMultiplicador: true },
    { id: 'sintra_5mm_forma', nombre: 'Sintra 5mm forma y base', precio: 25000, unidad: 'm2', aplicaMultiplicador: true },
    { id: 'fomex_5mm_recto', nombre: 'Fomex 5mm corte recto', precio: 20000, unidad: 'm2', aplicaMultiplicador: true },
    { id: 'fomex_5mm_forma', nombre: 'Fomex 5mm forma y base', precio: 25000, unidad: 'm2', aplicaMultiplicador: true },
    { id: 'pp_alveolar_recto', nombre: 'PP Alveolar corte recto', precio: 16000, unidad: 'm2', aplicaMultiplicador: true },
    { id: 'pp_alveolar_forma', nombre: 'PP Alveolar forma y base', precio: 20000, unidad: 'm2', aplicaMultiplicador: true },
    { id: 'fomex_5mm_plancha', nombre: 'Fomex 5mm plancha', precio: 16000, unidad: 'plancha', aplicaMultiplicador: true },
    { id: 'sintra_5mm_plancha', nombre: 'Sintra 5mm plancha', precio: 16000, unidad: 'plancha', aplicaMultiplicador: true },
    { id: 'sintra_3mm_plancha', nombre: 'Sintra 3mm plancha', precio: 12000, unidad: 'plancha', aplicaMultiplicador: true },
    { id: 'pp_plancha', nombre: 'PP Alveolar plancha', precio: 12000, unidad: 'plancha', aplicaMultiplicador: true },
  ],
  plotter: [
    { id: 'plotter', nombre: 'Plotter de corte', precio: 4000, unidad: 'ml', aplicaMultiplicador: true, nota: 'Sin material incluido' },
  ],
  acrilico: [
    // Por plancha (precio proveedor × multiplicador)
    { id: 'acrilico_blanco_3mm', nombre: 'Acrílico Blanco/Negro/Transparente 3mm (1220×2440)', precio: 75000, unidad: 'plancha', aplicaMultiplicador: true },
    { id: 'acrilico_blanco_5mm', nombre: 'Acrílico Blanco/Negro/Transparente 5mm (1220×2440)', precio: 125000, unidad: 'plancha', aplicaMultiplicador: true },
    { id: 'acrilico_color_3mm', nombre: 'Acrílico Color 3mm (1220×2440)', precio: 95000, unidad: 'plancha', aplicaMultiplicador: true },
    { id: 'trovicel_3mm', nombre: 'Trovicel / PVC espumado 3mm', precio: 10000, unidad: 'plancha', aplicaMultiplicador: true },
    { id: 'trovicel_5mm', nombre: 'Trovicel / PVC espumado 5mm', precio: 20000, unidad: 'plancha', aplicaMultiplicador: true },
    { id: 'trovicel_10mm', nombre: 'Trovicel / PVC espumado 10mm', precio: 35000, unidad: 'plancha', aplicaMultiplicador: true },
    // Corte circular ≤60×60cm — precio final al cliente (blanco, negro o transparente)
    { id: 'acrilico_circ_sin_luz', nombre: 'Circular ≤60cm sin iluminación (distanciadores incl.)', precio: 65000, unidad: 'unidad', aplicaMultiplicador: false, seccion: 'circular' },
    { id: 'acrilico_circ_retro_si', nombre: 'Circular ≤60cm retroiluminación neon flex — sin instalación', precio: 85000, unidad: 'unidad', aplicaMultiplicador: false, seccion: 'circular' },
    { id: 'acrilico_circ_retro_ci', nombre: 'Circular ≤60cm retroiluminación neon flex — con instalación', precio: 90000, unidad: 'unidad', aplicaMultiplicador: false, seccion: 'circular' },
  ],
  iluminacion: [
    { id: 'calugas_led', nombre: 'Calugas LED (100 unidades)', precio: 37000, unidad: 'set', aplicaMultiplicador: false },
    { id: 'neon_flex_5m', nombre: 'Tira Neon Flex 5m 12V', precio: 18000, unidad: 'unidad', aplicaMultiplicador: false },
    { id: 'neon_flex_10m', nombre: 'Tira Neon Flex 10m 220V', precio: 27000, unidad: 'unidad', aplicaMultiplicador: false },
    { id: 'cloroformo', nombre: 'Cloroformo (pegamento acrílico)', precio: 30000, unidad: 'unidad', aplicaMultiplicador: false },
  ],
  insumos: [
    { id: 'pegamento_akfix', nombre: 'Pegamento Akfix', precio: 10000, unidad: 'unidad', aplicaMultiplicador: false },
    { id: 'jeringas', nombre: 'Jeringas', precio: 10000, unidad: 'set', aplicaMultiplicador: false },
    { id: 'corte_acrilico_hora', nombre: 'Corte acrílico', precio: 15000, unidad: 'hora', aplicaMultiplicador: false },
  ],
  logistica: [
    { id: 'andamio_cuerpo', nombre: 'Andamio por cuerpo', precio: 5000, unidad: 'unidad', aplicaMultiplicador: false },
    { id: 'ayudante_dia', nombre: 'Ayudante por día (no instalación)', precio: 25000, unidad: 'dia', aplicaMultiplicador: false },
    { id: 'ayudante_instalacion', nombre: 'Ayudante para instalación', precio: 35000, unidad: 'dia', aplicaMultiplicador: false },
    { id: 'gasolina', nombre: 'Gasolina', precio: 0, unidad: 'libre', aplicaMultiplicador: false },
    { id: 'comida', nombre: 'Comida', precio: 0, unidad: 'libre', aplicaMultiplicador: false },
  ],
  web: [
    { id: 'sitio_corporativo', nombre: 'Sitio web corporativo base', precio: 420000, unidad: 'proyecto', aplicaMultiplicador: false },
    { id: 'dominio_anual', nombre: 'Registro de dominio anual', precio: 17500, unidad: 'año', aplicaMultiplicador: false },
  ],
  manual: [
    { id: 'manual', nombre: 'Ítem personalizado', precio: 0, unidad: 'libre', aplicaMultiplicador: false },
  ],
}

// ─── TARJETAS DE PRESENTACIÓN (lookup por cantidad y caras) ───────────────────
export const TARJETAS = {
  cantidades: [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000],
  preciosProveedor: {
    100: { '1cara': 8000, '2caras': 11000 },
    200: { '1cara': 13500, '2caras': 18300 },
    300: { '1cara': 18460, '2caras': 25385 },
    400: { '1cara': 22800, '2caras': 31430 },
    500: { '1cara': 26600, '2caras': 36600 },
    600: { '1cara': 30000, '2caras': 41250 },
    700: { '1cara': 32950, '2caras': 45300 },
    800: { '1cara': 35550, '2caras': 48300 },
    900: { '1cara': 37550, '2caras': 52105 },
    1000: { '1cara': 40000, '2caras': 55000 },
  },
  preciosBirth: {
    100: { '1cara': 18000, '2caras': 22000 },
  },
}

// ─── BANDERA VELA (precios proveedor) ─────────────────────────────────────────
export const BANDERAS_VELA = [
  { id: 'bandera_vela', nombre: 'Bandera vela 2.0×0.70m+', precio: 24000, aplicaMultiplicador: true },
  { id: 'mastil_aluminio', nombre: 'Mástil aluminio plegable + bolso', precio: 19000, aplicaMultiplicador: false },
  { id: 'estaca_base', nombre: 'Estaca o base con perforación', precio: 19000, aplicaMultiplicador: false },
]

// ─── VOLANTES (lookup por medida y cantidad) ──────────────────────────────────
export const VOLANTES = {
  medidas: ['10x14.5cm', '20x10cm', '14.5x20cm'],
  caras: ['1 cara', '2 caras'],
  precios: {
    '10x14.5cm': {
      '1 cara':  { 100: 7500, 500: 18500, 1000: 36000, 2000: 70000, 5000: 150000 },
      '2 caras': { 100: 11250, 500: 27750, 1000: 54000, 2000: 105000, 5000: 225000 },
    },
    '20x10cm': {
      '1 cara':  { 100: 11250, 500: 27750, 1000: 54000, 2000: 105000, 5000: 225000 },
      '2 caras': { 100: 16875, 500: 41625, 1000: 81000, 2000: 157500, 5000: 337500 },
    },
    '14.5x20cm': {
      '1 cara':  { 100: 15000, 500: 36000, 1000: 70000, 2000: 140000, 5000: 250000 },
      '2 caras': { 100: 22500, 500: 54000, 1000: 105000, 2000: 210000, 5000: 375000 },
    },
  },
  cantidades: [100, 500, 1000, 2000, 5000],
}

// ─── BASTIDORES (precios proveedor, IVA incluido) ─────────────────────────────
export const BASTIDORES_PROVEEDOR = [
  { id: 'b_1x05', nombre: 'Bastidor 1.0×0.5m', precioCara: 7500, precioDoble: 15000, area: 0.5 },
  { id: 'b_12x07', nombre: 'Bastidor 1.2×0.7m', precioCara: 9750, precioDoble: 19500, area: 0.84 },
  { id: 'b_15x08', nombre: 'Bastidor 1.5×0.8m', precioCara: 12500, precioDoble: 25000, area: 1.2 },
  { id: 'b_18x10', nombre: 'Bastidor 1.8×1.0m', precioCara: 18000, precioDoble: 36000, area: 1.8 },
  { id: 'b_20x10', nombre: 'Bastidor 2.0×1.0m', precioCara: 20000, precioDoble: 40000, area: 2.0 },
  { id: 'b_20x05', nombre: 'Bastidor 2.0×0.5m', precioCara: 11500, precioDoble: 22000, area: 1.0 },
]

// Bastidores Birth (precio de venta directo por m²)
export const BASTIDORES_BIRTH = [
  { id: 'bastidor_madera', nombre: 'Bastidor de madera', precio: 30000, unidad: 'm2' },
  { id: 'bastidor_metalico', nombre: 'Bastidor metálico', precio: 50000, unidad: 'm2' },
]

// Palomas publicitarias Birth (doble cara)
export const PALOMAS = [
  { id: 'paloma_100x60', nombre: 'Paloma 100×60cm', precio: 30000 },
  { id: 'paloma_120x60', nombre: 'Paloma 120×60cm', precio: 35000 },
  { id: 'paloma_150x60', nombre: 'Paloma 150×60cm', precio: 40000 },
]

// ─── PENDONES ROLLER (lookup por tamaño) ─────────────────────────────────────
export const PENDONES = [
  { id: 'p_200x080_imp', nombre: 'Pendon 2.0×0.80m con impresión', precio: 30000 },
  { id: 'p_200x090_imp', nombre: 'Pendon 2.0×0.90m con impresión', precio: 32000 },
  { id: 'p_200x100_imp', nombre: 'Pendon 2.0×1.0m con impresión', precio: 34500 },
  { id: 'p_a3_imp', nombre: 'Pendon A3 con impresión', precio: 14000 },
  { id: 'p_a4_imp', nombre: 'Pendon A4 con impresión', precio: 12000 },
  { id: 'p_200x080_si', nombre: 'Pendon 2.0×0.80m sin impresión', precio: 17500 },
  { id: 'p_200x090_si', nombre: 'Pendon 2.0×0.90m sin impresión', precio: 20500 },
  { id: 'p_200x100_si', nombre: 'Pendon 2.0×1.0m sin impresión', precio: 21000 },
  { id: 'p_a3_si', nombre: 'Pendon A3 sin impresión', precio: 11000 },
  { id: 'p_a4_si', nombre: 'Pendon A4 sin impresión', precio: 9000 },
]

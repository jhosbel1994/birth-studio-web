const BASE = import.meta.env.BASE_URL
const W = 1672
const H = 941

function zona(id, nombre, tipo, puntos, medidas = {}) {
  return {
    id,
    nombre,
    tipo,
    anchoCm: medidas.anchoCm || '',
    altoCm: medidas.altoCm || '',
    puntos: puntos.map(([x, y]) => ({ x, y })),
  }
}

export const BUILTIN_TEMPLATES = [
  {
    id: 'builtin-vitrina-01',
    nombre: 'Plantilla moderna ciudad',
    fotoUrl: `${BASE}mockup-vitrina/vitrina-01-moderna.png`,
    fotoW: W,
    fotoH: H,
    storagePath: null,
    esPlantilla: true,
    builtin: true,
    capas: [],
    zonas: [
      zona('v01-izq', 'Ventanal izquierdo', 'vidrio', [[231, 203], [612, 204], [612, 770], [231, 769]], { anchoCm: 220, altoCm: 310 }),
      zona('v01-puerta', 'Puerta central', 'vidrio', [[633, 320], [986, 319], [988, 768], [633, 768]], { anchoCm: 180, altoCm: 240 }),
      zona('v01-der', 'Ventanal derecho', 'vidrio', [[1020, 203], [1441, 203], [1442, 771], [1021, 770]], { anchoCm: 240, altoCm: 310 }),
      zona('v01-letrero', 'Franja superior', 'pared', [[210, 64], [1463, 62], [1463, 183], [210, 184]], { anchoCm: 620, altoCm: 65 }),
    ],
  },
  {
    id: 'builtin-vitrina-02',
    nombre: 'Plantilla café esquina',
    fotoUrl: `${BASE}mockup-vitrina/vitrina-02-corner-cafe.png`,
    fotoW: W,
    fotoH: H,
    storagePath: null,
    esPlantilla: true,
    builtin: true,
    capas: [],
    zonas: [
      zona('v02-izq', 'Ventanal principal', 'vidrio', [[224, 243], [595, 241], [593, 791], [221, 789]], { anchoCm: 260, altoCm: 300 }),
      zona('v02-centro', 'Ventanal centro', 'vidrio', [[605, 243], [1007, 244], [1009, 789], [606, 789]], { anchoCm: 280, altoCm: 300 }),
      zona('v02-puerta', 'Puerta derecha', 'vidrio', [[1212, 308], [1430, 347], [1428, 795], [1214, 790]], { anchoCm: 110, altoCm: 230 }),
      zona('v02-letrero', 'Letrero esquina', 'pared', [[218, 73], [1510, 120], [1508, 226], [217, 180]], { anchoCm: 680, altoCm: 65 }),
    ],
  },
  {
    id: 'builtin-vitrina-03',
    nombre: 'Plantilla oficina empavonado',
    fotoUrl: `${BASE}mockup-vitrina/vitrina-03-oficina.png`,
    fotoW: W,
    fotoH: H,
    storagePath: null,
    esPlantilla: true,
    builtin: true,
    capas: [],
    zonas: [
      zona('v03-panel-1', 'Panel oficina 1', 'vidrio', [[136, 190], [432, 190], [431, 815], [136, 815]], { anchoCm: 150, altoCm: 300 }),
      zona('v03-panel-2', 'Panel oficina 2', 'vidrio', [[443, 191], [730, 191], [730, 817], [443, 816]], { anchoCm: 150, altoCm: 300 }),
      zona('v03-panel-3', 'Panel oficina 3', 'vidrio', [[741, 191], [1220, 191], [1222, 817], [741, 817]], { anchoCm: 250, altoCm: 300 }),
      zona('v03-puerta', 'Puerta lateral', 'vidrio', [[1324, 296], [1521, 293], [1520, 818], [1323, 817]], { anchoCm: 100, altoCm: 260 }),
    ],
  },
  {
    id: 'builtin-vitrina-04',
    nombre: 'Plantilla boutique urbana',
    fotoUrl: `${BASE}mockup-vitrina/vitrina-04-boutique.png`,
    fotoW: W,
    fotoH: H,
    storagePath: null,
    esPlantilla: true,
    builtin: true,
    capas: [],
    zonas: [
      zona('v04-izq', 'Vitrina izquierda', 'vidrio', [[190, 263], [431, 264], [431, 800], [189, 800]], { anchoCm: 130, altoCm: 285 }),
      zona('v04-centro-izq', 'Vitrina centro izquierda', 'vidrio', [[444, 264], [701, 264], [700, 799], [443, 800]], { anchoCm: 140, altoCm: 285 }),
      zona('v04-puerta', 'Puerta boutique', 'vidrio', [[705, 302], [961, 302], [962, 802], [706, 801]], { anchoCm: 130, altoCm: 260 }),
      zona('v04-derecha', 'Vitrina derecha', 'vidrio', [[982, 265], [1479, 264], [1480, 799], [982, 800]], { anchoCm: 270, altoCm: 285 }),
      zona('v04-letrero', 'Letrero superior', 'pared', [[184, 82], [1488, 82], [1488, 207], [184, 207]], { anchoCm: 660, altoCm: 70 }),
    ],
  },
  {
    id: 'builtin-vitrina-05',
    nombre: 'Plantilla local urbano',
    fotoUrl: `${BASE}mockup-vitrina/vitrina-05-local-urbano.png`,
    fotoW: W,
    fotoH: H,
    storagePath: null,
    esPlantilla: true,
    builtin: true,
    capas: [],
    zonas: [
      zona('v05-izq', 'Ventanal izquierdo', 'vidrio', [[287, 244], [695, 244], [694, 797], [286, 798]], { anchoCm: 230, altoCm: 300 }),
      zona('v05-puerta', 'Puerta central', 'vidrio', [[709, 302], [972, 303], [972, 798], [710, 797]], { anchoCm: 130, altoCm: 250 }),
      zona('v05-der', 'Ventanal derecho', 'vidrio', [[986, 244], [1381, 244], [1382, 797], [987, 798]], { anchoCm: 230, altoCm: 300 }),
      zona('v05-letrero', 'Franja superior', 'pared', [[282, 52], [1385, 52], [1386, 184], [282, 184]], { anchoCm: 560, altoCm: 70 }),
    ],
  },
]

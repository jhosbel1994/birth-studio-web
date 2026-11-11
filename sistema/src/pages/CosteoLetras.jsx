import CosteoLetrasPanel from '../components/CosteoLetras/CosteoLetrasPanel'

export default function CosteoLetras() {
  return (
    <div className="mx-auto max-w-[1500px] p-4 md:p-6 lg:p-8">
      <header className="mb-5">
        <h1 className="font-barlow text-3xl font-bold uppercase tracking-wide text-on-surface md:text-4xl">
          Costeo de letras corpóreas
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-on-surface-variant">
          Calcula el costo real del proyecto por materiales, iluminación, insumos, servicios y mano de obra.
          Los precios son editables y se guardan para el próximo cálculo.
        </p>
      </header>

      <CosteoLetrasPanel />
    </div>
  )
}

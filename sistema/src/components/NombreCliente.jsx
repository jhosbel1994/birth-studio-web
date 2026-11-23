import { identidadCliente } from '../utils/clienteIdentidad'

export default function NombreCliente({ cliente, cotizacion, className = '', nombreClassName = 'text-sm font-medium', as: Titulo = 'p' }) {
  const { principal, contacto } = identidadCliente(cliente, cotizacion)
  return (
    <div className={`min-w-0 ${className}`}>
      <Titulo className={`text-on-surface [overflow-wrap:anywhere] ${nombreClassName}`}>{principal}</Titulo>
      {contacto && <p className="text-xs text-on-surface-variant mt-0.5 [overflow-wrap:anywhere]">{contacto}</p>}
    </div>
  )
}

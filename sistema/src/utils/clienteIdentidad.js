const texto = value => typeof value === 'string' ? value.trim() : ''

export function identidadCliente(cliente, cotizacion = {}) {
  const empresa = texto(cliente ? cliente.empresa : cotizacion.clienteEmpresa)
  const nombre = [texto(cliente?.nombre), texto(cliente?.apellido)].filter(Boolean).join(' ')
    || texto(cotizacion.clienteNombre)
  return {
    empresa,
    nombre,
    principal: empresa || nombre || '—',
    contacto: empresa && nombre && empresa.toLocaleLowerCase() !== nombre.toLocaleLowerCase() ? nombre : '',
  }
}

export function opcionCliente(cliente, cotizacion) {
  const { principal, contacto } = identidadCliente(cliente, cotizacion)
  return contacto ? `${principal} — ${contacto}` : principal
}

export function datosClienteCotizacion(cliente, cotizacion) {
  const { empresa, nombre } = identidadCliente(cliente, cotizacion)
  return { clienteNombre: nombre, clienteEmpresa: empresa }
}

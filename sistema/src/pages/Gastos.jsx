import { useState, useEffect, useRef } from 'react'
import {
  saveGasto, deleteGastoConReversa, savePagoConRetiro, deletePagoConReversa,
  subscribeGastos, subscribePagos, subscribeCotizaciones,
  uploadBoletaImagen, getBoletaImagenUrl, deleteBoletaImagen,
} from '../utils/storage'
import { clp, fechaCorta, hoy, CATEGORIAS_GASTO } from '../utils/formatters'
import { escanearBoleta } from '../utils/scanner'
import { exportarFinanzasCSV, exportarFinanzasPDF } from '../utils/exportFinanzas'
import {
  Plus, Trash2, X, TrendingUp, TrendingDown, DollarSign, Camera,
  Loader2, AlertCircle, CheckCircle2, Upload, ExternalLink, ReceiptText,
  Download, Building2, User, Wallet,
} from 'lucide-react'

// Ámbito de un movimiento: 'birth' (negocio) o 'personal'. Los registros
// antiguos sin ámbito se consideran Birth (compatibilidad hacia atrás).
const ambitoDe = (x) => (x?.ambito === 'personal' ? 'personal' : 'birth')
const ambitoLabel = (a) => (a === 'personal' ? 'Personal' : 'Birth')

// Control segmentado Birth/Personal (con opción "Todos" para el filtro).
function AmbitoToggle({ value, onChange, withTodos = false, size = 'md' }) {
  const opts = [
    ...(withTodos ? [{ v: 'todos', label: 'Todos', icon: Wallet }] : []),
    { v: 'birth', label: 'Birth', icon: Building2 },
    { v: 'personal', label: 'Personal', icon: User },
  ]
  const pad = size === 'sm' ? 'px-2.5 py-1' : 'px-3 py-1.5'
  return (
    <div className="inline-flex rounded-full border border-white/60 bg-white/50 p-0.5">
      {opts.map(o => {
        const Icon = o.icon
        const active = value === o.v
        return (
          <button key={o.v} type="button" onClick={() => onChange(o.v)}
            className={`flex items-center gap-1.5 ${pad} rounded-full text-sm font-dm transition-colors ${active ? 'bg-on-surface text-white shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>
            <Icon size={14} /> {o.label}
          </button>
        )
      })}
    </div>
  )
}

// Etiqueta pequeña de ámbito para las listas.
function BadgeAmbito({ ambito }) {
  const personal = ambito === 'personal'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-dm font-semibold border ${
      personal ? 'bg-violet-100 text-violet-700 border-violet-200' : 'bg-sky-100 text-sky-700 border-sky-200'
    }`}>
      {personal ? <User size={10} /> : <Building2 size={10} />}{ambitoLabel(ambito)}
    </span>
  )
}

function ModalGasto({ gasto, onClose, onSave }) {
  const [form, setForm] = useState(gasto?.id ? { ambito: 'birth', ...gasto } : {
    descripcion: '', monto: '', fecha: hoy(), categoria: 'Materiales', notas: '', ambito: 'birth'
  })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const [escaneando, setEscaneando] = useState(false)
  const [scanStatus, setScanStatus] = useState(null) // null | 'ok' | 'error'
  const [scanMsg, setScanMsg] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [boletaFile, setBoletaFile] = useState(null)
  const [boletaPreview, setBoletaPreview] = useState(gasto?.boletaUrl || '')
  const cameraRef = useRef(null)
  const uploadRef = useRef(null)

  useEffect(() => () => {
    if (boletaPreview?.startsWith('blob:')) URL.revokeObjectURL(boletaPreview)
  }, [boletaPreview])

  const handleScanFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Reset input para poder volver a escanear la misma imagen
    e.target.value = ''

    setEscaneando(true)
    setScanStatus(null)
    setScanMsg('')

    try {
      const { datos, archivo } = await escanearBoleta(file)
      if (boletaPreview?.startsWith('blob:')) URL.revokeObjectURL(boletaPreview)
      setBoletaFile(archivo)
      setBoletaPreview(URL.createObjectURL(archivo))

      const detalle = (datos.detalle || [])
        .map(item => [item.descripcion, item.cantidad ? `x${item.cantidad}` : '', item.monto ? clp(item.monto) : ''].filter(Boolean).join(' '))
        .join('; ')
      const notas = [
        datos.rut ? `RUT ${datos.rut}` : '',
        datos.folio ? `Boleta ${datos.folio}` : '',
        datos.neto != null ? `Neto ${clp(datos.neto)}` : '',
        datos.iva != null ? `IVA ${clp(datos.iva)}` : '',
        detalle,
      ].filter(Boolean).join(' · ')

      setForm(current => ({
        ...current,
        descripcion: datos.establecimiento || current.descripcion,
        monto: datos.total ?? current.monto,
        fecha: datos.fecha || current.fecha,
        categoria: CATEGORIAS_GASTO.includes(datos.categoria) ? datos.categoria : current.categoria,
        notas: notas || current.notas,
        boletaDatos: datos,
      }))

      setScanStatus('ok')
      setScanMsg(datos.confianza != null && datos.confianza < 0.65
        ? 'Lectura con baja confianza. Revisa el total antes de registrar.'
        : 'Boleta leída. Confirma los datos y registra el gasto.')
    } catch (err) {
      setScanStatus('error')
      setScanMsg(err.message || 'No se pudo leer la boleta. Ingresa los datos manualmente.')
    } finally {
      setEscaneando(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!form.descripcion || !(Number(form.monto) > 0) || guardando) return
    setGuardando(true)
    let uploaded = null
    try {
      // La foto es opcional: si no se puede subir (p.ej. Firebase Storage sin
      // activar) NO bloqueamos el registro del gasto — se guardan los datos
      // igual y avisamos que la imagen no se adjuntó.
      if (boletaFile) {
        try {
          uploaded = await uploadBoletaImagen(boletaFile)
        } catch {
          uploaded = null
        }
      }
      await onSave({
        ...form,
        ...(uploaded ? {
          boletaUrl: null,
          boletaPath: uploaded.path,
          boletaNombre: uploaded.nombre,
          boletaTipo: uploaded.tipo,
        } : {}),
      })
      if (uploaded && gasto?.boletaPath && gasto.boletaPath !== uploaded.path) {
        await deleteBoletaImagen(gasto.boletaPath)
      }
    } catch (error) {
      if (uploaded?.path) await deleteBoletaImagen(uploaded.path)
      setScanStatus('error')
      setScanMsg(error.message || 'No se pudo registrar el gasto')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
      <div className="glass-panel bg-white/90 rounded-t-[32px] md:rounded-widget w-full max-w-md shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 md:px-6 py-4 border-b border-white/40 sticky top-0 bg-white/90 backdrop-blur-xl rounded-t-[32px] md:rounded-t-widget">
          <h2 className="font-barlow text-xl font-bold tracking-wide">
            {gasto?.id ? 'EDITAR GASTO' : 'NUEVO GASTO'}
          </h2>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface"><X size={18} /></button>
        </div>

        <div className="px-5 md:px-6 pt-5 space-y-3">
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleScanFile}
          />
          <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={handleScanFile} />

          {boletaPreview && (
            <div className="relative h-36 md:h-40 overflow-hidden rounded-xl border border-white/60 bg-white/70">
              <img src={boletaPreview} alt="Boleta seleccionada" className="w-full h-full object-contain" />
              <div className="absolute left-2 top-2 rounded-full bg-black/75 px-2.5 py-1 text-[10px] font-dm text-white">
                Comprobante adjunto
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={escaneando || guardando}
              onClick={() => cameraRef.current?.click()}
              className="h-12 rounded-xl bg-on-surface text-white flex items-center justify-center gap-2 text-sm font-dm font-medium disabled:opacity-45">
              {escaneando
                ? <><Loader2 size={17} className="animate-spin" /> Analizando...</>
                : <><Camera size={17} /> Tomar foto</>}
            </button>
            <button
              type="button"
              disabled={escaneando || guardando}
              onClick={() => uploadRef.current?.click()}
              className="h-12 rounded-xl border border-on-surface bg-white/60 text-on-surface flex items-center justify-center gap-2 text-sm font-dm font-medium disabled:opacity-45">
              <Upload size={17} /> Subir imagen
            </button>
          </div>
          <p className="text-[11px] text-on-surface-variant font-dm text-center">
            Encuadra la boleta completa, con buena luz y sin reflejos.
          </p>

          {/* Feedback del escaneo */}
          {scanStatus && (
            <div className={`mt-2 flex items-start gap-2 px-3 py-2 rounded text-xs font-dm ${
              scanStatus === 'ok'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-primary border border-red-200'
            }`}>
              {scanStatus === 'ok'
                ? <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                : <AlertCircle size={14} className="shrink-0 mt-0.5" />
              }
              {scanMsg}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit}
          className="p-5 md:p-6 pt-4 space-y-4">
          <div>
            <label className="block text-xs text-on-surface-variant mb-1.5 font-dm uppercase tracking-wider">¿De qué bolsillo?</label>
            <AmbitoToggle value={form.ambito || 'birth'} onChange={v => set('ambito', v)} />
          </div>
          <div>
            <label className="block text-xs text-on-surface-variant mb-1 font-dm uppercase tracking-wider">Descripción *</label>
            <input value={form.descripcion} onChange={e => set('descripcion', e.target.value)} required
              className="w-full border border-white/50 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-on-surface" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-on-surface-variant mb-1 font-dm uppercase tracking-wider">Monto *</label>
              <input type="number" min="0" value={form.monto} onChange={e => set('monto', parseFloat(e.target.value) || '')} required
                className="w-full border border-white/50 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-on-surface" placeholder="0" />
            </div>
            <div>
              <label className="block text-xs text-on-surface-variant mb-1 font-dm uppercase tracking-wider">Fecha</label>
              <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)}
                className="w-full border border-white/50 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-on-surface" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-on-surface-variant mb-1 font-dm uppercase tracking-wider">Categoría</label>
            <select value={form.categoria} onChange={e => set('categoria', e.target.value)}
              className="w-full border border-white/50 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-on-surface bg-white">
              {CATEGORIAS_GASTO.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-on-surface-variant mb-1 font-dm uppercase tracking-wider">Notas</label>
            <textarea value={form.notas} onChange={e => set('notas', e.target.value)} rows={2}
              className="w-full border border-white/50 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-on-surface resize-none" />
          </div>
          <div className="flex gap-3 pt-2 pb-safe">
            <button type="submit" disabled={guardando || escaneando}
              className="flex-1 bg-primary text-on-primary py-2.5 rounded-full text-sm font-dm font-medium hover:bg-primary-container transition-colors shadow-lg shadow-primary/20 disabled:opacity-45">
              {guardando ? 'Guardando...' : gasto?.id ? 'Guardar cambios' : 'Registrar gasto'}
            </button>
            <button type="button" onClick={onClose}
              className="px-5 border border-white/60 bg-white/40 rounded-full text-sm font-dm text-on-surface-variant hover:border-primary transition-colors">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function BoletaLink({ gasto, compact = false }) {
  const [abriendo, setAbriendo] = useState(false)
  if (!gasto?.boletaPath && !gasto?.boletaUrl) return null

  const handleOpen = async () => {
    if (abriendo) return
    if (!gasto.boletaPath) {
      window.open(gasto.boletaUrl, '_blank', 'noopener,noreferrer')
      return
    }

    const popup = window.open('about:blank', '_blank')
    if (popup) popup.opener = null
    setAbriendo(true)
    try {
      const url = await getBoletaImagenUrl(gasto.boletaPath)
      if (popup) popup.location.href = url
      else window.open(url, '_blank', 'noopener,noreferrer')
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (error) {
      popup?.close()
      window.alert(error.message || 'No se pudo abrir la boleta')
    } finally {
      setAbriendo(false)
    }
  }

  return (
    <button type="button" onClick={handleOpen} disabled={abriendo}
      className="inline-flex items-center gap-1 text-[11px] font-dm font-medium text-blue-700 hover:underline"
      title="Abrir comprobante">
      <ReceiptText size={13} /> {!compact && (abriendo ? 'Abriendo...' : 'Ver boleta')} <ExternalLink size={11} />
    </button>
  )
}

function ModalPago({ cotizaciones, onClose, onSave }) {
  const [form, setForm] = useState({ cotizacionId: '', monto: '', fecha: hoy(), tipo: 'anticipo', notas: '', ambito: 'birth', origenBirth: false })
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const cots = cotizaciones.filter(c => ['aceptada', 'terminada'].includes(c.estado))
  // Al cambiar de bolsillo, limpiamos los campos que no aplican al otro.
  const cambiarAmbito = (v) => setForm(f => ({
    ...f, ambito: v,
    ...(v === 'personal' ? { cotizacionId: '', tipo: 'otro' } : { origenBirth: false }),
  }))

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
      <div className="glass-panel bg-white/90 rounded-t-[32px] md:rounded-widget w-full max-w-md shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 md:px-6 py-4 border-b border-white/40 sticky top-0 bg-white/90 backdrop-blur-xl rounded-t-[32px] md:rounded-t-widget">
          <h2 className="font-barlow text-xl font-bold tracking-wide">REGISTRAR PAGO</h2>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface"><X size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); if (!form.monto) return; onSave(form) }} className="p-5 md:p-6 space-y-4">
          <div>
            <label className="block text-xs text-on-surface-variant mb-1.5 font-dm uppercase tracking-wider">¿A qué bolsillo entra?</label>
            <AmbitoToggle value={form.ambito} onChange={cambiarAmbito} />
          </div>

          {form.ambito === 'personal' && (
            <label className="flex items-start gap-2.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5 cursor-pointer">
              <input type="checkbox" checked={form.origenBirth} onChange={e => set('origenBirth', e.target.checked)}
                className="mt-0.5 accent-on-surface" />
              <span className="text-xs font-dm text-on-surface leading-snug">
                Este dinero <b>proviene de Birth</b> (retiro). Se descontará del balance de Birth y se sumará a tu balance Personal.
              </span>
            </label>
          )}

          {form.ambito === 'birth' && (
            <div>
              <label className="block text-xs text-on-surface-variant mb-1 font-dm uppercase tracking-wider">Cotización (opcional)</label>
              <select value={form.cotizacionId} onChange={e => set('cotizacionId', e.target.value)}
                className="w-full border border-white/50 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-on-surface bg-white">
                <option value="">Sin vincular</option>
                {cots.map(c => <option key={c.id} value={c.id}>#{c.numero} — {c.clienteNombre} ({clp(c.total)})</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-on-surface-variant mb-1 font-dm uppercase tracking-wider">Monto *</label>
              <input type="number" min="0" value={form.monto} onChange={e => set('monto', parseFloat(e.target.value) || '')} required
                className="w-full border border-white/50 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-on-surface" />
            </div>
            <div>
              <label className="block text-xs text-on-surface-variant mb-1 font-dm uppercase tracking-wider">Fecha</label>
              <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)}
                className="w-full border border-white/50 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-on-surface" />
            </div>
          </div>
          {form.ambito === 'birth' && (
            <div>
              <label className="block text-xs text-on-surface-variant mb-1 font-dm uppercase tracking-wider">Tipo</label>
              <select value={form.tipo} onChange={e => set('tipo', e.target.value)}
                className="w-full border border-white/50 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-on-surface bg-white">
                <option value="anticipo">Anticipo</option>
                <option value="saldo">Saldo</option>
                <option value="total">Pago total</option>
                <option value="otro">Otro ingreso</option>
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs text-on-surface-variant mb-1 font-dm uppercase tracking-wider">Notas</label>
            <input value={form.notas} onChange={e => set('notas', e.target.value)}
              className="w-full border border-white/50 rounded px-3 py-2 text-sm font-dm focus:outline-none focus:border-on-surface" />
          </div>
          <div className="flex gap-3 pt-2 pb-safe">
            <button type="submit"
              className="flex-1 bg-primary text-on-primary py-2.5 rounded-full text-sm font-dm font-medium hover:bg-primary-container transition-colors shadow-lg shadow-primary/20">
              Registrar ingreso
            </button>
            <button type="button" onClick={onClose}
              className="px-5 border border-white/60 bg-white/40 rounded-full text-sm font-dm text-on-surface-variant hover:border-primary transition-colors">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Gastos() {
  const [gastos, setGastos] = useState([])
  const [pagos, setPagos] = useState([])
  const [cotizaciones, setCotizaciones] = useState([])
  const [tab, setTab] = useState('gastos')
  const [modalGasto, setModalGasto] = useState(null)
  const [modalPago, setModalPago] = useState(false)
  const [mesFiltro, setMesFiltro] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [ambitoFiltro, setAmbitoFiltro] = useState('birth') // 'todos' | 'birth' | 'personal'

  useEffect(() => {
    const u1 = subscribeGastos(setGastos)
    const u2 = subscribePagos(setPagos)
    const u3 = subscribeCotizaciones(setCotizaciones)
    return () => { u1(); u2(); u3() }
  }, [])

  const enAmbito = (x) => ambitoFiltro === 'todos' || ambitoDe(x) === ambitoFiltro
  const gastosMes = gastos.filter(g => g.fecha?.startsWith(mesFiltro) && enAmbito(g))
  const pagosMes = pagos.filter(p => p.fecha?.startsWith(mesFiltro) && enAmbito(p))

  const totalGastos = gastosMes.reduce((s, g) => s + (g.monto || 0), 0)
  const totalIngresos = pagosMes.reduce((s, p) => s + (p.monto || 0), 0)
  const ganancia = totalIngresos - totalGastos

  // Gastos por categoría (incluye 'Retiro' si aparece; respeta el ámbito).
  const porCategoria = [...new Set(gastosMes.map(g => g.categoria || 'Otros'))].map(cat => ({
    cat,
    total: gastosMes.filter(g => (g.categoria || 'Otros') === cat).reduce((s, g) => s + (g.monto || 0), 0),
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total)

  // Detalle para exportar: lo que se está viendo (mes + ámbito).
  const movimientos = [
    ...gastosMes.map(g => ({ fecha: g.fecha, tipo: 'Gasto', ambito: ambitoDe(g), descripcion: g.descripcion, categoria: g.categoria || 'Otros', monto: g.monto || 0 })),
    ...pagosMes.map(p => ({ fecha: p.fecha, tipo: 'Ingreso', ambito: ambitoDe(p), descripcion: p.notas || 'Ingreso', categoria: p.tipo || '—', monto: p.monto || 0 })),
  ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
  const nombreBase = `finanzas_${ambitoFiltro}_${mesFiltro}`
  const ambTexto = ambitoFiltro === 'todos' ? 'Birth + Personal' : ambitoLabel(ambitoFiltro)

  const meses = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    meses.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  return (
    <div className="px-2.5 py-3 md:p-6 lg:p-8">
      {modalGasto !== null && (
        <ModalGasto
          gasto={modalGasto?.id ? modalGasto : null}
          onClose={() => setModalGasto(null)}
          onSave={async (data) => { await saveGasto(data); setModalGasto(null) }}
        />
      )}
      {modalPago && (
        <ModalPago
          cotizaciones={cotizaciones}
          onClose={() => setModalPago(false)}
          onSave={async (data) => { await savePagoConRetiro(data); setModalPago(false) }}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 md:mb-8">
        <div>
          <h1 className="font-barlow text-3xl md:text-4xl font-bold text-on-surface tracking-wide">GASTOS & FINANZAS</h1>
          <p className="text-on-surface-variant text-xs md:text-sm font-dm mt-1">Seguimiento de ingresos y gastos</p>
        </div>
        <div className="flex gap-2">
          <select value={mesFiltro} onChange={e => setMesFiltro(e.target.value)}
            className="border border-white/60 rounded-full px-4 py-2 text-sm font-dm bg-white/50 focus:outline-none focus:border-primary focus:bg-white">
            {meses.map(m => {
              const [y, mo] = m.split('-')
              const label = new Date(parseInt(y), parseInt(mo) - 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
              return <option key={m} value={m}>{label}</option>
            })}
          </select>
        </div>
      </div>

      {/* Filtro de bolsillo (Birth/Personal) + exportar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 md:mb-6">
        <AmbitoToggle withTodos value={ambitoFiltro} onChange={setAmbitoFiltro} />
        <div className="flex gap-2">
          <button type="button" onClick={() => exportarFinanzasCSV(movimientos, `${nombreBase}.csv`)}
            disabled={movimientos.length === 0}
            className="flex items-center gap-2 border border-white/60 bg-white/50 rounded-full px-3.5 py-2 text-sm font-dm text-on-surface hover:border-primary transition-colors disabled:opacity-40">
            <Download size={14} /> Excel/Sheets
          </button>
          <button type="button" onClick={() => exportarFinanzasPDF(movimientos, { titulo: `Finanzas — ${ambTexto}`, subtitulo: `Período ${mesFiltro}`, nombreArchivo: `${nombreBase}.pdf` })}
            disabled={movimientos.length === 0}
            className="flex items-center gap-2 border border-white/60 bg-white/50 rounded-full px-3.5 py-2 text-sm font-dm text-on-surface hover:border-primary transition-colors disabled:opacity-40">
            <Download size={14} /> PDF
          </button>
        </div>
      </div>

      {/* Resumen del mes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
        <div className="glass-panel rounded-widget p-4 md:p-5">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} className="text-green-500" />
            <p className="text-xs text-on-surface-variant font-dm uppercase tracking-wider">Ingresos</p>
          </div>
          <p className="font-barlow text-2xl md:text-3xl font-bold text-green-700">{clp(totalIngresos)}</p>
        </div>
        <div className="glass-panel rounded-widget p-4 md:p-5">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown size={16} className="text-primary" />
            <p className="text-xs text-on-surface-variant font-dm uppercase tracking-wider">Gastos</p>
          </div>
          <p className="font-barlow text-2xl md:text-3xl font-bold text-primary">{clp(totalGastos)}</p>
        </div>
        <div className="glass-panel rounded-widget p-4 md:p-5">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={16} className={ganancia >= 0 ? 'text-green-500' : 'text-primary'} />
            <p className="text-xs text-on-surface-variant font-dm uppercase tracking-wider">Balance {ambTexto}</p>
          </div>
          <p className={`font-barlow text-2xl md:text-3xl font-bold ${ganancia >= 0 ? 'text-green-700' : 'text-primary'}`}>{clp(ganancia)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Tabla principal */}
        <div className="lg:col-span-2">
          {/* Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex gap-1 overflow-x-auto">
              <button onClick={() => setTab('gastos')}
                className={`px-4 py-2 rounded-full text-sm font-dm border transition-colors ${tab === 'gastos' ? 'bg-primary text-on-primary border-primary' : 'bg-white/50 text-on-surface-variant border-white/60 hover:border-primary'}`}>
                Gastos ({gastosMes.length})
              </button>
              <button onClick={() => setTab('ingresos')}
                className={`px-4 py-2 rounded-full text-sm font-dm border transition-colors ${tab === 'ingresos' ? 'bg-primary text-on-primary border-primary' : 'bg-white/50 text-on-surface-variant border-white/60 hover:border-primary'}`}>
                Ingresos ({pagosMes.length})
              </button>
            </div>
            <button
              onClick={() => tab === 'gastos' ? setModalGasto({}) : setModalPago(true)}
              className="flex items-center justify-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-full text-sm font-dm hover:bg-primary-container transition-colors shadow-lg shadow-primary/20">
              <Plus size={14} /> {tab === 'gastos' ? 'Nuevo gasto' : 'Nuevo ingreso'}
            </button>
          </div>

          <div className="glass-panel rounded-widget overflow-hidden">
            {tab === 'gastos' ? (
              gastosMes.length === 0 ? (
                <div className="py-16 text-center text-on-surface-variant text-sm font-dm">Sin gastos este mes</div>
              ) : (
                <>
                <div className="md:hidden divide-y divide-white/40">
                  {[...gastosMes].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).map(g => {
                    const cot = cotizaciones.find(c => c.id === g.cotizacionId)
                    return (
                    <div key={g.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-dm font-semibold text-sm text-on-surface truncate">{g.descripcion}</p>
                          <p className="text-xs text-on-surface-variant mt-1 font-dm">{fechaCorta(g.fecha)}{cot ? ` · #${cot.numero}` : ''}</p>
                          <div className="mt-2 flex items-center gap-2 flex-wrap">
                            <span className="inline-block bg-white/60 px-2 py-0.5 rounded text-[11px] font-dm text-on-surface-variant">{g.categoria}</span>
                            {ambitoFiltro === 'todos' && <BadgeAmbito ambito={ambitoDe(g)} />}
                            <BoletaLink gasto={g} />
                          </div>
                        </div>
                        <p className="font-barlow text-lg font-bold text-primary shrink-0">{clp(g.monto)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => { if (confirm('¿Eliminar?')) { deleteGastoConReversa(g) } }}
                        className="mt-4 h-10 w-full rounded border border-white/50 text-xs font-dm text-primary flex items-center justify-center gap-2 active:border-primary"
                      >
                        <Trash2 size={14} /> Eliminar gasto
                      </button>
                    </div>
                    )
                  })}
                </div>
                <table className="hidden md:table w-full text-sm font-dm">
                  <thead>
                    <tr className="border-b border-white/50">
                      <th className="text-left px-5 py-3 text-xs text-on-surface-variant font-medium uppercase tracking-wider">Descripción</th>
                      <th className="text-left px-3 py-3 text-xs text-on-surface-variant font-medium uppercase tracking-wider">Categoría</th>
                      <th className="text-left px-3 py-3 text-xs text-on-surface-variant font-medium uppercase tracking-wider">Fecha</th>
                      <th className="text-right px-3 py-3 text-xs text-on-surface-variant font-medium uppercase tracking-wider">Monto</th>
                      <th className="px-5 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...gastosMes].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).map(g => {
                      const cot = cotizaciones.find(c => c.id === g.cotizacionId)
                      return (
                      <tr key={g.id} className="border-b border-white/50 hover:bg-white/60">
                        <td className="px-5 py-3 font-medium">
                          {g.descripcion}
                          {cot && <span className="ml-2 text-[11px] font-dm text-on-surface-variant">#{cot.numero}</span>}
                          {(g.boletaPath || g.boletaUrl) && <span className="block mt-1"><BoletaLink gasto={g} /></span>}
                        </td>
                        <td className="px-3 py-3">
                          <span className="bg-white/60 px-2 py-0.5 rounded text-xs">{g.categoria}</span>
                          {ambitoFiltro === 'todos' && <span className="ml-1.5 inline-block align-middle"><BadgeAmbito ambito={ambitoDe(g)} /></span>}
                        </td>
                        <td className="px-3 py-3 text-on-surface-variant">{fechaCorta(g.fecha)}</td>
                        <td className="px-3 py-3 text-right font-medium text-primary">{clp(g.monto)}</td>
                        <td className="px-5 py-3">
                          <button onClick={() => { if (confirm('¿Eliminar?')) { deleteGastoConReversa(g) } }}
                            className="p-1.5 text-on-surface-variant hover:text-primary rounded hover:bg-white/60">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                      )
                    })}
                  </tbody>
                </table>
                </>
              )
            ) : (
              pagosMes.length === 0 ? (
                <div className="py-16 text-center text-on-surface-variant text-sm font-dm">Sin ingresos este mes</div>
              ) : (
                <>
                <div className="md:hidden divide-y divide-white/40">
                  {[...pagosMes].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).map(p => {
                    const cot = cotizaciones.find(c => c.id === p.cotizacionId)
                    return (
                      <div key={p.id} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-dm font-semibold text-sm text-on-surface truncate">{p.notas || 'Ingreso registrado'}</p>
                            <p className="text-xs text-on-surface-variant mt-1 font-dm">{fechaCorta(p.fecha)}{cot ? ` · #${cot.numero}` : ''}</p>
                            <div className="mt-2 flex items-center gap-2 flex-wrap">
                              <span className="inline-block bg-white/60 px-2 py-0.5 rounded text-[11px] font-dm text-on-surface-variant capitalize">{p.tipo}</span>
                              {ambitoFiltro === 'todos' && <BadgeAmbito ambito={ambitoDe(p)} />}
                            </div>
                          </div>
                          <p className="font-barlow text-lg font-bold text-green-700 shrink-0">{clp(p.monto)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => { if (confirm('¿Eliminar?')) { deletePagoConReversa(p) } }}
                          className="mt-4 h-10 w-full rounded border border-white/50 text-xs font-dm text-primary flex items-center justify-center gap-2 active:border-primary"
                        >
                          <Trash2 size={14} /> Eliminar ingreso
                        </button>
                      </div>
                    )
                  })}
                </div>
                <table className="hidden md:table w-full text-sm font-dm">
                  <thead>
                    <tr className="border-b border-white/50">
                      <th className="text-left px-5 py-3 text-xs text-on-surface-variant font-medium uppercase tracking-wider">Notas</th>
                      <th className="text-left px-3 py-3 text-xs text-on-surface-variant font-medium uppercase tracking-wider">Cotización</th>
                      <th className="text-left px-3 py-3 text-xs text-on-surface-variant font-medium uppercase tracking-wider">Tipo</th>
                      <th className="text-left px-3 py-3 text-xs text-on-surface-variant font-medium uppercase tracking-wider">Fecha</th>
                      <th className="text-right px-3 py-3 text-xs text-on-surface-variant font-medium uppercase tracking-wider">Monto</th>
                      <th className="px-5 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...pagosMes].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).map(p => {
                      const cot = cotizaciones.find(c => c.id === p.cotizacionId)
                      return (
                        <tr key={p.id} className="border-b border-white/50 hover:bg-white/60">
                          <td className="px-5 py-3 font-medium">{p.notas || '—'}</td>
                          <td className="px-3 py-3 text-on-surface-variant">{cot ? `#${cot.numero}` : '—'}</td>
                          <td className="px-3 py-3">
                            <span className="bg-white/60 px-2 py-0.5 rounded text-xs capitalize">{p.tipo}</span>
                            {ambitoFiltro === 'todos' && <span className="ml-1.5 inline-block align-middle"><BadgeAmbito ambito={ambitoDe(p)} /></span>}
                          </td>
                          <td className="px-3 py-3 text-on-surface-variant">{fechaCorta(p.fecha)}</td>
                          <td className="px-3 py-3 text-right font-medium text-green-700">{clp(p.monto)}</td>
                          <td className="px-5 py-3">
                            <button onClick={() => { if (confirm('¿Eliminar?')) { deletePagoConReversa(p) } }}
                              className="p-1.5 text-on-surface-variant hover:text-primary rounded hover:bg-white/60">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                </>
              )
            )}
          </div>
        </div>

        {/* Gastos por categoría */}
        <div className="glass-panel rounded-widget overflow-hidden">
          <div className="px-5 py-4 border-b border-white/40">
            <h3 className="font-barlow font-bold text-base tracking-wide">GASTOS POR CATEGORÍA</h3>
          </div>
          {porCategoria.length === 0 ? (
            <div className="py-10 text-center text-on-surface-variant text-sm font-dm">Sin datos</div>
          ) : (
            <div className="p-4 space-y-3">
              {porCategoria.map(({ cat, total }) => {
                const pct = totalGastos > 0 ? (total / totalGastos) * 100 : 0
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-sm font-dm mb-1">
                      <span className="text-on-surface-variant">{cat}</span>
                      <span className="font-medium">{clp(total)}</span>
                    </div>
                    <div className="h-1.5 bg-white/70 rounded-full overflow-hidden">
                      <div className="h-full bg-on-surface rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

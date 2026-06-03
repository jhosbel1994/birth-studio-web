// Convierte un File a string base64 (sin el prefijo data:...)
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Envía una imagen de boleta a Claude Vision y retorna los datos extraídos.
 * @param {File} file - Imagen de la boleta
 * @returns {{ numero_transaccion, monto, establecimiento, fecha }}
 */
export async function escanearBoleta(file) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('API key no configurada. Agrega VITE_ANTHROPIC_API_KEY en sistema/.env')

  const base64 = await fileToBase64(file)
  const mediaType = file.type || 'image/jpeg'

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 },
            },
            {
              type: 'text',
              text: 'Analiza esta boleta o ticket de compra. Responde ÚNICAMENTE con este JSON sin texto adicional:\n{"numero_transaccion":"string o null","monto":numero_entero,"establecimiento":"string o null","fecha":"YYYY-MM-DD"}\nEl monto en pesos chilenos, número entero sin puntos ni comas. Si no puedes leer un campo usa null.',
            },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `Error ${response.status} al llamar a Claude`)
  }

  const data = await response.json()
  const text = data.content?.[0]?.text?.trim() || ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Claude no retornó un JSON válido')

  return JSON.parse(match[0])
}

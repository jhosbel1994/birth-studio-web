# API externa de cotizaciones

## Objetivo

La función `POST /api/external/cotizaciones` crea una cotización en Firestore sin
necesitar una sesión del navegador. La cotización queda disponible en el sistema
interno y el PDF se genera posteriormente desde el botón **PDF** de la sección
Cotizaciones.

La función no genera, almacena ni devuelve archivos PDF.

## Variables de entorno

Configurar como secretos de Vercel en `Production` y `Preview`:

```text
COTIZADOR_API_KEY
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
```

`COTIZADOR_API_KEY` debe contener al menos 32 bytes aleatorios. No debe usar el
prefijo `VITE_`. Las credenciales corresponden a una cuenta de servicio de Google
Cloud con acceso a Firestore y nunca deben incorporarse al frontend. El endpoint usa
el cliente oficial server-side `@google-cloud/firestore`; no usa el SDK del navegador.

Después de crear o modificar variables en Vercel es necesario volver a desplegar.

## Solicitud

```http
POST /api/external/cotizaciones
Content-Type: application/json
X-API-Key: <secreto del servidor>
Idempotency-Key: <identificador único de 16 a 128 caracteres>
```

```json
{
  "cliente": {
    "id": null,
    "nombre": "Óptica Cielo Azul",
    "rut": "76.123.456-7",
    "email": "contacto@ejemplo.cl",
    "telefono": "+56 9 1234 5678",
    "empresa": "Óptica Cielo Azul SpA",
    "crear_si_no_existe": true
  },
  "tipo_proyecto": "publicidad",
  "proyecto": "Letrero retroiluminado con fuente de alimentación",
  "items": [
    {
      "descripcion": "Letrero corpóreo luminoso 100x62",
      "cantidad": 1,
      "precio_unitario_neto": 580000
    },
    {
      "descripcion": "Instalación",
      "cantidad": 1,
      "precio_unitario_neto": 100000
    }
  ],
  "plazo_entrega": "10 días",
  "forma_pago": "Transferencia bancaria — 50% anticipo, 50% contra entrega",
  "validez_dias": 15
}
```

Los precios son valores netos finales en CLP. El endpoint no consulta catálogos ni
aplica márgenes. Siempre agrega IVA del 19%, calcula anticipo del 50% y guarda el
estado interno `por_aceptar`.

## Respuesta exitosa

Una creación nueva responde `201 Created`:

```json
{
  "ok": true,
  "request_id": "...",
  "folio": "#00307",
  "cotizacion_id": "...",
  "cliente_id": "...",
  "cliente_creado": true,
  "subtotal_neto": 680000,
  "iva": 129200,
  "total": 809200,
  "anticipo": 404600,
  "saldo": 404600,
  "estado": "por_aceptar",
  "estado_etiqueta": "Por aceptar",
  "url_sistema": "https://www.bspublicidad.cl/cotizador/#/cotizaciones"
}
```

Repetir la misma solicitud con la misma `Idempotency-Key` responde `200 OK`,
devuelve la cotización original y agrega `"idempotent_replay": true`. Usar esa
misma clave con un body diferente responde `409 IDEMPOTENCY_CONFLICT`.

## Resolución de clientes

El endpoint aplica este orden: ID, RUT, correo y nombre normalizado. Si encuentra
varias coincidencias devuelve `409 CLIENT_AMBIGUOUS`. Si no encuentra al cliente,
solo lo crea cuando `crear_si_no_existe` es `true`.

Como los clientes históricos no tienen campos normalizados, temporalmente se revisan
como máximo 500 documentos. Al acercarse a ese volumen debe ejecutarse una migración
de campos normalizados antes de aumentar el límite.

## Ejemplo curl

```bash
curl -X POST "https://www.bspublicidad.cl/api/external/cotizaciones" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $COTIZADOR_API_KEY" \
  -H "Idempotency-Key: 4a4f336c-2e7e-4d6c-89f9-b38c1d7837df" \
  --data '{
    "cliente":{"nombre":"Cliente de prueba","crear_si_no_existe":true},
    "proyecto":"Letrero luminoso",
    "items":[{"descripcion":"Letrero","cantidad":1,"precio_unitario_neto":100000}]
  }'
```

## Uso desde Claude normal

El endpoint se expondrá a Claude mediante un conector MCP remoto privado. La clave de
la API queda guardada en el servidor del conector y nunca se pega en una conversación.

Flujo esperado:

1. El usuario describe la cotización en Claude web, Desktop o móvil.
2. Claude pide los datos faltantes y no inventa precios.
3. Claude presenta un resumen y solicita confirmación.
4. Al confirmar, el conector genera una `Idempotency-Key` y llama al endpoint.
5. Claude informa inmediatamente el folio, total, anticipo y saldo.
6. El usuario abre `url_sistema`, localiza el folio y descarga el PDF desde la página.

La creación es síncrona, por lo que no hace falta una notificación posterior: Claude
confirma en la misma conversación cuando Firestore ya guardó la cotización.

## Rotación de la clave

1. Generar una clave aleatoria nueva fuera del repositorio.
2. Actualizar `COTIZADOR_API_KEY` en Vercel para Preview y Production.
3. Volver a desplegar y actualizar el secreto del conector MCP.
4. Probar una creación controlada con una `Idempotency-Key` nueva.
5. Eliminar cualquier copia temporal de la clave.

Durante la rotación habrá una ventana breve en que el conector y el endpoint deben usar
la misma versión de la clave. Una rotación sin interrupción requeriría admitir dos claves
temporalmente y debe implementarse como cambio separado.

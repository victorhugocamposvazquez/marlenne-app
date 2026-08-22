# Marlenne — Next.js + Supabase + Vercel

Scaffold de la PWA de agenda del centro. El diseño de referencia es
`../design_handoff_marlenne/Marlenne.dc.html` (prototipo completo) y su
`README.md` lleva todos los tokens y especificaciones pantalla a pantalla.

## ⚠️ El acceso todavía no es un login real

`/login` es el selector de perfil del prototipo: entra con una contraseña común
que vive en las variables de entorno, sin autenticar a la persona. **Cualquiera
con la URL entra.** Es aceptable con datos de prueba; hay que sustituirlo por
login por usuario antes de meter una sola clienta real (fotos, medidas y notas
son datos de salud, RGPD art. 9).

## Puesta en marcha

```bash
npm install
cp .env.example .env.local     # rellenar con las claves del proyecto Supabase
npm run dev
```

### 1. Base de datos

```bash
supabase link --project-ref <ref>
supabase db push
```

Las migraciones de `supabase/migrations/` crean tablas, enums, RLS, los índices
que impiden solapes, el trigger que abre el tratamiento al marcar una cita como
hecha, la función `free_slots()`, el bucket privado `treatment-photos` con sus
políticas, el centro Marlenne y el catálogo de 33 servicios. Se aplican solas:
no hay UUIDs que sustituir a mano.

### 2. Equipo y datos de demo

```bash
npm run seed
```

Crea los usuarios de Supabase Auth del equipo (dirección, recepción y cuatro
profesionales), sus filas en `staff`, seis clientas y las citas de hoy. Es
idempotente. La contraseña de todos los perfiles es `DEMO_PASSWORD`.

### 3. Vercel

Conectar el repo, añadir las variables de `.env.example` y desplegar.
`vercel.json` ya programa el cron de SMS a las 08:00.

### 4. Tipos

```bash
SUPABASE_PROJECT_ID=xxxx npm run types:gen
```

## Qué hay hecho

| Estado | Pieza |
| --- | --- |
| ✅ | Tokens en `tailwind.config.ts` y fuente Plus Jakarta Sans |
| ✅ | Shell de 440px + navegación inferior con reglas por rol |
| ⚠️ | Selector de perfil provisional — pendiente de login real por usuario |
| ✅ | Agenda vista día: rejilla, columnas, bloqueos, línea de ahora |
| ✅ | **Drag & drop** con pointer events, snap de 15 min y update optimista (`hooks/useDragAppointment.ts`) |
| ✅ | Agenda vista semana |
| ✅ | Dashboard Hoy: KPIs, en cabina, siguientes |
| ✅ | Lista de clientas con búsqueda |
| ✅ | Server actions: crear, mover, reprogramar, estado, cancelar, cierre de sesión |
| ✅ | Cron de recordatorio SMS con Twilio y log antiduplicados |
| ✅ | Manifest PWA |
| ✅ | Sheets: nueva cita, detalle/reprogramar, lista de espera, alta de clienta |
| ✅ | Ficha de clienta: pestañas Tratamientos / Medidas / Fotos / Historial |
| ✅ | Ajustes: equipo, catálogo, cierre de sesión, roadmap |
| ✅ | Supabase Realtime en la agenda del día, Hoy y lista de espera |
| ✅ | Cierre de sesión clínico (parámetros y medidas al marcar Hecha) |
| ✅ | Subida de fotos a Storage con compresión en cliente |
| ⚠️ | Service worker mínimo (instalable; sin caché offline) |
| ⬜ | Login real por usuario (sigue el selector de perfil) |

Las piezas pendientes están todas especificadas en el README del handoff:
medidas, colores, copys y comportamiento exactos.

## Notas de implementación

- **Solapes**: los índices `EXCLUDE USING gist` y el trigger de bloqueos los
  rechazan en base de datos. `moveAppointment` devuelve el error para que el
  cliente revierta el movimiento optimista y avise con un toast.
- **Zona horaria**: `starts_at` es `timestamptz`; el render usa Europe/Madrid
  vía `lib/time.ts`. No calcular horas con `getHours()` del cliente.
- **Realtime**: suscribirse a `appointments` y `time_blocks` del día visible —
  recepción y cabina miran la misma agenda a la vez.
- **Roles**: en la UI, una profesional solo ve su columna y no puede arrastrar
  citas a otra; la RLS lo aplica igual en el servidor.
- **RGPD**: fotos, medidas, fototipo y notas son datos de categoría especial
  (art. 9). La tabla `consents` está lista para registrar el consentimiento
  por tratamiento.

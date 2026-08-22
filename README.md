# Marlenne — Next.js + Supabase + Vercel

Marlenne es el producto (como Fresha o Booksy). Esta carpeta es la **app del
centro**. Visión multi-centro, webs y stores: [`PLAN.md`](./PLAN.md).

El diseño de referencia es `../design_handoff_marlenne/Marlenne.dc.html`
(prototipo completo) y su `README.md` lleva tokens y specs pantalla a pantalla.

## Acceso

`/login` pide el email y la contraseña de cada miembro del equipo (Supabase Auth).
Cada persona cambia la suya en **Más**. El seed crea usuarios `*@marlenne.test`
solo si no existen; **no pisa** contraseñas que ya haya. Antes de clientas
reales: checklist en Más (dirección) y el apartado de abajo. Fotos, medidas y
notas son datos de salud (RGPD art. 9).

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
idempotente. `DEMO_PASSWORD` solo se aplica a altas nuevas. Para realinearlas
a propósito: `SEED_RESET_PASSWORDS=1 npm run seed`.

### 3. Antes de clientas reales

En **Más** (dirección) hay un semáforo. A mano queda:

1. **Auth → URL Configuration** en el proyecto Supabase:
   - Site URL: `https://marlenne-app-three.vercel.app`
   - Redirect URLs: `https://marlenne-app-three.vercel.app/recuperar`,
     `https://marlenne-app-three.vercel.app/**`, `http://localhost:3000/**`
2. **Auth → Settings**: desactivar altas públicas (*Allow new users to sign up*).
   El equipo se da de alta desde Más, no desde `/login`.
3. Crear el equipo con emails reales y desactivar `*@marlenne.test`. Cada
   persona cambia su contraseña en Más o con «Olvidé la contraseña».
4. Borrar las clientas de siembra (`*@demo.test`).
5. `DEMO_PASSWORD` no va en Vercel.

Los recordatorios SMS quedan para más adelante (Labs Mobile). El cron no
manda nada si no hay proveedor.

### 4. Vercel

Conectar el repo, añadir las variables de `.env.example` y desplegar.

### 5. Tipos

```bash
SUPABASE_PROJECT_ID=xxxx npm run types:gen
```

## Qué hay hecho

| Estado | Pieza |
| --- | --- |
| ✅ | Tokens en `tailwind.config.ts` y fuente Plus Jakarta Sans |
| ✅ | Shell de 440px + navegación inferior con reglas por rol |
| ✅ | Login por email y contraseña; cada una cambia la suya |
| ✅ | Agenda vista día: rejilla, columnas, bloqueos, línea de ahora |
| ✅ | **Drag & drop** con pointer events, snap de 15 min y update optimista (`hooks/useDragAppointment.ts`) |
| ✅ | Agenda vista semana |
| ✅ | Dashboard Hoy: KPIs, en cabina, siguientes |
| ✅ | Lista de clientas con búsqueda |
| ✅ | Server actions: crear, mover, reprogramar, estado, cancelar, cierre de sesión |
| ⬜ | Recordatorios SMS (más adelante: Labs Mobile; hay cron y `sms_log`) |
| ✅ | Manifest PWA |
| ✅ | Sheets: nueva cita, detalle/reprogramar, lista de espera, alta de clienta |
| ✅ | Ficha de clienta: pestañas Tratamientos / Medidas / Fotos / Historial |
| ✅ | Ajustes: equipo, catálogo, cierre de sesión, roadmap |
| ✅ | Supabase Realtime en la agenda del día, Hoy y lista de espera |
| ✅ | Cierre de sesión clínico (parámetros y medidas al marcar Hecha) |
| ✅ | Subida de fotos a Storage con compresión en cliente |
| ✅ | Consentimientos RGPD (alta + confirmación en ficha) |
| ✅ | No-show desde Hoy; estado del SMS en la cita |
| ✅ | Bloquear / quitar huecos de agenda |
| ✅ | Recuperar contraseña por email |
| ✅ | Editar catálogo (precio, duración, ocultar) |
| ✅ | Alta/baja de equipo y filtro de agenda por profesional |
| ⬜ | App offline usable (más adelante: agenda del día en local) |
| ⬜ | Voz (Siri / Google / Alexa): ahora solo atajos que abren la PWA |

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

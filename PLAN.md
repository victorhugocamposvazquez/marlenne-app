# Plan de producto — Marlenne

Marlenne es el **nombre comercial** (como Fresha o Booksy), no el nombre de un
centro. Esta app es el producto. Los centros de estética son los clientes.

Documento vivo: lo que hay que tener en cuenta al seguir. Lo urgente del día a
día del primer centro sigue en el `README.md`.

---

## Tres capas

| Capa | Quién la usa | Dónde vive | Estado |
| --- | --- | --- | --- |
| **App del centro** | Recepción y cabina | Esta PWA (Next.js). Más adelante también App Store / Play Store | En curso |
| **Web corporativa** | Quien valora contratar | marlenne.app (o similar): producto, planes, legal, “entrar” | Pendiente |
| **Consola Marlenne** | Tú (plataforma) | Web privada: altas, planes, cobros, pausar cuentas | Pendiente |

Las stores no sustituyen las webs. No sirven para vender el SaaS, dar de alta
un centro ni cobrar. La app del centro **sí** puede usarse también en el
navegador (iPad / Mac de recepción): misma app, otra puerta.

---

## Multi-centro (ya está el gancho)

Cada cita, clienta, servicio y persona del equipo lleva `salon_id`. El RLS
(`my_salon()`) impide que un centro vea el de otro.

Hoy hay un solo tenant de demo, el salón insertado como «Marlenne». Eso es
prototipo. En producción:

- **Marlenne** = marca de la puerta (login, PWA, web comercial, facturas).
- **El centro** = su nombre, logo y colores **dentro** de la agenda.

Faltará en `salons` algo como `logo_url`, `brand_color`, `accent_color`. El
catálogo, el equipo y las clientas siguen siendo de ese centro.

Un subdominio tipo `luz.marlenne.app` es capa extra, no hace falta al
principio.

---

## Cobro por plan (cuando haya segundo centro de pago)

No montarlo mientras solo use el primer centro. Cuando toque:

- Tablas `plans` + `subscriptions` (p. ej. nº de cabinas, SMS, fotos).
- Stripe (o similar): mensual, fallos de pago, facturas.
- Alta de centro: fila en `salons` + primera dirección + catálogo base.
- Límites según plan (2 profesionales en el bajo, etc.).
- Rol de plataforma (`platform_admin`): tú ves todos los centros; ellos no.

Hasta el segundo cliente, un centro nuevo se puede provisionar a mano.

---

## App nativa (más adelante)

La PWA actual es el núcleo. Cuando un centro pida icono en la store:

1. Envolver con Capacitor (o similar) el **mismo** código.
2. Publicar en App Store y Play Store.
3. Seguir ofreciendo la web para recepción.

No publicar en stores hasta que el primer centro la use todos los días.

---

## Offline usable (más adelante)

El service worker de ahora solo sirve para **instalar**. Sin red no hay login,
agenda ni fichas.

Cuando toque: ver y mover el día en local, sincronizar al volver. Es un
proyecto aparte; no mezclarlo con el white-label ni con Stripe.

---

## Asistentes de voz (Siri, Google, Alexa)

Objetivo: recepción o cabina con las manos ocupadas (“cita de Lucía a las
once”, “quién falta”, “no ha venido”). Marlenne es la app del **equipo**, no
un booking para la clienta. La voz habla con el centro, no sustituye a
Fresha/Booksy de cara al público.

### Qué sí y qué no

Por la voz **solo agenda**: ver el día, abrir nueva cita, lista de espera,
marcar Pasa / No vino, preguntar huecos. Nunca fotos, medidas, notas,
consentimientos ni historial. Eso es dato de salud (RGPD art. 9) y el audio
pasa por los servidores de Apple, Google o Amazon.

Misma regla de roles que en la PWA: una profesional solo su columna;
dirección/recepción el centro.

### Cómo encaja cada uno

| Puerta | Qué es hoy | Encaje real |
| --- | --- | --- |
| **Siri** | Atajos (PWA) y, con app nativa, App Intents | La más útil en iPhone/iPad de recepción. “Oye Siri, qué hay hoy en Marlenne.” |
| **Google** | Las Actions conversacionales ya no existen. Quedan atajos de Android y, si hay APK, App Actions | “Ok Google” de terceros está muy cerrado. No diseñar un “skill” tipo 2020. |
| **Alexa** | Skill propia + account linking + certificación | Sirve en un Echo de cabina. Es la que más papeleo tiene y la menos natural para una tablet. |

Las tres tienen que acabar en **las mismas acciones**, no en tres backends.
La PWA ya abre por URL (`/hoy`, `/agenda?new=1`, `/agenda?wait=1`,
`/agenda?appt=`). Eso es el contrato. Siri/Google/Alexa solo son puertas.

### Fases

0. **Ahora (PWA)** — atajos del manifesto y, a mano, Atajos de Siri que abren
   esas URLs. No escriben en la agenda; abren la pantalla.
1. **API de equipo** — las server actions de hoy no sirven para Alexa ni para
   un intent de Siri. Hará falta un endpoint autenticado (sesión o token de
   staff) que cree cita, cambie estado, liste el día. Reutilizar RLS /
   `my_salon()`.
2. **App nativa (Capacitor)** — App Intents (Siri) y shortcuts de Android
   sobre esa API. Coincide con “ficha en stores”.
3. **Alexa** — skill que llama la misma API. Account linking al staff. Solo
   cuando un centro lo pida (altavoz en cabina).

No montar la API ni la skill hasta que el primer centro use la app todos los
días. Si se adelanta, se construye contra aire.

### Acciones (borrador)

- “Qué hay hoy” / “quién está en cabina”
- “Nueva cita” (nombre + hora + servicio; si falta algo, abrir el sheet)
- “Lucía no ha venido”
- “Pasa a cabina”
- “Hueco a las cinco” / “lista de espera”

Confirmación en voz para todo lo que escribe. Un “vale” mal oído no puede
borrar una cita.

---

## Orden de trabajo

1. **Hecho** — pulir la app del centro (primer tenant): no-show, SMS visible
   en ficha, consentimientos con texto, realtime, cierre clínico, fotos, equipo.
2. **Antes de clientas reales** — checklist en Más. A mano: URL de
   `/recuperar` en Supabase, altas públicas off, equipo real, desplegar.
   El seed ya no pisa contraseñas.
3. **Al segundo centro** — nombre/logo/color por salón; provisionar otro
   `salons`.
4. **Al cobrar** — web corporativa + consola + Stripe.
5. **A petición del centro** — ficha en stores.
6. **Cuando duela la red** — offline usable.
7. **Recordatorios SMS** — más adelante, probablemente Labs Mobile. Hay cron
   y `sms_log`; no contratar Twilio.
8. **Voz** — primero atajos que abren la PWA; API de equipo y Siri/Alexa
   cuando el primer centro la use a diario. No skills sueltas por plataforma.

No extraer “framework multi-tenant” ni consola hasta que haga falta. El
esquema actual aguanta muchos centros sin reescribir la agenda.

---

## Qué no hacer ahora

- Mezclar la marca Marlenne con el nombre del centro en la UI interior
  (cuando empiece el white-label, separar; hoy el prototipo puede seguir
  diciendo Marlenne en todos lados).
- Montar Stripe, planes o `/admin` de plataforma.
- App nativa “desde cero” en Swift/Kotlin.
- Offline completo.
- Dominios por centro.
- Contratar Twilio ni cablear Labs Mobile todavía.
- Skill de Alexa, App Intents o “Ok Google” conversacional. Los atajos del
  manifesto sí; el resto espera a la API de equipo.

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

## App en tiendas (va a haber ficha)

No es opcional: Marlenne tendrá icono en **App Store y Play Store**. Eso no
obliga a reescribir. El producto sigue siendo esta PWA.

Camino:

1. **Ahora** — pulir y usar la PWA (iPad de recepción incluido).
2. **Al publicar** — cáscara **óptima**, no un Safari con icono. Play: **TWA**
   (Chrome + cache de PWA). iOS: Capacitor con assets locales o, si el SSR
   lo impide, splash + App-Bound Domains + service worker que cachea el
   shell. Push APNs / Face ID nativos. No un WebView vacío que espera a
   Vercel en cada arranque. Detalle en `.cursor/rules/store-app.mdc`.
3. **Plan B** — React Native / Expo solo si la cáscara no pasa review, no
   llega al listón de rendimiento, o hace falta Siri / micro nativo.

La web de recepción no desaparece: es la misma app por otra puerta.

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

### Techo usable (2026)

Lo más avanzado de verdad no es un “skill” por plataforma. Es **un juego de
herramientas de agenda** (listar día, crear cita, estado, huecos) y que cada
asistente las llame. El diálogo lo pone el modelo de Apple/Amazon/Google; nosotros
ejecutamos y confirmamos.

| Dónde | Techo conversacional | Qué hace falta | Usable para un centro |
| --- | --- | --- | --- |
| **Dentro de Marlenne** (mic en la PWA) | El más alto *ya*: multi-turno, “Lucía no vino”, “pasa”, huecos. Verbos de estética, no de calendario genérico | STT + LLM con tools sobre la API de equipo | **Lo más usable este año** en el iPad, manos ocupadas |
| **Siri / Apple Intelligence** | El más alto *en el sistema*: iOS 27 App Intents + App Schemas. Siri aclara y confirma. Dominio calendario encaja con citas. “No vino” / “pasa” son intents propios (peor routing) | App nativa (Capacitor), App Store, iPhone/iPad con Apple Intelligence | La mejor “Oye Siri…” cuando haya ficha en store |
| **Alexa+** | Bueno en un Echo: Alexa+ habla y llama un **MCP** de esas mismas tools. Account linking al staff | Servidor MCP + Echo + Alexa+ | Cabina con altavoz; no el iPad |
| **Google / Gemini** | Assistant en el móvil **se apaga el 4 sep 2026**. Queda Gemini + App Actions en un APK. No hay “Ok Google, abre Marlenne” tipo 2020 | APK en Play | No diseñar para Assistant. Gemini solo si hay app Android |

No construir tres conversaciones. Construir **una API / MCP** y enchufarla.

Lo que *no* es el techo: Atajos que abren `/hoy`. Eso es el suelo, ya está.

### Fases

0. **Ahora (PWA)** — micrófono / texto: Hoy, huecos, cita (día + profesional),
   pasa, no vino, espera. Si hay `OPENAI_API_KEY`, el modelo usa las mismas
   tools y se puede hablar normal. Atajos de Siri solo abren URLs.
1. **API de equipo (o MCP)** — las server actions de hoy no las puede llamar
   Siri ni Alexa. Mismas tools: crear cita, estado, listar día, huecos.
   Auth de staff + RLS / `my_salon()`.
2. **Voz dentro de la PWA** — mic + esas tools. Es el techo usable sin store.
3. **App nativa** — App Intents / Schemas (Siri) y App Actions (Gemini) sobre
   las mismas tools. Coincide con “ficha en stores”.
4. **Alexa+** — MCP de las mismas tools. Solo si un centro pone un Echo.

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
5. **Ficha en stores** — TWA (Play) + Capacitor (iOS), óptima: cache, splash,
   plugins nativos. React Native solo si eso no basta.
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

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

## Orden de trabajo

1. **Hecho** — pulir la app del centro (primer tenant): no-show, SMS visible,
   consentimientos con texto, realtime, cierre clínico, fotos, equipo.
2. **Antes de clientas reales** — checklist en Más. A mano: URL de
   `/recuperar` en Supabase, altas públicas off, equipo real, Twilio si se
   van a mandar SMS, desplegar. El seed ya no pisa contraseñas.
3. **Al segundo centro** — nombre/logo/color por salón; provisionar otro
   `salons`.
4. **Al cobrar** — web corporativa + consola + Stripe.
5. **A petición del centro** — ficha en stores.
6. **Cuando duela la red** — offline usable.

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

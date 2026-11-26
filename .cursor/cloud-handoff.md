# Cloud → MacBook

Lista viva de lo pedido en **Cursor Cloud** para no perderlo al abrir el repo en el **MacBook**.

**Base de código:** `main` con *citas nueva forma* (`SheetShell`, pasos clienta → servicio → cuándo → confirmar). No reactivar el flujo antiguo del cloud agent salvo que Hugo lo pida.

---

## Pendiente (hazlo en el MacBook o mergea la rama cloud)

- **Leads / Meta, conectar Arlett:** `META_LOGIN_CONFIG_ID` ya está en Vercel y el diálogo de OAuth usa la configuración de Inicio de sesión para empresas. Falta que Hugo pulse Conectar en `https://app.marlenapp.com/ajustes/leads` con el perfil que administra la página de Arlett. Si Meta dice que la URI no es válida, en Configuración de ese producto tiene que estar `https://app.marlenapp.com/api/meta/oauth/callback`. El webhook sigue en `https://marlenne-app.vercel.app/api/meta/leadgen` hasta pasarlo a `https://app.marlenapp.com/api/meta/leadgen` y volver a verificar.
- **Supabase Auth:** Site URL + Redirect URLs → `https://app.marlenapp.com` (y `/**`). Mantener `marlenne-app.vercel.app` un tiempo.
- **Vercel `marlen-website`:** conectar GitHub del monorepo (falló por Login Connection) para deploys automáticos; Root `main-website`.
- Equipo: reinstalar PWA desde `https://app.marlenapp.com`.
- **Marketing:** repensar los iconos de abajo de creatividades (Hugo quiere darle una vuelta; #50 y #51 no le gustaron).

---

## Hecho desde cloud (mergeado o aplicado en main)

- 2026-11-27 — **Leads:** la creatividad del anuncio (p. ej. HIFU) pide la imagen grande a Meta si solo había miniatura. PR #72 → `main`.
- 2026-11-27 — **Leads:** la bandeja ya no se queda en «Actualizando…», abre el detalle y sigue refrescando cada 45 s. PR #71 → `main`.
- 2026-11-27 — **Leads:** al entrar y cada 30 s en la bandeja se refresca la lista. Abrir una ficha no vuelve atrás. PR #70 → `main`.
- 2026-11-27 — **Leads:** abrir una ficha ya no vuelve a la lista. El refresco al entrar sigue, sin pisar la navegación. PR #69 → `main`.
- 2026-11-27 — **Leads:** al entrar en la bandeja se piden los nuevos a Facebook y se refresca la lista. PR #68 → `main`.
- 2026-11-26 — **Leads:** entran solos (la página queda suscrita a Meta, la app abierta los pide cada 45 s y el cron de cada minuto también) y el push sale con cada lead reciente. El botón de Ajustes queda solo para el histórico. PR #67 → `main`.
- 2026-11-26 — **Leads:** etiquetas para elegir (volver a llamar, con día opcional, no responde, no interesado, quiere cita, pensándoselo, número erróneo). PR #66 → `main`. Falta aplicar `supabase/migrations/20261126150000_lead_callback.sql` para que el día se guarde.
- 2026-11-26 — **Clientas:** el fondo de hacer foto, galería y la confirmación de consentimiento deja de cerrarse en círculo. PR #65 → `main`.
- 2026-11-26 — **Clientas:** cada foto va a un tratamiento. Sin cita, se elige el servicio de la misma lista y se abre ese compartimento. Hacer foto queda tan ligero como Galería. PR #64 → `main`.
- 2026-11-26 — **Clientas:** las fotos se guardan en la ficha sin marcar una cita como hecha; PR #63 → `main`. La migración `20261126140000_client_photos.sql` ya no hace falta para esto.
- 2026-11-26 — **Clientas:** la cámara y la galería de las fotos vuelven a abrirse al tocarlas; PR #62 → `main`.
- 2026-11-26 — **Leads:** el fondo de llamado y de WhatsApp en el listado se ve más marcado; PR #61 → `main`.
- 2026-11-25 — **Leads:** bandeja con filtro por campaña, ficha con deshacer y etiquetas del centro, y en Ajustes la admin conecta la página de Facebook; PR #60 → `main`.
- 2026-11-25 — **Leads:** OPS enciende la bandeja por centro; cada lead nuevo avisa con un push que abre esa ficha; PR #59 → `main`.
- 2026-11-20 — **Clientas:** al buscar, X arriba para salir y bajar el teclado; el campo queda como el combobox de Google; PR #58 → `main`.
- 2026-11-20 — **iPhone:** el buscador pasa a un área de una línea, como Google, para no enseñar la barra de subir/bajar/check; PR #57 → `main`.
- 2026-11-07 — **Marketing + Web:** asidero centrado, «Desliza arriba» a la izquierda y «o abajo» a la derecha; PR #56 → `main` (sustituye a #55).
- 2026-11-07 — **Marketing + Web:** degradado y «Más abajo» cuando la hoja tiene más opciones debajo; PR #54 → `main`.
- 2026-11-07 — **Marketing:** barra de abajo como antes (se deshacen #50 y #51 a petición de Hugo); PR #53 → `main`.
- 2026-11-07 — **Web diseño:** asidero en la hoja móvil, igual que marketing; PR #52 → `main`.
- 2026-11-07 — **Marketing:** Ideas abre otras formas y deja el diseño actual quieto hasta Usar esta; PR #49 → `main`.
- 2026-11-06 — **Marketing:** el asidero recorre los altos en proporción, sin salto al extremo; PR #48 → `main`.
- 2026-11-06 — **Marketing:** color propio en antetítulo, titular, subtítulo, precio y botón; PR #47 → `main`.
- 2026-11-06 — **Marketing:** la hoja vuelve al medio al cerrar; flechas en el asidero; PR #46 → `main`.
- 2026-11-06 — **Marketing:** asidero para subir y bajar la hoja (más opciones o preview más grande); PR #45 → `main`.
- 2026-11-06 — **Marketing:** arrastrar la foto para encuadrarla en la creatividad; PR #44 → `main`.
- 2026-11-06 — **Instagram diseño:** Carrusel, Destacado y Cuadrícula aplican a las fotos del perfil; PR #43 → `main`.
- 2026-11-06 — **Instagram usuario:** con @, sin @ o URL; PR #42 → `main`.
- 2026-11-06 — **Web Instagram:** últimas fotos del perfil, solo lectura; PR #41 → `main`.
- 2026-11-06 — **Web Instagram feed:** carga por @usuario (Business Discovery) + mosaico sin Graph; PR #40 → `main`.
- 2026-11-04 — **Marketing:** sin Equipo ni Última hora; PR #39 → `main`.
- 2026-11-04 — **Marketing diseño:** «Selecciona diseño inicial» → Continuar + autoselect al deslizar; PR #38 → `main`.
- 2026-11-04 — **Marketing UX:** pie clienta fijo, tocar diseño → Continuar, creatividades en tira con borrar; PR #37 → `main`.
- 2026-11-04 — **Marketing Enviar PNG:** espera imgs + proxy logo/CORS; PR #36 → `main`.
- 2026-11-04 — **Marketing mobile sin nav:** oculta BottomNav + VoiceFab en `/ajustes/marketing` (PR #35 → `main`).
- 2026-11-03 — **Dominios marlenapp.com:** www/apex → coming soon (`marlen-website`); `app.` → PWA; `panel.` → ops. Envs producción actualizados.
- 2026-11-01 — **Carrusel cambio de semana** + **citas fondo sólido** (nombre blanco), PR #23 → `main`.
- 2026-11-01 — **Animación cambio de semana** en `DayStrip` (flechas + swipe), PR #22 → `main` (supersedido por carrusel #23).
- 2026-09-30 — **Finanzas carga DB:** select como agenda + salon_id + avisos si falla/periodo vacío.
- 2026-09-30 — **Finanzas selección lista:** checks en Todo/Citas/Bonos, facturar por periodo/rango (`af94d6a`, en `main`).
- 2026-09-30 — **Finanzas mobile:** filtros Todo/Citas/Bonos/Facturas sticky + wizard factura overlay (`cdf6edf`, en `main`).
- 2026-09-20 — **Cabecera agenda:** más aire mes/iconos, título 20px, gap 16px (`d68418c`, en `main`).
- 2026-09-20 — **Cabecera agenda:** «Septiembre 2026» sin «de», «Hoy» en segunda fila (`1181db4`, en `main`).
- 2026-09-20 — Archivo handoff + regla `.cursor/cloud-handoff.mdc` (`8c5dea0`, en `main`).

---

## Solo contexto (no son tareas de código)

- Sep 2026: Hugo prefiere **quedarse con lo del MacBook** (`2c352a1` *citas nueva forma*), no re-aplicar pickers/sheet pegado al timeline del cloud agent anterior.
- Sesiones cloud anteriores (sep 8): textos «Elige clienta/e», arrastrar hora, listas visibles, sheet arrastrable — **supersedidos** por *citas nueva forma* en `main`.

---

## Cómo usar este archivo

| Quién | Qué hacer |
|--------|-----------|
| **Cloud agent** | Al terminar un cambio: rama `cursor/…-5156`, PR, y **actualizar «Pendiente»** (o mover a «Hecho» si ya está en `main`). |
| **MacBook / Cursor local** | Al abrir el repo: **leer este archivo primero**. Si hay rama o PR en «Pendiente», continuar ahí antes de otra cosa. |
| **Hugo** | Cuando algo esté en prod, borrar de «Pendiente» o pasarlo a «Hecho». |

**Última actualización:** 2026-11-26 — OAuth de Leads usa la configuración de Facebook Login for Business. Falta conectar Arlett y pasar el webhook a `app.marlenapp.com`.

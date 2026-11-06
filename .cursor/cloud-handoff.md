# Cloud → MacBook

Lista viva de lo pedido en **Cursor Cloud** para no perderlo al abrir el repo en el **MacBook**.

**Base de código:** `main` con *citas nueva forma* (`SheetShell`, pasos clienta → servicio → cuándo → confirmar). No reactivar el flujo antiguo del cloud agent salvo que Hugo lo pida.

---

## Pendiente (hazlo en el MacBook o mergea la rama cloud)

- **Web Instagram fotos:** rama `cursor/web-ig-feed-fotos-5156` — últimas fotos del perfil (embed), sin publicar desde Marlén.
- **Supabase Auth:** Site URL + Redirect URLs → `https://app.marlenapp.com` (y `/**`). Mantener `marlenne-app.vercel.app` un tiempo.
- **Vercel `marlen-website`:** conectar GitHub del monorepo (falló por Login Connection) para deploys automáticos; Root `main-website`.
- Equipo: reinstalar PWA desde `https://app.marlenapp.com`.

---

## Hecho desde cloud (mergeado o aplicado en main)

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

**Última actualización cloud:** 2026-11-06 — web Instagram feed PR #40 → `main`.

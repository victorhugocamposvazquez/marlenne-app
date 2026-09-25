# Panel SaaS · Marlén

Cuadro de mandos del **equipo interno Marlén** (empresas, planes, SMS, pagos, soporte). Proyecto **desacoplado** de [`marlen-app`](../marlen-app/).

**Producción:** [https://marlen-panel-saas.vercel.app](https://marlen-panel-saas.vercel.app) (no confundir con `marlenne-app.vercel.app`, que es la app del salón).

## Arrancar

Desde esta carpeta (`panel-saas/`):

```bash
npm install
npm run dev
```

Abre [http://localhost:3001](http://localhost:3001) · login demo en `/login`.

## Deploy en Vercel (producción)

Segundo proyecto en el **mismo repo** que `marlen-app`:

| Campo | Valor |
|--------|--------|
| Root Directory | `panel-saas` |
| Framework | Next.js |

Variables de entorno en **Production** (copiar los mismos nombres que en `marlen-app`, sin commitear valores):

| Variable | Uso |
|----------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | Misma URL del proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (solo servidor Ops) |
| `NEXT_PUBLIC_APP_URL` | `https://marlenne-app.vercel.app` (app de centro) |

Sin esas dos de Supabase, Arlett y el equipo salen como “No se ha podido leer la base”.

En el proyecto **marlen-app** (producción): `NEXT_PUBLIC_PANEL_URL` = URL pública de este panel.

Tras añadir variables: **Redeploy** del panel (no basta con guardar en el dashboard).

## Estado actual

- **Arlett Beauty** cableada a Supabase (SMS, equipo, Live)
- **Resto de empresas** y KPIs globales: mock
- Login Ops: cookie con el correo que escribes (sin Supabase Auth aún)

## Rutas

| Ruta | Pantalla |
|------|----------|
| `/login` | Entrada equipo |
| `/` | Inicio (KPI + atención) |
| `/empresas` | Listado + filtros |
| `/empresas/[id]` | Ficha con pestañas |
| `/planes` | Planes, bonos, referidos |
| `/sms` | KPI, cola, fallos |
| `/pagos` | Cobros, dunning, Stripe |
| `/finanzas` | Ingresos vs gastos |
| `/servicios` | Estado proveedores |
| `/equipo` | Roles y auditoría soporte |
| `/ajustes` | Config global SaaS |

Pendiente del handoff: modales (alta empresa, editar plan…), drawer «Mi cuenta», modo soporte embebido.

# Panel SaaS · Marlén

Cuadro de mandos del **equipo interno Marlén** (empresas, planes, SMS, pagos, soporte). Proyecto **desacoplado** de [`marlen-app`](../marlen-app/).

## Arrancar

Desde esta carpeta (`panel-saas/`):

```bash
npm install
npm run dev
```

Abre [http://localhost:3001](http://localhost:3001) · login demo en `/login`.

## Deploy (subdominio)

Proyecto Vercel **independiente**, raíz `panel-saas/`:

- Producción sugerida: `ops.marlen.app` o `panel.marlen.app`
- App de centro: `app.marlen.app` (o el dominio actual)

Variables cuando haya backend:

- `NEXT_PUBLIC_APP_URL` — URL de la app de centro (modo soporte)
- `SUPABASE_URL` / claves — si compartís BD (ver `docs/ARCHITECTURE.md`)

## Estado actual

- **UI** según handoff `design_handoff_marlen_agenda 2/panel-saas`
- **Datos mock** (`lib/mock/companies.ts`, 1.152 empresas deterministas)
- **Sin base de datos** ni auth real

## Rutas

| Ruta | Pantalla |
|------|----------|
| `/login` | Entrada equipo |
| `/` | Inicio (KPI + atención) |
| `/empresas` | Listado |
| `/empresas/[id]` | Ficha |
| `/planes`, `/sms`, `/pagos`, … | Placeholder |

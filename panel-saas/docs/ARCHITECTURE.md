# Arquitectura panel ↔ app de centro

## Decisión actual (fase diseño)

- **Dos frontends**, dos deploys, dos subdominios.
- **Mock en panel**; la app de centro (`marlen-app/`) sigue con Supabase multi-tenant (`salon_id`).
- **Migraciones** compartidas en `supabase/` (raíz del monorepo).

## Opciones de datos (futuro)

### A) Base de datos unida (recomendada al inicio de pagos reales)

Un solo Postgres (Supabase):

- `salons` / centros = empresas cliente
- `platform_admins`, `sms_config`, facturación Stripe → esquema `platform` o tablas con prefijo
- RLS: staff ve su `salon_id`; platform admins ven todo vía service role o políticas dedicadas

**Pros:** un solo source of truth, modo soporte trivial, SMS/cron ya multi-centro.  
**Contras:** migraciones compartidas, cuidado con RLS.

### B) Bases separadas

- **Ops DB:** billing, planes, equipo, auditoría soporte
- **Tenant DB:** agenda, clientas, citas (como ahora)

**Pros:** aislamiento fuerte.  
**Contras:** sync de empresas/planes, doble despliegue de migraciones, más latencia en ficha empresa.

## Modo soporte

El panel abre la app de centro con sesión/impersonación registrada (`platform_cron_runs`, log de soporte). URLs:

- Panel: `https://ops.marlen.app`
- Centro: `https://app.marlen.app?soporte=<token>` (por definir)

## Próximos pasos técnicos

1. Fijar subdominio y proyecto Vercel del panel
2. Sustituir mock por API routes en panel **o** lectura directa Supabase (service role)
3. Auth equipo (Supabase Auth + `platform_admins`, 2FA)
4. Retirar rutas `/platform/*` de `marlen-app` → redirect al subdominio

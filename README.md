# Marlén · Monorepo

Producto de agenda para centros de belleza y estética. Repo GitHub: **`marlenne-app`**.

Cada carpeta es una app **independiente** (propio `package.json`, deploy Vercel
propio). La base de datos Supabase (`supabase/`) es **compartida**.

| Carpeta | Qué es | Dev local | Vercel Root Directory |
|---------|--------|-----------|------------------------|
| [`marlen-app/`](./marlen-app/) | App del centro (agenda, clientas, voz) | `:3000` | `marlen-app` |
| [`panel-saas/`](./panel-saas/) | Panel interno (empresas, planes, SMS ops) | `:3001` | `panel-saas` |
| [`main-website/`](./main-website/) | Web corporativa (producto, planes, legal) | `:3002` | `main-website` |
| [`app-nativa/`](./app-nativa/) | Cáscara Capacitor/TWA (futuro) | — | — |
| [`supabase/`](./supabase/) | Migraciones y config Postgres | CLI desde raíz | — |

## Arrancar en local

```bash
# App de centro
cd marlen-app && npm install && npm run dev

# Panel ops (otra terminal)
cd panel-saas && npm install && npm run dev

# Web corporativa (otra terminal)
cd main-website && npm install && npm run dev
```

## Supabase

```bash
# Desde la raíz del repo
supabase link --project-ref <ref>
supabase db push
```

## Deploy Vercel

Tres proyectos apuntando al **mismo repo**, cada uno con su Root Directory:

| Proyecto | Root | Dominio sugerido |
|----------|------|------------------|
| Marlén app | `marlen-app` | `app.marlen.app` |
| Panel ops | `panel-saas` | `ops.marlen.app` |
| Web | `main-website` | `marlen.app` |

Tras mover `marlen-app/`, actualiza el proyecto Vercel existente: **Settings →
General → Root Directory → `marlen-app`**.

En prod de `marlen-app`: `NEXT_PUBLIC_PANEL_URL=https://ops.marlen.app`.

## Roadmap apps

- **marlen-app** — PWA Next.js + Supabase (producto principal).
- **panel-saas** — equipo interno Marlén; mock → BD compartida.
- **main-website** — marketing y captación; Next estático/SSR ligero.
- **app-nativa** — Capacitor (iOS) + TWA (Android) sobre la PWA; ver
  [`app-nativa/README.md`](./app-nativa/README.md).

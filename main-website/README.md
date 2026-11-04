# Marlén · Web corporativa

Marketing, planes, legal y enlace «Entrar» hacia la PWA. Proyecto Next.js
independiente (`main-website/`).

## Dominios

| Host | Destino |
|------|---------|
| `www.marlenapp.com` | esta web (coming soon → site completo) |
| `marlenapp.com` | redirect → `www.marlenapp.com` |
| `app.marlenapp.com` | PWA (`marlen-app`) |
| `panel.marlenapp.com` | Ops (`panel-saas`) |

## Arrancar

```bash
cd main-website
npm install
cp .env.example .env.local
npm run dev
```

Abre [http://localhost:3002](http://localhost:3002).

## Deploy

Proyecto Vercel `marlen-website`, Root Directory `main-website`.
Env de producción: `NEXT_PUBLIC_APP_URL=https://app.marlenapp.com`.

## Brief para diseñar la web

Handoff con marca, funciones (incluye fichaje), capturas y criterios:
[`brief-corporativa/BRIEF-WEB-CORPORATIVA.md`](./brief-corporativa/BRIEF-WEB-CORPORATIVA.md).

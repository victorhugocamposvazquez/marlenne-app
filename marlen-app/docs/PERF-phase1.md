# Fase 1 — Quick wins (rendimiento)

Objetivo: menos JS en rutas calientes sin cambiar arquitectura. Reversible por PR.

## Hecho (2026-11-27)

| Cambio | Efecto |
| --- | --- |
| `xlsx` con `import()` en `lib/import-file.ts` | No entra en bundles fuera de importar Excel |
| `html-to-image` con `import()` en `nodeToPng` | Marketing carga el exportador solo al generar PNG |
| `MarketingStudio` con `next/dynamic` | Pestaña marketing no arrastra el estudio al primer paint |
| Pestañas Medidas / Fotos / Historial en ficha con `dynamic` | Menos JS al abrir ficha (Tratamientos sigue estático) |
| Una sola `router.refresh()` tras subir foto | `useTreatmentPhoto` delega en `onUploaded` |
| Voz fuera del SW y UI | `NEXT_PUBLIC_VOICE_UI` sin `1` oculta ChatHost; `sw.js` sin precache de clips |

## Cómo medir (Fase 0 lite)

```bash
cd marlen-app
npm run build
# Revisar salida "First Load JS" de /clientas/[id], /agenda, /leads
```

En prod: Vercel → Speed Insights / Web Vitals en iPad recepción.

## Pendiente Fase 1 (siguiente PR)

- [ ] `next/dynamic` en `CsvImportCard` en página importar (redundante si xlsx ya es lazy; bajo prioridad)
- [x] Precache de voz en `public/sw.js` (quitado; los clips solo si `NEXT_PUBLIC_VOICE_UI=1`)
- [ ] Evitar doble fetch `listStaff` layout + agenda (cache o pasar por contexto)
- [ ] Bundle analyzer puntual: `npx @next/bundle-analyzer` (dev)

## No tocar aún (Fase 2+)

- Refactor global de `router.refresh()` / revalidate fina
- Cambios de SW para tienda nativa (Fase 3)
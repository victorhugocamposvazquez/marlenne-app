# Marlén · App nativa (futuro)

Cáscara **Capacitor** (iOS) + **TWA** (Android) sobre la PWA de [`marlen-app`](../marlen-app/).
No es un segundo producto: el binario carga la misma agenda, login y voz.

## Cuándo montarlo

- Al preparar ficha en App Store / Play Store.
- Cuando haga falta push nativo (APNs), Face ID o splash offline de verdad.

## Qué irá aquí (plan)

```
app-nativa/
  android/          # TWA + Digital Asset Links
  ios/              # Capacitor + WKWebView
  capacitor.config  # server.url → app.marlen.app (prod)
```

## Qué no hacer

- Reescribir pantallas en React Native (plan B solo si Apple rechaza la cáscara).
- Publicar un WebView vacío que carga la URL en frío.

Ver reglas del repo: `.cursor/rules/store-app.mdc`.

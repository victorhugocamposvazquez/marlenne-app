# Paquete para otra IA

Código copiado el 2026-11-20 desde `marlen-app/`. No es el repo. Los originales siguen en su sitio.

No hay `database.types.ts` generado. El esquema actual de citas, clientas, servicios y bonos está en `07-ESQUEMA.md`.

El comportamiento del chat (qué hace y qué no) está en `../CHAT-AHORA.md`. `../CHAT.md` es el diseño deseado, no este código.

| Archivo | Origen |
| --- | --- |
| `01-lib-chat-api.ts` | `lib/chat/api.ts` |
| `02-lib-voice.ts` | `lib/voice.ts` (`parseVoice` al final del archivo) |
| `03-app-actions-voice.ts` | `app/actions/voice.ts` |
| `04-app-actions-voice-talk.ts` | `app/actions/voice-talk.ts` |
| `05-ChatHost.tsx` | `components/chat/ChatHost.tsx` |
| `06-NewClientSheet.tsx` | `components/clienta/NewClientSheet.tsx` |
| `07-ESQUEMA.md` | Tablas reconstruidas desde `supabase/migrations/` |

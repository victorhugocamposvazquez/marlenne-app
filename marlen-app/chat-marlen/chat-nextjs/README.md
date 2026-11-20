# Chat de Marlén — Next.js

Panel del chat listo para App Router. Sin dependencias externas (solo React); estilos inline con los tokens de marlén. Sigue el mismo formato que las otras entregas (`personal-tareas-nextjs`, `finanzas-nextjs`).

Va con dos documentos:

- `chat-marlen.md`: qué entiende el chat, qué pregunta y qué guarda.
- `chat-marlen-ui.md`: diseño y comportamiento de cada bloque, con criterios de aceptación.

## Archivos

| Archivo | Qué es |
| --- | --- |
| `MarlenChat.tsx` | El panel. Es lo que se queda en la app. Exporta el componente, los tokens (`T`, `GRAD`) y todos los tipos. |
| `MarlenChatDemo.tsx` | Demo con datos de mentira: una API falsa, una voz falsa y una agenda de fondo. Se borra al integrar. |
| `page.tsx` | Monta la demo. |

## Instalación

1. Copia los tres archivos a `app/chat-demo/`.
2. Fuente Sora en `app/layout.tsx` con `next/font`, como en el resto de la app:
```tsx
import { Sora } from "next/font/google";
const sora = Sora({ subsets: ["latin"], weight: ["400", "600", "700"] });
// <body className={sora.className}>
```
3. Abre `/chat-demo`.

## Qué incluye

Todo lo de `chat-marlen-ui.md` hasta la mejora 7:

- Panel: hoja en móvil con dos alturas (alta y media) y columna lateral de 400 px desde 768 px.
- Inicio «¿Qué deseas?» con filas según el momento (mejora 3) y frases de ejemplo.
- Escuchando: frase en grande y fichas de lo que va entendiendo.
- Pregunta con respuestas: fichas, personas («la del 331») y selector de huecos.
- Selector de huecos con tira del día, cambio de día y de profesional, y «Más huecos» (mejora 6).
- Propuesta editable en el sitio: cada dato se toca y se cambia sin otro turno (mejora 1). El Sí queda pegado abajo.
- Tarjeta de salida: cerrar, cobrar, próxima cita y WhatsApp en un sí (mejora 2).
- Guardado directo con «Deshacer» y cuenta atrás de 5 s (mejora 4).
- Cita fantasma: el panel avisa con `onGhost` y baja a altura media (mejora 5).
- Listas con botón por fila; las acciones directas actualizan la fila en el sitio (mejora 7).
- Total de caja, vista previa de plantilla, aviso de Marlén y errores (sin conexión, conflicto, papeles, no entendido).

## Frases que entiende la demo

La demo es un guion, no entiende de verdad. Prueba:

- `Lucía martes 5 facial` → propuesta con cita fantasma. Toca la fecha, el servicio o «Ana».
- `Cita a Lucía el jueves por la tarde` → pregunta de hora con huecos.
- `Cita a Lucía` → cuál de las dos.
- `Ciérrala` o la primera fila del inicio → tarjeta de salida.
- `Lucía Pérez pasa a cabina` → guardado directo con deshacer.
- `Qué tareas hay`, `Quién falta por cobrar`, `Cuánto hemos hecho hoy` → listas y total.
- `Plantilla WhatsApp` → vista previa; luego «De usted», «Aún más corto».
- `El facial cuesta 45` → «Eso lo hace dirección.»
- `Sí` sin nada abierto → «¿El sí de qué?»
- El micrófono simula un dictado.

## Integración real

El panel no sabe nada del negocio. Pinta los bloques (`Block`) que devuelve `api` y manda lo que la persona dice o toca.

```tsx
<MarlenChat
  open={open}
  onClose={() => setOpen(false)}
  api={api}                // implementa ChatApi
  screen={{ route: pathname, title: "Agenda", citaId, clientaId }}
  voice={voice}            // opcional: implementa VoiceAdapter
  onGhost={setGhost}       // la agenda pinta la cita fantasma
  onNavigate={router.push} // abrir una pantalla sin cerrar el panel
/>
```

1. Implementa `ChatApi` (está tipada en `MarlenChat.tsx`): `start`, `turn`, `patchPreview`, `confirm`, `cancel`, `undo`. Puede ser con rutas, acciones de servidor o RPC; al panel le da igual.
2. Todo lo que guarda se decide en el servidor: caducidad de la propuesta, recomprobar el hueco, papeles, lista cerrada de lo que va sin sí, idempotencia. El panel no esconde nada por papel: pinta lo que llega.
3. `turn` recibe una frase o una acción ya resuelta (`{ intent, args }`). Un «sí» escrito o dicho llega como frase: el servidor decide si hay algo que confirmar. El botón Sí llama a `confirm(previewId)`.
4. `patchPreview` devuelve el bloque entero (propuesta o tarjeta de salida) con un `previewId` nuevo.
5. La voz: adapta lo que ya hay en `lib/voice.ts` a `VoiceAdapter` (`start(onPartial, onFinal)` devuelve la función de parar).
6. La cita fantasma: guarda el `Ghost` que llega por `onGhost` en el estado que comparta con la agenda y píntalo como en `DemoAgenda` (borde punteado, «por confirmar», rojo si pisa algo).
7. En `MarlenChatDemo.tsx`, `TODAY` fija la fecha de la demo (20/11/2026).

## Lo que no hace todavía

- El asa cambia de altura con un toque. No se arrastra.
- Tocar un hueco de la agenda con la propuesta abierta no cambia la hora: hay que hacerlo en la agenda real y llamar a `patchPreview`.
- El aviso de Marlén con el panel cerrado (la banda sobre la barra inferior) va fuera del panel y no está.
- Mejoras 8 a 11 (autocompletar, modo mostrador, caducidad visible, «Hecho hoy»).

## Comprobado

- Compila con TypeScript estricto (React 18).
- La demo se ha abierto en un navegador a 390 px y se han recorrido propuesta, cambio de hora, guardado, tarjeta de salida, lista, guardado directo y plantilla.
- No se ha probado dentro de un proyecto Next.js ni en la disposición de tableta y escritorio.

# Chat de Marlén — lo que hace el código hoy

Fecha: 2026-11-20.

Este archivo describe la implementación actual. No es el producto.

`CHAT.md` y `chat-marlen/` son el diseño deseado (ficha, bonos, caja, cobros, tareas, catálogo, clienta fijada, fantasma en la agenda). Casi nada de eso está conectado. Si una frase de `CHAT.md` no aparece aquí, el chat no la hace.

Hugo: el trabajo pasa dentro del panel. No navegues a una pantalla por detrás del chat ni escribas «lo tienes debajo».

## Archivos

| Pieza | Ruta | Qué es |
| --- | --- | --- |
| Panel | `components/chat/MarlenChat.tsx` | UI. No sabe de negocio. Pinta `Block` y llama a `ChatApi`. |
| Host | `components/chat/ChatHost.tsx` | FAB, abre/cierra, pasa ruta y rol. Montado en `PhoneShell` y `WideShell`. |
| Cerebro | `lib/chat/api.ts` | `createMarlenChatApi`. Única lógica del chat. |
| Voz del panel | `lib/chat/voice-adapter.ts` | Micrófono vía `pickEngine`. |
| Parser | `lib/voice.ts` `parseVoice` | Diccionario local. Va antes que la nube. |
| Acciones | `app/actions/voice.ts` | Hoy, huecos, preview y confirmación de agenda. |
| Nube | `app/actions/voice-talk.ts` `voiceTalk` | Solo si el parser devuelve `unknown`. |
| Alta | `components/clienta/NewClientSheet.tsx` | Modal de ficha. El shell lo monta si `?alta=1`. |
| Servicios del buscador | `app/actions/services.ts` `listChatServices` | Nombre + minutos. No categorías. |

En `/ajustes/marketing` el host no pinta nada.

## Cómo se abre

Botón redondo abajo a la derecha (el que era la voz). El panel sube encima de la pantalla y no se cierra al contestar.

- Móvil: casi toda la altura, o media si hay cita fantasma (el chat no manda fantasmas).
- Ancho ≥ 960 px: columna de 400 px a la derecha.
- Cerrar (X) para el micrófono y los turnos en vuelo. No borra la conversación.
- «Empezar de nuevo» está encima del campo de texto cuando ya hay mensajes. Vacía el hilo. Eso vuelve a llamar a `start()`, que borra el estado de módulo.
- Turno: 20 s y corta. Micrófono: 45 s y corta.
- Mientras piensa o guarda, no acepta otro envío.

El texto de Marlén va a 15–17 px. La pregunta del inicio, «¿Qué deseas?», a 26 px. No uses titulares de 20–34 px en las respuestas.

## Lo que ignora

`turn(input, ctx, fixed, uttered)` recibe la pantalla y la clienta fijada del panel y no las usa. `ctx.citaId` y `ctx.clientaId` no cambian el inicio ni la frase. `fixed` (la pastilla de clienta del panel) no se rellena nunca desde esta API.

`patchPreview` responde «Para cambiarlo, dilo otra vez o ábrelo en la agenda.» y no cambia la propuesta.

`undo` responde «Eso ya no se puede deshacer desde aquí.»

`screen` solo marca la fila «Qué hay hoy» si la ruta empieza por `/hoy`, y el título del panel no se enseña.

## Estado de módulo

Vive en variables del archivo, no en React. Sobrevive a cerrar el panel. Se borra en `start()` (hilo vacío) y en «no» / «para».

- `pending`: una propuesta esperando el botón Sí. Claves `p{n}-{timestamp}`. Caduca a los 2 minutos solo en el objeto; el mapa no la tira solo.
- `bookHold`: `PendingBook` de la voz. La siguiente frase rellena el dato que falta.
- `askNext`: `'book'` o `'find'` cuando se ha pedido un nombre y aún no hay borrador.

Un comando que el parser entiende (`kind` distinto de `unknown` y de `chat`) borra `bookHold` y `askNext` antes de ejecutarse. Una frase a medias se pierde si el usuario dice otra orden.

## Orden de una frase

`runAgendaPhrase`:

1. Vacío → «Dime qué necesitas.»
2. `no`, `para`, `nada`, `olvídalo`, `déjalo` → borra el hilo de módulo y dice «Vale, lo dejo.»
3. `sí`, `vale`, `hazlo`, `dale`, `ok`, `adelante`, `guárdalo`, `apúntala`, `de acuerdo`:
   - hay una sola propuesta → la guarda;
   - si no, y `bookHold.need === 'client'` → trata la frase como «Es nueva»;
   - si no → «¿El sí de qué?»
4. `parseVoice`. Si entiende la orden, la ejecuta y no llama a la nube.
5. Si no la entiende:
   - `askNext === 'book'` → `voicePreviewBook(frase, sin hora, sin servicio, hoy)`;
   - `askNext === 'find'` → `voiceFind`;
   - hay `bookHold` → `resumeBook` (rellena clienta, servicio, profesional u hora);
   - si no, `voiceTalk`. Si la nube contesta con texto, pending, ready o matches, se pinta. Si no, error con tres botones: Cita nueva, Qué hay hoy, Quién sigue.

La nube no debe ir primero. «Cita nueva» pasaba por `voiceTalk`, se buscaba como clienta y respondía que no estaba en fichas.

## Inicio

Cuatro filas como máximo (el panel corta en 4):

| Fila | Quién | Qué manda |
| --- | --- | --- |
| Qué hay hoy | todas | `{ intent: 'hoy' }` |
| Quién sigue | todas | `{ intent: 'next' }` |
| Cita nueva | todas | la frase `Cita nueva` |
| Buscar clienta | no cabina (`provider`) | `{ intent: 'clienta_buscar' }` |
| Tareas | todas, y en cabina ocupa el cuarto puesto | `{ intent: 'tareas' }` |

Ejemplos bajo el inicio: «Quién sigue», «Huecos esta tarde», «Pasa a Lucía a cabina». Se envían como frase.

Cabina no ve «Buscar clienta». Entonces las cuatro filas son hoy, quién sigue, cita nueva y tareas.

## Intenciones que el panel manda

| `intent` o frase | Qué hace |
| --- | --- |
| `hoy` | `voiceToday`. Texto con el resumen. |
| `next` | `voiceNext`. Texto. |
| `Cita nueva` / `nueva cita` / `cita nueva` | El parser es `go` a `/agenda?new=1`. El chat no abre la agenda. Pregunta «¿Para quién es la cita?» y deja `askNext = 'book'`. |
| `clienta_buscar` | «¿A quién buscas?» y `askNext = 'find'`. |
| `tareas` o «abre tareas» | «Las tareas todavía no las llevo desde aquí.» No abre `/tareas`. |
| `go` a otra ruta | «Dime qué quieres hacer y lo hago aquí: una cita, el día o una clienta.» No hace `router.push`. |
| `answer` | La etiqueta que tocó la persona (`uttered`), no el id. Entra en `runAgendaPhrase`. |

`onNavigate` solo se usa para `?alta=1&nombre=…` (modal de ficha, `shallowSet`, sin cambiar de ruta). Un href normal haría `router.push`, pero el cerebro ya no lo llama al contestar.

## Qué entiende el parser y cómo se pinta

El parser es el de la voz (`lib/voice.ts`). El chat no tiene otro.

| `kind` | Acción | Pintura |
| --- | --- | --- |
| `today` | `voiceToday` | Texto. |
| `next` | `voiceNext` | Texto. |
| `slots` | `voiceSlots` | Texto (horas libres). No crea cita. |
| `find` | `voiceFind` | Texto. Si hay varias, lista de personas. |
| `waiting` | `voiceWaiting` | Texto. Nota en la cita de hoy. No pide sí. |
| `wait` | `voicePreviewWait` | Texto o lista. No confirma el alta en espera con botón Sí: no hay propuesta de espera. |
| `status` | `voicePreviewStatus` | Si el texto trae «¿Lo marco?», «cabina» o «no vino» y hay una sola cita, propuesta «¿Lo marco?». Si no, solo el texto. |
| `late` | `voiceLate` | Escribe la nota ya. No pide sí. |
| `book` | `voicePreviewBook` | Ver cita nueva. |
| `cancel` | `voicePreviewCancel` | Una cita y `ready` → propuesta «¿La cancelo?». Varias → lista. |
| `move` | `voicePreviewMove` | Si `ready`, hay `move` y el draft tiene `id` → propuesta «¿La muevo?». |
| `go` | `handleGo` | No abre la pantalla. Ver tabla de arriba. |
| `help` | texto fijo | Día, huecos, cita, cabina, no vino, espera. |
| `chat` | el `say` del parser | Charla de mostrador. No toca la agenda. |
| `dismiss` | reset | «Vale, lo dejo.» |
| `same` | `voiceFind` | No repite el último servicio. El comentario del producto no está hecho. |
| `search` | cae en `default` | El parser sabe buscar ficha. El chat no tiene `case` y lo trata como frase no entendida, o como nombre si hay `askNext`. |

Días: «el lunes siguiente» y «el lunes que viene» son el próximo ese día, no parte del nombre. «Piti» no es «Pitita»: si al token le sobran 2 letras o más, es parecida (`similar`), no la misma persona. Entonces se ofrece «Es nueva».

## Cita nueva, paso a paso

`voicePreviewBook` pregunta de una en una: clienta, servicio, hora, profesional si hace falta.

El chat guarda ese `pending` en `bookHold` y la frase siguiente rellena el campo:

- clienta: el texto, salvo «es nueva», «ninguna», «sí» o «vale» en ese paso;
- servicio: el texto entero;
- profesional: el texto;
- hora: `takeTime` / `parseClock`, o la ficha si coincide con `choices` y hay `slotMins`.

Pintura:

- Varias clientas → filas con nombre (`people`). `allowNew` está en false: no hay botón «es nueva» en esa lista. Hay que decirlo.
- Nadie → «¿La doy de alta?» y ficha «Es nueva».
- Parecida → fichas con los nombres y «Es nueva».
- Servicio sin lista cerrada (la voz manda categorías) → el chat ignora las categorías y pone un buscador con `listChatServices` (nombre y minutos). Vacío enseña 8; al escribir, hasta 12. Más de 6 opciones de servicio concretas → el mismo buscador, solo con esas opciones. Seis o menos → fichas.
- Hora y profesional → fichas.
- Cuando `ready` y hay `draft` y `book` → tarjeta «¿La apunto?» con clienta, servicio, fecha ISO y hora. Los campos no se editan (`editable: false`).

Sí en la tarjeta llama a `confirm` → `voiceConfirmBook`. Si el draft no tiene `clientId` pero tiene `clientName`, la acción crea la ficha con el nombre y el teléfono del draft y luego la cita. En el flujo del chat, una clienta nueva no llega a ese draft: se abre el modal antes.

No en la tarjeta borra el `previewId` y dice «No se ha guardado.» No borra `bookHold` (en ese momento la propuesta ya sustituyó al hold).

## Clienta nueva

Si el preview pide teléfono y `newClient`:

1. Borra `bookHold` y `askNext`.
2. `shallowSet({ alta: '1', nombre })` con el nombre en mayúscula inicial.
3. Texto: «{Nombre} no está en fichas. Te abro el alta: ahí va el teléfono y se guarda.»

El modal es `NewClientSheet`, montado en los dos shells cuando `alta=1`. El nombre llega por `nombre`. Teléfono, email, VIP y consentimientos son los del alta normal. «Crear y dar cita» guarda y hace `router.push('/agenda?new=1&client={id}')`, que es el formulario de cita de la agenda, no la continuación del chat. El día y la hora que ya se habían dicho se pierden.

El aviso «¿Ya está en la base?» de ese modal solo lista coincidencias con `scoreClient` ≥ 80, o el mismo teléfono. «Piti» no enseña «Pitita».

## Confirmar

| Propuesta | Guarda con | Resultado |
| --- | --- | --- |
| Cita | `voiceConfirmBook(draft)` | Tarjeta «Apuntada» o «No se ha guardado». Sin botón Ver. |
| Cabina / no vino | `voiceApplyStatus` | Texto y un deshacer que no deshace. |
| Cancelar | `voiceApplyCancel` | Igual. |
| Mover | `voiceApplyMove` | Igual. |

Un «sí» escrito solo confirma si hay exactamente una entrada en `pending`. Cero o dos → «¿El sí de qué?».

## Buscar clienta

El botón pregunta el nombre. La frase siguiente va a `voiceFind`: cita de hoy, o ficha sin cita, o varias, o nadie. No abre la ficha. No fija la clienta. No sigue con un verbo.

## Lo que no está

Todo lo de `CHAT.md` que no salga arriba. En concreto no hay:

- clienta fijada ni «para» que suelte la ficha (el «para» borra todo el borrador);
- ficha: teléfono, email, VIP, nota, abrir ficha;
- cobro, cierre de cita, bono, tareas de verdad, caja, bloqueo, catálogo, equipo, ajustes, WhatsApp;
- cita fantasma en la agenda (`onGhost` no se pasa);
- editar un campo de la propuesta;
- deshacer;
- «lo mismo que la última vez» como cita;
- lista de espera con sí;
- papeles más allá de ocultar «Buscar clienta» a cabina;
- usar la cita o la clienta que ya está en pantalla.

## Fallos que siguen en este código

- El estado es global al módulo. Dos paneles compartirían el mismo borrador. Solo hay uno.
- `start()` borra el borrador cada vez que el hilo visual está vacío. Cerrar no vacía el hilo; «Empezar de nuevo» sí, y entonces se pierde la cita a medias.
- Un «no» a mitad de una pregunta también borra el borrador, porque `isNo` corre antes de `bookHold`.
- Pasar a cabina solo enseña el Sí si el texto de la voz coincide con esa expresión regular. Si la frase cambia, se ve el texto y no se puede confirmar.
- La espera y el retraso se escriben sin Sí.
- `same` busca la clienta y no monta la cita.
- El buscador de servicios, al tocar, manda el nombre como frase nueva. Si `bookHold` sigue en `need: 'service'`, `resumeBook` lo usa. Si un comando del parser se cuela en el nombre, se borra el hold.
- Tras crear la ficha en el modal, la cita no sigue en el chat.
- La propuesta enseña la fecha como `YYYY-MM-DD`.
- La nube, cuando entra, no recibe el historial del chat. Cada frase va sola.

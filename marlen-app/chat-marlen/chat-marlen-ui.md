# Chat de Marlén — interfaz (entrega para Cursor)

Fecha: 2026-11-20.

Este documento dice cómo se ve y cómo se comporta el panel del chat. Va con otros dos:

- `chat-marlen.md`: qué entiende el chat, qué pregunta y qué guarda. Manda en todo lo que sea conversación, papeles y reglas.
- Lienzo «Chat de Marlén»: las nueve pantallas base dibujadas (inicio, escuchando, pregunta con opciones, cuál de las dos, propuesta, guardado, cerrar y cobrar, plantilla de WhatsApp, cortes).

Aquí se describen esas pantallas como componentes y se añaden siete mejoras que todavía no están dibujadas. Cada una lleva su número para poder citarla:

1. Propuesta editable en el sitio.
2. Salida de la clienta en una tarjeta.
3. Inicio según el momento.
4. Lo reversible se guarda sin sí, con deshacer.
5. La cita fantasma en la agenda.
6. Huecos con contexto.
7. Listas que se pueden usar.

Quedan para la siguiente entrega: autocompletar al escribir (8), modo mostrador (9), caducidad visible (10) y «Hecho hoy» (11).

Notas para quien lo implemente:

- Los nombres de componentes, tipos y rutas de API son una propuesta. Si el repositorio ya tiene una convención, se sigue la del repositorio.
- No se inventan datos. Los ejemplos (Lucía Pérez, Ana, facial de 50 min) son de relleno.
- Todo el texto de Marlén sale de `chat-marlen.md`. Aquí solo se repite cuando hace falta para entender la pantalla.

---

## 1. Estilo

### Colores

| Token | Valor | Uso |
| --- | --- | --- |
| `--ink` | `#0F0E1A` | Texto principal, botón Sí |
| `--ink-2` | `#4A4758` | Texto secundario sobre gris |
| `--mute` | `#6E6B7B` | Texto secundario sobre blanco, etiquetas |
| `--faint` | `#9A97A8` | Solo bordes punteados e iconos apagados. Nunca texto |
| `--line` | `#E6E5EC` | Bordes de tarjetas y campos |
| `--surface` | `#FFFFFF` | Fondo del panel y tarjetas |
| `--surface-2` | `#F7F7FA` | Campo de texto, filas dentro de tarjeta |
| `--surface-3` | `#F2F2F7` | Burbuja de la persona, botones secundarios, fichas |
| `--behind` | `#DDDCE4` | Velo sobre la pantalla de detrás |
| `--brand-a` | `#d000a8` | Inicio del degradado |
| `--brand-b` | `#0879ff` | Fin del degradado |
| `--assumed-bg` | `#FDF0FA` | Fondo de la marca «supuesto» |
| `--assumed-fg` | `#B0088E` | Texto de la marca «supuesto» |
| `--ok-bg` | `#E7F7EE` | Tarjeta de guardado, vista previa de WhatsApp |
| `--ok` | `#0B7A40` | Círculo del visto |
| `--ok-fg` | `#0B4F2B` | Texto sobre `--ok-bg` |
| `--bad-bg` | `#FFF1F4` | Tarjeta de error |
| `--bad` | `#B3123B` | Círculo del error, borde de conflicto |
| `--bad-fg` | `#7A0C28` | Texto sobre `--bad-bg` |

Degradado de marca: `linear-gradient(135deg, var(--brand-a), var(--brand-b))`. Solo en dos sitios: la marca redonda de la cabecera y el botón del micrófono. El botón Sí es `--ink`, no degradado.

Todo texto cumple contraste 4,5:1. Por eso `--faint` no se usa en texto.

### Tipografía

Sora (400, 600, 700). La misma del resto de la app.

| Estilo | Tamaño / peso | Uso |
| --- | --- | --- |
| `display` | 34 / 700, interlineado 1,15, tracking −0,02em | «¿Qué deseas?» |
| `live` | 28 / 600, interlineado 1,25 | Frase mientras se habla |
| `title` | 26 / 700 | Fecha de la propuesta |
| `question` | 22–24 / 700 | Pregunta de Marlén, «¿La apunto?» |
| `value` | 16–17 / 600 | Valores de la propuesta, botones |
| `body` | 15 / 400, interlineado 1,4 | Burbuja de la persona, texto de apoyo |
| `label` | 13 / 600 | Etiquetas en `--mute` |
| `tag` | 12 / 600 | Marca «supuesto» |

### Formas y medidas

- Radios: panel 28 arriba; tarjetas 22; filas y botones cuadrados 16–18; píldoras 99.
- Burbuja de la persona: radio 20, con la esquina inferior derecha en 6.
- Zona táctil mínima 44 px. Botón Sí 56 de alto. Micrófono 52 (64 mientras escucha).
- Margen lateral del cuerpo 20. Separación entre bloques 14–18.
- Sin sombras en las tarjetas: borde de 1 px en `--line`.

### Movimiento

- El panel sube en 220 ms, `cubic-bezier(.2,.8,.2,1)`.
- Un bloque nuevo entra con 8 px de desplazamiento y opacidad, 160 ms.
- Un dato de la propuesta que cambia parpadea una vez su fondo en `--assumed-bg`, 400 ms.
- Con `prefers-reduced-motion`, solo opacidad.

---

## 2. El panel

### Móvil (menos de 768 px)

Hoja que sube desde abajo sobre la pantalla en la que se esté. La pantalla de detrás se sigue viendo arriba, apagada con `--behind`.

```
┌──────────────────────────────┐
│ Agenda · mar 24 nov          │ ← pantalla de detrás (56 px visibles)
├──────────────────────────────┤ ← radio 28
│            ▬▬                │ ← asa
│ ● Marlén      [Lucía Pérez] ✕│ ← cabecera
│                              │
│   (bloques, pegados abajo)   │ ← cuerpo, con scroll
│                              │
│ [ Escribe o habla…      ] (🎤)│ ← barra
└──────────────────────────────┘
```

Dos alturas:

- **Alta**: deja 56 px de la pantalla de detrás. Es la normal.
- **Media**: ocupa el 55 % de la pantalla. Se pasa sola a media cuando hay una cita fantasma que enseñar (mejora 5). Se cambia arrastrando el asa.

Arrastrar hacia abajo desde media cierra el panel. Cerrar no borra la conversación ni suelta a la clienta mientras no pasen los tiempos de `chat-marlen.md`.

### Tableta y escritorio (768 px o más)

Columna a la derecha de 400 px, de arriba abajo, sin velo. La pantalla de detrás se estrecha y sigue siendo usable. No hay alturas ni asa. El contenido es el mismo.

### Cabecera

- Marca redonda de 28 px con el degradado y «Marlén».
- Ficha de la clienta fijada, si la hay: punto en `--brand-a` y nombre con apellido. Tocarla abre la ficha (cabina no la tiene). Una ✕ pequeña dentro la suelta.
- Botón de cerrar, 44 px, `aria-label="Cerrar el chat"`.

### Cuerpo

Lista de bloques pegada abajo: lo último queda junto a la barra. Lo antiguo se va hacia arriba y se puede subir a verlo.

- Lo que dice la persona va en burbuja gris a la derecha. Lo ya contestado se apaga a `--mute`.
- Lo que dice Marlén va sin burbuja, a la izquierda, en grande.
- Solo el último bloque de Marlén tiene botones vivos. Los anteriores se quedan como texto.

### Barra

- Campo de texto, 52 de alto, píldora, fondo `--surface-2`. El texto de ayuda cambia con lo que se espera: «Escribe o habla…», «O di la hora…», «"Sí", o "mejor a las seis"…».
- Micrófono, 52 px, degradado. Mientras escucha, la barra se sustituye por: cancelar (✕), onda, y parar (64 px).
- Enviar con Intro. No hay botón de enviar aparte: si hay texto, el micrófono se convierte en flecha de enviar.

---

## 3. Estados del panel

```
reposo ──habla/escribe──▶ escuchando ──fin──▶ pensando
                                               │
        ┌──────────────┬───────────────┬───────┴────────┬─────────────┐
        ▼              ▼               ▼                ▼             ▼
    respuesta      pregunta        propuesta        directo        error
    (texto/lista)  (opciones)      (espera sí)      (ya guardado)
                       │               │                │
                       └──contesta──▶ pensando     deshacer 5 s
                                       │
                                  sí ─▶ guardando ─▶ guardado ─▶ reposo
                                  no ─▶ reposo
                                  edita un dato ─▶ propuesta (nueva)
```

- **pensando**: tres puntos donde irá el bloque. Si tarda más de 600 ms, encima se ven en fichas los datos ya entendidos.
- **guardando**: el botón Sí muestra un giro y se desactiva. Los demás botones también.
- Solo puede haber una propuesta viva. Una nueva sustituye a la anterior, que se queda como texto apagado.

---

## 4. Bloques

El servidor devuelve una lista de bloques y el panel los pinta. El modelo nunca devuelve HTML.

```ts
type Block =
  | { kind: 'text'; text: string; size?: 'md' | 'lg' }
  | { kind: 'ask'; question: string; field: FieldId; picker: Picker; context?: string[] }
  | { kind: 'proposal'; proposal: Proposal }
  | { kind: 'checkout'; checkout: Checkout }
  | { kind: 'saved'; title: string; summary: string; next: Action[]; undoId?: string }
  | { kind: 'instant'; text: string; undoId: string; next?: Action[] }
  | { kind: 'list'; title: string; total: number; rows: Row[]; openIn?: string }
  | { kind: 'preview'; label: string; body: RichText }        // plantilla de WhatsApp o SMS
  | { kind: 'alert'; text: string; action: Action }           // Marlén avisa
  | { kind: 'error'; code: ErrorCode; text: string; actions: Action[] }

type FieldId =
  | 'clienta' | 'servicio' | 'dia' | 'hora' | 'profesional'
  | 'importe' | 'medio' | 'texto' | 'otra_clienta'

type Picker =
  | { type: 'chips'; options: Option[] }                       // servicios, profesionales, medios
  | { type: 'people'; options: PersonOption[]; allowNew: boolean }
  | { type: 'slots'; day: string; suggested: Slot[]; strip: DayStrip }
  | { type: 'none' }                                           // se contesta hablando o escribiendo

type Option = { id: string; label: string; hint?: string }
type PersonOption = { id: string; name: string; tail?: string; lastVisit?: string }
type Slot = { start: string; end: string; professionalId: string }   // ISO, hora local del centro
type DayStrip = { open: string; close: string; busy: { start: string; end: string }[]; step: number }

type Action = { id: string; label: string; icon?: IconName; send: string | { intent: string; args: object } }

type ErrorCode = 'offline' | 'expired' | 'conflict' | 'role_admin' | 'role_cabina' | 'not_understood'
```

`Action.send` es lo que se manda al tocar: o una frase, como si la persona la hubiera dicho, o una intención ya resuelta. Así un botón y una frase recorren el mismo camino.

---

## 5. Componentes base

Los que ya están dibujados en el lienzo. Se listan para dejar claro el comportamiento.

### Pregunta con opciones (`ask`)

- Arriba, en fichas con borde, lo que ya se sabe (`context`): «Lucía Pérez», «Facial · 50 min», «jue 26 nov».
- La pregunta en `question`.
- Debajo, el selector según `picker`. Las opciones llevan debajo «la primera», «la segunda», «la tercera» cuando son tres o menos, para contestar con voz.
- Tocar una opción equivale a decirla. El bloque se queda como texto y sigue el turno.

### Cuál de las dos (`ask` con `people`)

- Una fila por persona: número en círculo, nombre con apellido, «la del 331» (tres últimas cifras) y la última visita.
- Si `allowNew`, botón punteado «Ninguna, es nueva».
- A cabina nunca se le pinta este bloque con gente que no ha pasado por su columna. Eso lo decide el servidor.

### Guardado (`saved`)

- Tarjeta `--ok-bg` con visto, `title` («Apuntada») y `summary` en una línea.
- Debajo, «Lo siguiente» con los botones de `next` en rejilla de dos.
- Enlace «Deshacer» si viene `undoId`.

### Vista previa (`preview`)

- Globo `--ok-bg` con la esquina superior izquierda en 6.
- Lo que cambia con cada cita va en negrita y con subrayado punteado.
- Debajo, fichas de cambios rápidos («De usted», «Aún más corto», «La de antes») y la pregunta con Sí y No.

### Error (`error`)

| Código | Texto | Botones |
| --- | --- | --- |
| `offline` | «Sin conexión. No se ha guardado.» | Otra vez · Dejarlo |
| `expired` | «¿El sí de qué?» | — |
| `conflict` | «Ese hueco se acaba de ocupar. Tengo 17:30 o 18:00.» | Los huecos |
| `role_admin` | «Eso lo hace dirección.» | — |
| `role_cabina` | «Eso no se ve desde cabina.» | — |
| `not_understood` | «No te he entendido. ¿Es una cita, una clienta, una tarea o la caja?» | Las cuatro |

`offline` y `conflict` van en tarjeta `--bad-bg`. Los demás son texto normal de Marlén: no son fallos, son respuestas.

### Marlén avisa (`alert`)

Único caso en que el panel enseña algo sin que se le hable. Tarjeta con borde en degradado de 1,5 px:

«Se ha liberado mar 24, 17:00. Lucía Pérez lo quería.» · botón «Ponérsela».

- Con el panel cerrado, sale como banda sobre la barra inferior de la app durante 8 s y luego queda un punto en el botón del chat.
- Tocar «Ponérsela» abre la propuesta ya rellena. Nunca cita sola.
- Solo recepción y dirección.

---

## 6. Mejora 1 — Propuesta editable en el sitio

Sustituye al botón «Cambiar». Cada dato de la tarjeta se toca y se cambia ahí mismo, sin otro turno.

```ts
type Proposal = {
  previewId: string
  expiresAt: string
  intent: string                 // id de chat-marlen.md
  heading: string                // «Cita nueva»
  title: string                  // «mar 24 nov · 17:00»
  fields: ProposalField[]
  question: string               // «¿La apunto?»
  yesLabel?: string              // «Sí» por defecto
  ghost?: Ghost                  // mejora 5
}

type ProposalField = {
  id: FieldId
  label: string                  // «Con»
  value: string                  // «Ana»
  note?: string                  // «· 50 min»
  assumed?: string               // «la de siempre»: lo supuso Marlén
  editable: boolean
  picker?: Picker                // qué se abre al tocarlo
}
```

### Diseño

```
┌──────────────────────────────────┐
│ Cita nueva                       │
│ mar 24 nov · 17:00            ›  │ ← título: toca y cambia día y hora
│                                  │
│ Clienta   Lucía Pérez            │ ← no editable: sin flecha
│ Servicio  Facial · 50 min     ›  │
│ Con       Ana  [la de siempre] › │
│ Pago      Su bono [le quedan 3]› │
└──────────────────────────────────┘
¿La apunto?
[        Sí        ] [  No  ]
```

- Cada fila editable es un `<button>` de ancho completo, 48 de alto, con flecha `›` a la derecha en `--mute`.
- La marca rosa (`assumed`) va en las filas que Marlén ha supuesto. Es la invitación a revisar.
- Al tocar una fila, el selector se abre debajo de ella, dentro de la tarjeta, empujando las demás. Solo uno abierto a la vez. Tocar la fila otra vez lo cierra.
- Al elegir, el selector se cierra, la fila parpadea y la tarjeta se actualiza en el mismo sitio. No se añade un bloque nuevo ni se pierde la posición.

### Qué se abre en cada dato

| Dato | Selector |
| --- | --- |
| Título (día y hora) | Selector de huecos con tira del día (mejora 6) |
| Servicio | Fichas con los servicios; primero los que ha usado esa clienta |
| Con | Fichas con las profesionales que hacen ese servicio |
| Pago | Fichas: «Su bono», «Sin bono» |
| Importe | Campo numérico con teclado de números; «,» decimal |
| Medio | Fichas: Efectivo, Tarjeta, Bizum, Transferencia, Pendiente |
| Nota, texto | Campo de texto de una línea que crece |
| Clienta | No se edita aquí. Para cambiar de clienta se dice o se toca No |

### Comportamiento

- Cada cambio pide al servidor una propuesta nueva (`PATCH` de la previsualización). Vuelve con otro `previewId` y con todo recomprobado: si al cambiar de profesional ya no hay hueco, la respuesta trae el selector de huecos abierto.
- Mientras llega, la fila muestra el valor nuevo apagado y el Sí se desactiva.
- Decirlo vale igual: «mejor a las seis» hace lo mismo que tocar la hora y elegir 18:00.
- Si el cambio quita un supuesto (la persona ha elegido), la marca rosa de esa fila desaparece.
- Botones: Sí (ocupa dos tercios) y No. Ya no hay «Cambiar».

### Se da por bueno cuando

- Cambiar la hora desde la tarjeta no añade ningún bloque al hilo.
- Tras cualquier cambio, el Sí guarda lo que se ve, no la propuesta anterior.
- Con teclado: Tab recorre las filas, Intro abre el selector, Escape lo cierra, las flechas se mueven entre opciones.
- Una fila no editable no es un botón y no recibe foco.

---

## 7. Mejora 2 — Salida de la clienta en una tarjeta

El momento más repetido: la clienta termina y se va. Hoy son cuatro frases. Pasa a ser una tarjeta y un sí.

### Cuándo sale

- «Ciérrala», «ya está», «ha terminado», con una cita en curso.
- Al tocar «Cerrar la de Marta» en el inicio (mejora 3).
- Si la frase ya trae el cobro («ciérrala, ha pagado con tarjeta»), sale la misma tarjeta con el cobro ya puesto.

```ts
type Checkout = {
  previewId: string
  expiresAt: string
  appointment: { id: string; clienta: string; service: string; when: string; professional: string }
  close: { on: true; note?: string }                         // siempre; note: «descuenta 1 del bono, le quedan 2»
  charge: { on: boolean; available: boolean; lines: ChargeLine[]; price: number; reason?: string }
  next: { on: boolean; weeks?: number; slot?: Slot; label?: string; picker?: Picker }
  whatsapp: { on: boolean; available: boolean }
  question: string                                           // «¿Lo hago?»
}
type ChargeLine = { amount: number; method?: 'efectivo' | 'tarjeta' | 'bizum' | 'transferencia' | 'pendiente' }
```

### Diseño

```
┌────────────────────────────────────┐
│ La cita en curso                   │
│ Marta Ruiz · cejas                 │
│ Hoy, 16:00 · con Ana               │
│                                    │
│ ✓ Cerrar la cita                   │ ← fija, no se puede quitar
│                                    │
│ ◉ Cobrar            20,00 €     ›  │
│   [Efectivo][Tarjeta][Bizum][Pend.]│
│   Dividir el pago                  │
│                                    │
│ ○ Próxima cita                     │
│   (al activarla)                   │
│   [2 sem][4 sem][6 sem][Otra]      │
│   mar 22 dic · 16:00 · Ana      ›  │
│                                    │
│ ○ Mandar WhatsApp                  │
└────────────────────────────────────┘
¿Lo hago?
[      Sí, las 3      ] [  No  ]
```

- Cada sección es una fila con interruptor a la izquierda (44 px de zona táctil), fondo `--surface-2`, radio 16.
- El botón Sí dice cuántas cosas hace: «Sí», «Sí, las 2», «Sí, las 3».

### Reglas de cada sección

**Cerrar.** Siempre activa. Si la cita gasta bono, debajo dice «Descuenta 1 del bono. Le quedan 2.»

**Cobrar.**
- Activa por defecto, con el precio del servicio.
- Si va con bono: desactivada y sin interruptor, con el texto «Va con bono, no hay cobro.» (`available: false`).
- El medio no viene elegido salvo que se haya dicho. Sin medio no se puede dar al Sí: el botón pide «Elige cómo paga».
- Tocar el importe abre el campo numérico. Si deja de ser el precio, debajo dice «Precio 20,00 €».
- «Dividir el pago» añade una segunda línea con el resto. La suma de las líneas se enseña y debe cuadrar con el importe.
- Cabina: puede cobrar si la cita es suya.

**Próxima cita.**
- Apagada por defecto.
- Al encenderla salen las fichas de semanas. Elegir una propone el mismo día de la semana, la misma hora y la misma profesional. Si no hay hueco, el más cercano de ese día, marcado en rosa «la más cercana».
- La línea del hueco se toca y abre el selector de huecos (mejora 6).
- Con el interruptor encendido y un hueco elegido, la agenda de detrás enseña la cita fantasma (mejora 5).
- El servicio es el mismo. Para otro servicio, se pide la cita aparte.

**WhatsApp.**
- Solo se puede encender si la próxima cita está encendida y la clienta tiene teléfono (`available`).
- No se envía solo. Tras guardar, se abre WhatsApp con el texto listo.

### Guardado

- Un solo sí guarda cierre, cobro y próxima cita en una única operación. O entran las tres o ninguna.
- El bloque de guardado resume: «Marta Ruiz: cerrada, 20,00 € con tarjeta, próxima mar 22 dic 16:00.»
- Si la próxima cita falla por conflicto, no se guarda nada y vuelve la tarjeta con el selector de huecos abierto.

### Se da por bueno cuando

- Con una cita en curso, cerrar y cobrar son una frase o un toque más un sí.
- Sin medio de pago elegido, el Sí no guarda.
- Una cita con bono no ofrece cobro.
- Si la red falla, no queda la cita cerrada sin el cobro.

---

## 8. Mejora 3 — Inicio según el momento

El «¿Qué deseas?» deja de tener cuatro botones fijos. Ofrece lo que toca ahora.

### Diseño

Igual que la pantalla 1 del lienzo, con dos cambios:

- La rejilla de dos columnas pasa a ser una lista de hasta cuatro filas de ancho completo, 64 de alto, con icono, texto principal y, a la derecha, un dato en `--mute` (la hora, el importe, el número).
- La primera fila, si es de «ahora», lleva a la izquierda una barra de 4 px con el degradado.

```
¿Qué deseas?

▌ Cerrar la de Marta Ruiz       cejas · en cabina
  Pasa Lucía Pérez a cabina     17:00 · llega ahora
  2 sin cobrar                  65,00 €
  Cita nueva

O dilo tal cual
[Lucía martes 5 facial] [Qué hay hoy]
```

### De dónde sale cada fila

Se piden en una sola consulta al abrir el panel. Se pintan por este orden y se cortan en cuatro.

| Orden | Condición | Fila | Al tocar |
| --- | --- | --- | --- |
| 1 | Hay una propuesta viva sin caducar | «Seguir: Lucía Pérez, mar 24, 17:00» | Vuelve a la propuesta |
| 2 | El panel se abre desde una cita | Según su estado: «Pásala a cabina», «Ciérrala», «Muévela», «Cancélala» | Esa intención |
| 3 | El panel se abre desde una ficha | «Cita a Lucía Pérez», «¿Cuántas le quedan?», «Véndele un bono» | Esa intención |
| 4 | Hay citas en curso | «Cerrar la de Marta Ruiz» (una por cita, máximo dos) | Tarjeta de salida |
| 5 | Hay una cita que empieza en los próximos 15 min o ya ha pasado su hora, sin pasar | «Pasa Lucía Pérez a cabina» | `cita_pasar` |
| 6 | Hay citas hechas hoy sin cobrar | «2 sin cobrar» | Lista (mejora 7) |
| 7 | Hay un hueco liberado que encaja con la espera | «Hueco para Lucía Pérez, mar 24 17:00» | Propuesta rellena |
| 8 | Hay tareas para hoy de quien mira | «3 tareas para hoy» | Lista |
| 9 | Relleno | «Cita nueva», «Qué hay hoy» | — |

Por papel:

- **Cabina**: solo sus citas en 4 y 5. No ve 6 ni 7. En 3 no entra, porque no abre fichas.
- **Recepción**: todo menos lo que es de dirección.
- **Dirección**: todo. Si el panel se abre desde Ajustes, la fila 2 son las cosas de esa pantalla («Plantilla WhatsApp», «Precios»).

Las frases de ejemplo de abajo («O dilo tal cual») son dos, fijas por papel, y desaparecen cuando la persona ya ha usado el chat diez veces.

### Se da por bueno cuando

- Con una cita en curso, la primera fila es cerrarla.
- Cabina nunca ve citas de otra columna ni importes.
- Abrir el panel no tarda más por esto: si la consulta no ha llegado en 300 ms, se pinta el relleno y las filas entran al llegar, sin mover lo que ya se ve.
- Sin nada pendiente, se ven solo «Cita nueva» y «Qué hay hoy».

---

## 9. Mejora 4 — Lo reversible se guarda sin sí

Cambia una regla de la especificación: algunas cosas se guardan en el acto y se pueden deshacer. La lista es cerrada y está en `chat-marlen.md`, apartado «Lo que se guarda sin sí».

| Intención | Texto del aviso |
| --- | --- |
| `cita_pasar` | «Lucía Pérez, en cabina.» |
| `cita_no_vino` | «Lucía Pérez, no vino.» |
| `cita_nota` | «Nota apuntada: viene con prisa.» |
| `tarea_crear` | «Tarea creada: pedir toallas, vie 27, para Ana.» |
| `tarea_hecha` | «Hecha: pedir toallas.» |
| `clienta_vip` | «Lucía Pérez, VIP.» |
| `clienta_sms` | «Lucía Pérez, sin SMS.» |
| `espera_lista` | «Lucía Pérez, en espera: tardes.» |
| `espera_quitar` | «Lucía Pérez, fuera de la espera.» |

Solo va directo si no ha habido que suponer nada: la clienta y la cita se han resuelto sin duda. Si Marlén ha tenido que elegir entre dos, o ha fijado a alguien solo por el nombre de pila, vuelve la propuesta con su sí.

### Diseño (`instant`)

```
✓ Lucía Pérez, en cabina.            Deshacer ◔
```

- Una línea, sin tarjeta: visto pequeño en `--ok`, el texto en `value`, y a la derecha «Deshacer» subrayado con un anillo que se consume en 5 s.
- Pasados los 5 s, «Deshacer» se queda sin anillo y sigue funcionando mientras sea lo último guardado en el chat. Decir «deshaz» hace lo mismo.
- Si trae `next`, debajo van los botones del paso siguiente, como en el bloque de guardado.
- Con voz, Marlén dice el texto y nada más. No dice «deshacer».

### Comportamiento

- El servidor guarda y devuelve el bloque con un `undoId`. No hay previsualización.
- Deshacer devuelve el dato a como estaba y sustituye la línea por «Deshecho.» en `--mute`.
- Si deshacer falla (alguien ha cambiado esa cita entre medias), se dice: «Ya no se puede deshacer: la cita ha cambiado.»
- Sin red, no se guarda nada y sale el error `offline` de siempre.

### Se da por bueno cuando

- «Pásala a cabina» con una sola cita posible cambia el estado sin preguntar.
- Con dos citas posibles, pregunta cuál y después guarda directo.
- Ninguna intención fuera de la tabla se puede guardar por este camino, aunque el modelo lo intente.
- Deshacer deja el dato exactamente como estaba.

---

## 10. Mejora 5 — La cita fantasma en la agenda

Mientras una propuesta espera el sí, la agenda de detrás enseña dónde va a caer.

```ts
type Ghost = {
  kind: 'new' | 'move' | 'block'
  day: string
  professionalId: string
  start: string
  end: string
  label: string                           // «Lucía Pérez · facial»
  from?: { day: string; professionalId: string; start: string; end: string }   // en 'move'
  conflictWith?: string[]                 // ids de citas que pisa
}
```

### Qué intenciones lo llevan

`cita_nueva`, `cita_mover`, `cita_repetir` (solo la primera fecha), `bloqueo` y la próxima cita de la tarjeta de salida.

### Diseño

- Bloque en la columna de la profesional, a su hora y con su duración.
- Fondo blanco al 70 %, borde punteado de 1,5 px en `--brand-a`, texto en `--ink`. Encima, una ficha pequeña «por confirmar».
- En `move`, la cita de origen se queda al 40 % de opacidad y una línea fina une origen y destino si están el mismo día.
- En `block`, rayado diagonal en gris.
- Si pisa algo (`conflictWith`), el borde pasa a `--bad` y las citas pisadas se marcan con borde `--bad`.

### Comportamiento

- Al salir la propuesta, la agenda va sola al día del fantasma y lo centra en vertical. En móvil, el panel baja a altura media para que se vea.
- Si la pantalla de detrás no es la agenda, no se navega a la fuerza: en la tarjeta de la propuesta sale el enlace «Ver en la agenda».
- Tocar un hueco libre de la agenda con la propuesta viva cambia la hora (y la profesional, si es otra columna). Es lo mismo que editar el dato en la tarjeta.
- Cualquier cambio en la propuesta mueve el fantasma.
- Con el sí, el fantasma se vuelve cita. Con el no, al caducar o al cerrar el panel, desaparece.
- El fantasma no existe en la base de datos. Otra persona no lo ve en su pantalla.

Para esto, la propuesta viva tiene que estar en un estado que compartan el panel y la agenda (el almacén que ya use la app).

### Se da por bueno cuando

- Con la agenda detrás, la propuesta de una cita se ve en su columna antes del sí.
- Cambiar la hora en la tarjeta mueve el fantasma, y tocar otro hueco en la agenda cambia la tarjeta.
- Un fantasma que pisa una cita se ve en rojo, y el texto de la propuesta dice con quién se pisa.
- Tras un no, no queda rastro en la agenda.

---

## 11. Mejora 6 — Huecos con contexto

El selector de huecos (`picker.type === 'slots'`). Se usa en la pregunta «¿A qué hora?», al tocar la hora de una propuesta y en la próxima cita de la tarjeta de salida.

### Diseño

```
‹  jue 26 nov  ›                  [Ana] [Marta]

[ 16:00 ]   [ 17:30 ]   [ 18:30 ]
 la primera  la segunda  la tercera

10      12      14      16      18      20
├───▓▓▓▓░░░▓▓▓▓▓▓▓░░░░░░░▓▓░░░▓▓▓▓░░░░░░┤
                          ▲

Más huecos
```

- **Día**: flechas de 44 px a los lados de la fecha. No se puede ir a días pasados. Un día cerrado se salta y la fecha lo dice en `--mute`: «dom 29, cerrado».
- **Profesional**: fichas arriba a la derecha, solo si hay más de una que haga el servicio. La elegida va en `--ink` con texto blanco. «Cualquiera» si no importa.
- **Sugeridos**: hasta tres botones grandes, 76 de alto. Son los más cercanos a lo pedido («por la tarde», «a las cinco»).
- **Tira del día**: barra de 40 de alto que va de la apertura al cierre. Lo ocupado en `--line`, lo libre en blanco con borde. Las horas en punto arriba, en `label`. Tocar o arrastrar sobre lo libre coloca un marcador con la duración del servicio; se ajusta al paso de la agenda (`step`). Debajo del marcador sale la hora: «17:15–18:05».
- **Más huecos**: despliega la lista completa del día, en fichas de 44, tres por fila.

### Comportamiento

- Un hueco es un tramo donde cabe entero lo que dura el servicio.
- Elegir un sugerido, soltar el marcador o tocar una ficha de «Más huecos» es contestar la pregunta.
- Cambiar de día o de profesional vuelve a pedir los huecos. Mientras llegan, la tira se apaga.
- Si el día no tiene ningún hueco: «El jueves no hay hueco.» y un botón con el más cercano: «lun 30, 10:00».
- Debajo siempre hay dos salidas: «Otro día» (abre el calendario de la app) y «Ponla en espera».
- La tira es una ayuda visual. Con lector de pantalla se usa la lista de «Más huecos», que son botones normales; la tira lleva `aria-hidden`.

### Se da por bueno cuando

- Nunca se ofrece un hueco donde no cabe el servicio.
- Cambiar de profesional cambia la tira y los sugeridos.
- En un día cerrado no hay nada que tocar.
- El marcador no se puede soltar encima de algo ocupado.

---

## 12. Mejora 7 — Listas que se pueden usar

Las respuestas a preguntas (`list`). Cada fila tiene su botón, y ese botón entra por el mismo camino que una frase.

```ts
type Row = {
  id: string
  title: string          // «Marta Ruiz»
  detail?: string        // «cejas · hoy 16:00»
  value?: string         // «20,00 €»
  action?: Action        // «Cobrar»
  open?: string          // ruta que se abre al tocar la fila
}
```

### Diseño

```
2 sin cobrar · 65,00 €

Marta Ruiz                      20,00 €  [Cobrar]
cejas · hoy 16:00

Carmen Vila                     45,00 €  [Cobrar]
facial · hoy 12:30

Ver las 5
```

- `title` del bloque en `question`, con el total.
- Fila de 64 de alto mínimo: nombre en `value`, detalle en `label`, valor a la derecha, y botón píldora de 44 en `--surface-3`.
- Se pintan tres filas. Si hay más, «Ver las N» despliega el resto dentro del panel, con scroll. Si `openIn` viene, al final hay «Abrir en Clientas» (o la pantalla que toque) con el filtro puesto.
- Lista vacía: una frase y nada más. «Todo cobrado.» «Nadie en espera.»
- Con voz, Marlén dice el título y cuántas son, no las filas.

### Qué lleva cada lista

| Pregunta | Fila | Valor | Botón | Qué hace el botón |
| --- | --- | --- | --- | --- |
| `hoy` | Clienta · servicio | Hora | Según estado: «A cabina», «Cerrar» | `cita_pasar` o tarjeta de salida |
| `quien_sigue` | Clienta · servicio · profesional | Hora | «A cabina» | `cita_pasar` |
| `p_agenda` | Clienta · servicio | Hora | — | Toca la fila: abre la cita |
| `p_sin_cobrar` | Clienta · servicio · cuándo | Importe | «Cobrar» | Propuesta de cobro |
| `p_no_vino` | Clienta · servicio · hora | — | «Otra cita» | `cita_nueva` con esa clienta |
| `espera_ver` | Clienta · preferencia | Desde cuándo | «Citar» | `cita_nueva` con esa clienta |
| `p_bonos` | Clienta · bono | Sesiones y fecha | «Citar» | `cita_nueva` con el bono |
| `p_cumple` | Clienta | Día | «WhatsApp» | Abre WhatsApp con el texto listo |
| `p_sin_volver` | Clienta · última visita | Hace cuánto | «Citar» | `cita_nueva` con esa clienta |
| `tarea_lista` | Tarea · para quién | Fecha | «Hecha» | `tarea_hecha` |
| `bono_saldo` (varios) | Bono | Sesiones y fecha | «Citar» | `cita_nueva` con ese bono |
| `clienta_buscar` | Nombre · la del 331 | Última visita | «Cita» | `cita_nueva`; tocar la fila la fija |

`p_caja` no es una lista. Es un total en grande y, debajo, una línea por medio de pago. Con voz no se dice el importe: se enseña.

Reglas:

- El botón hace lo mismo que decir la frase con esa clienta. Lo que pide sí sigue pidiéndolo; lo que va directo (mejora 4) va directo y la fila se actualiza en el sitio: el botón pasa a visto y la fila se apaga.
- Tocar un botón fija a esa clienta.
- Cabina solo recibe filas de su columna, sin importes ni teléfonos. Las listas de dinero y de base de clientas no le llegan: recibe «Eso no se ve desde cabina.»

### Se da por bueno cuando

- Desde «Quién falta por cobrar» se cobra a alguien con un toque y un sí.
- Marcar una tarea como hecha desde la lista no saca al usuario de la lista.
- Una lista de más de tres no se lee en voz alta.
- La fila actualizada refleja el estado nuevo sin volver a preguntar.

---

## 13. Contrato con el servidor

Propuesta. Si la app usa otra forma (acciones de servidor, RPC), se mantiene lo que entra y lo que sale.

| Llamada | Entra | Sale |
| --- | --- | --- |
| `GET /api/chat/start` | pantalla actual, cita o ficha abierta | filas de inicio (mejora 3), alertas |
| `POST /api/chat/turn` | frase o `Action.send`, pantalla actual, clienta fijada | `{ blocks, fixed, previewId? }` |
| `PATCH /api/chat/preview` | `previewId`, dato, valor | propuesta o tarjeta de salida nuevas |
| `POST /api/chat/confirm` | `previewId` | bloque `saved` o `error` |
| `POST /api/chat/cancel` | `previewId` | — |
| `POST /api/chat/undo` | `undoId` | bloque `text` |

Reglas que van en el servidor, no en el panel ni en el modelo:

- `confirm` solo guarda si la previsualización existe, no ha caducado y es de esa sesión. Se recomprueba todo antes de escribir.
- Lo directo (mejora 4) solo acepta las nueve intenciones de la lista.
- `confirm` y lo directo son idempotentes por `previewId` o por un id de petición: repetir no duplica.
- Los papeles se comprueban aquí. El panel no esconde botones por su cuenta; pinta lo que llega.
- Cada escritura deja rastro: quién, cuándo, y que fue por chat o por voz.

---

## 14. Accesibilidad

- Todo lo que se toca es `<button>` o `<a>`. Nada de `onClick` en un `div`.
- El campo de texto tiene etiqueta. Los botones de solo icono tienen `aria-label`.
- Los bloques nuevos de Marlén se anuncian con `aria-live="polite"`. Los errores, con `assertive`.
- Al salir una propuesta, el foco va al Sí. Al salir una pregunta con opciones, a la primera opción. Si la persona está escribiendo, el foco no se mueve.
- Escape cierra el selector abierto; si no hay ninguno, cierra el panel.
- Al cerrar el panel, el foco vuelve al botón que lo abrió.
- El color nunca es la única señal: lo supuesto lleva texto, el conflicto lleva texto, el guardado lleva visto.
- Tamaño de letra del sistema: el panel aguanta hasta el 130 % sin cortar texto. Las filas crecen en alto.

---

## 15. Orden para construirlo

1. Panel, cabecera, barra, burbuja y texto. Bloques `text`, `ask` con fichas y `error`. Con esto ya funciona lo que hoy hace la voz.
2. Propuesta editable (mejora 1) y bloque de guardado. Contrato `turn`, `preview`, `confirm`.
3. Selector de huecos con la tira del día (mejora 6). Lo usan la 1, la 2 y la 5.
4. Guardado directo con deshacer (mejora 4).
5. Listas (mejora 7).
6. Tarjeta de salida (mejora 2).
7. Inicio según el momento (mejora 3) y bloque de aviso.
8. Cita fantasma (mejora 5). Es la que más toca la agenda; va al final para no bloquear lo demás.
9. Columna lateral para tableta y escritorio.

Cada paso se puede probar solo con los casos de prueba de `chat-marlen.md`.

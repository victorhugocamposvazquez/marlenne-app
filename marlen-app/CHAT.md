# Chat de Marlén

Fecha: 2026-11-20.

El chat es la forma de usar el centro hablando o escribiendo. Guía por las pantallas y hace el trabajo: citas, clientas, bonos, tareas, caja, catálogo y ajustes. Si ya se sabe nombre y apellido, no pregunta quién es y va al verbo.

La voz de ahora (el micrófono) solo cubre la agenda y abrir unas pantallas. Este documento es la funcionalidad completa. La voz pasa a ser una puerta del mismo chat: mismas intenciones, mismas confirmaciones.

## Qué es

Un panel en la app del equipo. Se abre desde el botón que hoy es la voz. Se puede hablar o escribir. Marlén contesta en una o dos frases, de tú, en español de España.

Cada turno hace una de estas tres cosas:

1. Responde (qué hay hoy, cuántas sesiones quedan, el enlace de reservas).
2. Pregunta un solo dato que falta.
3. Enseña lo que va a guardar y espera un sí. Sin ese sí no escribe.

Si el gesto es más claro en una pantalla, la abre con lo que ya sepa relleno. El chat no sustituye la ficha clínica.

## Reglas

- Búsqueda sin acentos. «María» y «Maria» son la misma clienta.
- Papeles:
  - `admin` (dirección): todo el centro.
  - `reception`: agenda, clientas, tareas y finanzas. No catálogo, equipo ni ajustes del centro.
  - `provider` (cabina): solo su columna. No entra en Clientas, bonos ni ficha.
- Un «sí» suelto, sin una pregunta abierta, no guarda. Se contesta «¿El sí de qué?».
- Fotos, medidas, notas clínicas y consentimientos no se dictan ni se resumen. Se abre la ficha.
- Sin red: «Sin conexión. No se ha guardado.» No se reintenta solo.
- Cabina que pide una ficha: no se ofrece. Dirección es quien oye «Eso lo hace dirección.» cuando el papel no llega.

## Cómo entra una frase

```
Frase
├─ trae nombre y apellido
│  ├─ una ficha → clienta fijada. Sigue al verbo. No pregunta quién.
│  ├─ varias con el mismo nombre
│  │  └─ «Hay dos: Lucía Pérez 612… y Lucía Pérez 644…. ¿Cuál?»
│  │     ├─ teléfono, «la primera» o un dato que deje una → fijada
│  │     └─ «ninguna» y el verbo es alta o cita → alta nueva
│  └─ ninguna ficha
│     ├─ verbo de cita, espera, bono o ficha
│     │  └─ «No está. ¿La doy de alta?»
│     │     ├─ sí → teléfono, o «sin teléfono» → confirmar alta → seguir el verbo
│     │     └─ no → parar
│     └─ verbo sin clienta (hoy, huecos, tareas) → ese árbol
├─ solo un nombre
│  ├─ una ficha en el centro → se usa; el sí dice el apellido
│  └─ varias → lista con apellido y teléfono
└─ sin nombre
   ├─ hay una cita en curso, o una sola cita ahora, y el verbo es de ahora
   │  (pasa, no vino, cierra, cobra) → esa clienta
   └─ si no → «¿De quién?»
```

Orden de lo que se pregunta en una cita, una cosa por turno: clienta, servicio, día, hora, profesional.

## Pantallas

| Frase | Ruta | Quién |
| --- | --- | --- |
| Hoy, qué hay hoy | `/hoy` | todas |
| Agenda | `/agenda` | todas |
| Nueva cita | `/agenda?new=1` | todas |
| Clientas | `/clientas` | no cabina |
| Ficha | `/clientas/{id}` | no cabina |
| Nueva clienta | `/clientas?alta=1` | no cabina |
| Tareas | `/tareas` | todas |
| Finanzas, caja | `/finanzas` | no cabina |
| Tratamientos, servicios, precios | `/ajustes/servicios` | dirección |
| Bonos (plantillas) | `/ajustes/bonos` | dirección |
| Equipo | `/ajustes/equipo` | dirección |
| Ajustes | `/ajustes` | todas |
| Citas, WhatsApp de confirmación, cobro | `/ajustes/citas` | dirección |
| SMS | `/ajustes/sms` | dirección |
| Datos del centro | `/ajustes/centro` | dirección |
| Reserva online | `/ajustes/widget-reservas` | dirección |
| Web y marketing | `/ajustes/marketing` | dirección |
| Importar | `/ajustes/importar` | dirección |
| Voz | `/ajustes/voz` | todas |
| Cuenta, salir | `/ajustes/cuenta` | todas |

Si la frase es «llévame a…» o «abre…», solo navega. No guarda nada.

## Intenciones

### Agenda

| Id | Frase tipo | Datos | Confirma | Voz de hoy |
| --- | --- | --- | --- | --- |
| `hoy` | Qué hay hoy | — | no | `today` |
| `quien_sigue` | Quién sigue, quién está en cabina | — | no | `next` |
| `buscar_cita` | La cita de Lucía | clienta | no | `search`, `find` |
| `huecos` | Hueco mañana por la tarde con Ana | día, hora o franja, profesional | no | `slots` |
| `cita_nueva` | Cita a Lucía mañana a las cinco, facial | clienta, día, hora, servicio, profesional si hay varias | sí | `book` |
| `cita_mover` | Pasa la de Lucía a las seis | cita, hora o día | sí | `move` |
| `cita_cancelar` | Cancela la de Lucía | cita | sí | `cancel` |
| `cita_pasar` | Lucía pasa a cabina | cita | sí | `status` curso |
| `cita_no_vino` | Lucía no ha venido | cita | sí | `status` noshow |
| `cita_hecha` | Cierra la de Lucía | cita | sí | no |
| `cita_nota` | Apunta en la cita: viene con prisa | cita, texto | sí | no |
| `cita_cobro` | Ha pagado 40 en efectivo | cita, importe, medio | sí | no |
| `espera_lista` | Apúntala en espera, tardes | clienta, preferencia | sí | `wait` |
| `espera_ver` | Quién está en espera | — | no | `waiting` |
| `espera_quitar` | Quítala de la espera | entrada | sí | no |
| `bloqueo` | Bloquea a Ana de tres a cuatro | profesional, inicio, fin | sí | no |
| `aviso_retraso` | Avisa a cabina, llega diez minutos tarde | cita, minutos | sí | `late` |
| `mismo_servicio` | Lo mismo que la última vez | clienta | sí, dentro de la cita nueva | `same` |

Estados de una cita: programada, en curso, hecha, no vino, cancelada.

### Clientas

| Id | Frase tipo | Datos | Confirma |
| --- | --- | --- | --- |
| `clienta_buscar` | Busca a María | texto o teléfono | no |
| `clienta_abrir` | Abre la ficha de Lucía | clienta | no |
| `clienta_crear` | Alta a Lucía Pérez, 612… | nombre; teléfono y email opcionales | sí |
| `clienta_editar` | Su teléfono es 612… | clienta, campo, valor | sí |
| `clienta_vip` | Márcala VIP | clienta, sí o no | sí |
| `clienta_sms` | No le mandes SMS | clienta, sí o no | sí |
| `bono_vender` | Véndele el bono de 5 faciales | clienta, plantilla o sesiones y precio | sí |
| `bono_amigo` | Comparte el bono con Ana | bono, otra clienta | sí |
| `bono_saldo` | ¿Cuántas le quedan? | clienta | no |
| `consentimiento` | — | — | no por chat; abre la ficha |

### Catálogo, equipo y ajustes

Solo dirección.

| Id | Frase tipo | Datos | Confirma |
| --- | --- | --- | --- |
| `servicio_precio` | El facial cuesta 45 y dura 50 | servicio, precio o duración | sí |
| `servicio_crear` | Nuevo servicio, cejas, 20 €, 30 min | nombre, precio, duración, categoría | sí |
| `servicio_borrar` | Quita ese servicio | servicio | sí |
| `servicio_online` | El facial se reserva online | servicio, sí o no | sí |
| `categoria` | Nueva categoría, láser | nombre | sí |
| `bono_plantilla` | Bono de 5 sesiones a 180 | nombre, sesiones, precio, servicio | sí |
| `equipo_alta` | Alta a Ana en cabina | nombre, papel | sí |
| `equipo_editar` | Ana ya no está activa | persona, campo | sí |
| `whatsapp_texto` | El WhatsApp de confirmación que diga… | texto con `{{cliente}}` `{{cuando}}` `{{servicio}}` `{{enlace}}` | sí |
| `sms_texto` | El SMS de recordatorio… | plantilla | sí |
| `centro` | El teléfono del centro es… | campo | sí |
| `reserva_enlace` | El enlace de reservas | — | no, lo lee |
| `importar` | — | archivo | no por chat; abre Importar |

### Tareas y finanzas

| Id | Frase tipo | Datos | Confirma |
| --- | --- | --- | --- |
| `tarea_lista` | Qué tareas hay | filtro opcional | no |
| `tarea_crear` | Tarea: pedir toallas, el viernes, para Ana | título, fecha, persona | sí |
| `tarea_hecha` | La de las toallas está hecha | tarea | sí |
| `tarea_borrar` | Borra esa tarea | tarea | sí |
| `caja_ver` | Qué hemos cobrado hoy | día | no |
| `caja_apuntar` | Apunta 40 de Lucía en efectivo | cita, importe, medio | sí; es `cita_cobro` |

## Árbol — cita nueva

Clienta fijada: Lucía Pérez. Si el dato ya viene en la frase, esa pregunta se salta.

Frases que ya bastan:

- «Cita mañana a las cinco, facial.»
- «Cita hoy a las once con Ana, lo de siempre.»
- «Hueco el viernes por la tarde y se la pones.»

```
Cita
├─ servicio
│  ├─ «lo de siempre» / «el mismo»
│  │  ├─ hay última cita con servicio → ese
│  │  └─ no hay → «¿Qué servicio?»
│  ├─ un servicio o un bono con saldo → ese
│  ├─ varios parecidos («facial») → «¿Facial básico o facial profundo?»
│  └─ no → «¿Qué servicio?»
├─ día
│  ├─ hoy, mañana, día de la semana o fecha → ese
│  └─ no → «¿Qué día?»
├─ hora
│  ├─ hora concreta
│  │  ├─ libre → seguir
│  │  └─ ocupada → dos huecos libres de al lado
│  ├─ mañana / tarde / noche → huecos de esa franja
│  └─ no → «¿A qué hora?» y hasta tres huecos
├─ profesional
│  ├─ una sola en el centro → esa
│  ├─ el servicio o el bono ya tienen profesional → esa
│  ├─ dijo el nombre → esa
│  └─ varias y no dijo → «¿Con quién?»
└─ sí: «Lucía Pérez, facial, mañana 17:00, con Ana. ¿La apunto?»
   ├─ sí → se crea y se abre la cita
   ├─ cambia un dato («mejor a las seis») → se recompone y se vuelve a confirmar
   └─ no → no se guarda
```

«Y mándale el WhatsApp», después del sí, arma el texto con la plantilla del centro. No se envía solo: se abre WhatsApp con el texto listo. Comodines: `{{cliente}}` `{{cuando}}` `{{servicio}}` `{{enlace}}`. Si la plantilla no lleva `{{enlace}}` y hay enlace, se añade al final.

## Árbol — cita que ya existe

```
├─ una cita futura → esa
├─ una hoy y otra más adelante, y el verbo es de ahora
│  (pasa, no vino, cierra, cobra) → la de hoy
├─ varias futuras y el verbo es mover o cancelar
│  └─ «¿La de mañana a las cinco o la del viernes?»
└─ ninguna
   ├─ pasa, no vino, cierra, cobra → «No tiene cita abierta.»
   └─ mover o cancelar → «No tiene ninguna pendiente.»
```

| Frase directa | Qué hace |
| --- | --- |
| «Pásala a cabina.» | Estado → en curso. Si ya lo estaba: «Ya está en cabina.» |
| «No ha venido.» | Estado → no vino |
| «Ya está. Ciérrala.» | Cierre. Si gasta bono, el sí dice que descuenta una sesión |
| «Cancélala.» | Cancela. Si había bono apartado, el sí dice que la sesión no se gasta |
| «Muévela a las seis.» / «Pásala al viernes a las diez.» | Hueco, sin pedir clienta ni servicio |
| «Con Ana, no con Marta.» | Cambia de profesional si el hueco existe |
| «Apunta: viene con prisa.» | Nota de la cita. El sí repite la nota |
| «Ha pagado 40 en efectivo.» / «Con tarjeta.» / «Pendiente de cobro.» | Cobro. Sin importe y con precio de servicio: usa ese precio y lo dice |
| «Llega diez minutos tarde. Avisa a cabina.» | Aviso de retraso |
| «Mándale la confirmación.» | WhatsApp con la plantilla, sin enviar solo |

Cierre: «Lucía Pérez, [lo que va a pasar]. ¿Lo hago?»

## Árbol — espera

```
«Apúntala en espera, tardes.»
├─ ya está, sin resolver → «Ya está. ¿Cambio la nota a tardes?»
└─ no está → «Lucía Pérez en espera, tardes. ¿La apunto?»

«Quítala de la espera.»
├─ una entrada → sí
└─ varias notas → cuál

«Cuando haya hueco el viernes por la tarde, cítala.»
└─ confirma la espera. No crea la cita. La cita sale del árbol de cita nueva cuando haya hueco.
```

## Árbol — ficha

Con la clienta fijada:

- «Ábrela.» abre la ficha y no pregunta.
- «Su teléfono es 612 480 331.»
- «El email es lucia@…»
- «Márcala VIP.» / «Quítale el VIP.»
- «No le mandes SMS.» / «Sí le mandes el recordatorio.»
- «Nació el 4 de marzo del 90.»
- «Nota de ficha: alérgica al perfume.» Si suena a salud, medida o foto, no se escribe: «Eso va en la ficha, lo abro.»

```
Cambio
├─ el valor ya viene → «Teléfono de Lucía Pérez: 612 480 331. ¿Lo guardo?»
├─ «cámbiale el teléfono» sin número → «¿Cuál?»
└─ borrar la ficha → no por frase. Se abre la ficha.

Alta si no existía
└─ «Lucía Pérez, teléfono 612…, sin email. ¿La creo?»
   Un nombre muy corto pide el apellido antes del sí.
```

## Árbol — bonos de una clienta

```
«Véndele el bono de 5 faciales.»
├─ una plantilla cuadra → «Bono 5 facial, 180 €, para Lucía Pérez. ¿Lo vendo?»
├─ varias → «¿El de 5 o el de 10?»
└─ no hay plantilla, y dice sesiones y precio → se arma y se confirma

«Comparte el bono con Ana García.»
├─ el bono es de Lucía y tiene sesiones
├─ Ana se resuelve como cualquier clienta
└─ si Ana no está → alta rápida y luego el sí del bono amigo

«¿Cuántas le quedan?»
├─ un bono abierto → «Le quedan 3 de 5, hasta el 12 de marzo.» Sin sí.
└─ varios → los enumera
```

## Árbol — sin clienta

Hoy

- «Qué hay hoy» resume. Cabina solo oye las suyas.
- «Quién sigue» es la próxima de hoy.
- «Quién está en cabina» son las que están en curso.

Huecos

```
«Hueco mañana por la tarde con Ana.»
├─ falta franja → «¿Mañana, tarde o una hora?»
├─ hay varias profesionales y no dijo → «¿Con quién?»
└─ contesta horas. No crea la cita.
   «Se la pones a Lucía» entra en cita nueva.
```

Bloqueo

```
«Bloquea a Ana mañana de tres a cuatro.»
├─ falta profesional, día, inicio o fin → una pregunta
└─ pisa una cita → «Ahí tiene a Lucía Pérez. ¿Bloqueo igual?»
```

Tareas

```
«Tarea: pedir toallas, el viernes, para Ana.»
└─ falta el título → «¿Qué hay que hacer?»

«La de las toallas está hecha»
├─ una tarea cuadra → sí
└─ varias → cuál

«Bórrala» pide sí. Es el borrado que se puede pedir con una frase.
```

Caja

- «Qué hemos cobrado hoy» se contesta, sin confirmar.
- «Apunta 40 de Lucía en efectivo» es el cobro de su cita de hoy.

Catálogo, solo dirección

```
«El facial cuesta 45 y dura 50.»
├─ un servicio → sí con el precio de antes y el nuevo
└─ varios faciales → cuál

«Nuevo servicio, cejas, 20 euros, 30 minutos.»
└─ falta la categoría y hay varias → «¿En qué categoría?»

«Que se reserve online» → sí o no.
«Quita el servicio» → el sí dice cuántas citas futuras lo usan.
```

Equipo, solo dirección

```
«Alta a Ana en cabina.»
├─ el papel viene dicho: cabina, recepción o dirección
└─ no lo dice y es quien da el servicio → se toma cabina y el sí lo dice

«Ana ya no está» desactiva. No borra.
```

Ajustes, solo dirección

- El WhatsApp se confirma enseñando el texto con una clienta de ejemplo. Si no está `{{enlace}}`, el sí avisa de que el enlace se añade al final.
- El SMS igual, con su plantilla.
- «El teléfono del centro es…» confirma el dato.
- «Pásame el enlace de reservas» solo lo lee.

Importar un archivo, subir fotos, apuntar medidas y firmar consentimientos no tienen frase. Se abre la pantalla.

## Cortes

Ganan a cualquier rama:

- Nombran a otra persona a mitad → se suelta la ficha y se vuelve a resolver quién es.
- «Para», «nada», «olvídalo» → se tira lo que no se haya confirmado.
- «Sí» sin pregunta abierta → «¿El sí de qué?» No guarda.
- Sin red → «Sin conexión. No se ha guardado.»
- El papel no llega → «Eso lo hace dirección.»

## Relación con lo que ya hay

El micrófono, el parser de `lib/voice.ts` y las herramientas de agenda (hoy, huecos, previsualizar cita, mover, cancelar, estado, espera, retraso) siguen. El chat los llama por el id de la tabla. Lo que aún no tiene herramienta (ficha, bono, catálogo, equipo, tareas, caja, bloqueo, nota, cobro) usa la misma regla: previsualizar, preguntar el sí, guardar, y abrir la pantalla si el gesto se ve mejor allí.

Lo que no es este chat: un asistente que invente huecos, que borre fichas por una frase, o que lea datos de salud en voz alta.

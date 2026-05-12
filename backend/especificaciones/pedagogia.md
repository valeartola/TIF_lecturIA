# Pedagogía — LecturIA

Este documento define los criterios pedagógicos que rigen la generación de
preguntas de comprensión lectora. Es la base que tanto el generador como el
juez deben respetar.

> **Cómo se usa:** este archivo es leído por el módulo generador (al construir
> el prompt) y por el juez (como referencia de los criterios contra los que
> evalúa). Si cambian los criterios pedagógicos, se edita acá y los dos módulos
> se actualizan automáticamente.

---

## 1. Público destinatario

- Estudiantes de educación primaria argentina (8 a 12 años, 3° a 6° grado).
- Lengua: español rioplatense, registro neutro escolar.
- Se asume lectura silenciosa individual con acompañamiento docente.

## 2. Niveles de dificultad

LecturIA trabaja con tres niveles de dificultad, no asociados rígidamente al
grado sino al desempeño del estudiante.

### FÁCIL
- Vocabulario cotidiano, sin tecnicismos.
- Oraciones cortas en la pregunta (máx. ~15 palabras).
- Predominan preguntas literales (la respuesta está explícita en el texto).
- Distractores claramente diferenciados de la respuesta correcta.

### MEDIA
- Vocabulario escolar estándar; puede incluir 1-2 palabras menos frecuentes
  si el contexto las explica.
- Oraciones de hasta ~20 palabras.
- Mezcla de literales e inferenciales simples.
- Distractores plausibles pero distinguibles con relectura.

### DIFÍCIL
- Vocabulario más amplio; se admiten términos abstractos o figurados.
- Oraciones de hasta ~25 palabras.
- Predominan inferenciales, causa-efecto e idea principal.
- Distractores cercanos: requieren análisis, no solo memoria.

> **Regla transversal:** sin importar el nivel, la pregunta debe poder
> responderse únicamente con información del texto. Nunca depender de
> conocimiento externo.

## 3. Tipos de pregunta

### Comprensión literal
La respuesta está **explícita** en el texto. El estudiante localiza información.
- *Ejemplo bueno:* "¿Dónde vivía el protagonista?" (si el texto lo dice tal cual).
- *Ejemplo malo:* "¿Qué sintió el protagonista?" si el texto no lo expresa.

### Comprensión inferencial
La respuesta requiere **deducir** a partir de pistas del texto, sin estar dicha
literalmente.
- *Ejemplo bueno:* "¿Por qué la niña no quiso entrar a la casa?" cuando el texto
  describe que tembló al ver la puerta abierta de noche.
- *Ejemplo malo:* preguntar algo que está literal en el texto y llamarlo
  inferencial.

### Vocabulario en contexto
Se pregunta el significado de una palabra **tal como se usa en el texto**, no
su definición de diccionario.
- *Ejemplo bueno:* "En la oración 'el cielo estaba plomizo', la palabra plomizo
  significa…" con opciones donde el contexto desambigua.
- *Ejemplo malo:* preguntar el significado de una palabra que no aparece en
  el texto.

### Idea principal o global
Se pregunta de qué trata el texto en conjunto, o cuál es su mensaje central.
- *Ejemplo bueno:* "¿Cuál es la idea principal del texto?"
- *Ejemplo malo:* confundir tema (sobre qué habla) con idea principal (qué dice
  sobre eso).

### Detalle específico
Información puntual y secundaria del texto (fechas, nombres, cantidades, lugares).
- Útil para ejercitar atención al detalle.
- No debe ser el tipo dominante en una actividad.

### Causa y efecto
Identificar relaciones causales presentes en el texto.
- *Ejemplo bueno:* "¿Por qué se inundó el pueblo?" cuando el texto da la causa.
- *Ejemplo malo:* preguntar una causa que el lector debe imaginar.

## 4. Tipos textuales

LecturIA trabaja con tres tipos textuales. El generador debe priorizar ciertos
tipos de pregunta según el género del texto.

### Texto narrativo (cuentos, relatos, fábulas)
- Tipos preferidos: literal, inferencial, causa-efecto, vocabulario en contexto.
- Buenas preguntas: sobre personajes, secuencia de acciones, motivaciones,
  ambientación.
- Evitar: idea principal en relatos muy largos sin moraleja clara.

### Texto expositivo (informativo, divulgación, ciencias sociales/naturales)
- Tipos preferidos: literal, idea principal, detalle específico, vocabulario
  en contexto.
- Buenas preguntas: sobre conceptos definidos, datos, relaciones entre
  fenómenos, propósito del texto.
- Evitar: preguntas que pidan inferir intenciones de personajes (no aplica).

### Texto instructivo (recetas, instructivos, procedimientos)
- Tipos preferidos: literal, detalle específico, causa-efecto.
- Buenas preguntas: sobre orden de pasos, propósito de un paso, materiales
  o ingredientes, consecuencia de saltearse un paso.
- Evitar: idea principal (suele ser obvia: "explicar cómo hacer X").

## 5. Reglas de construcción

### Sobre la pregunta
- Una sola idea por pregunta. Nunca dos preguntas en una.
- Redacción afirmativa cuando sea posible. Evitar dobles negaciones.
- No usar "¿cuál NO es…?" en nivel FÁCIL.
- No preguntar opiniones del estudiante (LecturIA evalúa comprensión, no juicio
  personal).

### Sobre las opciones (siempre 4)
- Las cuatro opciones deben ser **gramaticalmente homogéneas**: si la correcta
  es una frase, las cuatro son frases; si es una palabra, las cuatro son
  palabras.
- Longitud comparable: la correcta no debe ser sistemáticamente la más larga
  ni la más detallada.
- Una sola opción inequívocamente correcta. Si dos pueden defenderse, la
  pregunta está mal hecha.
- Distractores plausibles: deben provenir del universo del texto (personajes,
  lugares, conceptos mencionados) o ser confusiones razonables, no respuestas
  absurdas o humorísticas.
- No usar "todas las anteriores" ni "ninguna de las anteriores".

### Sobre el lenguaje
- Español rioplatense escolar. Se permite "vos" si el texto lo usa.
- Sin modismos regionales fuertes ni jerga.
- Sin contenido que requiera saberes culturales específicos no presentes en
  el texto.

## 6. Lo que LecturIA NO hace

- No genera preguntas de opinión o valoración personal.
- No genera preguntas que requieran conocimientos previos del estudiante.
- No usa textos con violencia explícita, contenido sexual o discriminatorio.
- No reemplaza al docente: las preguntas pasan por revisión docente antes de
  llegar al estudiante.
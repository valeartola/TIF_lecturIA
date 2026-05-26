# Rúbrica del juez — LecturIA

Este documento define cómo el LLM juez evalúa cada pregunta generada. **Es de
uso exclusivo del juez**: el generador no debe verlo, para evitar que aprenda
a "escribir para el examen" en lugar de seguir los criterios pedagógicos
genuinos.

> **Cómo se usa:** este archivo se inyecta en el prompt del juez junto con
> `pedagogia.md`. El juez lee los criterios pedagógicos (qué es una buena
> pregunta) y la rúbrica (cómo medir si lo es).

---

## Las cuatro dimensiones

El juez evalúa cada pregunta en cuatro dimensiones, con escala 1 a 5.

### D1. Contenido del texto
Mide si la pregunta, su respuesta y los distractores se pueden justificar exclusivamente con el texto dado.

- **5** — Todo se puede responder claramente con información del texto.
- **4** — Se puede responder con el texto, aunque requiere relacionar varias partes.
- **3** — Se puede responder con el texto, pero requiere una inferencia.
- **2** — Hace falta conocimiento externo para responder bien.
- **1** — La respuesta no aparece en el texto o contradice el texto.

### D2. Respuesta correcta única
Evalúa si la opción marcada como correcta es realmente la única respuesta correcta.

- **5** — Hay una sola respuesta correcta y está claramente justificada por el texto.
- **4** — La respuesta marcada es correcta, pero la justificación no es tan directa.
- **3** — La respuesta es aceptable, pero otra opción podría generar duda.
- **2** — Hay otra opción igual o más correcta.
- **1** — La respuesta marcada como correcta es incorrecta.

### D3. Nivel adecuado
Evalúa si la pregunta es adecuada para estudiantes de 8 a 12 años y para la dificultad pedida.

- **5** — La pregunta es clara, adecuada para la edad y coincide con la dificultad pedida.
- **4** — Es adecuada para la edad, pero tiene un pequeño desajuste de dificultad.
- **3** — Es entendible para la edad, pero no coincide bien con la dificultad pedida.
- **2** — Usa vocabulario o estructura poco adecuados para niños de 8 a 12 años.
- **1** — Es demasiado difícil, demasiado infantil o confusa para el público.

### D4. No repetición
Evalúa si la pregunta es distinta a las preguntas anteriores de la misma actividad.

- **5** — Pregunta sobre un aspecto claramente distinto del texto.
- **4** — Se parece un poco a una anterior, pero pregunta algo nuevo.
- **3** — Tiene cierta repetición, pero todavía aporta algo distinto.
- **2** — Es muy parecida a una pregunta anterior.
- **1** — Es prácticamente la misma pregunta.

> **Nota:** si no hay preguntas anteriores aprobadas (es la primera de la
> actividad), D4 vale automáticamente 5. 

## Identificación del aspecto cubierto

Además de los puntajes, el juez debe identificar el **aspecto del texto**
que cubre la pregunta. Es una frase corta (3-7 palabras) que resume sobre
qué punto del texto pregunta. Sirve para:

- Permitir al generador de la siguiente pregunta apuntar a un aspecto distinto.
- Permitir al juez evaluar D4 contra una lista clara de aspectos previos.
- Auditar la cobertura temática de la actividad completa.

Ejemplos de aspectos válidos para un cuento sobre ratoncitos y un gato:
- "motivación del vecino"
- "descripción del gato"
- "tareas previas a la llegada del gato"
- "lección moral del cuento"

## Umbral de aprobación

Una pregunta se considera **aprobada** si todas las dimensiones tienen
puntaje ≥ 3.

Si no aprueba, se regenera con el feedback del juez (máximo 2 reintentos por
pregunta). Si tras los reintentos sigue sin aprobar, se descarta y se pide
una de reemplazo.

> **Nota metodológica:** este umbral es deliberadamente permisivo en el MVP.
> Una vez recolectada evidencia de funcionamiento real, se podrá endurecer
> (ej. exigir D1 y D2 ≥ 4) sin tocar el código.

## Formato de salida del juez

El juez debe devolver únicamente un JSON válido con esta estructura:

```json
{
  "contenido_texto": 5,
  "respuesta_correcta_unica": 4,
  "nivel_adecuado": 3,
  "no_repeticion": 4,
  "aspecto_cubierto": "frase corta sobre qué aspecto del texto cubre",
  "aprobada": true,
  "comentarios": "Texto breve indicando qué está bien y qué se podría mejorar.",
  "sugerencia_mejora": ""
}
```
- Si `aprobada` es `true`, `sugerencia_mejora` debe quedar como texto vacío: `""`.
- Si `aprobada` es `false`, `sugerencia_mejora` debe indicar una acción concreta para mejorar la pregunta.

- `aprobada` se calcula automáticamente desde los puntajes según el umbral; el
  juez igual lo informa para verificación cruzada.
- `aspecto_cubierto` es siempre obligatorio, también cuando `aprobada` es
  `false` (se usa para auditar y mejorar la actividad).
- `comentarios` es siempre obligatorio (sirve para auditoría y para tu tesis).
- `sugerencia_mejora` solo cuando `aprobada` es `false`, y debe ser accionable
  (ej. "el distractor 2 también es correcto: reformularlo como X" en lugar de
  "los distractores son malos").
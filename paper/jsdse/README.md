# Manuscrito para el Journal of Statistics and Data Science Education

Revista elegida el 2026-09-07. Publicada por la **American Statistical Association**
(Taylor & Francis). `article.tex` es el manuscrito; `ref.bib`, la bibliografía.

## La revista

| | |
|---|---|
| Factor de impacto | 2.3 (2025), **Q2** — ESCI, Web of Science |
| CiteScore | 4.3, **Q1** en Scopus |
| Envío → primera decisión | **8 días** |
| Envío → decisión tras revisión | 79 días |
| Aceptación → publicación en línea | 74 días |
| Tasa de aceptación | **15 %** |

## Requisitos de formato, verificados en su web

- **Word o LaTeX.** En LaTeX: clase `article` estándar y **sin macros especiales**. Por eso este
  manuscrito no reutiliza el `\pkg{}`, `\proglang{}` ni `\code{}` de la versión para JSS, y la
  bibliografía se limpió de ellos.
- Márgenes de **1 pulgada**, texto a **doble espacio**.
- `natbib` con `plain.bst` o `apalike.bst`. Aquí se usa `apalike`.
- Orden obligatorio de las secciones: portada · resumen · palabras clave ·
  *introduction, materials and methods, results, discussion* · agradecimientos ·
  declaración de intereses · referencias · apéndices · tablas · figuras.
- Resumen **no estructurado de 200 palabras**. Entre **3 y 6 palabras clave**.

## Revisión doble ciego: hay que entregar DOS versiones

JSDSE pide en el mismo envío una versión con autoría y otra anónima. En la anónima:

- fuera el nombre, la adscripción y el correo;
- fuera cualquier cita propia que delate la autoría;
- **y aquí está el problema particular de un artículo de software:** el repositorio, el DOI de
  Zenodo y la URL del demo llevan tu nombre. Hay que sustituirlos por enlaces anonimizados —
  servicios como `anonymous.4open.science` sirven para eso— o por marcadores del tipo
  *"[repository, anonymized for review]"*.

En `article.tex` esos tres sitios están marcados.

## Cómo compilar

No hay LaTeX instalado en tu equipo. Lo más cómodo es **[Overleaf](https://www.overleaf.com)**:
subes esta carpeta y compila ahí, sin instalar nada. Si algún día instalas MiKTeX o TeX Live:

```bash
pdflatex article && bibtex article && pdflatex article && pdflatex article
```

Esta plantilla usa solo paquetes estándar (`geometry`, `setspace`, `natbib`, `graphicx`, `url`),
así que no hay que descargar ficheros de estilo de la revista.

## Antes de enviar

Todo lo pendiente está marcado en el fuente con la etiqueta `TODO`:

```bash
grep -n "TODO" article.tex
```

Si no devuelve nada salvo las dos líneas de la cabecera que explican la convención, el
manuscrito está completo. **Los comentarios del `.tex` están en inglés a propósito**: Taylor &
Francis acepta envíos en LaTeX, así que el fuente llega a la revista y no debe llevar notas
de trabajo en otro idioma.

## Estado de las secciones

| Sección | Estado |
|---|---|
| Título, autoría, resumen, palabras clave | escritos |
| Introduction | **escrita**, falta la revisión de literatura educativa |
| Materials and Methods — diseño pedagógico | **escrita** (878 palabras, 4 subsecciones) |
| Materials and Methods — flujo de trabajo | pendiente |
| Materials and Methods — implementación | **escrita** |
| Materials and Methods — verificación | **escrita** |
| Results | **escrita** (~700 palabras) + Tabla 1 de concordancia numérica |
| Discussion | **escrita** (676 palabras, 4 subsecciones) |

## Los dos riesgos de este envío

**1. La sección de resultados.** Ya está escrita: el recorrido por iris, el desacuerdo entre
los ocho criterios de retención y la Tabla 1 de concordancia con R. Aun así, sin evaluación
de aprendizaje no hay un estudio que reportar, y puede que encaje mejor como **Brief Communication** que como Article completo:
vale la pena preguntárselo al editor antes de enviar.

**2. Falta la literatura educativa.** JSDSE es una revista de educación. Esperan que el trabajo
dialogue con la literatura sobre enseñanza de la estadística y software educativo, no solo con
la del método. Sin eso, el manuscrito parece un manual de usuario y los revisores lo dirán.

Su guía advierte además que las reseñas de software se consideran *"provided these reviews
describe actual experiences using the materials"*. No hace falta un estudio con instrumentos,
pero sí contar cómo se ha usado.

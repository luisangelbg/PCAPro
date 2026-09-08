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
  declaración de intereses · referencias · apéndices · tablas · figuras. Los
  agradecimientos son opcionales y este manuscrito no los lleva.
- Resumen **no estructurado de 200 palabras**. Entre **3 y 6 palabras clave**.

## Revisión doble ciego: hay que entregar DOS versiones

JSDSE pide en el mismo envío una versión con autoría y otra anónima. La anónima **no se
escribe a mano**: se genera desde `article.tex` con

```bash
cd paper/jsdse && perl anonymise.pl
```

que produce `article-anon.tex` vaciando la autoría, eliminando los agradecimientos,
sustituyendo las tres URL que llevan el nombre de usuario y el DOI, y comprobando después
que no sobreviva ninguna cadena identificadora. **Hay que volver a ejecutarlo cada vez que
cambie `article.tex`**, y nunca editar `article-anon.tex` directamente: se sobrescribe.

Queda un límite que el script no puede resolver y conviene tener presente: el nombre
PCAPro está en el título y en todo el texto, y buscarlo lleva al repositorio público y de
ahí al autor. Renombrar el software haría ilegible el artículo. Es la situación habitual de
un artículo sobre software ya publicado; lo honesto es declararlo en la carta al editor.

Para el demo se puede ofrecer acceso a través de la revista, o desplegar una copia en un
host neutral. `anonymous.4open.science` sirve para el código fuente, no para una
instalación en funcionamiento.

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
| Introduction | **escrita**, con literatura educativa y comparación de herramientas |
| Materials and Methods — diseño pedagógico | **escrita** (878 palabras, 4 subsecciones) |
| Materials and Methods — flujo de trabajo | **escrita** (~510 palabras, los seis bloques) |
| Materials and Methods — implementación | **escrita** |
| Materials and Methods — verificación | **escrita** |
| Results | **escrita** (~700 palabras) + Tabla 1 de concordancia numérica |
| Discussion | **escrita** (676 palabras, 4 subsecciones) |
| Agradecimientos | eliminados: no hay a quién agradecer |

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

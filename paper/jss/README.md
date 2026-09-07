# Manuscrito para el Journal of Statistical Software

Documento de trabajo. `article.tex` es el manuscrito; `ref.bib`, la bibliografía.

## Qué falta en el repositorio

Los ficheros de estilo de JSS — `jss.cls`, `jsslogo.jpg` y compañía — **no se versionan aquí**:
son de la revista y se descargan de su guía de estilo.

1. Ve a <https://www.jstatsoft.org/pages/view/style>
2. Descarga **`jss-article-tex.zip`**
3. Descomprímelo y copia los ficheros de estilo a esta carpeta, junto a `article.tex`

## Cómo compilar

**Sin instalar nada:** sube esta carpeta a [Overleaf](https://www.overleaf.com) y compila ahí.
Es lo más cómodo, porque no hay LaTeX instalado en tu equipo.

**En local**, si algún día instalas una distribución de LaTeX (MiKTeX o TeX Live):

```bash
texi2pdf article.tex
```

JSS exige **pdfLaTeX**, no xelatex ni lualatex.

## Lo que hay que entregar a JSS

Son tres adjuntos, y solo se envía el PDF del manuscrito:

| | |
|---|---|
| Manuscrito | el PDF compilado de `article.tex`, en estilo JSS |
| Código fuente | el repositorio de PCAPro |
| Material de replicación | `lib/reproduce-iris.js` y lo que se añada del caso de estudio |

JSS lo pide así: *"replication materials for all results from the manuscript, preferably via a
single, commented standalone replication script"*. Esa pieza ya existe y corre en la integración
continua, así que no puede quedar desactualizada en silencio.

## Convenciones de estilo que JSS revisa

Devuelven sin revisar los manuscritos que no las cumplen:

- `\proglang{}` para lenguajes, `\pkg{}` para paquetes y `\code{}` para código, **también en
  títulos y referencias**
- Título del artículo en *title style*; los títulos de sección en *sentence style*, es decir solo
  la primera palabra en mayúscula
- Referencias en BibTeX, citadas con `\cite`, `\citep`, `\citet`
- LaTeX lo más simple posible: sin paquetes que no hagan falta

El manual completo (`jss.pdf`) viene dentro del zip de la plantilla.

## Estado de las secciones

| Sección | Estado |
|---|---|
| Introduction | escrita |
| The decision points of a PCA | esqueleto con las subsecciones y las citas previstas |
| Implementation | escrita |
| Comparison with existing implementations | esqueleto; falta la tabla empírica |
| Illustration | **vacía — decide el artículo** |
| Summary and discussion | vacía |

El caso de estudio es lo que falta de verdad. JSS pide *"an enlightening non-trivial case study"*,
e iris no sirve: es trivial y lo usa todo el mundo. Hace falta un conjunto de datos real, con
suficientes variables cuantitativas, una estructura que merezca interpretarse, y que se pueda
distribuir junto al material de replicación.

# PCAPro

Plataforma local dedicada exclusivamente al **Análisis de Componentes Principales (ACP)**:
preparación de datos, verificación de supuestos, extracción, rotación, gráficos factoriales
e interpretación, con figuras editables y exportables a resolución de publicación.

Todo el cálculo ocurre **en tu navegador**, en JavaScript puro (sin Python, sin Pyodide,
sin espera de carga). Ningún dato sale de tu computadora.

## Cómo abrir

1. Clic derecho en **`servidor.ps1`** → *Ejecutar con PowerShell*.
2. Se abre solo `http://localhost:8790`. Si el puerto está ocupado:
   `powershell -ExecutionPolicy Bypass -File servidor.ps1 -Port 9001`

También funciona con doble clic en `index.html`, pero entonces **no cargan los archivos
de ejemplo** de `datos/` (el navegador bloquea la lectura local desde `file://`).
Para verlo desde una tablet en la misma red WiFi, ejecuta el script *como administrador*.

## Estado de los bloques

| Bloque | Contenido | Estado |
|---|---|---|
| 1 | Carga, tipificación de variables, estandarización, supuestos y diagnóstico | ✅ listo |
| 2 | Extracción: valores propios, varianza, sedimentación, Horn, bastón roto, MAP | ✅ listo |
| 3 | Rotaciones: varimax, quartimax, equamax, parsimax, promax, oblimin, quartimin | ✅ listo |
| 4 | Gráficos factoriales: círculo de correlaciones, individuos, biplot, elipses | ✅ listo |
| 5 | Interpretación: nombrar ejes, valores test, comparación de grupos, ajuste | ✅ listo |
| 6 | Informe automático y exportación completa (HTML, PDF, ZIP) | ✅ listo |

## Bloque 1 — qué hace

**Carga.** `.xlsx`, `.xls`, `.csv`, `.tsv`, `.txt`. Detecta el separador de columnas y el
separador decimal (coma o punto), permite elegir la hoja del libro y reconoce los códigos
de vacío habituales (`NA`, `N/A`, `.`, `-`, `?`, `ND`, `s/d`, celda vacía…).

**Tipificación.** Clasifica cada columna en numérica continua, numérica entera, categórica
o identificador, y calcula n, faltantes, únicos, media, DE, mínimo, máximo, asimetría,
curtosis, CV y atípicos univariados, con una miniatura de la distribución. Tú asignas el
papel final de cada variable: **activa**, **cuantitativa suplementaria**, **cualitativa/grupo**,
**identificador** o **excluida**.

**Selección rápida de variables.** Una fila de casillas permite elegir de un vistazo qué variables
entran al ACP; al desmarcar una, pasa a cuantitativa suplementaria (se proyecta sin construir los
ejes) en lugar de perderse. Las casillas y los desplegables de la tabla se mantienen sincronizados.

**Preparación.** Tratamiento de faltantes (eliminación por lista, imputación por media o
mediana); transformación previa (ln, log₁₀, raíz cuadrada, inversa); y siete opciones de
escalado: **z** (recomendada, ACP sobre correlaciones), sin escalar, solo centrado, Pareto,
VAST, rango [0,1] y robusta (mediana/MAD).

**Diagnóstico automático de supuestos.**

- Razón n:p y tamaño absoluto de muestra
- Prueba de esfericidad de **Bartlett** (χ², gl, p)
- Índice **KMO** global y **MSA** por variable
- Determinante de la matriz de correlaciones (singularidad)
- Correlación absoluta media y pares redundantes (|r| ≥ 0.90)
- Razón entre la mayor y la menor desviación estándar (¿hace falta estandarizar?)
- Atípicos multivariantes por **distancia de Mahalanobis** (corte χ²₀.₉₉₉)
- Asimetría y curtosis por variable
- Vista previa de dimensionalidad (componentes con λ > 1)
- **Calificación global de aptitud** A/B/C/D sobre 100 y lista de recomendaciones accionables

**Figuras** (todas editables y exportables): mapa de datos faltantes, perfil de escalas,
rejilla de histogramas con curva normal, matriz de correlaciones y diagrama de cajas tras
el escalado.

**Descargas:** matriz preparada (CSV), matriz de correlaciones (CSV), resumen de variables
(CSV) e informe del bloque (TXT).

## Bloque 2 — qué hace

**Extracción.** Descomposición espectral de la matriz preparada (correlaciones si estandarizaste,
covarianzas si no): valores propios, vectores propios, puntuaciones de los individuos y cargas
(correlación variable–componente), con el error estándar asintótico de λ.

**Ocho criterios de retención**, calculados y comparados:

- Análisis paralelo de Horn contra el percentil 95, por **permutación de tus datos** (no supone
  normalidad, funciona con covarianzas) o por datos normales aleatorios; 200/500/1000 repeticiones
- Kaiser–Guttman (λ > 1) o, sin estandarizar, «λ mayor que el promedio»
- Jolliffe (λ > 0.7)
- Bastón roto (*broken stick*)
- MAP de Velicer, con su tabla completa y las versiones al cuadrado y a la cuarta
- Codo del scree, estimado por máxima segunda diferencia
- Varianza acumulada ≥ 70 % y ≥ 80 %

Todo se resume en una **recomendación por consenso ponderado**, que el usuario puede aceptar o
sustituir por su propio número; todas las tablas y figuras se recalculan al cambiarlo.

**Figuras:** gráfico de sedimentación (con líneas de Kaiser, análisis paralelo y bastón roto
superponibles, y sombreado de los componentes retenidos), análisis paralelo observado vs. aleatorio,
varianza acumulada con umbral configurable, y comparación de los ocho criterios.

**Tabla de cargas sin rotar** con comunalidades y umbral de resaltado ajustable (0.30–0.70).

**Descargas:** valores propios, cargas y puntuaciones de los individuos (CSV).

## Bloque 3 — qué hace

**Siete rotaciones**, implementadas con el algoritmo de proyección de gradiente de Jennrich
(2001, 2002), el mismo que usa `GPArotation` en R:

- **Ortogonales** (familia ortomax): varimax (γ=1), quartimax (γ=0), equamax (γ=k/2) y
  parsimax (γ=p(k−1)/(p+k−2)), con **normalización de Kaiser** opcional (activada por defecto,
  como en SPSS y `stats::varimax`).
- **Oblicuas**: quartimin, oblimin directo con δ ajustable, y promax con κ ajustable.
- Y la opción **sin rotar**, para comparar.

**Diagnóstico de estructura simple** según los criterios de Thurstone: variables con carga limpia,
cargas cruzadas, variables sin representar y **complejidad de Hofmann** por variable
(`c = (Σa²)²/Σa⁴`, ideal 1). Una tarjeta compara automáticamente la solución rotada con la original
y dice si la rotación mereció la pena.

**Matrices**: patrón, estructura y Φ (correlación entre componentes) para las oblicuas; tabla de
varianza antes y después de rotar; umbral de carga interpretable configurable (0.30–0.70).

**Lectura automática de cada componente**: qué variables cargan positiva y negativamente, si es un
eje de contraste, y aviso si un componente descansa en una sola variable marcadora.

**Figuras:** mapa de calor de la matriz de cargas (agrupable por componente), plano de cargas con
círculo unitario y la posición sin rotar superpuesta en gris —se ve el giro—, barras de cargas por
componente con línea de umbral, y comparación de la varianza antes/después de rotar.

**Descargas:** cargas rotadas, matriz de estructura, matriz Φ y puntuaciones rotadas
(método de regresión de Thurstone), todas en CSV.

## Bloque 4 — qué hace

Trabaja sobre la solución **sin rotar o rotada**, a elección. Calcula coordenadas, **cos²**
(calidad de representación) y **contribuciones** de variables e individuos, y proyecta los
elementos suplementarios definidos en el Bloque 1.

**Cinco figuras:**

- **Círculo de correlaciones** — coloreado por cos² o por contribución, con círculo unitario y
  círculo de 0.71, filtro por calidad mínima o por las N mejores variables, y las cuantitativas
  suplementarias en trazo discontinuo. Las etiquetas se apilan sin solaparse y se conectan a su
  flecha con un hilo.
- **Mapa de individuos** — coloreado por grupo, por cos² o por contribución; tamaño de punto
  proporcional a cos²; centroides; etiquetas (ninguna / todas las que quepan / las N que más
  contribuyen); y tres tipos de envoltura por grupo.
- **Biplot** — individuos y variables superpuestos, con escala de flechas ajustable.
- **Contribuciones** — de variables o de individuos, por eje o para el plano, con la línea de
  referencia del valor esperado (100/p o 100/n) y filtro de los N mayores.
- **cos²** — mapa de calor de la calidad de representación variable × eje.

**Tres tipos de envoltura por grupo**, cada uno con su significado:
elipse de **concentración** (≈95 % de las observaciones, no depende de n),
elipse de **confianza de la media** (dónde está el centroide, √n veces menor) y
**envolvente convexa** (sin supuestos distribucionales). Nivel configurable a 90/95/99 %.

**Elementos suplementarios**: coordenadas de las variables cuantitativas (correlación con cada eje)
y centroides de cada categoría.

**Descargas:** coordenadas + cos² + contribuciones de individuos y de variables, y elementos
suplementarios (CSV).

## Bloque 5 — qué hace

**Nombrar los ejes.** Propone un nombre para cada componente a partir de sus cargas dominantes
(detectando si es un eje de contraste) y deja un campo editable; el nombre que pongas se usa en la
lectura automática y en el borrador de resultados.

**Descripción de cada dimensión** (equivalente a `dimdesc()` de FactoMineR): correlación de cada
variable activa y suplementaria con las puntuaciones del eje, con su r², su valor p y su marca de
significación, ordenables y filtrables.

**Valores test de las categorías** — el estadístico de la escuela francesa:
`v = (x̄_cat − x̄) / √[(s²/n_q)·(N−n_q)/(N−1)]`, que bajo la nula es N(0,1). Tabla y mapa de calor
con |v| ≥ 1.96 (*) y ≥ 2.58 (**) resaltados.

**Comparación de grupos sobre los componentes**: ANOVA de una vía con **η²** y **ω²**, más
**Kruskal–Wallis** con corrección por empates, y una figura de cajas o de media ± IC 95 % por
componente. Con la advertencia explícita de que son contrastes descriptivos, no confirmatorios.

**Individuos característicos**: los cinco más extremos a cada lado de cada eje.

**Calidad del ajuste**: matriz de correlaciones reproducida (`A·Aᵀ`, o `P·Φ·Pᵀ` si la rotación es
oblicua), matriz de residuos con mapa de calor, **RMSR** y conteo de residuos por encima de 0.05.

**Borrador de la sección de resultados** redactado con tus propios números, con botón de copiar.

**Descargas:** descripción de dimensiones, valores test y matriz de residuos (CSV).

## Bloque 6 — qué hace

Reúne los cinco bloques anteriores en tres entregables.

**Informe en HTML autocontenido.** Portada, resumen, métodos redactados automáticamente con tus
propios parámetros, tablas con formato académico (reglas superior e inferior, números alineados a la
derecha, leyenda numerada), las **22 figuras incrustadas como SVG vectorial**, interpretación,
limitaciones detectadas, referencias metodológicas y anexo con la configuración. Un solo archivo,
sin dependencias externas. Puedes elegir qué secciones incluir; las de bloques que no ejecutaste se
desactivan solas.

> Las figuras se toman **en el estado en que las dejaste**: con los colores, paletas, títulos y
> opciones que hayas cambiado en el editor de cada bloque, no con los valores por defecto.

**PDF.** El informe lleva hoja de estilo de impresión que evita cortar tablas y figuras entre
páginas. Botón de imprimir → «Guardar como PDF».

**Paquete ZIP completo**, generado con un escritor ZIP propio (sin librerías):

```
informe_ACP.html
LEEME.txt
figuras/    22 figuras en SVG, PNG, JPG o WEBP (2× a 12×), o en SVG y PNG a la vez
tablas/     hasta 14 tablas de resultados en CSV
```

## Las figuras

Cada figura tiene un panel **⚙ Editar figura** con: título, subtítulo, títulos de ejes,
paleta categórica (10 opciones, incluida Okabe–Ito para daltónicos), paletas continuas
(viridis, magma, plasma, cividis, divergentes…), color único, tema (claro, papel, oscuro,
minimalista), tipografía, y opciones propias de cada gráfico.

### Tamaño de letra

Las 22 figuras llevan cuatro reguladores comunes al final del editor, con la lectura numérica
al lado:

| Regulador | Qué agranda |
|---|---|
| **Letra: todo** | Multiplica todo el texto de la figura a la vez (0.6× a 2.6×) |
| **Letra: títulos** | Título y subtítulo |
| **Letra: ejes y marcas** | Rótulos de los ejes y números de las marcas |
| **Letra: etiquetas y leyenda** | Nombres de variables, valores sobre las barras y leyendas |

Los tres específicos se multiplican por el global, así que se pueden combinar (por ejemplo,
todo a 1.4× y los ejes a 1.3× adicional).

Al agrandar la letra, **el lienzo se amplía solo** para que ningún texto quede cortado: los
interlineados de leyenda y la separación entre etiquetas crecen en la misma proporción, y el
`viewBox` se recalcula midiendo el contenido real. El tamaño de exportación se ajusta en
consecuencia, así que un PNG a 8× de una figura con letra grande sale completo.

Exportación en **SVG** (vectorial, editable en Inkscape o Illustrator), **PNG**, **JPG** y
**WEBP**, con cinco niveles de resolución: 2× (~150 ppp), 4× (~300 ppp), 6× (~450 ppp),
8× (~600 ppp) y 12× (~900 ppp), y fondo blanco o transparente.

## Cómo deben estar tus datos

- **Primera fila:** nombres de las variables.
- **Cada fila siguiente:** una observación (una planta, una parcela, un individuo…).
- Una sola tabla por hoja, sin filas ni columnas en blanco intercaladas, sin celdas combinadas.
- Al menos **3 variables numéricas** y, como regla, **10 observaciones por variable**.

Mira `datos/iris.csv` como plantilla. El botón «Ejemplo simulado» genera en el momento un
conjunto de 120 × 9 construido a partir de 3 factores latentes: sirve para explorar la
plataforma, **no son datos reales**.

## Verificación del motor numérico

Los resultados están contrastados contra R. Con `iris` estandarizado:

| | PCAPro | R (`prcomp`, `psych::KMO`, `cortest.bartlett`) |
|---|---|---|
| Valores propios | 2.9185 · 0.9140 · 0.1468 · 0.0207 | idénticos |
| Cargas del CP1 | 0.5211 · −0.2693 · 0.5804 · 0.5649 | idénticas |
| KMO global | 0.540 | 0.540 |
| Bartlett χ² | 706.96 (gl 6) | 706.96 |

## Material didáctico del taller

La carpeta **`curso/`** contiene el paquete completo para impartir un taller de 20 horas con esta
plataforma. Abre `curso/index.html` para el índice.

| Documento | Para quién |
|---|---|
| `manual_participante.html` | Participante. Teoría, 6 prácticas guiadas con recuadros de verificación, glosario |
| `datos.html` | Participante. Descarga y descripción de los cinco conjuntos |
| `guia_instructor.html` | **Instructor.** Tiempos minuto a minuto, errores típicos, preguntas de discusión |
| `CLAVES_instructor.md` | **Instructor.** Estructura sembrada en cada conjunto, con valores verificados |
| `evaluacion.html` | **Instructor.** Diagnóstica, lista de cotejo, examen de 20 reactivos, rúbrica |
| `constancia.html` | **Instructor.** Plantilla de constancia y temario para el registro del curso |
| `generar_datos.ps1` | Genera los cinco CSV. Semilla fija; cámbiala para producir variantes |

Los cinco conjuntos de práctica son **simulados con estructura conocida**: cada uno tiene sembrada
una lección concreta (un análisis limpio, escalas dispares, redundancia y atípicos, ausencia de
estructura, y un proyecto integrador con cuatro factores). Todos los valores del material están
verificados corriéndolos en PCAPro.

## Archivos

```
index.html        interfaz y marco teórico completo
css/style.css     estilos
js/core.js        estado global y utilidades
js/stats.js       motor numérico (álgebra, eigen por Jacobi, KMO, Bartlett, Mahalanobis, t, F, ANOVA, Kruskal)
js/figure.js      motor de figuras SVG, paletas y exportación
js/plots1.js      figuras del Bloque 1
js/plots2.js      figuras del Bloque 2
js/rotate.js      algoritmos de rotación (GPA de Jennrich, ortomax, oblimin, promax)
js/plots3.js      figuras del Bloque 3
js/factor.js      coordenadas, cos², contribuciones, suplementarios, elipses
js/plots4.js      figuras del Bloque 4
js/data.js        lógica del Bloque 1
js/block2.js      lógica del Bloque 2 (extracción y retención)
js/block3.js      lógica del Bloque 3 (rotación)
js/plots5.js      figuras del Bloque 5
js/block4.js      lógica del Bloque 4 (mapas factoriales)
js/report.js      informe HTML y escritor ZIP propio
js/block5.js      lógica del Bloque 5 (interpretación)
js/block6.js      lógica del Bloque 6 (informe y exportación)
datos/iris.csv    conjunto de ejemplo
servidor.ps1      servidor web local
```

/* PCAPro — análisis de componentes principales en el navegador.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it
   under the terms of the GNU General Public License as published by the Free
   Software Foundation, either version 3 of the License, or (at your option)
   any later version. This program is distributed WITHOUT ANY WARRANTY; see
   the GNU General Public License for more details. You should have received
   a copy of the License along with this program; if not, see
   <https://www.gnu.org/licenses/>. */

/* PCAPro — bilingual engine (Spanish / English).
   ------------------------------------------------------------------
   Design note: the dictionary is keyed by the SPANISH source string
   rather than by abstract identifiers. That keeps the source readable,
   avoids inventing hundreds of keys, and makes a missing translation
   fail visibly (the Spanish text shows through) instead of silently.

   Translation is applied in three places only:
     · elements carrying data-i18n / data-i18n-html in the markup;
     · blocks carrying data-lang, which are shown or hidden wholesale
       (used for the long theory sections);
     · the shared render helpers buildTable, statTiles and Fig.mount,
       so the ~200 label strings scattered through the plot modules are
       translated centrally, without touching each call site.
   ------------------------------------------------------------------ */

const I18N = {
  lang: 'es',
  supported: ['es', 'en'],
  names: { es: 'Español', en: 'English' },
  onChange: [],            // hooks that must re-render after a switch
};

/* ============================================================
   Dictionary: Spanish source string -> English
   ============================================================ */
I18N.en = {
  /* ---------- application shell ---------- */
  'Análisis de Componentes Principales': 'Principal Component Analysis',
  'PCAPro — Análisis de Componentes Principales': 'PCAPro — Principal Component Analysis',
  'Plataforma dedicada al <b>Análisis de Componentes Principales</b>: preparación de datos, verificación de supuestos, extracción, rotación e interpretación, con figuras editables y exportables a resolución de publicación.':
    'A platform devoted to <b>Principal Component Analysis</b>: data preparation, assumption checking, extraction, rotation and interpretation, with editable figures that export at publication resolution.',
  'Todo el cálculo ocurre en tu navegador': 'All computation runs in your browser',
  'Ningún dato sale de tu computadora': 'No data leaves your computer',
  'Figuras SVG / PNG hasta 12×': 'SVG / PNG figures up to 12×',

  /* ---------- stepper ---------- */
  'Datos y supuestos': 'Data and assumptions',
  'Extracción': 'Extraction',
  'Rotación': 'Rotation',
  'Gráficos factoriales': 'Factor maps',
  'Interpretación': 'Interpretation',
  'Informe': 'Report',

  /* ---------- generic actions ---------- */
  'Preparar matriz y diagnosticar →': 'Prepare matrix and run diagnostics →',
  'Extraer componentes →': 'Extract components →',
  'Aplicar rotación →': 'Apply rotation →',
  'Generar mapas factoriales →': 'Build factor maps →',
  'Interpretar componentes →': 'Interpret components →',
  'Generar vista previa': 'Generate preview',
  'Usar la recomendación del consenso': 'Use the consensus recommendation',
  'Marcar todas las numéricas como activas': 'Mark every numeric variable as active',
  'Desmarcar todas': 'Clear all',
  'Restaurar detección automática': 'Restore automatic detection',
  '↻ Actualizar estado': '↻ Refresh status',
  '⧉ Copiar párrafo': '⧉ Copy paragraph',
  '✔ Copiado': '✔ Copied',
  '⬇ Descargar figura': '⬇ Download figure',
  'Formato': 'Format',
  'Resolución': 'Resolution',
  'Fondo blanco': 'White background',
  'Fondo transparente (PNG)': 'Transparent background (PNG)',
  '⚙ Editar figura (colores, títulos, tamaño de letra)': '⚙ Edit figure (colours, titles, font size)',
  'PNG (mapa de bits)': 'PNG (raster)',
  'SVG (vectorial, editable)': 'SVG (vector, editable)',
  'Pantalla · 2× (~150 ppp)': 'Screen · 2× (~150 dpi)',
  'Alta · 4× (~300 ppp)': 'High · 4× (~300 dpi)',
  'Muy alta · 6× (~450 ppp)': 'Very high · 6× (~450 dpi)',
  'Publicación · 8× (~600 ppp)': 'Publication · 8× (~600 dpi)',
  'Máxima · 12× (~900 ppp)': 'Maximum · 12× (~900 dpi)',
  'Vectorial: se puede escalar sin perder nitidez y editar en Inkscape o Illustrator.':
    'Vector: scales without loss and can be edited in Inkscape or Illustrator.',

  /* ---------- figure controls ---------- */
  'Título': 'Title', 'Subtítulo': 'Subtitle', 'Tamaño título': 'Title size',
  'Título eje X': 'X axis title', 'Título eje Y': 'Y axis title',
  'Eje X': 'X axis', 'Eje Y': 'Y axis', 'Eje': 'Axis',
  'Eje horizontal': 'Horizontal axis', 'Eje vertical': 'Vertical axis',
  'Eje Y muestra': 'Y axis shows',
  'Tema': 'Theme', 'Tipografía': 'Typeface',
  'Paleta': 'Palette', 'Paleta (multicolor)': 'Palette (multicolour)',
  'Paleta categórica': 'Categorical palette', 'Paleta continua': 'Continuous palette',
  'Paleta de calidad': 'Quality palette', 'Paleta de grupos': 'Group palette',
  'Un solo color': 'Single colour', 'Color único': 'Single colour',
  'Colorear por': 'Colour by', 'Leyenda': 'Legend', 'Título leyenda': 'Legend title',
  'Mostrar valores': 'Show values', 'Mostrar r': 'Show r', 'Mostrar g₁': 'Show g₁',
  'Mostrar conteos': 'Show counts', 'Mostrar notas': 'Show notes',
  'Mostrar prueba': 'Show test', 'Mostrar sin rotar': 'Show unrotated',
  'Etiquetas': 'Labels', 'Etiquetas de valor': 'Value labels',
  'Tamaño etiqueta': 'Label size', 'N etiquetas': 'Number of labels',
  'Etiqueta del centroide': 'Centroid label',
  'Nombres de variables': 'Variable names',
  'Separadores': 'Cell borders', 'Contorno': 'Outline', 'Marco': 'Frame',
  'Ejes en cero': 'Zero axes', 'Opacidad': 'Opacity', 'Orden': 'Order',
  'Ordenar variables': 'Sort variables', 'Ordenar por magnitud': 'Sort by magnitude',
  'Ordenar por los primeros N ejes': 'Sort by the first N axes',
  'Agrupar por componente': 'Group by component',
  'Reordenar por similitud': 'Reorder by similarity',
  'Escala log': 'Log scale', 'Escala de color': 'Colour scale',
  'Escala de las flechas': 'Arrow scale',
  'Métrica': 'Metric', 'Forma': 'Shape', 'Triángulo': 'Triangle',
  'Columnas': 'Columns', 'Elementos': 'Elements', 'Nivel': 'Level',
  'Nivel de confianza': 'Confidence level',
  'Umbral': 'Threshold', 'Umbral (%)': 'Threshold (%)', 'Umbral de realce': 'Highlight threshold',
  'Línea de umbral': 'Threshold line', 'Línea de referencia': 'Reference line',
  'Línea de Kaiser': 'Kaiser line', 'Línea de la media': 'Mean line', 'Línea': 'Line',
  'Líneas en ±0.30': 'Lines at ±0.30',
  'Barras': 'Bars', 'Barras multicolor': 'Multicolour bars', 'Ancho de barra': 'Bar width',
  'Análisis paralelo': 'Parallel analysis', 'Bastón roto': 'Broken stick',
  'Sombrear retenidos': 'Shade retained', 'Marcar tu elección': 'Mark your choice',
  'Marcar atípicos': 'Mark outliers', 'Marcar significativos': 'Mark significant',
  'Atenuar no significativos': 'Fade non-significant',
  'Superponer datos': 'Overlay data points', 'Recortar colas extremas': 'Trim extreme tails',
  'Curva normal': 'Normal curve', 'Área bajo la curva': 'Area under the curve',
  'Círculo unitario': 'Unit circle', 'Círculo interior (0.71)': 'Inner circle (0.71)',
  'Círculo 0.71': 'Circle at 0.71',
  'Envoltura por grupo': 'Group envelope', 'Relleno': 'Fill', 'Relleno de la elipse': 'Ellipse fill',
  'Grosor del borde': 'Border width', 'Grosor del vector': 'Vector width',
  'Grosor de flechas': 'Arrow width', 'Unir con línea': 'Join with a line',
  'Centroides': 'Centroids', 'Borde blanco': 'White stroke',
  'Tamaño del punto': 'Point size', 'Tamaño según cos²': 'Size by cos²',
  'Tamaño (px)': 'Size (px)', 'Ancho (px)': 'Width (px)', 'Alto (px)': 'Height (px)',
  'Límite de ejes': 'Axis limit', 'Límite de escala (0 = auto)': 'Scale limit (0 = auto)',
  'Intervalos (0 = auto)': 'Bins (0 = auto)',
  'Misma escala en ambos ejes': 'Same scale on both axes',
  'Ocultar bajo el umbral': 'Hide below threshold', 'Ocultar cos² menor a': 'Hide cos² below',
  'Solo las N mejores (0 = todas)': 'Only the N best (0 = all)',
  'Solo las N mayores (0 = todas)': 'Only the N largest (0 = all)',
  'Solo los N mayores (0 = todos)': 'Only the N largest (0 = all)',
  'Solo significativas': 'Significant only',
  'Suplementarias': 'Supplementary', 'Color suplementarias': 'Supplementary colour',
  'Representación': 'Display',
  'Banda media–p95': 'Mean–p95 band',
  'Color barras': 'Bar colour', 'Color línea': 'Line colour', 'Color curva': 'Curve colour',
  'Color Kaiser': 'Kaiser colour', 'Color paralelo': 'Parallel analysis colour',
  'Color bastón': 'Broken stick colour', 'Color retenidos': 'Retained colour',
  'Color umbral': 'Threshold colour', 'Color marca': 'Marker colour',
  'Color de la marca': 'Marker colour', 'Color de las líneas': 'Line colour',
  'Color de flechas': 'Arrow colour', 'Color presente': 'Present colour',
  'Color faltante': 'Missing colour', 'Color positivo': 'Positive colour',
  'Color negativo': 'Negative colour', 'Color sobre el umbral': 'Above-threshold colour',
  'Color bajo el umbral': 'Below-threshold colour', 'Color referencia': 'Reference colour',
  'Color sin rotar': 'Unrotated colour', 'Color rotada': 'Rotated colour',
  'Color sin grupo': 'Ungrouped colour', 'Color observados': 'Observed colour',
  'Color aleatorios': 'Random colour',
  'Letra: todo': 'Font: everything', 'Letra: títulos': 'Font: titles',
  'Letra: ejes y marcas': 'Font: axes and ticks',
  'Letra: etiquetas y leyenda': 'Font: labels and legend',

  /* ---------- table headers and short labels ---------- */
  'Variable': 'Variable', 'Variables': 'Variables', 'Componente': 'Component',
  'Individuo': 'Individual', 'Individuos (coordenada)': 'Individuals (coordinate)',
  'Categoría': 'Category', 'Grupo': 'Group', 'Tipo': 'Type', 'Calidad': 'Quality',
  'Media': 'Mean', 'DE': 'SD', 'DE original': 'Original SD', 'Asimetría': 'Skewness',
  'Comunalidad': 'Communality', 'Complejidad': 'Complexity', 'Estructura': 'Structure',
  'Interpretación': 'Interpretation', 'Lectura': 'Reading', 'Retenido': 'Retained',
  'Valor propio λ': 'Eigenvalue λ', '± EE aprox.': '± approx. SE',
  '% varianza': '% variance', '% acumulado': '% cumulative',
  '% sin rotar': '% unrotated', '% rotado': '% rotated', '% acumulado rotado': '% cumulative rotated',
  'SS cargas sin rotar': 'SS unrotated loadings', 'SS cargas rotadas': 'SS rotated loadings',
  'λᵢ − λᵢ₊₁': 'λᵢ − λᵢ₊₁', 'p95 aleatorio': 'random p95',
  'Criterios que lo retienen': 'Criteria that retain it',
  'Componentes extraídos': 'Components extracted',
  'Media de r parciales²': 'Mean squared partial r',
  'Media de r parciales⁴': 'Mean partial r to the fourth',
  'Carga dominante': 'Dominant loading', 'Lado del eje': 'Side of the axis',
  'Correlación con el eje': 'Correlation with the axis',
  'Variable suplementaria': 'Supplementary variable', 'n válidos': 'valid n',
  'cos² plano': 'cos² plane', 'cos² plano 1–2': 'cos² plane 1–2',
  'Contrib. plano (%)': 'Contrib. plane (%)',
  'Coord.': 'Coord.', 'Centroide ': 'Centroid ', 'r con ': 'r with ', 'v.test ': 'v.test ',
  'IC 95 % de la media': '95 % CI of the mean',
  'p (ANOVA)': 'p (ANOVA)', 'p (Kruskal)': 'p (Kruskal)', 'H (Kruskal)': 'H (Kruskal)',
  'gl': 'df', 'n': 'n', 'p': 'p', 'r²': 'r²', 'F': 'F', 'MSA': 'MSA', 'CP': 'PC',
  'η²': 'η²', 'ω²': 'ω²',
  'Datos observados': 'Observed data', 'Media aleatoria': 'Random mean',
  'Percentil 95 aleatorio': 'Random 95th percentile',
  'Análisis paralelo (p95)': 'Parallel analysis (p95)', 'Kaiser (λ = 1)': 'Kaiser (λ = 1)',

  /* ---------- palettes, themes and typefaces ---------- */
  'PCAPro (violeta)': 'PCAPro (purple)', 'D3 clásica': 'D3 classic',
  'Set2 (suave)': 'Set2 (soft)', 'Okabe–Ito (daltónicos)': 'Okabe–Ito (colour-blind safe)',
  'Botánica': 'Botanical', 'Escala de grises': 'Greyscale',
  'Cividis (daltónicos)': 'Cividis (colour-blind safe)',
  'Rojo–Amarillo–Azul': 'Red–Yellow–Blue', 'Rojo–Azul (divergente)': 'Red–Blue (diverging)',
  'Espectral': 'Spectral', 'Azul–Blanco–Rojo': 'Blue–White–Red',
  'Verdes': 'Greens', 'Calor': 'Heat',
  'Claro': 'Light', 'Papel': 'Paper', 'Oscuro': 'Dark', 'Minimalista': 'Minimal',
  'Helvetica / Arial': 'Helvetica / Arial', 'Serif (Times)': 'Serif (Times)',
  'Monoespaciada': 'Monospaced',

  /* ---------- select options inside figure editors ---------- */
  'Valores propios (λ)': 'Eigenvalues (λ)', '% de varianza': '% of variance',
  'Desviación estándar': 'Standard deviation', 'Coef. de variación': 'Coeff. of variation',
  'Mayor a menor': 'Largest to smallest', 'Menor a mayor': 'Smallest to largest',
  'Original': 'Original',
  'Celdas': 'Cells', 'Círculos': 'Circles',
  'Completa': 'Full', 'Inferior': 'Lower', 'Superior': 'Upper',
  'Calidad (cos²)': 'Quality (cos²)', 'Contribución': 'Contribution',
  'Grupo / color fijo': 'Group / fixed colour',
  'Elipse de concentración': 'Concentration ellipse',
  'Elipse de confianza de la media': 'Confidence ellipse of the mean',
  'Elipse de la media': 'Ellipse of the mean',
  'Envolvente convexa': 'Convex hull', 'Ninguna': 'None',
  'Todas las que quepan': 'As many as fit',
  'Solo las N que más contribuyen': 'Only the N largest contributors',
  'Diagrama de cajas': 'Box plot', 'Media e IC 95 %': 'Mean and 95 % CI',
  'Por magnitud': 'By magnitude', 'De positivo a negativo': 'From positive to negative',
  'De 0 a 1': 'From 0 to 1', 'Ajustada al máximo': 'Scaled to the maximum',
  'Plano 1–2': 'Plane 1–2',

  /* ---------- statistic tiles: labels ---------- */
  'Observaciones': 'Observations', 'Observaciones (n)': 'Observations (n)',
  'Variables activas': 'Active variables', 'Variables activas (p)': 'Active variables (p)',
  'Razón n : p': 'n : p ratio', 'Cuanti. suplementarias': 'Supplementary quantitative',
  'Cualitativas / grupos': 'Qualitative / groups', 'Identificador': 'Identifier',
  'Excluidas': 'Excluded', 'KMO global': 'Overall KMO', 'Bartlett': 'Bartlett',
  'Determinante de R': 'Determinant of R', '|r| media': 'mean |r|',
  'Componentes λ > 1': 'Components with λ > 1', 'Atípicos (Mahalanobis)': 'Outliers (Mahalanobis)',
  'Componentes posibles': 'Possible components', 'Varianza total': 'Total variance',
  'Recomendación': 'Recommendation', 'Retenidos ahora': 'Currently retained',
  'Componentes rotados': 'Rotated components', 'Variables limpias': 'Clean variables',
  'Cargas cruzadas': 'Cross-loadings', 'Complejidad media': 'Mean complexity',
  'Sin representar': 'Not represented', 'Solución': 'Solution',
  'Variables bien representadas': 'Well represented variables',
  'Individuos con cos² ≥ 0.5': 'Individuals with cos² ≥ 0.5',
  'Variables de grupo': 'Grouping variables',
  'Componentes interpretados': 'Interpreted components', 'RMSR': 'RMSR',
  'Residuos > 0.05': 'Residuals > 0.05', 'Categorías caracterizadas': 'Characterised categories',
  'Varianza retenida': 'Retained variance',

  /* ---------- statistic tiles: sub-captions ---------- */
  'filas del archivo': 'rows in the file', 'entran al ACP': 'enter the PCA',
  'individuos por variable': 'individuals per variable',
  'se proyectan, no construyen ejes': 'projected, they do not build axes',
  'colorean individuos': 'colour the individuals',
  'etiqueta las filas': 'labels the rows',
  'se usará el número de fila': 'the row number will be used',
  'fuera del análisis': 'outside the analysis',
  'construyen los componentes': 'build the components',
  'adecuación muestral': 'sampling adequacy',
  'sin singularidad': 'no singularity', 'cercano a 0': 'close to 0',
  'tantos como variables activas': 'as many as active variables',
  'igual a p (correlaciones)': 'equal to p (correlations)',
  'en unidades al cuadrado': 'in squared units',
  'varianza del plano factorial': 'variance of the factor plane',
  'consenso de 8 criterios': 'consensus of 8 criteria',
  'ortogonal': 'orthogonal', 'oblicua': 'oblique',
  'variables con ≥ 2 cargas altas': 'variables with ≥ 2 high loadings',
  '1 = estructura simple perfecta': '1 = perfect simple structure',
  'componentes originales': 'original components',
  'varianza representada': 'variance represented',
  'cos² ≥ 0.5 en el plano 1–2': 'cos² ≥ 0.5 in plane 1–2',
  'bien situados en el plano': 'well placed in the plane',
  'proyectadas sobre el círculo': 'projected on the circle',
  'ninguna definida': 'none defined', 'disponibles para colorear': 'available for colouring',
  'solución rotada': 'rotated solution', 'solución sin rotar': 'unrotated solution',
  'residuo cuadrático medio': 'root mean square residual',
  'pares mal reproducidos': 'poorly reproduced pairs',
  '|v.test| ≥ 1.96 en algún eje': '|v.test| ≥ 1.96 on some axis',
  'por los ejes interpretados': 'by the interpreted axes',
  'D² > χ²₀.₉₉₉': 'D² > χ²₀.₉₉₉',
  'clásico; tiende a sobreestimar': 'classic; tends to overestimate',
  'conservador; frecuente en ecología': 'conservative; common in ecology',
  'mínimo de correlaciones parciales²': 'minimum of squared partial correlations',
  'máxima curvatura de la caída': 'greatest curvature of the descent',
  'umbral habitual en ciencias naturales': 'usual threshold in the natural sciences',
  'umbral exigente': 'demanding threshold',
  'versión relajada de Kaiser': 'relaxed version of Kaiser',
  'no aplica sin estandarizar': 'does not apply without standardisation',
  'λ mayor que el promedio': 'λ greater than the average',
  'efecto grande': 'large effect', 'efecto medio': 'medium effect', 'efecto pequeño': 'small effect',
  'separa los grupos': 'separates the groups', 'no distingue grupos': 'does not distinguish groups',
  'activa': 'active', 'suplementaria': 'supplementary',

  /* ---------- criterion names ---------- */
  'Análisis paralelo (Horn)': 'Parallel analysis (Horn)',
  'Kaiser–Guttman (λ > 1)': 'Kaiser–Guttman (λ > 1)',
  'Media de los λ': 'Mean of the λ',
  'MAP de Velicer': "Velicer's MAP",
  'Codo del scree (Cattell)': 'Scree elbow (Cattell)',
  'Varianza acumulada ≥ 70 %': 'Cumulative variance ≥ 70 %',
  'Varianza acumulada ≥ 80 %': 'Cumulative variance ≥ 80 %',
  'Jolliffe (λ > 0.7)': 'Jolliffe (λ > 0.7)',

  /* ---------- rotation methods ---------- */
  'Sin rotar (solución original)': 'Unrotated (original solution)',
  'Varimax': 'Varimax', 'Quartimax': 'Quartimax', 'Equamax': 'Equamax', 'Parsimax': 'Parsimax',
  'Quartimin (oblicua)': 'Quartimin (oblique)',
  'Oblimin directo (oblicua)': 'Direct oblimin (oblique)',
  'Promax (oblicua)': 'Promax (oblique)',

  /* ---------- scaling methods ---------- */
  'Estandarización z (matriz de correlaciones)': 'z standardisation (correlation matrix)',
  'Sin escalar (matriz de covarianzas)': 'Unscaled (covariance matrix)',
  'Solo centrado (matriz de covarianzas)': 'Centred only (covariance matrix)',
  'Escalado de Pareto': 'Pareto scaling', 'Escalado VAST': 'VAST scaling',
  'Escalado al rango [0, 1]': 'Range scaling [0, 1]',
  'Escalado robusto (mediana / MAD)': 'Robust scaling (median / MAD)',

  /* ---------- section headings ---------- */
  'Marco teórico del Análisis de Componentes Principales': 'Theoretical background of Principal Component Analysis',
  '1.1 · Sube tu base de datos': '1.1 · Load your data set',
  '1.2 · Define el papel de cada variable': '1.2 · Set the role of each variable',
  '1.3 · Preparación de la matriz': '1.3 · Preparing the matrix',
  '1.4 · Vista previa del archivo': '1.4 · File preview',
  '1.5 · Diagnóstico de la base de datos': '1.5 · Data set diagnostics',
  '1.6 · Exploración gráfica': '1.6 · Graphical exploration',
  '1.7 · Recomendaciones sobre tu base de datos': '1.7 · Recommendations on your data set',
  '1.8 · Matriz preparada y descargas': '1.8 · Prepared matrix and downloads',
  'Extracción de componentes: teoría': 'Component extraction: background',
  '2.1 · Extraer los componentes': '2.1 · Extract the components',
  '2.2 · Valores propios y varianza explicada': '2.2 · Eigenvalues and explained variance',
  '2.3 · ¿Cuántos componentes retener?': '2.3 · How many components should be retained?',
  '2.4 · Figuras de extracción': '2.4 · Extraction figures',
  '2.5 · Matriz de componentes (cargas sin rotar)': '2.5 · Component matrix (unrotated loadings)',
  'Rotación: teoría': 'Rotation: background',
  '3.1 · Elegir la rotación': '3.1 · Choose the rotation',
  '3.2 · Calidad de la estructura simple': '3.2 · Quality of the simple structure',
  '3.3 · Matriz de cargas rotadas': '3.3 · Rotated loading matrix',
  '3.4 · Lectura de cada componente': '3.4 · Reading each component',
  '3.5 · Figuras de la rotación': '3.5 · Rotation figures',
  'Mapas factoriales: teoría': 'Factor maps: background',
  '4.1 · Construir los mapas': '4.1 · Build the maps',
  '4.2 · Resumen del plano factorial': '4.2 · Summary of the factor plane',
  '4.3 · Círculo de correlaciones': '4.3 · Correlation circle',
  '4.4 · Mapa de individuos': '4.4 · Map of individuals',
  '4.5 · Biplot': '4.5 · Biplot',
  '4.6 · Contribuciones y calidad': '4.6 · Contributions and quality',
  '4.7 · Elementos suplementarios': '4.7 · Supplementary elements',
  '4.8 · Descargas': '4.8 · Downloads',
  'Interpretación: teoría': 'Interpretation: background',
  '5.1 · Configuración': '5.1 · Settings',
  '5.2 · Resumen': '5.2 · Summary',
  '5.3 · Descripción de cada dimensión': '5.3 · Description of each dimension',
  '5.4 · Caracterización por categorías (valores test)': '5.4 · Characterisation by category (test values)',
  '5.5 · Comparación de grupos sobre los componentes': '5.5 · Group comparison on the components',
  '5.6 · Individuos característicos de cada eje': '5.6 · Individuals that characterise each axis',
  '5.7 · Calidad del ajuste': '5.7 · Goodness of fit',
  '5.8 · Lectura de los componentes': '5.8 · Reading the components',
  'Informe y exportación': 'Report and export',
  '6.1 · Estado del análisis': '6.1 · Status of the analysis',
  '6.2 · Configuración del informe': '6.2 · Report settings',
  '6.3 · Vista previa': '6.3 · Preview',

  /* ---------- sub-headings ---------- */
  'Selección rápida de variables activas': 'Quick selection of active variables',
  'Datos faltantes': 'Missing data',
  'Adecuación muestral por variable (MSA)': 'Sampling adequacy per variable (MSA)',
  'Criterio de Velicer (MAP)': "Velicer's criterion (MAP)",
  'Tu decisión': 'Your decision',
  'Varianza por componente': 'Variance per component',
  'Matriz de estructura': 'Structure matrix',
  'Correlación entre componentes (Φ)': 'Correlation between components (Φ)',
  'Individuos más influyentes': 'Most influential individuals',
  'Variables cuantitativas suplementarias': 'Supplementary quantitative variables',
  'Centroides de las categorías': 'Category centroids',
  'Medias por grupo': 'Group means',
  'Nombra cada componente': 'Name each component',
  'Borrador para la sección de resultados': 'Draft for the results section',
  'Secciones a incluir': 'Sections to include',
  'Figuras': 'Figures',

  /* ---------- form options ---------- */
  'Detectar automáticamente': 'Detect automatically',
  'Punto (12.34)': 'Point (12.34)', 'Coma (12,34)': 'Comma (12,34)',
  'Coma ,': 'Comma ,', 'Punto y coma ;': 'Semicolon ;',
  'Tabulador': 'Tab', 'Barra vertical |': 'Vertical bar |',
  'Ejemplo real: iris (150 × 4)': 'Real example: iris (150 × 4)',
  'Ejemplo simulado: morfometría foliar (120 × 9)': 'Simulated example: leaf morphometry (120 × 9)',
  'Eliminar filas incompletas (listwise)': 'Delete incomplete rows (listwise)',
  'Imputar con la media de la variable': 'Impute with the variable mean',
  'Imputar con la mediana de la variable': 'Impute with the variable median',
  'Ninguna (datos originales)': 'None (original data)',
  'Logaritmo natural, ln(x)': 'Natural logarithm, ln(x)',
  'Logaritmo base 10': 'Base 10 logarithm',
  'Raíz cuadrada': 'Square root', 'Inversa, 1/x': 'Inverse, 1/x',
  'Permutación de tus datos (recomendada)': 'Permutation of your data (recommended)',
  'Datos normales aleatorios (Horn clásico)': 'Random normal data (classic Horn)',
  '200 (rápido)': '200 (fast)', '500 (recomendado)': '500 (recommended)',
  '1000 (más preciso, más lento)': '1000 (more precise, slower)',
  'Varimax (ortogonal) — recomendada': 'Varimax (orthogonal) — recommended',
  'Quartimax (ortogonal)': 'Quartimax (orthogonal)',
  'Equamax (ortogonal)': 'Equamax (orthogonal)',
  'Parsimax (ortogonal)': 'Parsimax (orthogonal)',
  'Sin rotar (comparación)': 'Unrotated (for comparison)',
  'Sin rotar (componentes originales)': 'Unrotated (original components)',
  'Rotada (la del Bloque 3)': 'Rotated (the one from Block 3)',
  'Sin agrupar': 'No grouping', 'No comparar grupos': 'Do not compare groups',
  'Ambos: SVG y PNG': 'Both: SVG and PNG',
  '0.30 — mínimo': '0.30 — minimum',
  '0.40 — habitual': '0.40 — usual',
  '0.50 — prácticamente significativa': '0.50 — practically significant',
  '0.55 — muestras pequeñas': '0.55 — small samples',
  '0.70 — muy exigente': '0.70 — very demanding',

  /* ---------- navigation and downloads ---------- */
  'Ir al Bloque 2: extracción →': 'Go to Block 2: extraction →',
  'Ir a rotación →': 'Go to rotation →',
  'Ir a los mapas factoriales →': 'Go to the factor maps →',
  'Ir a la interpretación →': 'Go to interpretation →',
  'Ir al informe →': 'Go to the report →',
  '⬇ Matriz preparada (CSV)': '⬇ Prepared matrix (CSV)',
  '⬇ Matriz de correlaciones (CSV)': '⬇ Correlation matrix (CSV)',
  '⬇ Resumen de variables (CSV)': '⬇ Variable summary (CSV)',
  '⬇ Informe del Bloque 1 (TXT)': '⬇ Block 1 report (TXT)',
  '⬇ Valores propios (CSV)': '⬇ Eigenvalues (CSV)',
  '⬇ Cargas (CSV)': '⬇ Loadings (CSV)',
  '⬇ Puntuaciones de los individuos (CSV)': '⬇ Individual scores (CSV)',
  '⬇ Cargas rotadas (CSV)': '⬇ Rotated loadings (CSV)',
  '⬇ Matriz de estructura (CSV)': '⬇ Structure matrix (CSV)',
  '⬇ Correlación entre componentes (CSV)': '⬇ Correlation between components (CSV)',
  '⬇ Puntuaciones rotadas (CSV)': '⬇ Rotated scores (CSV)',
  '⬇ Individuos: coordenadas, cos² y contribuciones (CSV)': '⬇ Individuals: coordinates, cos² and contributions (CSV)',
  '⬇ Variables: coordenadas, cos² y contribuciones (CSV)': '⬇ Variables: coordinates, cos² and contributions (CSV)',
  '⬇ Elementos suplementarios (CSV)': '⬇ Supplementary elements (CSV)',
  '⬇ Descripción de dimensiones (CSV)': '⬇ Dimension description (CSV)',
  '⬇ Valores test (CSV)': '⬇ Test values (CSV)',
  '⬇ Matriz de residuos (CSV)': '⬇ Residual matrix (CSV)',
  '⬇ Informe HTML': '⬇ HTML report',
  '⬇ Descargar paquete completo (ZIP)': '⬇ Download the complete package (ZIP)',
  '🖨 Imprimir / guardar como PDF': '🖨 Print / save as PDF',

  /* ---------- interface prose (keys are the Spanish inner HTML) ---------- */
  'Formato <b>.xlsx</b>, <b>.xls</b> o <b>.csv</b>. La <b>primera fila</b> debe contener los nombres de las variables y cada fila siguiente una observación (una planta, una parcela, un individuo, una muestra…). Una sola tabla por hoja, sin filas ni columnas en blanco intercaladas y sin celdas combinadas.':
    '<b>.xlsx</b>, <b>.xls</b> or <b>.csv</b>. The <b>first row</b> must hold the variable names, and every row below it one observation (a plant, a plot, an individual, a sample…). One single table per sheet, with no blank rows or columns in between and no merged cells.',
  '.xlsx · .xls · .csv · .tsv · .txt': '.xlsx · .xls · .csv · .tsv · .txt',
  'Importante si tu Excel está en configuración regional en español.':
    'Matters if your Excel uses a locale where the comma is the decimal mark.',
  'Solo aplica a archivos de texto plano.': 'Applies to plain text files only.',
  'Tu archivo tiene varias hojas.': 'Your file has several sheets.',
  'PCAPro detectó el tipo de cada columna. Revísalo: <b>solo las variables numéricas marcadas como «Activa» construirán los componentes</b>. Una columna numérica con pocos valores enteros (un código de tratamiento, un año, un identificador) casi siempre debe ser <b>cualitativa</b>, no activa.':
    'PCAPro has guessed the type of every column. Check it: <b>only the numeric variables marked as “Active” will build the components</b>. A numeric column with few integer values (a treatment code, a year, an identifier) should almost always be <b>qualitative</b>, not active.',
  'Marca aquí las variables que quieres que entren al ACP. Es un atajo del desplegable «Papel en el ACP» de la tabla de abajo: al desmarcar una variable numérica pasa a <b>cuantitativa suplementaria</b> (se proyectará sin construir los ejes), no se elimina.':
    'Tick here the variables you want in the PCA. This is a shortcut for the “Role in the PCA” menu in the table below: clearing a numeric variable turns it into a <b>supplementary quantitative</b> variable (it is projected without building the axes), it is not discarded.',
  '<b>Cómo decidir</b> <b>Activa</b>: la variable responde a la pregunta que quieres resumir y está medida en escala cuantitativa. <b>Cuantitativa suplementaria</b>: te interesa ver dónde cae en el plano, pero no quieres que defina los ejes (típicamente una variable de respuesta, como el rendimiento). <b>Cualitativa / grupo</b>: define categorías que servirán para colorear individuos y dibujar elipses. <b>Identificador</b>: etiqueta las filas en los gráficos.':
    '<b>How to decide</b> <b>Active</b>: the variable speaks to the question you want to summarise and is measured on a quantitative scale. <b>Supplementary quantitative</b>: you want to see where it falls in the plane, but you do not want it to define the axes (typically an outcome variable, such as yield). <b>Qualitative / group</b>: defines the categories used to colour individuals and draw ellipses. <b>Identifier</b>: labels the rows in the figures.',
  'La eliminación es la opción más conservadora; la mediana es preferible a la media si la variable es asimétrica.':
    'Deletion is the most conservative option; the median is preferable to the mean when the variable is skewed.',
  'Se aplica antes del escalado. Si hay ceros o negativos, la app suma automáticamente una constante.':
    'Applied before scaling. If there are zeros or negative values, a constant is added automatically.',
  'Determina si el ACP se hace sobre la matriz de <b>covarianzas</b> (sin escalar) o sobre la de <b>correlaciones</b> (estandarización z). Regla práctica: si tus variables están en unidades distintas, estandariza.':
    'Decides whether the PCA runs on the <b>covariance</b> matrix (unscaled) or on the <b>correlation</b> matrix (z standardisation). Rule of thumb: if your variables are in different units, standardise.',
  'Estandarización z — recomendada': 'z standardisation — recommended',
  '(x − media) / desviación. Media 0 y varianza 1. Toda variable pesa igual. ACP sobre correlaciones.':
    '(x − mean) / standard deviation. Mean 0 and variance 1. Every variable weighs the same. PCA on correlations.',
  'Sin escalar': 'Unscaled',
  'ACP sobre covarianzas. Solo si todas las variables comparten unidad y escala. Conserva las unidades originales.':
    'PCA on covariances. Only if every variable shares the same unit and scale. Keeps the original units.',
  'Solo centrar': 'Centre only',
  'Resta la media sin dividir. Equivale al ACP sobre covarianzas.':
    'Subtracts the mean without dividing. Equivalent to PCA on covariances.',
  'Pareto': 'Pareto',
  'Divide entre la raíz de la desviación. Atenúa las variables dominantes sin igualarlas. Típico en metabolómica y espectros.':
    'Divides by the square root of the standard deviation. Damps the dominant variables without levelling them. Common in metabolomics and spectroscopy.',
  'VAST': 'VAST',
  'Pondera por el inverso del coeficiente de variación: favorece las variables estables.':
    'Weights by the inverse of the coefficient of variation: favours the stable variables.',
  'Rango [0, 1]': 'Range [0, 1]',
  'Reescala al intervalo unitario. Cómodo para índices, pero muy sensible a valores extremos.':
    'Rescales to the unit interval. Handy for indices, but very sensitive to extreme values.',
  'Robusta (mediana / MAD)': 'Robust (median / MAD)',
  'Usa mediana y desviación absoluta mediana. Recomendada si hay atípicos que no quieres eliminar.':
    'Uses the median and the median absolute deviation. Recommended when there are outliers you do not want to remove.',
  'Escalado seleccionado: <b id="scaleLabel">Estandarización z (matriz de correlaciones)</b>':
    'Scaling selected: <b id="scaleLabel">z standardisation (correlation matrix)</b>',
  'Verificación automática de los supuestos del punto 3 del marco teórico, sobre la matriz ya preparada.':
    'Automatic check of the assumptions listed in section 3 of the background, run on the prepared matrix.',
  'Ordenadas de menor a mayor. Las que estén por debajo de 0.50 son candidatas a eliminarse, <b>una a la vez</b>, recalculando el diagnóstico después de cada eliminación.':
    'Sorted from lowest to highest. Those below 0.50 are candidates for removal, <b>one at a time</b>, recomputing the diagnostics after each one.',
  'Cada figura es editable (títulos, ejes, colores, paletas, tema, tipografía) y se descarga en SVG vectorial o en mapa de bits hasta 12× la resolución base (~900 ppp).':
    'Every figure is editable (titles, axes, colours, palettes, theme, typeface) and downloads as vector SVG or as a raster image up to 12× the base resolution (~900 dpi).',
  'Lectura automática del diagnóstico, punto por punto, con la acción sugerida en cada caso.':
    'An automatic reading of the diagnostics, point by point, with the action suggested in each case.',
  'Con la matriz validada, el <b>Bloque 2</b> extrae los componentes: valores propios, varianza explicada, gráfico de sedimentación, análisis paralelo de Horn, bastón roto, MAP de Velicer y decisión del número de ejes a retener.':
    'With the matrix validated, <b>Block 2</b> extracts the components: eigenvalues, explained variance, scree plot, Horn’s parallel analysis, broken stick, Velicer’s MAP and the decision on how many axes to retain.',
  'Se usará la matriz preparada en el Bloque 1.': 'The matrix prepared in Block 1 will be used.',
  'La permutación no supone normalidad y respeta tus distribuciones reales.':
    'Permutation assumes no normality and preserves your actual distributions.',
  'Matrices aleatorias que se simulan para el percentil 95.':
    'Random matrices simulated to obtain the 95th percentile.',
  'EE aprox. = error estándar asintótico de λ bajo normalidad multivariante (Anderson). Los criterios listados en la penúltima columna son los que retendrían ese componente.':
    'Approx. SE = asymptotic standard error of λ under multivariate normality (Anderson). The criteria listed in the second to last column are those that would retain that component.',
  'Se retiene el número de componentes que <b>minimiza</b> el promedio de correlaciones parciales al cuadrado. Antes del mínimo se está extrayendo varianza común; después, varianza específica de cada variable.':
    'The number of components retained is the one that <b>minimises</b> the average squared partial correlation. Before the minimum, common variance is being extracted; after it, variance specific to each variable.',
  'Todas editables y exportables en SVG, PNG, JPG o WEBP hasta 12× de resolución.':
    'All editable and exportable as SVG, PNG, JPG or WEBP at up to 12× resolution.',
  '<b>Antes de interpretar</b> Esta es la solución <b>sin rotar</b>. Si ves que casi todas las variables cargan fuerte en el CP1 y el resto de componentes son difíciles de nombrar, es exactamente el caso para el que existe la rotación del Bloque 3.':
    '<b>Before interpreting</b> This is the <b>unrotated</b> solution. If nearly every variable loads heavily on PC1 and the remaining components are hard to name, that is exactly the situation the rotation in Block 3 exists for.',
  'Fíjalo antes de mirar los resultados.': 'Set it before looking at the results.',
  '0 = quartimin. Negativo → más ortogonal; positivo → más oblicuo.':
    '0 = quartimin. Negative → closer to orthogonal; positive → more oblique.',
  '4 es el valor estándar. Más alto = más oblicuo.': '4 is the standard value. Higher = more oblique.',
  'Iguala el peso de las variables durante la rotación. Es el comportamiento de SPSS y de R.':
    'Equalises the weight of the variables during rotation. This is what SPSS and R do.',
  'Correlación simple entre cada variable y cada componente. Con rotación oblicua es distinta de la matriz de patrón: aquí sí influyen los demás componentes, por eso los valores son más altos.':
    'The simple correlation between each variable and each component. Under oblique rotation it differs from the pattern matrix: here the other components do contribute, which is why the values are larger.',
  'Redacción automática a partir de las cargas que superan el umbral. Úsala como punto de partida: el nombre final de cada eje lo pones tú, con la teoría de tu disciplina en la mano.':
    'Written automatically from the loadings above the threshold. Use it as a starting point: the final name of each axis is yours to choose, with the theory of your field in hand.',
  'Si no aplicaste rotación, se usa la solución original.':
    'If you did not rotate, the original solution is used.',
  'Colorea individuos y dibuja elipses. Se toma de las columnas marcadas como cualitativas en el Bloque 1.':
    'Colours the individuals and draws ellipses. Taken from the columns marked as qualitative in Block 1.',
  'Variables activas en trazo continuo; suplementarias en discontinuo. El color indica la calidad de representación: los vectores cortos y pálidos no deben interpretarse en este plano.':
    'Active variables in solid stroke, supplementary ones dashed. Colour shows the quality of representation: short, pale vectors must not be interpreted in this plane.',
  'Elige arriba la variable de agrupación para colorear y dibujar elipses. Puedes cambiar el tipo de envoltura (concentración, confianza de la media o envolvente convexa) desde el editor de la figura.':
    'Choose the grouping variable above to colour the points and draw ellipses. You can change the type of envelope (concentration, confidence of the mean, or convex hull) from the figure editor.',
  'Individuos y variables superpuestos. Recuerda que la escala de las flechas es arbitraria: ajústala hasta que la figura se lea bien, pero no interpretes la longitud absoluta.':
    'Individuals and variables superimposed. Remember that the arrow scale is arbitrary: adjust it until the figure reads well, but do not interpret the absolute length.',
  'La figura de contribuciones sirve tanto para variables como para individuos, eje por eje o para el plano completo. Cambia el objetivo desde el editor.':
    'The contribution figure works for variables and for individuals, axis by axis or for the whole plane. Change the target from the editor.',
  'Coordenada = correlación de la variable con las puntuaciones de cada eje.':
    'Coordinate = correlation of the variable with the scores on each axis.',
  'Posición media de los individuos de cada categoría sobre cada eje.':
    'Mean position of the individuals in each category along each axis.',
  'Ejecuta un ANOVA y un Kruskal–Wallis por componente.':
    'Runs a one-way ANOVA and a Kruskal–Wallis test per component.',
  'La app propone un nombre a partir de las cargas dominantes. Cámbialo por el término de tu disciplina: es lo que aparecerá en la lectura automática y en el informe del Bloque 6.':
    'PCAPro suggests a name from the dominant loadings. Replace it with the term used in your field: it is what will appear in the automatic reading and in the Block 6 report.',
  'Cada categoría se sitúa en el centroide de sus individuos. El valor test mide cuán lejos está del origen respecto a lo esperado por azar: <b>|v| ≥ 1.96</b> equivale a p &lt; 0.05 y <b>|v| ≥ 2.58</b> a p &lt; 0.01.':
    'Each category sits at the centroid of its individuals. The test value measures how far that is from the origin relative to what chance would give: <b>|v| ≥ 1.96</b> corresponds to p &lt; 0.05 and <b>|v| ≥ 2.58</b> to p &lt; 0.01.',
  'η² de Cohen: 0.01 pequeño · 0.06 medio · 0.14 grande. El Kruskal–Wallis no supone normalidad. Recuerda que son <b>contrastes descriptivos</b>: no hay corrección por comparaciones múltiples y los ejes se eligieron por maximizar varianza.':
    'Cohen’s η²: 0.01 small · 0.06 medium · 0.14 large. Kruskal–Wallis assumes no normality. Remember these are <b>descriptive comparisons</b>: there is no correction for multiple testing and the axes were chosen to maximise variance.',
  'Los cinco individuos más extremos a cada lado. Sirven para comprobar que el nombre que le pusiste al eje concuerda con lo que sabes de esos casos.':
    'The five most extreme individuals on each side. They let you check that the name you gave the axis agrees with what you know about those cases.',
  'Diferencia entre la matriz de correlaciones observada y la que reproducen los componentes retenidos. Los residuos por encima de 0.05 en valor absoluto aparecen en negrita.':
    'The difference between the observed correlation matrix and the one reproduced by the retained components. Residuals above 0.05 in absolute value are shown in bold.',
  'Redacción automática con tus propios números. Revísala y adáptala antes de usarla.':
    'Written automatically with your own numbers. Review and adapt it before using it.',
  'Solo se incluirán en el informe los bloques que hayas ejecutado.':
    'Only the blocks you have actually run will be included in the report.',
  'A 8× o 12× el paquete puede pesar varios cientos de MB si hay muchas figuras.':
    'At 8× or 12× the package can reach several hundred MB when there are many figures.',
  'Es el documento real. Si algo no te convence, vuelve al bloque correspondiente, ajústalo y genera la vista previa otra vez.':
    'This is the actual document. If something does not convince you, go back to the relevant block, adjust it and generate the preview again.',

  /* ---------- form field labels ---------- */
  'Separador decimal': 'Decimal separator',
  'Separador de columnas (CSV)': 'Column separator (CSV)',
  'Hoja del libro': 'Workbook sheet',
  'Tratamiento': 'Treatment',
  'Transformación previa': 'Prior transformation',
  'Análisis paralelo: generación': 'Parallel analysis: data generation',
  'Repeticiones': 'Repetitions',
  'Componentes a retener:': 'Components to retain:',
  'Resaltar cargas con |carga| ≥': 'Highlight loadings with |loading| ≥',
  'Método': 'Method',
  'Umbral de carga interpretable': 'Interpretable loading threshold',
  'δ (oblimin)': 'δ (oblimin)', 'κ (promax)': 'κ (promax)',
  'Normalización': 'Normalisation', 'Normalización de Kaiser': 'Kaiser normalisation',
  'Agrupar las variables por el componente en que cargan': 'Group the variables by the component they load on',
  'Solución a representar': 'Solution to display',
  'Variable de agrupación': 'Grouping variable',
  'Comparar grupos sobre los componentes': 'Compare groups on the components',
  'Eje a describir:': 'Axis to describe:',
  'Autor o autores': 'Author or authors',
  'Incrustar las figuras en el informe (vectoriales, tal como las editaste)':
    'Embed the figures in the report (vector, exactly as you edited them)',
  'Formato de las figuras en el ZIP': 'Figure format inside the ZIP',
  'Resolución del mapa de bits': 'Raster resolution',
  '<b>Arrastra tu archivo aquí</b> o haz clic para elegirlo':
    '<b>Drag your file here</b> or click to choose it',

  /* ---------- report sections and footer ---------- */
  'Resumen con los indicadores clave': 'Summary with the key indicators',
  'Métodos (redacción automática)': 'Methods (written automatically)',
  'Preparación de datos y supuestos': 'Data preparation and assumptions',
  'Extracción de componentes': 'Component extraction',
  'Representación factorial': 'Factor representation',
  'Limitaciones y advertencias': 'Limitations and caveats',
  'Referencias metodológicas': 'Methodological references',
  'Anexo con la configuración': 'Appendix with the settings',
  'PCAPro · Plataforma local de Análisis de Componentes Principales · LABG Apps':
    'PCAPro · Local Principal Component Analysis platform · LABG Apps',

  /* ---------- variable roles and the variable table ---------- */
  'Activa (entra al ACP)': 'Active (enters the PCA)',
  'Cuantitativa suplementaria': 'Supplementary quantitative',
  'Cualitativa / grupo': 'Qualitative / group',
  'Identificador de fila': 'Row identifier',
  'Excluir': 'Exclude',
  'Tipo detectado': 'Detected type', 'Distribución': 'Distribution',
  'Faltan': 'Missing', 'Únicos': 'Unique',
  'Mín': 'Min', 'Máx': 'Max', 'Asim.': 'Skew.', 'Curt.': 'Kurt.',
  'Alertas': 'Alerts', 'Papel en el ACP': 'Role in the PCA',
  'Numérica continua': 'Continuous numeric', 'Numérica (enteros)': 'Numeric (integers)',
  'Constante': 'Constant', 'Identificador (todos distintos)': 'Identifier (all distinct)',
  'varianza cero': 'zero variance', 'muy asimétrica': 'strongly skewed',
  'asimétrica': 'skewed', 'sin alertas': 'no alerts', '¿código de grupo?': 'group code?',
  '¿grupo?': 'group?',

  /* ---------- messages ---------- */
  'Primero extrae los componentes en el Bloque 2.': 'Extract the components in Block 2 first.',
  'Primero genera los mapas factoriales en el Bloque 4.': 'Build the factor maps in Block 4 first.',
  'La rotación necesita al menos <b>2</b> componentes retenidos. Vuelve al Bloque 2 y sube el número.':
    'Rotation needs at least <b>2</b> retained components. Go back to Block 2 and raise the number.',
  'Los mapas factoriales necesitan al menos 2 componentes retenidos.':
    'Factor maps need at least 2 retained components.',
  'Necesitas al menos 2 variables activas (idealmente 3 o más) para un ACP.':
    'You need at least 2 active variables (ideally 3 or more) for a PCA.',
  'No se detectaron columnas numéricas utilizables.': 'No usable numeric columns were detected.',

  /* ---------- quality wording used inside tables ---------- */
  'muy buena': 'very good', 'aceptable': 'acceptable', 'pobre': 'poor',
  'no interpretable': 'not interpretable', 'limpia': 'clean', 'cruzada': 'cross-loading',
  'sin carga': 'no loading', 'meritorio': 'meritorious', 'mediocre': 'mediocre',
  'bajo': 'low', 'inaceptable — considera eliminar': 'unacceptable — consider removing',
  'excelente': 'excellent', 'inaceptable': 'unacceptable',

  /* ---------- figure titles and subtitles ---------- */
  'Comparación de escalas después del preprocesamiento': 'Scale comparison after preprocessing',
  'Perfil de escalas de las variables activas': 'Scale profile of the active variables',
  'Dispersión original de cada variable': 'Original spread of each variable',
  'Distribución de cada variable activa': 'Distribution of each active variable',
  'Distribución de las variables activas (datos originales)': 'Distribution of the active variables (original data)',
  'Línea roja: curva normal de referencia': 'Red line: reference normal curve',
  'Mapa de datos faltantes': 'Missing-data map',
  'Matriz de correlaciones (Pearson)': 'Correlation matrix (Pearson)',
  'Matriz de correlaciones entre variables activas': 'Correlation matrix of the active variables',
  'Variables tras la transformación y el escalado': 'Variables after transformation and scaling',

  'Gráfico de sedimentación': 'Scree plot',
  'Gráfico de sedimentación (scree plot)': 'Scree plot',
  'Varianza acumulada': 'Cumulative variance',
  'Varianza explicada acumulada': 'Cumulative explained variance',
  'Comparación de criterios de retención': 'Comparison of retention criteria',
  '¿Cuántos componentes retener? Comparación de criterios': 'How many components to retain? Comparison of criteria',
  'Análisis paralelo de Horn': "Horn's parallel analysis",

  'Cargas por componente': 'Loadings per component',
  'Cargas de cada variable sobre cada componente': 'Loading of each variable on each component',
  'Mapa de calor de la matriz de cargas': 'Heat map of the loading matrix',
  'Matriz de cargas — rotación': 'Loading matrix — rotation',
  'Plano de cargas': 'Loading plane',
  'Variables en el plano factorial': 'Variables on the factor plane',
  'Redistribución de la varianza por la rotación': 'Redistribution of variance by the rotation',
  'Varianza antes y después de rotar': 'Variance before and after rotation',
  'Varianza acumulada': 'Cumulative variance',

  'Círculo de correlaciones': 'Correlation circle',
  'Círculo de correlaciones (variables)': 'Correlation circle (variables)',
  'Mapa de individuos': 'Individuals map',
  'Mapa factorial de individuos': 'Factor map of individuals',
  'Biplot': 'Biplot',
  'Biplot: individuos y variables': 'Biplot: individuals and variables',
  'Contribuciones': 'Contributions',
  'Contribución de las variables al eje': 'Contribution of the variables to the axis',
  'La línea roja marca el valor esperado si todas contribuyeran por igual':
    'The red line marks the expected value if all contributed equally',
  'Calidad de representación (cos²)': 'Quality of representation (cos²)',
  'Calidad de representación de las variables (cos²)': 'Quality of representation of the variables (cos²)',
  'Proporción de la varianza de cada variable recogida por cada eje':
    'Share of each variable’s variance captured by each axis',
  'Sin rotar': 'Unrotated', 'Rotada': 'Rotated', '(oblicua)': '(oblique)',

  'Descripción de la dimensión': 'Dimension description',
  'Variables que describen el eje': 'Variables that describe the axis',
  'Correlación con las puntuaciones · * p < 0.05, ** p < 0.01, *** p < 0.001':
    'Correlation with the scores · * p < 0.05, ** p < 0.01, *** p < 0.001',
  'Valores test de las categorías': 'Test values of the categories',
  'Caracterización de los ejes por las categorías': 'Characterisation of the axes by the categories',
  'v.test: desviación del centroide de cada categoría respecto al origen, en unidades normales':
    'v.test: deviation of each category centroid from the origin, in normal units',
  'Puntuaciones por grupo': 'Scores by group',
  'Se muestra la prueba F de un ANOVA de una vía por componente':
    'The F test of a one-way ANOVA per component is shown',
  'Residuos de la matriz reproducida': 'Residuals of the reproduced matrix',
  'Residuos: correlación observada − reproducida': 'Residuals: observed − reproduced correlation',

  /* ---------- component labels ---------- */
  'CP1': 'PC1', 'CP2': 'PC2', 'CP1 + CP2': 'PC1 + PC2',
  'Coord.': 'Coord.',

  /* ---------- summary tiles ---------- */
  'Componentes posibles': 'Possible components',
  'tantos como variables activas': 'as many as active variables',
  'Varianza total': 'Total variance',
  'igual a p (correlaciones)': 'equal to p (correlations)',
  'en unidades al cuadrado': 'in squared units',
  'varianza del plano factorial': 'variance of the factor plane',
  'Recomendación': 'Recommendation',
  'componente': 'component', 'componentes': 'components',
  'consenso de 8 criterios': 'consensus of 8 criteria',
  'Retenidos ahora': 'Currently retained',
  'de la varianza': 'of the variance',

  'Rotación': 'Rotation', 'oblicua': 'oblique', 'ortogonal': 'orthogonal',
  'Componentes rotados': 'Rotated components',
  'Variables limpias': 'Clean variables',
  'Cargas cruzadas': 'Cross-loadings',
  'variables con ≥ 2 cargas altas': 'variables with ≥ 2 high loadings',
  'Complejidad media': 'Mean complexity',
  '1 = estructura simple perfecta': '1 = perfect simple structure',
  'Sin representar': 'Not represented',

  'Solución': 'Solution',
  'componentes originales': 'original components',
  'Plano 1–2': 'Plane 1–2',
  'varianza representada': 'variance represented',
  'Variables bien representadas': 'Well-represented variables',
  'cos² ≥ 0.5 en el plano 1–2': 'cos² ≥ 0.5 on plane 1–2',
  'Individuos con cos² ≥ 0.5': 'Individuals with cos² ≥ 0.5',
  'bien situados en el plano': 'well placed on the plane',
  'Cuanti. suplementarias': 'Suppl. quantitative',
  'proyectadas sobre el círculo': 'projected onto the circle',
  'ninguna definida': 'none defined',
  'Variables de grupo': 'Group variables',
  'disponibles para colorear': 'available for colouring',

  'Componentes interpretados': 'Interpreted components',
  'solución rotada': 'rotated solution', 'solución sin rotar': 'unrotated solution',
  'residuo cuadrático medio': 'root mean square residual',
  'Residuos > 0.05': 'Residuals > 0.05',
  'pares mal reproducidos': 'poorly reproduced pairs',
  'Categorías caracterizadas': 'Characterised categories',
  '|v.test| ≥ 1.96 en algún eje': '|v.test| ≥ 1.96 on some axis',
  'Varianza retenida': 'Retained variance',
  'por los ejes interpretados': 'by the interpreted axes',

  /* ---------- role summary tiles (Block 1) ---------- */
  'Observaciones': 'Observations', 'filas del archivo': 'rows in the file',
  'Variables activas': 'Active variables', 'entran al ACP': 'enter the PCA',
  'Razón n : p': 'Ratio n : p', 'individuos por variable': 'individuals per variable',
  'se proyectan, no construyen ejes': 'projected, they do not build axes',
  'Cualitativas / grupos': 'Qualitative / groups', 'colorean individuos': 'colour individuals',
  'Identificador': 'Identifier', 'etiqueta las filas': 'labels the rows',
  'se usará el número de fila': 'the row number will be used',
  'Excluidas': 'Excluded', 'fuera del análisis': 'outside the analysis',

  /* ---------- rotation method names ---------- */
  'Sin rotar (solución original)': 'No rotation (original solution)',
  'Quartimin': 'Quartimin', 'Oblimin directo': 'Direct oblimin', 'Promax': 'Promax',
  'Varimax': 'Varimax', 'Quartimax': 'Quartimax', 'Equamax': 'Equamax', 'Parsimax': 'Parsimax',
  /* ---------- Block 1: diagnostic tiles and MSA table ---------- */
  'Observaciones (n)': 'Observations (n)',
  'Variables activas (p)': 'Active variables (p)',
  'construyen los componentes': 'they build the components',
  'KMO global': 'Overall KMO', 'adecuación muestral': 'sampling adequacy',
  'Bartlett': 'Bartlett',
  'Determinante de R': 'Determinant of R',
  'sin singularidad': 'no singularity', 'cercano a 0': 'close to 0',
  '|r| media': 'Mean |r|',
  'Componentes λ > 1': 'Components with λ > 1',
  'Atípicos (Mahalanobis)': 'Outliers (Mahalanobis)',
  'Interpretación': 'Interpretation', 'DE original': 'Original SD', 'Asimetría': 'Skewness',
  'Individuo': 'Individual',

  /* ---------- Block 1: grades ---------- */
  'Excelente': 'Excellent', 'Buena': 'Good',
  'Aceptable con reservas': 'Acceptable with reservations', 'Problemática': 'Problematic',
  'La base cumple bien los requisitos del ACP. Puedes avanzar con confianza.':
    'The data set meets the requirements of PCA well. You can proceed with confidence.',
  'La base es apta para el ACP; atiende las observaciones marcadas en ámbar para mejorar la solución.':
    'The data set is suitable for PCA; address the items flagged in amber to improve the solution.',
  'El ACP es posible, pero varios supuestos están al límite. Interpreta los resultados con cautela y considera las correcciones sugeridas.':
    'PCA is possible, but several assumptions are borderline. Interpret the results with caution and consider the suggested corrections.',
  'La base incumple requisitos importantes. Corrige lo señalado en rojo antes de interpretar componentes.':
    'The data set fails important requirements. Fix the items flagged in red before interpreting components.',

  /* ---------- Block 1: recommendation titles and fixed texts ---------- */
  'Tamaño de muestra adecuado': 'Adequate sample size',
  'Tamaño de muestra suficiente pero justo': 'Sample size sufficient but tight',
  'Tamaño de muestra insuficiente': 'Insufficient sample size',
  'Matriz de correlaciones singular': 'Singular correlation matrix',
  'El determinante de R es ≈ 0: hay dependencia lineal exacta entre variables (por ejemplo, una variable que es suma o porcentaje de otras). Elimina una de las variables redundantes antes de continuar.':
    'The determinant of R is ≈ 0: there is exact linear dependence between variables (for example, a variable that is the sum or percentage of others). Remove one of the redundant variables before continuing.',
  'Prueba de esfericidad de Bartlett significativa': "Bartlett's test of sphericity is significant",
  'Bartlett no significativa: las variables no están correlacionadas':
    'Bartlett not significant: the variables are not correlated',
  'El valor está en el rango aceptable para el análisis factorial/ACP.':
    'The value is within the acceptable range for factor analysis / PCA.',
  'Por debajo de 0.6 el ACP se desaconseja: las correlaciones son en su mayoría espurias o específicas de pares.':
    'Below 0.6, PCA is discouraged: the correlations are mostly spurious or specific to single pairs.',
  ' Ninguna variable individual tiene MSA por debajo de 0.5.':
    ' No individual variable has an MSA below 0.5.',
  'Correlaciones demasiado débiles': 'Correlations too weak',
  'Existe estructura de correlación aprovechable': 'There is usable correlation structure',
  'Variables casi redundantes (|r| ≥ 0.90)': 'Nearly redundant variables (|r| ≥ 0.90)',
  'No invalida el ACP, pero infla artificialmente el primer componente y puede volver inestable la rotación. Considera conservar una sola variable de cada par o promediarlas en un índice.':
    'This does not invalidate the PCA, but it artificially inflates the first component and can make the rotation unstable. Consider keeping only one variable of each pair, or averaging them into an index.',
  'Sin multicolinealidad extrema': 'No extreme multicollinearity',
  'Escalas muy dispares sin estandarizar': 'Very different scales, not standardised',
  'ACP sobre covarianzas (sin estandarizar)': 'PCA on covariances (not standardised)',
  'Variables estandarizadas (ACP sobre correlaciones)': 'Standardised variables (PCA on correlations)',
  'Recuerda que el escalado elegido cambia el peso relativo de cada variable en los componentes. Documenta esta decisión en la sección de métodos de tu trabajo.':
    'Remember that the scaling you choose changes the relative weight of each variable in the components. Document this decision in the methods section of your work.',
  'Sin datos faltantes': 'No missing data',
  'La matriz está completa; no hubo que eliminar ni imputar observaciones.':
    'The matrix is complete; no observations had to be removed or imputed.',
  'Estás perdiendo más del 10% de la muestra: valora imputar por mediana en lugar de eliminar, o excluir la variable con más vacíos.':
    'You are losing more than 10% of the sample: consider median imputation instead of deletion, or excluding the variable with the most gaps.',
  'La pérdida es tolerable.': 'The loss is tolerable.',
  'El ACP maximiza varianza, así que un atípico puede crear él solo un componente. Revisa si son errores de captura; si son casos reales, corre el ACP con y sin ellos y compara.':
    'PCA maximises variance, so a single outlier can create a component on its own. Check whether they are data-entry errors; if they are real cases, run the PCA with and without them and compare.',
  'Sin atípicos multivariantes graves': 'No serious multivariate outliers',
  'Atípicos multivariantes no evaluables': 'Multivariate outliers cannot be assessed',
  'Se necesitan más observaciones que variables (n > p + 2) para calcular la distancia de Mahalanobis.':
    'More observations than variables (n > p + 2) are needed to compute the Mahalanobis distance.',
  'El ACP <i>descriptivo</i> no exige normalidad, pero la correlación de Pearson sí supone relaciones lineales y es sensible a distribuciones muy sesgadas. Prueba una transformación logarítmica o de raíz cuadrada arriba y compara el diagnóstico.':
    '<i>Descriptive</i> PCA does not require normality, but Pearson correlation does assume linear relationships and is sensitive to strongly skewed distributions. Try a logarithmic or square-root transformation above and compare the diagnosis.',
  'Distribuciones razonablemente simétricas': 'Reasonably symmetric distributions',
  'Ninguna variable activa supera |g₁| = 1, así que la correlación de Pearson describe bien las relaciones lineales.':
    'No active variable exceeds |g₁| = 1, so Pearson correlation describes the linear relationships well.',
  'Dimensionalidad esperada (vista previa)': 'Expected dimensionality (preview)',
  'Un plano factorial 1–2 bastará para representar bien la estructura.':
    'A 1–2 factor plane will be enough to represent the structure well.',
  'Necesitarás mirar más de dos ejes, o el plano 1–2 dará una imagen incompleta.':
    'You will need to look at more than two axes, or the 1–2 plane will give an incomplete picture.',
  ' El Bloque 2 confirmará esto con gráfico de sedimentación y análisis paralelo.':
    ' Block 2 will confirm this with a scree plot and parallel analysis.',

  /* ---------- Block 1: column profiling ---------- */
  'Constante': 'Constant', 'Numérica (enteros)': 'Numeric (integers)',
  'Numérica continua': 'Continuous numeric',
  'Identificador (todos distintos)': 'Identifier (all distinct)',
  'varianza cero': 'zero variance', 'faltantes': 'missing',
  'muy asimétrica': 'strongly skewed', 'asimétrica': 'skewed',
  'at.': 'out.', '¿código de grupo?': 'group code?', 'sin alertas': 'no alerts',
  '¿grupo?': 'group?',

  /* ---------- Block 1: file and preparation messages ---------- */
  'Leyendo archivo…': 'Reading file…', 'Cargando ejemplo…': 'Loading example…',
  'Calculando…': 'Computing…',
  'No se pudo leer el CSV: ': 'The CSV could not be read: ',
  'No se pudo leer el archivo de Excel: ': 'The Excel file could not be read: ',
  'La hoja está vacía.': 'The sheet is empty.',
  'Error en el cálculo: ': 'Error during the computation: ',
  'Quedan menos de 3 filas completas. Prueba con imputación por media/mediana o revisa las variables activas.':
    'Fewer than 3 complete rows remain. Try mean/median imputation or review the active variables.',
  'Se detectaron menos de 2 variables numéricas activas. Revisa la tabla de abajo y marca manualmente como <b>Activa</b> las columnas de medición, o revisa el separador decimal.':
    'Fewer than 2 active numeric variables were detected. Check the table below and manually set the measurement columns to <b>Active</b>, or review the decimal separator.',
  'Ojo: este conjunto es <b>simulado</b> (generado por la propia app a partir de 3 factores latentes). Sirve para explorar la plataforma, no para reportar resultados.':
    'Note: this data set is <b>simulated</b> (generated by the app itself from 3 latent factors). Use it to explore the platform, not to report results.',
  /* ---------- Block 2: retention criteria ---------- */
  'Análisis paralelo (Horn)': "Parallel analysis (Horn's)",
  'Kaiser–Guttman (λ > 1)': 'Kaiser–Guttman (λ > 1)',
  'Media de los λ': 'Mean of the λ',
  'clásico; tiende a sobreestimar': 'classic; tends to overestimate',
  'λ mayor que el promedio': 'λ greater than the average',
  'Bastón roto': 'Broken stick', 'bastón': 'stick',
  'conservador; frecuente en ecología': 'conservative; common in ecology',
  'MAP de Velicer': "Velicer's MAP",
  'mínimo de correlaciones parciales²': 'minimum of squared partial correlations',
  'Codo del scree (Cattell)': 'Scree elbow (Cattell)',
  'máxima curvatura de la caída': 'maximum curvature of the decline',
  'Varianza acumulada ≥ 70 %': 'Cumulative variance ≥ 70%',
  'umbral habitual en ciencias naturales': 'usual threshold in the natural sciences',
  'Varianza acumulada ≥ 80 %': 'Cumulative variance ≥ 80%',
  'umbral exigente': 'demanding threshold',
  'Jolliffe (λ > 0.7)': 'Jolliffe (λ > 0.7)',
  'versión relajada de Kaiser': 'relaxed version of Kaiser',
  'no aplica sin estandarizar': 'not applicable without standardising',
  'ninguno': 'none', 'mínimo': 'minimum',
  'Extrayendo componentes…': 'Extracting components…',
  'Menos de la mitad de la información queda representada: revisa si conviene retener más ejes.':
    'Less than half of the information is represented: check whether more axes should be retained.',
  'Estás reteniendo casi todo: probablemente no estés reduciendo dimensiones.':
    'You are retaining almost everything: you are probably not reducing dimensions at all.',
  'Con un solo componente no hay plano factorial: los gráficos del Bloque 4 y la rotación del Bloque 3 necesitan al menos 2 ejes.':
    'With a single component there is no factor plane: the plots in Block 4 and the rotation in Block 3 need at least 2 axes.',
  /* ---------- Block 3: rotation ---------- */
  'Rotando…': 'Rotating…',
  'limpia': 'clean', 'cruzada': 'cross-loading', 'sin carga': 'no loading',
  '¿Mejoró la estructura simple?': 'Did simple structure improve?',
  'Estás viendo la solución sin rotar. Elige una rotación arriba para compararlas.':
    'You are looking at the unrotated solution. Choose a rotation above to compare them.',
  'La rotación simplificó la solución, así que merece la pena reportarla.':
    'The rotation simplified the solution, so it is worth reporting.',
  'La rotación <b>no</b> simplificó la solución. Prueba otro método, o quédate con la solución sin rotar y decláralo.':
    'The rotation did <b>not</b> simplify the solution. Try another method, or keep the unrotated solution and say so.',
  'Matriz de <b>patrón</b>: coeficientes únicos de cada variable sobre cada componente, controlando los demás. Es la que se interpreta. Al ser pesos de regresión y no correlaciones, con rotación oblicua <b>pueden superar |1|</b>: no es un error, pero valores muy por encima de 1 avisan de componentes demasiado correlacionados.':
    '<b>Pattern</b> matrix: the unique coefficient of each variable on each component, controlling for the others. This is the one to interpret. Because they are regression weights and not correlations, under an oblique rotation they <b>can exceed |1|</b>: that is not an error, but values well above 1 warn of components that are too highly correlated.',
  'Matriz de cargas rotadas: correlación entre cada variable y cada componente.':
    'Rotated loading matrix: the correlation between each variable and each component.',
  ' La <b>complejidad de Hofmann</b> vale 1 cuando la variable carga en un solo componente y crece conforme se reparte entre varios.':
    ' The <b>Hofmann complexity</b> equals 1 when the variable loads on a single component and grows as it spreads over several.',
  ' Al tener cargas de los dos signos, es un eje de <b>contraste</b>: separa individuos con valores altos en unas variables y bajos en las otras.':
    ' Because it has loadings of both signs, it is a <b>contrast</b> axis: it separates individuals with high values on some variables and low values on the others.',
  ' Con una sola variable marcadora este componente es frágil; suele hacer falta un mínimo de 3.':
    ' With a single marker variable this component is fragile; a minimum of 3 is usually needed.',

  /* rotation hints */
  'Sin rotación: la solución original del Bloque 2, con los ejes ordenados por varianza.':
    'No rotation: the original solution from Block 2, with the axes ordered by variance.',
  'La más usada. Simplifica <b>columnas</b>: empuja cada carga hacia 0 o hacia ±1 dentro de cada componente. Componentes independientes.':
    'The most widely used. It simplifies <b>columns</b>: it pushes each loading towards 0 or towards ±1 within each component. The components stay independent.',
  'Simplifica <b>filas</b>: busca que cada variable cargue en el menor número de componentes. Suele dejar un primer factor general dominante.':
    'It simplifies <b>rows</b>: it tries to make each variable load on as few components as possible. It usually leaves a dominant first general factor.',
  'Compromiso entre varimax y quartimax (γ = k/2). Puede ser inestable con pocas variables.':
    'A compromise between varimax and quartimax (γ = k/2). It can be unstable with few variables.',
  'Versión de la familia ortomax con γ = p(k−1)/(p+k−2); busca la máxima parsimonia global.':
    'A member of the orthomax family with γ = p(k−1)/(p+k−2); it seeks maximum overall parsimony.',
  'Oblicua más simple (oblimin con δ = 0). Permite que los componentes se correlacionen.':
    'The simplest oblique rotation (oblimin with δ = 0). It lets the components correlate.',
  'Oblicua general. δ = 0 equivale a quartimin; valores negativos hacen los ejes más ortogonales y positivos más oblicuos.':
    'General oblique rotation. δ = 0 is equivalent to quartimin; negative values make the axes more orthogonal and positive ones more oblique.',
  'Oblicua rápida: parte de varimax y eleva las cargas a la potencia κ para exagerar el contraste. κ = 4 es el estándar.':
    'A fast oblique rotation: it starts from varimax and raises the loadings to the power κ to exaggerate the contrast. κ = 4 is the standard.',

  /* rotated-variance table */
  'Componente': 'Component',
  'SS cargas sin rotar': 'SS loadings, unrotated', '% sin rotar': '% unrotated',
  'SS cargas rotadas': 'SS loadings, rotated', '% rotado': '% rotated',
  '% acumulado rotado': '% cumulative rotated',
  'Comunalidad': 'Communality', 'Complejidad': 'Complexity', 'Estructura': 'Structure',
  /* ---------- Block 4 ---------- */
  'Construyendo mapas…': 'Building the maps…',
  'Calidad': 'Quality',
  'cos² plano 1–2': 'cos² plane 1–2', 'cos² plano': 'cos² plane',
  'Contrib. plano (%)': 'Plane contrib. (%)', 'Contrib.': 'Contrib.',
  'Variable suplementaria': 'Supplementary variable', 'n válidos': 'valid n',
  'Categoría': 'Category', 'Lado del eje': 'Side of the axis',
  'Individuos (coordenada)': 'Individuals (coordinate)',

  /* ---------- Block 5 ---------- */
  'Analizando…': 'Analysing…',
  'suplementaria': 'supplementary', 'activa': 'active',
  'Correlación con el eje': 'Correlation with the axis',
  'separa los grupos': 'separates the groups', 'no distingue grupos': 'does not distinguish groups',
  'efecto grande': 'large effect', 'efecto medio': 'medium effect', 'efecto pequeño': 'small effect',
  'Extremo negativo (−)': 'Negative extreme (−)', 'Extremo positivo (+)': 'Positive extreme (+)',
  '(sin carga clara)': '(no clear loading)', 'frente a': 'versus', 'Menor': 'Lower',
  'Sugerencia:': 'Suggestion:',
  'Los valores p son de la prueba t sobre el coeficiente (gl = n − 2) y se ofrecen como <b>ayuda descriptiva</b>: no hay corrección por comparaciones múltiples y los ejes se construyeron con estas mismas variables, así que no son evidencia confirmatoria.':
    'The p values come from the t test on the coefficient (df = n − 2) and are offered as a <b>descriptive aid</b>: there is no correction for multiple comparisons and the axes were built from these very variables, so they are not confirmatory evidence.',
  ' — el eje <b>sí</b> separa los grupos.': ' — the axis <b>does</b> separate the groups.',
  ' — el eje no separa los grupos.': ' — the axis does not separate the groups.',
  'p (ANOVA)': 'p (ANOVA)', 'H (Kruskal)': 'H (Kruskal)', 'p (Kruskal)': 'p (Kruskal)',
  'Grupo': 'Group', 'Media': 'Mean', 'DE': 'SD', 'IC 95 % de la media': '95% CI of the mean',

  /* ---------- Block 6 ---------- */
  'Análisis de Componentes Principales': 'Principal Component Analysis',
  'Necesitas al menos haber extraído los componentes (Bloque 2) para generar el informe.':
    'You need to have extracted the components (Block 2) at least, in order to generate the report.',
  'El navegador bloqueó la ventana emergente. Permite las ventanas emergentes de este sitio, o descarga el informe en HTML y ábrelo para imprimirlo.':
    'The browser blocked the pop-up window. Allow pop-ups for this site, or download the HTML report and open it to print.',
  'Tablas e informe…': 'Tables and report…', 'Comprimiendo…': 'Compressing…',
  'No se pudo generar el paquete: ': 'The package could not be generated: ',
  '⬇ Descargar paquete completo (ZIP)': '⬇ Download the full package (ZIP)',
  'Bloque 1 · Datos y supuestos': 'Block 1 · Data and assumptions',
  'Bloque 2 · Extracción': 'Block 2 · Extraction',
  'Bloque 3 · Rotación': 'Block 3 · Rotation',
  'Bloque 4 · Mapas factoriales': 'Block 4 · Factor maps',
  'Bloque 5 · Interpretación': 'Block 5 · Interpretation',
  'sin ejecutar': 'not run', 'sin aplicar': 'not applied',
  'solución rotada': 'rotated solution', 'solución sin rotar': 'unrotated solution',
  'Todavía no hay figuras generadas.': 'No figures have been generated yet.',
  'Resumen con los indicadores clave': 'Summary with the key indicators',
  'Métodos (redacción automática)': 'Methods (automatically drafted)',
  'Preparación de datos y supuestos': 'Data preparation and assumptions',
  'Extracción de componentes': 'Component extraction',
  'Representación factorial': 'Factor representation',
  'Limitaciones y advertencias': 'Limitations and caveats',
  'Referencias metodológicas': 'Methodological references',
  'Anexo con la configuración': 'Appendix with the settings',

  /* ---------- the generated report ---------- */
  'Resumen': 'Summary', 'Métodos': 'Methods',
  'Observaciones': 'Observations', 'Componentes retenidos': 'Retained components',
  'Varianza explicada': 'Explained variance',
  'Preparación de los datos y verificación de supuestos': 'Data preparation and checking of assumptions',
  'Estadísticos descriptivos de las variables activas.': 'Descriptive statistics of the active variables.',
  'Mínimo': 'Minimum', 'Máximo': 'Maximum', 'Curtosis': 'Kurtosis',
  'Verificación de los supuestos del ACP.': 'Checking the assumptions of PCA.',
  'Criterio': 'Criterion', 'Valor': 'Value', 'Referencia': 'Reference', 'Cumple': 'Met',
  'Sí': 'Yes', 'No': 'No', 'Revisar': 'Check', 'Marginal': 'Marginal',
  'Razón n:p': 'Ratio n:p', '≥ 5:1, idealmente 10:1': '≥ 5:1, ideally 10:1',
  'Tamaño de muestra': 'Sample size',
  'Pares con |r| ≥ 0.90': 'Pairs with |r| ≥ 0.90',
  'Atípicos multivariantes': 'Multivariate outliers', 'Datos faltantes': 'Missing data',
  'Valores propios y varianza explicada.': 'Eigenvalues and explained variance.',
  'p95 aleatorio': 'random p95',
  'Número de componentes sugerido por cada criterio.': 'Number of components suggested by each criterion.',
  'Componentes': 'Components',
  'Matriz de patrón': 'Pattern matrix', 'Matriz de cargas rotadas': 'Rotated loading matrix',
  'Varianza por componente antes y después de la rotación.': 'Variance per component before and after rotation.',
  'SS sin rotar': 'SS unrotated', 'SS rotada': 'SS rotated',
  'Correlaciones entre los componentes (Φ).': 'Correlations between the components (Φ).',
  'Coordenadas, calidad de representación y contribución de las variables.':
    'Coordinates, quality of representation and contribution of the variables.',
  'Variables cuantitativas suplementarias (correlación con cada eje).':
    'Supplementary quantitative variables (correlation with each axis).',
  'Centroides de las categorías sobre los ejes.': 'Centroids of the categories on the axes.',
  'Lectura de cada componente': 'Reading of each component',
  'Valores test de las categorías (|v| ≥ 1.96 indica p < 0.05).':
    'Test values of the categories (|v| ≥ 1.96 indicates p < 0.05).',
  'gl': 'df', 'H de Kruskal–Wallis': 'Kruskal–Wallis H',
  'Borrador de la sección de resultados': 'Draft of the results section',
  'La razón n:p es inferior a 5:1; las cargas pueden ser inestables.':
    'The n:p ratio is below 5:1; the loadings may be unstable.',
  'La prueba de Bartlett no fue significativa.': "Bartlett's test was not significant.",
  'Los contrastes entre grupos son descriptivos: no se corrigió por comparaciones múltiples y los ejes se eligieron por maximizar varianza.':
    'The between-group tests are descriptive: no correction for multiple comparisons was applied and the axes were chosen to maximise variance.',
  'No se detectaron problemas relevantes en la verificación de supuestos.':
    'No relevant problems were detected when checking the assumptions.',
  'Anexo: configuración del análisis': 'Appendix: settings of the analysis',
  'Parámetros utilizados.': 'Parameters used.', 'Parámetro': 'Parameter',
  'Archivo': 'File', 'Hoja': 'Sheet', 'Filas del archivo': 'Rows in the file',
  'Observaciones analizadas': 'Observations analysed',
  'Cualitativas': 'Qualitative', 'Transformación': 'Transformation', 'Escalado': 'Scaling',
  'Umbral de carga': 'Loading threshold', 'no aplicada': 'not applied',
  ' (normalización de Kaiser)': ' (Kaiser normalisation)',

  /* scaling / transformation / missing-data wording used in the report methods */
  'sin escalar (matriz de covarianzas)': 'no scaling (covariance matrix)',
  'solo centrado': 'centring only',
  'estandarización z (matriz de correlaciones)': 'z standardisation (correlation matrix)',
  'escalado de Pareto': 'Pareto scaling', 'escalado VAST': 'VAST scaling',
  'escalado al rango [0,1]': 'scaling to the range [0,1]',
  'escalado robusto (mediana/MAD)': 'robust scaling (median/MAD)',
  'sin transformación previa': 'no prior transformation', 'logaritmo natural': 'natural logarithm',
  'logaritmo base 10': 'base-10 logarithm', 'raíz cuadrada': 'square root', 'inversa': 'reciprocal',
  'eliminación de filas incompletas': 'listwise deletion of incomplete rows',
  'imputación por la media': 'mean imputation', 'imputación por la mediana': 'median imputation',
  /* ---------- theory-card intros ---------- */
  'Todo lo que conviene tener claro <i>antes</i> de tocar los datos. Despliega la sección que necesites; las secciones marcadas con ▸ Bloque N se aplican más adelante en la plataforma.':
    'Everything worth having clear <i>before</i> touching the data. Open the section you need; the sections marked ▸ Block N apply later in the platform.',
  'Qué se calcula exactamente en este paso y cómo se decide cuántos ejes conservar.':
    'What exactly is computed in this step, and how the number of axes to keep is decided.',
  'Por qué rotar, qué método elegir y cómo se reporta.':
    'Why rotate, which method to choose, and how to report it.',
  'Cómo se construye cada gráfico y, sobre todo, cómo se lee sin equivocarse.':
    'How each plot is built and, above all, how to read it without going wrong.',
  'De los números a las frases: cómo se nombra un eje, cómo se caracteriza y hasta dónde se puede llegar sin salirse de lo que el ACP permite afirmar.':
    'From numbers to sentences: how an axis is named, how it is characterised, and how far one can go without claiming more than PCA allows.',
  'Reúne todo lo hecho en los cinco bloques anteriores en un documento único y en un paquete de archivos listo para archivar o compartir.':
    'It gathers everything done in the previous five blocks into a single document and a file package ready to archive or share.',
  'Nombre del componente': 'Component name',
  'Opcional': 'Optional',
  'PCAPro — Análisis de Componentes Principales': 'PCAPro — Principal Component Analysis',
  /* ---------- theory accordion summaries ---------- */
  '1 · ¿Qué es el ACP y qué problema resuelve?': '1 · What is PCA and what problem does it solve?',
  '2 · La matemática, en una página': '2 · The mathematics, in one page',
  '3 · Postulados y supuestos del ACP <span class="pill" style="margin-left:6px">esencial</span>':
    '3 · Postulates and assumptions of PCA <span class="pill" style="margin-left:6px">essential</span>',
  '4 · Pruebas previas obligatorias: Bartlett, KMO, determinante':
    '4 · Mandatory preliminary tests: Bartlett, KMO, determinant',
  '5 · Tamaño de muestra: cuánta gente / cuántas parcelas hacen falta':
    '5 · Sample size: how many people / how many plots are needed',
  '6 · Datos faltantes: qué hacer con los huecos': '6 · Missing data: what to do with the gaps',
  '7 · Estandarización, transformaciones y la elección covarianza / correlación':
    '7 · Standardisation, transformations and the covariance / correlation choice',
  '8 · Variables e individuos activos frente a suplementarios':
    '8 · Active versus supplementary variables and individuals',
  '9 · ¿Cuántos componentes retener? <span class="pill" style="margin-left:6px">▸ Bloque 2</span>':
    '9 · How many components should be retained? <span class="pill" style="margin-left:6px">▸ Block 2</span>',
  '10 · Rotaciones: varimax, quartimax, equamax, promax, oblimin <span class="pill" style="margin-left:6px">▸ Bloque 3</span>':
    '10 · Rotations: varimax, quartimax, equamax, promax, oblimin <span class="pill" style="margin-left:6px">▸ Block 3</span>',
  '11 · ACP frente a Análisis Factorial (y otras confusiones frecuentes)':
    '11 · PCA versus factor analysis (and other common confusions)',
  '12 · Errores frecuentes que arruinan un ACP': '12 · Common mistakes that ruin a PCA',
  '13 · Glosario y lecturas': '13 · Glossary and further reading',
  '1 · Qué produce la extracción': '1 · What the extraction produces',
  '2 · Los criterios de retención, uno por uno': '2 · The retention criteria, one by one',
  '3 · Errores frecuentes en este paso': '3 · Common mistakes at this step',
  '1 · El problema que resuelve la rotación': '1 · The problem that rotation solves',
  '2 · Estructura simple: el objetivo de Thurstone': "2 · Simple structure: Thurstone's goal",
  '3 · Rotaciones ortogonales: la familia ortomax': '3 · Orthogonal rotations: the orthomax family',
  '4 · Rotaciones oblicuas: cuando los ejes pueden correlacionarse':
    '4 · Oblique rotations: when the axes are allowed to correlate',
  '5 · ¿Es legítimo rotar componentes principales?': '5 · Is it legitimate to rotate principal components?',
  '6 · Cómo elegir el umbral de las cargas': '6 · How to choose the loading threshold',
  '1 · Las dos nubes: individuos y variables': '1 · The two clouds: individuals and variables',
  '2 · cos² y contribuciones: las dos medidas que evitan malinterpretar':
    '2 · cos² and contributions: the two measures that prevent misreading',
  '3 · El biplot y su escala': '3 · The biplot and its scaling',
  '4 · Elipses: cuál dibujar y qué significa cada una':
    '4 · Ellipses: which one to draw and what each one means',
  '5 · Elementos suplementarios': '5 · Supplementary elements',
  '6 · Convenciones al publicar una figura de ACP':
    '6 · Conventions when publishing a PCA figure',
  '1 · Qué significa «interpretar» un componente': '1 · What it means to "interpret" a component',
  '2 · El valor test (v.test): cómo se caracteriza un eje con categorías':
    '2 · The test value (v.test): how an axis is characterised with categories',
  '3 · ¿Los grupos difieren en los componentes? — y la trampa de la circularidad':
    '3 · Do the groups differ on the components? — and the circularity trap',
  '4 · Calidad del ajuste: matriz reproducida y RMSR':
    '4 · Goodness of fit: reproduced matrix and RMSR',
  '5 · Cómo se escriben los resultados': '5 · How the results are written up',
  'Qué produce este bloque': 'What this block produces',
};

/* ============================================================
   Core
   ============================================================ */
/* Translate a source string. Missing entries fall back to Spanish so
   that gaps are visible rather than silent. */
function t(s) {
  if (s == null) return s;
  if (I18N.lang === 'es') return s;
  const d = I18N[I18N.lang];
  return (d && d[s] != null) ? d[s] : s;
}

/* Pick between two ready-made strings. Used for sentences that interpolate
   computed values, where a dictionary keyed by the source text cannot work:
     T(`Con ${k} componentes…`, `With ${k} components…`)
   Both languages sit side by side in the source, which for interpolated prose
   is easier to keep in step than a placeholder mini-language. */
function T(es, en) { return I18N.lang === 'en' ? en : es; }

/* Apply the current language to the markup. */
I18N.apply = function () {
  const lang = I18N.lang;
  document.documentElement.lang = lang;
  /* el <title> no lo alcanza data-i18n: se traduce aqui */
  if (document.title) document.title = t(document.title === 'PCAPro — Principal Component Analysis'
    ? 'PCAPro — Análisis de Componentes Principales' : document.title);

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = lang === 'es' ? key : t(key);
  });
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html');
    el.innerHTML = lang === 'es' ? key : t(key);
  });
  /* Elements whose Spanish inner HTML is itself the key. The original is
     captured once on first pass and stored on the node, so the markup does
     not have to repeat long paragraphs inside an attribute. */
  document.querySelectorAll('[data-i18n-auto]').forEach(el => {
    if (el.dataset.es == null) el.dataset.es = el.innerHTML.replace(/\s+/g, ' ').trim();
    el.innerHTML = lang === 'es' ? el.dataset.es : t(el.dataset.es);
  });
  /* whole blocks written once per language (long theory sections) */
  document.querySelectorAll('[data-lang]').forEach(el => {
    el.hidden = el.getAttribute('data-lang') !== lang;
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.getAttribute('data-i18n-title'));
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    el.placeholder = t(el.getAttribute('data-i18n-ph'));
  });
};

I18N.set = function (lang) {
  if (!I18N.supported.includes(lang)) return;
  I18N.lang = lang;
  try { localStorage.setItem('pcapro.lang', lang); } catch (e) { /* private mode */ }
  I18N.apply();
  I18N.onChange.forEach(fn => { try { fn(lang); } catch (e) { console.error(e); } });
};

I18N.init = function () {
  let saved = null;
  try { saved = localStorage.getItem('pcapro.lang'); } catch (e) { /* ignore */ }
  const guess = (navigator.language || 'es').toLowerCase().startsWith('en') ? 'en' : 'es';
  I18N.lang = I18N.supported.includes(saved) ? saved : guess;

  const sel = document.getElementById('langSelect');
  if (sel) {
    sel.value = I18N.lang;
    sel.addEventListener('change', () => I18N.set(sel.value));
  }
  I18N.apply();
};

window.I18N = I18N;
window.t = t;
window.T = T;
document.addEventListener('DOMContentLoaded', I18N.init);

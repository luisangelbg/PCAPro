# Manual de usuario de PCAPro

El manual se escribe por partes, en HTML: primero en español, después en inglés. Cuando esté
completo, las partes se unen en un solo documento y se imprime a PDF. Sigue el mismo formato que el
manual de PopGeneticsPro.

```
manual/
  manual.css           hoja de la portada: tamaño carta y marco
  interior.css         estilo de las páginas interiores: hojas blancas, vivos en azul marino y negro, un color por bloque
  paginar.js           reparte el contenido en hojas tamaño carta (encabezados, números de página, índice)
  img/                 capturas de pantalla de la app, recortadas
  herramientas/
    captura.html       abre la app en un marco, ejecuta una receta de pasos y deja la vista lista para la captura
    capturar.ps1       toma la captura con Edge sin ventana y lista la posición de los elementos para las marcas numeradas
    reunir-reglas.pl   copia las reglas de decisión de los capítulos al apéndice B (perl herramientas/reunir-reglas.pl es)
    unir-manual.pl     une portada y partes en es/manual-completo.html para imprimir el manual completo (ver "Cómo obtener el PDF")
  PCAPro User's Manual.pdf          el manual completo en español
  es/
    00-portada.html    portada blanca: título en español e inglés y un biplot partido en dos.
                       Arriba, un círculo de correlaciones cuyos vectores apuntan a jitomate,
                       naranja, limón mexicano, flor de maracuyá, abeja carpintera, mariposa de
                       los cítricos y crisopa. Abajo, una nube de individuos en 3D con sus tres
                       ejes principales, el plano CP1–CP2, las proyecciones y las elipses de los
                       grupos. A los lados, un gráfico de sedimentación (Kaiser y análisis
                       paralelo) y un dendrograma del agrupamiento con el corte en tres grupos.
                       Todo dibujado con gráficos vectoriales originales.
    01-introduccion.html  créditos, índice general de todo el manual, cómo leer el manual y capítulo 1 (1.1–1.9)
    02-inicio.html     capítulo 2 · Inicio: portada de la app, barra de pasos y qué la activa, la teoría de cada bloque (40 temas), idioma y lo que la app recuerda, cómo citar (dónde está la referencia, DOI de concepto y de versión, párrafo de métodos del informe)
    03-bloque1.html    capítulo 3 · Bloque 1: preparar la hoja (reglas, códigos de faltante), carga y separador decimal, tipo y papel de cada columna, alertas, faltantes/transformaciones/siete escalados, diagnóstico (ocho indicadores, KMO/MSA, cómo se calcula la letra A–D), exploración gráfica y las diez recomendaciones, recomendador de método (reglas, avisos, configuración) y cuatro casos con los archivos de práctica de datos/ (suelos, escalas, sin estructura, semillas con retiro de MSA paso a paso). Todas las cifras salen de la app
    04-bloque2.html    capítulo 4 · Bloque 2: productos de la extracción, indicadores y tabla de valores propios (etiquetas frente a criterios, EE de λ), los ocho criterios con su peso, el consenso por moda ponderada (empate: gana el menor), figuras y descargas, inercia y ejes en AC/ACM/AFDM/AFM (el AFDM y el AFM ignoran el escalado del Bloque 1) y dos casos: iris y semillas con nueve variables
    05-bloque3.html    capítulo 5 · Bloque 3: para qué rotar y cuándo no, las siete rotaciones (familia ortomax, promax, oblimin, quartimin) y detalles del cálculo, patrón/estructura/Φ con regla ortogonal u oblicua, indicadores de estructura simple, umbral de cargas y el caso de la morfometría foliar (ejemplo simulado)
    06-bloque4.html    capítulo 6 · Bloque 4: las dos nubes, indicadores del plano, cos² y contribuciones (suma frente a ponderación del plano), círculo, mapa de individuos y biplot, elipses y suplementarias (aviso de la solución rotada), mapas del AC/ACM/AFDM/AFM, el editor de figuras y exportación, y el caso del proyecto integrador con varimax
    07-bloque5.html    capítulo 7 · Bloque 5: nombrar componentes (sugerencias y regla), descripción de dimensiones y valores test, individuos extremos, comparación de grupos (ANOVA, η², ω², Kruskal; control negativo con Bloque), RMSR y residuos, el borrador y sus tres fallos, interpretación en AC/ACM/AFDM/AFM (umbral convertido a contribución) y el caso del proyecto integrador
    08-bloque5b.html   capítulo 8 · Bloque 5b: HCPC sobre los ejes (qué se agrupa con cada método), Ward y dendrograma, tres reglas para el número de grupos y silueta, consolidación por k-medias, descripción (valores test, paragones y específicos), borrador y descargas, cautelas, y tres casos: iris (2 y 3 grupos), proyecto integrador (7, silueta .227) y datos sin estructura (8 grupos con 75.6 % de inercia)
    09-bloque6.html    capítulo 9 · Bloque 6: estado del análisis (qué resume y cuándo se actualiza), configuración y las once secciones del informe, vista previa, HTML, impresión a PDF, paquete ZIP (figuras, tablas 01–23, CITATION.bib, LEEME) y cómo corregir el párrafo de métodos y citar
    10-apendices.html  apéndices A–F: formatos de archivo (lectura de CSV y Excel, conversión decimal con casos que cambian el valor, archivos de ejemplo, todas las descargas y el ZIP), las 18 reglas de decisión reunidas por el guion y los errores del tema 12, glosario (siglas, símbolos y términos con su sección), solución de problemas (mensajes de la app y comportamientos conocidos de la v1.1), verificación de los cálculos (120 pruebas en 19 conjuntos, cómo ejecutarlas, guiones de R para iris y el tabaquismo, comparación con R 4.4.2 —con las columnas del AC— y la corrección posterior a la 1.1.0 del AC, el ACM y el AFDM) y referencias
    manual-completo.html  documento unido, generado por unir-manual.pl: no se edita a mano
  en/                  versión en inglés (pendiente)
```

## Ver una parte

Cada parte se revisa en HTML; el PDF se hace con todas las partes unidas (sección siguiente). Abre el HTML con doble clic: `paginar.js` arma las hojas en cuanto cargan las tipografías y las imágenes. Sin conexión, el navegador usa tipografías del sistema y la paginación se ajusta sola.

## Cómo obtener el PDF

Primero se unen las partes en un solo documento y después se imprime de una vez, con el servidor local en marcha (`servidor.ps1`, puerto 8790). Desde PowerShell:

```
perl herramientas/unir-manual.pl es
Start-Process -Wait 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe' -ArgumentList '--headless=new','--disable-gpu','--no-pdf-header-footer','--virtual-time-budget=300000','--print-to-pdf=C:\ruta\sin\espacios\manual-es.pdf','http://localhost:8790/manual/es/manual-completo.html'
```

- `unir-manual.pl` escribe `es/manual-completo.html` con la portada, las 13 secciones de `01-introduccion.html` a `10-apendices.html` y los estilos propios de cada parte. Una regla que un capítulo define distinto se limita a las hojas de ese capítulo. Ese archivo no se edita: se corrigen las partes y se vuelve a generar.
- Hay que imprimirlo de una sola vez. Unir PDF sueltos pierde los enlaces del índice y reinicia la numeración.
- Edge no escribe el PDF si la ruta de `--print-to-pdf` tiene espacios; imprime en una carpeta sin espacios y copia el archivo. Llamado desde Git Bash, Edge puede terminar al instante sin escribir nada: usa `Start-Process -Wait`.
- El resultado va en `manual/PCAPro User's Manual.pdf`: 161 hojas (portada, 5 preliminares con números romanos y 155 numeradas) y 84 enlaces. Tarda menos de un minuto.

## Capturas

Con el servidor de la app en marcha (`servidor.ps1`, puerto 8790):

```
powershell -File herramientas/capturar.ps1 -Nombre app-metodo -Receta "lang:es;step:1;ex:iris;process;scroll:#metodoCard,16;marks:#metodoCards"
```

La imagen queda en `img/` a doble resolución; las posiciones de `marks:` salen en porcentaje de la captura. Si luego se recorta la imagen, hay que convertir esas posiciones al recorte. Las marcas van en márgenes o al final de un renglón, nunca sobre el texto de la app.

## Tipografías

Cormorant (títulos), Crimson Pro (texto de las páginas interiores) y Jost (rótulos y tablas), las tres con licencia SIL Open Font License 1.1. Los números
van en Jost: los de Cormorant son de estilo antiguo y el «1» parece una «ı».

## Colores de cada parte

Son las franjas de la portada, en este orden, y el acento de cada capítulo (variables `--b0`, `--bi`, `--b1` … `--b6`, `--b5b`, `--bx` de `interior.css`; chips `.k0`, `.ki`, `.k1` … `.kx`).

| Parte | Color |
|---|---|
| Preliminares y capítulo 1 | tinta `#1b1f2a` |
| Inicio | violeta `#5b3fd6` (el color de la app) |
| Bloque 1 · Datos y supuestos | verde azulado `#0d9488` |
| Bloque 2 · Extracción | verde `#2f9e44` |
| Bloque 3 · Rotación | ocre `#b7791f` |
| Bloque 4 · Gráficos factoriales | naranja tostado `#c2410c` |
| Bloque 5 · Interpretación | carmín `#e0316f` |
| Bloque 5b · Agrupamiento | azul `#1d74b5` |
| Bloque 6 · Informe | grafito `#334155` |
| Apéndices | negro `#111111` |

## Trampa conocida

Un degradado SVG usado como relleno de un `tspan`, o como trazo de una línea recta, se imprime como
un rectángulo gigante. En esos casos hay que usar colores sólidos. En la portada los degradados solo
rellenan figuras con área.

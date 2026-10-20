# Datos de ejemplo · Example data

Los mismos conjuntos, en dos idiomas. Las cifras son idénticas: lo único que cambia son los
nombres de las columnas y de las categorías, para que quien trabaje en inglés no tenga que
adivinar qué mide cada columna.

The same data sets in two languages. The figures are identical; only the column names and the
category labels change.

| Español (`datos/`) | English (`datos/en/`) | Filas · Rows | Qué es · What it is |
|---|---|---|---|
| `iris.csv` | el mismo · the same | 150 | Las medidas florales de Fisher (1936); ya está en inglés |
| `practica1_suelos.csv` | `practice1_soils.csv` | 90 | Seis propiedades de suelo en tres posiciones del terreno |
| `practica2_semillas.csv` | `practice2_seeds.csv` | 120 | Nueve rasgos de semilla en dos especies |
| `practica3_escalas.csv` | `practice3_scales.csv` | 100 | Siete variables en escalas muy distintas: para decidir el escalado |
| `practica4_sin_estructura.csv` | `practice4_no_structure.csv` | 80 | Variables casi independientes: el control negativo del diagnóstico |
| `proyecto_integrador_agronomia.csv` | `integrated_project_agronomy.csv` | 150 | Doce variables de planta, cuatro tratamientos y el rendimiento |

El ejemplo simulado de morfometría foliar no es un archivo: lo genera la propia aplicación, con
semilla fija, y sus columnas siguen al idioma de la interfaz.

The simulated leaf-morphometry example is not a file: the application generates it with a fixed
seed, and its column names follow the interface language.

## Equivalencias · Equivalences

Categorías: `Ladera alta` = Upper slope · `Ladera media` = Mid slope · `Vega` = Floodplain ·
`Silvestre` = Wild · `Cultivada` = Cultivated · `Testigo` = Control · `Riego` = Irrigation ·
`Fertilizacion` = Fertiliser · `Riego+Fert` = Irrigation+Fert.

Los identificadores (`S001`, `G001`, `PAR001`, `B1`, `P2`, `L1`) y los códigos de dato faltante
(`NA`) son iguales en los dos juegos, de modo que una fila se puede rastrear de uno a otro.

Identifiers and missing-data codes are the same in both sets, so a row can be traced from one to
the other.

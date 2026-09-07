/* PCAPro — motor numérico, utilizable sin interfaz.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán
   GPL-3.0-or-later — véase LICENSE en la raíz del repositorio. */

/* Punto de entrada para Node. Los mismos tres ficheros que carga el navegador
   con etiquetas <script> se cargan aquí como módulos, sin duplicar código: no
   hay dos implementaciones que puedan divergir, sino una sola con dos formas
   de cargarse.
 *
 * Sirve para reproducir cualquier resultado de PCAPro fuera del navegador,
 * que es lo que permite acompañar un artículo con un guion ejecutable.
 *
 *   const { S, Rot, Fac } = require('./lib');
 *
 * S    álgebra lineal, distribuciones, KMO, Bartlett, Mahalanobis
 * Rot  rotaciones por el algoritmo de proyección de gradiente de Jennrich
 * Fac  coordenadas factoriales, cos², contribuciones, elipses
 *
 * Fac.build() recibe los datos explícitamente:
 *   Fac.build(useRot, { pca, rot, activeVars, X, suppNum, suppCat })
 */

const S = require('../js/stats.js');
const Rot = require('../js/rotate.js');
const Fac = require('../js/factor.js');

module.exports = { S, Rot, Fac };

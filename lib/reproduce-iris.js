/* PCAPro — reproducción sin navegador de los resultados publicados.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán
   GPL-3.0-or-later — véase LICENSE en la raíz del repositorio. */

/* Reproduce, desde la línea de comandos y sin interfaz, el análisis de
 * componentes principales de los datos iris de Fisher, y compara cada
 * resultado con el valor que devuelven implementaciones independientes.
 *
 * Los valores de referencia proceden de R: prcomp() para los valores propios
 * y las cargas, psych::KMO() para la adecuación muestral, y la fórmula de
 * Bartlett con su chi cuadrada. No se tomaron de una corrida previa de
 * PCAPro: comparar el software consigo mismo no demuestra nada.
 *
 *   node lib/reproduce-iris.js
 *
 * Sale con código 1 si algún valor se aparta de la referencia, de modo que
 * también sirve como comprobación ejecutable dentro de la integración continua.
 */

const fs = require('fs');
const path = require('path');
const { S } = require('./index.js');

/* ---------- datos ---------- */
const csv = fs.readFileSync(path.join(__dirname, '..', 'datos', 'iris.csv'), 'utf8');
const filas = csv.trim().split(/\r?\n/).map(l => l.split(','));
const encabezado = filas.shift();
const numericas = encabezado.slice(0, 4);             // las cuatro medidas; Species es categórica

/* columnas, que es como las quiere el motor */
const X = numericas.map((_, j) => filas.map(r => Number(r[j])));

/* ---------- análisis ---------- */
const R = S.corrMatrix(X);                            // ACP sobre correlaciones
const eig = S.eigenSym(R);
const n = X[0].length;
const kmo = S.kmo(R);
const bartlett = S.bartlett(R, n);

/* cargas: carga_jk = vector_jk * sqrt(lambda_k) */
const cargasCP1 = numericas.map((_, j) => eig.vectors[j][0] * Math.sqrt(eig.values[0]));

/* ---------- referencias independientes ---------- */
/* La tolerancia de cada valor la fija la precisión con que está publicada su
   referencia, no la del cálculo. R imprime los valores propios con seis
   decimales redondeados y psych::KMO con tres: exigir acuerdo más allá del
   último dígito publicado sería exigir acuerdo con un artefacto de redondeo.
   Son las mismas tolerancias que usa la suite de pruebas del repositorio. */
const REFERENCIA = {
  'λ1 (R: prcomp)':            [eig.values[0], 2.918498, 1e-5],
  'λ2 (R: prcomp)':            [eig.values[1], 0.914030, 1e-5],
  'λ3 (R: prcomp)':            [eig.values[2], 0.146757, 1e-5],
  'λ4 (R: prcomp)':            [eig.values[3], 0.020715, 1e-5],
  'KMO global (R: psych::KMO)':[kmo.overall,   0.540,    1e-3],
  'MSA Sepal.Length':          [kmo.msa[0],    0.584,    1e-3],
  'MSA Sepal.Width':           [kmo.msa[1],    0.270,    1e-3],
  'MSA Petal.Length':          [kmo.msa[2],    0.531,    1e-3],
  'MSA Petal.Width':           [kmo.msa[3],    0.634,    1e-3],
  'Bartlett χ²':               [bartlett.chi2, 706.9593, 1e-3],
  'determinante de R':         [S.determinant(R), 0.0081096, 1e-6],
  '|carga| Sepal.Length en CP1': [Math.abs(cargasCP1[0]), 0.8902, 1e-3],
  '|carga| Sepal.Width en CP1':  [Math.abs(cargasCP1[1]), 0.4601, 1e-3],
  '|carga| Petal.Length en CP1': [Math.abs(cargasCP1[2]), 0.9916, 1e-3],
  '|carga| Petal.Width en CP1':  [Math.abs(cargasCP1[3]), 0.9650, 1e-3],
};

/* ---------- comparación ---------- */
console.log(`iris: ${n} observaciones × ${numericas.length} variables activas\n`);
console.log('  ' + 'valor'.padEnd(30) + 'PCAPro'.padStart(14) + 'referencia'.padStart(14) + '   ');

let fallos = 0;
for (const [nombre, [obtenido, esperado, tol]] of Object.entries(REFERENCIA)) {
  const ok = Math.abs(obtenido - esperado) <= tol;
  if (!ok) fallos++;
  console.log(
    (ok ? '  ✔ ' : '  ✖ ') + nombre.padEnd(30) +
    obtenido.toFixed(6).padStart(12) + esperado.toFixed(6).padStart(14) +
    (ok ? '' : `   difiere en ${Math.abs(obtenido - esperado).toExponential(2)}`)
  );
}

console.log();
if (fallos) {
  console.error(`${fallos} valor(es) se apartan de la referencia.`);
  process.exit(1);
}
console.log('Todos los valores coinciden con implementaciones independientes.');

/* PCAPro — análisis de componentes principales en el navegador.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán
   GPL-3.0-or-later — véase LICENSE en la raíz del repositorio. */

/* Análisis factorial de datos mixtos (AFDM) — Pagès (2004).
 *
 * El problema que resuelve: una tabla con variables cuantitativas y
 * cualitativas a la vez. Un ACP ignoraría las cualitativas; un ACM obligaría a
 * cortar las cuantitativas en clases y perder información. El AFDM las pone en
 * pie de igualdad codificando cada tipo de modo que aporte la misma inercia.
 *
 *   cuantitativa  ->  (x - media) / desviación         aporta 1 de inercia
 *   categoría k   ->  (1{x=k} - p_k) / sqrt(p_k)       aporta 1 - p_k
 *
 * y una variable cualitativa con m categorías aporta en total m - 1. De ahí que
 * la inercia total sea exactamente p_cuant + (J - Q): un invariante que la
 * suite comprueba, porque no depende de ninguna implementación de referencia.
 *
 * Con solo cuantitativas el AFDM es un ACP sobre correlaciones; con solo
 * cualitativas es un ACM con la inercia multiplicada por Q. Las dos identidades
 * están puestas a prueba en tests/tests.js.
 */

const FAMD = {};


FAMD.run = function (quant, qual, nomQuant, nomQual) {
  quant = quant || []; qual = qual || [];
  const n = (quant[0] || qual[0] || []).length;
  if (!n) throw new Error('El AFDM necesita al menos una variable.');
  if (!quant.length && !qual.length) throw new Error('El AFDM necesita al menos una variable.');

  const cols = [], etiq = [], tipo = [], varDe = [];
  let nv = 0;

  /* --- cuantitativas: estandarizadas --- */
  const centro = [], escala = [];
  quant.forEach((c, j) => {
    const m = S.mean(c), s = GSV.sdPob(c);
    if (!(s > 0)) throw new Error('La variable "' + ((nomQuant || [])[j] || 'Q' + (j + 1)) + '" es constante.');
    centro.push(m); escala.push(s);
    cols.push(c.map(v => (v - m) / s));
    etiq.push((nomQuant || [])[j] || 'Q' + (j + 1));
    tipo.push('quant'); varDe.push(nv++);
  });
  const nQuant = quant.length;

  /* --- cualitativas: indicadora dividida por la raíz de la proporción.
         GSV.core centra después, de modo que la columna acaba siendo
         (1{x=k} - p_k)/sqrt(p_k) sin tener que restarla aquí. --- */
  const niveles = [], propor = [], catDe = [];
  qual.forEach((c, j) => {
    const ns = [...new Set(c)];
    niveles.push(ns);
    ns.forEach(v => {
      const p = c.reduce((a, x) => a + (x === v ? 1 : 0), 0) / n;
      propor.push(p);
      cols.push(c.map(x => (x === v ? 1 : 0) / Math.sqrt(p)));
      etiq.push(v);
      tipo.push('cat'); varDe.push(nv);
      catDe.push(j);
    });
    nv++;
  });
  const nQual = qual.length;
  const J = etiq.length - nQuant;

  /* --- el núcleo común --- */
  const X = [];
  for (let i = 0; i < n; i++) X.push(cols.map(c => c[i]));
  const res = GSV.core(X, new Array(n).fill(1 / n), new Array(cols.length).fill(1), { method: 'famd' });

  res.tipo = 'famd';
  res.etiquetas = etiq;
  res.tipoCol = tipo;
  res.nQuant = nQuant;
  res.nQual = nQual;
  res.niveles = niveles;
  res.propor = propor;
  res.catDe = catDe;
  res.nomQuant = nomQuant || quant.map((_, j) => 'Q' + (j + 1));
  res.nomQual = nomQual || qual.map((_, j) => 'C' + (j + 1));
  res.centro = centro; res.escala = escala;
  res.inerciaEsperada = nQuant + (J - nQual);

  const K = res.k;

  /* --- correlación de cada cuantitativa con cada eje ---
     Con datos estandarizados y pesos uniformes la coordenada de columna que
     devuelve el núcleo ya es la correlación, pero se calcula aparte para no
     depender de esa coincidencia si algún día cambian los pesos. */
  res.corQuant = [];
  for (let j = 0; j < nQuant; j++) {
    const z = cols[j];
    const fila = new Array(K);
    for (let k = 0; k < K; k++) {
      let num = 0;
      for (let i = 0; i < n; i++) num += z[i] * res.rowCoord[i][k];
      num /= n;
      const sf = Math.sqrt(res.values[k]);
      fila[k] = sf > 0 ? num / sf : 0;
    }
    res.corQuant.push(fila);
  }

  /* --- coordenada de cada categoría: baricentro de sus individuos ---
     Es la lectura que da sentido al mapa: una categoría se sitúa donde está
     el promedio de quienes la presentan. */
  res.coordCat = [];
  res.catEtiq = [];
  let c0 = 0;
  qual.forEach((c, j) => {
    niveles[j].forEach(v => {
      const idx = [];
      for (let i = 0; i < n; i++) if (c[i] === v) idx.push(i);
      const f = new Array(K).fill(0);
      idx.forEach(i => { for (let k = 0; k < K; k++) f[k] += res.rowCoord[i][k]; });
      for (let k = 0; k < K; k++) f[k] /= idx.length;
      res.coordCat.push(f);
      res.catEtiq.push(v);
      c0++;
    });
  });

  /* --- razón de correlación al cuadrado de cada cualitativa con cada eje ---
     Es la proporción de la varianza del eje que explican los grupos: la medida
     que hace comparables cuantitativas y cualitativas en el mismo mapa. */
  res.eta2 = [];
  qual.forEach((c, j) => {
    const fila = new Array(K);
    for (let k = 0; k < K; k++) {
      const y = res.rowCoord.map(f => f[k]);
      const media = S.mean(y);
      let entre = 0;
      niveles[j].forEach(v => {
        const idx = []; for (let i = 0; i < n; i++) if (c[i] === v) idx.push(i);
        const m = idx.reduce((a, i) => a + y[i], 0) / idx.length;
        entre += idx.length * (m - media) * (m - media);
      });
      const tot = y.reduce((a, v) => a + (v - media) * (v - media), 0);
      fila[k] = tot > 0 ? entre / tot : 0;
    }
    res.eta2.push(fila);
  });

  return res;
};

/* Doble salida: <script> en el navegador y require en Node. */
if (typeof require === 'function' && typeof S === 'undefined') global.S = require('./stats.js');
if (typeof require === 'function' && typeof GSV === 'undefined') global.GSV = require('./gsvd.js');
if (typeof module !== 'undefined' && module.exports) module.exports = FAMD;
if (typeof window !== 'undefined') window.FAMD = FAMD;

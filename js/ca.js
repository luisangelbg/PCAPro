/* PCAPro — análisis de componentes principales en el navegador.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán
   GPL-3.0-or-later — véase LICENSE en la raíz del repositorio. */

/* Análisis de correspondencias simple (AC) y múltiple (ACM).
 *
 * Ambos son el núcleo de gsvd.js aplicado a una tabla de frecuencias. El AC
 * trabaja sobre una tabla de contingencia de dos variables cualitativas; el ACM
 * sobre la tabla disyuntiva de varias. Lo que se descompone en los dos casos es
 * la desviación respecto de la independencia, medida en la métrica de la chi
 * cuadrada, y por eso la inercia total del AC es exactamente χ²/n.
 */

const CA = {};

/* ============================================================
   Análisis de correspondencias simple
   ============================================================
   N: tabla de contingencia (frecuencias, no proporciones)
   ============================================================ */
CA.simple = function (N, filas, cols) {
  const nf = N.length, nc = N[0].length;
  const total = N.reduce((a, r) => a + r.reduce((x, y) => x + y, 0), 0);
  if (!(total > 0)) throw new Error('La tabla de contingencia está vacía.');

  /* masas: proporciones marginales */
  const P = N.map(r => r.map(v => v / total));
  const rw = P.map(r => r.reduce((a, b) => a + b, 0));           // masas de fila
  const cw = P[0].map((_, j) => P.reduce((a, r) => a + r[j], 0)); // masas de columna

  /* Perfiles de fila: cada fila dividida por su masa. Centrar esa matriz con
     los pesos de fila da exactamente P - r·cᵀ, que es lo que se descompone.
     Trabajar con perfiles —y no con la tabla cruda— es lo que hace que el AC
     compare formas y no tamaños. */
  const perfil = P.map((r, i) => r.map(v => (rw[i] > 0 ? v / rw[i] : 0)));

  /* La métrica de la chi cuadrada pondera cada columna por 1/masa. */
  const res = G.core(perfil, rw, cw.map(c => (c > 0 ? 1 / c : 0)), { method: 'ca' });

  const chi = G.chi2Tabla(N);
  res.tipo = 'ca';
  res.filas = filas || N.map((_, i) => 'f' + (i + 1));
  res.cols = cols || N[0].map((_, j) => 'c' + (j + 1));
  res.tabla = N;
  res.total = chi.inerciaTotal;                 // se sobrescribe: inercia = χ²/n
  res.pct = res.values.map(v => v / chi.inerciaTotal);
  res.cum = res.values.reduce((a, v, i) => (a.push((a[i - 1] || 0) + v / chi.inerciaTotal), a), []);
  res.chi2 = chi;
  res.ejesPosibles = Math.min(nf, nc) - 1;

  /* Contribución de cada celda a la chi cuadrada: dice qué asociación concreta
     sostiene el mapa, que es la lectura que casi nadie hace. */
  res.celdas = N.map((r, i) => r.map((v, j) => {
    const e = rw[i] * cw[j] * total;
    const resid = e > 0 ? (v - e) / Math.sqrt(e) : 0;            // residuo de Pearson
    return { obs: v, esp: e, resid, contrib: chi.chi2 > 0 ? 100 * resid * resid / chi.chi2 : 0 };
  }));

  return res;
};

/* Construye el AC a partir de dos columnas de etiquetas. */
CA.desdeColumnas = function (a, b) {
  const t = G.contingencia(a, b);
  return CA.simple(t.N, t.filas, t.cols);
};

/* ============================================================
   Análisis de correspondencias múltiple
   ============================================================
   cols: arreglo de columnas cualitativas (cada una, un arreglo de etiquetas)
   ============================================================ */
CA.multiple = function (cols, nombresVar) {
  const dis = G.disyuntiva(cols);
  const Q = dis.nVar, n = dis.Z.length;

  /* El ACM es el AC de la tabla disyuntiva. */
  const res = CA.simple(dis.Z, null, dis.nombres);
  res.tipo = 'mca';
  res.filas = Array.from({ length: n }, (_, i) => 'i' + (i + 1));
  res.cols = dis.nombres;
  res.niveles = dis.niveles;
  res.grupoDe = dis.grupoDe;
  res.nVar = Q;
  res.varNombres = nombresVar || cols.map((_, j) => 'V' + (j + 1));

  /* Los valores propios del ACM sobre la disyuntiva están sesgados a la baja:
     el máximo posible de un eje es 1, y la inercia total es artificialmente
     J/Q - 1, donde J es el número total de niveles. Se corrigen. */
  const J = dis.nombres.length;
  res.inerciaBruta = J / Q - 1;
  res.ejesPosibles = J - Q;

  const umbral = 1 / Q;
  const benz = res.values.filter(v => v > umbral)
    .map(v => Math.pow(Q / (Q - 1) * (v - umbral), 2));
  const sumaBenz = benz.reduce((a, b) => a + b, 0);

  /* Greenacre reescala sobre la inercia media fuera de la diagonal de Burt,
     que es la referencia honesta y no infla los porcentajes como Benzécri. */
  const inerciaGreenacre = Q / (Q - 1) *
    (res.values.reduce((a, v) => a + v * v, 0) - (J - Q) / (Q * Q));

  res.ajuste = {
    umbral,
    benzecri: benz,
    pctBenzecri: benz.map(v => v / sumaBenz),
    pctGreenacre: benz.map(v => v / inerciaGreenacre),
    inerciaGreenacre,
  };

  /* v de Cramér entre cada par de variables: el mapa solo tiene sentido si las
     variables están asociadas entre sí. */
  res.cramer = [];
  for (let i = 0; i < Q; i++) {
    const fila = [];
    for (let j = 0; j < Q; j++) {
      if (i === j) { fila.push(1); continue; }
      const t = G.contingencia(cols[i], cols[j]);
      const c = G.chi2Tabla(t.N);
      const m = Math.min(t.filas.length, t.cols.length) - 1;
      fila.push(m > 0 ? Math.sqrt(c.chi2 / (c.n * m)) : 0);
    }
    res.cramer.push(fila);
  }

  return res;
};

/* Doble salida: <script> en el navegador y require en Node. */
if (typeof require === 'function' && typeof S === 'undefined') global.S = require('./stats.js');
if (typeof require === 'function' && typeof G === 'undefined') global.G = require('./gsvd.js');
if (typeof module !== 'undefined' && module.exports) module.exports = CA;
if (typeof window !== 'undefined') window.CA = CA;

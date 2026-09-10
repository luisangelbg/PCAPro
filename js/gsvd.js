/* PCAPro — análisis de componentes principales en el navegador.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán
   GPL-3.0-or-later — véase LICENSE en la raíz del repositorio. */

/* Núcleo compartido por los métodos factoriales.
 *
 * El ACP, el análisis de correspondencias (AC), el de correspondencias
 * múltiples (ACM), el de datos mixtos (AFDM) y el factorial múltiple (AFM) no
 * son cinco algoritmos: son la misma descomposición en valores singulares
 * generalizada sobre una matriz centrada y ponderada. Lo que cambia entre ellos
 * es cómo se construyen esa matriz y los dos vectores de pesos.
 *
 *   Z = D_r^(1/2) · (X - 1·mᵀ) · D_c^(1/2),   con  m = medias ponderadas
 *
 * y de la SVD de Z salen, para todos, las mismas cantidades: valores propios,
 * coordenadas de filas y de columnas, cos² y contribuciones. Por eso el bloque
 * de mapas factoriales y el de interpretación funcionan igual con cualquiera.
 *
 * Referencias: Greenacre (1984, 2017) para el AC; Lebart, Morineau y Piron
 * para la escuela francesa; Escofier y Pagès (1994) para el AFM.
 */

const GSV = {};


/* Desviación con divisor n. El AFDM y el AFM la necesitan para que cada
   variable cuantitativa aporte exactamente 1 de inercia: con el divisor n-1
   aportaría (n-1)/n y la balanza entre tipos de variable quedaría torcida.
   No cambia la matriz de correlaciones, que es invariante al divisor. */
GSV.sdPob = function (c) {
  const m = S.mean(c);
  return Math.sqrt(c.reduce((a, v) => a + (v - m) * (v - m), 0) / c.length);
};

/* ============================================================
   Álgebra
   ============================================================ */

/* SVD por la vía simétrica: los vectores propios de ZᵀZ dan V, y U = Z·V/σ.
   Se apoya en el Jacobi que ya usa el ACP, así que no se introduce un segundo
   algoritmo numérico que mantener. Para las matrices de esta aplicación
   —decenas o cientos de columnas— es holgadamente suficiente. */
GSV.svd = function (Z) {
  const n = Z.length, p = Z[0].length;
  const Zt = S.transpose(Z);
  const C = S.matMul(Zt, Z);                       // p x p, simétrica
  const e = S.eigenSym(C);

  const tol = 1e-10 * (e.values[0] || 1);
  const d = [], V = [], U = [];
  for (let k = 0; k < p; k++) {
    const lam = e.values[k];
    if (lam <= tol) break;
    const sig = Math.sqrt(lam);
    const v = e.vectors.map(r => r[k]);
    /* u = Z·v/σ; si Z tiene menos filas que columnas los u sobrantes no
       existen, y el corte por tolerancia ya los ha descartado. */
    const u = new Array(n);
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let j = 0; j < p; j++) s += Z[i][j] * v[j];
      u[i] = s / sig;
    }
    d.push(sig); V.push(v); U.push(u);
  }
  return { d, U, V };                               // U y V vienen por columnas
};

/* ============================================================
   El paso común
   ============================================================
   X   matriz n x p ya transformada por el método que llama
   rw  pesos de fila (masas), suman 1
   cw  pesos de columna
   Devuelve la estructura que consumen los bloques 4 y 5.
   ============================================================ */
GSV.core = function (X, rw, cw, opt) {
  opt = opt || {};
  const n = X.length, p = X[0].length;

  /* media ponderada de cada columna y centrado */
  const media = new Array(p).fill(0);
  for (let j = 0; j < p; j++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += rw[i] * X[i][j];
    media[j] = s;
  }
  const Xc = X.map(r => r.map((v, j) => v - media[j]));

  /* Z = D_r^(1/2) · Xc · D_c^(1/2) */
  const sr = rw.map(Math.sqrt), sc = cw.map(Math.sqrt);
  const Z = Xc.map((r, i) => r.map((v, j) => v * sr[i] * sc[j]));

  const { d, U, V } = GSV.svd(Z);
  const K = d.length;
  const values = d.map(s => s * s);
  const total = values.reduce((a, b) => a + b, 0);

  /* Coordenadas principales:
       filas    F = D_r^(-1/2) · U · D_σ
       columnas Gc = D_c^(-1/2) · V · D_σ
     Son las que se dibujan; las estandarizadas se obtienen dividiendo por σ. */
  const rowCoord = [], colCoord = [];
  for (let i = 0; i < n; i++) {
    const f = new Array(K);
    for (let k = 0; k < K; k++) f[k] = U[k][i] / sr[i] * d[k];
    rowCoord.push(f);
  }
  for (let j = 0; j < p; j++) {
    const g = new Array(K);
    for (let k = 0; k < K; k++) g[k] = V[k][j] / sc[j] * d[k];
    colCoord.push(g);
  }

  /* Inercias, cos² y contribuciones: idénticos en los cinco métodos. */
  const rowInertia = rowCoord.map((f, i) => rw[i] * f.reduce((a, v) => a + v * v, 0));
  const colInertia = colCoord.map((g, j) => cw[j] * g.reduce((a, v) => a + v * v, 0));

  const cos2 = (coord, inerciaTot) => coord.map((v, i) => {
    const d2 = v.reduce((a, x) => a + x * x, 0);
    return v.map(x => (d2 > 0 ? (x * x) / d2 : 0));
  });
  const contrib = (coord, w) => coord.map((v, i) => v.map((x, k) =>
    values[k] > 0 ? 100 * w[i] * x * x / values[k] : 0));

  return {
    n, p, k: K,
    values, total,
    pct: values.map(v => v / total),
    cum: values.reduce((a, v, i) => (a.push((a[i - 1] || 0) + v / total), a), []),
    d, U, V,
    rowW: rw.slice(), colW: cw.slice(),
    rowCoord, colCoord,
    rowCos2: cos2(rowCoord), colCos2: cos2(colCoord),
    rowContrib: contrib(rowCoord, rw), colContrib: contrib(colCoord, cw),
    rowInertia, colInertia,
    mean: media,
    method: opt.method || 'gsvd',
  };
};

/* ============================================================
   Proyección de elementos suplementarios
   ============================================================
   Un punto suplementario no interviene en la construcción de los ejes: se
   proyecta después, con la fórmula baricéntrica. Vale para filas y para
   columnas y para los cinco métodos.
   ============================================================ */
GSV.supRow = function (res, xs, cw) {
  const w = cw || res.colW;
  const K = res.k;
  return xs.map(x => {
    const c = x.map((v, j) => v - res.mean[j]);
    const f = new Array(K).fill(0);
    for (let k = 0; k < K; k++) {
      let s = 0;
      for (let j = 0; j < res.p; j++) s += c[j] * w[j] * res.V[k][j] / Math.sqrt(w[j]);
      f[k] = s;
    }
    return f;
  });
};

/* ============================================================
   Tablas de contingencia y frecuencias
   ============================================================ */

/* Tabla de contingencia a partir de dos vectores de etiquetas. */
GSV.contingencia = function (a, b) {
  const fa = [...new Set(a)], fb = [...new Set(b)];
  const ia = new Map(fa.map((v, i) => [v, i])), ib = new Map(fb.map((v, i) => [v, i]));
  const N = fa.map(() => new Array(fb.length).fill(0));
  for (let i = 0; i < a.length; i++) N[ia.get(a[i])][ib.get(b[i])]++;
  return { N, filas: fa, cols: fb };
};

/* Tabla disyuntiva completa (indicadora) de varias columnas cualitativas. */
GSV.disyuntiva = function (cols) {
  const n = cols[0].length;
  const niveles = cols.map(c => [...new Set(c)]);
  const nombres = [];
  niveles.forEach((ns, j) => ns.forEach(v => nombres.push(v)));
  const grupoDe = [];
  niveles.forEach((ns, j) => ns.forEach(() => grupoDe.push(j)));

  const Zd = [];
  for (let i = 0; i < n; i++) {
    const fila = [];
    cols.forEach((c, j) => niveles[j].forEach(v => fila.push(c[i] === v ? 1 : 0)));
    Zd.push(fila);
  }
  return { Z: Zd, nombres, niveles, grupoDe, nVar: cols.length };
};

/* Prueba de independencia sobre la tabla: sin asociación, un AC no tiene
   estructura que mostrar. Es el equivalente de Bartlett para el ACP. */
GSV.chi2Tabla = function (N) {
  const nf = N.length, nc = N[0].length;
  const tot = N.reduce((a, r) => a + r.reduce((x, y) => x + y, 0), 0);
  const fr = N.map(r => r.reduce((a, b) => a + b, 0));
  const fc = N[0].map((_, j) => N.reduce((a, r) => a + r[j], 0));
  let chi2 = 0, minEsp = Infinity, celdasBajas = 0;
  for (let i = 0; i < nf; i++) for (let j = 0; j < nc; j++) {
    const e = fr[i] * fc[j] / tot;
    if (e < minEsp) minEsp = e;
    if (e < 5) celdasBajas++;
    if (e > 0) chi2 += (N[i][j] - e) * (N[i][j] - e) / e;
  }
  const df = (nf - 1) * (nc - 1);
  return {
    chi2, df, p: S.chi2P(chi2, df),
    inerciaTotal: chi2 / tot,          // la inercia total del AC es φ² = χ²/n
    n: tot, minEsp, celdasBajas,
    pctBajas: 100 * celdasBajas / (nf * nc),
  };
};

/* Doble salida: <script> en el navegador y require en Node. */
if (typeof require === 'function' && typeof S === 'undefined') global.S = require('./stats.js');
if (typeof module !== 'undefined' && module.exports) module.exports = GSV;
if (typeof window !== 'undefined') window.GSV = GSV;

/* PCAPro — análisis de componentes principales en el navegador.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it
   under the terms of the GNU General Public License as published by the Free
   Software Foundation, either version 3 of the License, or (at your option)
   any later version. This program is distributed WITHOUT ANY WARRANTY; see
   the GNU General Public License for more details. You should have received
   a copy of the License along with this program; if not, see
   <https://www.gnu.org/licenses/>. */

/* PCAPro — motor numerico.
   Algebra lineal + estadistica necesarias para ACP, escritas a mano para que
   todo corra en el navegador sin dependencias ni Python. */

const S = {};

/* ================= vectores ================= */
S.sum = a => a.reduce((s, x) => s + x, 0);
S.mean = a => a.length ? S.sum(a) / a.length : NaN;
S.variance = (a, sample = true) => {
  const n = a.length; if (n < 2) return NaN;
  const m = S.mean(a);
  return a.reduce((s, x) => s + (x - m) * (x - m), 0) / (sample ? n - 1 : n);
};
S.sd = (a, sample = true) => Math.sqrt(S.variance(a, sample));
S.median = a => S.quantile(a, 0.5);
S.quantile = (a, p) => {
  if (!a.length) return NaN;
  const s = [...a].sort((x, y) => x - y);
  const h = (s.length - 1) * p, lo = Math.floor(h), hi = Math.ceil(h);
  return s[lo] + (h - lo) * (s[hi] - s[lo]);
};
S.min = a => a.reduce((m, x) => x < m ? x : m, Infinity);
S.max = a => a.reduce((m, x) => x > m ? x : m, -Infinity);
S.mad = a => {                    // desviacion absoluta mediana, escalada a sigma
  const md = S.median(a);
  return 1.4826 * S.median(a.map(x => Math.abs(x - md)));
};
S.iqr = a => S.quantile(a, 0.75) - S.quantile(a, 0.25);

/* asimetria muestral (g1 con correccion de sesgo, tipo SPSS/Excel) */
S.skewness = a => {
  const n = a.length; if (n < 3) return NaN;
  const m = S.mean(a), s = S.sd(a);
  if (!s) return 0;
  const g1 = a.reduce((acc, x) => acc + Math.pow((x - m) / s, 3), 0) / n;
  return Math.sqrt(n * (n - 1)) / (n - 2) * g1;
};
/* curtosis en exceso (G2, tipo SPSS/Excel) */
S.kurtosis = a => {
  const n = a.length; if (n < 4) return NaN;
  const m = S.mean(a), sd = S.sd(a);
  if (!sd) return 0;
  const sum4 = a.reduce((acc, x) => acc + Math.pow((x - m) / sd, 4), 0);
  return (n * (n + 1) / ((n - 1) * (n - 2) * (n - 3))) * sum4 -
    (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
};

/* error estandar de asimetria y curtosis */
S.seSkew = n => Math.sqrt(6 * n * (n - 1) / ((n - 2) * (n + 1) * (n + 3)));
S.seKurt = n => 2 * S.seSkew(n) * Math.sqrt((n * n - 1) / ((n - 3) * (n + 5)));

/* ================= correlaciones ================= */
S.pearson = (x, y) => {
  const n = x.length;
  const mx = S.mean(x), my = S.mean(y);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx, dy = y[i] - my;
    sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
  }
  if (sxx === 0 || syy === 0) return NaN;
  return sxy / Math.sqrt(sxx * syy);
};
S.rank = a => {
  const idx = a.map((v, i) => [v, i]).sort((p, q) => p[0] - q[0]);
  const r = new Array(a.length);
  let i = 0;
  while (i < idx.length) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) r[idx[k][1]] = avg;
    i = j + 1;
  }
  return r;
};
S.spearman = (x, y) => S.pearson(S.rank(x), S.rank(y));

/* matriz de correlaciones a partir de columnas: cols = [[...],[...]] */
S.corrMatrix = (cols, method) => {
  const p = cols.length;
  const R = Array.from({ length: p }, () => new Array(p).fill(0));
  const f = method === 'spearman' ? S.spearman : S.pearson;
  for (let i = 0; i < p; i++) {
    R[i][i] = 1;
    for (let j = i + 1; j < p; j++) {
      const r = f(cols[i], cols[j]);
      R[i][j] = R[j][i] = isFinite(r) ? r : 0;
    }
  }
  return R;
};
S.covMatrix = cols => {
  const p = cols.length, n = cols[0].length;
  const m = cols.map(S.mean);
  const C = Array.from({ length: p }, () => new Array(p).fill(0));
  for (let i = 0; i < p; i++) for (let j = i; j < p; j++) {
    let s = 0;
    for (let k = 0; k < n; k++) s += (cols[i][k] - m[i]) * (cols[j][k] - m[j]);
    C[i][j] = C[j][i] = s / (n - 1);
  }
  return C;
};

/* ================= algebra de matrices ================= */
S.identity = p => Array.from({ length: p }, (_, i) =>
  Array.from({ length: p }, (_, j) => i === j ? 1 : 0));

S.matMul = (A, B) => {
  const n = A.length, m = B[0].length, k = B.length;
  const C = Array.from({ length: n }, () => new Array(m).fill(0));
  for (let i = 0; i < n; i++) for (let l = 0; l < k; l++) {
    const a = A[i][l]; if (a === 0) continue;
    for (let j = 0; j < m; j++) C[i][j] += a * B[l][j];
  }
  return C;
};
S.transpose = A => A[0].map((_, j) => A.map(r => r[j]));

/* inversa por Gauss-Jordan con pivoteo parcial; null si es singular */
S.inverse = M => {
  const n = M.length;
  const A = M.map((r, i) => [...r, ...S.identity(n)[i]]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
    if (Math.abs(A[piv][c]) < 1e-12) return null;
    [A[c], A[piv]] = [A[piv], A[c]];
    const d = A[c][c];
    for (let j = 0; j < 2 * n; j++) A[c][j] /= d;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = A[r][c]; if (f === 0) continue;
      for (let j = 0; j < 2 * n; j++) A[r][j] -= f * A[c][j];
    }
  }
  return A.map(r => r.slice(n));
};
/* determinante por eliminacion LU */
S.determinant = M => {
  const n = M.length;
  const A = M.map(r => [...r]);
  let det = 1;
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
    if (Math.abs(A[piv][c]) < 1e-14) return 0;
    if (piv !== c) { [A[c], A[piv]] = [A[piv], A[c]]; det = -det; }
    det *= A[c][c];
    for (let r = c + 1; r < n; r++) {
      const f = A[r][c] / A[c][c];
      for (let j = c; j < n; j++) A[r][j] -= f * A[c][j];
    }
  }
  return det;
};

/* Eigen-descomposicion de matriz simetrica por rotaciones de Jacobi.
   Devuelve {values:[...desc], vectors:[[...]] } con vectores en COLUMNAS. */
S.eigenSym = (M, maxIter = 100, tol = 1e-11) => {
  const n = M.length;
  let A = M.map(r => [...r]);
  let V = S.identity(n);
  for (let iter = 0; iter < maxIter; iter++) {
    let off = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += A[i][j] * A[i][j];
    if (Math.sqrt(2 * off) < tol) break;
    for (let p = 0; p < n - 1; p++) for (let q = p + 1; q < n; q++) {
      if (Math.abs(A[p][q]) < 1e-15) continue;
      const theta = (A[q][q] - A[p][p]) / (2 * A[p][q]);
      const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
      const c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < n; k++) {
        const akp = A[k][p], akq = A[k][q];
        A[k][p] = c * akp - s * akq;
        A[k][q] = s * akp + c * akq;
      }
      for (let k = 0; k < n; k++) {
        const apk = A[p][k], aqk = A[q][k];
        A[p][k] = c * apk - s * aqk;
        A[q][k] = s * apk + c * aqk;
      }
      for (let k = 0; k < n; k++) {
        const vkp = V[k][p], vkq = V[k][q];
        V[k][p] = c * vkp - s * vkq;
        V[k][q] = s * vkp + c * vkq;
      }
    }
  }
  const pairs = [];
  for (let i = 0; i < n; i++) pairs.push({ val: A[i][i], vec: V.map(r => r[i]) });
  pairs.sort((a, b) => b.val - a.val);
  /* signo convencional: la carga de mayor magnitud queda positiva */
  pairs.forEach(p => {
    let k = 0;
    for (let i = 1; i < n; i++) if (Math.abs(p.vec[i]) > Math.abs(p.vec[k])) k = i;
    if (p.vec[k] < 0) p.vec = p.vec.map(v => -v);
  });
  return {
    values: pairs.map(p => p.val),
    vectors: S.transpose(pairs.map(p => p.vec)), // columnas = autovectores
  };
};

/* ================= distribuciones ================= */
S.logGamma = x => {
  const g = [76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let xx = x, y = x, tmp = xx + 5.5;
  tmp -= (xx + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += g[j] / ++y;
  return -tmp + Math.log(2.5066282746310005 * ser / xx);
};
/* funcion gamma incompleta regularizada P(a,x) */
S.gammaP = (a, x) => {
  if (x < 0 || a <= 0) return NaN;
  if (x === 0) return 0;
  if (x < a + 1) {                        // serie
    let ap = a, sum = 1 / a, del = sum;
    for (let n = 1; n < 500; n++) {
      ap++; del *= x / ap; sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-14) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - S.logGamma(a));
  }
  // fraccion continua para Q(a,x)
  let b = x + 1 - a, c = 1e300, d = 1 / b, h = d;
  for (let i = 1; i < 500; i++) {
    const an = -i * (i - a);
    b += 2; d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300;
    c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d; const del = d * c; h *= del;
    if (Math.abs(del - 1) < 1e-14) break;
  }
  const Q = Math.exp(-x + a * Math.log(x) - S.logGamma(a)) * h;
  return 1 - Q;
};
S.chi2CDF = (x, df) => (x <= 0 ? 0 : S.gammaP(df / 2, x / 2));
S.chi2P = (x, df) => 1 - S.chi2CDF(x, df);         // valor p (cola derecha)
S.chi2Inv = (p, df) => {                            // biseccion
  let lo = 0, hi = Math.max(100, df * 10);
  while (S.chi2CDF(hi, df) < p && hi < 1e7) hi *= 2;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (S.chi2CDF(mid, df) < p) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
};
S.normalCDF = z => 0.5 * (1 + S.erf(z / Math.SQRT2));
S.erf = x => {                        // Abramowitz & Stegun 7.1.26
  const s = Math.sign(x) || 1; x = Math.abs(x);
  const a = [0.254829592, -0.284496736, 1.421413741, -1.453152027, 1.061405429];
  const t = 1 / (1 + 0.3275911 * x);
  let poly = 0, tp = t;
  for (let i = 0; i < 5; i++) { poly += a[i] * tp; tp *= t; }
  return s * (1 - poly * Math.exp(-x * x));
};
/* p bilateral de la normal estandar */
S.normalP2 = z => 2 * (1 - S.normalCDF(Math.abs(z)));

/* --- funcion beta incompleta regularizada (Numerical Recipes) --- */
S.betacf = (a, b, x) => {
  const MAXIT = 300, EPS = 3e-14, FPMIN = 1e-300;
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - qab * x / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c; h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
};
S.betaI = (a, b, x) => {
  if (!(x > 0)) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(S.logGamma(a + b) - S.logGamma(a) - S.logGamma(b) +
    a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2)
    ? bt * S.betacf(a, b, x) / a
    : 1 - bt * S.betacf(b, a, 1 - x) / b;
};
/* valor p bilateral de la t de Student */
S.tP = (t, df) => (df <= 0 || !isFinite(t)) ? NaN : S.betaI(df / 2, 0.5, df / (df + t * t));
/* valor p (cola derecha) de la F de Snedecor */
S.fP = (f, df1, df2) => (!(f > 0) || df1 <= 0 || df2 <= 0) ? 1 : S.betaI(df2 / 2, df1 / 2, df2 / (df2 + df1 * f));
/* significacion de un coeficiente de correlacion de Pearson */
S.corP = (r, n) => {
  if (!(n > 2) || !isFinite(r)) return NaN;
  if (Math.abs(r) >= 1) return 0;
  const t = r * Math.sqrt((n - 2) / (1 - r * r));
  return S.tP(t, n - 2);
};

/* --- comparacion de grupos --- */
/* ANOVA de una via. groups: [[valores], ...] */
S.anova = groups => {
  const g = groups.length;
  const N = groups.reduce((s, a) => s + a.length, 0);
  if (g < 2 || N <= g) return null;
  const grand = S.mean(groups.flat());
  let ssb = 0, ssw = 0;
  groups.forEach(a => {
    const m = S.mean(a);
    ssb += a.length * (m - grand) * (m - grand);
    a.forEach(v => { ssw += (v - m) * (v - m); });
  });
  const df1 = g - 1, df2 = N - g;
  const msb = ssb / df1, msw = ssw / df2;
  const F = msw > 0 ? msb / msw : Infinity;
  const sst = ssb + ssw;
  const eta2 = sst > 0 ? ssb / sst : 0;
  const omega2 = sst + msw > 0 ? (ssb - df1 * msw) / (sst + msw) : 0;
  return { F, df1, df2, p: S.fP(F, df1, df2), eta2, omega2: Math.max(0, omega2), ssb, ssw, N, g };
};
/* Kruskal-Wallis con correccion por empates */
S.kruskal = groups => {
  const all = groups.flat();
  const N = all.length, g = groups.length;
  if (g < 2 || N < 3) return null;
  const ranks = S.rank(all);
  let off = 0, H = 0;
  groups.forEach(a => {
    const r = ranks.slice(off, off + a.length);
    off += a.length;
    const sum = r.reduce((s, v) => s + v, 0);
    H += (sum * sum) / a.length;
  });
  H = 12 / (N * (N + 1)) * H - 3 * (N + 1);
  /* correccion por empates */
  const counts = {};
  all.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
  const tie = Object.values(counts).reduce((s, c) => s + (c * c * c - c), 0);
  const corr = 1 - tie / (N * N * N - N);
  if (corr > 0) H /= corr;
  return { H, df: g - 1, p: S.chi2P(H, g - 1) };
};

/* ================= pruebas de adecuacion muestral ================= */
/* Prueba de esfericidad de Bartlett sobre la matriz de correlaciones */
S.bartlett = (R, n) => {
  const p = R.length;
  const det = S.determinant(R);
  if (!(det > 0)) return { chi2: Infinity, df: p * (p - 1) / 2, p: 0, det: det, singular: true };
  const chi2 = -((n - 1) - (2 * p + 5) / 6) * Math.log(det);
  const df = p * (p - 1) / 2;
  return { chi2, df, p: S.chi2P(chi2, df), det, singular: false };
};
/* Kaiser-Meyer-Olkin global y MSA por variable (a partir de anti-imagen) */
S.kmo = R => {
  const p = R.length;
  const inv = S.inverse(R);
  if (!inv) return null;
  // correlaciones parciales
  const P = Array.from({ length: p }, () => new Array(p).fill(0));
  for (let i = 0; i < p; i++) for (let j = 0; j < p; j++) {
    if (i === j) { P[i][j] = 1; continue; }
    P[i][j] = -inv[i][j] / Math.sqrt(inv[i][i] * inv[j][j]);
  }
  let sr = 0, sp = 0;
  const msa = new Array(p).fill(0);
  for (let i = 0; i < p; i++) {
    let sri = 0, spi = 0;
    for (let j = 0; j < p; j++) {
      if (i === j) continue;
      sri += R[i][j] * R[i][j];
      spi += P[i][j] * P[i][j];
    }
    msa[i] = sri / (sri + spi);
    sr += sri; sp += spi;
  }
  return { overall: sr / (sr + sp), msa, partial: P };
};
/* Distancia de Mahalanobis al centroide, con matriz de covarianzas de los datos */
S.mahalanobis = cols => {
  const p = cols.length, n = cols[0].length;
  const C = S.covMatrix(cols);
  const inv = S.inverse(C);
  if (!inv) return null;
  const m = cols.map(S.mean);
  const d2 = new Array(n).fill(0);
  for (let k = 0; k < n; k++) {
    const d = cols.map((c, j) => c[k] - m[j]);
    let s = 0;
    for (let i = 0; i < p; i++) for (let j = 0; j < p; j++) s += d[i] * inv[i][j] * d[j];
    d2[k] = s;
  }
  return d2;
};

/* ================= escalado y transformaciones ================= */
S.scaleColumn = (v, method) => {
  const m = S.mean(v), sd = S.sd(v);
  switch (method) {
    case 'none': return { v: v.slice(), center: 0, scale: 1 };
    case 'center': return { v: v.map(x => x - m), center: m, scale: 1 };
    case 'z': return { v: v.map(x => sd ? (x - m) / sd : 0), center: m, scale: sd };
    case 'pareto': { const s = Math.sqrt(sd); return { v: v.map(x => s ? (x - m) / s : 0), center: m, scale: s }; }
    case 'vast': { const s = sd && m ? (sd * sd) / m : sd; return { v: v.map(x => s ? (x - m) / s : 0), center: m, scale: s }; }
    case 'range': {
      const mn = S.min(v), mx = S.max(v), r = mx - mn;
      return { v: v.map(x => r ? (x - mn) / r : 0), center: mn, scale: r || 1 };
    }
    case 'robust': {
      const md = S.median(v), mad = S.mad(v) || S.iqr(v) || 1;
      return { v: v.map(x => (x - md) / mad), center: md, scale: mad };
    }
    default: return { v: v.slice(), center: 0, scale: 1 };
  }
};
S.transformColumn = (v, method) => {
  switch (method) {
    case 'log': { const mn = S.min(v); const sh = mn <= 0 ? 1 - mn : 0; return v.map(x => Math.log(x + sh)); }
    case 'log10': { const mn = S.min(v); const sh = mn <= 0 ? 1 - mn : 0; return v.map(x => Math.log10(x + sh)); }
    case 'sqrt': { const mn = S.min(v); const sh = mn < 0 ? -mn : 0; return v.map(x => Math.sqrt(x + sh)); }
    case 'inverse': { const mn = S.min(v); const sh = mn <= 0 ? 1 - mn : 0; return v.map(x => 1 / (x + sh)); }
    default: return v.slice();
  }
};

/* ================= histograma / densidad ================= */
S.histogram = (v, bins) => {
  const mn = S.min(v), mx = S.max(v);
  const k = bins || Math.max(5, Math.min(30, Math.ceil(Math.sqrt(v.length))));
  const w = (mx - mn) / k || 1;
  const counts = new Array(k).fill(0);
  v.forEach(x => {
    let i = Math.floor((x - mn) / w);
    if (i >= k) i = k - 1; if (i < 0) i = 0;
    counts[i]++;
  });
  return { counts, min: mn, max: mx, width: w, k };
};

/* Doble salida: como <script> en el navegador (incluido file://) y como
   modulo en Node, para poder reproducir resultados sin interfaz. */
if (typeof module !== 'undefined' && module.exports) module.exports = S;
if (typeof window !== 'undefined') window.S = S;

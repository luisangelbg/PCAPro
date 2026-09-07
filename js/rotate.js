/* PCAPro — rotaciones factoriales.
   Implementa la familia ortomax (quartimax, varimax, equamax, parsimax) y las
   oblicuas (quartimin, oblimin, promax) mediante el algoritmo de proyección de
   gradiente de Jennrich (2001, 2002), el mismo que usa GPArotation en R. */

const Rot = {};

/* ---------- utilidades de matrices ---------- */
const mul = (A, B) => S.matMul(A, B);
const tr = A => S.transpose(A);
const frob = M => Math.sqrt(M.reduce((s, r) => s + r.reduce((a, v) => a + v * v, 0), 0));
const scaleCols = (M, v) => M.map(r => r.map((x, j) => x * v[j]));

/* raíz cuadrada inversa de una matriz simétrica definida positiva */
function invSqrtSym(M) {
  const e = S.eigenSym(M);
  const k = M.length;
  const D = Array.from({ length: k }, (_, i) =>
    Array.from({ length: k }, (_, j) => i === j ? 1 / Math.sqrt(Math.max(e.values[i], 1e-12)) : 0));
  return mul(mul(e.vectors, D), tr(e.vectors));
}
/* proyección ortogonal más cercana (Procrustes): T = X (XᵀX)^(−1/2) */
function nearestOrth(X) { return mul(X, invSqrtSym(mul(tr(X), X))); }

function cov2cor(M) {
  const k = M.length;
  return M.map((r, i) => r.map((v, j) => v / Math.sqrt(M[i][i] * M[j][j])));
}

/* ---------- criterios ---------- */
/* Familia ortomax. gamma: 0 quartimax · 1 varimax · k/2 equamax · p(k−1)/(p+k−2) parsimax */
function vgQortho(L, gamma) {
  const p = L.length, k = L[0].length;
  const L2 = L.map(r => r.map(v => v * v));
  const cs = new Array(k).fill(0);
  for (let j = 0; j < k; j++) for (let i = 0; i < p; i++) cs[j] += L2[i][j];
  const QL = L2.map(r => r.map((v, j) => v - gamma / p * cs[j]));
  let f = 0;
  for (let i = 0; i < p; i++) for (let j = 0; j < k; j++) f += L2[i][j] * QL[i][j];
  return { f: -f / 4, Gq: L.map((r, i) => r.map((v, j) => -v * QL[i][j])) };
}
/* Oblimin directo. gamma: 0 quartimin · 0.5 bicuartimin · 1 covarimin */
function vgQoblimin(L, gamma) {
  const p = L.length, k = L[0].length;
  const L2 = L.map(r => r.map(v => v * v));
  const rowSum = L2.map(r => r.reduce((a, b) => a + b, 0));
  let X = L2.map((r, i) => r.map(v => rowSum[i] - v));   // suma de las OTRAS columnas
  if (gamma !== 0) {
    const cs = new Array(k).fill(0);
    for (let j = 0; j < k; j++) for (let i = 0; i < p; i++) cs[j] += X[i][j];
    X = X.map(r => r.map((v, j) => v - gamma / p * cs[j]));
  }
  let f = 0;
  for (let i = 0; i < p; i++) for (let j = 0; j < k; j++) f += L2[i][j] * X[i][j];
  return { f: f / 4, Gq: L.map((r, i) => r.map((v, j) => v * X[i][j])) };
}

/* ---------- GPA ortogonal ---------- */
function gpaOrtho(A, gamma, maxIter, eps) {
  maxIter = maxIter || 1500; eps = eps || 1e-7;
  const k = A[0].length;
  let T = S.identity(k), al = 1;
  let L = mul(A, T);
  let r = vgQortho(L, gamma), f = r.f;
  let G = mul(tr(A), r.Gq);
  let iter = 0, conv = false;
  for (; iter < maxIter; iter++) {
    const M = mul(tr(T), G);
    const Sym = M.map((row, i) => row.map((v, j) => (v + M[j][i]) / 2));
    const TS = mul(T, Sym);
    const Gp = G.map((row, i) => row.map((v, j) => v - TS[i][j]));
    const s = frob(Gp);
    if (s < eps) { conv = true; break; }
    al *= 2;
    for (let inner = 0; inner < 12; inner++) {
      const X = T.map((row, i) => row.map((v, j) => v - al * Gp[i][j]));
      const Tt = nearestOrth(X);
      const Lt = mul(A, Tt);
      const rt = vgQortho(Lt, gamma);
      if (rt.f < f - 0.5 * s * s * al) {
        T = Tt; L = Lt; f = rt.f; G = mul(tr(A), rt.Gq);
        break;
      }
      al /= 2;
    }
  }
  return { L, T, f, iter, converged: conv, Phi: S.identity(k) };
}

/* ---------- GPA oblicuo ---------- */
function gpaObliq(A, gamma, maxIter, eps) {
  maxIter = maxIter || 1500; eps = eps || 1e-7;
  const k = A[0].length;
  let T = S.identity(k), al = 1;
  let Tinv = S.inverse(T);
  let L = mul(A, tr(Tinv));
  let r = vgQoblimin(L, gamma), f = r.f;
  const gradG = (Lm, Gq, Ti) => {
    const P = mul(mul(tr(Lm), Gq), Ti);          // k × k
    return tr(P).map(row => row.map(v => -v));
  };
  let G = gradG(L, r.Gq, Tinv);
  let iter = 0, conv = false;
  for (; iter < maxIter; iter++) {
    const cs = new Array(k).fill(0);             // colSums(T * G)
    for (let j = 0; j < k; j++) for (let i = 0; i < k; i++) cs[j] += T[i][j] * G[i][j];
    const Gp = G.map((row, i) => row.map((v, j) => v - T[i][j] * cs[j]));
    const s = frob(Gp);
    if (s < eps) { conv = true; break; }
    al *= 2;
    let moved = false;
    for (let inner = 0; inner < 12; inner++) {
      const X = T.map((row, i) => row.map((v, j) => v - al * Gp[i][j]));
      const nrm = new Array(k).fill(0);
      for (let j = 0; j < k; j++) { for (let i = 0; i < k; i++) nrm[j] += X[i][j] * X[i][j]; nrm[j] = Math.sqrt(nrm[j]); }
      const Tt = X.map(row => row.map((v, j) => v / (nrm[j] || 1e-12)));
      const Ti = S.inverse(Tt);
      if (!Ti) { al /= 2; continue; }
      const Lt = mul(A, tr(Ti));
      const rt = vgQoblimin(Lt, gamma);
      if (rt.f < f - 0.5 * s * s * al) {
        T = Tt; Tinv = Ti; L = Lt; f = rt.f; G = gradG(Lt, rt.Gq, Ti);
        moved = true; break;
      }
      al /= 2;
    }
    if (!moved) break;
  }
  return { L, T, f, iter, converged: conv, Phi: cov2cor(mul(tr(T), T)) };
}

/* ---------- promax (Hendrickson & White 1964) ---------- */
function promaxRot(A, m) {
  m = m || 4;
  const vari = gpaOrtho(A, 1);
  const X = vari.L;
  const Q = X.map(r => r.map(v => v * Math.pow(Math.abs(v), m - 1)));
  const XtX = mul(tr(X), X);
  const XtXi = S.inverse(XtX);
  if (!XtXi) return vari;
  let U = mul(mul(XtXi, tr(X)), Q);
  const UtUi = S.inverse(mul(tr(U), U));
  if (!UtUi) return vari;
  const d = UtUi.map((r, i) => r[i]);
  U = scaleCols(U, d.map(v => Math.sqrt(Math.abs(v))));
  const pattern = mul(X, U);
  const rotmat = mul(vari.T, U);
  const ui = S.inverse(rotmat);
  const Phi = ui ? cov2cor(mul(ui, tr(ui))) : S.identity(A[0].length);
  return { L: pattern, T: rotmat, Phi, f: null, converged: true, iter: vari.iter };
}

/* ---------- envoltura pública ---------- */
Rot.methods = {
  none:      { name: 'Sin rotar (solución original)', oblique: false },
  varimax:   { name: 'Varimax', oblique: false },
  quartimax: { name: 'Quartimax', oblique: false },
  equamax:   { name: 'Equamax', oblique: false },
  parsimax:  { name: 'Parsimax', oblique: false },
  quartimin: { name: 'Quartimin (oblicua)', oblique: true },
  oblimin:   { name: 'Oblimin directo (oblicua)', oblique: true },
  promax:    { name: 'Promax (oblicua)', oblique: true },
};

/* A: matriz de cargas p × k. opts: {normalize, delta, kappa} */
Rot.rotate = function (A, method, opts) {
  opts = opts || {};
  const p = A.length, k = A[0].length;
  if (method === 'none' || k < 2) {
    return { pattern: A.map(r => r.slice()), structure: A.map(r => r.slice()),
      Phi: S.identity(k), T: S.identity(k), oblique: false, converged: true, iter: 0 };
  }

  /* normalización de Kaiser: filas a longitud 1 antes de rotar */
  const h = A.map(r => Math.sqrt(r.reduce((s, v) => s + v * v, 0)) || 1e-12);
  const An = opts.normalize ? A.map((r, i) => r.map(v => v / h[i])) : A.map(r => r.slice());

  let res;
  switch (method) {
    case 'varimax':   res = gpaOrtho(An, 1); break;
    case 'quartimax': res = gpaOrtho(An, 0); break;
    case 'equamax':   res = gpaOrtho(An, k / 2); break;
    case 'parsimax':  res = gpaOrtho(An, p * (k - 1) / (p + k - 2)); break;
    case 'quartimin': res = gpaObliq(An, 0); break;
    case 'oblimin':   res = gpaObliq(An, opts.delta != null ? +opts.delta : 0); break;
    case 'promax':    res = promaxRot(An, opts.kappa != null ? +opts.kappa : 4); break;
    default:          res = gpaOrtho(An, 1);
  }

  /* deshacer la normalización */
  let pattern = opts.normalize ? res.L.map((r, i) => r.map(v => v * h[i])) : res.L;
  const oblique = !!Rot.methods[method].oblique;
  let Phi = res.Phi;

  /* signo convencional: que la suma de cargas de cada componente sea positiva */
  const k2 = pattern[0].length;
  const flip = new Array(k2).fill(1);
  for (let j = 0; j < k2; j++) {
    let s = 0;
    for (let i = 0; i < pattern.length; i++) s += pattern[i][j] * Math.abs(pattern[i][j]);
    if (s < 0) flip[j] = -1;
  }
  pattern = pattern.map(r => r.map((v, j) => v * flip[j]));
  Phi = Phi.map((r, i) => r.map((v, j) => v * flip[i] * flip[j]));

  /* ordenar los componentes por varianza explicada tras la rotación */
  const ss = Array.from({ length: k2 }, (_, j) =>
    pattern.reduce((s, r) => s + r[j] * r[j], 0));
  const order = ss.map((_, j) => j).sort((a, b) => ss[b] - ss[a]);
  pattern = pattern.map(r => order.map(j => r[j]));
  Phi = order.map(i => order.map(j => Phi[i][j]));

  /* la matriz de transformación recibe las mismas operaciones de columna, para
     que siga cumpliéndose  patrón = cargas · T  y las puntuaciones se puedan
     rotar con la misma T (válido en las rotaciones ortogonales). */
  const T = res.T.map(row => order.map(j => row[j] * flip[j]));

  /* matriz de estructura: correlaciones variable–componente */
  const structure = oblique ? mul(pattern, Phi) : pattern.map(r => r.slice());

  return {
    pattern, structure, Phi, T, oblique,
    converged: res.converged, iter: res.iter, criterion: res.f,
  };
};

/* ---------- métricas de estructura simple ---------- */
Rot.diagnostics = function (pattern, Phi, oblique, thr) {
  thr = thr || 0.4;
  const p = pattern.length, k = pattern[0].length;
  /* comunalidades */
  const comm = pattern.map((r, i) => {
    if (!oblique) return r.reduce((s, v) => s + v * v, 0);
    let s = 0;
    for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) s += r[a] * Phi[a][b] * r[b];
    return s;
  });
  /* complejidad de Hofmann */
  const complexity = pattern.map(r => {
    const s2 = r.reduce((s, v) => s + v * v, 0);
    const s4 = r.reduce((s, v) => s + Math.pow(v, 4), 0);
    return s4 > 0 ? (s2 * s2) / s4 : 0;
  });
  /* suma de cuadrados por componente */
  const ss = Array.from({ length: k }, (_, j) => pattern.reduce((s, r) => s + r[j] * r[j], 0));
  /* clasificación de cada variable */
  const clas = pattern.map(r => {
    const abs = r.map(Math.abs);
    const over = abs.filter(v => v >= thr).length;
    let bi = 0;
    for (let j = 1; j < k; j++) if (abs[j] > abs[bi]) bi = j;
    return { best: bi, over, type: over === 0 ? 'sin carga' : over === 1 ? 'limpia' : 'cruzada' };
  });
  return {
    comm, complexity, ss, clas,
    clean: clas.filter(c => c.type === 'limpia').length,
    cross: clas.filter(c => c.type === 'cruzada').length,
    none: clas.filter(c => c.type === 'sin carga').length,
    meanComplexity: S.mean(complexity),
  };
};

window.Rot = Rot;

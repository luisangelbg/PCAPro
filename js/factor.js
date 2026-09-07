/* PCAPro — coordenadas factoriales, calidades (cos²), contribuciones,
   elementos suplementarios y geometría de elipses. */

const Fac = {};

/* ============================================================
   Construcción del objeto factorial
   ============================================================ */
/* useRot: usar la solución rotada del Bloque 3 (si existe) */
Fac.build = function (useRot) {
  const P = state.pca, k = P.k, n = P.n, p = P.p;
  const R = state.rot;
  const rotated = !!(useRot && R && R.method !== 'none');

  /* --- coordenadas de las variables --- */
  let coordVar, labels, axisVar;
  if (rotated) {
    coordVar = R.oblique ? R.structure.map(r => r.slice()) : R.pattern.map(r => r.slice());
    labels = R.labels.slice();
    axisVar = R.diag.ss.slice();                    // "varianza" de cada eje rotado
  } else {
    coordVar = state.activeVars.map((_, j) => P.loadings[j].slice(0, k));
    labels = Array.from({ length: k }, (_, j) => cp(j + 1));
    axisVar = P.values.slice(0, k);
  }

  /* --- coordenadas de los individuos --- */
  let coordInd;                                     // [k][n]
  if (!rotated) {
    coordInd = P.scores.slice(0, k).map(c => c.slice());
  } else if (!R.oblique) {
    /* rotación ortogonal: F_rot = F · T, exacta y conserva la suma de cuadrados */
    coordInd = Array.from({ length: k }, (_, j) =>
      Array.from({ length: n }, (_, i) => {
        let s = 0;
        for (let a = 0; a < k; a++) s += P.scores[a][i] * R.T[a][j];
        return s;
      }));
  } else {
    /* rotación oblicua: puntuaciones por regresión de Thurstone, reescaladas
       para que su dispersión sea comparable a la de los ejes originales */
    const Z = state.X.map(c => { const m = S.mean(c), sd = S.sd(c) || 1; return c.map(v => (v - m) / sd); });
    const Rinv = S.inverse(S.corrMatrix(Z));
    const B = Rinv ? S.matMul(Rinv, R.structure) : null;
    coordInd = Array.from({ length: k }, (_, j) => {
      const col = Array.from({ length: n }, (_, i) => {
        if (!B) return 0;
        let s = 0;
        for (let v = 0; v < Z.length; v++) s += Z[v][i] * B[v][j];
        return s;
      });
      const sd = S.sd(col) || 1;
      const target = Math.sqrt(axisVar[j]);
      return col.map(v => v / sd * target);
    });
  }

  /* --- distancia al centroide en el espacio completo (invariante a rotación) --- */
  const dist2 = Array.from({ length: n }, (_, i) =>
    P.scores.reduce((s, c) => s + c[i] * c[i], 0));

  /* --- cos² y contribuciones de los individuos --- */
  const cos2Ind = coordInd.map(c => c.map((v, i) => dist2[i] > 0 ? v * v / dist2[i] : 0));
  const contribInd = coordInd.map(c => {
    const ss = c.reduce((s, v) => s + v * v, 0) || 1;
    return c.map(v => v * v / ss * 100);
  });

  /* --- cos² y contribuciones de las variables --- */
  const commTotal = state.activeVars.map((_, j) => {
    let s = 0;
    for (let d = 0; d < p; d++) s += P.loadings[j][d] * P.loadings[j][d];
    return s;                                       // ≈ 1 con ACP sobre correlaciones
  });
  const cos2Var = coordVar.map(r => r.map(v => v * v));
  const contribVar = state.activeVars.map((_, j) =>
    Array.from({ length: k }, (_, d) => cos2Var[j][d] / (axisVar[d] || 1) * 100));

  /* --- variables cuantitativas suplementarias: correlación con cada eje --- */
  const suppQuant = state.suppNum.map(sv => {
    const coord = Array.from({ length: k }, (_, d) => {
      const pairs = [];
      sv.values.forEach((v, i) => { if (v != null && isFinite(v)) pairs.push([v, coordInd[d][i]]); });
      if (pairs.length < 3) return 0;
      const r = S.pearson(pairs.map(q => q[0]), pairs.map(q => q[1]));
      return isFinite(r) ? r : 0;
    });
    return { name: sv.name, coord, cos2: coord.map(v => v * v), nValid: sv.values.filter(v => v != null && isFinite(v)).length };
  });

  /* --- categorías suplementarias: centroide de cada nivel --- */
  const suppCat = state.suppCat.map(sc => ({
    name: sc.name,
    levels: sc.levels.map(lv => {
      const idx = [];
      sc.values.forEach((v, i) => { if (v === lv) idx.push(i); });
      return {
        level: lv, n: idx.length, idx,
        coord: Array.from({ length: k }, (_, d) => S.mean(idx.map(i => coordInd[d][i]))),
      };
    }),
  }));

  const totalVar = P.total;
  return {
    rotated, k, n, p, labels, coordVar, coordInd, cos2Ind, contribInd,
    cos2Var, contribVar, commTotal, axisVar, totalVar,
    pct: axisVar.map(v => v / totalVar),
    suppQuant, suppCat, dist2,
    isCorr: P.isCorr,
    oblique: rotated && R.oblique,
  };
};

/* ============================================================
   Elipses y envolventes
   ============================================================ */
/* Elipse de una nube de puntos en el plano.
   type: 'conc' (concentración de los datos) | 'mean' (confianza de la media) */
Fac.ellipse = function (xs, ys, level, type, segments) {
  const n = xs.length;
  if (n < 3) return null;
  const mx = S.mean(xs), my = S.mean(ys);
  let sxx = 0, syy = 0, sxy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx, dy = ys[i] - my;
    sxx += dx * dx; syy += dy * dy; sxy += dx * dy;
  }
  sxx /= (n - 1); syy /= (n - 1); sxy /= (n - 1);
  const e = S.eigenSym([[sxx, sxy], [sxy, syy]]);
  const l1 = Math.max(e.values[0], 0), l2 = Math.max(e.values[1], 0);
  const v1 = [e.vectors[0][0], e.vectors[1][0]];
  const v2 = [e.vectors[0][1], e.vectors[1][1]];
  let c = S.chi2Inv(level, 2);                      // radio² para el nivel pedido
  if (type === 'mean') c /= n;                      // elipse de confianza del centroide
  const r1 = Math.sqrt(l1 * c), r2 = Math.sqrt(l2 * c);
  const seg = segments || 72;
  const pts = [];
  for (let i = 0; i <= seg; i++) {
    const th = 2 * Math.PI * i / seg;
    pts.push([
      mx + r1 * Math.cos(th) * v1[0] + r2 * Math.sin(th) * v2[0],
      my + r1 * Math.cos(th) * v1[1] + r2 * Math.sin(th) * v2[1],
    ]);
  }
  return { pts, cx: mx, cy: my, r1, r2 };
};

/* Envolvente convexa (marcha de Andrew) */
Fac.hull = function (xs, ys) {
  const pts = xs.map((x, i) => [x, ys[i]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length < 3) return pts;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const q of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const q = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
    upper.push(q);
  }
  lower.pop(); upper.pop();
  return lower.concat(upper);
};

window.Fac = Fac;

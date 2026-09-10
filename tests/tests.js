/* PCAPro — automated test suite.
   Runs entirely in the browser, with no build step and no test framework.
   Every numerical expectation is a published reference value or an algebraic
   invariant, not a value recorded from a previous run of PCAPro itself. */

(function () {

const suites = [];
function suite(name, fn) { suites.push({ name, fn, tests: [] }); }
let current = null;

function test(name, fn) { current.tests.push({ name, fn }); }
function ok(cond, msg) { if (!cond) throw new Error(msg || 'expected true'); }
function near(actual, expected, tol, msg) {
  if (!isFinite(actual)) throw new Error(`${msg || ''}: got ${actual}`);
  const d = Math.abs(actual - expected);
  if (d > tol) throw new Error(`${msg || ''}: expected ${expected}, got ${actual} (|diff| = ${d.toExponential(2)} > ${tol})`);
}
function eq(actual, expected, msg) {
  if (actual !== expected) throw new Error(`${msg || ''}: expected ${expected}, got ${actual}`);
}

/* ---------- shared fixtures ---------- */
let IRIS = null;                       // 4 numeric columns, n = 150
async function loadIris() {
  if (IRIS) return IRIS;
  const txt = await fetch('../datos/iris.csv').then(r => r.text());
  const rows = PCAProData.parseCSV(txt);
  rows.shift();
  IRIS = [0, 1, 2, 3].map(j => rows.map(r => parseFloat(r[j])));
  return IRIS;
}
const zscore = cols => cols.map(c => S.scaleColumn(c, 'z').v);
const centre = cols => cols.map(c => { const m = S.mean(c); return c.map(v => v - m); });

/* =====================================================================
   1 · Descriptive statistics
   ===================================================================== */
suite('Descriptive statistics', () => {
  test('mean, sample variance and sd of a known vector', () => {
    const v = [2, 4, 4, 4, 5, 5, 7, 9];
    near(S.mean(v), 5, 1e-12, 'mean');
    near(S.variance(v), 32 / 7, 1e-12, 'sample variance');   // sum of squares = 32, n-1 = 7
    near(S.sd(v), Math.sqrt(32 / 7), 1e-12, 'sd');
  });

  test('median and quartiles', () => {
    near(S.median([1, 2, 3, 4]), 2.5, 1e-12, 'median (even n)');
    near(S.median([1, 2, 3]), 2, 1e-12, 'median (odd n)');
    near(S.quantile([1, 2, 3, 4, 5], 0.25), 2, 1e-12, 'Q1');
  });

  test('skewness and excess kurtosis are zero for a symmetric vector', () => {
    const v = [-3, -2, -1, 0, 1, 2, 3];
    near(S.skewness(v), 0, 1e-12, 'g1 of a symmetric vector');
  });

  test('Pearson correlation equals 1 for an exact linear relation', () => {
    const x = [1, 2, 3, 4, 5];
    near(S.pearson(x, x.map(v => 3 * v + 7)), 1, 1e-12, 'r of y = 3x + 7');
    near(S.pearson(x, x.map(v => -2 * v)), -1, 1e-12, 'r of y = -2x');
  });

  test('Spearman correlation is 1 for any monotone relation', () => {
    const x = [1, 2, 3, 4, 5];
    near(S.spearman(x, x.map(v => Math.exp(v))), 1, 1e-12, 'rho of a monotone transform');
  });
});

/* =====================================================================
   2 · Linear algebra
   ===================================================================== */
suite('Linear algebra', () => {
  test('matrix inverse reproduces the identity', () => {
    const M = [[4, 7, 2], [3, 6, 1], [2, 5, 3]];
    const I = S.matMul(M, S.inverse(M));
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
      near(I[i][j], i === j ? 1 : 0, 1e-10, `(${i},${j}) of M·M⁻¹`);
  });

  test('determinant of a known matrix', () => {
    near(S.determinant([[1, 2], [3, 4]]), -2, 1e-12, 'det [[1,2],[3,4]]');
    near(S.determinant([[6, 1, 1], [4, -2, 5], [2, 8, 7]]), -306, 1e-9, 'det 3x3');
  });

  test('a singular matrix has determinant zero and no inverse', () => {
    const M = [[1, 2], [2, 4]];
    near(S.determinant(M), 0, 1e-12, 'det of a singular matrix');
    eq(S.inverse(M), null, 'inverse of a singular matrix');
  });

  test('Jacobi eigendecomposition of a matrix with known eigenvalues', () => {
    /* [[2,1],[1,2]] has eigenvalues 3 and 1 */
    const e = S.eigenSym([[2, 1], [1, 2]]);
    near(e.values[0], 3, 1e-10, 'largest eigenvalue');
    near(e.values[1], 1, 1e-10, 'smallest eigenvalue');
  });

  test('eigenvalues sum to the trace and eigenvectors are orthonormal', () => {
    const M = [[4, 1, 0.5], [1, 3, 0.2], [0.5, 0.2, 2]];
    const e = S.eigenSym(M);
    near(e.values.reduce((a, b) => a + b, 0), 9, 1e-9, 'sum of eigenvalues = trace');
    const V = e.vectors, VtV = S.matMul(S.transpose(V), V);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
      near(VtV[i][j], i === j ? 1 : 0, 1e-9, `(${i},${j}) of VᵀV`);
  });
});

/* =====================================================================
   3 · Probability distributions
   Reference values computed with R.
   ===================================================================== */
suite('Probability distributions', () => {
  test('chi-square upper tail — R: pchisq(3.8415, 1, lower.tail = FALSE)', () => {
    near(S.chi2P(3.8415, 1), 0.05, 1e-4, 'chi2 p at the 95th percentile with 1 df');
  });

  test("Student's t two-sided — R: 2 * pt(-3, 10)", () => {
    near(S.tP(3, 10), 0.0133427, 1e-6, 't(3, 10)');
    near(S.tP(2.086, 20), 0.05, 5e-4, 't at the 95th percentile with 20 df');
  });

  test('F upper tail — R: pf(4.351, 2, 20, lower.tail = FALSE)', () => {
    near(S.fP(4.351, 2, 20), 0.02699, 1e-5, 'F(4.351; 2, 20)');
    near(S.fP(3.2389, 3, 16), 0.05, 1e-4, 'F at the 95th percentile');
    near(S.fP(1, 10, 10), 0.5, 1e-9, 'F(1; 10, 10) is exactly one half');
  });

  test('standard normal two-sided', () => {
    near(S.normalP2(1.959964), 0.05, 1e-5, 'z at the 95th percentile');
  });

  test('correlation test — R: cor.test with r = 0.5, n = 30', () => {
    near(S.corP(0.5, 30), 0.004894, 1e-5, 'p of r = 0.5 with n = 30');
  });

  test('chi-square quantile inverts its own CDF', () => {
    [0.90, 0.95, 0.99, 0.999].forEach(p => {
      [1, 4, 9, 20].forEach(df => {
        near(S.chi2CDF(S.chi2Inv(p, df), df), p, 1e-6, `chi2Inv(${p}, ${df})`);
      });
    });
  });
});

/* =====================================================================
   4 · Sampling adequacy
   Reference values: R, psych::KMO(iris[,1:4]) and
   psych::cortest.bartlett(cor(iris[,1:4]), n = 150)
   ===================================================================== */
suite('Sampling adequacy (iris)', () => {
  test('KMO overall and per variable match psych::KMO', async () => {
    const R = S.corrMatrix(zscore(await loadIris()));
    const k = S.kmo(R);
    near(k.overall, 0.540, 1e-3, 'overall KMO');
    const expected = [0.584, 0.270, 0.531, 0.634];   // Sepal.L, Sepal.W, Petal.L, Petal.W
    expected.forEach((v, i) => near(k.msa[i], v, 1.5e-3, `MSA of variable ${i + 1}`));
  });

  test("Bartlett's test of sphericity matches cortest.bartlett", async () => {
    const R = S.corrMatrix(zscore(await loadIris()));
    const b = S.bartlett(R, 150);
    near(b.chi2, 706.9593, 1e-3, 'chi-square');
    eq(b.df, 6, 'degrees of freedom');
    near(b.det, 0.0081096, 1e-6, 'determinant of R');
    ok(b.p < 1e-100, 'p value is effectively zero');
  });

  test('Mahalanobis distances average to the number of variables', async () => {
    /* E[D²] = p for any data set, an exact algebraic identity */
    const X = await loadIris();
    const d2 = S.mahalanobis(X);
    near(S.mean(d2) * (150 / 149), 4, 1e-6, 'mean D² corrected for the divisor');
  });
});

/* =====================================================================
   5 · Principal component extraction
   Reference: R, prcomp(iris[,1:4], scale. = TRUE) and
   psych::principal(iris[,1:4], nfactors = 1)
   ===================================================================== */
suite('Extraction (iris)', () => {
  test('eigenvalues match prcomp', async () => {
    const Z = zscore(await loadIris());
    const e = S.eigenSym(S.covMatrix(centre(Z)));
    const expected = [2.918498, 0.914030, 0.146757, 0.020715];
    expected.forEach((v, i) => near(e.values[i], v, 1e-5, `eigenvalue ${i + 1}`));
  });

  test('eigenvalues sum to p on a correlation matrix', async () => {
    const Z = zscore(await loadIris());
    const e = S.eigenSym(S.covMatrix(centre(Z)));
    near(e.values.reduce((a, b) => a + b, 0), 4, 1e-9, 'trace of a 4x4 correlation matrix');
  });

  test('loadings on the first component match psych::principal', async () => {
    const Z = zscore(await loadIris());
    const Xc = centre(Z);
    const e = S.eigenSym(S.covMatrix(Xc));
    const sd = Xc.map(c => S.sd(c));
    const load = Xc.map((_, j) => e.vectors[j][0] * Math.sqrt(e.values[0]) / sd[j]);
    const expected = [0.8902, -0.4601, 0.9916, 0.9650];
    expected.forEach((v, i) => near(load[i], v, 1e-3, `loading of variable ${i + 1}`));
  });

  test('component scores match prcomp for the first observations', async () => {
    const Z = zscore(await loadIris());
    const Xc = centre(Z);
    const e = S.eigenSym(S.covMatrix(Xc));
    const score = i => Xc.reduce((s, c, j) => s + c[i] * e.vectors[j][0], 0);
    const expected = [-2.25714, -2.07401, -2.35633];
    expected.forEach((v, i) => near(score(i), v, 1e-4, `score of observation ${i + 1}`));
  });

  test('communalities over all components equal one', async () => {
    const Z = zscore(await loadIris());
    const Xc = centre(Z);
    const e = S.eigenSym(S.covMatrix(Xc));
    const sd = Xc.map(c => S.sd(c));
    for (let j = 0; j < 4; j++) {
      let h = 0;
      for (let k = 0; k < 4; k++) h += Math.pow(e.vectors[j][k] * Math.sqrt(e.values[k]) / sd[j], 2);
      near(h, 1, 1e-9, `communality of variable ${j + 1}`);
    }
  });

  test('broken stick matches its analytic expression', () => {
    /* b_k = (total/p) * sum_{i=k..p} 1/i */
    const b = PCAProPCA.brokenStick(4, 4);
    near(b[0], 1 + 0.5 + 1 / 3 + 0.25, 1e-12, 'b1');
    near(b[1], 0.5 + 1 / 3 + 0.25, 1e-12, 'b2');
    near(b[3], 0.25, 1e-12, 'b4');
    near(b.reduce((a, c) => a + c, 0), 4, 1e-12, 'the broken stick sums to the total');
  });

  test("Velicer's MAP returns a minimum inside the valid range", async () => {
    const R = S.corrMatrix(zscore(await loadIris()));
    const map = PCAProPCA.velicerMAP(R);
    ok(map.k >= 0 && map.k < 4, 'the retained number is within range');
    ok(map.series.length > 1, 'the series has more than one term');
    /* At m = p - 1 the residual matrix has rank one, so every partial correlation
       is exactly ±1 and the mean reaches 1 up to rounding. */
    ok(map.series.every(o => o.f >= 0 && o.f <= 1 + 1e-9),
      'every mean squared partial correlation is a proportion');
    near(map.series[map.series.length - 1].f, 1, 1e-9,
      'the last term is one, as the rank-one residual implies');
  });
});

/* =====================================================================
   6 · Rotation
   ===================================================================== */
suite('Rotation', () => {
  /* a perfect simple structure, rotated 30 degrees on purpose */
  const A0 = [[0.9, 0], [0.85, 0], [0.8, 0], [0, 0.9], [0, 0.85], [0, 0.8]];
  const th = Math.PI / 6, c = Math.cos(th), s = Math.sin(th);
  const A = A0.map(r => [r[0] * c + r[1] * s, -r[0] * s + r[1] * c]);

  test('varimax recovers a known simple structure that was rotated away', () => {
    const r = Rot.rotate(A, 'varimax', { normalize: true });
    ok(r.converged, 'the algorithm converged');
    for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++)
      near(Math.abs(r.pattern[i][j]), Math.abs(A0[i][j]), 1e-6,
        `recovered loading (${i},${j})`);
  });

  test('orthogonal rotation preserves communalities', () => {
    ['varimax', 'quartimax', 'equamax', 'parsimax'].forEach(m => {
      const r = Rot.rotate(A, m, { normalize: true });
      A.forEach((row, i) => {
        const before = row[0] ** 2 + row[1] ** 2;
        const after = r.pattern[i][0] ** 2 + r.pattern[i][1] ** 2;
        near(after, before, 1e-8, `${m}: communality of variable ${i + 1}`);
      });
    });
  });

  test('the orthogonal transformation matrix is orthonormal', () => {
    ['varimax', 'quartimax', 'equamax', 'parsimax'].forEach(m => {
      const r = Rot.rotate(A, m, { normalize: false });
      const TtT = S.matMul(S.transpose(r.T), r.T);
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++)
        near(TtT[i][j], i === j ? 1 : 0, 1e-8, `${m}: (${i},${j}) of TᵀT`);
    });
  });

  test('pattern equals loadings times T for orthogonal rotations', () => {
    const r = Rot.rotate(A, 'varimax', { normalize: true });
    const AT = S.matMul(A, r.T);
    for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++)
      near(r.pattern[i][j], AT[i][j], 1e-8, `(${i},${j}) of A·T`);
  });

  test('varimax reaches the global maximum of its own criterion', () => {
    const crit = L => {
      const p = L.length, L2 = L.map(r => r.map(v => v * v));
      const cm = [0, 1].map(j => L2.reduce((s, r) => s + r[j], 0) / p);
      return [0, 1].reduce((s, j) => s + L2.reduce((a, r) => a + (r[j] - cm[j]) ** 2, 0), 0);
    };
    const mine = crit(Rot.rotate(A, 'varimax', { normalize: false }).pattern);
    let best = -Infinity;
    for (let i = 0; i <= 3600; i++) {                 // exhaustive sweep, 0.05 degree steps
      const t = Math.PI * i / 3600, ct = Math.cos(t), st = Math.sin(t);
      best = Math.max(best, crit(A.map(r => [r[0] * ct + r[1] * st, -r[0] * st + r[1] * ct])));
    }
    ok(mine >= best - 1e-9, `varimax criterion ${mine} should be at least the sweep maximum ${best}`);
  });

  test('oblique rotations return a valid factor correlation matrix', () => {
    ['quartimin', 'oblimin', 'promax'].forEach(m => {
      const r = Rot.rotate(A, m, { normalize: true, delta: 0, kappa: 4 });
      ok(r.oblique, `${m} is flagged as oblique`);
      near(r.Phi[0][0], 1, 1e-9, `${m}: Phi(1,1)`);
      near(r.Phi[1][1], 1, 1e-9, `${m}: Phi(2,2)`);
      near(r.Phi[0][1], r.Phi[1][0], 1e-12, `${m}: Phi is symmetric`);
      ok(Math.abs(r.Phi[0][1]) < 1, `${m}: off-diagonal is a correlation`);
    });
  });

  test('structure equals pattern times Phi', () => {
    ['quartimin', 'oblimin', 'promax'].forEach(m => {
      const r = Rot.rotate(A, m, { normalize: true });
      const PP = S.matMul(r.pattern, r.Phi);
      for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++)
        near(r.structure[i][j], PP[i][j], 1e-9, `${m}: (${i},${j}) of P·Phi`);
    });
  });

  test('oblique rotation preserves communalities under the Phi metric', () => {
    ['quartimin', 'oblimin', 'promax'].forEach(m => {
      const r = Rot.rotate(A, m, { normalize: true });
      A.forEach((row, i) => {
        const before = row[0] ** 2 + row[1] ** 2;
        let after = 0;
        for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++)
          after += r.pattern[i][a] * r.Phi[a][b] * r.pattern[i][b];
        near(after, before, 1e-6, `${m}: communality of variable ${i + 1}`);
      });
    });
  });

  test('quartimin and oblimin with delta = 0 are the same method', () => {
    const q = Rot.rotate(A, 'quartimin', { normalize: true });
    const o = Rot.rotate(A, 'oblimin', { normalize: true, delta: 0 });
    near(o.Phi[0][1], q.Phi[0][1], 1e-6, 'factor correlation');
  });

  test('Hofmann complexity is 1 for a perfectly simple variable', () => {
    const d = Rot.diagnostics([[0.9, 0], [0, 0.8], [0.6, 0.6]], S.identity(2), false, 0.4);
    near(d.complexity[0], 1, 1e-9, 'complexity of a single-loading variable');
    near(d.complexity[2], 2, 1e-9, 'complexity of an equally split variable');
  });
});

/* =====================================================================
   7 · Factor coordinates and quality
   ===================================================================== */
suite('Coordinates and quality', () => {
  test('cos² of a variable over all axes sums to its communality', async () => {
    const Z = zscore(await loadIris());
    const Xc = centre(Z);
    const e = S.eigenSym(S.covMatrix(Xc));
    const sd = Xc.map(c => S.sd(c));
    for (let j = 0; j < 4; j++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += Math.pow(e.vectors[j][k] * Math.sqrt(e.values[k]) / sd[j], 2);
      near(s, 1, 1e-9, `cos² sum for variable ${j + 1}`);
    }
  });

  test('contributions to an axis sum to 100 per cent', async () => {
    const Z = zscore(await loadIris());
    const Xc = centre(Z);
    const e = S.eigenSym(S.covMatrix(Xc));
    for (let k = 0; k < 4; k++) {
      const scores = Xc[0].map((_, i) => Xc.reduce((s, c, j) => s + c[i] * e.vectors[j][k], 0));
      const ss = scores.reduce((s, v) => s + v * v, 0);
      const contrib = scores.map(v => v * v / ss * 100);
      near(contrib.reduce((a, b) => a + b, 0), 100, 1e-9, `contributions to axis ${k + 1}`);
    }
  });

  test('the concentration ellipse is centred on the group mean', () => {
    const xs = [1, 2, 3, 4, 5, 3, 2, 4], ys = [2, 1, 4, 3, 5, 3, 2, 4];
    const e = Fac.ellipse(xs, ys, 0.95, 'conc');
    near(e.cx, S.mean(xs), 1e-12, 'centre x');
    near(e.cy, S.mean(ys), 1e-12, 'centre y');
    ok(e.pts.length > 50, 'the outline is discretised');
  });

  test('the confidence ellipse of the mean is sqrt(n) times smaller', () => {
    const n = 25;
    const xs = Array.from({ length: n }, (_, i) => Math.cos(i));
    const ys = Array.from({ length: n }, (_, i) => Math.sin(i * 1.7));
    const conc = Fac.ellipse(xs, ys, 0.95, 'conc');
    const mean = Fac.ellipse(xs, ys, 0.95, 'mean');
    near(conc.r1 / mean.r1, Math.sqrt(n), 1e-9, 'ratio of the major semi-axes');
  });

  test('the convex hull of a square is the square itself', () => {
    const xs = [0, 1, 1, 0, 0.5], ys = [0, 0, 1, 1, 0.5];   // the fifth point is interior
    eq(Fac.hull(xs, ys).length, 4, 'vertices of the hull');
  });
});

/* =====================================================================
   8 · Group comparison
   ===================================================================== */
suite('Group comparison', () => {
  test('one-way ANOVA on a textbook example', () => {
    /* three groups, hand-computable: SSB = 14, SSW = 6, df 2 and 6 */
    const g = [[1, 2, 3], [3, 4, 5], [5, 6, 7]];
    const a = S.anova(g);
    eq(a.df1, 2, 'numerator df');
    eq(a.df2, 6, 'denominator df');
    near(a.ssb, 24, 1e-9, 'between-group sum of squares');
    near(a.ssw, 6, 1e-9, 'within-group sum of squares');
    near(a.F, (24 / 2) / (6 / 6), 1e-9, 'F statistic');
    near(a.eta2, 24 / 30, 1e-9, 'eta squared');
  });

  test('identical groups give F = 0 and p = 1', () => {
    const a = S.anova([[1, 2, 3], [1, 2, 3], [1, 2, 3]]);
    near(a.F, 0, 1e-12, 'F');
    near(a.p, 1, 1e-9, 'p value');
    near(a.eta2, 0, 1e-12, 'eta squared');
  });

  test('Kruskal–Wallis on separated groups is significant', () => {
    const k = S.kruskal([[1, 2, 3], [10, 11, 12], [20, 21, 22]]);
    eq(k.df, 2, 'degrees of freedom');
    ok(k.p < 0.05, `p should be below 0.05, got ${k.p}`);
  });
});

/* =====================================================================
   9 · Input parsing
   ===================================================================== */
/* =====================================================================
   Correspondence analysis (CA)
   Reference: Greenacre's smoke data (1984), the canonical CA example.
   The published principal inertias are 0.074759, 0.010017 and 0.000414,
   on a total inertia of 0.085190 with chi-square 16.4417 over n = 193.
   ===================================================================== */
const SMOKE = [[4, 2, 3, 2], [4, 3, 7, 4], [25, 10, 12, 4], [18, 24, 33, 13], [10, 6, 7, 2]];
const SMOKE_R = ['SM', 'JM', 'SE', 'JE', 'SC'];
const SMOKE_C = ['none', 'light', 'medium', 'heavy'];

suite('Correspondence analysis (smoke)', () => {
  test('principal inertias match Greenacre', () => {
    const r = CA.simple(SMOKE, SMOKE_R, SMOKE_C);
    [0.074759, 0.010017, 0.000414].forEach((v, i) =>
      near(r.values[i], v, 1e-6, `eigenvalue ${i + 1}`));
  });

  test('chi-square and total inertia agree with the table', () => {
    const r = CA.simple(SMOKE, SMOKE_R, SMOKE_C);
    near(r.chi2.chi2, 16.4417, 1e-3, 'chi-square');
    eq(r.chi2.n, 193, 'grand total');
    near(r.chi2.inerciaTotal, 16.4417 / 193, 1e-6, 'total inertia = chi2/n');
  });

  test('eigenvalues sum to the total inertia', () => {
    const r = CA.simple(SMOKE, SMOKE_R, SMOKE_C);
    const s = r.values.reduce((a, b) => a + b, 0);
    near(s, r.chi2.inerciaTotal, 1e-12, 'sum of eigenvalues');
  });

  test('number of axes is min(rows, cols) - 1', () => {
    const r = CA.simple(SMOKE, SMOKE_R, SMOKE_C);
    eq(r.k, Math.min(SMOKE.length, SMOKE[0].length) - 1, 'axes');
  });

  test('row coordinates have zero weighted mean on every axis', () => {
    const r = CA.simple(SMOKE, SMOKE_R, SMOKE_C);
    for (let k = 0; k < r.k; k++) {
      const m = r.rowCoord.reduce((a, f, i) => a + r.rowW[i] * f[k], 0);
      near(m, 0, 1e-12, `weighted mean of axis ${k + 1}`);
    }
  });

  test('cell contributions to chi-square sum to 100', () => {
    const r = CA.simple(SMOKE, SMOKE_R, SMOKE_C);
    const s = r.celdas.reduce((a, row) => a + row.reduce((x, c) => x + c.contrib, 0), 0);
    near(s, 100, 1e-9, 'sum of cell contributions');
  });
});

/* =====================================================================
   Multiple correspondence analysis (MCA)
   No recorded constants: MCA on the indicator matrix of two variables is
   related to the CA of their cross-table by an exact identity. For a
   J1 x J2 table, 2*(min(J1,J2) - 1) of the MCA eigenvalues are
   (1 +/- sqrt(lambda))/2 for each CA eigenvalue lambda, and the remaining
   ones are exactly 0.5.
   ===================================================================== */
function smokeLong() {
  const a = [], b = [];
  SMOKE.forEach((row, i) => row.forEach((v, j) => {
    for (let t = 0; t < v; t++) { a.push(SMOKE_R[i]); b.push(SMOKE_C[j]); }
  }));
  return [a, b];
}

suite('Multiple correspondence analysis', () => {
  test('eigenvalues match the exact two-variable identity', () => {
    const cols = smokeLong();
    const ca = CA.simple(SMOKE, SMOKE_R, SMOKE_C);
    const mca = CA.multiple(cols, ['staff', 'smoking']);
    const J = SMOKE_R.length + SMOKE_C.length, Q = 2;
    const esp = [];
    ca.values.forEach(l => { const s = Math.sqrt(l); esp.push((1 + s) / 2, (1 - s) / 2); });
    while (esp.length < J - Q) esp.push(0.5);
    esp.sort((x, y) => y - x);
    const obs = mca.values.slice().sort((x, y) => y - x);
    eq(obs.length, esp.length, 'number of axes');
    obs.forEach((v, i) => near(v, esp[i], 1e-10, `MCA eigenvalue ${i + 1}`));
  });

  test('raw inertia is J/Q - 1 and axes are J - Q', () => {
    const mca = CA.multiple(smokeLong(), ['staff', 'smoking']);
    const J = mca.cols.length, Q = mca.nVar;
    near(mca.values.reduce((a, b) => a + b, 0), J / Q - 1, 1e-10, 'raw inertia');
    eq(mca.k, J - Q, 'number of axes');
  });

  test('no eigenvalue exceeds one', () => {
    const mca = CA.multiple(smokeLong(), ['staff', 'smoking']);
    ok(mca.values.every(v => v <= 1 + 1e-12), 'eigenvalue above 1');
  });

  test("Benzecri adjustment recovers the CA percentages for two variables", () => {
    const ca = CA.simple(SMOKE, SMOKE_R, SMOKE_C);
    const mca = CA.multiple(smokeLong(), ['staff', 'smoking']);
    ca.pct.forEach((v, i) => near(mca.ajuste.pctBenzecri[i], v, 1e-9, `adjusted percentage ${i + 1}`));
  });

  test("Cramer's V is symmetric and inside [0, 1]", () => {
    const mca = CA.multiple(smokeLong(), ['staff', 'smoking']);
    near(mca.cramer[0][1], mca.cramer[1][0], 1e-12, 'symmetry');
    ok(mca.cramer[0][1] >= 0 && mca.cramer[0][1] <= 1, 'out of range');
  });
});

/* =====================================================================
   Shared generalized-SVD core
   ===================================================================== */
suite('Generalized SVD core', () => {
  test('reproduces a PCA on correlations when weights are uniform', () => {
    /* With row weights 1/n and unit column weights on standardized data, the
       core must return the eigenvalues of the correlation matrix. */
    const X = [[1, 2, 3], [4, 1, 5], [2, 7, 2], [5, 3, 8], [3, 5, 4], [7, 2, 6]];
    const n = X.length, p = X[0].length;
    const Z = [];
    for (let i = 0; i < n; i++) Z.push(new Array(p));
    for (let j = 0; j < p; j++) {
      const col = X.map(r => r[j]);
      const m = S.mean(col), s = S.sd(col);
      for (let i = 0; i < n; i++) Z[i][j] = (X[i][j] - m) / s;
    }
    const res = GSV.core(Z, new Array(n).fill(1 / n), new Array(p).fill(1), { method: 'pca' });
    const eig = S.eigenSym(S.corrMatrix(S.transpose(X)));
    /* el nucleo usa el divisor n; la matriz de correlaciones usa n-1 */
    res.values.forEach((v, k) => near(v * n / (n - 1), eig.values[k], 1e-9, `eigenvalue ${k + 1}`));
  });

  test('the SVD reconstructs its own matrix', () => {
    const Z = [[1, 2, 0], [-1, 3, 2], [0.5, -2, 1], [2, 1, -1]];
    const { d, U, V } = GSV.svd(Z);
    for (let i = 0; i < Z.length; i++) for (let j = 0; j < Z[0].length; j++) {
      let s = 0;
      for (let k = 0; k < d.length; k++) s += U[k][i] * d[k] * V[k][j];
      near(s, Z[i][j], 1e-9, `cell ${i},${j}`);
    }
  });

  test('singular vectors are orthonormal', () => {
    const Z = [[1, 2, 0], [-1, 3, 2], [0.5, -2, 1], [2, 1, -1]];
    const { d, V } = GSV.svd(Z);
    for (let a = 0; a < d.length; a++) for (let b = 0; b < d.length; b++) {
      const dot = V[a].reduce((s, v, j) => s + v * V[b][j], 0);
      near(dot, a === b ? 1 : 0, 1e-9, `V${a} . V${b}`);
    }
  });
});

/* =====================================================================
   FAMD and MFA
   No recorded constants here either: both methods satisfy exact
   identities that hold for any data set, so the suite checks those
   instead of numbers copied from another implementation.
   ===================================================================== */
function demoMixed(seed) {
  let s = seed >>> 0;
  const r = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const nz = () => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
  const n = 60, g = [], c2 = [], q = [[], [], [], []];
  for (let i = 0; i < n; i++) {
    const k = i % 3;
    g.push(['A', 'B', 'C'][k]);
    c2.push(r() < 0.5 ? 'x' : 'y');
    const b = nz() + k * 1.4;
    q[0].push(b + 0.3 * nz()); q[1].push(b * 0.8 + 0.6 * nz());
    q[2].push(nz()); q[3].push(-b * 0.5 + 0.9 * nz());
  }
  return { n, q, g, c2 };
}

suite('Factor analysis of mixed data', () => {
  test('with only quantitative variables it is a PCA on correlations', () => {
    const { q } = demoMixed(12345);
    const f = FAMD.run(q, [], ['a', 'b', 'c', 'd'], []);
    const eig = S.eigenSym(S.corrMatrix(q));
    f.values.forEach((v, k) => near(v, eig.values[k], 1e-9, `eigenvalue ${k + 1}`));
  });

  test('with only qualitative variables it is an MCA scaled by Q', () => {
    const { g, c2 } = demoMixed(12345);
    const f = FAMD.run([], [g, c2], [], ['g', 's']);
    const m = CA.multiple([g, c2], ['g', 's']);
    const a = f.values.slice().sort((x, y) => y - x);
    const b = m.values.slice().sort((x, y) => y - x);
    eq(a.length, b.length, 'number of axes');
    a.forEach((v, k) => near(v, 2 * b[k], 1e-9, `eigenvalue ${k + 1}`));
  });

  test('total inertia is p_quant + (J - Q)', () => {
    const { q, g, c2 } = demoMixed(12345);
    const f = FAMD.run(q, [g, c2], ['a', 'b', 'c', 'd'], ['g', 's']);
    const s = f.values.reduce((a, b) => a + b, 0);
    near(s, f.inerciaEsperada, 1e-9, 'total inertia');
    eq(f.inerciaEsperada, 7, 'expected inertia for this data set');
  });

  test('correlations and squared correlation ratios stay in range', () => {
    const { q, g, c2 } = demoMixed(12345);
    const f = FAMD.run(q, [g, c2], ['a', 'b', 'c', 'd'], ['g', 's']);
    ok(f.corQuant.every(row => row.every(v => Math.abs(v) <= 1 + 1e-9)), 'correlation out of [-1,1]');
    ok(f.eta2.every(row => row.every(v => v >= -1e-12 && v <= 1 + 1e-12)), 'eta squared out of [0,1]');
  });

  test('a category sits at the barycentre of its individuals', () => {
    const { q, g, c2 } = demoMixed(12345);
    const f = FAMD.run(q, [g, c2], ['a', 'b', 'c', 'd'], ['g', 's']);
    const idx = [];
    for (let i = 0; i < g.length; i++) if (g[i] === 'A') idx.push(i);
    const m = idx.reduce((a, i) => a + f.rowCoord[i][0], 0) / idx.length;
    const pos = f.catEtiq.indexOf('A');
    near(f.coordCat[pos][0], m, 1e-12, 'category coordinate');
  });
});

function demoGrupos(seed) {
  let s = seed >>> 0;
  const r = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const nz = () => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
  const n = 50, morf = [[], [], []], suelo = [[], [], [], [], []], clima = [[], []];
  for (let i = 0; i < n; i++) {
    const lat = nz();
    morf[0].push(lat + 0.4 * nz()); morf[1].push(0.9 * lat + 0.5 * nz()); morf[2].push(nz());
    for (let j = 0; j < 5; j++) suelo[j].push(0.6 * lat + nz());
    clima[0].push(-0.7 * lat + 0.5 * nz()); clima[1].push(nz());
  }
  return [
    { nombre: 'morphology', tipo: 'quant', cols: morf, nombres: ['m1', 'm2', 'm3'] },
    { nombre: 'soil', tipo: 'quant', cols: suelo, nombres: ['s1', 's2', 's3', 's4', 's5'] },
    { nombre: 'climate', tipo: 'quant', cols: clima, nombres: ['c1', 'c2'] },
  ];
}

suite('Multiple factor analysis', () => {
  test('no group contributes more than 1 to the inertia of an axis', () => {
    /* This is the whole point of the method: the soil group has five
       variables and climate only two, and neither may dominate. */
    const m = MFA.run(demoGrupos(777));
    ok(m.inerciaGrupo.every(f => f.every(v => v <= 1 + 1e-9)), 'a group exceeded 1');
  });

  test('the global point is the barycentre of the partial points', () => {
    const m = MFA.run(demoGrupos(777));
    for (let i = 0; i < m.n; i++) for (let k = 0; k < m.k; k++) {
      const media = m.parciales.reduce((a, P) => a + P[i][k], 0) / m.nGrupos;
      near(media, m.rowCoord[i][k], 1e-9, `individual ${i}, axis ${k + 1}`);
    }
  });

  test('with a single group it reduces to that group divided by its first eigenvalue', () => {
    const g = demoGrupos(777);
    const uno = MFA.run([g[0]]);
    const n = g[0].cols[0].length;
    const X = [];
    for (let i = 0; i < n; i++) {
      X.push(g[0].cols.map(c => {
        const mm = S.mean(c);
        const sd = Math.sqrt(c.reduce((a, v) => a + (v - mm) * (v - mm), 0) / n);
        return (c[i] - mm) / sd;
      }));
    }
    const solo = GSV.core(X, new Array(n).fill(1 / n), [1, 1, 1], {});
    uno.values.forEach((v, k) => near(v, solo.values[k] / solo.values[0], 1e-9, `eigenvalue ${k + 1}`));
  });

  test('duplicating a group doubles the eigenvalues', () => {
    const g = demoGrupos(777);
    const uno = MFA.run([g[0]]);
    const dos = MFA.run([g[0], { nombre: 'copy', tipo: 'quant', cols: g[0].cols, nombres: g[0].nombres }]);
    uno.values.forEach((v, k) => near(dos.values[k], 2 * v, 1e-9, `eigenvalue ${k + 1}`));
  });

  test('RV is symmetric, has a unit diagonal and stays in [0, 1]', () => {
    const m = MFA.run(demoGrupos(777));
    for (let i = 0; i < m.nGrupos; i++) {
      near(m.RV[i][i], 1, 1e-12, `RV diagonal ${i}`);
      for (let j = 0; j < m.nGrupos; j++) {
        near(m.RV[i][j], m.RV[j][i], 1e-12, `RV symmetry ${i},${j}`);
        ok(m.RV[i][j] >= -1e-12 && m.RV[i][j] <= 1 + 1e-12, `RV out of range ${i},${j}`);
      }
    }
  });
});

/* =====================================================================
   HCPC — hierarchical clustering on principal components
   Three well separated groups, so the correct answer is known by
   construction rather than copied from another implementation.
   ===================================================================== */
function tresGrupos(seed) {
  let s = seed >>> 0;
  const r = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const nz = () => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
  const centros = [[-6, -6], [6, -6], [0, 6]];
  const X = [], verdad = [];
  for (let g = 0; g < 3; g++) for (let t = 0; t < 20; t++) {
    X.push([centros[g][0] + 0.5 * nz(), centros[g][1] + 0.5 * nz()]);
    verdad.push(g);
  }
  return { X, verdad, w: new Array(X.length).fill(1 / X.length) };
}

suite('Hierarchical clustering on principal components', () => {
  test('Ward heights never decrease and there are n - 1 merges', () => {
    const { X, w } = tresGrupos(4242);
    const a = HCPC.ward(X, w);
    eq(a.merges.length, X.length - 1, 'number of merges');
    a.alturas.forEach((v, i) => {
      if (i) ok(v >= a.alturas[i - 1] - 1e-12, `height ${i} decreased`);
    });
  });

  test('cutting at three recovers the three true groups', () => {
    const { X, w, verdad } = tresGrupos(4242);
    const g = HCPC.corta(HCPC.ward(X, w), 3);
    eq(new Set(g).size, 3, 'number of clusters');
    for (let t = 0; t < 3; t++) {
      const idx = [];
      for (let i = 0; i < verdad.length; i++) if (verdad[i] === t) idx.push(i);
      eq(new Set(idx.map(i => g[i])).size, 1, `true group ${t} was split`);
    }
  });

  test('within plus between inertia equals the total', () => {
    const { X, w } = tresGrupos(4242);
    const a = HCPC.ward(X, w);
    [2, 3, 4, 5].forEach(q => {
      const I = HCPC.inercias(X, w, HCPC.corta(a, q));
      near(I.intra + I.entre, I.total, 1e-9, `decomposition at q = ${q}`);
    });
  });

  test('one cluster is all within, n clusters is none', () => {
    const { X, w } = tresGrupos(4242);
    const a = HCPC.ward(X, w);
    const I1 = HCPC.inercias(X, w, HCPC.corta(a, 1));
    near(I1.intra, I1.total, 1e-12, 'q = 1');
    const In = HCPC.inercias(X, w, HCPC.corta(a, X.length));
    near(In.intra, 0, 1e-12, 'q = n');
  });

  test('the three rules agree when the structure is unambiguous', () => {
    const { X, w } = tresGrupos(4242);
    const c = HCPC.criterios(X, w, HCPC.ward(X, w), 8);
    c.reglas.forEach(r => eq(r.q, 3, `rule "${r.nombre}"`));
    eq(c.consenso, 3, 'consensus');
    ok(c.acuerdo, 'the rules should agree here');
  });

  test('consolidation never increases the within inertia', () => {
    const { X, w } = tresGrupos(4242);
    /* se parte de una particion deliberadamente estropeada */
    const mal = HCPC.corta(HCPC.ward(X, w), 3).map((g, i) => (i % 7 === 0 ? (g + 1) % 3 : g));
    const antes = HCPC.inercias(X, w, mal).intra;
    const cons = HCPC.consolida(X, w, mal);
    const despues = HCPC.inercias(X, w, cons.grupo).intra;
    ok(despues <= antes + 1e-12, `within inertia went from ${antes} to ${despues}`);
    ok(cons.convergio, 'k-means did not converge');
  });

  test('weighted deviations of the test values cancel out', () => {
    const { X, w } = tresGrupos(4242);
    const g = HCPC.corta(HCPC.ward(X, w), 3);
    const vt = HCPC.vtest(X.map(p => p[0]), g);
    const s = vt.reduce((a, v) => a + v.n * (v.media - v.mediaGeneral), 0);
    near(s, 0, 1e-9, 'sum of weighted deviations');
  });

  test('a paragon really is the closest individual to its centre', () => {
    const { X, w } = tresGrupos(4242);
    const g = HCPC.corta(HCPC.ward(X, w), 3);
    const I = HCPC.inercias(X, w, g);
    const pg = HCPC.paragones(X, g, 3);
    const d2 = (i, c) => (X[i][0] - I.cen[c][0]) ** 2 + (X[i][1] - I.cen[c][1]) ** 2;
    pg.paragones.forEach((lista, c) => {
      const idx = [];
      for (let i = 0; i < X.length; i++) if (g[i] === c) idx.push(i);
      const min = Math.min(...idx.map(i => d2(i, c)));
      near(d2(lista[0].i, c), min, 1e-12, `paragon of cluster ${c}`);
    });
  });

  test('it runs on top of any of the factor methods', async () => {
    /* La promesa del nucleo compartido: el mismo HCPC sobre un ACP, un ACM y
       un AFDM sin tocar una linea. */
    const iris = await loadIris();
    const cab = ['Sepal.Length', 'Sepal.Width', 'Petal.Length', 'Petal.Width'];
    const pca = FAMD.run(iris, [], cab, []);
    const h1 = HCPC.run(pca, { ejes: 2, qmax: 6 });
    ok(h1.q >= 2, 'PCA-based clustering produced no clusters');
    ok(h1.inercia.intra <= h1.inerciaAntes.intra + 1e-12, 'consolidation worsened the PCA case');

    const cortes = iris.map(c => { const m = S.median(c); return c.map(v => (v > m ? 'high' : 'low')); });
    const acm = CA.multiple(cortes, cab);
    const h2 = HCPC.run(acm, { ejes: 3, qmax: 6 });
    ok(h2.q >= 2, 'MCA-based clustering produced no clusters');
    ok(h2.inercia.intra <= h2.inerciaAntes.intra + 1e-12, 'consolidation worsened the MCA case');
  });

  test('on iris it finds the two groups that are really there', async () => {
    /* setosa se separa por completo; versicolor y virginica se solapan, asi
       que la respuesta correcta sobre las coordenadas del ACP es dos, no tres. */
    const iris = await loadIris();
    const pca = FAMD.run(iris, [], ['a', 'b', 'c', 'd'], []);
    const h = HCPC.run(pca, { ejes: 2, qmax: 6 });
    eq(h.q, 2, 'number of clusters on iris');
    const g = h.grupo;
    eq(new Set(g.slice(0, 50)).size, 1, 'setosa was split');
    ok(g[0] !== g[50], 'setosa was not separated from the rest');
  });
});

suite('Input parsing', () => {
  test('comma separated values with quoted fields', () => {
    const rows = PCAProData.parseCSV('a,b,c\n1,"x,y",3\n4,5,6');
    eq(rows.length, 3, 'row count');
    eq(rows[1][1], 'x,y', 'the quoted comma is preserved');
    eq(rows[2][2], '6', 'last field');
  });

  test('escaped double quotes inside a quoted field', () => {
    const rows = PCAProData.parseCSV('a\n"he said ""hi"""');
    eq(rows[1][0], 'he said "hi"', 'unescaped inner quotes');
  });

  test('semicolon delimiter is detected automatically', () => {
    const rows = PCAProData.parseCSV('a;b;c\n1;2;3');
    eq(rows[1].length, 3, 'field count with semicolons');
  });

  test('blank lines are dropped and CRLF is handled', () => {
    const rows = PCAProData.parseCSV('a,b\r\n1,2\r\n\r\n3,4\r\n');
    eq(rows.length, 3, 'rows after dropping the blank line');
  });

  test('column typing separates numeric from categorical', () => {
    const header = ['id', 'grupo', 'x', 'y'];
    const rows = [['A1', 'ctrl', '1.5', '10'], ['A2', 'trat', '2.5', '20'],
                  ['A3', 'ctrl', '3.5', '30'], ['A4', 'trat', '4.5', '40']];
    const cols = PCAProData.profileColumns(header, rows, 'auto');
    eq(cols[1].kind, 'categorical', 'grupo is categorical');
    eq(cols[2].kind, 'numeric', 'x is numeric');
    near(cols[2].mean, 3, 1e-12, 'mean of x');
  });

  test('missing value codes are recognised', () => {
    const cols = PCAProData.profileColumns(['x'],
      [['1'], ['NA'], ['3'], [''], ['5'], ['.']], 'auto');
    eq(cols[0].missing, 3, 'three missing cells');
    eq(cols[0].n, 3, 'three present values');
  });
});

/* =====================================================================
   10 · Export
   ===================================================================== */
suite('Export', () => {
  test('CRC32 matches the canonical check value', () => {
    /* crc32("123456789") = 0xCBF43926, the standard test vector */
    const blob = Rep.zip([{ name: 't.txt', data: new TextEncoder().encode('123456789') }]);
    return blob.arrayBuffer().then(b => {
      const dv = new DataView(b);
      eq(dv.getUint32(14, true), 0xCBF43926, 'CRC32 stored in the local header');
    });
  });

  test('the archive round-trips: every entry verifies its own checksum', async () => {
    const enc = new TextEncoder();
    const entries = [
      { name: 'a.txt', data: enc.encode('hello') },
      { name: 'folder/b.csv', data: enc.encode('x,y\n1,2\n3,4\n') },
      { name: 'acentos_ñ.txt', data: enc.encode('materia orgánica') },
    ];
    const z = new Uint8Array(await Rep.zip(entries).arrayBuffer());
    const d = new DataView(z.buffer);
    let eocd = -1;
    for (let i = z.length - 22; i >= 0; i--) if (d.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    ok(eocd >= 0, 'end of central directory found');
    eq(d.getUint16(eocd + 10, true), 3, 'entry count');

    const T = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); T[n] = c >>> 0; }
    const crc = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = (c >>> 8) ^ T[(c ^ b[i]) & 0xFF]; return (c ^ 0xFFFFFFFF) >>> 0; };

    let p = d.getUint32(eocd + 16, true);
    for (let i = 0; i < 3; i++) {
      eq(d.getUint32(p, true), 0x02014b50, `central header signature of entry ${i + 1}`);
      const nLen = d.getUint16(p + 28, true), off = d.getUint32(p + 42, true);
      const size = d.getUint32(p + 24, true), crcCD = d.getUint32(p + 16, true);
      eq(d.getUint32(off, true), 0x04034b50, `local header signature of entry ${i + 1}`);
      const start = off + 30 + d.getUint16(off + 26, true) + d.getUint16(off + 28, true);
      eq(crc(z.subarray(start, start + size)), crcCD, `checksum of entry ${i + 1}`);
      p += 46 + nLen + d.getUint16(p + 30, true) + d.getUint16(p + 32, true);
    }
  });

  test('CSV export quotes fields that contain the delimiter', () => {
    const csv = matrixToCSV(['a', 'b'], [['x,y', 'z']]);
    ok(csv.includes('"x,y"'), 'the field with a comma is quoted');
  });
});

/* =====================================================================
   11 · Figures
   ===================================================================== */
suite('Figures', () => {
  test('an SVG is produced with the requested dimensions', () => {
    const svg = Fig.svg(400, 300, 'claro');
    eq(svg.tagName.toLowerCase(), 'svg', 'root element');
    eq(svg.getAttribute('viewBox'), '0 0 400 300', 'viewBox');
  });

  test('the font scale multiplies every text size', () => {
    Fig.setFontScale({ fontScale: 2 });
    const t = Fig.text(0, 0, 'x', { size: 10 });
    eq(+t.getAttribute('font-size'), 20, 'scaled font size');
    Fig.setFontScale({ fontScale: 1 });
    const u = Fig.text(0, 0, 'x', { size: 10 });
    eq(+u.getAttribute('font-size'), 10, 'unscaled font size');
  });

  test('font roles scale independently', () => {
    Fig.setFontScale({ fontScale: 1, fsTitle: 3, fsAxis: 1, fsLabel: 1 });
    eq(+Fig.text(0, 0, 'x', { size: 10, role: 'title' }).getAttribute('font-size'), 30, 'title');
    eq(+Fig.text(0, 0, 'x', { size: 10, role: 'axis' }).getAttribute('font-size'), 10, 'axis');
    Fig.setFontScale({ fontScale: 1 });
  });

  test('readable text colour is chosen from the real luminance', () => {
    eq(Fig.onColor('rgb(255,255,255)'), '#1b1f2a', 'dark text on white');
    eq(Fig.onColor('rgb(10,10,10)'), '#ffffff', 'white text on black');
    eq(Fig.onColor('rgb(68,1,84)'), '#ffffff', 'white text on the dark end of viridis');
  });

  test('a serialised SVG is well formed XML', () => {
    const svg = Fig.svg(100, 80, 'claro');
    svg.appendChild(Fig.text(10, 20, 'áéí & <ok>', { size: 12 }));
    const xml = Fig.serialize(svg);
    const doc = new DOMParser().parseFromString(xml, 'image/svg+xml');
    eq(doc.querySelector('parsererror'), null, 'no parse error');
  });

  test('every categorical palette has at least ten colours', () => {
    Object.entries(Fig.palettes).forEach(([name, p]) => {
      ok(p.length >= 10, `palette ${name} has ${p.length} colours`);
      p.forEach(c => ok(/^#[0-9a-fA-F]{6}$/.test(c), `${name}: ${c} is a hex colour`));
    });
  });

  test('every continuous colormap returns a colour across its whole range', () => {
    Object.entries(Fig.colormaps).forEach(([name, f]) => {
      [0, 0.25, 0.5, 0.75, 1].forEach(t => {
        ok(/^rgb\(\d+,\d+,\d+\)$/.test(f(t)), `${name} at t = ${t}`);
      });
    });
  });
});

/* =====================================================================
   runner
   ===================================================================== */
async function run() {
  const out = document.getElementById('out');
  const bar = document.getElementById('bar');
  let pass = 0, fail = 0, total = 0;
  const t0 = performance.now();

  suites.forEach(s => { current = s; s.fn(); total += s.tests.length; });

  for (const s of suites) {
    const box = document.createElement('section');
    box.className = 'suite';
    const h = document.createElement('h2');
    h.textContent = s.name;
    box.appendChild(h);
    document.getElementById('out').appendChild(box);

    for (const t of s.tests) {
      const row = document.createElement('div');
      row.className = 'case running';
      row.innerHTML = `<span class="dot"></span><span class="nm">${t.name}</span>`;
      box.appendChild(row);
      try {
        await t.fn();
        row.className = 'case pass';
        pass++;
      } catch (e) {
        row.className = 'case fail';
        row.innerHTML += `<div class="err">${String(e.message || e)}</div>`;
        fail++;
      }
      bar.style.width = ((pass + fail) / total * 100) + '%';
      await new Promise(r => setTimeout(r, 0));
    }
  }

  const ms = Math.round(performance.now() - t0);
  const sum = document.getElementById('summary');
  sum.className = fail ? 'summary fail' : 'summary pass';
  sum.innerHTML = fail
    ? `<b>${fail}</b> of <b>${total}</b> tests failed &nbsp;·&nbsp; ${pass} passed &nbsp;·&nbsp; ${ms} ms`
    : `All <b>${total}</b> tests passed &nbsp;·&nbsp; ${ms} ms`;
  document.title = (fail ? `FAIL (${fail}) — ` : 'PASS — ') + 'PCAPro tests';
  window.__testResult = { total, pass, fail, ms };
}

window.addEventListener('DOMContentLoaded', run);
})();

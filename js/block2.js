/* PCAPro — análisis de componentes principales en el navegador.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it
   under the terms of the GNU General Public License as published by the Free
   Software Foundation, either version 3 of the License, or (at your option)
   any later version. This program is distributed WITHOUT ANY WARRANTY; see
   the GNU General Public License for more details. You should have received
   a copy of the License along with this program; if not, see
   <https://www.gnu.org/licenses/>. */

/* PCAPro — Bloque 2: extracción de componentes y decisión del número a retener. */

(function () {

/* ============================================================
   Cálculo del ACP
   ============================================================ */
function computePCA() {
  const p = state.X.length, n = state.X[0].length;
  /* la matriz ya viene transformada y escalada del Bloque 1; solo se centra */
  const Xc = state.X.map(c => { const m = S.mean(c); return c.map(v => v - m); });
  const C = S.covMatrix(Xc);                  // = matriz de correlaciones si el escalado fue z
  const e = S.eigenSym(C);
  const values = e.values.map(v => Math.max(v, 0));
  const total = values.reduce((a, b) => a + b, 0);
  const pct = values.map(v => v / total);
  const cum = pct.reduce((acc, v) => (acc.push((acc[acc.length - 1] || 0) + v), acc), []);

  /* ¿es un ACP sobre correlaciones? (diagonal de C ≈ 1) */
  const isCorr = C.every((r, i) => Math.abs(r[i] - 1) < 1e-6);

  /* puntuaciones: F = Xc · V */
  const V = e.vectors;
  const scores = [];
  for (let k = 0; k < p; k++) {
    const col = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let j = 0; j < p; j++) s += Xc[j][i] * V[j][k];
      col[i] = s;
    }
    scores.push(col);
  }
  /* cargas = correlación variable-componente */
  const sdj = Xc.map(c => S.sd(c));
  const loadings = Xc.map((_, j) => values.map((lam, k) =>
    sdj[j] > 0 ? V[j][k] * Math.sqrt(lam) / sdj[j] : 0));

  /* error estándar aproximado de λ bajo normalidad multivariante */
  const seLambda = values.map(v => v * Math.sqrt(2 / (n - 1)));

  return { n, p, C, values, total, pct, cum, vectors: V, scores, loadings, sdj, isCorr, seLambda };
}

/* ============================================================
   Criterios de retención
   ============================================================ */
/* Bastón roto: reparto esperado al partir un segmento al azar */
function brokenStick(p, total) {
  const b = [];
  for (let k = 1; k <= p; k++) {
    let s = 0;
    for (let i = k; i <= p; i++) s += 1 / i;
    b.push(s * total / p);
  }
  return b;
}

/* Análisis paralelo. method: 'perm' (permuta columnas) o 'norm' (datos normales) */
function parallelAnalysis(X, B, method, onProgress) {
  const p = X.length, n = X[0].length;
  const all = Array.from({ length: p }, () => []);
  const cols = X.map(c => c.slice());
  const gauss = () => {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  for (let b = 0; b < B; b++) {
    let sim;
    if (method === 'norm') {
      sim = Array.from({ length: p }, () => Array.from({ length: n }, gauss));
    } else {
      sim = cols.map(c => {                     // permutación independiente por columna
        const a = c.slice();
        for (let i = a.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
      });
    }
    const Cm = method === 'norm' ? S.corrMatrix(sim) : S.covMatrix(sim);
    const ev = S.eigenSym(Cm).values;
    ev.forEach((v, i) => all[i].push(v));
    if (onProgress && b % 50 === 0) onProgress(b / B);
  }
  return {
    mean: all.map(S.mean),
    p95: all.map(a => S.quantile(a, 0.95)),
    B, method,
  };
}

/* MAP de Velicer: promedio de correlaciones parciales al cuadrado */
function velicerMAP(R) {
  const p = R.length;
  const e = S.eigenSym(R);
  const out = [];
  /* m = 0: la propia matriz */
  const offAvg = (M, power) => {
    let s = 0, c = 0;
    for (let i = 0; i < p; i++) for (let j = 0; j < p; j++) {
      if (i === j) continue;
      s += Math.pow(M[i][j], power); c++;
    }
    return s / c;
  };
  out.push({ m: 0, f: offAvg(R, 2), f4: offAvg(R, 4) });
  for (let m = 1; m < p; m++) {
    /* A = V_m · sqrt(λ_m) */
    const A = R.map((_, j) => Array.from({ length: m }, (_, k) => e.vectors[j][k] * Math.sqrt(Math.max(e.values[k], 0))));
    const Rp = R.map((row, i) => row.map((v, j) => {
      let s = 0;
      for (let k = 0; k < m; k++) s += A[i][k] * A[j][k];
      return v - s;
    }));
    const d = Rp.map((r, i) => r[i]);
    if (d.some(v => v <= 1e-10)) break;
    const Cp = Rp.map((r, i) => r.map((v, j) => v / Math.sqrt(d[i] * d[j])));
    out.push({ m, f: offAvg(Cp, 2), f4: offAvg(Cp, 4) });
  }
  let best = out[0], best4 = out[0];
  out.forEach(o => { if (o.f < best.f) best = o; if (o.f4 < best4.f4) best4 = o; });
  return { series: out, k: best.m, k4: best4.m };
}

function buildCriteria(pca, horn, bs, map) {
  const v = pca.values, p = pca.p;
  const kaiser = v.filter(x => x > 1).length;
  const jolliffe = v.filter(x => x > 0.7).length;
  const mean = pca.total / p;
  const kMean = v.filter(x => x > mean).length;            // criterio de la media (equivale a Kaiser si es correlación)
  let kHorn = 0; while (kHorn < p && v[kHorn] > horn.p95[kHorn]) kHorn++;
  let kBS = 0; while (kBS < p && v[kBS] > bs[kBS]) kBS++;
  const k70 = pca.cum.findIndex(x => x >= 0.70) + 1 || p;
  const k80 = pca.cum.findIndex(x => x >= 0.80) + 1 || p;
  /* codo: máxima segunda diferencia (aceleración) del scree */
  let kElbow = 1, bestAcc = -Infinity;
  for (let i = 1; i < p - 1; i++) {
    const acc = (v[i - 1] - v[i]) - (v[i] - v[i + 1]);
    if (acc > bestAcc) { bestAcc = acc; kElbow = i + 1; }
  }
  return [
    { id: 'horn', name: 'Análisis paralelo (Horn)', k: Math.max(kHorn, 1), note: TT(`λ > p95 de ${horn.B} matrices aleatorias`, `λ > p95 of ${horn.B} random matrices`), weight: 3 },
    { id: 'kaiser', name: pca.isCorr ? 'Kaiser–Guttman (λ > 1)' : 'Media de los λ', k: Math.max(pca.isCorr ? kaiser : kMean, 1), note: pca.isCorr ? 'clásico; tiende a sobreestimar' : 'λ mayor que el promedio', weight: 1 },
    { id: 'bstick', name: 'Bastón roto', k: Math.max(kBS, 1), note: 'conservador; frecuente en ecología', weight: 2 },
    { id: 'map', name: 'MAP de Velicer', k: Math.max(map.k, 1), note: 'mínimo de correlaciones parciales²', weight: 2 },
    { id: 'elbow', name: 'Codo del scree (Cattell)', k: kElbow, note: 'máxima curvatura de la caída', weight: 1 },
    { id: 'v70', name: 'Varianza acumulada ≥ 70 %', k: k70, note: 'umbral habitual en ciencias naturales', weight: 1 },
    { id: 'v80', name: 'Varianza acumulada ≥ 80 %', k: k80, note: 'umbral exigente', weight: 1 },
    { id: 'jolliffe', name: 'Jolliffe (λ > 0.7)', k: Math.max(pca.isCorr ? jolliffe : kMean, 1), note: pca.isCorr ? 'versión relajada de Kaiser' : 'no aplica sin estandarizar', weight: 1 },
  ];
}

/* recomendación consensuada: moda ponderada de los criterios */
function consensus(criteria) {
  const votes = {};
  criteria.forEach(c => { votes[c.k] = (votes[c.k] || 0) + c.weight; });
  let best = null, bw = -1;
  Object.keys(votes).forEach(k => { if (votes[k] > bw || (votes[k] === bw && +k < +best)) { bw = votes[k]; best = k; } });
  return +best;
}

/* ============================================================
   Interfaz
   ============================================================ */
function run() {
  /* Si en el bloque 1 se eligió otro método, lo ejecuta metodo.js; el ACP
     conserva la ruta de abajo sin cambios. */
  if (typeof Metodo !== 'undefined' && state.metodo && state.metodo !== 'pca') {
    Metodo.ejecutarYRenderizar();
    return;
  }
  const mr = el('metodoResults');
  if (mr) mr.style.display = 'none';
  const btn = el('runPcaBtn');
  btn.disabled = true; btn.innerHTML = '<span class="loading"></span> ' + tt('Extrayendo componentes…');
  clearMessages('pcaMessages');
  setTimeout(() => {
    try {
      const pca = computePCA();
      const B = +el('paIterSel').value;
      const method = el('paMethodSel').value;
      const horn = parallelAnalysis(state.X, B, method);
      const bs = brokenStick(pca.p, pca.total);
      const Rcorr = S.corrMatrix(state.X);
      const map = velicerMAP(Rcorr);
      const criteria = buildCriteria(pca, horn, bs, map);
      const kRec = consensus(criteria);

      state.pca = Object.assign(pca, {
        horn, bstick: bs, map, criteria, kRec,
        k: state.pca && state.pca.kUserSet ? state.pca.k : kRec,
        kUserSet: state.pca ? state.pca.kUserSet : false,
      });
      /* una nueva extracción invalida la rotación y el agrupamiento anteriores */
      state.rot = null; state.fac = null; state.hcpc = null;
      if (el('cluResults')) el('cluResults').style.display = 'none';
      el('facResults').style.display = 'none';
      el('rotResults').style.display = 'none';

      renderBlock2();
      el('pcaResults').style.display = '';
      enableStep(3, true);
      el('pcaResults').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      showMessage('pcaMessages', 'error', TT('Error en la extracción: ', 'Error during extraction: ') + err.message);
      console.error(err);
    }
    btn.disabled = false; btn.textContent = tt('Extraer componentes →');
  }, 30);
}

function renderBlock2() {
  const P = state.pca;

  /* --- mosaicos --- */
  statTiles('pcaTiles', [
    ['Componentes posibles', P.p, 'tantos como variables activas'],
    ['Varianza total', fmtNum(P.total, 3), P.isCorr ? 'igual a p (correlaciones)' : 'en unidades al cuadrado'],
    ['CP1', fmtPct(P.pct[0], 1), `λ₁ = ${fmtNum(P.values[0], 3)}`],
    ['CP1 + CP2', fmtPct(P.cum[1] || P.cum[0], 1), 'varianza del plano factorial',
      (P.cum[1] || P.cum[0]) >= 0.6 ? 'ok' : (P.cum[1] || P.cum[0]) >= 0.45 ? 'warn' : 'bad'],
    ['Recomendación', P.kRec + (P.kRec === 1 ? ' ' + tt('componente') : ' ' + tt('componentes')), 'consenso de 8 criterios'],
    ['Retenidos ahora', P.k, fmtPct(P.cum[P.k - 1], 1) + ' ' + tt('de la varianza'),
      P.cum[P.k - 1] >= 0.7 ? 'ok' : P.cum[P.k - 1] >= 0.5 ? 'warn' : 'bad'],
  ]);

  /* --- tabla de valores propios --- */
  const rows = P.values.map((lam, i) => ({
    cp: cp(i + 1),
    lam, se: P.seLambda[i],
    pct: P.pct[i], cum: P.cum[i],
    dif: i < P.p - 1 ? lam - P.values[i + 1] : null,
    horn: P.horn.p95[i], bs: P.bstick[i],
    ret: i < P.k,
  }));
  buildTable('eigenTable', [
    { key: 'cp', label: 'Componente' },
    { key: 'lam', label: 'Valor propio λ', num: true, fmt: v => fmtNum(v, 4) },
    { key: 'se', label: '± EE aprox.', num: true, fmt: v => fmtNum(v, 4) },
    { key: 'pct', label: '% varianza', num: true, fmt: v => fmtPct(v, 2) },
    { key: 'cum', label: '% acumulado', num: true, fmt: v => fmtPct(v, 2) },
    { key: 'dif', label: 'λᵢ − λᵢ₊₁', num: true, fmt: v => fmtNum(v, 4) },
    { key: 'horn', label: 'p95 aleatorio', num: true, fmt: v => fmtNum(v, 4) },
    { key: 'bs', label: 'Bastón roto', num: true, fmt: v => fmtNum(v, 4) },
    {
      key: 'flags', label: 'Criterios que lo retienen', html: true,
      get: r => {
        const i = +r.cp.slice(2) - 1;
        const f = [];
        if (P.isCorr && r.lam > 1) f.push('<span class="pill num">Kaiser</span>');
        if (r.lam > P.horn.p95[i]) f.push('<span class="pill id">Horn</span>');
        if (r.lam > P.bstick[i]) f.push('<span class="pill cat">' + tt('bastón') + '</span>');
        return f.length ? f.join(' ') : '<span class="pill off">' + tt('ninguno') + '</span>';
      },
    },
    { key: 'ret', label: 'Retenido', html: true, get: r => r.ret ? '<b style="color:var(--success)">✔</b>' : '<span class="pill off">—</span>' },
  ], rows);

  /* --- resumen de criterios --- */
  const ul = el('critList'); ul.innerHTML = '';
  P.criteria.forEach(c => {
    const li = mk('li', { class: 'check-item ' + (c.k === P.k ? 'ok' : 'info') });
    li.innerHTML = `<div class="ck-icon">${c.k === P.k ? '✔' : '·'}</div>
      <div class="ck-body"><div class="ck-title">${tt(c.name)}: <b>${c.k}</b> ${c.k > 1 ? tt('componentes') : tt('componente')}</div>
      <div class="ck-text">${tt(c.note)} — ${TT(`explican ${fmtPct(P.cum[c.k - 1], 1)} de la varianza.`, `they explain ${fmtPct(P.cum[c.k - 1], 1)} of the variance.`)}</div></div>`;
    ul.appendChild(li);
  });

  /* --- selector de k --- */
  const sel = el('kInput');
  sel.max = P.p; sel.value = P.k;
  el('kSummary').innerHTML = kSummaryText(P);

  /* --- MAP --- */
  buildTable('mapTable', [
    { key: 'm', label: 'Componentes extraídos' },
    { key: 'f', label: 'Media de r parciales²', num: true, fmt: v => fmtNum(v, 5) },
    { key: 'f4', label: 'Media de r parciales⁴', num: true, fmt: v => fmtNum(v, 6) },
    { key: 'min', label: '', html: true, get: r => r.m === P.map.k ? '<b style="color:var(--success)">← ' + tt('mínimo') + '</b>' : '' },
  ], P.map.series);

  /* --- cargas de los componentes retenidos --- */
  renderLoadings();
  renderFigures2();
}

function kSummaryText(P) {
  const c = P.cum[P.k - 1];
  let txt = TT(`Con <b>${P.k}</b> componente${P.k > 1 ? 's' : ''} conservas <b>${fmtPct(c, 1)}</b> de la varianza total ` +
    `y descartas ${fmtPct(1 - c, 1)}.`,
    `With <b>${P.k}</b> component${P.k > 1 ? 's' : ''} you keep <b>${fmtPct(c, 1)}</b> of the total variance ` +
    `and discard ${fmtPct(1 - c, 1)}.`);
  if (P.k !== P.kRec) txt += TT(` El consenso de los criterios sugería <b>${P.kRec}</b>.`,
    ` The consensus of the criteria suggested <b>${P.kRec}</b>.`);
  if (c < 0.5) txt += ' <span style="color:var(--danger)">' +
    tt('Menos de la mitad de la información queda representada: revisa si conviene retener más ejes.') + '</span>';
  else if (c > 0.95 && P.k > 2) txt += ' <span style="color:var(--warning)">' +
    tt('Estás reteniendo casi todo: probablemente no estés reduciendo dimensiones.') + '</span>';
  if (P.k === 1) txt += ' <span style="color:var(--warning)">' +
    tt('Con un solo componente no hay plano factorial: los gráficos del Bloque 4 y la rotación del Bloque 3 necesitan al menos 2 ejes.') + ' ' +
    TT(`Es habitual retener el CP2 aunque los criterios no lo exijan, siempre que se declare cuánta varianza aporta (aquí, ${fmtPct(P.pct[1], 1)}).`,
       `It is common to retain PC2 even when the criteria do not require it, as long as you report how much variance it contributes (here, ${fmtPct(P.pct[1], 1)}).`) +
    '</span>';
  return txt;
}

function renderLoadings() {
  const P = state.pca;
  const k = P.k;
  const thr = +el('loadThr').value;
  const cols = [{ key: 'v', label: 'Variable' }];
  for (let j = 0; j < k; j++) cols.push({
    key: 'c' + j, label: cp(j + 1), num: true, html: true,
    get: r => {
      const val = r['c' + j];
      const s = (val >= 0 ? ' ' : '−') + Math.abs(val).toFixed(3);
      return Math.abs(val) >= thr
        ? `<b style="color:${val > 0 ? 'var(--primary)' : 'var(--danger)'}">${s}</b>` : `<span style="opacity:.42">${s}</span>`;
    },
  });
  cols.push({ key: 'com', label: 'Comunalidad', num: true, fmt: v => fmtNum(v, 3) });
  cols.push({ key: 'best', label: 'Carga dominante' });
  const rows = state.activeVars.map((v, j) => {
    const o = { v };
    let com = 0, bi = 0;
    for (let i = 0; i < k; i++) {
      o['c' + i] = P.loadings[j][i];
      com += P.loadings[j][i] ** 2;
      if (Math.abs(P.loadings[j][i]) > Math.abs(P.loadings[j][bi])) bi = i;
    }
    o.com = com;
    o.best = cp(bi + 1);
    return o;
  });
  buildTable('loadTable', cols, rows);
  const bajas = rows.filter(r => r.com < 0.5);
  el('loadNote').innerHTML =
    TT(`Cargas = correlación entre cada variable y cada componente; se resaltan las de |carga| ≥ ${thr.toFixed(2)}. ` +
    `La <b>comunalidad</b> es la proporción de la varianza de esa variable que recogen los ${state.pca.k} componentes retenidos.`,
    `Loadings = correlation between each variable and each component; those with |loading| ≥ ${thr.toFixed(2)} are highlighted. ` +
    `The <b>communality</b> is the share of that variable's variance captured by the ${state.pca.k} retained components.`) +
    (bajas.length ? TT(` <span style="color:var(--warning)">Mal representadas (comunalidad &lt; 0.5): ${bajas.map(r => r.v).join(', ')}.</span>`,
      ` <span style="color:var(--warning)">Poorly represented (communality &lt; 0.5): ${bajas.map(r => r.v).join(', ')}.</span>`) : '');
}

/* ============================================================
   Figuras
   ============================================================ */
function renderFigures2() {
  const P = state.pca;
  const base = slug(state.fileName || 'pcapro');
  const paletteOpts = Object.entries(Fig.paletteNames);
  const themeOpts = Object.entries(Fig.themeNames);
  const fontOpts = Object.entries(Fig.fontNames);

  const screeData = () => ({
    eig: P.values, pct: P.pct, total: P.total, horn: P.horn,
    bstick: P.bstick, k: P.k, isCorr: P.isCorr, n: P.n,
  });

  Fig.mount('figScree', {
    title: 'Gráfico de sedimentación (scree plot)',
    fileName: base + '_scree',
    defaults: {
      title: 'Gráfico de sedimentación',
      subtitle: TT(`${P.p} componentes · ${P.n} observaciones · ${P.isCorr ? 'matriz de correlaciones' : 'matriz de covarianzas'}`,
        `${P.p} components · ${P.n} observations · ${P.isCorr ? 'correlation matrix' : 'covariance matrix'}`),
      yMode: 'eigen', theme: 'claro', font: 'sans', palette: 'pcapro',
      showBars: true, showLine: true, showLabels: true, gradientBars: false,
      barColor: '#5b3fd6', lineColor: '#1b1f2a', barOpacity: 0.85, barWidth: 0.68,
      showKaiser: true, kaiserColor: '#e03131', showHorn: true, hornColor: '#0d9488',
      showBstick: false, bstickColor: '#e8890c', highlightK: true, highlightColor: '#5b3fd6',
      outline: false, legend: true, xlab: '', ylab: '', width: 900, height: 520,
      lineWidth: 2, pointSize: 4, maxLabels: 12, titleSize: 17,
    },
    controls: [
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'subtitle', label: 'Subtítulo', type: 'text' },
      { key: 'xlab', label: 'Eje X', type: 'text' },
      { key: 'ylab', label: 'Eje Y', type: 'text' },
      { key: 'yMode', label: 'Eje Y muestra', type: 'select', options: [['eigen', 'Valores propios (λ)'], ['pct', '% de varianza']] },
      { key: 'barColor', label: 'Color barras', type: 'color' },
      { key: 'gradientBars', label: 'Barras multicolor', type: 'checkbox' },
      { key: 'palette', label: 'Paleta (multicolor)', type: 'select', options: paletteOpts },
      { key: 'lineColor', label: 'Color línea', type: 'color' },
      { key: 'showBars', label: 'Barras', type: 'checkbox' },
      { key: 'showLine', label: 'Línea', type: 'checkbox' },
      { key: 'showLabels', label: 'Etiquetas de valor', type: 'checkbox' },
      { key: 'showKaiser', label: 'Línea de Kaiser', type: 'checkbox' },
      { key: 'kaiserColor', label: 'Color Kaiser', type: 'color' },
      { key: 'showHorn', label: 'Análisis paralelo', type: 'checkbox' },
      { key: 'hornColor', label: 'Color paralelo', type: 'color' },
      { key: 'showBstick', label: 'Bastón roto', type: 'checkbox' },
      { key: 'bstickColor', label: 'Color bastón', type: 'color' },
      { key: 'highlightK', label: 'Sombrear retenidos', type: 'checkbox' },
      { key: 'highlightColor', label: 'Color retenidos', type: 'color' },
      { key: 'barWidth', label: 'Ancho de barra', type: 'range', min: 0.2, max: 1, step: 0.02 },
      { key: 'legend', label: 'Leyenda', type: 'checkbox' },
      { key: 'theme', label: 'Tema', type: 'select', options: themeOpts },
      { key: 'font', label: 'Tipografía', type: 'select', options: fontOpts },
      { key: 'width', label: 'Ancho (px)', type: 'number', min: 500, max: 1600, step: 20 },
      { key: 'height', label: 'Alto (px)', type: 'number', min: 320, max: 1000, step: 20 },
    ],
    render: cfg => Plots2.scree(cfg, screeData()),
  });

  Fig.mount('figCum', {
    title: 'Varianza acumulada',
    fileName: base + '_varianza_acumulada',
    defaults: {
      title: 'Varianza explicada acumulada',
      subtitle: TT(`Con ${P.k} componente${P.k > 1 ? 's' : ''} se retiene ${fmtPct(P.cum[P.k - 1], 1)}`,
        `With ${P.k} component${P.k > 1 ? 's' : ''}, ${fmtPct(P.cum[P.k - 1], 1)} is retained`),
      theme: 'claro', font: 'sans', lineColor: '#5b3fd6', showArea: true,
      showLabels: true, showThreshold: true, threshold: 80, thresholdColor: '#e03131',
      highlightK: true, highlightColor: '#0d9488', xlab: '', ylab: '',
      width: 900, height: 460, lineWidth: 2.4, pointSize: 4.2, maxLabels: 12, titleSize: 17,
    },
    controls: [
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'subtitle', label: 'Subtítulo', type: 'text' },
      { key: 'xlab', label: 'Eje X', type: 'text' },
      { key: 'ylab', label: 'Eje Y', type: 'text' },
      { key: 'lineColor', label: 'Color línea', type: 'color' },
      { key: 'showArea', label: 'Área bajo la curva', type: 'checkbox' },
      { key: 'showLabels', label: 'Etiquetas', type: 'checkbox' },
      { key: 'showThreshold', label: 'Línea de umbral', type: 'checkbox' },
      { key: 'threshold', label: 'Umbral (%)', type: 'number', min: 30, max: 99 },
      { key: 'thresholdColor', label: 'Color umbral', type: 'color' },
      { key: 'highlightK', label: 'Marcar tu elección', type: 'checkbox' },
      { key: 'highlightColor', label: 'Color marca', type: 'color' },
      { key: 'theme', label: 'Tema', type: 'select', options: themeOpts },
      { key: 'font', label: 'Tipografía', type: 'select', options: fontOpts },
      { key: 'width', label: 'Ancho (px)', type: 'number', min: 500, max: 1600, step: 20 },
      { key: 'height', label: 'Alto (px)', type: 'number', min: 300, max: 900, step: 20 },
    ],
    render: cfg => Plots2.cumulative(cfg, { cum: P.cum, k: P.k }),
  });

  Fig.mount('figParallel', {
    title: 'Análisis paralelo de Horn',
    fileName: base + '_analisis_paralelo',
    defaults: {
      title: 'Análisis paralelo de Horn',
      subtitle: TT(`${P.horn.B} matrices ${P.horn.method === 'perm' ? 'por permutación de los datos' : 'de datos normales aleatorios'} · se retienen los λ por encima del percentil 95`,
        `${P.horn.B} matrices ${P.horn.method === 'perm' ? 'from permuting the data' : 'of random normal data'} · λ above the 95th percentile are retained`),
      theme: 'claro', font: 'sans', lineColor: '#5b3fd6', hornColor: '#0d9488',
      showBand: true, showMean: true, legend: true, xlab: '', ylab: '',
      width: 900, height: 470, titleSize: 17,
    },
    controls: [
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'subtitle', label: 'Subtítulo', type: 'text' },
      { key: 'xlab', label: 'Eje X', type: 'text' },
      { key: 'ylab', label: 'Eje Y', type: 'text' },
      { key: 'lineColor', label: 'Color observados', type: 'color' },
      { key: 'hornColor', label: 'Color aleatorios', type: 'color' },
      { key: 'showBand', label: 'Banda media–p95', type: 'checkbox' },
      { key: 'showMean', label: 'Línea de la media', type: 'checkbox' },
      { key: 'legend', label: 'Leyenda', type: 'checkbox' },
      { key: 'theme', label: 'Tema', type: 'select', options: themeOpts },
      { key: 'font', label: 'Tipografía', type: 'select', options: fontOpts },
      { key: 'width', label: 'Ancho (px)', type: 'number', min: 500, max: 1600, step: 20 },
      { key: 'height', label: 'Alto (px)', type: 'number', min: 300, max: 900, step: 20 },
    ],
    render: cfg => Plots2.parallelPlot(cfg, { eig: P.values, horn: P.horn }),
  });

  Fig.mount('figCriteria', {
    title: 'Comparación de criterios de retención',
    fileName: base + '_criterios',
    defaults: {
      title: '¿Cuántos componentes retener? Comparación de criterios',
      subtitle: TT(`Consenso ponderado: ${P.kRec} componente${P.kRec > 1 ? 's' : ''}`,
        `Weighted consensus: ${P.kRec} component${P.kRec > 1 ? 's' : ''}`),
      theme: 'claro', font: 'sans', palette: 'pcapro', singleColor: false,
      dotColor: '#5b3fd6', showNotes: true, showChosen: true, chosenColor: '#e03131',
      dotSize: 9, stemWidth: 3, xlab: '', width: 900, titleSize: 17,
    },
    controls: [
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'subtitle', label: 'Subtítulo', type: 'text' },
      { key: 'xlab', label: 'Eje X', type: 'text' },
      { key: 'palette', label: 'Paleta', type: 'select', options: paletteOpts },
      { key: 'singleColor', label: 'Un solo color', type: 'checkbox' },
      { key: 'dotColor', label: 'Color único', type: 'color' },
      { key: 'showNotes', label: 'Mostrar notas', type: 'checkbox' },
      { key: 'showChosen', label: 'Marcar tu elección', type: 'checkbox' },
      { key: 'chosenColor', label: 'Color de la marca', type: 'color' },
      { key: 'dotSize', label: 'Tamaño del punto', type: 'range', min: 5, max: 16, step: 1 },
      { key: 'theme', label: 'Tema', type: 'select', options: themeOpts },
      { key: 'font', label: 'Tipografía', type: 'select', options: fontOpts },
      { key: 'width', label: 'Ancho (px)', type: 'number', min: 600, max: 1600, step: 20 },
    ],
    render: cfg => Plots2.criteria(cfg, { items: P.criteria, p: P.p, chosen: P.k }),
  });
}

/* ============================================================
   Descargas
   ============================================================ */
function dlEigen() {
  const P = state.pca;
  const hdr = ['Componente', 'Valor_propio', 'EE_aprox', 'Pct_varianza', 'Pct_acumulado',
    'Diferencia', 'p95_aleatorio', 'Baston_roto', 'Retenido'];
  const rows = P.values.map((lam, i) => [cp(i + 1), lam, P.seLambda[i], P.pct[i] * 100, P.cum[i] * 100,
    i < P.p - 1 ? lam - P.values[i + 1] : '', P.horn.p95[i], P.bstick[i], i < P.k ? 'si' : 'no']);
  download(matrixToCSV(hdr, rows), slug(state.fileName) + '_valores_propios.csv', 'text/csv;charset=utf-8');
}
function dlLoadings() {
  const P = state.pca;
  const hdr = ['Variable', ...Array.from({ length: P.p }, (_, i) => cp(i + 1)), 'Comunalidad_k'];
  const rows = state.activeVars.map((v, j) => {
    let com = 0;
    for (let i = 0; i < P.k; i++) com += P.loadings[j][i] ** 2;
    return [v, ...P.loadings[j], com];
  });
  download(matrixToCSV(hdr, rows), slug(state.fileName) + '_cargas.csv', 'text/csv;charset=utf-8');
}
function dlScores() {
  const P = state.pca;
  const hdr = ['Individuo', ...state.suppCat.map(s => s.name),
    ...Array.from({ length: P.p }, (_, i) => cp(i + 1))];
  const rows = state.rowIds.map((id, i) => [id, ...state.suppCat.map(s => s.values[i]),
    ...P.scores.map(c => c[i])]);
  download(matrixToCSV(hdr, rows), slug(state.fileName) + '_puntuaciones.csv', 'text/csv;charset=utf-8');
}

/* ============================================================
   Eventos
   ============================================================ */
function init() {
  if (!el('runPcaBtn')) return;
  el('runPcaBtn').addEventListener('click', run);
  el('kInput').addEventListener('change', () => {
    const P = state.pca; if (!P) return;
    let k = Math.round(+el('kInput').value);
    k = Math.max(1, Math.min(P.p, k));
    el('kInput').value = k;
    P.k = k; P.kUserSet = true;
    state.rot = null; state.fac = null;     // cambiar k invalida rotación y mapas
    el('facResults').style.display = 'none';
    el('rotResults').style.display = 'none';
    el('kSummary').innerHTML = kSummaryText(P);
    renderLoadings();
    renderFigures2();
    renderBlock2Tiles();
  });
  el('kUseRec').addEventListener('click', () => {
    if (!state.pca) return;
    el('kInput').value = state.pca.kRec;
    el('kInput').dispatchEvent(new Event('change'));
  });
  el('loadThr').addEventListener('change', () => { if (state.pca) renderLoadings(); });
  el('dlEigen').addEventListener('click', dlEigen);
  el('dlLoadings').addEventListener('click', dlLoadings);
  el('dlScores').addEventListener('click', dlScores);
  /* para los métodos distintos del ACP no hay rotación: se salta a los mapas */
  el('goStep3').addEventListener('click', () => goStep(state.metodo && state.metodo !== 'pca' ? 4 : 3));
}
function renderBlock2Tiles() {
  const P = state.pca;
  statTiles('pcaTiles', [
    ['Componentes posibles', P.p, 'tantos como variables activas'],
    ['Varianza total', fmtNum(P.total, 3), P.isCorr ? 'igual a p (correlaciones)' : 'en unidades al cuadrado'],
    ['CP1', fmtPct(P.pct[0], 1), `λ₁ = ${fmtNum(P.values[0], 3)}`],
    ['CP1 + CP2', fmtPct(P.cum[1] || P.cum[0], 1), 'varianza del plano factorial',
      (P.cum[1] || P.cum[0]) >= 0.6 ? 'ok' : (P.cum[1] || P.cum[0]) >= 0.45 ? 'warn' : 'bad'],
    ['Recomendación', P.kRec + (P.kRec === 1 ? ' ' + tt('componente') : ' ' + tt('componentes')), 'consenso de 8 criterios'],
    ['Retenidos ahora', P.k, fmtPct(P.cum[P.k - 1], 1) + ' ' + tt('de la varianza'),
      P.cum[P.k - 1] >= 0.7 ? 'ok' : P.cum[P.k - 1] >= 0.5 ? 'warn' : 'bad'],
  ]);
}

document.addEventListener('DOMContentLoaded', init);
window.PCAProPCA = { computePCA, brokenStick, parallelAnalysis, velicerMAP };
})();

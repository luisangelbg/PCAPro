/* PCAPro — Bloque 5: interpretación de los componentes. */

(function () {

/* ============================================================
   Cálculos
   ============================================================ */
/* Descripción de cada dimensión por variables cuantitativas (activas y
   suplementarias): correlación con las puntuaciones del eje y su valor p. */
function describeQuant(G) {
  const n = G.n;
  return G.labels.map((lab, d) => {
    const items = [];
    state.activeVars.forEach((v, i) => {
      const r = G.coordVar[i][d];
      items.push({ name: v, r, p: S.corP(r, n), supp: false });
    });
    G.suppQuant.forEach(s => {
      items.push({ name: s.name, r: s.coord[d], p: S.corP(s.coord[d], s.nValid), supp: true });
    });
    items.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
    return { dim: lab, items };
  });
}

/* Valores test de las categorías (Lebart / FactoMineR):
   v = (media_cat − media_global) / sqrt( s²/n_cat · (N − n_cat)/(N − 1) )  */
function describeCat(G) {
  const N = G.n;
  const rows = [];
  G.suppCat.forEach(sc => sc.levels.forEach(lv => {
    if (!lv.n) return;
    const v = G.labels.map((_, d) => {
      const coord = G.coordInd[d];
      const mg = S.mean(coord);
      const s2 = coord.reduce((s, x) => s + (x - mg) * (x - mg), 0) / N;   // varianza poblacional
      const denom = Math.sqrt((s2 / lv.n) * ((N - lv.n) / (N - 1)));
      return denom > 0 ? (lv.coord[d] - mg) / denom : 0;
    });
    rows.push({
      variable: sc.name, level: lv.level, n: lv.n,
      name: sc.name + ': ' + lv.level,
      vtest: v, p: v.map(z => S.normalP2(z)), coord: lv.coord,
    });
  }));
  return rows;
}

/* Comparación de grupos sobre cada componente */
function compareGroups(G, varName) {
  const sc = G.suppCat.find(s => s.name === varName);
  if (!sc) return null;
  const levels = sc.levels.filter(l => l.n >= 2);
  if (levels.length < 2) return null;
  return G.labels.map((lab, d) => {
    const groups = levels.map(lv => lv.idx.map(i => G.coordInd[d][i]));
    const av = S.anova(groups);
    const kw = S.kruskal(groups);
    return {
      label: lab, anova: av, kruskal: kw,
      groups: levels.map((lv, gi) => {
        const vals = groups[gi];
        const m = S.mean(vals), sd = S.sd(vals), se = sd / Math.sqrt(vals.length);
        return { level: lv.level, values: vals, mean: m, sd, se, ciLo: m - 1.96 * se, ciHi: m + 1.96 * se };
      }),
    };
  });
}

/* Matriz de correlaciones reproducida por k componentes y sus residuos */
function residuals(G) {
  const p = state.activeVars.length, k = G.k;
  const A = G.coordVar;                      // cargas / estructura
  const Phi = (G.oblique && state.rot) ? state.rot.Phi : null;
  const Robs = S.corrMatrix(state.X);
  const Rrep = Array.from({ length: p }, () => new Array(p).fill(0));
  for (let i = 0; i < p; i++) for (let j = 0; j < p; j++) {
    let s = 0;
    if (Phi && state.rot) {
      /* con rotación oblicua se reproduce con el patrón: P Φ Pᵀ */
      const P = state.rot.pattern;
      for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) s += P[i][a] * Phi[a][b] * P[j][b];
    } else {
      for (let a = 0; a < k; a++) s += A[i][a] * A[j][a];
    }
    Rrep[i][j] = s;
  }
  const Res = Robs.map((r, i) => r.map((v, j) => i === j ? 0 : v - Rrep[i][j]));
  let ss = 0, cnt = 0, big = 0;
  for (let i = 0; i < p; i++) for (let j = i + 1; j < p; j++) {
    ss += Res[i][j] * Res[i][j]; cnt++;
    if (Math.abs(Res[i][j]) > 0.05) big++;
  }
  return { Robs, Rrep, Res, rmsr: cnt ? Math.sqrt(ss / cnt) : 0, big, nPairs: cnt };
}

/* Nombre sugerido para un componente a partir de sus cargas dominantes */
function suggestName(G, d, thr) {
  const pos = [], neg = [];
  state.activeVars.forEach((v, i) => {
    const a = G.coordVar[i][d];
    if (Math.abs(a) >= thr) (a > 0 ? pos : neg).push({ v, a: Math.abs(a) });
  });
  pos.sort((x, y) => y.a - x.a); neg.sort((x, y) => y.a - x.a);
  if (!pos.length && !neg.length) return tt('(sin carga clara)');
  if (pos.length && neg.length) return `${pos.slice(0, 2).map(o => o.v).join(' + ')} ${tt('frente a')} ${neg.slice(0, 2).map(o => o.v).join(' + ')}`;
  const arr = pos.length ? pos : neg;
  return (neg.length ? tt('Menor') + ' ' : '') + arr.slice(0, 3).map(o => o.v).join(', ');
}

/* ============================================================
   Interfaz
   ============================================================ */
function run() {
  if (!state.fac) {
    clearMessages('intMessages');
    showMessage('intMessages', 'error', tt('Primero genera los mapas factoriales en el Bloque 4.'));
    return;
  }
  const btn = el('runIntBtn');
  btn.disabled = true; btn.innerHTML = '<span class="loading"></span> ' + tt('Analizando…');
  clearMessages('intMessages');
  setTimeout(() => {
    try {
      const G = state.fac;
      const thr = +el('intThr').value;
      state.interp = {
        thr,
        quant: describeQuant(G),
        cat: describeCat(G),
        res: residuals(G),
        names: (state.interp && state.interp.names && state.interp.names.length === G.k)
          ? state.interp.names
          : G.labels.map((_, d) => suggestName(G, d, thr)),
        groupVar: el('intGroup').value || null,
      };
      state.interp.cmp = state.interp.groupVar ? compareGroups(G, state.interp.groupVar) : null;
      renderBlock5();
      el('intResults').style.display = '';
      enableStep(6, true);
      el('intResults').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      showMessage('intMessages', 'error', TT('Error en la interpretación: ', 'Error during interpretation: ') + err.message);
      console.error(err);
    }
    btn.disabled = false; btn.textContent = tt('Interpretar componentes →');
  }, 30);
}

/* Llena el selector de grupos en cuanto existen los mapas factoriales, para que
   el usuario pueda elegirlo ANTES de la primera ejecución. */
function fillGroups() {
  const sel = el('intGroup');
  if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = '';
  sel.appendChild(mk('option', { value: '' }, 'No comparar grupos'));
  (state.fac ? state.fac.suppCat : []).forEach(s =>
    sel.appendChild(mk('option', { value: s.name }, s.name)));
  if (prev && [...sel.options].some(o => o.value === prev)) sel.value = prev;
}

function renderBlock5() {
  const G = state.fac, I = state.interp;
  fillGroups();

  /* --- mosaicos --- */
  const sig = I.cat.filter(r => r.vtest.some(v => Math.abs(v) >= 1.96)).length;
  statTiles('intTiles', [
    ['Componentes interpretados', G.k, G.rotated ? 'solución rotada' : 'solución sin rotar'],
    ['RMSR', fmtNum(I.res.rmsr, 4), 'residuo cuadrático medio',
      I.res.rmsr < 0.05 ? 'ok' : I.res.rmsr < 0.08 ? 'warn' : 'bad'],
    ['Residuos > 0.05', `${I.res.big}/${I.res.nPairs}`, 'pares mal reproducidos',
      I.res.big / I.res.nPairs < 0.1 ? 'ok' : I.res.big / I.res.nPairs < 0.25 ? 'warn' : 'bad'],
    ['Categorías caracterizadas', `${sig}/${I.cat.length}`, '|v.test| ≥ 1.96 en algún eje'],
    ['Varianza retenida', fmtPct(G.axisVar.reduce((a, b) => a + b, 0) / G.totalVar, 1), 'por los ejes interpretados'],
  ]);

  /* --- nombres de los componentes --- */
  const box = el('nameBox');
  box.innerHTML = '';
  G.labels.forEach((lab, d) => {
    const row = mk('div', { class: 'field' });
    row.appendChild(mk('label', null, TT(`${lab} — ${fmtPct(G.pct[d], 1)} de la varianza`,
      `${lab} — ${fmtPct(G.pct[d], 1)} of the variance`)));
    const inp = mk('input', { type: 'text', value: I.names[d] || '', placeholder: tt('Nombre del componente') });
    inp.addEventListener('change', () => { I.names[d] = inp.value; renderNarrative(); });
    row.appendChild(inp);
    const sug = mk('span', { class: 'field-help' }, tt('Sugerencia:') + ' ' + suggestName(G, d, I.thr));
    row.appendChild(sug);
    box.appendChild(row);
  });

  /* --- descripción por dimensión --- */
  const dsel = el('dimSelect');
  dsel.innerHTML = '';
  G.labels.forEach((l, d) => dsel.appendChild(mk('option', { value: d }, l)));
  renderDimTable();

  /* --- valores test --- */
  el('catBox').style.display = I.cat.length ? '' : 'none';
  if (I.cat.length) {
    const cols = [
      { key: 'variable', label: 'Variable' },
      { key: 'level', label: 'Categoría' },
      { key: 'n', label: 'n', num: true },
    ];
    G.labels.forEach((l, d) => cols.push({
      key: 'v' + d, label: tt('v.test ') + l, num: true, html: true,
      get: r => {
        const v = r['v' + d];
        const s = fmtNum(v, 2);
        return Math.abs(v) >= 1.96
          ? `<b style="color:${v > 0 ? 'var(--primary)' : 'var(--danger)'}">${s}${Math.abs(v) >= 2.58 ? ' **' : ' *'}</b>`
          : `<span style="opacity:.4">${s}</span>`;
      },
    }));
    buildTable('vtestTable', cols, I.cat.map(r => {
      const o = { variable: r.variable, level: r.level, n: r.n };
      G.labels.forEach((_, d) => o['v' + d] = r.vtest[d]);
      return o;
    }));
  }

  /* --- comparación de grupos --- */
  el('cmpBox').style.display = I.cmp ? '' : 'none';
  if (I.cmp) {
    buildTable('cmpTable', [
      { key: 'lab', label: 'Componente' },
      { key: 'F', label: 'F', num: true, fmt: v => fmtNum(v, 3) },
      { key: 'gl', label: 'gl' },
      { key: 'p', label: 'p (ANOVA)', num: true, fmt: fmtP },
      { key: 'eta', label: 'η²', num: true, fmt: v => fmtNum(v, 3) },
      { key: 'om', label: 'ω²', num: true, fmt: v => fmtNum(v, 3) },
      { key: 'H', label: 'H (Kruskal)', num: true, fmt: v => fmtNum(v, 3) },
      { key: 'pk', label: 'p (Kruskal)', num: true, fmt: fmtP },
      {
        key: 'int', label: 'Lectura', html: true,
        get: r => r.p < 0.05
          ? `<span class="pill num">${tt('separa los grupos')} (${tt(r.eta >= 0.14 ? 'efecto grande' : r.eta >= 0.06 ? 'efecto medio' : 'efecto pequeño')})</span>`
          : '<span class="pill off">' + tt('no distingue grupos') + '</span>',
      },
    ], I.cmp.map(c => ({
      lab: c.label, F: c.anova && c.anova.F, gl: c.anova ? `${c.anova.df1}, ${c.anova.df2}` : '—',
      p: c.anova && c.anova.p, eta: c.anova && c.anova.eta2, om: c.anova && c.anova.omega2,
      H: c.kruskal && c.kruskal.H, pk: c.kruskal && c.kruskal.p,
    })));
    buildTable('cmpMeansTable',
      [{ key: 'lab', label: 'Componente' }, { key: 'g', label: 'Grupo' }, { key: 'n', label: 'n', num: true },
       { key: 'm', label: 'Media', num: true, fmt: v => fmtNum(v, 3) },
       { key: 'sd', label: 'DE', num: true, fmt: v => fmtNum(v, 3) },
       { key: 'ci', label: 'IC 95 % de la media' }],
      I.cmp.flatMap(c => c.groups.map(g => ({
        lab: c.label, g: g.level, n: g.values.length, m: g.mean, sd: g.sd,
        ci: `[${fmtNum(g.ciLo, 2)}, ${fmtNum(g.ciHi, 2)}]`,
      }))));
  }

  /* --- individuos característicos --- */
  const ex = [];
  G.labels.forEach((lab, d) => {
    const ord = state.rowIds.map((id, i) => ({ id, v: G.coordInd[d][i], q: G.cos2Ind[d][i] }))
      .sort((a, b) => a.v - b.v);
    ex.push({ lab, lado: tt('Extremo negativo (−)'), lista: ord.slice(0, 5) });
    ex.push({ lab, lado: tt('Extremo positivo (+)'), lista: ord.slice(-5).reverse() });
  });
  buildTable('extremeTable', [
    { key: 'lab', label: 'Componente' },
    { key: 'lado', label: 'Lado del eje' },
    { key: 'ids', label: 'Individuos (coordenada)' },
  ], ex.map(o => ({
    lab: o.lab, lado: o.lado,
    ids: o.lista.map(x => `${x.id} (${fmtNum(x.v, 2)})`).join(' · '),
  })));

  renderNarrative();
  renderFigures5();
}

function renderDimTable() {
  const G = state.fac, I = state.interp;
  const d = +el('dimSelect').value || 0;
  const q = I.quant[d];
  buildTable('dimTable', [
    { key: 'name', label: 'Variable' },
    { key: 'tipo', label: 'Tipo', html: true, get: r => r.supp ? '<span class="pill">' + tt('suplementaria') + '</span>' : '<span class="pill num">' + tt('activa') + '</span>' },
    { key: 'r', label: 'Correlación con el eje', num: true, fmt: v => fmtNum(v, 3) },
    { key: 'r2', label: 'r²', num: true, get: r => r.r * r.r, fmt: v => fmtNum(v, 3) },
    { key: 'p', label: 'p', num: true, fmt: fmtP },
    {
      key: 'sig', label: '', html: true,
      get: r => r.p < 0.001 ? '***' : r.p < 0.01 ? '**' : r.p < 0.05 ? '*' : '<span style="opacity:.4">n.s.</span>',
    },
  ], q.items);
  el('dimTableNote').innerHTML =
    TT(`Correlación de cada variable con las puntuaciones de <b>${q.dim}</b>. Para las activas coincide con la carga. `,
       `Correlation of each variable with the scores of <b>${q.dim}</b>. For the active ones it equals the loading. `) +
    tt('Los valores p son de la prueba t sobre el coeficiente (gl = n − 2) y se ofrecen como <b>ayuda descriptiva</b>: ' +
       'no hay corrección por comparaciones múltiples y los ejes se construyeron con estas mismas variables, ' +
       'así que no son evidencia confirmatoria.');
}

function renderNarrative() {
  const G = state.fac, I = state.interp;
  const ul = el('narrList'); ul.innerHTML = '';
  G.labels.forEach((lab, d) => {
    const q = I.quant[d];
    const fuertes = q.items.filter(i => Math.abs(i.r) >= I.thr);
    const pos = fuertes.filter(i => i.r > 0), neg = fuertes.filter(i => i.r < 0);
    const cats = I.cat.filter(r => Math.abs(r.vtest[d]) >= 1.96)
      .sort((a, b) => Math.abs(b.vtest[d]) - Math.abs(a.vtest[d])).slice(0, 6);
    const cmp = I.cmp && I.cmp[d];
    const nombre = I.names[d] && I.names[d].trim() ? I.names[d] : suggestName(G, d, I.thr);

    const li = mk('li', { class: 'check-item ' + (fuertes.length >= 2 ? 'ok' : 'warn') });
    li.innerHTML = `<div class="ck-icon">${d + 1}</div><div class="ck-body">
      <div class="ck-title">${lab} · ${TT('«', '“')}${nombre}${TT('»', '”')} — ${TT(`${fmtPct(G.pct[d], 1)} de la varianza`, `${fmtPct(G.pct[d], 1)} of the variance`)}</div>
      <div class="ck-text">
        ${pos.length ? TT(`Valores altos en este eje corresponden a valores <b>altos</b> de ${pos.map(i => `${i.name}${i.supp ? ' (supl.)' : ''}`).join(', ')}. `, `High values on this axis correspond to <b>high</b> values of ${pos.map(i => `${i.name}${i.supp ? ' (suppl.)' : ''}`).join(', ')}. `) : ''}
        ${neg.length ? TT(`Y a valores <b>bajos</b> de ${neg.map(i => `${i.name}${i.supp ? ' (supl.)' : ''}`).join(', ')}. `, `And to <b>low</b> values of ${neg.map(i => `${i.name}${i.supp ? ' (suppl.)' : ''}`).join(', ')}. `) : ''}
        ${!fuertes.length ? TT(`Ninguna variable supera |r| = ${I.thr}: este eje no es interpretable con ese umbral. `, `No variable exceeds |r| = ${I.thr}: this axis cannot be interpreted at that threshold. `) : ''}
        ${cats.length ? TT(`<br>Categorías que lo caracterizan: ${cats.map(c => `<b>${c.level}</b> (v = ${fmtNum(c.vtest[d], 1)}, lado ${c.vtest[d] > 0 ? 'positivo' : 'negativo'})`).join(', ')}. `, `<br>Categories that characterise it: ${cats.map(c => `<b>${c.level}</b> (v = ${fmtNum(c.vtest[d], 1)}, ${c.vtest[d] > 0 ? 'positive' : 'negative'} side)`).join(', ')}. `) : ''}
        ${cmp && cmp.anova ? TT(`<br>Comparación entre grupos de <b>${I.groupVar}</b>: `, `<br>Comparison between groups of <b>${I.groupVar}</b>: `) + `F(${cmp.anova.df1}, ${cmp.anova.df2}) = ${fmtNum(cmp.anova.F, 2)}, ${fmtPLabel(cmp.anova.p)}, η² = ${fmtNum(cmp.anova.eta2, 3)}` +
      (cmp.anova.p < 0.05 ? tt(' — el eje <b>sí</b> separa los grupos.') : tt(' — el eje no separa los grupos.')) : ''}
      </div></div>`;
    ul.appendChild(li);
  });

  /* párrafo listo para copiar */
  const P = state.pca;
  const rotName = state.rot ? tt(Rot.methods[state.rot.method].name.replace(' (oblicua)', '')).toLowerCase() : '';
  const kmoTxt = state.diagnostics && state.diagnostics.kmo ? fmtNum(state.diagnostics.kmo.overall, 2) : '—';
  const bartDf = state.diagnostics ? state.diagnostics.bart.df : '—';
  const bartChi = state.diagnostics ? fmtNum(state.diagnostics.bart.chi2, 1) : '—';
  const bartP = state.diagnostics && state.diagnostics.bart.p < 0.001 ? '< 0.001' : '= ' + (state.diagnostics ? fmtP(state.diagnostics.bart.p) : '—');
  const rotated = state.rot && state.rot.method !== 'none' && G.rotated;
  const txt = TT(
    (() => {
      const met = rotated
        ? ` Sobre ellos se aplicó una rotación ${rotName}${state.rot.opts.normalize ? ' con normalización de Kaiser' : ''}.` : '';
      return `Se realizó un análisis de componentes principales sobre la matriz de ` +
        `${P.isCorr ? 'correlaciones' : 'covarianzas'} de ${state.activeVars.length} variables medidas en ${P.n} ` +
        `observaciones (KMO = ${kmoTxt}; prueba de esfericidad de Bartlett: χ²(${bartDf}) = ${bartChi}, p ${bartP}). ` +
        `Se retuvieron ${P.k} componentes con base en el análisis paralelo de Horn y el gráfico de sedimentación, ` +
        `que en conjunto explican el ${fmtPct(P.cum[P.k - 1], 1)} de la varianza total.${met} ` +
        `Se interpretaron las cargas con |r| ≥ ${I.thr}. ` +
        G.labels.map((lab, d) => `${lab} (${fmtPct(G.pct[d], 1)}) se interpretó como «${I.names[d] || suggestName(G, d, I.thr)}»`).join('; ') + '. ' +
        `La solución reproduce la matriz de correlaciones con un RMSR de ${fmtNum(I.res.rmsr, 3)}.`;
    })(),
    (() => {
      const met = rotated
        ? ` A ${rotName} rotation was then applied${state.rot.opts.normalize ? ' with Kaiser normalisation' : ''}.` : '';
      return `A principal component analysis was carried out on the ` +
        `${P.isCorr ? 'correlation' : 'covariance'} matrix of ${state.activeVars.length} variables measured on ${P.n} ` +
        `observations (KMO = ${kmoTxt}; Bartlett's test of sphericity: χ²(${bartDf}) = ${bartChi}, p ${bartP}). ` +
        `${P.k} components were retained on the basis of Horn's parallel analysis and the scree plot, ` +
        `which together explain ${fmtPct(P.cum[P.k - 1], 1)} of the total variance.${met} ` +
        `Loadings with |r| ≥ ${I.thr} were interpreted. ` +
        G.labels.map((lab, d) => `${lab} (${fmtPct(G.pct[d], 1)}) was interpreted as "${I.names[d] || suggestName(G, d, I.thr)}"`).join('; ') + '. ' +
        `The solution reproduces the correlation matrix with an RMSR of ${fmtNum(I.res.rmsr, 3)}.`;
    })());
  el('narrParagraph').textContent = txt;
}

/* ============================================================
   Figuras
   ============================================================ */
function renderFigures5() {
  const G = state.fac, I = state.interp;
  const base = slug(state.fileName || 'pcapro');
  const paletteOpts = Object.entries(Fig.paletteNames);
  const themeOpts = Object.entries(Fig.themeNames);
  const fontOpts = Object.entries(Fig.fontNames);
  const cmapOpts = Object.entries(Fig.colormapNames);
  const dimOpts = G.labels.map((l, i) => [String(i), l]);

  /* --- descripción de una dimensión --- */
  Fig.mount('figDimDesc', {
    title: 'Descripción de la dimensión',
    fileName: base + '_descripcion_dim',
    defaults: {
      title: 'Variables que describen el eje',
      subtitle: 'Correlación con las puntuaciones · * p < 0.05, ** p < 0.01, *** p < 0.001',
      dim: '0', sort: 'magnitud', onlySig: false, topN: 0,
      theme: 'claro', font: 'sans', colorPos: '#5b3fd6', colorNeg: '#e8890c', suppColor: '#0d9488',
      showValues: true, showThreshold: true, thrColor: '#e03131',
      width: 820, xlab: '', titleSize: 17,
    },
    controls: [
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'subtitle', label: 'Subtítulo', type: 'text' },
      { key: 'dim', label: 'Eje', type: 'select', options: dimOpts },
      { key: 'sort', label: 'Orden', type: 'select', options: [['magnitud', 'Por magnitud'], ['signo', 'De positivo a negativo']] },
      { key: 'onlySig', label: 'Solo significativas', type: 'checkbox' },
      { key: 'topN', label: 'Solo las N mayores (0 = todas)', type: 'number', min: 0, max: 60 },
      { key: 'colorPos', label: 'Color positivo', type: 'color' },
      { key: 'colorNeg', label: 'Color negativo', type: 'color' },
      { key: 'suppColor', label: 'Color suplementarias', type: 'color' },
      { key: 'showValues', label: 'Mostrar valores', type: 'checkbox' },
      { key: 'showThreshold', label: 'Líneas en ±0.30', type: 'checkbox' },
      { key: 'thrColor', label: 'Color de las líneas', type: 'color' },
      { key: 'xlab', label: 'Eje X', type: 'text' },
      { key: 'width', label: 'Ancho (px)', type: 'number', min: 480, max: 1400, step: 20 },
      { key: 'theme', label: 'Tema', type: 'select', options: themeOpts },
      { key: 'font', label: 'Tipografía', type: 'select', options: fontOpts },
    ],
    render: cfg => {
      const d = +cfg.dim || 0;
      return Plots5.dimDesc(cfg, { items: I.quant[d].items, dimLabel: G.labels[d], n: G.n });
    },
  });

  /* --- valores test --- */
  if (I.cat.length) {
    el('figVtestWrap').style.display = '';
    Fig.mount('figVtest', {
      title: 'Valores test de las categorías',
      fileName: base + '_valores_test',
      defaults: {
        title: 'Caracterización de los ejes por las categorías',
        subtitle: 'v.test: desviación del centroide de cada categoría respecto al origen, en unidades normales',
        theme: 'claro', font: 'sans', colormap: 'rdbu', limit: 0,
        showValues: true, showStars: true, fadeNS: true, gridLines: true,
        legend: true, legendTitle: 'v.test', titleSize: 17,
      },
      controls: [
        { key: 'title', label: 'Título', type: 'text' },
        { key: 'subtitle', label: 'Subtítulo', type: 'text' },
        { key: 'colormap', label: 'Paleta continua', type: 'select', options: cmapOpts },
        { key: 'limit', label: 'Límite de escala (0 = auto)', type: 'number', min: 0, max: 20 },
        { key: 'showValues', label: 'Mostrar valores', type: 'checkbox' },
        { key: 'showStars', label: 'Marcar significativos', type: 'checkbox' },
        { key: 'fadeNS', label: 'Atenuar no significativos', type: 'checkbox' },
        { key: 'gridLines', label: 'Separadores', type: 'checkbox' },
        { key: 'legend', label: 'Leyenda', type: 'checkbox' },
        { key: 'theme', label: 'Tema', type: 'select', options: themeOpts },
        { key: 'font', label: 'Tipografía', type: 'select', options: fontOpts },
      ],
      render: cfg => Plots5.vtestHeat(cfg, {
        rows: I.cat.map(r => ({ name: r.name })), M: I.cat.map(r => r.vtest), labels: G.labels,
      }),
    });
  } else el('figVtestWrap').style.display = 'none';

  /* --- perfil por grupo --- */
  if (I.cmp) {
    el('figProfileWrap').style.display = '';
    Fig.mount('figProfile', {
      title: 'Puntuaciones por grupo',
      fileName: base + '_perfil_grupos',
      defaults: {
        title: TT(`Puntuaciones de los componentes según ${I.groupVar}`, `Component scores by ${I.groupVar}`),
        subtitle: 'Se muestra la prueba F de un ANOVA de una vía por componente',
        kind: 'caja', cols: 2, theme: 'claro', font: 'sans', palette: 'pcapro',
        showPoints: true, showOutliers: true, showTest: true, ylab: 'Puntuación', titleSize: 17,
      },
      controls: [
        { key: 'title', label: 'Título', type: 'text' },
        { key: 'subtitle', label: 'Subtítulo', type: 'text' },
        { key: 'kind', label: 'Representación', type: 'select', options: [['caja', 'Diagrama de cajas'], ['media', 'Media e IC 95 %']] },
        { key: 'cols', label: 'Columnas', type: 'number', min: 1, max: 4 },
        { key: 'palette', label: 'Paleta', type: 'select', options: paletteOpts },
        { key: 'showPoints', label: 'Superponer datos', type: 'checkbox' },
        { key: 'showOutliers', label: 'Marcar atípicos', type: 'checkbox' },
        { key: 'showTest', label: 'Mostrar prueba', type: 'checkbox' },
        { key: 'ylab', label: 'Eje Y', type: 'text' },
        { key: 'theme', label: 'Tema', type: 'select', options: themeOpts },
        { key: 'font', label: 'Tipografía', type: 'select', options: fontOpts },
      ],
      render: cfg => Plots5.groupProfile(cfg, {
        comps: I.cmp.map(c => ({
          label: c.label, groups: c.groups,
          test: c.anova ? `F(${c.anova.df1}, ${c.anova.df2}) = ${fmtNum(c.anova.F, 2)}, ${fmtPLabel(c.anova.p)}, η² = ${fmtNum(c.anova.eta2, 2)}` : '',
        })),
      }),
    });
  } else el('figProfileWrap').style.display = 'none';

  /* --- residuos --- */
  Fig.mount('figResid', {
    title: 'Residuos de la matriz reproducida',
    fileName: base + '_residuos',
    defaults: {
      title: 'Residuos: correlación observada − reproducida',
      subtitle: TT(`Con ${G.k} componentes. Valores próximos a 0 indican buen ajuste`,
        `With ${G.k} components. Values close to 0 indicate a good fit`),
      theme: 'claro', font: 'sans', colormap: 'rdbu', limit: 0,
      showValues: true, triangle: 'lower', gridLines: true, legend: true, titleSize: 17,
    },
    controls: [
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'subtitle', label: 'Subtítulo', type: 'text' },
      { key: 'colormap', label: 'Paleta continua', type: 'select', options: cmapOpts },
      { key: 'limit', label: 'Límite de escala (0 = auto)', type: 'number', min: 0, max: 1, step: 0.05 },
      { key: 'triangle', label: 'Triángulo', type: 'select', options: [['lower', 'Inferior'], ['upper', 'Superior'], ['full', 'Completa']] },
      { key: 'showValues', label: 'Mostrar valores', type: 'checkbox' },
      { key: 'gridLines', label: 'Separadores', type: 'checkbox' },
      { key: 'legend', label: 'Leyenda', type: 'checkbox' },
      { key: 'theme', label: 'Tema', type: 'select', options: themeOpts },
      { key: 'font', label: 'Tipografía', type: 'select', options: fontOpts },
    ],
    render: cfg => Plots5.residualHeat(cfg, {
      vars: state.activeVars, R: I.res.Res, rmsr: I.res.rmsr, big: I.res.big, k: G.k,
    }),
  });
}

/* ============================================================
   Descargas
   ============================================================ */
function dlDimDesc() {
  const G = state.fac, I = state.interp;
  const hdr = ['Eje', 'Variable', 'Tipo', 'Correlacion', 'r2', 'p'];
  const rows = [];
  I.quant.forEach(q => q.items.forEach(it =>
    rows.push([q.dim, it.name, it.supp ? 'suplementaria' : 'activa', it.r, it.r * it.r, it.p])));
  download(matrixToCSV(hdr, rows), slug(state.fileName) + '_descripcion_dimensiones.csv', 'text/csv;charset=utf-8');
}
function dlVtest() {
  const G = state.fac, I = state.interp;
  if (!I.cat.length) { alert('No hay variables categóricas definidas.'); return; }
  const hdr = ['Variable', 'Categoria', 'n', ...G.labels.map(l => 'vtest_' + l), ...G.labels.map(l => 'p_' + l)];
  const rows = I.cat.map(r => [r.variable, r.level, r.n, ...r.vtest, ...r.p]);
  download(matrixToCSV(hdr, rows), slug(state.fileName) + '_valores_test.csv', 'text/csv;charset=utf-8');
}
function dlResid() {
  const I = state.interp;
  const hdr = ['', ...state.activeVars];
  const rows = state.activeVars.map((v, i) => [v, ...I.res.Res[i]]);
  download(matrixToCSV(hdr, rows), slug(state.fileName) + '_residuos.csv', 'text/csv;charset=utf-8');
}
function copyParagraph() {
  const txt = el('narrParagraph').textContent;
  navigator.clipboard.writeText(txt).then(
    () => { const b = el('copyParagraph'); b.textContent = '✔ Copiado'; setTimeout(() => b.textContent = '⧉ Copiar párrafo', 1800); },
    () => alert('No se pudo copiar automáticamente. Selecciona el texto y cópialo a mano.'));
}

/* ============================================================
   Eventos
   ============================================================ */
function init() {
  if (!el('runIntBtn')) return;
  el('runIntBtn').addEventListener('click', run);
  el('dimSelect').addEventListener('change', renderDimTable);
  el('intGroup').addEventListener('change', () => { if (state.interp) run(); });
  el('intThr').addEventListener('change', () => { if (state.interp) run(); });
  el('dlDimDesc').addEventListener('click', dlDimDesc);
  el('dlVtest').addEventListener('click', dlVtest);
  el('dlResid').addEventListener('click', dlResid);
  el('copyParagraph').addEventListener('click', copyParagraph);
  el('goStep5').addEventListener('click', () => { fillGroups(); goStep(5); });
}
document.addEventListener('DOMContentLoaded', init);
window.PCAProInterp = { describeQuant, describeCat, compareGroups, residuals, fillGroups };
})();

/* PCAPro — Bloque 3: rotación de los componentes retenidos. */

(function () {

function currentA() {                 // matriz de cargas de los k componentes retenidos
  const P = state.pca;
  return state.activeVars.map((_, j) => P.loadings[j].slice(0, P.k));
}

function run() {
  if (!state.pca) {
    clearMessages('rotMessages');
    showMessage('rotMessages', 'error', tt('Primero extrae los componentes en el Bloque 2.'));
    return;
  }
  const P = state.pca;
  if (P.k < 2) {
    clearMessages('rotMessages');
    showMessage('rotMessages', 'warning',
      tt('La rotación necesita al menos <b>2</b> componentes retenidos. Vuelve al Bloque 2 y sube el número.'));
    return;
  }
  const method = el('rotMethod').value;
  const opts = {
    normalize: el('rotNormalize').checked,
    delta: +el('rotDelta').value,
    kappa: +el('rotKappa').value,
  };
  const btn = el('runRotBtn');
  btn.disabled = true; btn.innerHTML = '<span class="loading"></span> ' + tt('Rotando…');
  clearMessages('rotMessages');
  setTimeout(() => {
    try {
      const A = currentA();
      const res = Rot.rotate(A, method, opts);
      const thr = +el('rotThr').value;
      const diag = Rot.diagnostics(res.pattern, res.Phi, res.oblique, thr);
      const diagU = Rot.diagnostics(A, S.identity(P.k), false, thr);
      state.rot = Object.assign(res, {
        method, opts, A, diag, diagU, thr,
        ssBefore: Array.from({ length: P.k }, (_, j) => A.reduce((s, r) => s + r[j] * r[j], 0)),
      });
      if (!res.converged && method !== 'none') showMessage('rotMessages', 'warning',
        TT(`El algoritmo no alcanzó la tolerancia en ${res.iter} iteraciones. La solución puede no ser óptima; ` +
        `prueba con otra rotación o revisa si hay variables casi redundantes.`,
        `The algorithm did not reach the tolerance in ${res.iter} iterations. The solution may not be optimal; ` +
        `try a different rotation or check for nearly redundant variables.`));
      renderBlock3();
      el('rotResults').style.display = '';
      enableStep(4, true);
      el('rotResults').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      showMessage('rotMessages', 'error', TT('Error en la rotación: ', 'Error during rotation: ') + err.message);
      console.error(err);
    }
    btn.disabled = false; btn.textContent = tt('Aplicar rotación →');
  }, 30);
}

/* ============================================================
   Render
   ============================================================ */
function renderBlock3() {
  const R = state.rot, P = state.pca;
  const k = P.k, labels = Array.from({ length: k }, (_, j) => (R.method === 'none' ? cp(j + 1) : cpr(j + 1)));
  R.labels = labels;

  const totalSS = R.diag.ss.reduce((a, b) => a + b, 0);
  statTiles('rotTiles', [
    ['Rotación', tt(Rot.methods[R.method].name.replace(' (oblicua)', '')), R.oblique ? 'oblicua' : 'ortogonal'],
    ['Componentes rotados', k, TT(`explican ${fmtPct(totalSS / P.total, 1)} en conjunto`, `explain ${fmtPct(totalSS / P.total, 1)} together`)],
    ['Variables limpias', `${R.diag.clean}/${state.activeVars.length}`,
      TT(`carga ≥ ${R.thr} en un solo componente`, `loading ≥ ${R.thr} on a single component`),
      R.diag.clean / state.activeVars.length >= 0.75 ? 'ok' : R.diag.clean / state.activeVars.length >= 0.5 ? 'warn' : 'bad'],
    ['Cargas cruzadas', R.diag.cross, 'variables con ≥ 2 cargas altas',
      R.diag.cross === 0 ? 'ok' : R.diag.cross <= 2 ? 'warn' : 'bad'],
    ['Complejidad media', fmtNum(R.diag.meanComplexity, 2), '1 = estructura simple perfecta',
      R.diag.meanComplexity < 1.3 ? 'ok' : R.diag.meanComplexity < 1.8 ? 'warn' : 'bad'],
    ['Sin representar', R.diag.none, TT(`ninguna carga ≥ ${R.thr}`, `no loading ≥ ${R.thr}`), R.diag.none === 0 ? 'ok' : 'warn'],
  ]);

  /* --- varianza por componente --- */
  buildTable('rotVarTable', [
    { key: 'c', label: 'Componente' },
    { key: 'ssb', label: 'SS cargas sin rotar', num: true, fmt: v => fmtNum(v, 4) },
    { key: 'pb', label: '% sin rotar', num: true, fmt: v => fmtPct(v, 2) },
    { key: 'ss', label: 'SS cargas rotadas', num: true, fmt: v => fmtNum(v, 4) },
    { key: 'p', label: '% rotado', num: true, fmt: v => fmtPct(v, 2) },
    { key: 'cum', label: '% acumulado rotado', num: true, fmt: v => fmtPct(v, 2) },
  ], labels.map((c, j) => ({
    c, ssb: R.ssBefore[j], pb: R.ssBefore[j] / P.total,
    ss: R.diag.ss[j], p: R.diag.ss[j] / P.total,
    cum: R.diag.ss.slice(0, j + 1).reduce((a, b) => a + b, 0) / P.total,
  })));
  el('rotVarNote').innerHTML = R.oblique
    ? TT(`Con rotación <b>oblicua</b> los componentes se solapan, así que estas sumas de cuadrados <b>no son aditivas</b>: ` +
      `no las presentes como un reparto exacto de la varianza. La varianza conjunta de los ${k} componentes ` +
      `(${fmtPct(R.diag.ss.reduce((a, b) => a + b, 0) / P.total, 1)}) sí es comparable con la de la solución sin rotar (${fmtPct(P.cum[k - 1], 1)}).`,
      `With an <b>oblique</b> rotation the components overlap, so these sums of squares are <b>not additive</b>: ` +
      `do not present them as an exact partition of the variance. The joint variance of the ${k} components ` +
      `(${fmtPct(R.diag.ss.reduce((a, b) => a + b, 0) / P.total, 1)}) is comparable with that of the unrotated solution (${fmtPct(P.cum[k - 1], 1)}).`)
    : TT(`La rotación ortogonal <b>redistribuye</b> la varianza entre los ${k} componentes pero no cambia el total: ` +
      `antes y después suman ${fmtPct(P.cum[k - 1], 1)} de la varianza. Por eso los componentes rotados ya no van ` +
      `necesariamente de mayor a menor λ y se renombran CPR1, CPR2…`,
      `An orthogonal rotation <b>redistributes</b> the variance among the ${k} components but does not change the total: ` +
      `before and after they add up to ${fmtPct(P.cum[k - 1], 1)} of the variance. That is why the rotated components no longer ` +
      `run from the largest λ to the smallest and are renamed RPC1, RPC2…`);

  /* --- matriz de patrón --- */
  renderPatternTable();

  /* --- estructura y correlación entre componentes (solo oblicuas) --- */
  el('obliqueBox').style.display = R.oblique ? '' : 'none';
  if (R.oblique) {
    const cols = [{ key: 'v', label: 'Variable' }];
    for (let j = 0; j < k; j++) cols.push({ key: 's' + j, label: labels[j], num: true, fmt: v => fmtNum(v, 3) });
    buildTable('structTable', cols, state.activeVars.map((v, i) => {
      const o = { v };
      for (let j = 0; j < k; j++) o['s' + j] = R.structure[i][j];
      return o;
    }));
    const pcols = [{ key: 'c', label: '' }];
    for (let j = 0; j < k; j++) pcols.push({ key: 'p' + j, label: labels[j], num: true, fmt: v => fmtNum(v, 3) });
    buildTable('phiTable', pcols, labels.map((c, i) => {
      const o = { c };
      for (let j = 0; j < k; j++) o['p' + j] = R.Phi[i][j];
      return o;
    }));
    const off = [];
    for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) off.push(Math.abs(R.Phi[i][j]));
    const mx = off.length ? Math.max(...off) : 0;
    el('phiNote').innerHTML = mx < 0.15
      ? TT(`La correlación máxima entre componentes es <b>${fmtNum(mx, 3)}</b>, prácticamente nula. Los ejes salieron casi ` +
        `ortogonales por sí solos: <b>una rotación ortogonal (varimax) sería más parsimoniosa</b> y se interpreta mejor.`,
        `The largest correlation between components is <b>${fmtNum(mx, 3)}</b>, practically nil. The axes came out almost ` +
        `orthogonal on their own: <b>an orthogonal rotation (varimax) would be more parsimonious</b> and easier to interpret.`)
      : mx < 0.32
        ? TT(`La correlación máxima entre componentes es <b>${fmtNum(mx, 3)}</b>, moderada-baja. La rotación oblicua está ` +
          `justificada pero la ortogonal daría resultados parecidos; compara ambas antes de decidir.`,
          `The largest correlation between components is <b>${fmtNum(mx, 3)}</b>, low to moderate. The oblique rotation is ` +
          `justified, but an orthogonal one would give similar results; compare the two before deciding.`)
        : TT(`La correlación máxima entre componentes es <b>${fmtNum(mx, 3)}</b>: los ejes están claramente relacionados, ` +
          `así que la rotación oblicua es la adecuada. Interpreta la matriz de <b>patrón</b>, no la de estructura.`,
          `The largest correlation between components is <b>${fmtNum(mx, 3)}</b>: the axes are clearly related, ` +
          `so the oblique rotation is the right choice. Interpret the <b>pattern</b> matrix, not the structure matrix.`);
  }

  /* --- interpretación automática --- */
  renderInterpretation();
  renderFigures3();
}

function renderPatternTable() {
  const R = state.rot, k = state.pca.k, thr = R.thr;
  const cols = [{ key: 'v', label: 'Variable' }];
  for (let j = 0; j < k; j++) cols.push({
    key: 'c' + j, label: R.labels[j], num: true, html: true,
    get: r => {
      const val = r['c' + j];
      const s = (val >= 0 ? ' ' : '−') + Math.abs(val).toFixed(3);
      return Math.abs(val) >= thr
        ? `<b style="color:${val > 0 ? 'var(--primary)' : 'var(--danger)'}">${s}</b>`
        : `<span style="opacity:.35">${s}</span>`;
    },
  });
  cols.push({ key: 'com', label: 'Comunalidad', num: true, fmt: v => fmtNum(v, 3) });
  cols.push({ key: 'cx', label: 'Complejidad', num: true, fmt: v => fmtNum(v, 2) });
  cols.push({
    key: 'tipo', label: 'Estructura', html: true,
    get: r => r.tipo === 'limpia' ? `<span class="pill num">${tt('limpia')} · ${R.labels[r.best]}</span>`
      : r.tipo === 'cruzada' ? '<span class="pill cat">' + tt('cruzada') + '</span>'
        : '<span class="pill off">' + tt('sin carga') + '</span>',
  });
  let rows = state.activeVars.map((v, i) => {
    const o = { v, com: R.diag.comm[i], cx: R.diag.complexity[i], tipo: R.diag.clas[i].type, best: R.diag.clas[i].best };
    for (let j = 0; j < k; j++) o['c' + j] = R.pattern[i][j];
    return o;
  });
  if (el('rotSort').checked) {
    rows.sort((a, b) => (a.best - b.best) || (Math.abs(b['c' + b.best]) - Math.abs(a['c' + a.best])));
  }
  buildTable('patternTable', cols, rows);
  el('patternNote').innerHTML =
    (state.rot.oblique
      ? tt('Matriz de <b>patrón</b>: coeficientes únicos de cada variable sobre cada componente, controlando los demás. ' +
        'Es la que se interpreta. Al ser pesos de regresión y no correlaciones, con rotación oblicua <b>pueden superar |1|</b>: ' +
        'no es un error, pero valores muy por encima de 1 avisan de componentes demasiado correlacionados.')
      : tt('Matriz de cargas rotadas: correlación entre cada variable y cada componente.')) +
    TT(` Se resaltan las cargas con |carga| ≥ ${thr.toFixed(2)}.`, ` Loadings with |loading| ≥ ${thr.toFixed(2)} are highlighted.`) +
    tt(' La <b>complejidad de Hofmann</b> vale 1 cuando la variable carga en un solo componente y crece conforme se reparte entre varios.');
}

function renderInterpretation() {
  const R = state.rot, k = state.pca.k, thr = R.thr;
  const ul = el('interpList'); ul.innerHTML = '';

  for (let j = 0; j < k; j++) {
    const pos = [], neg = [];
    state.activeVars.forEach((v, i) => {
      const a = R.pattern[i][j];
      if (Math.abs(a) >= thr) (a > 0 ? pos : neg).push({ v, a });
    });
    pos.sort((x, y) => y.a - x.a); neg.sort((x, y) => x.a - y.a);
    const pctv = R.diag.ss[j] / state.pca.total;
    const li = mk('li', { class: 'check-item ' + (pos.length + neg.length >= 2 ? 'ok' : 'warn') });
    const fmtL = arr => arr.map(o => `<b>${o.v}</b> (${o.a.toFixed(2)})`).join(', ');
    li.innerHTML = `<div class="ck-icon">${j + 1}</div>
      <div class="ck-body">
        <div class="ck-title">${R.labels[j]} — ${TT(`${fmtPct(pctv, 1)} de la varianza total`, `${fmtPct(pctv, 1)} of the total variance`)}</div>
        <div class="ck-text">
          ${pos.length ? TT(`Carga <b>positiva</b> de: ${fmtL(pos)}.`, `<b>Positive</b> loadings from: ${fmtL(pos)}.`) : ''}
          ${neg.length ? TT(` Carga <b>negativa</b> de: ${fmtL(neg)}.`, ` <b>Negative</b> loadings from: ${fmtL(neg)}.`) : ''}
          ${!pos.length && !neg.length ? TT(`Ninguna variable alcanza |carga| ≥ ${thr}: este componente no es interpretable con este umbral.`, `No variable reaches |loading| ≥ ${thr}: this component cannot be interpreted at this threshold.`) : ''}
          ${(pos.length && neg.length) ? tt(' Al tener cargas de los dos signos, es un eje de <b>contraste</b>: separa individuos con valores altos en unas variables y bajos en las otras.') : ''}
          ${(pos.length + neg.length) === 1 ? tt(' Con una sola variable marcadora este componente es frágil; suele hacer falta un mínimo de 3.') : ''}
        </div>
      </div>`;
    ul.appendChild(li);
  }

  /* comparación con la solución sin rotar */
  const cmp = el('rotCompare');
  const dU = R.diagU, dR = R.diag;
  const better = dR.clean > dU.clean || dR.meanComplexity < dU.meanComplexity;
  cmp.className = 'check-item ' + (R.method === 'none' ? 'info' : better ? 'ok' : 'warn');
  cmp.innerHTML = `<div class="ck-icon">${R.method === 'none' ? 'ℹ' : better ? '✔' : '⚠'}</div>
    <div class="ck-body"><div class="ck-title">${tt('¿Mejoró la estructura simple?')}</div>
    <div class="ck-text">` +
    (R.method === 'none'
      ? tt('Estás viendo la solución sin rotar. Elige una rotación arriba para compararlas.')
      : TT(`Variables con carga limpia: <b>${dU.clean} → ${dR.clean}</b> de ${state.activeVars.length}. ` +
        `Cargas cruzadas: <b>${dU.cross} → ${dR.cross}</b>. ` +
        `Complejidad media: <b>${fmtNum(dU.meanComplexity, 2)} → ${fmtNum(dR.meanComplexity, 2)}</b> (1 es el ideal). `,
        `Variables with a clean loading: <b>${dU.clean} → ${dR.clean}</b> of ${state.activeVars.length}. ` +
        `Cross-loadings: <b>${dU.cross} → ${dR.cross}</b>. ` +
        `Mean complexity: <b>${fmtNum(dU.meanComplexity, 2)} → ${fmtNum(dR.meanComplexity, 2)}</b> (1 is ideal). `) +
        (better
          ? tt('La rotación simplificó la solución, así que merece la pena reportarla.')
          : tt('La rotación <b>no</b> simplificó la solución. Prueba otro método, o quédate con la solución sin rotar y decláralo.'))) +
    '</div></div>';
}

/* ============================================================
   Figuras
   ============================================================ */
function renderFigures3() {
  const R = state.rot, P = state.pca;
  const base = slug(state.fileName || 'pcapro');
  const paletteOpts = Object.entries(Fig.paletteNames);
  const themeOpts = Object.entries(Fig.themeNames);
  const fontOpts = Object.entries(Fig.fontNames);
  const cmapOpts = Object.entries(Fig.colormapNames);
  const dimOpts = R.labels.map((l, i) => [String(i + 1), l]);
  const metodo = Rot.methods[R.method].name;

  Fig.mount('figLoadHeat', {
    title: 'Mapa de calor de la matriz de cargas',
    fileName: base + '_cargas_' + R.method,
    defaults: {
      title: tt('Matriz de cargas — rotación') + ' ' + tt(metodo).toLowerCase(),
      subtitle: TT(`${state.activeVars.length} variables × ${P.k} componentes${R.oblique ? ' · matriz de patrón' : ''}`,
        `${state.activeVars.length} variables × ${P.k} components${R.oblique ? ' · pattern matrix' : ''}`),
      theme: 'claro', font: 'sans', colormap: 'rdbu', showValues: true,
      sortVars: true, threshold: R.thr, fadeBelow: false, gridLines: true,
      legend: true, legendTitle: 'carga', titleSize: 17,
    },
    controls: [
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'subtitle', label: 'Subtítulo', type: 'text' },
      { key: 'colormap', label: 'Paleta continua', type: 'select', options: cmapOpts },
      { key: 'showValues', label: 'Mostrar valores', type: 'checkbox' },
      { key: 'sortVars', label: 'Agrupar por componente', type: 'checkbox' },
      { key: 'threshold', label: 'Umbral de realce', type: 'number', min: 0, max: 1, step: 0.05 },
      { key: 'fadeBelow', label: 'Ocultar bajo el umbral', type: 'checkbox' },
      { key: 'gridLines', label: 'Separadores', type: 'checkbox' },
      { key: 'legend', label: 'Leyenda', type: 'checkbox' },
      { key: 'legendTitle', label: 'Título leyenda', type: 'text' },
      { key: 'theme', label: 'Tema', type: 'select', options: themeOpts },
      { key: 'font', label: 'Tipografía', type: 'select', options: fontOpts },
    ],
    render: cfg => Plots3.loadHeat(cfg, { vars: state.activeVars, labels: R.labels, M: R.pattern }),
  });

  Fig.mount('figLoadPlane', {
    title: 'Plano de cargas',
    fileName: base + '_plano_cargas_' + R.method,
    defaults: {
      title: 'Variables en el plano factorial',
      subtitle: TT(`Rotación ${metodo.toLowerCase()}${R.method !== 'none' ? ' · en gris discontinuo, la posición sin rotar' : ''}`,
        `${tt(metodo)} rotation${R.method !== 'none' ? ' · dashed grey: the unrotated position' : ''}`),
      dimX: '1', dimY: '2', size: 620, limit: 1.05,
      theme: 'claro', font: 'sans', palette: 'pcapro', colormap: 'viridis',
      singleColor: false, vecColor: '#5b3fd6', colorBy: 'variable',
      showLabels: true, labelSize: 11.5, vecWidth: 2,
      unitCircle: true, innerCircle: false,
      showUnrotated: R.method !== 'none', unrotColor: '#98a1b3', linkPairs: false,
      legend: true, xlab: '', ylab: '', titleSize: 17,
    },
    controls: [
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'subtitle', label: 'Subtítulo', type: 'text' },
      { key: 'dimX', label: 'Eje horizontal', type: 'select', options: dimOpts },
      { key: 'dimY', label: 'Eje vertical', type: 'select', options: dimOpts },
      { key: 'xlab', label: 'Título eje X', type: 'text' },
      { key: 'ylab', label: 'Título eje Y', type: 'text' },
      { key: 'palette', label: 'Paleta', type: 'select', options: paletteOpts },
      { key: 'singleColor', label: 'Un solo color', type: 'checkbox' },
      { key: 'vecColor', label: 'Color único', type: 'color' },
      { key: 'colorBy', label: 'Colorear por', type: 'select', options: [['variable', 'Variable'], ['contrib', 'Calidad (cos²)']] },
      { key: 'colormap', label: 'Paleta de calidad', type: 'select', options: cmapOpts },
      { key: 'unitCircle', label: 'Círculo unitario', type: 'checkbox' },
      { key: 'innerCircle', label: 'Círculo interior (0.71)', type: 'checkbox' },
      { key: 'showUnrotated', label: 'Mostrar sin rotar', type: 'checkbox' },
      { key: 'unrotColor', label: 'Color sin rotar', type: 'color' },
      { key: 'linkPairs', label: 'Unir con línea', type: 'checkbox' },
      { key: 'showLabels', label: 'Etiquetas', type: 'checkbox' },
      { key: 'labelSize', label: 'Tamaño etiqueta', type: 'range', min: 7, max: 20, step: 0.5 },
      { key: 'vecWidth', label: 'Grosor del vector', type: 'range', min: 0.5, max: 5, step: 0.25 },
      { key: 'size', label: 'Tamaño (px)', type: 'number', min: 380, max: 1100, step: 20 },
      { key: 'limit', label: 'Límite de ejes', type: 'number', min: 0.6, max: 2, step: 0.05 },
      { key: 'theme', label: 'Tema', type: 'select', options: themeOpts },
      { key: 'font', label: 'Tipografía', type: 'select', options: fontOpts },
    ],
    render: cfg => Plots3.loadPlane(cfg, {
      vars: state.activeVars, R: R.oblique ? R.structure : R.pattern, U: R.A,
      labels: R.labels, unitCircle: P.isCorr,
      pctR: R.diag.ss.map(v => v / P.total), pctU: R.ssBefore.map(v => v / P.total),
    }),
  });

  Fig.mount('figLoadBars', {
    title: 'Cargas por componente',
    fileName: base + '_barras_cargas_' + R.method,
    defaults: {
      title: 'Cargas de cada variable sobre cada componente',
      subtitle: TT(`Rotación ${metodo.toLowerCase()} · línea discontinua: umbral ${R.thr}`,
        `${tt(metodo)} rotation · dashed line: threshold ${R.thr}`),
      theme: 'claro', font: 'sans', cols: 2, sortBars: true, showValues: false,
      threshold: R.thr, thrColor: '#e03131', colorPos: '#5b3fd6', colorNeg: '#e8890c', titleSize: 17,
    },
    controls: [
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'subtitle', label: 'Subtítulo', type: 'text' },
      { key: 'cols', label: 'Columnas', type: 'number', min: 1, max: 4 },
      { key: 'sortBars', label: 'Ordenar por magnitud', type: 'checkbox' },
      { key: 'showValues', label: 'Mostrar valores', type: 'checkbox' },
      { key: 'threshold', label: 'Umbral', type: 'number', min: 0, max: 1, step: 0.05 },
      { key: 'thrColor', label: 'Color umbral', type: 'color' },
      { key: 'colorPos', label: 'Color positivo', type: 'color' },
      { key: 'colorNeg', label: 'Color negativo', type: 'color' },
      { key: 'theme', label: 'Tema', type: 'select', options: themeOpts },
      { key: 'font', label: 'Tipografía', type: 'select', options: fontOpts },
    ],
    render: cfg => Plots3.loadBars(cfg, { vars: state.activeVars, labels: R.labels, M: R.pattern }),
  });

  Fig.mount('figVarCompare', {
    title: 'Varianza antes y después de rotar',
    fileName: base + '_varianza_rotacion',
    defaults: {
      title: 'Redistribución de la varianza por la rotación',
      subtitle: R.oblique
        ? 'Con rotación oblicua las sumas de cuadrados no son aditivas'
        : `El total se conserva: ${fmtPct(P.cum[P.k - 1], 1)} antes y después`,
      theme: 'claro', font: 'sans', colorBefore: '#98a1b3', colorAfter: '#5b3fd6',
      showValues: true, outline: false, legend: true, xlab: '', ylab: '',
      width: 780, height: 420, titleSize: 17,
    },
    controls: [
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'subtitle', label: 'Subtítulo', type: 'text' },
      { key: 'xlab', label: 'Eje X', type: 'text' },
      { key: 'ylab', label: 'Eje Y', type: 'text' },
      { key: 'colorBefore', label: 'Color sin rotar', type: 'color' },
      { key: 'colorAfter', label: 'Color rotada', type: 'color' },
      { key: 'showValues', label: 'Mostrar valores', type: 'checkbox' },
      { key: 'outline', label: 'Contorno', type: 'checkbox' },
      { key: 'legend', label: 'Leyenda', type: 'checkbox' },
      { key: 'theme', label: 'Tema', type: 'select', options: themeOpts },
      { key: 'font', label: 'Tipografía', type: 'select', options: fontOpts },
      { key: 'width', label: 'Ancho (px)', type: 'number', min: 480, max: 1400, step: 20 },
      { key: 'height', label: 'Alto (px)', type: 'number', min: 300, max: 800, step: 20 },
    ],
    render: cfg => Plots3.varCompare(cfg, {
      labels: R.labels, before: R.ssBefore, after: R.diag.ss, total: P.total,
    }),
  });
}

/* ============================================================
   Descargas
   ============================================================ */
function dlPattern() {
  const R = state.rot, k = state.pca.k;
  const hdr = ['Variable', ...R.labels, 'Comunalidad', 'Complejidad', 'Estructura'];
  const rows = state.activeVars.map((v, i) => [v, ...R.pattern[i],
    R.diag.comm[i], R.diag.complexity[i], R.diag.clas[i].type]);
  download(matrixToCSV(hdr, rows), slug(state.fileName) + '_cargas_' + R.method + '.csv', 'text/csv;charset=utf-8');
}
function dlStructure() {
  const R = state.rot;
  const hdr = ['Variable', ...R.labels];
  const rows = state.activeVars.map((v, i) => [v, ...R.structure[i]]);
  download(matrixToCSV(hdr, rows), slug(state.fileName) + '_estructura_' + R.method + '.csv', 'text/csv;charset=utf-8');
}
function dlPhi() {
  const R = state.rot;
  download(matrixToCSV(['', ...R.labels], R.labels.map((l, i) => [l, ...R.Phi[i]])),
    slug(state.fileName) + '_correlacion_componentes.csv', 'text/csv;charset=utf-8');
}
function dlRotScores() {
  /* Puntuaciones rotadas por el método de regresión de Thurstone:
     B = R⁻¹ · S  (S = matriz de estructura), válido tanto para rotación
     ortogonal como oblicua. Se calculan sobre las variables estandarizadas. */
  const R = state.rot, k = state.pca.k;
  const Z = state.X.map(c => { const m = S.mean(c), sd = S.sd(c) || 1; return c.map(v => (v - m) / sd); });
  const Rinv = S.inverse(S.corrMatrix(Z));
  if (!Rinv) { alert('La matriz de correlaciones es singular: no se pueden calcular las puntuaciones rotadas.'); return; }
  const B = S.matMul(Rinv, R.structure);           // p × k
  const SC = Array.from({ length: k }, (_, j) =>
    Z[0].map((_, i) => {
      let s = 0;
      for (let v = 0; v < Z.length; v++) s += Z[v][i] * B[v][j];
      return s;
    }));
  const hdr = ['Individuo', ...state.suppCat.map(s => s.name), ...R.labels];
  const rows = state.rowIds.map((id, i) => [id, ...state.suppCat.map(s => s.values[i]), ...SC.map(c => c[i])]);
  state.rot.scores = SC;
  download(matrixToCSV(hdr, rows), slug(state.fileName) + '_puntuaciones_' + R.method + '.csv', 'text/csv;charset=utf-8');
}

/* ============================================================
   Eventos
   ============================================================ */
function syncOpts() {
  const m = el('rotMethod').value;
  el('deltaField').style.display = m === 'oblimin' ? '' : 'none';
  el('kappaField').style.display = m === 'promax' ? '' : 'none';
  el('normField').style.display = m === 'none' ? 'none' : '';
  el('rotHint').innerHTML = tt({
    none: 'Sin rotación: la solución original del Bloque 2, con los ejes ordenados por varianza.',
    varimax: 'La más usada. Simplifica <b>columnas</b>: empuja cada carga hacia 0 o hacia ±1 dentro de cada componente. Componentes independientes.',
    quartimax: 'Simplifica <b>filas</b>: busca que cada variable cargue en el menor número de componentes. Suele dejar un primer factor general dominante.',
    equamax: 'Compromiso entre varimax y quartimax (γ = k/2). Puede ser inestable con pocas variables.',
    parsimax: 'Versión de la familia ortomax con γ = p(k−1)/(p+k−2); busca la máxima parsimonia global.',
    quartimin: 'Oblicua más simple (oblimin con δ = 0). Permite que los componentes se correlacionen.',
    oblimin: 'Oblicua general. δ = 0 equivale a quartimin; valores negativos hacen los ejes más ortogonales y positivos más oblicuos.',
    promax: 'Oblicua rápida: parte de varimax y eleva las cargas a la potencia κ para exagerar el contraste. κ = 4 es el estándar.',
  }[m] || '');
}
function init() {
  if (!el('runRotBtn')) return;
  el('rotMethod').addEventListener('change', syncOpts);
  el('runRotBtn').addEventListener('click', run);
  el('rotThr').addEventListener('change', () => { if (state.rot) run(); });
  el('rotSort').addEventListener('change', () => { if (state.rot) renderPatternTable(); });
  el('dlPattern').addEventListener('click', dlPattern);
  el('dlStructure').addEventListener('click', dlStructure);
  el('dlPhi').addEventListener('click', dlPhi);
  el('dlRotScores').addEventListener('click', dlRotScores);
  syncOpts();
}
document.addEventListener('DOMContentLoaded', init);
window.PCAProRot = { run, currentA };
})();

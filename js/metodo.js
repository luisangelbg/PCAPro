/* PCAPro — análisis de componentes principales en el navegador.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán
   GPL-3.0-or-later — véase LICENSE en la raíz del repositorio. */

/* Elección y ejecución del método factorial.
 *
 * Dos responsabilidades. La primera, al final del bloque 1: mostrar el
 * dictamen del recomendador y dejar que el usuario elija y configure el
 * método. La segunda, en el bloque 2: correr el elegido y presentar su
 * descomposición.
 *
 * El ACP conserva su ruta original intacta; este módulo solo toma el mando
 * cuando state.metodo es otro. Cada método devuelve un objeto con la misma
 * forma que state.pca —el adaptador de abajo— para que el resto de la
 * aplicación no tenga que distinguirlos.
 */

const Metodo = {};

Metodo.NOMBRE = {
  pca:  ['Análisis de componentes principales', 'Principal component analysis'],
  ca:   ['Análisis de correspondencias', 'Correspondence analysis'],
  mca:  ['Análisis de correspondencias múltiple', 'Multiple correspondence analysis'],
  famd: ['Análisis factorial de datos mixtos', 'Factor analysis of mixed data'],
  mfa:  ['Análisis factorial múltiple', 'Multiple factor analysis'],
};
Metodo.SIGLA = { pca: ['ACP', 'PCA'], ca: ['AC', 'CA'], mca: ['ACM', 'MCA'], famd: ['AFDM', 'FAMD'], mfa: ['AFM', 'MFA'] };
Metodo.dictamen = null;

const nombre = id => TT(Metodo.NOMBRE[id][0], Metodo.NOMBRE[id][1]);
const sigla  = id => TT(Metodo.SIGLA[id][0], Metodo.SIGLA[id][1]);

/* ============================================================
   Bloque 1 · card 1.9: el dictamen y la elección
   ============================================================ */
Metodo.renderRecomendador = function () {
  const host = el('metodoCards');
  if (!host || !state.columns) return;
  const d = REC.analiza(state.columns);
  Metodo.dictamen = d;

  /* el método vigente sigue si aún aplica; si no, el recomendado */
  const vigente = state.metodo && d.metodos.find(m => m.id === state.metodo && m.veredicto !== 'no aplica');
  state.metodo = vigente ? state.metodo : (d.recomendado || 'pca');

  const badge = v => v === 'recomendado' ? '<span class="pill num">' + tt('recomendado') + '</span>'
    : v === 'posible' ? '<span class="pill cat">' + tt('posible') + '</span>'
    : '<span class="pill mut">' + tt('no aplica') + '</span>';

  host.innerHTML = d.metodos.filter(m => m.id !== 'hcpc').map(m =>
    `<button type="button" class="met${m.id === state.metodo ? ' sel' : ''}" data-id="${m.id}" ${m.veredicto === 'no aplica' ? 'disabled' : ''}>
       <div class="met-head"><span class="met-sigla">${sigla(m.id)}</span>${badge(m.veredicto)}</div>
       <div class="met-nombre">${nombre(m.id)}</div>
       <div class="met-razon">${m.razon}</div>
     </button>`).join('');

  els('#metodoCards .met').forEach(b => b.addEventListener('click', () => {
    state.metodo = b.dataset.id;
    els('#metodoCards .met').forEach(x => x.classList.toggle('sel', x === b));
    Metodo.renderConfig();
    Metodo.actualizaBoton();
  }));

  const av = el('metodoAvisos');
  av.innerHTML = d.avisos.map(a =>
    `<li class="${a.nivel}"><b>${a.titulo}.</b> ${a.texto}</li>`).join('');

  const hc = d.metodos.find(m => m.id === 'hcpc');
  el('metodoHcpc').textContent = hc ? hc.razon : '';

  Metodo.renderConfig();
  Metodo.actualizaBoton();
};

/* Opciones que cada método necesita y que no están en los datos. */
Metodo.renderConfig = function () {
  const host = el('metodoConfig');
  if (!host) return;
  const id = state.metodo;
  const cual = (state.suppCat || []).filter(c => c.levels.length >= 2);
  const d = Metodo.dictamen || {};
  let html = '';

  if (id === 'ca') {
    const opts = sel => cual.map((c, i) => `<option value="${i}" ${i === sel ? 'selected' : ''}>${c.name} (${c.levels.length})</option>`).join('');
    html = `<p class="hint">${tt('El AC cruza dos variables cualitativas. Elige cuáles: las filas de la tabla serán las categorías de la primera y las columnas, las de la segunda.')}</p>
      <div class="btn-row">
        <label class="inline-label">${tt('Filas')} <select id="caFila">${opts(0)}</select></label>
        <label class="inline-label">${tt('Columnas')} <select id="caCol">${opts(1)}</select></label>
      </div>`;
  } else if (id === 'mca' || id === 'famd') {
    html = `<p class="hint">${id === 'mca'
      ? tt('Variables cualitativas que entran en el ACM. Desmarca las que quieras dejar como suplementarias.')
      : tt('Variables cualitativas que entran en los ejes junto a las cuantitativas activas. Desmarca las que sean un factor de diseño: irán como suplementarias.')}</p>
      <div class="chk-grid">` +
      cual.map((c, i) => `<label class="inline-label"><input type="checkbox" class="metCual" data-i="${i}" checked> ${c.name} <span class="mut">(${c.levels.length})</span></label>`).join('') +
      `</div>`;
  } else if (id === 'mfa') {
    const grupos = d.gruposDetectados;
    const grupoDe = v => {
      if (state.mfaGrupos && state.mfaGrupos[v]) return state.mfaGrupos[v];
      if (grupos) { const g = grupos.find(g => g.variables.includes(v)); if (g) return g.nombre; }
      const m = String(v).split(/[_\-]/); return m.length > 1 ? m[0] : 'G1';
    };
    html = `<p class="hint">${tt('Asigna cada variable activa a un bloque. Escribe el mismo nombre para las variables que van juntas; cada bloque necesita al menos dos.')}</p>
      <div class="table-scroll"><table class="mini"><thead><tr><th>${tt('Variable')}</th><th>${tt('Bloque')}</th></tr></thead><tbody>` +
      state.activeVars.map(v => `<tr><td>${v}</td><td><input type="text" class="mfaGrupo" data-v="${v}" value="${grupoDe(v)}"></td></tr>`).join('') +
      `</tbody></table></div>`;
  } else {
    html = `<p class="hint">${tt('El ACP no necesita más configuración: usará las variables activas con el escalado elegido arriba, y las cualitativas quedarán como suplementarias para colorear los mapas.')}</p>`;
  }
  host.innerHTML = html;
  els('.mfaGrupo').forEach(inp => inp.addEventListener('input', () => {
    state.mfaGrupos = state.mfaGrupos || {};
    state.mfaGrupos[inp.dataset.v] = inp.value.trim();
  }));
};

Metodo.actualizaBoton = function () {
  const b = el('goStep2');
  if (b) b.textContent = TT(`Ir al Bloque 2: ${sigla(state.metodo)} →`, `Go to Block 2: ${sigla(state.metodo)} →`);
  const r = el('runPcaBtn');
  if (r) r.textContent = state.metodo === 'pca' ? tt('Extraer componentes →') : TT(`Ejecutar ${sigla(state.metodo)} →`, `Run ${sigla(state.metodo)} →`);
};

/* ============================================================
   Datos para el método elegido
   ============================================================
   Las columnas cualitativas pueden traer vacíos; el ACP los resolvió en el
   bloque 1, pero aquí hay que quitar las filas incompletas en las
   cualitativas que entran, y quitar las mismas filas de las cuantitativas
   para que sigan alineadas.
   ============================================================ */
Metodo.datos = function () {
  const id = state.metodo;
  const cual = (state.suppCat || []).filter(c => c.levels.length >= 2);
  let usadas = [];
  if (id === 'ca') {
    const a = +el('caFila').value, b = +el('caCol').value;
    if (a === b) throw new Error(tt('Elige dos variables distintas para filas y columnas.'));
    usadas = [cual[a], cual[b]];
  } else if (id === 'mca' || id === 'famd') {
    usadas = els('.metCual').filter(c => c.checked).map(c => cual[+c.dataset.i]);
    if (id === 'mca' && usadas.length < 2) throw new Error(tt('El ACM necesita al menos dos variables cualitativas.'));
    if (id === 'famd' && !usadas.length) throw new Error(tt('El AFDM necesita al menos una variable cualitativa; si no hay, el método es el ACP.'));
  }
  const n = state.rowIds.length;
  const keep = [];
  for (let i = 0; i < n; i++) if (usadas.every(c => c.values[i] !== null && c.values[i] !== '')) keep.push(i);
  const filtra = col => keep.map(i => col[i]);
  return {
    keep, n: keep.length,
    ids: filtra(state.rowIds),
    quant: state.Xraw.map(filtra),
    quantNombres: state.activeVars.slice(),
    qual: usadas.map(c => filtra(c.values)),
    qualNombres: usadas.map(c => c.name),
    quitadas: n - keep.length,
  };
};

/* ============================================================
   Ejecutar el método y adaptar la salida a la forma de state.pca
   ============================================================ */
Metodo.correr = function () {
  const id = state.metodo;
  const D = Metodo.datos();
  let res;
  if (id === 'ca') {
    res = CA.desdeColumnas(D.qual[0], D.qual[1]);
    res.etiquetasFila = res.filas; res.etiquetasCol = res.cols;
  } else if (id === 'mca') {
    res = CA.multiple(D.qual, D.qualNombres);
    res.etiquetasFila = D.ids; res.etiquetasCol = res.cols;
  } else if (id === 'famd') {
    res = FAMD.run(D.quant, D.qual, D.quantNombres, D.qualNombres);
    res.etiquetasFila = D.ids; res.etiquetasCol = res.etiquetas;
  } else if (id === 'mfa') {
    const g = {};
    state.activeVars.forEach(v => {
      const nom = (state.mfaGrupos && state.mfaGrupos[v]) || (els('.mfaGrupo').find(i => i.dataset.v === v) || {}).value || 'G1';
      (g[nom] = g[nom] || []).push(v);
    });
    const grupos = Object.entries(g).map(([nombre, vars]) => ({
      nombre, tipo: 'quant',
      cols: vars.map(v => D.quant[state.activeVars.indexOf(v)]),
      nombres: vars,
    }));
    if (grupos.length < 2) throw new Error(tt('El AFM necesita al menos dos bloques.'));
    const chico = grupos.find(x => x.cols.length < 2);
    if (chico) throw new Error(TT(`El bloque "${chico.nombre}" tiene una sola variable; hacen falta al menos dos.`, `Block "${chico.nombre}" has a single variable; at least two are needed.`));
    res = MFA.run(grupos);
    res.etiquetasFila = D.ids; res.etiquetasCol = res.etiquetas;
  } else {
    throw new Error('método desconocido: ' + id);
  }

  const criteria = Metodo.criterios(res, id);
  const kRec = Metodo.consenso(criteria);
  const K = res.k;

  /* scores por columnas, como los guarda el ACP: scores[k][i] */
  const scores = [];
  for (let k = 0; k < K; k++) scores.push(res.rowCoord.map(f => f[k]));

  const P = {
    method: id, res, datos: D,
    n: res.n, p: res.p, k: kRec, kRec, kUserSet: false,
    values: res.values, pct: res.pct, cum: res.cum, total: res.total,
    isCorr: false, horn: null, bstick: null, map: null,
    loadings: res.colCoord, scores, vectors: null,
    criteria,
    labelsRow: res.etiquetasFila, labelsCol: res.etiquetasCol,
  };
  return P;
};

/* Criterios de retención para métodos que no son el ACP. Horn y MAP están
   pensados para correlaciones; aquí lo que se compara son inercias. */
Metodo.criterios = function (res, id) {
  const v = res.values, K = v.length;
  const items = [];
  const media = res.total / (id === 'mca' ? (res.cols.length - res.nVar) : K);
  const kMedia = v.filter(x => x > media).length;

  if (id === 'mca') {
    const kBenz = v.filter(x => x > res.ajuste.umbral).length;
    items.push({ id: 'benzecri', k: Math.max(1, kBenz), weight: 3,
      name: tt('Ejes por encima de 1/Q (Benzécri)'),
      note: TT(`solo los ejes con λ > 1/Q = ${res.ajuste.umbral.toFixed(3)} tienen contenido`, `only axes with λ > 1/Q = ${res.ajuste.umbral.toFixed(3)} carry content`) });
    const cumG = res.ajuste.pctGreenacre.reduce((a, x, i) => (a.push((a[i - 1] || 0) + x), a), []);
    const k70 = cumG.findIndex(x => x >= 0.70) + 1 || cumG.length;
    const k80 = cumG.findIndex(x => x >= 0.80) + 1 || cumG.length;
    items.push({ id: 'v70', k: Math.max(1, k70), weight: 1, name: tt('Inercia ajustada acumulada ≥ 70 %'), note: tt('con la corrección de Greenacre') });
    items.push({ id: 'v80', k: Math.max(1, k80), weight: 1, name: tt('Inercia ajustada acumulada ≥ 80 %'), note: tt('con la corrección de Greenacre') });
  } else {
    items.push({ id: 'media', k: Math.max(1, kMedia), weight: 2,
      name: tt('Ejes por encima de la inercia media'),
      note: TT(`media = ${media.toFixed(4)}`, `mean = ${media.toFixed(4)}`) });
    const k70 = res.cum.findIndex(x => x >= 0.70) + 1 || K;
    const k80 = res.cum.findIndex(x => x >= 0.80) + 1 || K;
    items.push({ id: 'v70', k: Math.max(1, k70), weight: 1, name: tt('Inercia acumulada ≥ 70 %'), note: tt('umbral habitual') });
    items.push({ id: 'v80', k: Math.max(1, k80), weight: 1, name: tt('Inercia acumulada ≥ 80 %'), note: tt('umbral exigente') });
  }
  /* codo: máxima segunda diferencia, igual que en el bloque 2 */
  let kElbow = 1, best = -Infinity;
  for (let i = 1; i < K - 1; i++) {
    const acc = (v[i - 1] - v[i]) - (v[i] - v[i + 1]);
    if (acc > best) { best = acc; kElbow = i + 1; }
  }
  if (K >= 3) items.push({ id: 'elbow', k: kElbow, weight: 1, name: tt('Codo del scree (Cattell)'), note: tt('máxima curvatura de la caída') });
  items.forEach(c => { c.k = Math.min(c.k, K); });
  return items;
};

Metodo.consenso = function (criteria) {
  const votos = {};
  criteria.forEach(c => { votos[c.k] = (votos[c.k] || 0) + c.weight; });
  let mejor = 1, mv = -1;
  Object.entries(votos).forEach(([k, w]) => { if (w > mv) { mv = w; mejor = +k; } });
  return Math.max(1, mejor);
};

/* ============================================================
   Bloque 2 para métodos distintos del ACP
   ============================================================ */
Metodo.contenedor = function () {
  let c = el('metodoResults');
  if (!c) {
    c = mk('div', { id: 'metodoResults' });
    el('pcaResults').parentNode.insertBefore(c, el('pcaResults'));
  }
  return c;
};

Metodo.ejecutarYRenderizar = function () {
  const btn = el('runPcaBtn');
  btn.disabled = true; btn.innerHTML = '<span class="loading"></span> ' + tt('Calculando…');
  clearMessages('pcaMessages');
  setTimeout(() => {
    try {
      const P = Metodo.correr();
      state.pca = P;
      state.rot = null; state.fac = null;
      el('facResults').style.display = 'none';
      el('rotResults').style.display = 'none';
      el('pcaResults').style.display = 'none';
      Metodo.renderBloque2(P);
      /* la rotación es cosa del ACP; los mapas de estos métodos llegan en la
         siguiente entrega, así que el recorrido termina aquí por ahora */
      enableStep(3, false); enableStep(4, false); enableStep(5, false); enableStep(6, false);
      Metodo.contenedor().scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      showMessage('pcaMessages', 'error', TT('Error al ejecutar el método: ', 'Error while running the method: ') + err.message);
      console.error(err);
    }
    btn.disabled = false; Metodo.actualizaBoton();
  }, 30);
};

Metodo.renderBloque2 = function (P) {
  const c = Metodo.contenedor();
  const id = P.method, R = P.res;
  c.style.display = '';
  const base = (state.fileName || 'pcapro').replace(/\.[^.]+$/, '') + '_' + id;

  c.innerHTML = `
    <div class="card">
      <h2>${TT('2.2 · Inercia y ejes', '2.2 · Inertia and axes')} · ${sigla(id)}</h2>
      <div class="tiles" id="metTiles"></div>
      <div class="table-scroll" id="metEigTable"></div>
      <div id="metNota" class="note" style="margin-top:12px"></div>
    </div>
    <div class="card" id="metEspecifico"></div>
    <div class="card">
      <h2>${tt('2.3 · ¿Cuántos ejes retener?')}</h2>
      <p class="hint">${tt('Horn y el MAP de Velicer están pensados para matrices de correlaciones; aquí lo que se compara son inercias, así que los criterios son otros. Igual que en el ACP, se muestran todos y decides tú.')}</p>
      <ul class="check-list" id="metCrit"></ul>
      <div class="btn-row" style="margin-top:10px">
        <label class="inline-label">${tt('Ejes a retener')} <input type="number" id="metK" min="1" max="${P.res.k}" value="${P.k}" style="width:70px"></label>
        <button class="btn btn-secondary btn-sm" id="metKRec">${tt('Usar la recomendación del consenso')}</button>
      </div>
    </div>
    <div class="card">
      <h2>${tt('2.4 · Figuras de extracción')}</h2>
      <div id="figScreeM"></div>
      <div id="figCritM" style="margin-top:16px"></div>
    </div>
    <div class="card">
      <h2>${TT('2.5 · Coordenadas', '2.5 · Coordinates')}</h2>
      <p class="hint" id="metCoordNota"></p>
      <div class="table-scroll" id="metColTable"></div>
    </div>
    <div class="card">
      <p class="hint"><b>${tt('Siguiente entrega')}.</b> ${tt('Los mapas factoriales, la interpretación y el informe para este método están en construcción; por ahora el recorrido termina en este bloque. El ACP conserva su recorrido completo.')}</p>
    </div>`;

  const pinta = () => {
    const k = P.k;
    const tiles = [
      [tt('Individuos / filas'), P.n],
      [tt('Columnas'), P.p],
      [tt('Ejes posibles'), R.k],
      [tt('Inercia total'), fmtNum(P.total, 4)],
      [tt('Ejes retenidos'), k, fmtPct(P.cum[k - 1], 1) + ' ' + tt('de la inercia')],
    ];
    if (id === 'ca') tiles.push([tt('χ² de independencia'), fmtNum(R.chi2.chi2, 2), `gl ${R.chi2.df} · ${fmtPLabel(R.chi2.p)}`, R.chi2.p < 0.05 ? 'ok' : 'bad']);
    if (P.datos.quitadas) tiles.push([tt('Filas sin dato'), P.datos.quitadas, tt('excluidas por vacíos en las cualitativas'), 'warn']);
    statTiles('metTiles', tiles);

    const cols = [
      { key: 'eje', label: tt('Eje') },
      { key: 'lam', label: 'λ', num: true, fmt: x => fmtNum(x, 4) },
      { key: 'pct', label: tt('% inercia'), num: true, fmt: x => fmtPct(x, 2) },
      { key: 'cum', label: tt('% acumulado'), num: true, fmt: x => fmtPct(x, 2) },
    ];
    if (id === 'mca') cols.push({ key: 'adj', label: tt('% ajustado (Greenacre)'), num: true, fmt: x => (x == null ? '—' : fmtPct(x, 2)) });
    cols.push({ key: 'ret', label: tt('Retenido'), html: true });
    const rows = P.values.map((v, i) => ({
      eje: (id === 'ca' || id === 'mca') ? TT('Dim', 'Dim') + (i + 1) : cp(i + 1),
      lam: v, pct: P.pct[i], cum: P.cum[i],
      adj: id === 'mca' ? (R.ajuste.pctGreenacre[i] != null ? R.ajuste.pctGreenacre[i] : null) : undefined,
      ret: i < k ? '✔' : '—',
    }));
    buildTable('metEigTable', cols, rows);

    el('metNota').innerHTML = id === 'ca'
      ? TT(`La inercia total es φ² = χ²/n = ${fmtNum(R.chi2.inerciaTotal, 4)}. ${R.chi2.p < 0.05 ? 'La tabla se aparta de la independencia: hay estructura que mostrar.' : 'La tabla no se aparta de la independencia: el mapa no tendrá estructura que mostrar, por bien que se vea.'}${R.chi2.pctBajas > 20 ? ` Cuidado: el ${R.chi2.pctBajas.toFixed(0)} % de las celdas tiene frecuencia esperada menor que 5.` : ''}`,
           `Total inertia is φ² = χ²/n = ${fmtNum(R.chi2.inerciaTotal, 4)}. ${R.chi2.p < 0.05 ? 'The table departs from independence: there is structure to show.' : 'The table does not depart from independence: the map will have no structure to show, however good it looks.'}${R.chi2.pctBajas > 20 ? ` Beware: ${R.chi2.pctBajas.toFixed(0)} % of the cells have an expected frequency below 5.` : ''}`)
      : id === 'mca'
      ? TT(`Los porcentajes crudos del ACM están sesgados a la baja (inercia bruta J/Q − 1 = ${fmtNum(R.inerciaBruta, 3)}). Interpreta la columna ajustada.`, `Raw MCA percentages are biased downwards (raw inertia J/Q − 1 = ${fmtNum(R.inerciaBruta, 3)}). Read the adjusted column.`)
      : id === 'famd'
      ? TT(`Inercia total = cuantitativas + (categorías − cualitativas) = ${R.inerciaEsperada}. Cada cuantitativa aporta 1; cada cualitativa, sus categorías menos una.`, `Total inertia = quantitative + (categories − qualitative) = ${R.inerciaEsperada}. Each quantitative variable contributes 1; each qualitative one, its categories minus one.`)
      : TT(`Cada bloque se dividió entre su primer valor propio, así que ninguno puede aportar más de 1 al primer eje: el que trae más columnas ya no manda por serlo.`, `Each block was divided by its first eigenvalue, so none can contribute more than 1 to the first axis: the one with more columns no longer leads for that reason alone.`);

    el('metCrit').innerHTML = P.criteria.map(cr =>
      `<li class="${cr.k === P.kRec ? 'ok' : 'info'}"><b>${cr.name}: ${cr.k} ${cr.k === 1 ? tt('eje') : tt('ejes')}</b> — ${cr.note}</li>`).join('') +
      `<li class="${P.criteria.every(x => x.k === P.kRec) ? 'ok' : 'warn'}"><b>${tt('Consenso')}: ${P.kRec}</b> — ${P.criteria.every(x => x.k === P.kRec) ? tt('todos los criterios coinciden') : tt('los criterios discrepan; la decisión es tuya')}</li>`;

    /* coordenadas de columna: variables, categorías o bloques según el método */
    const kk = Math.min(k, 4);
    const ccols = [{ key: 'v', label: id === 'ca' ? tt('Columna') : id === 'mca' ? tt('Categoría') : tt('Variable') }];
    for (let j = 0; j < kk; j++) ccols.push({ key: 'c' + j, label: 'Dim' + (j + 1), num: true, fmt: x => fmtNum(x, 3) });
    ccols.push({ key: 'cos', label: tt('cos² (plano 1–2)'), num: true, fmt: x => fmtNum(x, 3) });
    ccols.push({ key: 'ctr', label: tt('contrib. % (Dim1)'), num: true, fmt: x => fmtNum(x, 1) });
    const crows = P.labelsCol.map((v, j) => {
      const o = { v, cos: (R.colCos2[j][0] || 0) + (R.colCos2[j][1] || 0), ctr: R.colContrib[j][0] };
      for (let q = 0; q < kk; q++) o['c' + q] = R.colCoord[j][q];
      return o;
    });
    buildTable('metColTable', ccols, crows);
    el('metCoordNota').textContent = id === 'famd'
      ? tt('Las cuantitativas aparecen con su correlación con cada eje; las categorías, con el baricentro de sus individuos. Ambas en la misma escala de cos² y contribuciones.')
      : tt('Coordenadas principales: las que se dibujan. cos² dice cuán bien está representado cada punto en el plano; la contribución, cuánto pesó en construir el eje.');
  };
  pinta();

  Metodo.renderEspecifico(P);

  el('metK').addEventListener('change', () => {
    const v = Math.max(1, Math.min(R.k, +el('metK').value || 1));
    P.k = v; P.kUserSet = true; el('metK').value = v; pinta();
  });
  el('metKRec').addEventListener('click', () => { P.k = P.kRec; P.kUserSet = false; el('metK').value = P.kRec; pinta(); });

  /* figuras: el scree tolera horn/bstick nulos */
  Fig.mount('figScreeM', {
    title: tt('Gráfico de sedimentación'),
    fileName: base + '_scree',
    defaults: {
      title: tt('Gráfico de sedimentación'),
      subtitle: TT(`${R.k} ejes · ${P.n} individuos · ${nombre(id)}`, `${R.k} axes · ${P.n} individuals · ${nombre(id)}`),
      yMode: 'eigen', theme: 'claro', font: 'sans', palette: 'pcapro',
      showBars: true, showLine: true, showLabels: true, gradientBars: false,
      barColor: '#5b3fd6', lineColor: '#1b1f2a', barOpacity: 0.85, barWidth: 0.68,
      showKaiser: false, showHorn: false, showBstick: false, highlightK: true, highlightColor: '#5b3fd6',
      outline: false, legend: true, xlab: '', ylab: '', width: 900, height: 520,
      lineWidth: 2, pointSize: 4, maxLabels: 12, titleSize: 17,
    },
    controls: [
      { key: 'showBars', label: tt('Barras'), type: 'checkbox' },
      { key: 'showLine', label: tt('Línea'), type: 'checkbox' },
      { key: 'showLabels', label: tt('Etiquetas'), type: 'checkbox' },
    ],
    render: cfg => Plots2.scree(cfg, { eig: P.values, pct: P.pct, total: P.total, horn: null, bstick: null, k: P.k, isCorr: false, n: P.n }),
  });
};

/* Lo que cada método tiene de propio y el ACP no. */
Metodo.renderEspecifico = function (P) {
  const c = el('metEspecifico'), id = P.method, R = P.res;
  if (id === 'ca') {
    const celdas = [];
    R.tabla.forEach((fila, i) => fila.forEach((v, j) => celdas.push({ f: R.filas[i], c: R.cols[j], obs: v, esp: R.celdas[i][j].esp, res: R.celdas[i][j].resid, ctr: R.celdas[i][j].contrib })));
    celdas.sort((a, b) => b.ctr - a.ctr);
    c.innerHTML = `<h2>${tt('Qué asociaciones sostienen el mapa')}</h2>
      <p class="hint">${tt('Cada celda de la tabla contribuye a la χ². Las de arriba son las asociaciones concretas que el mapa va a mostrar: un residuo positivo es atracción entre fila y columna; negativo, repulsión.')}</p>
      <div class="table-scroll" id="caCeldas"></div>`;
    buildTable('caCeldas', [
      { key: 'f', label: tt('Fila') }, { key: 'c', label: tt('Columna') },
      { key: 'obs', label: tt('Observado'), num: true },
      { key: 'esp', label: tt('Esperado'), num: true, fmt: x => fmtNum(x, 1) },
      { key: 'res', label: tt('Residuo'), num: true, fmt: x => fmtNum(x, 2) },
      { key: 'ctr', label: tt('% de la χ²'), num: true, fmt: x => fmtNum(x, 1) },
    ], celdas.slice(0, 12));
  } else if (id === 'mca') {
    const Q = R.nVar;
    c.innerHTML = `<h2>${tt('Asociación entre las variables (v de Cramér)')}</h2>
      <p class="hint">${tt('El ACM solo encuentra estructura si las variables están asociadas entre sí. Valores cerca de 0 entre todas ellas significan que el mapa reparte a los individuos casi al azar.')}</p>
      <div class="table-scroll" id="mcaCramer"></div>`;
    const cols = [{ key: 'v', label: '' }].concat(R.varNombres.map((n, j) => ({ key: 'x' + j, label: n, num: true, fmt: x => fmtNum(x, 3) })));
    buildTable('mcaCramer', cols, R.varNombres.map((n, i) => { const o = { v: n }; for (let j = 0; j < Q; j++) o['x' + j] = R.cramer[i][j]; return o; }));
  } else if (id === 'famd') {
    const kk = Math.min(P.k, 4);
    c.innerHTML = `<h2>${tt('Qué variable explica cada eje')}</h2>
      <p class="hint">${tt('Para las cuantitativas, la correlación al cuadrado con el eje; para las cualitativas, la razón de correlación η². Las dos están en [0, 1] y se pueden comparar: es lo que permite leer un eje que mezcla ambos tipos.')}</p>
      <div class="table-scroll" id="famdVars"></div>`;
    const cols = [{ key: 'v', label: tt('Variable') }, { key: 't', label: tt('Tipo') }];
    for (let j = 0; j < kk; j++) cols.push({ key: 'c' + j, label: 'Dim' + (j + 1), num: true, fmt: x => fmtNum(x, 3) });
    const rows = [];
    R.nomQuant.forEach((n, i) => { const o = { v: n, t: tt('cuantitativa') }; for (let j = 0; j < kk; j++) o['c' + j] = R.corQuant[i][j] ** 2; rows.push(o); });
    R.nomQual.forEach((n, i) => { const o = { v: n, t: tt('cualitativa') }; for (let j = 0; j < kk; j++) o['c' + j] = R.eta2[i][j]; rows.push(o); });
    buildTable('famdVars', cols, rows);
  } else if (id === 'mfa') {
    const kk = Math.min(P.k, 4), G = R.grupos.length;
    c.innerHTML = `<h2>${tt('Los bloques')}</h2>
      <p class="hint">${tt('Inercia de cada bloque en cada eje (ninguna pasa de 1) y coeficiente RV entre bloques: cuánta estructura comparten. RV = 0 significa que dos bloques no tienen nada en común.')}</p>
      <div class="table-scroll" id="mfaGrupos"></div>
      <div class="table-scroll" id="mfaRV" style="margin-top:12px"></div>`;
    const cols = [{ key: 'g', label: tt('Bloque') }, { key: 'nv', label: tt('Variables'), num: true }, { key: 'l1', label: 'λ₁ ' + tt('propio'), num: true, fmt: x => fmtNum(x, 3) }];
    for (let j = 0; j < kk; j++) cols.push({ key: 'c' + j, label: 'Dim' + (j + 1), num: true, fmt: x => fmtNum(x, 3) });
    buildTable('mfaGrupos', cols, R.grupos.map((g, i) => { const o = { g: g.nombre, nv: g.nVar, l1: g.lambda1 }; for (let j = 0; j < kk; j++) o['c' + j] = R.inerciaGrupo[i][j]; return o; }));
    const rcols = [{ key: 'g', label: 'RV' }].concat(R.grupos.map((g, j) => ({ key: 'x' + j, label: g.nombre, num: true, fmt: x => fmtNum(x, 3) })));
    buildTable('mfaRV', rcols, R.grupos.map((g, i) => { const o = { g: g.nombre }; for (let j = 0; j < G; j++) o['x' + j] = R.RV[i][j]; return o; }));
  }
};

/* ============================================================
   Enganches
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  if (!el('metodoCards')) return;
  state.metodo = state.metodo || 'pca';
  if (typeof I18N !== 'undefined') I18N.onChange.push(() => {
    if (state.columns && el('resultsWrap') && el('resultsWrap').style.display !== 'none') Metodo.renderRecomendador();
    if (state.pca && state.pca.method && state.pca.method !== 'pca') Metodo.renderBloque2(state.pca);
  });
});

if (typeof window !== 'undefined') window.Metodo = Metodo;

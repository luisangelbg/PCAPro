/* PCAPro — análisis de componentes principales en el navegador.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it
   under the terms of the GNU General Public License as published by the Free
   Software Foundation, either version 3 of the License, or (at your option)
   any later version. This program is distributed WITHOUT ANY WARRANTY; see
   the GNU General Public License for more details. You should have received
   a copy of the License along with this program; if not, see
   <https://www.gnu.org/licenses/>. */

/* PCAPro — informe automático y empaquetado de resultados.
   Incluye un escritor ZIP mínimo (método "store", sin compresión) para no
   depender de ninguna librería externa. */

const Rep = {};

/* ================= ZIP ================= */
let CRC_TABLE = null;
function crcTable() {
  if (CRC_TABLE) return CRC_TABLE;
  CRC_TABLE = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    CRC_TABLE[n] = c >>> 0;
  }
  return CRC_TABLE;
}
function crc32(buf) {
  const T = crcTable();
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ T[(crc ^ buf[i]) & 0xFF];
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

/* entries: [{name, data:Uint8Array}] → Blob */
Rep.zip = entries => {
  const enc = new TextEncoder();
  const parts = [], central = [];
  let offset = 0;
  const now = new Date();
  const dosTime = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xFFFF;
  const dosDate = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xFFFF;

  entries.forEach(e => {
    const nb = enc.encode(e.name);
    const crc = crc32(e.data);
    const lh = new Uint8Array(30 + nb.length);
    const dv = new DataView(lh.buffer);
    dv.setUint32(0, 0x04034b50, true);
    dv.setUint16(4, 20, true);
    dv.setUint16(6, 0x0800, true);          // nombres en UTF-8
    dv.setUint16(8, 0, true);               // sin compresión
    dv.setUint16(10, dosTime, true);
    dv.setUint16(12, dosDate, true);
    dv.setUint32(14, crc, true);
    dv.setUint32(18, e.data.length, true);
    dv.setUint32(22, e.data.length, true);
    dv.setUint16(26, nb.length, true);
    dv.setUint16(28, 0, true);
    lh.set(nb, 30);
    parts.push(lh, e.data);

    const ch = new Uint8Array(46 + nb.length);
    const cv = new DataView(ch.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, dosTime, true);
    cv.setUint16(14, dosDate, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, e.data.length, true);
    cv.setUint32(24, e.data.length, true);
    cv.setUint16(28, nb.length, true);
    cv.setUint32(42, offset, true);
    ch.set(nb, 46);
    central.push(ch);
    offset += lh.length + e.data.length;
  });

  const cdSize = central.reduce((s, c) => s + c.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, offset, true);
  return new Blob([...parts, ...central, eocd], { type: 'application/zip' });
};
Rep.text = s => new TextEncoder().encode(s);
Rep.blobBytes = blob => blob.arrayBuffer().then(b => new Uint8Array(b));

/* ================= utilidades de tabla ================= */
/* La referencia vive aquí y en CITATION.cff; al publicarse el artículo hay que
   actualizar las dos. El DOI de concepto apunta siempre a la última versión. */
Rep.CITATION = {
  apa: 'Barrera-Guzmán, L. Á. (2026). <i>PCAPro: an offline, browser-based platform for guided ' +
       'principal component analysis</i> (versión 1.0.1) [software]. Zenodo. ' +
       'https://doi.org/10.5281/zenodo.22649709',
  bibtex: [
    '@software{pcapro,',
    '  author    = {Barrera-Guzm\u00e1n, Luis \u00c1ngel},',
    '  title     = {{PCAPro}: an offline, browser-based platform for guided principal component analysis},',
    '  year      = {2026},',
    '  version   = {1.0.1},',
    '  publisher = {Zenodo},',
    '  doi       = {10.5281/zenodo.22649709},',
    '  url       = {https://github.com/luisangelbg/PCAPro}',
    '}',
  ].join('\n'),
};

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function htmlTable(caption, header, rows, opts) {
  opts = opts || {};
  /* envuelta en un contenedor con desplazamiento: las tablas anchas no deben
     desbordar la página en pantallas estrechas (tabletas) */
  let h = '<div class="tw"><table><caption>' + esc(caption) + '</caption><thead><tr>';
  header.forEach((c, i) => h += `<th${opts.num && opts.num.includes(i) ? ' class="num"' : ''}>${esc(c)}</th>`);
  h += '</tr></thead><tbody>';
  rows.forEach(r => {
    h += '<tr>';
    r.forEach((c, i) => h += `<td${opts.num && opts.num.includes(i) ? ' class="num"' : ''}>${opts.raw ? (c ?? '') : esc(c)}</td>`);
    h += '</tr>';
  });
  return h + '</tbody></table></div>';
}
function figBlock(api, caption) {
  const svg = Fig.serialize(api.svg).replace(/^<\?xml[^>]*\?>\s*/, '');
  return `<figure class="fig">${svg}<figcaption>${esc(caption || api.title)}</figcaption></figure>`;
}

/* ================= construcción del informe ================= */
Rep.build = opts => {
  const P = state.pca, R = state.rot, G = state.fac, I = state.interp, D = state.diagnostics;
  /* El informe nacio para el ACP. Cuando el metodo es otro, cambian cuatro
     cosas: no hay Horn ni baston roto, no hay rotacion, las coordenadas no
     son de variables sino de filas o categorias, y la interpretacion viene de
     interpreta.js. Todo lo demas —portada, plantilla, figuras, referencias—
     se reusa tal cual. */
  const esOtroMetodo = !!(P && P.method && P.method !== 'pca');
  const MET = esOtroMetodo ? TT(Metodo.NOMBRE[P.method][0], Metodo.NOMBRE[P.method][1]) : tt('Análisis de Componentes Principales');
  const SIG = esOtroMetodo ? TT(Metodo.SIGLA[P.method][0], Metodo.SIGLA[P.method][1]) : 'ACP';
  const ejeLab = i => esOtroMetodo ? 'Dim' + (i + 1) : cp(i + 1);

  const figs = Fig.mounted();
  const figOf = id => figs.find(f => f.hostId === id);
  const inc = s => opts.sections.includes(s);
  const fecha = new Date().toLocaleString(TT('es-MX', 'en-GB'), { dateStyle: 'long', timeStyle: 'short' });
  let nFig = 0, nTab = 0;
  const F = () => TT(`Figura ${++nFig}. `, `Figure ${nFig}. `);
  const T = () => TT(`Tabla ${++nTab}. `, `Table ${nTab}. `);
  let body = '';

  /* --- portada --- */
  body += `<header class="cover">
    <h1>${esc(opts.title || MET)}</h1>
    ${opts.author ? `<p class="author">${esc(opts.author)}</p>` : ''}
    <p class="meta">
      ${TT('Archivo de datos:', 'Data file:')} <b>${esc(state.fileName || '—')}</b>${state.sheetName ? TT(' · hoja <b>', ' · sheet <b>') + esc(state.sheetName) + '</b>' : ''}<br>
      ${esOtroMetodo
        ? TT(`${SIG} · ${P.n} ${P.method === 'ca' ? 'filas' : 'individuos'} × ${P.p} ${P.method === 'mca' ? 'categorías' : 'columnas'} · ${P.k} eje${P.k > 1 ? 's' : ''} retenido${P.k > 1 ? 's' : ''}`,
             `${SIG} · ${P.n} ${P.method === 'ca' ? 'rows' : 'individuals'} × ${P.p} ${P.method === 'mca' ? 'categories' : 'columns'} · ${P.k} retained ${P.k > 1 ? 'axes' : 'axis'}`)
        : TT(`${P.n} observaciones × ${P.p} variables activas · ${P.k} componente${P.k > 1 ? 's' : ''} retenido${P.k > 1 ? 's' : ''}`,
           `${P.n} observations × ${P.p} active variables · ${P.k} retained component${P.k > 1 ? 's' : ''}`)}<br>
      ${TT(`Generado el ${fecha} con PCAPro`, `Generated on ${fecha} with PCAPro`)}
    </p>
  </header>`;

  /* --- resumen --- */
  if (inc('resumen')) {
    body += '<section><h2>' + tt('Resumen') + '</h2><div class="tiles">';
    const tiles = esOtroMetodo ? (() => {
      const t = [['Método', SIG],
        [P.method === 'ca' ? 'Filas' : 'Individuos', P.n],
        [P.method === 'mca' ? 'Categorías' : 'Columnas', P.p],
        ['Ejes retenidos', P.k],
        ['Inercia representada', fmtPct(P.cum[P.k - 1], 1)]];
      if (P.method === 'ca') t.push(['χ²', fmtNum(P.res.chi2.chi2, 2)], ['p', fmtPLabel(P.res.chi2.p)]);
      if (P.method === 'mfa') t.push(['Bloques', P.res.grupos.length]);
      return t;
    })() : (() => {
      const t = [
        ['Observaciones', P.n], ['Variables activas', P.p],
        ['Componentes retenidos', P.k],
        ['Varianza explicada', fmtPct(P.cum[P.k - 1], 1)],
        ['KMO', D && D.kmo ? fmtNum(D.kmo.overall, 3) : '—'],
        ['Bartlett', D ? fmtPLabel(D.bart.p) : '—'],
      ];
      if (I && I.res) t.push(['RMSR', fmtNum(I.res.rmsr, 4)]);
      return t;
    })();
    tiles.forEach(([a, b]) => body += `<div class="tile"><span>${esc(tt(a))}</span><b>${esc(b)}</b></div>`);
    body += '</div></section>';
  }

  /* --- métodos --- */
  if (inc('metodos') && esOtroMetodo) {
    body += '<section><h2>' + tt('Métodos') + '</h2><p>' + Interp.parrafoMetodos(P) + '</p></section>';
  } else if (inc('metodos')) {

    const escal = tt({ none: 'sin escalar (matriz de covarianzas)', center: 'solo centrado', z: 'estandarización z (matriz de correlaciones)', pareto: 'escalado de Pareto', vast: 'escalado VAST', range: 'escalado al rango [0,1]', robust: 'escalado robusto (mediana/MAD)' }[state.prep.scaling]);
    const trans = tt({ none: 'sin transformación previa', log: 'logaritmo natural', log10: 'logaritmo base 10', sqrt: 'raíz cuadrada', inverse: 'inversa' }[state.prep.transform]);
    const falt = tt({ listwise: 'eliminación de filas incompletas', mean: 'imputación por la media', median: 'imputación por la mediana' }[state.prep.missing]);
    const rotName = R ? esc(tt(Rot.methods[R.method].name).toLowerCase()) : '';
    body += `<section><h2>${tt('Métodos')}</h2><p>` + TT(`
      Se analizaron <b>${P.n}</b> observaciones y <b>${P.p}</b> variables cuantitativas
      (${esc(state.activeVars.join(', '))}) mediante análisis de componentes principales.
      Los datos faltantes se trataron por ${falt}${state.rawRows.length !== P.n ? `, lo que redujo la muestra de ${state.rawRows.length} a ${P.n} casos` : ''}.
      Se aplicó ${trans} y ${escal}.
      ${D ? `La adecuación muestral se verificó con el índice de Kaiser–Meyer–Olkin (KMO = ${fmtNum(D.kmo ? D.kmo.overall : NaN, 3)})
      y la prueba de esfericidad de Bartlett (χ²(${D.bart.df}) = ${fmtNum(D.bart.chi2, 1)}, ${fmtPLabel(D.bart.p)}).` : ''}
      El número de componentes se decidió combinando el análisis paralelo de Horn
      (${P.horn.B} matrices ${P.horn.method === 'perm' ? 'generadas por permutación de los datos observados' : 'de datos normales aleatorios'}, percentil 95),
      el criterio de Kaiser, el bastón roto, el criterio MAP de Velicer y el gráfico de sedimentación.
      ${R && R.method !== 'none' ? `Sobre los ${P.k} componentes retenidos se aplicó una rotación
        <b>${rotName}</b>${R.opts.normalize ? ' con normalización de Kaiser' : ''}.` : 'No se aplicó rotación.'}
      ${I ? `Se interpretaron las cargas con |r| ≥ ${I.thr}.` : ''}
      Todos los cálculos se realizaron en PCAPro (Barrera-Guzmán, 2026), que implementa la
      descomposición espectral por rotaciones de Jacobi y las rotaciones factoriales por el
      algoritmo de proyección de gradiente.
    `, `
      <b>${P.n}</b> observations and <b>${P.p}</b> quantitative variables
      (${esc(state.activeVars.join(', '))}) were analysed by principal component analysis.
      Missing data were handled by ${falt}${state.rawRows.length !== P.n ? `, which reduced the sample from ${state.rawRows.length} to ${P.n} cases` : ''}.
      Preprocessing: ${trans}; ${escal}.
      ${D ? `Sampling adequacy was checked with the Kaiser–Meyer–Olkin index (KMO = ${fmtNum(D.kmo ? D.kmo.overall : NaN, 3)})
      and Bartlett's test of sphericity (χ²(${D.bart.df}) = ${fmtNum(D.bart.chi2, 1)}, ${fmtPLabel(D.bart.p)}).` : ''}
      The number of components was decided by combining Horn's parallel analysis
      (${P.horn.B} matrices ${P.horn.method === 'perm' ? 'generated by permuting the observed data' : 'of random normal data'}, 95th percentile),
      the Kaiser criterion, the broken stick, Velicer's MAP criterion and the scree plot.
      ${R && R.method !== 'none' ? `A <b>${rotName}</b> rotation was then applied to the ${P.k} retained components${R.opts.normalize ? ', with Kaiser normalisation' : ''}.` : 'No rotation was applied.'}
      ${I ? `Loadings with |r| ≥ ${I.thr} were interpreted.` : ''}
      All computations were carried out in PCAPro (Barrera-Guzmán, 2026), which implements the
      spectral decomposition by Jacobi rotations and the factor rotations by the gradient
      projection algorithm.
    `) + `</p></section>`;
  }

  /* --- bloque 1 --- */
  if (inc('datos') && D) {
    body += '<section><h2>' + tt('Preparación de los datos y verificación de supuestos') + '</h2>';
    body += htmlTable(T() + tt('Estadísticos descriptivos de las variables activas.'),
      ['Variable', 'n', 'Media', 'DE', 'Mínimo', 'Máximo', 'Asimetría', 'Curtosis', 'MSA'].map(tt),
      state.activeVars.map((v, i) => {
        const c = state.columns.find(x => x.name === v);
        return [v, c.n, fmtNum(c.mean, 3), fmtNum(c.sd, 3), fmtNum(c.min, 3), fmtNum(c.max, 3),
          fmtNum(c.skew, 2), fmtNum(c.kurt, 2), D.kmo ? fmtNum(D.kmo.msa[i], 3) : '—'];
      }), { num: [1, 2, 3, 4, 5, 6, 7, 8] });
    const si = tt('Sí'), no = tt('No'), rev = tt('Revisar');
    body += htmlTable(T() + tt('Verificación de los supuestos del ACP.'),
      ['Criterio', 'Valor', 'Referencia', 'Cumple'].map(tt),
      [
        [tt('Razón n:p'), d3(D.ratio) + ':1', tt('≥ 5:1, idealmente 10:1'), D.ratio >= 5 ? si : no],
        [tt('Tamaño de muestra'), String(D.n), '≥ 100', D.n >= 100 ? si : tt('Marginal')],
        [tt('KMO global'), D.kmo ? fmtNum(D.kmo.overall, 3) : '—', '≥ 0.60', D.kmo && D.kmo.overall >= 0.6 ? si : no],
        ['Bartlett', `χ²(${D.bart.df}) = ${fmtNum(D.bart.chi2, 1)}, ${fmtPLabel(D.bart.p)}`, 'p < 0.05', D.bart.p < 0.05 ? si : no],
        [tt('Determinante de R'), D.det.toExponential(2), '> 10⁻⁵', D.det > 1e-5 ? si : no],
        [tt('|r| media'), fmtNum(D.meanAbsR, 3), '≥ 0.30', D.meanAbsR >= 0.3 ? si : no],
        [tt('Pares con |r| ≥ 0.90'), String(D.redundant.length), '0', D.redundant.length === 0 ? si : rev],
        [tt('Atípicos multivariantes'), D.mOut ? String(D.mOut.length) : '—', 'D² < χ²₀.₉₉₉', D.mOut && !D.mOut.length ? si : rev],
        [tt('Datos faltantes'), fmtPct(D.missPct, 2), '< 5 %', D.missPct < 0.05 ? si : rev],
      ], { num: [] });
    if (opts.figures) ['figMissing', 'figScales', 'figHist', 'figCorr', 'figBox'].forEach(id => {
      const f = figOf(id); if (f) body += figBlock(f, F() + tt(f.cfg.title));
    });
    body += '</section>';
  }

  /* --- bloque 2 --- */
  if (inc('extraccion') && esOtroMetodo) {
    body += '<section><h2>' + tt('Extracción de ejes') + '</h2>';
    const colsAdj = P.method === 'mca';
    body += htmlTable(T() + tt('Valores propios e inercia.'),
      [tt('Eje'), 'λ', tt('% inercia'), tt('% acumulado')].concat(colsAdj ? [tt('% ajustado (Greenacre)')] : []).concat([tt('Retenido')]),
      P.values.map((l, i) => [ejeLab(i), fmtNum(l, 4), fmtPct(P.pct[i], 2), fmtPct(P.cum[i], 2)]
        .concat(colsAdj ? [P.res.ajuste.pctGreenacre[i] != null ? fmtPct(P.res.ajuste.pctGreenacre[i], 2) : '—'] : [])
        .concat([i < P.k ? tt('Sí') : ''])),
      { num: [1, 2, 3, 4] });
    body += htmlTable(T() + tt('Número de ejes sugerido por cada criterio.'),
      [tt('Criterio'), tt('Ejes'), tt('Inercia acumulada')].map(tt),
      P.criteria.map(c => [tt(c.name), String(c.k), fmtPct(P.cum[c.k - 1], 1)]), { num: [1, 2] });
    body += '<p class="note">' + TT(
      `Horn y el MAP de Velicer no se aplican aquí: están definidos para matrices de correlaciones y en este método lo que se compara son inercias. Decisión adoptada: <b>${P.k}</b> eje${P.k > 1 ? 's' : ''} (consenso: ${P.kRec}), que representan el <b>${fmtPct(P.cum[P.k - 1], 1)}</b> de la inercia total.`,
      `Horn and Velicer's MAP do not apply here: they are defined for correlation matrices and this method compares inertias. Decision taken: <b>${P.k}</b> ${P.k > 1 ? 'axes' : 'axis'} (consensus: ${P.kRec}), representing <b>${fmtPct(P.cum[P.k - 1], 1)}</b> of the total inertia.`) + '</p>';
    if (opts.figures) { const f = figOf('figScreeM'); if (f) body += figBlock(f, F() + tt(f.cfg.title)); }
    body += '</section>';
  } else if (inc('extraccion')) {
    body += '<section><h2>' + tt('Extracción de componentes') + '</h2>';

    body += htmlTable(T() + tt('Valores propios y varianza explicada.'),
      ['Componente', 'λ', '% varianza', '% acumulado', 'p95 aleatorio', 'Bastón roto', 'Retenido'].map(tt),
      P.values.map((l, i) => [cp(i + 1), fmtNum(l, 4), fmtPct(P.pct[i], 2), fmtPct(P.cum[i], 2),
        fmtNum(P.horn.p95[i], 3), fmtNum(P.bstick[i], 3), i < P.k ? tt('Sí') : '']),
      { num: [1, 2, 3, 4, 5] });
    body += htmlTable(T() + tt('Número de componentes sugerido por cada criterio.'),
      ['Criterio', 'Componentes', 'Varianza acumulada'].map(tt),
      P.criteria.map(c => [tt(c.name), String(c.k), fmtPct(P.cum[c.k - 1], 1)]), { num: [1, 2] });
    body += `<p class="note">` + TT(`Decisión adoptada: <b>${P.k}</b> componente${P.k > 1 ? 's' : ''}
      (consenso ponderado de los criterios: ${P.kRec}), que explican el <b>${fmtPct(P.cum[P.k - 1], 1)}</b>
      de la varianza total.`,
      `Decision taken: <b>${P.k}</b> component${P.k > 1 ? 's' : ''}
      (weighted consensus of the criteria: ${P.kRec}), explaining <b>${fmtPct(P.cum[P.k - 1], 1)}</b>
      of the total variance.`) + `</p>`;
    if (opts.figures) ['figScree', 'figParallel', 'figCum', 'figCriteria'].forEach(id => {
      const f = figOf(id); if (f) body += figBlock(f, F() + tt(f.cfg.title));
    });
    body += '</section>';
  }

  /* --- bloque 3 --- */
  if (inc('rotacion') && R) {
    body += '<section><h2>' + tt('Rotación') + '</h2>';
    body += `<p>` + TT(`Método: <b>${esc(tt(Rot.methods[R.method].name))}</b>${R.opts.normalize && R.method !== 'none' ? ', con normalización de Kaiser' : ''}.
      Estructura simple: ${R.diag.clean} de ${state.activeVars.length} variables con carga limpia,
      ${R.diag.cross} carga(s) cruzada(s), complejidad media de Hofmann = ${fmtNum(R.diag.meanComplexity, 2)}.`,
      `Method: <b>${esc(tt(Rot.methods[R.method].name))}</b>${R.opts.normalize && R.method !== 'none' ? ', with Kaiser normalisation' : ''}.
      Simple structure: ${R.diag.clean} of ${state.activeVars.length} variables with a clean loading,
      ${R.diag.cross} cross-loading(s), mean Hofmann complexity = ${fmtNum(R.diag.meanComplexity, 2)}.`) + `</p>`;
    body += htmlTable(T() + tt(R.oblique ? 'Matriz de patrón' : 'Matriz de cargas rotadas') +
      TT(` (se destacan |carga| ≥ ${R.thr}).`, ` (|loading| ≥ ${R.thr} highlighted).`),
      ['Variable', ...R.labels, 'Comunalidad', 'Complejidad'].map(tt),
      state.activeVars.map((v, i) => [v,
        ...R.pattern[i].map(x => Math.abs(x) >= R.thr ? `<b>${fmtNum(x, 3)}</b>` : fmtNum(x, 3)),
        fmtNum(R.diag.comm[i], 3), fmtNum(R.diag.complexity[i], 2)]),
      { raw: true, num: R.labels.map((_, j) => j + 1).concat([R.labels.length + 1, R.labels.length + 2]) });
    body += htmlTable(T() + tt('Varianza por componente antes y después de la rotación.'),
      ['Componente', 'SS sin rotar', '% sin rotar', 'SS rotada', '% rotado'].map(tt),
      R.labels.map((l, j) => [l, fmtNum(R.ssBefore[j], 4), fmtPct(R.ssBefore[j] / P.total, 2),
        fmtNum(R.diag.ss[j], 4), fmtPct(R.diag.ss[j] / P.total, 2)]), { num: [1, 2, 3, 4] });
    if (R.oblique) body += htmlTable(T() + tt('Correlaciones entre los componentes (Φ).'),
      ['', ...R.labels], R.labels.map((l, i) => [l, ...R.Phi[i].map(x => fmtNum(x, 3))]),
      { num: R.labels.map((_, j) => j + 1) });
    if (opts.figures) ['figLoadHeat', 'figLoadPlane', 'figLoadBars', 'figVarCompare'].forEach(id => {
      const f = figOf(id); if (f) body += figBlock(f, F() + tt(f.cfg.title));
    });
    body += '</section>';
  }

  /* --- bloque 4 --- */
  if (inc('mapas') && esOtroMetodo) {
    body += '<section><h2>' + tt('Representación factorial') + '</h2>';
    const RR = P.res, kk = P.k;
    const encabezado = P.method === 'ca' ? tt('Columna') : P.method === 'mca' ? tt('Categoría') : tt('Variable');
    body += htmlTable(T() + tt('Coordenadas, calidad de representación y contribución.'),
      [encabezado].concat(Array.from({ length: kk }, (_, j) => tt('Coord.') + ' Dim' + (j + 1)),
        Array.from({ length: kk }, (_, j) => 'cos² Dim' + (j + 1)),
        Array.from({ length: kk }, (_, j) => tt('Contrib.') + ' Dim' + (j + 1) + ' (%)')),
      P.labelsCol.map((v, j) => [v].concat(
        RR.colCoord[j].slice(0, kk).map(x => fmtNum(x, 3)),
        RR.colCos2[j].slice(0, kk).map(x => fmtNum(x, 3)),
        RR.colContrib[j].slice(0, kk).map(x => fmtNum(x, 2)))),
      { num: Array.from({ length: 3 * kk }, (_, j) => j + 1) });
    if (P.method === 'ca') {
      const celdas = [];
      RR.tabla.forEach((fila, i) => fila.forEach((v, j) => celdas.push({ f: RR.filas[i], c: RR.cols[j], o: v, e: RR.celdas[i][j].esp, r: RR.celdas[i][j].resid, ct: RR.celdas[i][j].contrib })));
      celdas.sort((a, b) => b.ct - a.ct);
      body += htmlTable(T() + tt('Celdas que más contribuyen a la χ².'),
        [tt('Fila'), tt('Columna'), tt('Observado'), tt('Esperado'), tt('Residuo'), tt('% de la χ²')],
        celdas.slice(0, 15).map(x => [x.f, x.c, String(x.o), fmtNum(x.e, 1), fmtNum(x.r, 2), fmtNum(x.ct, 1)]),
        { num: [2, 3, 4, 5] });
    }
    if (P.method === 'mfa') {
      body += htmlTable(T() + tt('Inercia de cada bloque en cada eje y coeficiente RV entre bloques.'),
        [tt('Bloque'), tt('Variables')].concat(Array.from({ length: kk }, (_, j) => 'Dim' + (j + 1)), RR.grupos.map(g => 'RV ' + g.nombre)),
        RR.grupos.map((g, i) => [g.nombre, String(g.nVar)].concat(
          RR.inerciaGrupo[i].slice(0, kk).map(x => fmtNum(x, 3)), RR.RV[i].map(x => fmtNum(x, 3)))),
        { num: Array.from({ length: kk + RR.grupos.length + 1 }, (_, j) => j + 1) });
    }
    if (opts.figures) ['figCaSim', 'figCat', 'figEta', 'figCircM', 'figGrupos', 'figIndM', 'figParc'].forEach(id => {
      const f = figOf(id); if (f) body += figBlock(f, F() + tt(f.cfg.title));
    });
    body += '</section>';
  } else if (inc('mapas') && G) {

    body += '<section><h2>' + tt('Representación factorial') + '</h2>';
    body += htmlTable(T() + tt('Coordenadas, calidad de representación y contribución de las variables.'),
      [tt('Variable'), ...G.labels.map(l => tt('Coord.') + ' ' + l), ...G.labels.map(l => 'cos² ' + l), ...G.labels.map(l => tt('Contrib.') + ' ' + l + ' (%)')],
      state.activeVars.map((v, i) => [v, ...G.coordVar[i].map(x => fmtNum(x, 3)),
        ...G.cos2Var[i].map(x => fmtNum(x, 3)), ...G.contribVar[i].map(x => fmtNum(x, 2))]),
      { num: Array.from({ length: 3 * G.k }, (_, j) => j + 1) });
    if (G.suppQuant.length) body += htmlTable(T() + tt('Variables cuantitativas suplementarias (correlación con cada eje).'),
      [tt('Variable'), 'n', ...G.labels], G.suppQuant.map(s => [s.name, String(s.nValid), ...s.coord.map(x => fmtNum(x, 3))]),
      { num: Array.from({ length: G.k + 1 }, (_, j) => j + 1) });
    if (G.suppCat.length) {
      const rows = [];
      G.suppCat.forEach(sc => sc.levels.forEach(lv => rows.push([sc.name, lv.level, String(lv.n), ...lv.coord.map(x => fmtNum(x, 3))])));
      body += htmlTable(T() + tt('Centroides de las categorías sobre los ejes.'),
        [tt('Variable'), tt('Categoría'), 'n', ...G.labels], rows, { num: Array.from({ length: G.k + 1 }, (_, j) => j + 2) });
    }
    if (opts.figures) ['figCircle', 'figInd', 'figBiplot', 'figContrib', 'figCos2'].forEach(id => {
      const f = figOf(id); if (f) body += figBlock(f, F() + tt(f.cfg.title));
    });
    body += '</section>';
  }

  /* --- bloque 5 --- */
  if (inc('interpretacion') && I && esOtroMetodo) {
    body += '<section><h2>' + tt('Interpretación') + '</h2>';
    body += '<h3>' + tt('Lectura de cada eje') + '</h3><dl class="interp">';
    I.ejes.forEach((e, d2) => {
      const fu = e.items.filter(x => x.ctr >= I.umbralCtr);
      const pos = fu.filter(x => x.valor > 0), neg = fu.filter(x => x.valor < 0);
      body += `<dt>${esc(e.dim)} — ${TT('«', '“')}${esc(I.names[d2] || '')}${TT('»', '”')} (${fmtPct(P.pct[d2], 1)})</dt><dd>` +
        (pos.length ? TT('Lado positivo: ', 'Positive side: ') + pos.slice(0, 6).map(x => esc(x.name) + ' (' + fmtNum(x.ctr, 1) + ' %)').join(', ') + '. ' : '') +
        (neg.length ? TT('Lado negativo: ', 'Negative side: ') + neg.slice(0, 6).map(x => esc(x.name) + ' (' + fmtNum(x.ctr, 1) + ' %)').join(', ') + '. ' : '') +
        (!fu.length ? TT('Ningún elemento supera el umbral de contribución. ', 'No element exceeds the contribution threshold. ') : '') + '</dd>';
    });
    body += '</dl>';
    if (I.cat.length) body += htmlTable(T() + tt('Valores test de las categorías (|v| ≥ 1.96 indica p < 0.05).'),
      [tt('Variable'), tt('Categoría'), 'n'].concat(Array.from({ length: P.k }, (_, j) => 'v.test Dim' + (j + 1))),
      I.cat.map(r => [r.variable, r.level, String(r.n)].concat(
        r.vtest.map(v => Math.abs(v) >= 1.96 ? `<b>${fmtNum(v, 2)}</b>` : fmtNum(v, 2)))),
      { raw: true, num: Array.from({ length: P.k + 1 }, (_, j) => j + 2) });
    body += '<h3>' + tt('Borrador de la sección de resultados') + '</h3><blockquote>' +
      esc(el('interpNarr') ? el('interpNarr').textContent : '') + '</blockquote>';
    body += '</section>';
  } else if (inc('interpretacion') && I) {

    body += '<section><h2>' + tt('Interpretación') + '</h2>';
    body += '<h3>' + tt('Lectura de cada componente') + '</h3><dl class="interp">';
    G.labels.forEach((lab, d) => {
      const fuertes = I.quant[d].items.filter(x => Math.abs(x.r) >= I.thr);
      const pos = fuertes.filter(x => x.r > 0), neg = fuertes.filter(x => x.r < 0);
      body += `<dt>${esc(lab)} — ${TT('«', '“')}${esc(I.names[d] || '')}${TT('»', '”')} (${fmtPct(G.pct[d], 1)})</dt><dd>` +
        (pos.length ? TT(`Cargas positivas: `, `Positive loadings: `) + `${pos.map(x => esc(x.name) + ' (' + fmtNum(x.r, 2) + ')').join(', ')}. ` : '') +
        (neg.length ? TT(`Cargas negativas: `, `Negative loadings: `) + `${neg.map(x => esc(x.name) + ' (' + fmtNum(x.r, 2) + ')').join(', ')}. ` : '') +
        (!fuertes.length ? TT(`Ninguna variable alcanza |r| ≥ ${I.thr}. `, `No variable reaches |r| ≥ ${I.thr}. `) : '') +
        (I.cmp && I.cmp[d] && I.cmp[d].anova
          ? TT(`Comparación entre grupos de ${esc(I.groupVar)}: `, `Comparison between groups of ${esc(I.groupVar)}: `) +
            `F(${I.cmp[d].anova.df1}, ${I.cmp[d].anova.df2}) = ${fmtNum(I.cmp[d].anova.F, 2)}, ${fmtPLabel(I.cmp[d].anova.p)}, η² = ${fmtNum(I.cmp[d].anova.eta2, 3)}.` : '') +
        '</dd>';
    });
    body += '</dl>';

    if (I.cat.length) body += htmlTable(T() + tt('Valores test de las categorías (|v| ≥ 1.96 indica p < 0.05).'),
      [tt('Variable'), tt('Categoría'), 'n', ...G.labels.map(l => 'v.test ' + l)],
      I.cat.map(r => [r.variable, r.level, String(r.n),
        ...r.vtest.map(v => Math.abs(v) >= 1.96 ? `<b>${fmtNum(v, 2)}</b>` : fmtNum(v, 2))]),
      { raw: true, num: Array.from({ length: G.k + 1 }, (_, j) => j + 2) });

    if (I.cmp) body += htmlTable(T() + TT(`Comparación de los grupos de ${I.groupVar} sobre cada componente.`,
      `Comparison of the groups of ${I.groupVar} on each component.`),
      [tt('Componente'), 'F', tt('gl'), 'p', 'η²', 'ω²', tt('H de Kruskal–Wallis'), 'p'],
      I.cmp.map(c => [c.label, fmtNum(c.anova.F, 3), `${c.anova.df1}, ${c.anova.df2}`,
        fmtP(c.anova.p), fmtNum(c.anova.eta2, 3), fmtNum(c.anova.omega2, 3),
        fmtNum(c.kruskal.H, 3), fmtP(c.kruskal.p)]), { num: [1, 3, 4, 5, 6, 7] });

    body += `<p class="note">` + TT(`Ajuste del modelo: la solución de ${P.k} componentes reproduce la matriz de
      correlaciones con un RMSR de <b>${fmtNum(I.res.rmsr, 4)}</b>; ${I.res.big} de ${I.res.nPairs}
      residuos superan 0.05 en valor absoluto.`,
      `Model fit: the ${P.k}-component solution reproduces the correlation matrix
      with an RMSR of <b>${fmtNum(I.res.rmsr, 4)}</b>; ${I.res.big} of ${I.res.nPairs}
      residuals exceed 0.05 in absolute value.`) + `</p>`;
    if (opts.figures) ['figDimDesc', 'figVtest', 'figProfile', 'figResid'].forEach(id => {
      const f = figOf(id); if (f) body += figBlock(f, F() + tt(f.cfg.title));
    });
    body += '<h3>' + tt('Borrador de la sección de resultados') + '</h3><blockquote>' +
      esc(el('narrParagraph') ? el('narrParagraph').textContent : '') + '</blockquote>';
    body += '</section>';
  }

  /* --- advertencias --- */
  if (inc('advertencias') && D) {
    const rec = [];
    if (D.ratio < 5) rec.push(tt('La razón n:p es inferior a 5:1; las cargas pueden ser inestables.'));
    if (D.kmo && D.kmo.overall < 0.6) rec.push(TT(`El KMO (${fmtNum(D.kmo.overall, 3)}) está por debajo de 0.60.`, `The KMO (${fmtNum(D.kmo.overall, 3)}) is below 0.60.`));
    if (D.bart.p >= 0.05) rec.push(tt('La prueba de Bartlett no fue significativa.'));
    if (D.redundant.length) rec.push(TT(`Hay ${D.redundant.length} par(es) de variables con |r| ≥ 0.90.`, `There are ${D.redundant.length} pair(s) of variables with |r| ≥ 0.90.`));
    if (D.mOut && D.mOut.length) rec.push(TT(`Se detectaron ${D.mOut.length} atípico(s) multivariante(s).`, `${D.mOut.length} multivariate outlier(s) were detected.`));
    if (D.skewed.length) rec.push(TT(`${D.skewed.length} variable(s) presentan |g₁| > 1.`, `${D.skewed.length} variable(s) show |g₁| > 1.`));
    if (I && I.res && I.res.rmsr >= 0.08) rec.push(TT(`El RMSR (${fmtNum(I.res.rmsr, 3)}) sugiere que falta estructura por recoger.`, `The RMSR (${fmtNum(I.res.rmsr, 3)}) suggests there is structure left uncaptured.`));
    if (I && I.cmp) rec.push(tt('Los contrastes entre grupos son descriptivos: no se corrigió por comparaciones múltiples y los ejes se eligieron por maximizar varianza.'));
    body += '<section><h2>' + tt('Limitaciones y advertencias') + '</h2>' +
      (rec.length ? '<ul>' + rec.map(r => `<li>${esc(r)}</li>`).join('') + '</ul>'
        : '<p>' + tt('No se detectaron problemas relevantes en la verificación de supuestos.') + '</p>') +
      '</section>';
  }

  /* --- referencias --- */
  if (inc('referencias')) {
    body += `<section><h2>${tt('Referencias metodológicas')}</h2><ul class="refs">
      <li>Bartlett, M. S. (1950). Tests of significance in factor analysis. <i>British Journal of Psychology</i>, 3, 77–85.</li>
      <li>Cattell, R. B. (1966). The scree test for the number of factors. <i>Multivariate Behavioral Research</i>, 1, 245–276.</li>
      <li>Hendrickson, A. E. y White, P. O. (1964). Promax: a quick method for rotation to oblique simple structure. <i>British Journal of Statistical Psychology</i>, 17, 65–70.</li>
      <li>Horn, J. L. (1965). A rationale and test for the number of factors in factor analysis. <i>Psychometrika</i>, 30, 179–185.</li>
      <li>Hotelling, H. (1933). Analysis of a complex of statistical variables into principal components. <i>Journal of Educational Psychology</i>, 24, 417–441.</li>
      <li>Jennrich, R. I. (2001, 2002). A simple general procedure for orthogonal / oblique rotation. <i>Psychometrika</i>, 66, 289–306; 67, 7–20.</li>
      <li>Jolliffe, I. T. (2002). <i>Principal Component Analysis</i> (2.ª ed.). Springer.</li>
      <li>Kaiser, H. F. (1958). The varimax criterion for analytic rotation in factor analysis. <i>Psychometrika</i>, 23, 187–200.</li>
      <li>Kassambara, A. (2017). <i>Practical Guide to Principal Component Methods in R</i>. STHDA.</li>
      <li>Lebart, L., Morineau, A. y Piron, M. <i>Statistique exploratoire multidimensionnelle</i>. Dunod.</li>
      <li>Pearson, K. (1901). On lines and planes of closest fit to systems of points in space. <i>Philosophical Magazine</i>, 2, 559–572.</li>
      <li>Velicer, W. F. (1976). Determining the number of components from the matrix of partial correlations. <i>Psychometrika</i>, 41, 321–327.</li>
    </ul></section>`;
  }

  /* --- anexo --- */
  if (inc('anexo')) {
    body += `<section><h2>${tt('Anexo: configuración del análisis')}</h2>` + htmlTable(
      tt('Parámetros utilizados.'), [tt('Parámetro'), tt('Valor')], [
        [tt('Archivo'), state.fileName || '—'],
        [tt('Hoja'), state.sheetName || '—'],
        [tt('Filas del archivo'), String(state.rawRows.length)],
        [tt('Observaciones analizadas'), String(P.n)],
        [tt('Variables activas'), state.activeVars.join(', ')],
        [tt('Cuantitativas suplementarias'), state.suppNum.map(s => s.name).join(', ') || '—'],
        [tt('Cualitativas'), state.suppCat.map(s => s.name).join(', ') || '—'],
        [tt('Datos faltantes'), state.prep.missing],
        [tt('Transformación'), state.prep.transform],
        [tt('Escalado'), state.prep.scaling],
        [esOtroMetodo ? tt('Método') : tt('Componentes retenidos'), esOtroMetodo ? MET : String(P.k)],
        [esOtroMetodo ? tt('Ejes retenidos') : tt('Análisis paralelo'),
          esOtroMetodo ? String(P.k)
            : TT(`${P.horn.B} repeticiones, método ${P.horn.method === 'perm' ? 'permutación' : 'normal'}`,
                 `${P.horn.B} replicates, ${P.horn.method === 'perm' ? 'permutation' : 'normal'} method`)],
        [tt('Rotación'), esOtroMetodo ? TT('no aplica a este método', 'not applicable to this method')
          : (R ? tt(Rot.methods[R.method].name) + (R.opts.normalize && R.method !== 'none' ? tt(' (normalización de Kaiser)') : '') : tt('no aplicada'))],
        [esOtroMetodo ? tt('Umbral de contribución (%)') : tt('Umbral de carga'),
          I ? (esOtroMetodo ? fmtNum(I.umbralCtr, 2) : String(I.thr)) : '—'],
      ]) + '</section>';
  }

  /* --- cómo citar --- */
  body += `<section class="cite"><h2>` + TT('Cómo citar PCAPro', 'How to cite PCAPro') + `</h2>
    <p>` + TT('Si estos resultados se publican, cita el software:',
              'If these results are published, please cite the software:') + `</p>
    <p class="ref">${Rep.CITATION.apa}</p>
    <details><summary>BibTeX</summary><pre>${esc(Rep.CITATION.bibtex)}</pre></details>
  </section>`;

  body += `<footer>` + TT(`Informe generado por <b>PCAPro</b> el ${fecha}. Todos los cálculos se realizaron
    localmente en el navegador; ningún dato salió de este equipo.`,
    `Report generated by <b>PCAPro</b> on ${fecha}. All computations were carried out
    locally in the browser; no data left this machine.`) + `</footer>`;

  return Rep.wrap(opts.title || tt('Análisis de Componentes Principales'), body);
};

function d3(x) { return fmtNum(x, 1); }

/* ================= plantilla HTML ================= */
Rep.wrap = (title, body) => `<!DOCTYPE html>
<html lang="${TT('es', 'en')}"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<style>
  :root { --fg:#1b1f2a; --muted:#5d6675; --line:#d8dde5; --accent:#5b3fd6; }
  * { box-sizing:border-box; }
  body { margin:0; background:#f2f3f7; color:var(--fg);
    font-family:Georgia,"Times New Roman",serif; line-height:1.6; }
  .page { max-width:900px; margin:0 auto; background:#fff; padding:56px 64px 72px;
    box-shadow:0 2px 24px rgba(20,25,40,.09); }
  h1 { font-size:1.9rem; margin:0 0 6px; letter-spacing:-.4px; }
  h2 { font-size:1.3rem; margin:38px 0 10px; padding-bottom:6px; border-bottom:2px solid var(--accent); }
  h3 { font-size:1.05rem; margin:24px 0 8px; }
  p { margin:0 0 12px; text-align:justify; }
  .cover { border-bottom:3px double var(--line); padding-bottom:20px; margin-bottom:8px; }
  .cover .author { font-size:1.02rem; color:var(--muted); margin:2px 0 10px; }
  /* sin justificar: las líneas cortas separadas por <br> quedarían con huecos */
  .cover .meta { font-size:.88rem; color:var(--muted); font-family:system-ui,sans-serif; text-align:left; }
  .note, blockquote, dl.interp dd { text-align:left; }
  .tiles { display:grid; grid-template-columns:repeat(auto-fit,minmax(130px,1fr)); gap:10px; margin:14px 0 4px; }
  .tile { background:#f5f6fa; border-radius:8px; padding:10px 14px; font-family:system-ui,sans-serif; }
  .tile span { display:block; font-size:.68rem; text-transform:uppercase; letter-spacing:.05em; color:var(--muted); }
  .tile b { font-size:1.22rem; }
  table { border-collapse:collapse; width:100%; margin:10px 0 22px; font-size:.82rem;
    font-family:system-ui,sans-serif; }
  caption { caption-side:top; text-align:left; font-size:.83rem; color:var(--fg);
    padding:0 0 6px; font-style:italic; }
  th { border-top:1.4px solid var(--fg); border-bottom:1px solid var(--fg);
    padding:6px 9px; text-align:left; font-weight:600; }
  td { padding:5px 9px; border-bottom:1px solid var(--line); }
  tbody tr:last-child td { border-bottom:1.4px solid var(--fg); }
  td.num, th.num { text-align:right; font-variant-numeric:tabular-nums; }
  .tw { overflow-x:auto; margin-bottom:22px; }
  .tw table { margin-bottom:0; }
  .fig { margin:22px 0 26px; text-align:center; page-break-inside:avoid; }
  .fig svg { max-width:100%; height:auto; }
  figcaption { font-size:.82rem; color:var(--muted); text-align:left; margin-top:8px;
    font-family:system-ui,sans-serif; }
  blockquote { border-left:3px solid var(--accent); background:#f7f6fd; margin:10px 0;
    padding:12px 18px; font-size:.92rem; }
  dl.interp dt { font-weight:700; margin-top:12px; }
  dl.interp dd { margin:2px 0 0 0; font-size:.93rem; }
  .cite .ref { background:#f5f6fa; border-radius:8px; padding:10px 14px; font-size:.9rem;
    text-indent:-1.6em; margin-left:1.6em; }
  .cite pre { background:#f5f6fa; border-radius:8px; padding:10px 14px; font-size:.8rem;
    overflow-x:auto; white-space:pre; }
  .note { background:#f5f6fa; border-radius:8px; padding:10px 14px; font-size:.9rem; }
  ul.refs { font-size:.83rem; } ul.refs li { margin-bottom:5px; }
  footer { margin-top:44px; padding-top:14px; border-top:1px solid var(--line);
    font-size:.78rem; color:var(--muted); font-family:system-ui,sans-serif; }
  @media print {
    body { background:#fff; }
    .page { box-shadow:none; max-width:none; padding:0; }
    h2 { page-break-after:avoid; } table, .fig { page-break-inside:avoid; }
  }
</style></head><body><div class="page">${body}</div></body></html>`;

window.Rep = Rep;

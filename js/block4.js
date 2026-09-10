/* PCAPro — análisis de componentes principales en el navegador.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it
   under the terms of the GNU General Public License as published by the Free
   Software Foundation, either version 3 of the License, or (at your option)
   any later version. This program is distributed WITHOUT ANY WARRANTY; see
   the GNU General Public License for more details. You should have received
   a copy of the License along with this program; if not, see
   <https://www.gnu.org/licenses/>. */

/* PCAPro — Bloque 4: mapas factoriales. */

(function () {

function run() {
  /* Los mapas de los métodos distintos del ACP los dibuja mapas.js; el ACP
     conserva la ruta de abajo. */
  if (typeof Mapas !== 'undefined' && state.pca && state.pca.method && state.pca.method !== 'pca') {
    Mapas.renderBloque4(state.pca);
    return;
  }
  const mp = el('mapasResults');
  if (mp) mp.style.display = 'none';
  if (!state.pca) {
    clearMessages('facMessages');
    showMessage('facMessages', 'error', tt('Primero extrae los componentes en el Bloque 2.'));
    return;
  }
  if (state.pca.k < 2) {
    clearMessages('facMessages');
    showMessage('facMessages', 'warning', tt('Los mapas factoriales necesitan al menos 2 componentes retenidos.'));
    return;
  }
  const btn = el('runFacBtn');
  btn.disabled = true; btn.innerHTML = '<span class="loading"></span> ' + tt('Construyendo mapas…');
  clearMessages('facMessages');
  setTimeout(() => {
    try {
      const useRot = el('facSolution').value === 'rotada';
      state.fac = Fac.build(useRot);
      state.interp = null;
      el('intResults').style.display = 'none';
      if (window.PCAProInterp) PCAProInterp.fillGroups();
      renderBlock4();
      el('facResults').style.display = '';
      enableStep(5, true); enableStep(7, true);
      el('facResults').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      showMessage('facMessages', 'error', TT('Error al construir los mapas: ', 'Error while building the maps: ') + err.message);
      console.error(err);
    }
    btn.disabled = false; btn.textContent = tt('Generar mapas factoriales →');
  }, 30);
}

function currentGroup() {
  const G = state.fac;
  const name = el('facGroup').value;
  if (!name) return null;
  const sc = G.suppCat.find(s => s.name === name);
  if (!sc) return null;
  return { name: sc.name, levels: sc.levels.filter(l => l.n > 0) };
}

function renderBlock4() {
  const G = state.fac;

  /* --- selector de grupo --- */
  const sel = el('facGroup');
  const prev = sel.value;
  sel.innerHTML = '';
  sel.appendChild(mk('option', { value: '' }, 'Sin agrupar'));
  G.suppCat.forEach(s => sel.appendChild(mk('option', { value: s.name }, s.name + ` (${s.levels.length} niveles)`)));
  if (prev && [...sel.options].some(o => o.value === prev)) sel.value = prev;

  /* --- mosaicos --- */
  const q12 = G.coordVar.map(r => r[0] * r[0] + r[1] * r[1]);
  const bienRep = q12.filter(v => v >= 0.5).length;
  const qi = G.cos2Ind[0].map((v, i) => v + G.cos2Ind[1][i]);
  statTiles('facTiles', [
    ['Solución', G.rotated ? tt('Rotada') : tt('Sin rotar'), G.rotated ? tt(Rot.methods[state.rot.method].name.replace(' (oblicua)', '')) : tt('componentes originales')],
    ['Plano 1–2', fmtPct(G.pct[0] + G.pct[1], 1), 'varianza representada',
      (G.pct[0] + G.pct[1]) >= 0.6 ? 'ok' : (G.pct[0] + G.pct[1]) >= 0.45 ? 'warn' : 'bad'],
    ['Variables bien representadas', `${bienRep}/${G.coordVar.length}`, 'cos² ≥ 0.5 en el plano 1–2',
      bienRep / G.coordVar.length >= 0.7 ? 'ok' : 'warn'],
    ['Individuos con cos² ≥ 0.5', `${qi.filter(v => v >= 0.5).length}/${G.n}`, 'bien situados en el plano',
      qi.filter(v => v >= 0.5).length / G.n >= 0.6 ? 'ok' : 'warn'],
    ['Cuanti. suplementarias', G.suppQuant.length, G.suppQuant.length ? 'proyectadas sobre el círculo' : 'ninguna definida'],
    ['Variables de grupo', G.suppCat.length, G.suppCat.length ? 'disponibles para colorear' : 'ninguna definida'],
  ]);

  /* --- tabla de variables --- */
  const vcols = [{ key: 'v', label: 'Variable' }];
  for (let j = 0; j < G.k; j++) vcols.push({ key: 'c' + j, label: tt('Coord.') + ' ' + G.labels[j], num: true, fmt: x => fmtNum(x, 3) });
  vcols.push({ key: 'q', label: 'cos² plano 1–2', num: true, fmt: x => fmtNum(x, 3) });
  vcols.push({ key: 'ct', label: 'Contrib. plano (%)', num: true, fmt: x => fmtNum(x, 2) });
  vcols.push({
    key: 'cal', label: 'Calidad', html: true,
    get: r => r.q >= 0.7 ? '<span class="pill num">' + tt('muy buena') + '</span>'
      : r.q >= 0.5 ? '<span class="pill">' + tt('aceptable') + '</span>'
        : r.q >= 0.3 ? '<span class="pill cat">' + tt('pobre') + '</span>'
          : '<span class="pill off">' + tt('no interpretable') + '</span>',
  });
  buildTable('facVarTable', vcols, state.activeVars.map((v, i) => {
    const o = { v, q: G.coordVar[i][0] ** 2 + G.coordVar[i][1] ** 2, ct: G.contribVar[i][0] + G.contribVar[i][1] };
    for (let j = 0; j < G.k; j++) o['c' + j] = G.coordVar[i][j];
    return o;
  }).sort((a, b) => b.q - a.q));

  /* --- suplementarias --- */
  el('suppBox').style.display = (G.suppQuant.length || G.suppCat.length) ? '' : 'none';
  if (G.suppQuant.length) {
    const scols = [{ key: 'v', label: 'Variable suplementaria' }, { key: 'n', label: 'n válidos', num: true }];
    for (let j = 0; j < G.k; j++) scols.push({ key: 'c' + j, label: tt('r con ') + G.labels[j], num: true, fmt: x => fmtNum(x, 3) });
    scols.push({ key: 'q', label: 'cos² plano', num: true, fmt: x => fmtNum(x, 3) });
    buildTable('suppQuantTable', scols, G.suppQuant.map(s => {
      const o = { v: s.name, n: s.nValid, q: s.cos2[0] + s.cos2[1] };
      for (let j = 0; j < G.k; j++) o['c' + j] = s.coord[j];
      return o;
    }));
    el('suppQuantWrap').style.display = '';
  } else el('suppQuantWrap').style.display = 'none';

  if (G.suppCat.length) {
    const ccols = [{ key: 'v', label: 'Variable' }, { key: 'l', label: 'Categoría' }, { key: 'n', label: 'n', num: true }];
    for (let j = 0; j < G.k; j++) ccols.push({ key: 'c' + j, label: tt('Centroide ') + G.labels[j], num: true, fmt: x => fmtNum(x, 3) });
    const rows = [];
    G.suppCat.forEach(sc => sc.levels.forEach(lv => {
      const o = { v: sc.name, l: lv.level, n: lv.n };
      for (let j = 0; j < G.k; j++) o['c' + j] = lv.coord[j];
      rows.push(o);
    }));
    buildTable('suppCatTable', ccols, rows);
    el('suppCatWrap').style.display = '';
  } else el('suppCatWrap').style.display = 'none';

  /* --- individuos destacados --- */
  const ct12 = G.contribInd[0].map((v, i) => v + G.contribInd[1][i]);
  const top = ct12.map((v, i) => ({ i, v })).sort((a, b) => b.v - a.v).slice(0, 12);
  buildTable('facIndTable', [
    { key: 'id', label: 'Individuo' },
    { key: 'x', label: tt('Coord.') + ' ' + G.labels[0], num: true, fmt: v => fmtNum(v, 3) },
    { key: 'y', label: tt('Coord.') + ' ' + G.labels[1], num: true, fmt: v => fmtNum(v, 3) },
    { key: 'q', label: 'cos² plano', num: true, fmt: v => fmtNum(v, 3) },
    { key: 'c', label: 'Contrib. plano (%)', num: true, fmt: v => fmtNum(v, 2) },
  ], top.map(o => ({
    id: state.rowIds[o.i], x: G.coordInd[0][o.i], y: G.coordInd[1][o.i],
    q: G.cos2Ind[0][o.i] + G.cos2Ind[1][o.i], c: o.v,
  })));
  el('facIndNote').innerHTML =
    TT(`Los 12 individuos que más aportan al plano 1–2. El valor esperado si todos aportaran por igual es ` +
    `<b>${fmtNum(200 / G.n, 2)} %</b> (2 ejes × 100/${G.n}). Un individuo muy por encima de ese valor está ` +
    `<b>tirando de los ejes</b>: comprueba que no sea un error de captura antes de interpretarlo.`,
    `The 12 individuals that contribute most to plane 1–2. The value expected if all contributed equally is ` +
    `<b>${fmtNum(200 / G.n, 2)} %</b> (2 axes × 100/${G.n}). An individual well above that value is ` +
    `<b>pulling the axes</b>: check that it is not a data-entry error before interpreting it.`);

  renderFigures4();
}

/* ============================================================
   Figuras
   ============================================================ */
function renderFigures4() {
  const G = state.fac;
  const base = slug(state.fileName || 'pcapro');
  const paletteOpts = Object.entries(Fig.paletteNames);
  const themeOpts = Object.entries(Fig.themeNames);
  const fontOpts = Object.entries(Fig.fontNames);
  const cmapOpts = Object.entries(Fig.colormapNames);
  const dimOpts = G.labels.map((l, i) => [String(i + 1), l]);
  const grupo = () => currentGroup();
  const sufijo = G.rotated ? '_rotada' : '';

  /* --- círculo de correlaciones --- */
  Fig.mount('figCircle', {
    title: 'Círculo de correlaciones (variables)',
    fileName: base + '_circulo' + sufijo,
    defaults: {
      title: 'Círculo de correlaciones',
      subtitle: TT(`${G.rotated ? 'Solución rotada' : 'Solución sin rotar'} · ${G.n} observaciones`,
        `${G.rotated ? 'Rotated solution' : 'Unrotated solution'} · ${G.n} observations`),
      dimX: '1', dimY: '2', size: 640, limit: 1.06,
      theme: 'claro', font: 'sans', palette: 'pcapro', colormap: 'calor',
      colorBy: 'cos2', singleColor: false, vecColor: '#5b3fd6',
      unitCircle: true, innerCircle: true, showLabels: true, labelSize: 11.5, vecWidth: 2.1,
      minCos2: 0, topN: 0, showSupp: true, suppColor: '#0d9488',
      zeroLines: true, box: false, legend: true, xlab: '', ylab: '', titleSize: 17,
    },
    controls: [
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'subtitle', label: 'Subtítulo', type: 'text' },
      { key: 'dimX', label: 'Eje horizontal', type: 'select', options: dimOpts },
      { key: 'dimY', label: 'Eje vertical', type: 'select', options: dimOpts },
      { key: 'xlab', label: 'Título eje X', type: 'text' },
      { key: 'ylab', label: 'Título eje Y', type: 'text' },
      { key: 'colorBy', label: 'Colorear por', type: 'select', options: [['cos2', 'Calidad (cos²)'], ['contrib', 'Contribución'], ['variable', 'Variable']] },
      { key: 'colormap', label: 'Paleta continua', type: 'select', options: cmapOpts },
      { key: 'palette', label: 'Paleta categórica', type: 'select', options: paletteOpts },
      { key: 'singleColor', label: 'Un solo color', type: 'checkbox' },
      { key: 'vecColor', label: 'Color único', type: 'color' },
      { key: 'minCos2', label: 'Ocultar cos² menor a', type: 'range', min: 0, max: 0.9, step: 0.05 },
      { key: 'topN', label: 'Solo las N mejores (0 = todas)', type: 'number', min: 0, max: 60 },
      { key: 'showSupp', label: 'Suplementarias', type: 'checkbox' },
      { key: 'suppColor', label: 'Color suplementarias', type: 'color' },
      { key: 'unitCircle', label: 'Círculo unitario', type: 'checkbox' },
      { key: 'innerCircle', label: 'Círculo 0.71', type: 'checkbox' },
      { key: 'showLabels', label: 'Etiquetas', type: 'checkbox' },
      { key: 'labelSize', label: 'Tamaño etiqueta', type: 'range', min: 7, max: 20, step: 0.5 },
      { key: 'vecWidth', label: 'Grosor del vector', type: 'range', min: 0.5, max: 5, step: 0.25 },
      { key: 'zeroLines', label: 'Ejes en cero', type: 'checkbox' },
      { key: 'box', label: 'Marco', type: 'checkbox' },
      { key: 'legend', label: 'Leyenda', type: 'checkbox' },
      { key: 'size', label: 'Tamaño (px)', type: 'number', min: 380, max: 1100, step: 20 },
      { key: 'theme', label: 'Tema', type: 'select', options: themeOpts },
      { key: 'font', label: 'Tipografía', type: 'select', options: fontOpts },
    ],
    render: cfg => Plots4.corrCircle(cfg, {
      vars: state.activeVars, coord: G.coordVar, contrib: G.contribVar,
      labels: G.labels, pct: G.pct, supp: G.suppQuant,
    }),
  });

  /* --- mapa de individuos --- */
  Fig.mount('figInd', {
    title: 'Mapa de individuos',
    fileName: base + '_individuos' + sufijo,
    defaults: {
      title: 'Mapa factorial de individuos',
      subtitle: TT(`${G.n} observaciones · ${G.rotated ? 'solución rotada' : 'solución sin rotar'}`,
        `${G.n} observations · ${G.rotated ? 'rotated solution' : 'unrotated solution'}`),
      dimX: '1', dimY: '2', size: 660, pad: 0.08, equalScale: false,
      theme: 'claro', font: 'sans', palette: 'pcapro', colormap: 'calor',
      colorBy: 'grupo', pointColor: '#5b3fd6', pointSize: 4.2, pointOpacity: 0.82,
      pointStroke: true, sizeByCos2: false,
      shape: 'concentracion', level: 0.95, fillOpacity: 0.12, ellipseWidth: 1.6,
      showCentroids: true, centroidLabels: true,
      labelMode: 'ninguna', labelSize: 10, labelTopN: 10,
      zeroLines: true, box: false, legend: true, xlab: '', ylab: '', titleSize: 17,
    },
    controls: [
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'subtitle', label: 'Subtítulo', type: 'text' },
      { key: 'dimX', label: 'Eje horizontal', type: 'select', options: dimOpts },
      { key: 'dimY', label: 'Eje vertical', type: 'select', options: dimOpts },
      { key: 'xlab', label: 'Título eje X', type: 'text' },
      { key: 'ylab', label: 'Título eje Y', type: 'text' },
      { key: 'colorBy', label: 'Colorear por', type: 'select', options: [['grupo', 'Grupo / color fijo'], ['cos2', 'Calidad (cos²)'], ['contrib', 'Contribución']] },
      { key: 'palette', label: 'Paleta de grupos', type: 'select', options: paletteOpts },
      { key: 'colormap', label: 'Paleta continua', type: 'select', options: cmapOpts },
      { key: 'pointColor', label: 'Color sin grupo', type: 'color' },
      { key: 'shape', label: 'Envoltura por grupo', type: 'select', options: [['concentracion', 'Elipse de concentración'], ['media', 'Elipse de confianza de la media'], ['envolvente', 'Envolvente convexa'], ['ninguna', 'Ninguna']] },
      { key: 'level', label: 'Nivel de confianza', type: 'select', options: [['0.9', '90 %'], ['0.95', '95 %'], ['0.99', '99 %']] },
      { key: 'fillOpacity', label: 'Relleno de la elipse', type: 'range', min: 0, max: 0.5, step: 0.02 },
      { key: 'ellipseWidth', label: 'Grosor del borde', type: 'range', min: 0.5, max: 4, step: 0.25 },
      { key: 'showCentroids', label: 'Centroides', type: 'checkbox' },
      { key: 'centroidLabels', label: 'Etiqueta del centroide', type: 'checkbox' },
      { key: 'pointSize', label: 'Tamaño del punto', type: 'range', min: 1.5, max: 10, step: 0.2 },
      { key: 'sizeByCos2', label: 'Tamaño según cos²', type: 'checkbox' },
      { key: 'pointOpacity', label: 'Opacidad', type: 'range', min: 0.15, max: 1, step: 0.05 },
      { key: 'pointStroke', label: 'Borde blanco', type: 'checkbox' },
      { key: 'labelMode', label: 'Etiquetas', type: 'select', options: [['ninguna', 'Ninguna'], ['todas', 'Todas las que quepan'], ['top', 'Solo las N que más contribuyen']] },
      { key: 'labelTopN', label: 'N etiquetas', type: 'number', min: 1, max: 60 },
      { key: 'labelSize', label: 'Tamaño etiqueta', type: 'range', min: 6, max: 18, step: 0.5 },
      { key: 'equalScale', label: 'Misma escala en ambos ejes', type: 'checkbox' },
      { key: 'zeroLines', label: 'Ejes en cero', type: 'checkbox' },
      { key: 'box', label: 'Marco', type: 'checkbox' },
      { key: 'legend', label: 'Leyenda', type: 'checkbox' },
      { key: 'size', label: 'Tamaño (px)', type: 'number', min: 380, max: 1200, step: 20 },
      { key: 'theme', label: 'Tema', type: 'select', options: themeOpts },
      { key: 'font', label: 'Tipografía', type: 'select', options: fontOpts },
    ],
    render: cfg => Plots4.indMap(cfg, {
      coord: G.coordInd, cos2: G.cos2Ind, contrib: G.contribInd,
      ids: state.rowIds, labels: G.labels, pct: G.pct,
      groups: cfg.colorBy === 'grupo' ? grupo() : (grupo() && cfg.shape !== 'ninguna' ? grupo() : null),
    }),
  });

  /* --- biplot --- */
  Fig.mount('figBiplot', {
    title: 'Biplot',
    fileName: base + '_biplot' + sufijo,
    defaults: {
      title: 'Biplot: individuos y variables',
      subtitle: TT(`Plano 1–2 · ${fmtPct(G.pct[0] + G.pct[1], 1)} de la varianza`,
        `Plane 1–2 · ${fmtPct(G.pct[0] + G.pct[1], 1)} of the variance`),
      dimX: '1', dimY: '2', size: 680, arrowScale: 0.8,
      theme: 'claro', font: 'sans', palette: 'pcapro',
      pointColor: '#98a1b3', pointSize: 3.4, pointOpacity: 0.6,
      arrowColor: '#e03131', arrowWidth: 2, showVarLabels: true, labelSize: 11.5,
      shape: 'concentracion', level: 0.95, fillOpacity: 0.1,
      zeroLines: true, box: false, legend: true, xlab: '', ylab: '', titleSize: 17,
    },
    controls: [
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'subtitle', label: 'Subtítulo', type: 'text' },
      { key: 'dimX', label: 'Eje horizontal', type: 'select', options: dimOpts },
      { key: 'dimY', label: 'Eje vertical', type: 'select', options: dimOpts },
      { key: 'xlab', label: 'Título eje X', type: 'text' },
      { key: 'ylab', label: 'Título eje Y', type: 'text' },
      { key: 'arrowScale', label: 'Escala de las flechas', type: 'range', min: 0.2, max: 1.6, step: 0.05 },
      { key: 'arrowColor', label: 'Color de flechas', type: 'color' },
      { key: 'arrowWidth', label: 'Grosor de flechas', type: 'range', min: 0.5, max: 5, step: 0.25 },
      { key: 'showVarLabels', label: 'Nombres de variables', type: 'checkbox' },
      { key: 'labelSize', label: 'Tamaño etiqueta', type: 'range', min: 7, max: 20, step: 0.5 },
      { key: 'palette', label: 'Paleta de grupos', type: 'select', options: paletteOpts },
      { key: 'pointColor', label: 'Color sin grupo', type: 'color' },
      { key: 'pointSize', label: 'Tamaño del punto', type: 'range', min: 1, max: 8, step: 0.2 },
      { key: 'pointOpacity', label: 'Opacidad', type: 'range', min: 0.1, max: 1, step: 0.05 },
      { key: 'shape', label: 'Envoltura por grupo', type: 'select', options: [['concentracion', 'Elipse de concentración'], ['media', 'Elipse de la media'], ['envolvente', 'Envolvente convexa'], ['ninguna', 'Ninguna']] },
      { key: 'level', label: 'Nivel', type: 'select', options: [['0.9', '90 %'], ['0.95', '95 %'], ['0.99', '99 %']] },
      { key: 'fillOpacity', label: 'Relleno', type: 'range', min: 0, max: 0.5, step: 0.02 },
      { key: 'zeroLines', label: 'Ejes en cero', type: 'checkbox' },
      { key: 'box', label: 'Marco', type: 'checkbox' },
      { key: 'legend', label: 'Leyenda', type: 'checkbox' },
      { key: 'size', label: 'Tamaño (px)', type: 'number', min: 380, max: 1200, step: 20 },
      { key: 'theme', label: 'Tema', type: 'select', options: themeOpts },
      { key: 'font', label: 'Tipografía', type: 'select', options: fontOpts },
    ],
    render: cfg => Plots4.biplot(cfg, {
      coord: G.coordInd, coordVar: G.coordVar, vars: state.activeVars,
      labels: G.labels, pct: G.pct, groups: grupo(),
    }),
  });

  /* --- contribuciones --- */
  Fig.mount('figContrib', {
    title: 'Contribuciones',
    fileName: base + '_contribuciones' + sufijo,
    defaults: {
      title: 'Contribución de las variables al eje',
      subtitle: 'La línea roja marca el valor esperado si todas contribuyeran por igual',
      what: 'var', dim: '1', topN: 0,
      theme: 'claro', font: 'sans', palette: 'pcapro', gradient: false,
      barColor: '#5b3fd6', barColorLow: '#c3cad6', expectedColor: '#e03131',
      showExpected: true, showValues: true, outline: false,
      width: 860, xlab: '', titleSize: 17,
    },
    controls: [
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'subtitle', label: 'Subtítulo', type: 'text' },
      { key: 'what', label: 'Elementos', type: 'select', options: [['var', 'Variables'], ['ind', 'Individuos']] },
      { key: 'dim', label: 'Eje', type: 'select', options: dimOpts.concat([['12', 'Plano 1–2']]) },
      { key: 'topN', label: 'Solo los N mayores (0 = todos)', type: 'number', min: 0, max: 100 },
      { key: 'barColor', label: 'Color sobre el umbral', type: 'color' },
      { key: 'barColorLow', label: 'Color bajo el umbral', type: 'color' },
      { key: 'gradient', label: 'Barras multicolor', type: 'checkbox' },
      { key: 'palette', label: 'Paleta', type: 'select', options: paletteOpts },
      { key: 'showExpected', label: 'Línea de referencia', type: 'checkbox' },
      { key: 'expectedColor', label: 'Color referencia', type: 'color' },
      { key: 'showValues', label: 'Mostrar valores', type: 'checkbox' },
      { key: 'outline', label: 'Contorno', type: 'checkbox' },
      { key: 'xlab', label: 'Eje X', type: 'text' },
      { key: 'width', label: 'Ancho (px)', type: 'number', min: 480, max: 1400, step: 20 },
      { key: 'theme', label: 'Tema', type: 'select', options: themeOpts },
      { key: 'font', label: 'Tipografía', type: 'select', options: fontOpts },
    ],
    render: cfg => {
      const isVar = cfg.what === 'var';
      const names = isVar ? state.activeVars : state.rowIds;
      const src = isVar ? G.contribVar : null;
      let values, dimLabel, expected;
      if (cfg.dim === '12') {
        values = isVar
          ? state.activeVars.map((_, i) => (G.contribVar[i][0] * G.axisVar[0] + G.contribVar[i][1] * G.axisVar[1]) / (G.axisVar[0] + G.axisVar[1]))
          : G.contribInd[0].map((v, i) => (v * G.axisVar[0] + G.contribInd[1][i] * G.axisVar[1]) / (G.axisVar[0] + G.axisVar[1]));
        dimLabel = 'el plano ' + G.labels[0] + '–' + G.labels[1];
        expected = 100 / names.length;
      } else {
        const d = +cfg.dim - 1;
        values = isVar ? state.activeVars.map((_, i) => src[i][d]) : G.contribInd[d].slice();
        dimLabel = G.labels[d];
        expected = 100 / names.length;
      }
      return Plots4.contribBars(cfg, { names, values, expected, dimLabel });
    },
  });

  /* --- cos² --- */
  Fig.mount('figCos2', {
    title: 'Calidad de representación (cos²)',
    fileName: base + '_cos2' + sufijo,
    defaults: {
      title: 'Calidad de representación de las variables (cos²)',
      subtitle: 'Proporción de la varianza de cada variable recogida por cada eje',
      theme: 'claro', font: 'sans', colormap: 'viridis', showValues: true,
      sortRows: true, sortBy: 1, gridLines: true, scaleMax: 'uno',
      legend: true, legendTitle: 'cos²', titleSize: 17,
    },
    controls: [
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'subtitle', label: 'Subtítulo', type: 'text' },
      { key: 'colormap', label: 'Paleta continua', type: 'select', options: cmapOpts },
      { key: 'showValues', label: 'Mostrar valores', type: 'checkbox' },
      { key: 'sortRows', label: 'Ordenar variables', type: 'checkbox' },
      { key: 'sortBy', label: 'Ordenar por los primeros N ejes', type: 'number', min: 1, max: 6 },
      { key: 'scaleMax', label: 'Escala de color', type: 'select', options: [['uno', 'De 0 a 1'], ['auto', 'Ajustada al máximo']] },
      { key: 'gridLines', label: 'Separadores', type: 'checkbox' },
      { key: 'legend', label: 'Leyenda', type: 'checkbox' },
      { key: 'legendTitle', label: 'Título leyenda', type: 'text' },
      { key: 'theme', label: 'Tema', type: 'select', options: themeOpts },
      { key: 'font', label: 'Tipografía', type: 'select', options: fontOpts },
    ],
    render: cfg => Plots4.cos2Heat(cfg, { names: state.activeVars, M: G.cos2Var, labels: G.labels }),
  });
}

/* ============================================================
   Descargas
   ============================================================ */
function dlCoordInd() {
  const G = state.fac;
  const hdr = ['Individuo', ...state.suppCat.map(s => s.name),
    ...G.labels.map(l => 'Coord_' + l), ...G.labels.map(l => 'cos2_' + l), ...G.labels.map(l => 'contrib_' + l)];
  const rows = state.rowIds.map((id, i) => [id, ...state.suppCat.map(s => s.values[i]),
    ...G.coordInd.map(c => c[i]), ...G.cos2Ind.map(c => c[i]), ...G.contribInd.map(c => c[i])]);
  download(matrixToCSV(hdr, rows), slug(state.fileName) + '_individuos.csv', 'text/csv;charset=utf-8');
}
function dlCoordVar() {
  const G = state.fac;
  const hdr = ['Variable', ...G.labels.map(l => 'Coord_' + l), ...G.labels.map(l => 'cos2_' + l), ...G.labels.map(l => 'contrib_' + l)];
  const rows = state.activeVars.map((v, i) => [v, ...G.coordVar[i], ...G.cos2Var[i], ...G.contribVar[i]]);
  download(matrixToCSV(hdr, rows), slug(state.fileName) + '_variables.csv', 'text/csv;charset=utf-8');
}
function dlSupp() {
  const G = state.fac;
  const hdr = ['Tipo', 'Nombre', 'Categoria', 'n', ...G.labels];
  const rows = [];
  G.suppQuant.forEach(s => rows.push(['cuantitativa', s.name, '', s.nValid, ...s.coord]));
  G.suppCat.forEach(sc => sc.levels.forEach(lv => rows.push(['categoria', sc.name, lv.level, lv.n, ...lv.coord])));
  if (!rows.length) { alert('No hay elementos suplementarios definidos.'); return; }
  download(matrixToCSV(hdr, rows), slug(state.fileName) + '_suplementarios.csv', 'text/csv;charset=utf-8');
}

/* ============================================================
   Eventos
   ============================================================ */
function init() {
  if (!el('runFacBtn')) return;
  el('runFacBtn').addEventListener('click', run);
  el('facGroup').addEventListener('change', () => { if (state.fac) renderFigures4(); });
  el('dlCoordInd').addEventListener('click', dlCoordInd);
  el('dlCoordVar').addEventListener('click', dlCoordVar);
  el('dlSupp').addEventListener('click', dlSupp);
  el('goStep4').addEventListener('click', () => goStep(4));
}
document.addEventListener('DOMContentLoaded', init);
window.PCAProFac = { run };
})();

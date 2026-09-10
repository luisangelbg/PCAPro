/* PCAPro — análisis de componentes principales en el navegador.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it
   under the terms of the GNU General Public License as published by the Free
   Software Foundation, either version 3 of the License, or (at your option)
   any later version. This program is distributed WITHOUT ANY WARRANTY; see
   the GNU General Public License for more details. You should have received
   a copy of the License along with this program; if not, see
   <https://www.gnu.org/licenses/>. */

/* PCAPro — Bloque 6: informe automático y exportación completa. */

(function () {

const SECTIONS = [
  ['resumen', 'Resumen con los indicadores clave'],
  ['metodos', 'Métodos (redacción automática)'],
  ['datos', 'Preparación de datos y supuestos'],
  ['extraccion', 'Extracción de componentes'],
  ['rotacion', 'Rotación'],
  ['mapas', 'Representación factorial'],
  ['interpretacion', 'Interpretación'],
  ['agrupamiento', 'Agrupamiento jerárquico (HCPC)'],
  ['advertencias', 'Limitaciones y advertencias'],
  ['referencias', 'Referencias metodológicas'],
  ['anexo', 'Anexo con la configuración'],
];

function opts() {
  return {
    title: el('repTitle').value.trim() || tt('Análisis de Componentes Principales'),
    author: el('repAuthor').value.trim(),
    figures: el('repFigures').checked,
    sections: SECTIONS.map(s => s[0]).filter(id => {
      const c = el('sec_' + id);
      return c && c.checked;
    }),
  };
}

function ready() {
  if (!state.pca) {
    clearMessages('repMessages');
    showMessage('repMessages', 'error',
      tt('Necesitas al menos haber extraído los componentes (Bloque 2) para generar el informe.'));
    return false;
  }
  return true;
}

/* ---------- vista previa ---------- */
function preview() {
  if (!ready()) return;
  clearMessages('repMessages');
  const html = Rep.build(opts());
  const frame = el('repFrame');
  frame.srcdoc = html;
  el('repPreviewWrap').style.display = '';
  const figs = Fig.mounted().length;
  showMessage('repMessages', 'info',
    TT(`Vista previa generada: ${opts().sections.length} secciones`, `Preview generated: ${opts().sections.length} sections`) +
    (opts().figures
      ? TT(` y ${figs} figura(s) incrustada(s) tal como las dejaste en cada bloque.`, ` and ${figs} embedded figure(s), exactly as you left them in each block.`)
      : TT(', sin figuras.', ', without figures.')));
}

/* ---------- descarga del informe HTML ---------- */
function downloadHTML() {
  if (!ready()) return;
  download(Rep.build(opts()), slug(state.fileName) + TT('_informe_ACP.html', '_PCA_report.html'), 'text/html;charset=utf-8');
}

/* ---------- abrir para imprimir ---------- */
function printReport() {
  if (!ready()) return;
  const w = window.open('', '_blank');
  if (!w) {
    showMessage('repMessages', 'warning',
      tt('El navegador bloqueó la ventana emergente. Permite las ventanas emergentes de este sitio, ' +
      'o descarga el informe en HTML y ábrelo para imprimirlo.'));
    return;
  }
  w.document.write(Rep.build(opts()));
  w.document.close();
  setTimeout(() => { try { w.focus(); w.print(); } catch (e) { /* el usuario puede imprimir a mano */ } }, 600);
}

/* ---------- tablas en CSV ---------- */
function tableEntries() {
  const P = state.pca, R = state.rot, G = state.fac, I = state.interp;
  const out = [];
  const add = (name, hdr, rows) => out.push({ name, data: Rep.text(matrixToCSV(hdr, rows)) });

  add(TT('tablas/', 'tables/') + '01_matriz_preparada.csv',
    ['Individuo', ...state.activeVars, ...state.suppNum.map(s => s.name), ...state.suppCat.map(s => s.name)],
    state.rowIds.map((id, i) => [id, ...state.X.map(c => c[i]),
      ...state.suppNum.map(s => s.values[i]), ...state.suppCat.map(s => s.values[i])]));

  if (state.diagnostics) {
    const D = state.diagnostics;
    add(TT('tablas/', 'tables/') + '02_correlaciones.csv', ['', ...state.activeVars],
      state.activeVars.map((v, i) => [v, ...D.R[i]]));
    add(TT('tablas/', 'tables/') + '03_resumen_variables.csv',
      ['Variable', 'n', 'Media', 'DE', 'Min', 'Max', 'Asimetria', 'Curtosis', 'MSA'],
      state.activeVars.map((v, i) => {
        const c = state.columns.find(x => x.name === v);
        return [v, c.n, c.mean, c.sd, c.min, c.max, c.skew, c.kurt, D.kmo ? D.kmo.msa[i] : ''];
      }));
  }
  /* Los métodos distintos del ACP no tienen Horn ni bastón roto, y sus
     columnas no son las variables activas: llevan sus propias tablas. */
  const otroM = !!(P && P.method && P.method !== 'pca');
  if (otroM) {
    const RR = P.res;
    const dim = i => 'Dim' + (i + 1);
    add(TT('tablas/', 'tables/') + '04_valores_propios.csv',
      ['Eje', 'Valor_propio', 'Pct_inercia', 'Pct_acumulado'].concat(P.method === 'mca' ? ['Pct_ajustado_Greenacre'] : []).concat(['Retenido']),
      P.values.map((l, i) => [dim(i), l, P.pct[i] * 100, P.cum[i] * 100]
        .concat(P.method === 'mca' ? [RR.ajuste.pctGreenacre[i] != null ? RR.ajuste.pctGreenacre[i] * 100 : ''] : [])
        .concat([i < P.k ? 'si' : 'no'])));
    add(TT('tablas/', 'tables/') + '05_columnas_coord_cos2_contrib.csv',
      ['Elemento'].concat(P.values.map((_, i) => 'Coord_' + dim(i)), P.values.map((_, i) => 'cos2_' + dim(i)), P.values.map((_, i) => 'contrib_' + dim(i))),
      P.labelsCol.map((v, j) => [v].concat(RR.colCoord[j], RR.colCos2[j], RR.colContrib[j])));
    add(TT('tablas/', 'tables/') + '06_filas_coord_cos2_contrib.csv',
      [P.method === 'ca' ? 'Fila' : 'Individuo'].concat(P.values.map((_, i) => 'Coord_' + dim(i)), P.values.map((_, i) => 'cos2_' + dim(i)), P.values.map((_, i) => 'contrib_' + dim(i))),
      P.labelsRow.map((v, i) => [v].concat(RR.rowCoord[i], RR.rowCos2[i], RR.rowContrib[i])));
    if (P.method === 'ca') {
      const filas = [];
      RR.tabla.forEach((fila, i) => fila.forEach((v, j) =>
        filas.push([RR.filas[i], RR.cols[j], v, RR.celdas[i][j].esp, RR.celdas[i][j].resid, RR.celdas[i][j].contrib])));
      add(TT('tablas/', 'tables/') + '07_celdas_chi2.csv',
        ['Fila', 'Columna', 'Observado', 'Esperado', 'Residuo', 'Pct_chi2'], filas);
    }
    if (P.method === 'mca') add(TT('tablas/', 'tables/') + '07_cramer.csv',
      [''].concat(RR.varNombres), RR.varNombres.map((n, i) => [n].concat(RR.cramer[i])));
    if (P.method === 'famd') add(TT('tablas/', 'tables/') + '07_variables_r2_eta2.csv',
      ['Variable', 'Tipo'].concat(P.values.map((_, i) => dim(i))),
      RR.nomQuant.map((n, i) => [n, 'cuantitativa'].concat(RR.corQuant[i].map(x => x * x)))
        .concat(RR.nomQual.map((n, i) => [n, 'cualitativa'].concat(RR.eta2[i]))));
    if (P.method === 'mfa') {
      add(TT('tablas/', 'tables/') + '07_bloques_inercia.csv',
        ['Bloque', 'Variables', 'lambda1'].concat(P.values.map((_, i) => dim(i))),
        RR.grupos.map((g, i) => [g.nombre, g.nVar, g.lambda1].concat(RR.inerciaGrupo[i])));
      add(TT('tablas/', 'tables/') + '08_RV.csv', [''].concat(RR.grupos.map(g => g.nombre)),
        RR.grupos.map((g, i) => [g.nombre].concat(RR.RV[i])));
      RR.grupos.forEach((g, gi) => add(TT('tablas/', 'tables/') + `09_parciales_${g.nombre}.csv`,
        ['Individuo'].concat(P.values.map((_, i) => dim(i))),
        P.labelsRow.map((v, i) => [v].concat(RR.parciales[gi][i]))));
    }
    if (I) {
      const rows = [];
      I.ejes.forEach(e => e.items.forEach(it => rows.push([e.dim, it.name, it.tipo, it.valor, it.cos2, it.ctr])));
      add(TT('tablas/', 'tables/') + '12_descripcion_ejes.csv',
        ['Eje', 'Elemento', 'Tipo', 'Coordenada', 'cos2', 'Contribucion_pct'], rows);
      if (I.cat.length) add(TT('tablas/', 'tables/') + '13_valores_test.csv',
        ['Variable', 'Categoria', 'n'].concat(I.cat[0].vtest.map((_, i) => 'vtest_' + dim(i)), I.cat[0].p.map((_, i) => 'p_' + dim(i))),
        I.cat.map(r => [r.variable, r.level, r.n].concat(r.vtest, r.p)));
    }
    agrupamientoTablas(add);
    return out;
  }

  add(TT('tablas/', 'tables/') + '04_valores_propios.csv',
    ['Componente', 'Valor_propio', 'Pct_varianza', 'Pct_acumulado', 'p95_aleatorio', 'Baston_roto', 'Retenido'],
    P.values.map((l, i) => [cp(i + 1), l, P.pct[i] * 100, P.cum[i] * 100,
      P.horn.p95[i], P.bstick[i], i < P.k ? 'si' : 'no']));
  add(TT('tablas/', 'tables/') + '05_cargas_sin_rotar.csv',
    ['Variable', ...P.values.map((_, i) => cp(i + 1))],
    state.activeVars.map((v, j) => [v, ...P.loadings[j]]));
  add(TT('tablas/', 'tables/') + '06_puntuaciones.csv',
    ['Individuo', ...state.suppCat.map(s => s.name), ...P.values.map((_, i) => cp(i + 1))],
    state.rowIds.map((id, i) => [id, ...state.suppCat.map(s => s.values[i]), ...P.scores.map(c => c[i])]));

  if (R && R.method !== 'none') {
    add(TT('tablas/', 'tables/') + '07_cargas_rotadas.csv',
      ['Variable', ...R.labels, 'Comunalidad', 'Complejidad'],
      state.activeVars.map((v, i) => [v, ...R.pattern[i], R.diag.comm[i], R.diag.complexity[i]]));
    if (R.oblique) {
      add(TT('tablas/', 'tables/') + '08_estructura.csv', ['Variable', ...R.labels],
        state.activeVars.map((v, i) => [v, ...R.structure[i]]));
      add(TT('tablas/', 'tables/') + '09_correlacion_componentes.csv', ['', ...R.labels],
        R.labels.map((l, i) => [l, ...R.Phi[i]]));
    }
  }
  if (G) {
    add(TT('tablas/', 'tables/') + '10_variables_coord_cos2_contrib.csv',
      ['Variable', ...G.labels.map(l => 'Coord_' + l), ...G.labels.map(l => 'cos2_' + l), ...G.labels.map(l => 'contrib_' + l)],
      state.activeVars.map((v, i) => [v, ...G.coordVar[i], ...G.cos2Var[i], ...G.contribVar[i]]));
    add(TT('tablas/', 'tables/') + '11_individuos_coord_cos2_contrib.csv',
      ['Individuo', ...state.suppCat.map(s => s.name), ...G.labels.map(l => 'Coord_' + l),
       ...G.labels.map(l => 'cos2_' + l), ...G.labels.map(l => 'contrib_' + l)],
      state.rowIds.map((id, i) => [id, ...state.suppCat.map(s => s.values[i]),
        ...G.coordInd.map(c => c[i]), ...G.cos2Ind.map(c => c[i]), ...G.contribInd.map(c => c[i])]));
  }
  if (I) {
    const rows = [];
    I.quant.forEach(q => q.items.forEach(it =>
      rows.push([q.dim, it.name, it.supp ? 'suplementaria' : 'activa', it.r, it.r * it.r, it.p])));
    add(TT('tablas/', 'tables/') + '12_descripcion_dimensiones.csv', ['Eje', 'Variable', 'Tipo', 'Correlacion', 'r2', 'p'], rows);
    if (I.cat.length) add(TT('tablas/', 'tables/') + '13_valores_test.csv',
      ['Variable', 'Categoria', 'n', ...G.labels.map(l => 'vtest_' + l), ...G.labels.map(l => 'p_' + l)],
      I.cat.map(r => [r.variable, r.level, r.n, ...r.vtest, ...r.p]));
    add(TT('tablas/', 'tables/') + '14_residuos.csv', ['', ...state.activeVars],
      state.activeVars.map((v, i) => [v, ...I.res.Res[i]]));
  }
  agrupamientoTablas(add);
  return out;
}

/* El agrupamiento es opcional y vale para los cinco métodos, así que sus
   tablas se añaden en un solo sitio y se llaman desde las dos ramas. */
function agrupamientoTablas(add) {
  const H = state.hcpc;
  if (!H) return;
  const S0 = H.sol, K = H.ejesUsados, d = TT('tablas/', 'tables/');
  add(d + '20_grupos_asignacion.csv',
    [S0.id === 'ca' ? 'Fila' : 'Individuo', 'Grupo', ...S0.labels.slice(0, K)],
    S0.ids.map((id, i) => [id, H.grupo[i] + 1, ...S0.rowCoord[i].slice(0, K)]));
  add(d + '21_grupos_criterios.csv',
    ['Numero_de_grupos', 'Perdida_de_inercia_del_corte', 'Silueta_media'],
    H.criterios.siluetas.map(s => [s.q, H.arbol.alturas[H.arbol.n - s.q], s.s]));
  const desc = [];
  H.descQuant.forEach(v => v.filas.forEach(f => desc.push(
    [f.grupo + 1, S0.id === 'ca' ? 'perfil' : 'cuantitativa', v.name, f.n, f.media, f.mediaGeneral, f.vtest, f.p])));
  H.descQual.forEach(v => v.filas.forEach(f => desc.push(
    [f.grupo + 1, 'categoria', v.name + ' = ' + f.categoria, f.nGrupo, f.pctGrupo, f.pctGlobal, f.vtest, f.p])));
  H.descEjes.forEach(e => e.filas.forEach(f => desc.push(
    [f.grupo + 1, 'eje', e.name, f.n, f.media, f.mediaGeneral, f.vtest, f.p])));
  add(d + '22_grupos_descripcion.csv',
    ['Grupo', 'Tipo', 'Variable', 'n', 'Valor_en_el_grupo', 'Valor_general', 'Valor_test', 'p'], desc);
  const par = [];
  H.paragones.forEach((l, g) => l.forEach((o, r) => par.push([g + 1, 'paragon', r + 1, S0.ids[o.i], o.d])));
  H.especificos.forEach((l, g) => l.forEach((o, r) => par.push([g + 1, 'especifico', r + 1, S0.ids[o.i], o.d])));
  add(d + '23_grupos_paragones.csv', ['Grupo', 'Papel', 'Orden', 'Individuo', 'Distancia'], par);
}

/* ---------- paquete completo ---------- */
async function downloadPackage() {
  if (!ready()) return;
  const btn = el('repZip');
  btn.disabled = true;
  const setLabel = t => { btn.innerHTML = t; };
  clearMessages('repMessages');
  try {
    const entries = [];
    const fmt = el('repFigFormat').value;
    const scale = +el('repFigScale').value;
    const figs = Fig.mounted();

    /* figuras */
    for (let i = 0; i < figs.length; i++) {
      const f = figs[i];
      setLabel(`<span class="loading"></span> ` + TT(`Figura ${i + 1} de ${figs.length}…`, `Figure ${i + 1} of ${figs.length}…`));
      const num = String(i + 1).padStart(2, '0');
      if (fmt === 'svg' || fmt === 'ambos') {
        entries.push({ name: TT('figuras/', 'figures/') + `${num}_${f.fileName}.svg`, data: Rep.text(Fig.serialize(f.svg)) });
      }
      if (fmt !== 'svg') {
        const ext = fmt === 'ambos' ? 'png' : fmt;
        const blob = await Fig.toRaster(f.svg, { format: ext, scale, background: '#ffffff' });
        entries.push({ name: TT('figuras/', 'figures/') + `${num}_${f.fileName}.${ext}`, data: await Rep.blobBytes(blob) });
      }
      await new Promise(r => setTimeout(r, 0));
    }

    /* tablas e informe */
    setLabel('<span class="loading"></span> ' + tt('Tablas e informe…'));
    tableEntries().forEach(e => entries.push(e));
    entries.push({ name: TT('informe_ACP.html', 'PCA_report.html'), data: Rep.text(Rep.build(opts())) });
    entries.push({ name: 'CITATION.bib', data: Rep.text(Rep.CITATION.bibtex + '\n') });
    entries.push({ name: TT('LEEME.txt', 'README.txt'), data: Rep.text(readme(figs, entries.length)) });

    setLabel('<span class="loading"></span> ' + tt('Comprimiendo…'));
    const blob = Rep.zip(entries);
    download(blob, slug(state.fileName) + TT('_ACP_completo.zip', '_PCA_complete.zip'));
    showMessage('repMessages', 'success',
      TT(`Paquete generado: <b>${entries.length}</b> archivos (${figs.length} figura(s) en ${fmt === 'ambos' ? 'SVG y PNG' : fmt.toUpperCase()}` +
      `${fmt !== 'svg' ? ` a ${scale}×` : ''}, ${tableEntries().length} tabla(s) y el informe en HTML), ` +
      `${(blob.size / 1048576).toFixed(1)} MB.`,
      `Package generated: <b>${entries.length}</b> files (${figs.length} figure(s) in ${fmt === 'ambos' ? 'SVG and PNG' : fmt.toUpperCase()}` +
      `${fmt !== 'svg' ? ` at ${scale}×` : ''}, ${tableEntries().length} table(s) and the HTML report), ` +
      `${(blob.size / 1048576).toFixed(1)} MB.`));
  } catch (err) {
    showMessage('repMessages', 'error', tt('No se pudo generar el paquete: ') + err.message);
    console.error(err);
  }
  btn.disabled = false;
  setLabel(tt('⬇ Descargar paquete completo (ZIP)'));
}

function readme(figs) {
  const P = state.pca;
  const en = (typeof I18N !== 'undefined' && I18N.lang === 'en');
  const L = [];
  if (en) {
    L.push('RESULTS PACKAGE — PRINCIPAL COMPONENT ANALYSIS');
    L.push('='.repeat(60));
    L.push('Generated by PCAPro on ' + new Date().toLocaleString('en-GB'));
    L.push('Data file: ' + (state.fileName || '—'));
    L.push('');
    L.push('CONTENTS');
    L.push('  PCA_report.html ... the full report; open it in a browser.');
    L.push('                      For PDF: open it and print with "Save as PDF".');
    L.push('  figures/ ......... ' + figs.length + ' figure(s) in the chosen format and resolution.');
    L.push('  tables/ .......... result tables as CSV (UTF-8 with BOM, comma separated).');
    L.push('  CITATION.bib ..... how to cite PCAPro if you publish these results.');
    L.push('');
    L.push('SUMMARY OF THE ANALYSIS');
    L.push('  Observations: ' + P.n + ' · Active variables: ' + P.p);
    L.push('  Variables: ' + state.activeVars.join(', '));
    L.push('  Scaling: ' + state.prep.scaling + ' · Missing data: ' + state.prep.missing);
    L.push('  Retained components: ' + P.k + ' (' + (P.cum[P.k - 1] * 100).toFixed(2) + '% of the variance)');
    if (state.rot && state.rot.method !== 'none') L.push('  Rotation: ' + tt(Rot.methods[state.rot.method].name));
    L.push('');
    L.push('All computations were performed locally in the browser; no data left this machine.');
  } else {
    L.push('PAQUETE DE RESULTADOS — ANÁLISIS DE COMPONENTES PRINCIPALES');
    L.push('='.repeat(60));
    L.push('Generado por PCAPro el ' + new Date().toLocaleString('es-MX'));
    L.push('Archivo de datos: ' + (state.fileName || '—'));
    L.push('');
    L.push('CONTENIDO');
    L.push('  informe_ACP.html ... informe completo; ábrelo en el navegador.');
    L.push('                       Para PDF: abrir e imprimir con "Guardar como PDF".');
    L.push('  figuras/ .......... ' + figs.length + ' figura(s) en el formato y resolución elegidos.');
    L.push('  tablas/ ........... tablas de resultados en CSV (UTF-8 con BOM, separador coma).');
    L.push('  CITATION.bib ...... cómo citar PCAPro si publicas estos resultados.');
    L.push('');
    L.push('RESUMEN DEL ANÁLISIS');
    L.push('  Observaciones: ' + P.n + ' · Variables activas: ' + P.p);
    L.push('  Variables: ' + state.activeVars.join(', '));
    L.push('  Escalado: ' + state.prep.scaling + ' · Faltantes: ' + state.prep.missing);
    L.push('  Componentes retenidos: ' + P.k + ' (' + (P.cum[P.k - 1] * 100).toFixed(2) + '% de la varianza)');
    if (state.rot && state.rot.method !== 'none') L.push('  Rotación: ' + Rot.methods[state.rot.method].name);
    L.push('');
    L.push('Los cálculos se realizaron localmente en el navegador; ningún dato salió del equipo.');
  }
  return '﻿' + L.join('\r\n');
}

/* ---------- estado ---------- */
function refreshStatus() {
  const P = state.pca, R = state.rot, G = state.fac, I = state.interp;
  /* Con un método distinto del ACP no hay rotación, los mapas los dibuja
     mapas.js y la interpretación no produce RMSR: el estado tiene que
     reflejar eso en vez de marcar como pendientes bloques que no aplican. */
  const otroMetodo = !!(P && P.method && P.method !== 'pca');
  const SIGm = otroMetodo ? TT(Metodo.SIGLA[P.method][0], Metodo.SIGLA[P.method][1]) : '';
  const hayMapas = otroMetodo ? !!(el('mapasResults') && el('mapasResults').style.display !== 'none') : !!G;
  const items = [
    [tt('Bloque 1 · Datos y supuestos'), !!state.diagnostics, state.diagnostics ? `${state.pca ? state.pca.n : state.rowIds.length} × ${state.activeVars.length}` : tt('sin ejecutar')],
    [otroMetodo ? TT(`Bloque 2 · ${SIGm}`, `Block 2 · ${SIGm}`) : tt('Bloque 2 · Extracción'), !!P,
      P ? (otroMetodo ? TT(`${P.k} de ${P.res.k} ejes`, `${P.k} of ${P.res.k} axes`) : TT(`${P.k} de ${P.p} componentes`, `${P.k} of ${P.p} components`)) : tt('sin ejecutar')],
    [tt('Bloque 3 · Rotación'), otroMetodo ? true : !!(R && R.method !== 'none'),
      otroMetodo ? TT('no aplica a este método', 'not applicable to this method') : (R ? tt(Rot.methods[R.method].name) : tt('sin aplicar'))],
    [tt('Bloque 4 · Mapas factoriales'), hayMapas,
      hayMapas ? (otroMetodo ? TT(`plano 1–2 · ${fmtPct((P.pct[0] || 0) + (P.pct[1] || 0), 1)}`, `plane 1–2 · ${fmtPct((P.pct[0] || 0) + (P.pct[1] || 0), 1)}`) : (G.rotated ? tt('solución rotada') : tt('solución sin rotar'))) : tt('sin ejecutar')],
    [tt('Bloque 5 · Interpretación'), !!I,
      I ? (otroMetodo ? TT(`${I.ejes.length} eje(s) descritos`, `${I.ejes.length} axis/axes described`) : `RMSR = ${fmtNum(I.res.rmsr, 4)}`) : tt('sin ejecutar')],
    [tt('Bloque 5b · Agrupamiento'), !!state.hcpc,
      state.hcpc ? TT(`${state.hcpc.q} grupos sobre ${state.hcpc.ejesUsados} eje(s)`, `${state.hcpc.q} clusters on ${state.hcpc.ejesUsados} axis/axes`)
        : tt('opcional, sin ejecutar')],
  ];
  const ul = el('repStatus'); ul.innerHTML = '';
  items.forEach(([name, ok, note]) => {
    const li = mk('li', { class: 'check-item ' + (ok ? 'ok' : 'warn') });
    li.innerHTML = `<div class="ck-icon">${ok ? '✔' : '○'}</div><div class="ck-body">
      <div class="ck-title">${name}</div><div class="ck-text">${note}</div></div>`;
    ul.appendChild(li);
  });
  const figs = Fig.mounted();
  el('repFigCount').textContent = figs.length
    ? TT(`${figs.length} figura(s) disponibles: ${figs.map(f => tt(f.cfg.title || f.title)).join(' · ')}`,
         `${figs.length} figure(s) available: ${figs.map(f => tt(f.cfg.title || f.title)).join(' · ')}`)
    : tt('Todavía no hay figuras generadas.');
  /* deshabilita las secciones de bloques que no se ejecutaron */
  const avail = { datos: !!state.diagnostics, extraccion: !!P, rotacion: otroMetodo ? false : !!R, mapas: hayMapas, interpretacion: !!I, agrupamiento: !!state.hcpc };
  Object.entries(avail).forEach(([id, ok]) => {
    const c = el('sec_' + id);
    if (!c) return;
    c.disabled = !ok;
    if (!ok) c.checked = false;
    c.parentElement.style.opacity = ok ? '1' : '.45';
  });
}

/* ---------- eventos ---------- */
/* La referencia se toma de Rep.CITATION: un solo sitio para la interfaz, el
   informe y el CITATION.bib del paquete. */
function initCite() {
  const box = el('citeRef');
  if (!box) return;
  box.innerHTML = Rep.CITATION.apa;
  el('copyCite').addEventListener('click', () => copyToClipboard('copyCite', box.textContent));
  el('copyBibtex').addEventListener('click', () => copyToClipboard('copyBibtex', Rep.CITATION.bibtex));
}

function init() {
  initCite();
  if (!el('sectionBox')) return;
  const box = el('sectionBox');
  SECTIONS.forEach(([id, label]) => {
    const l = mk('label', { class: 'checkbox-label' });
    const c = mk('input', { type: 'checkbox', id: 'sec_' + id });
    c.checked = true;
    l.appendChild(c);
    /* el texto va en un <span data-i18n> para que I18N.apply lo retraduzca al
       cambiar de idioma: estas casillas se construyen una sola vez, al arrancar */
    l.appendChild(document.createTextNode(' '));
    l.appendChild(mk('span', { 'data-i18n': label }, tt(label)));
    box.appendChild(l);
  });
  el('repPreview').addEventListener('click', preview);
  el('repHtml').addEventListener('click', downloadHTML);
  el('repPrint').addEventListener('click', printReport);
  el('repZip').addEventListener('click', downloadPackage);
  el('repRefresh').addEventListener('click', refreshStatus);
  el('goStep6').addEventListener('click', () => { refreshStatus(); goStep(6); });
  els('.step-btn').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.step === '6') refreshStatus();
  }));
}
document.addEventListener('DOMContentLoaded', init);
window.PCAProReport = { refreshStatus, tableEntries };
})();

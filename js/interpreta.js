/* PCAPro — análisis de componentes principales en el navegador.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán
   GPL-3.0-or-later — véase LICENSE en la raíz del repositorio. */

/* Bloque 5 para el AC, el ACM, el AFDM y el AFM.
 *
 * La interpretación del ACP se apoya en la correlación de cada variable con
 * cada eje. En los otros métodos esa cantidad no siempre existe, así que lo
 * que describe un eje cambia con el método:
 *
 *   AC    las filas y las columnas que más contribuyen, con su signo;
 *   ACM   las categorías, por contribución y con su valor test;
 *   AFDM  las cuantitativas por su correlación y las cualitativas por su η²,
 *         que son comparables entre sí;
 *   AFM   las variables por su correlación, más qué bloque pesa en el eje.
 *
 * El resto —nombrar los ejes, los valores test de las categorías sobre los
 * individuos, el borrador de la sección de resultados— es común, y se escribe
 * una sola vez para los cuatro.
 */

const Interp = {};

Interp.contenedor = function () {
  let c = el('interpResults');
  if (!c) { c = mk('div', { id: 'interpResults' }); el('intResults').parentNode.insertBefore(c, el('intResults')); }
  return c;
};

/* ============================================================
   Qué describe cada eje, según el método
   ============================================================ */
Interp.describeEjes = function (P) {
  const id = P.method, R = P.res, K = P.k;
  const ejes = [];
  for (let d = 0; d < K; d++) {
    const items = [];
    if (id === 'ca') {
      R.filas.forEach((f, i) => items.push({ name: f, tipo: tt('fila'), valor: R.rowCoord[i][d], ctr: R.rowContrib[i][d], cos2: R.rowCos2[i][d] }));
      R.cols.forEach((cn, j) => items.push({ name: cn, tipo: tt('columna'), valor: R.colCoord[j][d], ctr: R.colContrib[j][d], cos2: R.colCos2[j][d] }));
    } else if (id === 'mca') {
      R.cols.forEach((cn, j) => items.push({ name: cn, tipo: R.varNombres[R.grupoDe[j]], valor: R.colCoord[j][d], ctr: R.colContrib[j][d], cos2: R.colCos2[j][d] }));
    } else if (id === 'famd') {
      R.nomQuant.forEach((v, i) => items.push({ name: v, tipo: tt('cuantitativa'), valor: R.corQuant[i][d], ctr: R.colContrib[i][d], cos2: R.corQuant[i][d] ** 2, medida: 'r' }));
      let c0 = 0;
      R.niveles.forEach((ns, j) => ns.forEach(lv => {
        const jc = R.nQuant + c0;
        items.push({ name: lv, tipo: R.nomQual[j], valor: R.coordCat[c0][d], ctr: R.colContrib[jc][d], cos2: R.colCos2[jc][d], medida: 'coord' });
        c0++;
      }));
    } else {
      P.datos.quantNombres.forEach((v, i) => items.push({ name: v, tipo: R.grupos[R.grupoDe[i]].nombre, valor: R.colCoord[i][d], ctr: R.colContrib[i][d], cos2: R.colCos2[i][d] }));
    }
    items.sort((a, b) => b.ctr - a.ctr);
    ejes.push({ dim: 'Dim' + (d + 1), items });
  }
  return ejes;
};

/* Valores test de las categorías sobre los individuos: la misma fórmula de
   Lebart que usa el ACP, aplicable a cualquier método que sitúe individuos. */
Interp.vtestCategorias = function (P) {
  if (P.method === 'ca') return [];
  const R = P.res, N = P.n, K = P.k;
  const disponibles = [];
  (P.datos.qualNombres || []).forEach((nm, j) => disponibles.push({ name: nm, values: P.datos.qual[j] }));
  (state.suppCat || []).forEach(sc => {
    if (sc.levels.length < 2 || disponibles.some(d => d.name === sc.name)) return;
    disponibles.push({ name: sc.name, values: P.datos.keep.map(i => sc.values[i]) });
  });
  const rows = [];
  disponibles.forEach(v => {
    [...new Set(v.values.filter(x => x !== null && x !== ''))].forEach(lv => {
      const idx = []; v.values.forEach((x, i) => { if (x === lv) idx.push(i); });
      if (!idx.length) return;
      const vt = [], coord = [];
      for (let d = 0; d < K; d++) {
        const col = R.rowCoord.map(f => f[d]);
        const mg = S.mean(col);
        const s2 = col.reduce((s, x) => s + (x - mg) * (x - mg), 0) / N;
        const mc = idx.reduce((s, i) => s + col[i], 0) / idx.length;
        const den = Math.sqrt((s2 / idx.length) * ((N - idx.length) / (N - 1)));
        vt.push(den > 0 ? (mc - mg) / den : 0);
        coord.push(mc);
      }
      rows.push({ variable: v.name, level: lv, n: idx.length, name: v.name + ': ' + lv, vtest: vt, p: vt.map(z => S.normalP2(z)), coord });
    });
  });
  return rows;
};

/* Nombre sugerido para un eje: los elementos que más contribuyen, opuestos
   por su signo, que es como se lee un eje factorial. */
Interp.sugiereNombre = function (eje, thr) {
  const fuertes = eje.items.filter(x => x.ctr >= thr);
  const pos = fuertes.filter(x => x.valor > 0).slice(0, 2);
  const neg = fuertes.filter(x => x.valor < 0).slice(0, 2);
  if (!pos.length && !neg.length) return tt('(sin contribución destacada)');
  if (pos.length && neg.length) return `${pos.map(o => o.name).join(' + ')} ${tt('frente a')} ${neg.map(o => o.name).join(' + ')}`;
  const arr = pos.length ? pos : neg;
  return (neg.length ? tt('Menor') + ' ' : '') + arr.map(o => o.name).join(', ');
};

/* ============================================================
   Ejecución
   ============================================================ */
Interp.run = function () {
  const btn = el('runIntBtn');
  btn.disabled = true; btn.innerHTML = '<span class="loading"></span> ' + tt('Interpretando…');
  clearMessages('intMessages');
  setTimeout(() => {
    try {
      const P = state.pca;
      const thr = +el('intThr').value * 100 / P.p;    // el umbral de carga se traduce a % de contribución
      const ejes = Interp.describeEjes(P);
      state.interp = {
        metodo: P.method, thr, umbralCtr: thr,
        ejes, cat: Interp.vtestCategorias(P),
        names: (state.interp && state.interp.names && state.interp.names.length === P.k)
          ? state.interp.names : ejes.map(e => Interp.sugiereNombre(e, thr)),
        groupVar: el('intGroup').value || null,
      };
      Interp.render(P);
      el('intResults').style.display = 'none';
      Interp.contenedor().style.display = '';
      enableStep(6, true);
      Interp.contenedor().scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      showMessage('intMessages', 'error', TT('Error en la interpretación: ', 'Error during interpretation: ') + err.message);
      console.error(err);
    }
    btn.disabled = false; btn.textContent = tt('Interpretar componentes →');
  }, 30);
};

Interp.render = function (P) {
  const c = Interp.contenedor(), I = state.interp, R = P.res, id = P.method;
  const sig = TT(Metodo.SIGLA[id][0], Metodo.SIGLA[id][1]);
  const nombreCol = id === 'ca' ? tt('Elemento') : id === 'mca' ? tt('Categoría') : tt('Variable / categoría');

  c.innerHTML = `
    <div class="card">
      <h2>${TT('5.2 · Lectura de cada eje', '5.2 · Reading each axis')} · ${sig}</h2>
      <p class="hint">${tt('Los elementos que más contribuyen a cada eje, con su signo. Un eje se lee oponiendo lo que está a un lado con lo que está al otro; los elementos de contribución baja no lo definen aunque estén lejos del centro.')}</p>
      <div id="interpEjes"></div>
    </div>
    <div class="card" id="interpCatCard">
      <h2>${tt('5.3 · Valores test de las categorías')}</h2>
      <p class="hint">${tt('Cuánto se aparta el centro de cada categoría del centro general, en desviaciones típicas. Por encima de |1.96| la categoría caracteriza ese eje con p < 0.05.')}</p>
      <div class="table-scroll" id="interpCat"></div>
    </div>
    <div class="card">
      <h2>${tt('5.4 · Borrador para la sección de resultados')}</h2>
      <p class="hint">${tt('Redacción automática con tus propios números. Revísala y adáptala antes de usarla.')}</p>
      <blockquote id="interpNarr" class="cite-ref"></blockquote>
      <div class="btn-row">
        <button class="btn btn-secondary btn-sm" id="copyInterpNarr" data-i18n="⧉ Copiar párrafo">⧉ Copiar párrafo</button>
        <button class="btn btn-secondary btn-sm" id="goClusterI">${tt('Agrupar los individuos (HCPC) →')}</button>
        <button class="btn btn-primary btn-sm" id="goStep6i">${tt('Ir al informe →')}</button>
      </div>
    </div>`;

  /* --- lectura de cada eje, con el nombre editable --- */
  const host = el('interpEjes');
  host.innerHTML = I.ejes.map((e, d) => {
    const fuertes = e.items.filter(x => x.ctr >= I.umbralCtr);
    const pos = fuertes.filter(x => x.valor > 0), neg = fuertes.filter(x => x.valor < 0);
    const lista = arr => arr.map(x => `<b>${x.name}</b> <span class="mut">(${x.tipo}, ${fmtNum(x.ctr, 1)} %)</span>`).join(', ');
    return `<div class="eje-box">
      <div class="eje-head">
        <span class="eje-dim">${e.dim}</span>
        <span class="mut">${fmtPct(P.pct[d], 1)} ${tt('de la inercia')}</span>
        <input type="text" class="ejeNombre" data-d="${d}" value="${(I.names[d] || '').replace(/"/g, '&quot;')}">
      </div>
      <p>${pos.length ? tt('Lado positivo') + ': ' + lista(pos) + '. ' : ''}
         ${neg.length ? tt('Lado negativo') + ': ' + lista(neg) + '. ' : ''}
         ${!fuertes.length ? tt('Ningún elemento supera el umbral de contribución.') : ''}</p>
    </div>`;
  }).join('');
  els('.ejeNombre').forEach(inp => inp.addEventListener('input', () => {
    I.names[+inp.dataset.d] = inp.value; Interp.narrativa(P);
  }));

  /* --- valores test --- */
  if (I.cat.length) {
    const cols = [{ key: 'v', label: tt('Variable') }, { key: 'l', label: tt('Categoría') }, { key: 'n', label: 'n', num: true }];
    for (let d = 0; d < P.k; d++) cols.push({ key: 't' + d, label: 'v.test Dim' + (d + 1), num: true, html: true });
    buildTable('interpCat', cols, I.cat.map(r => {
      const o = { v: r.variable, l: r.level, n: r.n };
      r.vtest.forEach((v, d) => { o['t' + d] = Math.abs(v) >= 1.96 ? `<b>${fmtNum(v, 2)}</b>` : fmtNum(v, 2); });
      return o;
    }));
  } else {
    el('interpCatCard').style.display = 'none';
  }

  Interp.narrativa(P);
  el('copyInterpNarr').addEventListener('click', () => copyToClipboard('copyInterpNarr', el('interpNarr').textContent));
  el('goClusterI').addEventListener('click', Clu.abrir);
  el('goStep6i').addEventListener('click', () => goStep(6));
};

/* Borrador redactado con los números del análisis. */
Interp.narrativa = function (P) {
  const I = state.interp, R = P.res, id = P.method;
  const nombre = TT(Metodo.NOMBRE[id][0], Metodo.NOMBRE[id][1]).toLowerCase();
  const partes = [];

  if (id === 'ca') {
    partes.push(TT(
      `Se realizó un ${nombre} sobre la tabla de contingencia de ${R.filas.length} × ${R.cols.length} construida con ${R.chi2.n} observaciones. La prueba de independencia ${R.chi2.p < 0.05 ? 'rechazó' : 'no rechazó'} la hipótesis de independencia (χ²(${R.chi2.df}) = ${fmtNum(R.chi2.chi2, 2)}, ${fmtPLabel(R.chi2.p)}), con una inercia total de ${fmtNum(R.chi2.inerciaTotal, 4)}.`,
      `A ${nombre} was carried out on the ${R.filas.length} × ${R.cols.length} contingency table built from ${R.chi2.n} observations. The independence test ${R.chi2.p < 0.05 ? 'rejected' : 'did not reject'} independence (χ²(${R.chi2.df}) = ${fmtNum(R.chi2.chi2, 2)}, ${fmtPLabel(R.chi2.p)}), with a total inertia of ${fmtNum(R.chi2.inerciaTotal, 4)}.`));
  } else if (id === 'mca') {
    partes.push(TT(
      `Se realizó un ${nombre} sobre ${R.nVar} variables cualitativas (${R.cols.length} categorías) medidas en ${P.n} individuos.`,
      `A ${nombre} was carried out on ${R.nVar} qualitative variables (${R.cols.length} categories) measured on ${P.n} individuals.`));
  } else if (id === 'famd') {
    partes.push(TT(
      `Se realizó un ${nombre} sobre ${P.n} individuos descritos por ${R.nQuant} variables cuantitativas y ${R.nQual} cualitativas, codificadas de modo que cada una aporte la misma inercia (inercia total = ${R.inerciaEsperada}).`,
      `A ${nombre} was carried out on ${P.n} individuals described by ${R.nQuant} quantitative and ${R.nQual} qualitative variables, coded so that each contributes the same inertia (total inertia = ${R.inerciaEsperada}).`));
  } else {
    partes.push(TT(
      `Se realizó un ${nombre} sobre ${P.n} individuos con las variables organizadas en ${R.grupos.length} bloques (${R.grupos.map(g => `${g.nombre}, ${g.nVar}`).join('; ')}). Cada bloque se ponderó por el inverso de su primer valor propio, de modo que ninguno domine los ejes por traer más variables.`,
      `A ${nombre} was carried out on ${P.n} individuals with the variables organised into ${R.grupos.length} blocks (${R.grupos.map(g => `${g.nombre}, ${g.nVar}`).join('; ')}). Each block was weighted by the inverse of its first eigenvalue, so that none dominates the axes by sheer number of variables.`));
  }

  partes.push(TT(
    `Se retuvieron ${P.k} eje${P.k > 1 ? 's' : ''}, que representan el ${fmtPct(P.cum[P.k - 1], 1)} de la inercia total${P.criteria.every(c => c.k === P.kRec) ? ', número en el que coincidieron todos los criterios' : `; los criterios discreparon (${[...new Set(P.criteria.map(c => c.k))].sort((a, b) => a - b).join(', ')}) y se adoptó ${P.k}`}.`,
    `${P.k} ${P.k > 1 ? 'axes were' : 'axis was'} retained, representing ${fmtPct(P.cum[P.k - 1], 1)} of the total inertia${P.criteria.every(c => c.k === P.kRec) ? ', a number on which every criterion agreed' : `; the criteria disagreed (${[...new Set(P.criteria.map(c => c.k))].sort((a, b) => a - b).join(', ')}) and ${P.k} was adopted`}.`));

  I.ejes.forEach((e, d) => {
    const f = e.items.filter(x => x.ctr >= I.umbralCtr);
    const pos = f.filter(x => x.valor > 0).slice(0, 3), neg = f.filter(x => x.valor < 0).slice(0, 3);
    if (!pos.length && !neg.length) return;
    partes.push(TT(
      `El eje ${d + 1} (${fmtPct(P.pct[d], 1)}) opone ${pos.map(x => x.name).join(', ') || tt('nada en el lado positivo')} frente a ${neg.map(x => x.name).join(', ') || tt('nada en el lado negativo')}${I.names[d] ? `, y puede leerse como «${I.names[d]}»` : ''}.`,
      `Axis ${d + 1} (${fmtPct(P.pct[d], 1)}) opposes ${pos.map(x => x.name).join(', ') || 'nothing on the positive side'} against ${neg.map(x => x.name).join(', ') || 'nothing on the negative side'}${I.names[d] ? `, and can be read as “${I.names[d]}”` : ''}.`));
  });

  const sig = I.cat.filter(r => r.vtest.some(v => Math.abs(v) >= 1.96));
  if (sig.length) partes.push(TT(
    `Las categorías que caracterizan significativamente algún eje (|v| ≥ 1.96) son: ${sig.slice(0, 6).map(r => r.name).join('; ')}${sig.length > 6 ? `, y ${sig.length - 6} más` : ''}.`,
    `The categories that significantly characterise an axis (|v| ≥ 1.96) are: ${sig.slice(0, 6).map(r => r.name).join('; ')}${sig.length > 6 ? `, and ${sig.length - 6} more` : ''}.`));

  if (id === 'mfa') {
    const G = R.grupos.length;
    const pares = [];
    for (let i = 0; i < G; i++) for (let j = i + 1; j < G; j++) pares.push({ a: R.grupos[i].nombre, b: R.grupos[j].nombre, rv: R.RV[i][j] });
    pares.sort((x, y) => y.rv - x.rv);
    /* Con dos bloques solo hay un par: decir "va de X a X" es absurdo. */
    if (pares.length === 1) partes.push(TT(
      `La estructura compartida entre los dos bloques, medida con el coeficiente RV, es de ${fmtNum(pares[0].rv, 3)}.`,
      `The structure shared between the two blocks, measured by the RV coefficient, is ${fmtNum(pares[0].rv, 3)}.`));
    else if (pares.length > 1) partes.push(TT(
      `La estructura compartida entre bloques, medida con el coeficiente RV, va de ${fmtNum(pares[pares.length - 1].rv, 3)} (${pares[pares.length - 1].a}–${pares[pares.length - 1].b}) a ${fmtNum(pares[0].rv, 3)} (${pares[0].a}–${pares[0].b}).`,
      `The structure shared between blocks, measured by the RV coefficient, ranges from ${fmtNum(pares[pares.length - 1].rv, 3)} (${pares[pares.length - 1].a}–${pares[pares.length - 1].b}) to ${fmtNum(pares[0].rv, 3)} (${pares[0].a}–${pares[0].b}).`));
  }

  el('interpNarr').textContent = partes.join(' ');
};

/* Párrafo de métodos para el informe: qué se hizo y sobre qué, con las
   decisiones que un revisor necesita para juzgar el análisis. */
Interp.parrafoMetodos = function (P) {
  const R = P.res, id = P.method;
  const nombre = TT(Metodo.NOMBRE[id][0], Metodo.NOMBRE[id][1]);
  const p = [];
  if (id === 'ca') {
    p.push(TT(
      `Se realizó un <b>${nombre}</b> sobre la tabla de contingencia que cruza <b>${P.datos.qualNombres[0]}</b> y <b>${P.datos.qualNombres[1]}</b> (${R.filas.length} × ${R.cols.length}, ${R.chi2.n} observaciones). La inercia total del análisis es φ² = χ²/n = ${fmtNum(R.chi2.inerciaTotal, 4)}.`,
      `A <b>${nombre}</b> was carried out on the contingency table crossing <b>${P.datos.qualNombres[0]}</b> and <b>${P.datos.qualNombres[1]}</b> (${R.filas.length} × ${R.cols.length}, ${R.chi2.n} observations). The total inertia is φ² = χ²/n = ${fmtNum(R.chi2.inerciaTotal, 4)}.`));
    if (R.chi2.pctBajas > 20) p.push(TT(
      `El ${R.chi2.pctBajas.toFixed(0)} % de las celdas tiene frecuencia esperada menor que 5, de modo que la χ² debe leerse con cautela.`,
      `${R.chi2.pctBajas.toFixed(0)} % of the cells have an expected frequency below 5, so the χ² should be read with caution.`));
  } else if (id === 'mca') {
    p.push(TT(
      `Se realizó un <b>${nombre}</b> sobre ${R.nVar} variables cualitativas (${R.varNombres.join(', ')}), con ${R.cols.length} categorías en total, medidas en ${P.n} individuos. Los porcentajes de inercia se corrigieron por el procedimiento de Greenacre, ya que los valores propios del ACM sobre la tabla disyuntiva están sesgados a la baja.`,
      `A <b>${nombre}</b> was carried out on ${R.nVar} qualitative variables (${R.varNombres.join(', ')}), with ${R.cols.length} categories in total, measured on ${P.n} individuals. Inertia percentages were corrected by Greenacre's procedure, since MCA eigenvalues on the indicator table are biased downwards.`));
  } else if (id === 'famd') {
    p.push(TT(
      `Se realizó un <b>${nombre}</b> sobre ${P.n} individuos descritos por ${R.nQuant} variables cuantitativas (${R.nomQuant.join(', ')}) y ${R.nQual} cualitativas (${R.nomQual.join(', ')}). Las cuantitativas se estandarizaron y cada categoría se codificó dividiendo su indicadora entre la raíz de su proporción, de modo que toda variable aporte la misma inercia; la inercia total es ${R.inerciaEsperada}.`,
      `A <b>${nombre}</b> was carried out on ${P.n} individuals described by ${R.nQuant} quantitative variables (${R.nomQuant.join(', ')}) and ${R.nQual} qualitative ones (${R.nomQual.join(', ')}). The quantitative variables were standardised and each category coded by dividing its indicator by the square root of its proportion, so that every variable contributes the same inertia; total inertia is ${R.inerciaEsperada}.`));
  } else {
    p.push(TT(
      `Se realizó un <b>${nombre}</b> sobre ${P.n} individuos con las variables organizadas en ${R.grupos.length} bloques: ${R.grupos.map(g => `${g.nombre} (${g.nVar})`).join(', ')}. Cada bloque se analizó por separado y sus columnas se dividieron entre su primer valor propio, de modo que ninguno pueda aportar más de 1 a la inercia de un eje con independencia de cuántas variables tenga.`,
      `A <b>${nombre}</b> was carried out on ${P.n} individuals with the variables organised into ${R.grupos.length} blocks: ${R.grupos.map(g => `${g.nombre} (${g.nVar})`).join(', ')}. Each block was analysed separately and its columns divided by its first eigenvalue, so that none can contribute more than 1 to the inertia of an axis regardless of how many variables it has.`));
  }
  if (P.datos.quitadas) p.push(TT(
    `Se excluyeron ${P.datos.quitadas} filas por tener vacíos en las variables cualitativas empleadas.`,
    `${P.datos.quitadas} rows were excluded for having gaps in the qualitative variables used.`));
  p.push(TT(
    `Se retuvieron ${P.k} eje${P.k > 1 ? 's' : ''} (${fmtPct(P.cum[P.k - 1], 1)} de la inercia). Los criterios de retención empleados fueron ${P.criteria.map(c => tt(c.name).toLowerCase()).join(', ')}; Horn y el MAP de Velicer no se aplican porque están definidos para matrices de correlaciones.`,
    `${P.k} ${P.k > 1 ? 'axes were' : 'axis was'} retained (${fmtPct(P.cum[P.k - 1], 1)} of the inertia). The retention criteria used were ${P.criteria.map(c => tt(c.name).toLowerCase()).join(', ')}; Horn and Velicer's MAP do not apply because they are defined for correlation matrices.`));
  p.push(TT('Todos los cálculos se realizaron en PCAPro (Barrera-Guzmán, 2026).', 'All computations were carried out in PCAPro (Barrera-Guzmán, 2026).'));
  return p.join(' ');
};

if (typeof window !== 'undefined') window.Interp = Interp;

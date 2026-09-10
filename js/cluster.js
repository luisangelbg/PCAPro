/* PCAPro — análisis de componentes principales en el navegador.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán
   GPL-3.0-or-later — véase LICENSE en la raíz del repositorio. */

/* Bloque 5b — agrupamiento jerárquico sobre las coordenadas factoriales.
 *
 * El motor está en js/hcpc.js y no sabe nada de la interfaz: recibe una tabla
 * de coordenadas con sus pesos y devuelve el árbol, el corte y la descripción.
 * Este módulo hace tres cosas y ninguna más:
 *
 *   1. adapta la salida de cualquiera de los cinco métodos a lo que el motor
 *      espera, y reúne las variables con las que se van a describir los grupos;
 *   2. dibuja el bloque —configuración, criterios, dendrograma, mapa, tablas,
 *      paragones y borrador—;
 *   3. deja el resultado en state.hcpc para que el informe lo recoja.
 *
 * Una decisión que conviene tener presente: se agrupa sobre las coordenadas
 * PRINCIPALES, sin rotar. Una rotación ortogonal no cambia las distancias
 * entre individuos, así que el resultado sería idéntico; una oblicua sí las
 * cambiaría, y en ese caso lo que se agrupa sigue siendo la solución sin rotar,
 * que es la que define el método.
 */

const Clu = {};

Clu.metodo = () => (state.pca && state.pca.method) || 'pca';
Clu.sigla = () => (Clu.metodo() === 'pca' ? 'ACP' : Metodo.SIGLA[Clu.metodo()][0]);
Clu.siglaT = () => (Clu.metodo() === 'pca' ? TT('ACP', 'PCA') : TT(Metodo.SIGLA[Clu.metodo()][0], Metodo.SIGLA[Clu.metodo()][1]));

/* ============================================================
   Adaptador: de cualquiera de los cinco métodos a una tabla de
   coordenadas más las variables que describen a sus individuos
   ============================================================ */
/* cos² y contribución de cada fila a cada eje, a partir de las coordenadas.
   Se calculan aquí para el ACP —donde el estado guarda las puntuaciones, no
   estas cantidades— y para tener la misma forma en los cinco métodos. */
Clu.calidades = function (rowCoord, K) {
  const cos2 = rowCoord.map(f => {
    const s = f.reduce((a, v) => a + v * v, 0);
    return f.map(v => (s > 0 ? v * v / s : 0));
  });
  const sum = Array.from({ length: K }, (_, k) => rowCoord.reduce((a, f) => a + f[k] * f[k], 0));
  const contrib = rowCoord.map(f => f.map((v, k) => (sum[k] > 0 ? 100 * v * v / sum[k] : 0)));
  return { cos2, contrib };
};

Clu.solucion = function () {
  const P = state.pca;
  if (!P) throw new Error(tt('Todavía no hay una solución factorial que agrupar.'));
  const id = Clu.metodo();
  const quant = [], qual = [];

  if (id === 'pca') {
    const K = P.scores.length;
    const rowCoord = Array.from({ length: P.n }, (_, i) => P.scores.map(c => c[i]));
    /* Se describen los grupos con las variables SIN escalar: el valor test no
       cambia con la escala, pero la media que se muestra al lado sí, y en
       unidades originales se puede leer. */
    (state.activeVars || []).forEach((nm, j) => quant.push({ name: nm, values: state.Xraw[j].slice() }));
    (state.suppNum || []).forEach(s => quant.push({ name: s.name, values: s.values.slice(), supp: true }));
    (state.suppCat || []).forEach(s => { if (s.levels.length >= 2) qual.push({ name: s.name, values: s.values.slice() }); });
    return Object.assign({
      id, K, kRec: P.k, rowCoord, rowW: null, ids: state.rowIds.slice(),
      pct: P.pct.slice(), labels: Array.from({ length: K }, (_, i) => cp(i + 1)),
      quant, qual, n: P.n,
    }, Clu.calidades(rowCoord, K));
  }

  const R = P.res, D = P.datos;
  if (id === 'ca') {
    /* En el AC los "individuos" son las categorías de la variable de filas, y
       lo que las describe son sus propios perfiles: el reparto porcentual
       entre las columnas. Las masas son muy desiguales, así que el valor test
       —que trata las filas por igual— se lee como orden de importancia. */
    const sumas = R.tabla.map(r => r.reduce((a, b) => a + b, 0));
    R.cols.forEach((cn, j) => quant.push({
      name: cn, perfil: true,
      values: R.tabla.map((r, i) => (sumas[i] > 0 ? 100 * r[j] / sumas[i] : 0)),
    }));
    return {
      id, K: R.k, kRec: P.k, rowCoord: R.rowCoord.map(f => f.slice()), rowW: R.rowW.slice(),
      ids: R.filas.slice(), pct: P.pct.slice(),
      labels: Array.from({ length: R.k }, (_, i) => 'Dim' + (i + 1)),
      cos2: R.rowCos2, contrib: R.rowContrib,
      quant, qual, n: R.filas.length,
    };
  }

  /* ACM, AFDM y AFM: individuos de verdad. Las cuantitativas de los datos
     entran como descriptores aunque el método no las haya usado —en el ACM son
     exactamente eso, variables suplementarias—. */
  (D.quantNombres || []).forEach((nm, j) => { if (D.quant[j]) quant.push({ name: nm, values: D.quant[j].slice() }); });
  (state.suppNum || []).forEach(s => quant.push({ name: s.name, values: D.keep.map(i => s.values[i]), supp: true }));
  (D.qualNombres || []).forEach((nm, j) => qual.push({ name: nm, values: D.qual[j].slice() }));
  (state.suppCat || []).forEach(s => {
    if (s.levels.length < 2 || qual.some(q => q.name === s.name)) return;
    qual.push({ name: s.name, values: D.keep.map(i => s.values[i]), supp: true });
  });
  return {
    id, K: R.k, kRec: P.k, rowCoord: R.rowCoord.map(f => f.slice()), rowW: R.rowW.slice(),
    ids: P.labelsRow.slice(), pct: P.pct.slice(),
    labels: Array.from({ length: R.k }, (_, i) => 'Dim' + (i + 1)),
    cos2: R.rowCos2, contrib: R.rowContrib,
    quant, qual, n: P.n,
  };
};

/* ============================================================
   Configuración (5b.1)
   ============================================================ */
Clu.renderConfig = function () {
  const host = el('cluConfig');
  if (!host) return;
  let S0;
  try { S0 = Clu.solucion(); } catch (e) {
    host.innerHTML = `<p class="hint">${tt('Todavía no hay una solución factorial que agrupar.')}</p>`;
    return;
  }
  Clu._sol = S0;
  const ejesDef = Math.min(Math.max(S0.kRec, 2), S0.K, 5);
  const qmax = Math.min(10, S0.n - 1);
  const opciones = ['<option value="auto">' + tt('automático (consenso de los tres criterios)') + '</option>']
    .concat(Array.from({ length: Math.max(qmax - 1, 0) }, (_, i) => `<option value="${i + 2}">${i + 2}</option>`)).join('');

  host.innerHTML = `
    <p class="hint">${TT(
      `Se agrupará sobre las coordenadas del ${Clu.sigla()}: ${S0.n} ${S0.id === 'ca' ? 'filas' : 'individuos'} descritos por sus ejes. Agrupar sobre los ejes y no sobre las variables originales quita el ruido que quedó fuera y permite usar la distancia euclídea aunque los datos de partida sean cualitativos.`,
      `Clustering will run on the ${Clu.siglaT()} coordinates: ${S0.n} ${S0.id === 'ca' ? 'rows' : 'individuals'} described by their axes. Clustering on the axes rather than on the original variables removes the noise left outside and allows Euclidean distance even when the starting data are qualitative.`)}</p>
    <div class="btn-row">
      <label class="inline-label">${tt('Ejes que entran')}
        <input type="number" id="cluEjes" min="1" max="${S0.K}" value="${ejesDef}" style="width:70px"></label>
      <label class="inline-label">${tt('Número de grupos')}
        <select id="cluQ">${opciones}</select></label>
      <label class="inline-label"><input type="checkbox" id="cluCons" checked> ${tt('Consolidar por k-medias')}</label>
    </div>
    <p class="hint">${TT(
      `Con ${ejesDef} ejes se retiene el ${fmtPct(S0.pct.slice(0, ejesDef).reduce((a, b) => a + b, 0), 1)} de la inercia. La consolidación reasigna cada individuo al centro más cercano partiendo del corte del árbol: mejora la partición, pero deja de coincidir exactamente con el dendrograma.`,
      `With ${ejesDef} axes, ${fmtPct(S0.pct.slice(0, ejesDef).reduce((a, b) => a + b, 0), 1)} of the inertia is retained. Consolidation reassigns each individual to the nearest centre starting from the tree cut: it improves the partition, but it no longer matches the dendrogram exactly.`)}</p>`;

  if (S0.n > 900) showMessage('cluMessages', 'warn', TT(
    `Son ${S0.n} individuos: el árbol de Ward puede tardar unos segundos en construirse.`,
    `There are ${S0.n} individuals: the Ward tree may take a few seconds to build.`));
};

/* ============================================================
   Ejecución
   ============================================================ */
Clu.run = function () {
  const btn = el('runCluBtn');
  btn.disabled = true; btn.innerHTML = '<span class="loading"></span> ' + tt('Agrupando…');
  clearMessages('cluMessages');
  setTimeout(() => {
    try {
      const S0 = Clu.solucion();
      const ejes = Math.max(1, Math.min(S0.K, +el('cluEjes').value || 2));
      const qsel = el('cluQ').value;
      const X = S0.rowCoord.map(f => f.slice(0, ejes));
      const H = HCPC.run({ rowCoord: S0.rowCoord, rowW: S0.rowW, k: S0.K },
        { ejes, q: qsel === 'auto' ? null : +qsel, consolidar: el('cluCons').checked, qmax: Math.min(10, S0.n - 1) });

      H.sol = S0; H.X = X; H.ejesUsados = ejes;
      H.silueta = HCPC.silueta(H.coords, H.grupo);
      H.movidos = H.grupo.reduce((a, g, i) => a + (g !== H.grupoAntes[i] ? 1 : 0), 0);
      H.descQuant = S0.quant.map(v => ({ name: v.name, supp: !!v.supp, perfil: !!v.perfil, filas: HCPC.vtest(v.values, H.grupo) }));
      H.descQual = S0.qual.map(v => ({ name: v.name, supp: !!v.supp, filas: HCPC.vtestCat(v.values, H.grupo) }));
      H.descEjes = Array.from({ length: ejes }, (_, d) => ({
        name: S0.labels[d], filas: HCPC.vtest(S0.rowCoord.map(f => f[d]), H.grupo),
      }));
      state.hcpc = H;

      Clu.render();
      el('cluResults').style.display = '';
      enableStep(6, true);
      el('cluResults').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      showMessage('cluMessages', 'error', TT('Error al agrupar: ', 'Error while clustering: ') + err.message);
      console.error(err);
    }
    btn.disabled = false; btn.textContent = tt('Agrupar los individuos →');
  }, 30);
};

/* Nombre visible de un grupo. */
Clu.nombre = g => TT('Grupo ', 'Cluster ') + (g + 1);

/* Los descriptores de un grupo, ordenados por |valor test|. */
Clu.descriptores = function (H, g, umbral) {
  const out = [];
  H.descQuant.forEach(v => {
    const f = v.filas[g];
    if (Math.abs(f.vtest) >= umbral) out.push({ tipo: 'quant', name: v.name, v: f.vtest, media: f.media, general: f.mediaGeneral, supp: v.supp });
  });
  H.descQual.forEach(v => v.filas.filter(f => f.grupo === g && Math.abs(f.vtest) >= umbral)
    .forEach(f => out.push({ tipo: 'qual', name: v.name + ' = ' + f.categoria, v: f.vtest, pctGrupo: f.pctGrupo, pctGlobal: f.pctGlobal, supp: v.supp })));
  out.sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
  return out;
};

/* ============================================================
   Presentación
   ============================================================ */
Clu.render = function () {
  const H = state.hcpc, S0 = H.sol, c = el('cluResults');
  const q = H.q, sig = Clu.siglaT();
  const base = (state.fileName || 'pcapro').replace(/\.[^.]+$/, '') + '_hcpc';
  const umbral = 1.96;

  c.innerHTML = `
    <div class="card">
      <h2>${tt('5b.2 · Resumen de la partición')}</h2>
      <div class="tiles" id="cluTiles"></div>
      <p class="hint" id="cluResumen"></p>
    </div>
    <div class="card">
      <h2>${tt('5b.3 · Cuántos grupos')}</h2>
      <p class="hint">${tt('Tres reglas independientes sobre el mismo árbol. Cuando coinciden, el número de grupos es una propiedad de los datos; cuando discrepan, la partición es una decisión tuya y conviene decirlo así en el texto.')}
        ${tt('En la figura, la barra de cada q es lo que cuesta la fusión que hay que deshacer para llegar a ese número de grupos. No se corta en la barra más alta, sino donde las barras dejan de serlo: el último q que todavía compra algo.')}</p>
      <ul class="check-list" id="cluReglas"></ul>
      <div id="figCorte" style="margin-top:14px"></div>
    </div>
    <div class="card">
      <h2>${tt('5b.4 · Dendrograma')}</h2>
      <p class="hint">${tt('La altura a la que se unen dos ramas es la inercia que se pierde al fusionarlas: cuanto más arriba, más caro fue el agrupamiento y más distintos eran. La línea de puntos marca el corte.')}
        ${H.movidos ? TT(`Los colores son los del corte del árbol; la consolidación movió después ${H.movidos} ${H.movidos === 1 ? 'individuo' : 'individuos'} de grupo, así que el mapa de abajo y las tablas pueden no coincidir con el árbol en esos casos.`,
                         `The colours are those of the tree cut; consolidation then moved ${H.movidos} ${H.movidos === 1 ? 'individual' : 'individuals'} between clusters, so the map below and the tables may differ from the tree in those cases.`) : ''}</p>
      <div id="figDendro"></div>
    </div>
    <div class="card">
      <h2>${tt('5b.5 · Los grupos sobre el plano factorial')}</h2>
      <p class="hint">${tt('El mismo mapa de individuos de siempre, coloreado por grupo. Si el agrupamiento tiene sentido, los grupos ocupan zonas distintas del plano; si se solapan, es que los ejes que los separan no son los dos que estás viendo.')}</p>
      <div id="figCluMap"></div>
    </div>
    <div class="card">
      <h2>${tt('5b.6 · Qué caracteriza a cada grupo')}</h2>
      <p class="hint">${tt('Valor test: cuántas desviaciones típicas se aparta el grupo del conjunto. Por encima de |1.96| la diferencia no se explica por el reparto al azar de los individuos (p < 0.05). Es una descripción, no una prueba: los grupos se construyeron para ser distintos.')}</p>
      <div id="figPerfil"></div>
      <div id="cluDesc" style="margin-top:12px"></div>
    </div>
    <div class="card">
      <h2>${tt('5b.7 · Individuos que representan a cada grupo')}</h2>
      <p class="hint">${tt('Los paragones son los más cercanos al centro de su grupo: los ejemplares típicos. Los específicos son los más alejados de los demás centros: los casos que no se confunden con ningún otro grupo.')}</p>
      <div class="table-scroll" id="cluParagones"></div>
    </div>
    <div class="card">
      <h2>${tt('5b.8 · Borrador para la sección de resultados')}</h2>
      <p class="hint">${tt('Redacción automática con tus propios números. Revísala y adáptala antes de usarla.')}</p>
      <blockquote id="cluNarr" class="cite-ref"></blockquote>
      <div class="btn-row" style="margin-top:8px">
        <button class="btn btn-secondary btn-sm" id="copyCluNarr" data-i18n="⧉ Copiar párrafo">⧉ Copiar párrafo</button>
        <button class="btn btn-secondary btn-sm" id="dlCluAsign">${tt('⬇ Asignación de grupos (CSV)')}</button>
        <button class="btn btn-secondary btn-sm" id="dlCluDesc">${tt('⬇ Descripción de los grupos (CSV)')}</button>
        <button class="btn btn-primary btn-sm" id="goStep6c">${tt('Ir al informe →')}</button>
      </div>
    </div>`;

  /* ---------- resumen ---------- */
  const I = H.inercia;
  const tam = Array.from({ length: q }, (_, g) => H.grupo.reduce((a, x) => a + (x === g ? 1 : 0), 0));
  statTiles('cluTiles', [
    [tt('Grupos'), q, H.criterios.acuerdo ? tt('los tres criterios coinciden') : tt('elegido entre criterios que discrepan'), H.criterios.acuerdo ? 'ok' : 'warn'],
    [tt('Ejes usados'), H.ejesUsados, fmtPct(S0.pct.slice(0, H.ejesUsados).reduce((a, b) => a + b, 0), 1) + ' ' + tt('de la inercia')],
    [tt('Inercia entre grupos'), fmtPct(I.ratio, 1), tt('de la inercia de la nube'), I.ratio >= 0.5 ? 'ok' : 'warn'],
    [tt('Silueta media'), fmtNum(H.silueta, 3), H.silueta >= 0.5 ? tt('estructura clara') : H.silueta >= 0.25 ? tt('estructura débil') : tt('sin estructura apreciable'), H.silueta >= 0.5 ? 'ok' : H.silueta >= 0.25 ? 'warn' : 'bad'],
    [tt('Tamaño de los grupos'), tam.join(' · ')],
  ]);
  const gan = H.consolidacion ? (I.ratio - H.inerciaAntes.ratio) : 0;
  el('cluResumen').innerHTML = H.consolidacion
    ? TT(`La consolidación por k-medias convergió en ${H.consolidacion.iteraciones} ${H.consolidacion.iteraciones === 1 ? 'iteración' : 'iteraciones'} y llevó la inercia entre grupos del ${fmtPct(H.inerciaAntes.ratio, 1)} al ${fmtPct(I.ratio, 1)}${gan <= 0.0005 ? ', es decir, el corte del árbol ya era estable' : ''}.`,
         `The k-means consolidation converged in ${H.consolidacion.iteraciones} ${H.consolidacion.iteraciones === 1 ? 'iteration' : 'iterations'} and raised the between-cluster inertia from ${fmtPct(H.inerciaAntes.ratio, 1)} to ${fmtPct(I.ratio, 1)}${gan <= 0.0005 ? ', which means the tree cut was already stable' : ''}.`)
    : TT('La partición es el corte directo del árbol, sin consolidar.', 'The partition is the direct tree cut, without consolidation.');

  /* ---------- criterios ---------- */
  el('cluReglas').innerHTML = H.criterios.reglas.map(r =>
    `<li class="${r.q === q ? 'ok' : 'info'}"><b>${tt(r.nombre)}: ${r.q} ${tt('grupos')}</b> — ${tt(r.nota)}</li>`).join('') +
    `<li class="${H.criterios.acuerdo ? 'ok' : 'warn'}"><b>${tt('Consenso')}: ${H.criterios.consenso}</b> — ${H.criterios.acuerdo ? tt('los tres criterios coinciden') : tt('los criterios discrepan; manda la regla de la pérdida relativa')}${q !== H.criterios.consenso ? ' · ' + TT(`elegiste ${q}`, `you chose ${q}`) : ''}</li>`;

  const qs = H.criterios.siluetas.map(s => s.q);
  const alt = H.arbol.alturas, n = H.arbol.n;
  const ganancia = qs.map(qq => alt[n - qq]);
  Fig.mount('figCorte', {
    title: tt('Elección del número de grupos'), fileName: base + '_corte',
    defaults: {
      title: tt('Elección del número de grupos'),
      subtitle: TT(`${sig} · ${H.ejesUsados} ejes · corte en ${q} grupos`, `${sig} · ${H.ejesUsados} axes · cut into ${q} clusters`),
      serie: 'ganancia', width: 860, height: 400, barWidth: 0.7, showValues: true,
      barColor: '#5b3fd6', highlightColor: '#e8890c', theme: 'claro', font: 'sans', xlab: '', ylab: '', titleSize: 17,
    },
    controls: [
      { key: 'title', label: tt('Título'), type: 'text' }, { key: 'subtitle', label: tt('Subtítulo'), type: 'text' },
      { key: 'serie', label: tt('Qué se dibuja'), type: 'select', options: [['ganancia', tt('Pérdida de inercia del corte')], ['silueta', tt('Silueta media')]] },
      { key: 'barColor', label: tt('Color de las barras'), type: 'color' },
      { key: 'highlightColor', label: tt('Color del corte elegido'), type: 'color' },
      { key: 'barWidth', label: tt('Ancho de barra'), type: 'range', min: 0.2, max: 1, step: 0.05 },
      { key: 'showValues', label: tt('Valores sobre las barras'), type: 'checkbox' },
      { key: 'xlab', label: tt('Título eje X'), type: 'text' }, { key: 'ylab', label: tt('Título eje Y'), type: 'text' },
      { key: 'width', label: tt('Ancho (px)'), type: 'number', min: 400, max: 1400, step: 20 },
      { key: 'height', label: tt('Alto (px)'), type: 'number', min: 260, max: 800, step: 20 },
      { key: 'theme', label: tt('Tema'), type: 'select', options: Object.entries(Fig.themeNames) },
      { key: 'font', label: tt('Tipografía'), type: 'select', options: Object.entries(Fig.fontNames) },
    ],
    render: cfg => Plots7.corte(cfg, { qs, ganancia, silueta: H.criterios.siluetas.map(s => s.s), elegido: q }),
  });

  /* ---------- dendrograma ---------- */
  Fig.mount('figDendro', {
    title: tt('Dendrograma'), fileName: base + '_dendrograma',
    defaults: {
      title: tt('Agrupamiento jerárquico de Ward'),
      subtitle: TT(`sobre ${H.ejesUsados} ejes del ${sig} · ${S0.n} ${S0.id === 'ca' ? 'filas' : 'individuos'} · ${q} grupos`,
                   `on ${H.ejesUsados} ${sig} axes · ${S0.n} ${S0.id === 'ca' ? 'rows' : 'individuals'} · ${q} clusters`),
      orient: 'vertical', largo: Math.max(620, Math.min(1400, S0.n * 11)), alto: 420,
      palette: 'pcapro', lineWidth: 1.4, colorClusters: true, colorTronco: '#9aa3b2',
      showCut: true, cutColor: '#e8890c', strip: true, raiz: false,
      showLeafLabels: true, maxLabels: 80, labelSize: 9.5,
      legend: true, xlab: '', ylab: '', theme: 'claro', font: 'sans', titleSize: 17,
    },
    controls: [
      { key: 'title', label: tt('Título'), type: 'text' }, { key: 'subtitle', label: tt('Subtítulo'), type: 'text' },
      { key: 'orient', label: tt('Orientación'), type: 'select', options: [['vertical', tt('Hojas abajo')], ['horizontal', tt('Hojas a la izquierda')]] },
      { key: 'palette', label: tt('Paleta de grupos'), type: 'select', options: Object.entries(Fig.paletteNames) },
      { key: 'colorClusters', label: tt('Colorear las ramas por grupo'), type: 'checkbox' },
      { key: 'colorTronco', label: tt('Color del tronco'), type: 'color' },
      { key: 'showCut', label: tt('Línea de corte'), type: 'checkbox' }, { key: 'cutColor', label: tt('Color del corte'), type: 'color' },
      { key: 'strip', label: tt('Franja de grupos'), type: 'checkbox' },
      { key: 'raiz', label: tt('Escala en raíz cuadrada'), type: 'checkbox' },
      { key: 'showLeafLabels', label: tt('Etiquetas de las hojas'), type: 'checkbox' },
      { key: 'maxLabels', label: tt('Máximo de hojas etiquetadas'), type: 'number', min: 0, max: 400, step: 10 },
      { key: 'labelSize', label: tt('Tamaño etiqueta'), type: 'range', min: 5, max: 16, step: 0.5 },
      { key: 'lineWidth', label: tt('Grosor de las ramas'), type: 'range', min: 0.5, max: 4, step: 0.1 },
      { key: 'largo', label: tt('Largo (px)'), type: 'number', min: 400, max: 2400, step: 20 },
      { key: 'alto', label: tt('Alto de las alturas (px)'), type: 'number', min: 200, max: 900, step: 20 },
      { key: 'legend', label: tt('Leyenda'), type: 'checkbox' }, { key: 'ylab', label: tt('Título del eje de alturas'), type: 'text' },
      { key: 'theme', label: tt('Tema'), type: 'select', options: Object.entries(Fig.themeNames) },
      { key: 'font', label: tt('Tipografía'), type: 'select', options: Object.entries(Fig.fontNames) },
    ],
    /* El árbol se colorea con el corte del árbol, no con la partición
       consolidada: si la consolidación movió individuos, colorearlos por su
       grupo final dejaría casi todas las ramas en gris, que es lo contrario
       de lo que la figura debe mostrar. */
    render: cfg => Plots7.dendro(cfg, { merges: H.arbol.merges, alturas: alt, n, grupo: H.grupoAntes, ids: S0.ids, q }),
  });

  /* ---------- mapa factorial coloreado por grupo ---------- */
  const K = S0.K;
  const dimOpts = Array.from({ length: K }, (_, i) => [String(i + 1), S0.labels[i]]);
  const tr = M => Array.from({ length: K }, (_, k) => M.map(f => f[k] || 0));
  const coord = tr(S0.rowCoord);
  const grupos = { name: TT('Grupo', 'Cluster'), levels: Array.from({ length: q }, (_, g) => ({
    level: Clu.nombre(g), idx: H.grupo.map((x, i) => (x === g ? i : -1)).filter(i => i >= 0) })) };
  Fig.mount('figCluMap', {
    title: tt('Mapa de los grupos'), fileName: base + '_mapa',
    defaults: {
      title: tt('Los grupos sobre el plano factorial'),
      subtitle: TT(`${q} grupos · ${sig} · ${fmtPct((S0.pct[0] || 0) + (S0.pct[1] || 0), 1)} de la inercia en el plano`,
                   `${q} clusters · ${sig} · ${fmtPct((S0.pct[0] || 0) + (S0.pct[1] || 0), 1)} of the inertia in the plane`),
      dimX: '1', dimY: K > 1 ? '2' : '1', size: 660, pad: 0.08, equalScale: true,
      theme: 'claro', font: 'sans', palette: 'pcapro', colormap: 'calor',
      colorBy: 'grupo', pointColor: '#5b3fd6', pointSize: 4.4, pointOpacity: 0.85, pointStroke: true, sizeByCos2: false,
      shape: 'concentracion', level: 0.95, fillOpacity: 0.14, ellipseWidth: 1.6,
      showCentroids: true, centroidLabels: true,
      labelMode: 'ninguna', labelSize: 10, labelTopN: 10,
      zeroLines: true, box: false, legend: true, xlab: '', ylab: '', titleSize: 17,
    },
    controls: [
      { key: 'title', label: tt('Título'), type: 'text' }, { key: 'subtitle', label: tt('Subtítulo'), type: 'text' },
      { key: 'dimX', label: tt('Eje horizontal'), type: 'select', options: dimOpts },
      { key: 'dimY', label: tt('Eje vertical'), type: 'select', options: dimOpts },
      { key: 'xlab', label: tt('Título eje X'), type: 'text' }, { key: 'ylab', label: tt('Título eje Y'), type: 'text' },
      { key: 'palette', label: tt('Paleta de grupos'), type: 'select', options: Object.entries(Fig.paletteNames) },
      { key: 'shape', label: tt('Envoltura por grupo'), type: 'select', options: [['concentracion', tt('Elipse de concentración')], ['media', tt('Elipse de confianza de la media')], ['envolvente', tt('Envolvente convexa')], ['ninguna', tt('Ninguna')]] },
      { key: 'level', label: tt('Nivel de confianza'), type: 'select', options: [['0.9', '90 %'], ['0.95', '95 %'], ['0.99', '99 %']] },
      { key: 'fillOpacity', label: tt('Relleno de la elipse'), type: 'range', min: 0, max: 0.5, step: 0.02 },
      { key: 'ellipseWidth', label: tt('Grosor del borde'), type: 'range', min: 0.5, max: 4, step: 0.25 },
      { key: 'showCentroids', label: tt('Centroides'), type: 'checkbox' }, { key: 'centroidLabels', label: tt('Etiqueta del centroide'), type: 'checkbox' },
      { key: 'pointSize', label: tt('Tamaño del punto'), type: 'range', min: 1.5, max: 10, step: 0.2 },
      { key: 'pointOpacity', label: tt('Opacidad'), type: 'range', min: 0.15, max: 1, step: 0.05 },
      { key: 'pointStroke', label: tt('Borde blanco'), type: 'checkbox' },
      { key: 'labelMode', label: tt('Etiquetas'), type: 'select', options: [['ninguna', tt('Ninguna')], ['todas', tt('Todas las que quepan')], ['top', tt('Solo las N que más contribuyen')]] },
      { key: 'labelTopN', label: tt('N etiquetas'), type: 'number', min: 1, max: 60 },
      { key: 'labelSize', label: tt('Tamaño etiqueta'), type: 'range', min: 6, max: 18, step: 0.5 },
      { key: 'equalScale', label: tt('Misma escala en ambos ejes'), type: 'checkbox' },
      { key: 'zeroLines', label: tt('Ejes en cero'), type: 'checkbox' }, { key: 'box', label: tt('Marco'), type: 'checkbox' }, { key: 'legend', label: tt('Leyenda'), type: 'checkbox' },
      { key: 'size', label: tt('Tamaño (px)'), type: 'number', min: 380, max: 1200, step: 20 },
      { key: 'theme', label: tt('Tema'), type: 'select', options: Object.entries(Fig.themeNames) },
      { key: 'font', label: tt('Tipografía'), type: 'select', options: Object.entries(Fig.fontNames) },
    ],
    render: cfg => Plots4.indMap(cfg, {
      coord, cos2: tr(S0.cos2), contrib: tr(S0.contrib),
      ids: S0.ids, labels: S0.labels, pct: S0.pct, groups: grupos,
    }),
  });

  /* ---------- perfil y tablas de descripción ---------- */
  const perfilData = {
    grupos: Array.from({ length: q }, (_, g) => ({
      nombre: Clu.nombre(g), n: tam[g],
      items: Clu.descriptores(H, g, umbral).slice(0, 10).map(o => ({ name: o.name, v: o.v })).reverse(),
    })),
  };
  Fig.mount('figPerfil', {
    title: tt('Perfil de los grupos'), fileName: base + '_perfil',
    defaults: {
      title: tt('Qué distingue a cada grupo'),
      subtitle: tt('valores test por encima de |1.96|, los diez mayores de cada grupo'),
      columnas: Math.min(3, q), anchoPanel: 320, altoBarra: 17, anchoEtiqueta: 118, labelSize: 10,
      palette: 'pcapro', colorAlto: '#0d9488', colorBajo: '#c2410c', showValues: true,
      theme: 'claro', font: 'sans', xlab: '', titleSize: 17,
    },
    controls: [
      { key: 'title', label: tt('Título'), type: 'text' }, { key: 'subtitle', label: tt('Subtítulo'), type: 'text' },
      { key: 'columnas', label: tt('Paneles por fila'), type: 'number', min: 1, max: 5 },
      { key: 'anchoPanel', label: tt('Ancho de cada panel (px)'), type: 'number', min: 200, max: 560, step: 10 },
      { key: 'anchoEtiqueta', label: tt('Ancho del rótulo (px)'), type: 'number', min: 60, max: 240, step: 4 },
      { key: 'altoBarra', label: tt('Alto de barra (px)'), type: 'range', min: 10, max: 30, step: 1 },
      { key: 'colorAlto', label: tt('Color por encima de la media'), type: 'color' },
      { key: 'colorBajo', label: tt('Color por debajo de la media'), type: 'color' },
      { key: 'showValues', label: tt('Mostrar el valor'), type: 'checkbox' },
      { key: 'labelSize', label: tt('Tamaño etiqueta'), type: 'range', min: 6, max: 16, step: 0.5 },
      { key: 'palette', label: tt('Paleta de grupos'), type: 'select', options: Object.entries(Fig.paletteNames) },
      { key: 'theme', label: tt('Tema'), type: 'select', options: Object.entries(Fig.themeNames) },
      { key: 'font', label: tt('Tipografía'), type: 'select', options: Object.entries(Fig.fontNames) },
    ],
    render: cfg => Plots7.perfil(cfg, perfilData),
  });

  Clu.renderTablas(H, umbral);
  Clu.renderParagones(H);
  Clu.renderNarrativa(H, umbral);

  el('copyCluNarr').addEventListener('click', () => copyToClipboard('copyCluNarr', el('cluNarr').textContent));
  el('dlCluAsign').addEventListener('click', () => download(Clu.csvAsignacion(H), base + '_asignacion.csv', 'text/csv'));
  el('dlCluDesc').addEventListener('click', () => download(Clu.csvDescripcion(H), base + '_descripcion.csv', 'text/csv'));
  el('goStep6c').addEventListener('click', () => goStep(6));
};

Clu.renderTablas = function (H, umbral) {
  const host = el('cluDesc'), q = H.q;
  const hayQuant = H.descQuant.length, hayQual = H.descQual.length;
  const perfil = H.sol.id === 'ca';
  host.innerHTML =
    (hayQuant ? `<h3>${perfil ? tt('Perfil de fila por grupo') : tt('Variables cuantitativas')}</h3>` +
      (perfil ? `<p class="hint">${tt('En el AC lo que describe a una fila es su propio perfil: cómo reparte su total entre las columnas. El valor test trata las filas por igual, así que con masas muy desiguales conviene leerlo como orden de importancia y no como una probabilidad.')}</p>` : '') +
      `<div class="table-scroll" id="cluTQ"></div>` : '') +
    (hayQual ? `<h3 style="margin-top:14px">${tt('Categorías')}</h3><div class="table-scroll" id="cluTC"></div>` : '') +
    `<h3 style="margin-top:14px">${tt('Posición de cada grupo en los ejes')}</h3><div class="table-scroll" id="cluTE"></div>`;

  if (hayQuant) {
    const rows = [];
    H.descQuant.forEach(v => v.filas.forEach(f => {
      if (Math.abs(f.vtest) < umbral) return;
      rows.push({ g: Clu.nombre(f.grupo), v: v.name + (v.supp ? ' *' : ''), media: f.media, gen: f.mediaGeneral, vt: f.vtest, p: f.p });
    }));
    rows.sort((a, b) => (a.g < b.g ? -1 : a.g > b.g ? 1 : Math.abs(b.vt) - Math.abs(a.vt)));
    buildTable('cluTQ', [
      { key: 'g', label: TT('Grupo', 'Cluster') }, { key: 'v', label: perfil ? tt('Columna') : tt('Variable') },
      { key: 'media', label: perfil ? tt('% en el grupo') : tt('Media del grupo'), num: true, fmt: x => fmtNum(x, 3) },
      { key: 'gen', label: perfil ? tt('% general') : tt('Media general'), num: true, fmt: x => fmtNum(x, 3) },
      { key: 'vt', label: tt('Valor test'), num: true, fmt: x => fmtNum(x, 2) },
      { key: 'p', label: 'p', num: true, fmt: x => fmtP(x) },
    ], rows, { limit: 120 });
  }
  if (hayQual) {
    const rows = [];
    H.descQual.forEach(v => v.filas.forEach(f => {
      if (Math.abs(f.vtest) < umbral) return;
      rows.push({ g: Clu.nombre(f.grupo), v: v.name + ' = ' + f.categoria + (v.supp ? ' *' : ''),
        pg: f.pctGrupo, pt: f.pctGlobal, nn: `${f.nEnGrupo} / ${f.nGrupo}`, vt: f.vtest, p: f.p });
    }));
    rows.sort((a, b) => (a.g < b.g ? -1 : a.g > b.g ? 1 : Math.abs(b.vt) - Math.abs(a.vt)));
    buildTable('cluTC', [
      { key: 'g', label: TT('Grupo', 'Cluster') }, { key: 'v', label: tt('Categoría') },
      { key: 'nn', label: tt('n en el grupo'), num: true },
      { key: 'pg', label: tt('% del grupo'), num: true, fmt: x => fmtNum(x, 1) },
      { key: 'pt', label: tt('% del total'), num: true, fmt: x => fmtNum(x, 1) },
      { key: 'vt', label: tt('Valor test'), num: true, fmt: x => fmtNum(x, 2) },
      { key: 'p', label: 'p', num: true, fmt: x => fmtP(x) },
    ], rows, { limit: 120 });
  }
  const cols = [{ key: 'g', label: TT('Grupo', 'Cluster') }, { key: 'n', label: 'n', num: true }];
  H.descEjes.forEach((e, d) => cols.push({ key: 'e' + d, label: e.name, num: true, fmt: x => fmtNum(x, 2) }));
  buildTable('cluTE', cols, Array.from({ length: q }, (_, g) => {
    const o = { g: Clu.nombre(g), n: H.descEjes[0].filas[g].n };
    H.descEjes.forEach((e, d) => { o['e' + d] = e.filas[g].media; });
    return o;
  }));
  if (H.descQuant.some(v => v.supp) || H.descQual.some(v => v.supp))
    host.insertAdjacentHTML('beforeend', `<p class="hint">${tt('* variable suplementaria: no intervino en la construcción de los ejes ni del agrupamiento.')}</p>`);
};

Clu.renderParagones = function (H) {
  const rows = [];
  H.paragones.forEach((lista, g) => lista.forEach((o, r) => rows.push({
    g: Clu.nombre(g), tipo: tt('paragón'), pos: r + 1, id: H.sol.ids[o.i], d: o.d })));
  H.especificos.forEach((lista, g) => lista.forEach((o, r) => rows.push({
    g: Clu.nombre(g), tipo: tt('específico'), pos: r + 1, id: H.sol.ids[o.i], d: o.d })));
  rows.sort((a, b) => (a.g < b.g ? -1 : a.g > b.g ? 1 : a.tipo < b.tipo ? -1 : a.tipo > b.tipo ? 1 : a.pos - b.pos));
  buildTable('cluParagones', [
    { key: 'g', label: TT('Grupo', 'Cluster') }, { key: 'tipo', label: tt('Papel') }, { key: 'pos', label: '#', num: true },
    { key: 'id', label: tt('Individuo') },
    { key: 'd', label: tt('Distancia'), num: true, fmt: x => fmtNum(x, 3) },
  ], rows, { limit: 120 });
};

/* ============================================================
   Borrador de resultados
   ============================================================ */
Clu.narrativa = function (H, umbral) {
  const S0 = H.sol, q = H.q, sig = Clu.siglaT();
  const tam = Array.from({ length: q }, (_, g) => H.grupo.reduce((a, x) => a + (x === g ? 1 : 0), 0));
  const p = [];

  p.push(TT(
    `Sobre las coordenadas de los ${H.ejesUsados} primeros ejes del ${sig} —${fmtPct(S0.pct.slice(0, H.ejesUsados).reduce((a, b) => a + b, 0), 1)} de la inercia— se aplicó un agrupamiento jerárquico con el criterio de Ward${H.consolidacion ? ', consolidado después por k-medias' : ''}.`,
    `A hierarchical clustering with Ward's criterion was applied to the coordinates of the first ${H.ejesUsados} ${sig} axes, which carry ${fmtPct(S0.pct.slice(0, H.ejesUsados).reduce((a, b) => a + b, 0), 1)} of the inertia${H.consolidacion ? ', and was then consolidated by k-means' : ''}.`));

  p.push(H.criterios.acuerdo
    ? TT(`Los tres criterios examinados —mayor salto de altura, mayor pérdida relativa de inercia y máxima silueta media— coincidieron en ${H.criterios.consenso} grupos.`,
         `The three criteria examined — largest height jump, largest relative loss of inertia and maximum average silhouette — all pointed to ${H.criterios.consenso} clusters.`)
    : TT(`Los criterios no coincidieron (${H.criterios.reglas.map(r => `${tt(r.nombre).toLowerCase()}: ${r.q}`).join('; ')}), y se retuvieron ${q} grupos.`,
         `The criteria did not agree (${H.criterios.reglas.map(r => `${tt(r.nombre).toLowerCase()}: ${r.q}`).join('; ')}), and ${q} clusters were retained.`));

  const lista = (arr, y) => (arr.length > 1 ? arr.slice(0, -1).join(', ') + ' ' + y + ' ' + arr[arr.length - 1] : String(arr[0]));
  p.push(TT(
    `Los grupos reúnen ${lista(tam, 'y')} ${S0.id === 'ca' ? 'filas' : 'individuos'} y la partición explica el ${fmtPct(H.inercia.ratio, 1)} de la inercia de la nube; la silueta media es de ${fmtNum(H.silueta, 3)}.`,
    `The clusters hold ${lista(tam, 'and')} ${S0.id === 'ca' ? 'rows' : 'individuals'} and the partition accounts for ${fmtPct(H.inercia.ratio, 1)} of the inertia of the cloud; the average silhouette is ${fmtNum(H.silueta, 3)}.`));

  for (let g = 0; g < q; g++) {
    const d = Clu.descriptores(H, g, umbral);
    if (!d.length) {
      p.push(TT(`El ${Clu.nombre(g).toLowerCase()} (n = ${tam[g]}) no presenta ninguna característica por encima del umbral: lo define su posición en los ejes, no una variable concreta.`,
                `${Clu.nombre(g)} (n = ${tam[g]}) shows no characteristic above the threshold: it is defined by its position on the axes, not by any single variable.`));
      continue;
    }
    /* Una categoría no tiene valores "altos": está sobrerrepresentada o casi
       ausente. Mezclar las dos redacciones producía frases falsas del tipo
       "valores altos de Species = setosa". */
    const sel = (tipo, signo) => d.filter(o => o.tipo === tipo && (signo > 0 ? o.v > 0 : o.v < 0)).slice(0, 4).map(o => o.name);
    const qAlto = sel('quant', 1), qBajo = sel('quant', -1);
    const cSi = sel('qual', 1), cNo = sel('qual', -1);
    const es = [], en = [];
    if (qAlto.length) { es.push('valores altos de ' + qAlto.join(', ')); en.push('high values of ' + qAlto.join(', ')); }
    if (qBajo.length) { es.push('valores bajos de ' + qBajo.join(', ')); en.push('low values of ' + qBajo.join(', ')); }
    if (cSi.length) { es.push('un exceso de ' + cSi.join(', ')); en.push('an excess of ' + cSi.join(', ')); }
    if (cNo.length) { es.push('la práctica ausencia de ' + cNo.join(', ')); en.push('the near absence of ' + cNo.join(', ')); }
    const par = H.paragones[g] && H.paragones[g][0];
    p.push(TT(
      `El ${Clu.nombre(g).toLowerCase()} (n = ${tam[g]}) se caracteriza por ${lista(es, 'y')}${par ? `; su ejemplar más típico es ${S0.ids[par.i]}` : ''}.`,
      `${Clu.nombre(g)} (n = ${tam[g]}) is characterised by ${lista(en, 'and')}${par ? `; its most typical member is ${S0.ids[par.i]}` : ''}.`));
  }

  p.push(TT(
    'Los valores test describen la partición, no la ponen a prueba: los grupos se construyeron precisamente para maximizar las diferencias, así que no deben presentarse como contrastes de hipótesis.',
    'The test values describe the partition, they do not test it: the clusters were built precisely to maximise the differences, so they must not be presented as hypothesis tests.'));

  return p.join(' ');
};

Clu.renderNarrativa = function (H, umbral) {
  el('cluNarr').textContent = Clu.narrativa(H, umbral);
};

/* ============================================================
   Exportación
   ============================================================ */
Clu.csvAsignacion = function (H) {
  const S0 = H.sol, K = H.ejesUsados;
  const cab = [tt('Individuo'), TT('Grupo', 'Cluster')].concat(S0.labels.slice(0, K));
  const filas = S0.ids.map((id, i) => [id, H.grupo[i] + 1].concat(S0.rowCoord[i].slice(0, K).map(v => fmtNum(v, 6))));
  return [cab, ...filas].map(r => r.map(csvEscape).join(',')).join('\n');
};

Clu.csvDescripcion = function (H) {
  const out = [[TT('Grupo', 'Cluster'), tt('Tipo'), tt('Variable'), tt('Valor en el grupo'), tt('Valor general'), tt('Valor test'), 'p']];
  H.descQuant.forEach(v => v.filas.forEach(f => out.push([
    Clu.nombre(f.grupo), tt('cuantitativa'), v.name, fmtNum(f.media, 6), fmtNum(f.mediaGeneral, 6), fmtNum(f.vtest, 4), fmtP(f.p)])));
  H.descQual.forEach(v => v.filas.forEach(f => out.push([
    Clu.nombre(f.grupo), tt('categoría'), v.name + ' = ' + f.categoria, fmtNum(f.pctGrupo, 3), fmtNum(f.pctGlobal, 3), fmtNum(f.vtest, 4), fmtP(f.p)])));
  H.descEjes.forEach(e => e.filas.forEach(f => out.push([
    Clu.nombre(f.grupo), tt('eje'), e.name, fmtNum(f.media, 6), fmtNum(f.mediaGeneral, 6), fmtNum(f.vtest, 4), fmtP(f.p)])));
  return out.map(r => r.map(csvEscape).join(',')).join('\n');
};

/* ============================================================
   Enganches
   ============================================================ */
Clu.abrir = function () {
  goStep(7);
  Clu.renderConfig();
};

document.addEventListener('DOMContentLoaded', () => {
  const b = el('runCluBtn');
  if (!b) return;
  b.addEventListener('click', Clu.run);
  els('.goCluster').forEach(x => x.addEventListener('click', Clu.abrir));
  if (typeof I18N !== 'undefined') I18N.onChange.push(() => {
    if (el('cluConfig') && el('cluConfig').innerHTML) Clu.renderConfig();
    if (state.hcpc && el('cluResults') && el('cluResults').style.display !== 'none') Clu.render();
  });
});

if (typeof window !== 'undefined') window.Clu = Clu;

/* PCAPro — análisis de componentes principales en el navegador.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán
   GPL-3.0-or-later — véase LICENSE en la raíz del repositorio. */

/* Mapas factoriales del AC, el ACM, el AFDM y el AFM.
 *
 * Dos decisiones sostienen este módulo. La primera: los individuos de los
 * cuatro métodos se dibujan con el MISMO mapa que ya usa el ACP —Plots4.indMap—
 * y las cuantitativas del AFDM y del AFM con su mismo círculo de correlaciones.
 * Heredan las elipses, el coloreado por cos² y todo el estudio de edición sin
 * escribir un segundo motor. La segunda: lo que sí es nuevo —el mapa simétrico
 * del AC, las categorías, los bloques, los puntos parciales— sale de UN solo
 * dibujante genérico de series de puntos, Plots6.puntos, que usa los mismos
 * ayudantes de marco, ejes y etiquetas que plots4.js, así que todas las figuras
 * de la aplicación tienen el mismo aspecto.
 */

const Plots6 = (function () {
  /* Fig y Plots4 se resuelven al dibujar, no al cargar: figure.js puede
     llegar después de este archivo y nada aquí se usa antes de tener datos. */
  const F = new Proxy({}, { get: (_, k) => Fig[k] });
  const H = () => Plots4._h;

  const glifo = (svg, x, y, r, tipo, fill, stroke, op) => {
    const base = { fill, stroke, 'stroke-width': stroke ? 1 : 0, opacity: op == null ? 0.9 : op };
    if (tipo === 'square') svg.appendChild(F.el('rect', Object.assign({ x: x - r, y: y - r, width: 2 * r, height: 2 * r, rx: r * 0.25 }, base)));
    else if (tipo === 'triangle') svg.appendChild(F.el('path', Object.assign({ d: `M${x},${y - r * 1.15} L${x + r * 1.05},${y + r * 0.75} L${x - r * 1.05},${y + r * 0.75} Z` }, base)));
    else if (tipo === 'diamond') svg.appendChild(F.el('path', Object.assign({ d: `M${x},${y - r * 1.2} L${x + r * 1.2},${y} L${x},${y + r * 1.2} L${x - r * 1.2},${y} Z` }, base)));
    else svg.appendChild(F.el('circle', Object.assign({ cx: x, cy: y, r }, base)));
  };

  /* ------------------------------------------------------------
     Mapa genérico de series de puntos.
     data: { series: [{ name, color, glyph, points: [{ coord, label, cos2, contrib }] }],
             labels, pct, square01 }
     Cada punto trae sus coordenadas en todos los ejes; cfg.dimX/dimY eligen.
     ------------------------------------------------------------ */
  function puntos(cfg, data) {
    const w = +cfg.size || 660, h = w;
    const { svg, t, font } = H().frame(cfg, w, h);
    H().addTitle(svg, cfg, t, font, w);
    const m = { top: cfg.title ? 66 : 40, right: cfg.legend ? 158 : 26, bottom: 54, left: 64 };
    const pw = w - m.left - m.right, ph = h - m.top - m.bottom;
    const K = data.labels.length;
    const a = Math.min(+cfg.dimX - 1, K - 1);
    let b = +cfg.dimY - 1;
    /* Una solución de un solo eje —una tabla de dos columnas en el AC, por
       ejemplo— no tiene plano: los puntos se tienden sobre Dim1 y el eje
       vertical queda vacío. Sin este guardado todo salía NaN. */
    const unEje = K < 2 || b >= K || b === a;
    if (unEje) b = -1;

    let pts = [];
    data.series.forEach((s, si) => s.points.forEach(p => {
      const q = p.cos2 ? ((p.cos2[a] || 0) + (b >= 0 ? (p.cos2[b] || 0) : 0)) : 1;
      const c = p.contrib ? ((p.contrib[a] || 0) + (b >= 0 ? (p.contrib[b] || 0) : 0)) : 0;
      pts.push({ p, s, si, x: p.coord[a], y: b >= 0 ? p.coord[b] : 0, q, c });
    }));
    if (+cfg.minCos2 > 0) pts = pts.filter(o => o.q >= +cfg.minCos2);
    if (+cfg.topN > 0) pts = pts.slice().sort((u, v) => v.c - u.c).slice(0, +cfg.topN);

    let x0, x1, y0, y1;
    if (data.square01) { x0 = 0; x1 = 1; y0 = 0; y1 = 1; }
    else {
      const xs = pts.map(o => o.x), ys = pts.map(o => o.y);
      const pad = +cfg.pad || 0.08;
      let mx = Math.max(...xs.map(Math.abs), 1e-9), my = unEje ? mx : Math.max(...ys.map(Math.abs), 1e-9);
      if (cfg.equalScale) mx = my = Math.max(mx, my);
      x0 = -mx * (1 + pad); x1 = mx * (1 + pad); y0 = -my * (1 + pad); y1 = my * (1 + pad);
    }
    const x = F.scaleLinear(x0, x1, m.left, m.left + pw); x.domain = [x0, x1];
    const y = F.scaleLinear(y0, y1, m.top + ph, m.top); y.domain = [y0, y1];
    const ejeTxt = i => `${data.labels[i]}${data.pct && data.pct[i] != null ? ` (${(data.pct[i] * 100).toFixed(1)} %)` : ''}`;
    H().axes(svg, cfg, t, font, m, pw, ph, x, y, cfg.xlab || ejeTxt(a), cfg.ylab || (unEje ? tt('un solo eje') : ejeTxt(b)), h, w);

    if (data.square01 && cfg.diagonal !== false) {
      svg.appendChild(F.el('line', { x1: x(0), y1: y(0), x2: x(1), y2: y(1), stroke: t.axis, 'stroke-dasharray': '3 4', opacity: 0.6 }));
    }

    /* puntos, de menor a mayor contribución para que los importantes queden encima */
    const r0 = +cfg.pointSize || 4.5;
    pts.slice().sort((u, v) => u.c - v.c).forEach(o => {
      const r = cfg.sizeByCos2 ? r0 * (0.5 + o.q) : r0;
      const col = o.s.color || F.color(cfg.palette, o.si);
      glifo(svg, x(o.x), y(o.y), r, o.s.glyph, col, cfg.pointStroke === false ? null : t.bg, +cfg.pointOpacity || 0.9);
    });

    if (cfg.showLabels !== false) {
      const items = pts.slice().sort((u, v) => v.c - u.c).map(o => ({
        x: x(o.x) + (+cfg.pointSize || 4.5) + 3, y: y(o.y) + 4, text: o.p.label,
        color: cfg.labelColorBySeries ? (o.s.color || F.color(cfg.palette, o.si)) : t.fg,
        weight: o.s.bold ? '600' : 'normal',
      }));
      H().placeLabels(svg, items, t, font, +cfg.labelSize || 10.5, +cfg.labelTopN || 0);
    }

    if (cfg.legend && data.series.length) {
      let ly = m.top + 6;
      const lx = m.left + pw + 18;
      data.series.forEach((s, si) => {
        const col = s.color || F.color(cfg.palette, si);
        glifo(svg, lx + 5, ly - 4, 4.5, s.glyph, col, t.bg, 1);
        svg.appendChild(F.text(lx + 16, ly, s.name, { size: 11, fill: t.fg, font }));
        ly += 17;
      });
    }
    return svg;
  }

  /* ------------------------------------------------------------
     Puntos parciales del AFM: cada individuo visto desde cada bloque.
     data: { coord (rows), parciales [g][i][k], grupos [{nombre}], ids, labels, pct, contrib [i][k] }
     ------------------------------------------------------------ */
  function parciales(cfg, data) {
    const w = +cfg.size || 660, h = w;
    const { svg, t, font } = H().frame(cfg, w, h);
    H().addTitle(svg, cfg, t, font, w);
    const m = { top: cfg.title ? 66 : 40, right: cfg.legend ? 158 : 26, bottom: 54, left: 64 };
    const pw = w - m.left - m.right, ph = h - m.top - m.bottom;
    const K = data.labels.length;
    const a = Math.min(+cfg.dimX - 1, K - 1);
    const b = (K < 2 || +cfg.dimY - 1 >= K || +cfg.dimY - 1 === a) ? a : +cfg.dimY - 1;
    const n = data.coord.length, G = data.grupos.length;

    /* qué individuos se dibujan: los N que más contribuyen al plano, o todos */
    let idx = data.coord.map((_, i) => i);
    if (!cfg.todos) {
      const c = i => (data.contrib[i][a] || 0) + (data.contrib[i][b] || 0);
      idx = idx.sort((u, v) => c(v) - c(u)).slice(0, +cfg.topN || 8);
    }

    let mx = 1e-9, my = 1e-9;
    idx.forEach(i => {
      mx = Math.max(mx, Math.abs(data.coord[i][a])); my = Math.max(my, Math.abs(data.coord[i][b]));
      for (let g = 0; g < G; g++) { mx = Math.max(mx, Math.abs(data.parciales[g][i][a])); my = Math.max(my, Math.abs(data.parciales[g][i][b])); }
    });
    if (cfg.equalScale !== false) mx = my = Math.max(mx, my);
    const pad = 1 + (+cfg.pad || 0.08);
    const x = F.scaleLinear(-mx * pad, mx * pad, m.left, m.left + pw); x.domain = [-mx * pad, mx * pad];
    const y = F.scaleLinear(-my * pad, my * pad, m.top + ph, m.top); y.domain = [-my * pad, my * pad];
    const ejeTxt = i => `${data.labels[i]} (${(data.pct[i] * 100).toFixed(1)} %)`;
    H().axes(svg, cfg, t, font, m, pw, ph, x, y, cfg.xlab || ejeTxt(a), cfg.ylab || ejeTxt(b), h, w);

    const colG = g => F.color(cfg.palette, g);
    idx.forEach(i => {
      const gx = x(data.coord[i][a]), gy = y(data.coord[i][b]);
      for (let g = 0; g < G; g++) {
        const px = x(data.parciales[g][i][a]), py = y(data.parciales[g][i][b]);
        svg.appendChild(F.el('line', { x1: gx, y1: gy, x2: px, y2: py, stroke: colG(g), 'stroke-width': +cfg.lineWidth || 1.2, opacity: 0.75 }));
        glifo(svg, px, py, (+cfg.pointSize || 4.5) * 0.85, 'circle', colG(g), t.bg, 0.95);
      }
      glifo(svg, gx, gy, +cfg.pointSize || 4.5, 'diamond', t.fg, t.bg, 1);
    });
    if (cfg.showLabels !== false) {
      H().placeLabels(svg, idx.map(i => ({ x: x(data.coord[i][a]) + 8, y: y(data.coord[i][b]) + 4, text: data.ids[i] })),
        t, font, +cfg.labelSize || 10.5, 0);
    }
    if (cfg.legend) {
      let ly = m.top + 6; const lx = m.left + pw + 18;
      glifo(svg, lx + 5, ly - 4, 4.5, 'diamond', t.fg, t.bg, 1);
      svg.appendChild(F.text(lx + 16, ly, tt('punto global'), { size: 11, fill: t.fg, font })); ly += 17;
      data.grupos.forEach((g, gi) => {
        glifo(svg, lx + 5, ly - 4, 4, 'circle', colG(gi), t.bg, 1);
        svg.appendChild(F.text(lx + 16, ly, g.nombre, { size: 11, fill: t.fg, font })); ly += 17;
      });
    }
    return svg;
  }

  return { puntos, parciales };
})();

/* ============================================================
   Bloque 4 para los métodos distintos del ACP
   ============================================================ */
const Mapas = {};

Mapas.contenedor = function () {
  let c = el('mapasResults');
  if (!c) { c = mk('div', { id: 'mapasResults' }); el('facResults').parentNode.insertBefore(c, el('facResults')); }
  return c;
};

/* controles comunes a los mapas de puntos */
Mapas.controlesPuntos = function (dimOpts, extra) {
  return [
    { key: 'title', label: tt('Título'), type: 'text' },
    { key: 'subtitle', label: tt('Subtítulo'), type: 'text' },
    { key: 'dimX', label: tt('Eje horizontal'), type: 'select', options: dimOpts },
    { key: 'dimY', label: tt('Eje vertical'), type: 'select', options: dimOpts },
    { key: 'xlab', label: tt('Título eje X'), type: 'text' },
    { key: 'ylab', label: tt('Título eje Y'), type: 'text' },
  ].concat(extra || [], [
    { key: 'palette', label: tt('Paleta'), type: 'select', options: Object.entries(Fig.paletteNames) },
    { key: 'minCos2', label: tt('Ocultar cos² menor a'), type: 'range', min: 0, max: 0.9, step: 0.05 },
    { key: 'topN', label: tt('Solo los N que más contribuyen (0 = todos)'), type: 'number', min: 0, max: 200 },
    { key: 'pointSize', label: tt('Tamaño del punto'), type: 'range', min: 1.5, max: 10, step: 0.2 },
    { key: 'sizeByCos2', label: tt('Tamaño según cos²'), type: 'checkbox' },
    { key: 'pointOpacity', label: tt('Opacidad'), type: 'range', min: 0.15, max: 1, step: 0.05 },
    { key: 'showLabels', label: tt('Etiquetas'), type: 'checkbox' },
    { key: 'labelColorBySeries', label: tt('Etiqueta del color de su serie'), type: 'checkbox' },
    { key: 'labelTopN', label: tt('Máximo de etiquetas (0 = todas las que quepan)'), type: 'number', min: 0, max: 200 },
    { key: 'labelSize', label: tt('Tamaño etiqueta'), type: 'range', min: 6, max: 18, step: 0.5 },
    { key: 'equalScale', label: tt('Misma escala en ambos ejes'), type: 'checkbox' },
    { key: 'zeroLines', label: tt('Ejes en cero'), type: 'checkbox' },
    { key: 'box', label: tt('Marco'), type: 'checkbox' },
    { key: 'legend', label: tt('Leyenda'), type: 'checkbox' },
    { key: 'size', label: tt('Tamaño (px)'), type: 'number', min: 380, max: 1200, step: 20 },
    { key: 'theme', label: tt('Tema'), type: 'select', options: Object.entries(Fig.themeNames) },
    { key: 'font', label: tt('Tipografía'), type: 'select', options: Object.entries(Fig.fontNames) },
  ]);
};

Mapas.defPuntos = function (extra) {
  return Object.assign({
    dimX: '1', dimY: (Mapas._K || 2) > 1 ? '2' : '1', size: 660, pad: 0.08, equalScale: true, palette: 'pcapro',
    minCos2: 0, topN: 0, pointSize: 4.8, sizeByCos2: false, pointOpacity: 0.9, pointStroke: true,
    showLabels: true, labelColorBySeries: false, labelTopN: 0, labelSize: 10.5,
    zeroLines: true, box: false, legend: true, xlab: '', ylab: '', theme: 'claro', font: 'sans', titleSize: 17,
  }, extra || {});
};

/* grupos para el mapa de individuos: una cualitativa elegida por el usuario */
Mapas.grupoDe = function (P, nombre) {
  if (!nombre) return null;
  const D = P.datos;
  let vals = null;
  const j = D.qualNombres.indexOf(nombre);
  if (j >= 0) vals = D.qual[j];
  else {
    const sc = (state.suppCat || []).find(c => c.name === nombre);
    if (sc) vals = D.keep.map(i => sc.values[i]);
  }
  if (!vals) return null;
  const niveles = [...new Set(vals.filter(v => v !== null && v !== ''))];
  return { name: nombre, levels: niveles.map(lv => {
    const idx = []; vals.forEach((v, i) => { if (v === lv) idx.push(i); });
    return { level: lv, idx, n: idx.length };
  }).filter(l => l.n > 0) };
};

Mapas.transpuesta = M => (M.length ? M[0].map((_, k) => M.map(r => r[k])) : []);

Mapas.renderBloque4 = function (P) {
  const c = Mapas.contenedor();
  const id = P.method, R = P.res, K = R.k;
  Mapas._K = K;                       // los valores por defecto eligen dimY según cuántos ejes hay
  c.style.display = '';
  el('facResults').style.display = 'none';
  const base = (state.fileName || 'pcapro').replace(/\.[^.]+$/, '') + '_' + id;
  const dimOpts = Array.from({ length: K }, (_, i) => [String(i + 1), 'Dim' + (i + 1)]);
  const labels = dimOpts.map(d => d[1]);
  const plano = fmtPct((P.pct[0] || 0) + (P.pct[1] || 0), 1);
  const sig = TT(Metodo.SIGLA[id][0], Metodo.SIGLA[id][1]);

  /* cualitativas disponibles para colorear individuos */
  const cualNombres = (id === 'mca' || id === 'famd') ? P.datos.qualNombres.slice() : [];
  (state.suppCat || []).forEach(cq => { if (cq.levels.length >= 2 && !cualNombres.includes(cq.name)) cualNombres.push(cq.name); });

  const cards = [];
  const card = (idFig, titulo, nota) => { cards.push(`<div class="card"><h2>${titulo}</h2>${nota ? `<p class="hint">${nota}</p>` : ''}<div id="${idFig}"></div></div>`); };

  card('resumenMapas', TT('4.1 · Resumen del plano', '4.1 · Summary of the plane'));
  if (id === 'ca') {
    card('figCaSim', tt('4.2 · Mapa simétrico: filas y columnas'),
      tt('Filas y columnas en coordenadas principales sobre el mismo plano. La distancia entre dos filas, o entre dos columnas, se lee directamente; la de una fila a una columna solo orienta. Cambia a la vista asimétrica para leer fila-columna con rigor.'));
  }
  if (id === 'mca') {
    card('figCat', tt('4.2 · Mapa de categorías'),
      tt('Cada categoría en el baricentro de los individuos que la presentan, coloreada por su variable. Dos categorías cercanas van juntas en los mismos individuos. Las categorías raras quedan lejos del centro: mira el cos² antes de leerlas.'));
    card('figIndM', tt('4.3 · Mapa de individuos'));
  }
  if (id === 'famd') {
    card('figCircM', tt('4.2 · Círculo de correlaciones (cuantitativas)'));
    card('figEta', tt('4.3 · Mapa de variables: cuantitativas y cualitativas juntas'),
      tt('Cuantitativas por su correlación al cuadrado con cada eje; cualitativas por su η². Ambas en [0, 1], así que un eje se lee viendo qué variables, de uno u otro tipo, están arriba a la derecha.'));
    card('figCat', tt('4.4 · Mapa de categorías'));
    card('figIndM', tt('4.5 · Mapa de individuos'));
  }
  if (id === 'mfa') {
    card('figGrupos', tt('4.2 · Mapa de los bloques'),
      tt('Cada bloque por su inercia en cada eje, entre 0 y 1. Un bloque cerca de (1, 0) está descrito casi por completo por el primer eje; dos bloques cercanos entre sí cuentan la misma historia.'));
    card('figCircM', tt('4.3 · Círculo de correlaciones por bloque'));
    card('figIndM', tt('4.4 · Mapa de individuos'));
    card('figParc', tt('4.5 · Puntos parciales'),
      tt('Cada individuo visto desde cada bloque. El rombo es su posición global, baricentro de los círculos de colores. Cuanto más abiertas las líneas, más discrepan los bloques sobre ese individuo: ahí está la información que el ACP conjunto se traga.'));
  }
  cards.push(`<div class="card"><p class="hint"><b>${tt('Siguiente entrega')}.</b> ${tt('La interpretación y el informe para este método están en construcción.')}</p></div>`);
  c.innerHTML = cards.join('');

  /* ---------- resumen ---------- */
  const tiles = [[tt('Plano 1–2'), plano, tt('inercia representada'), ((P.pct[0] || 0) + (P.pct[1] || 0)) >= 0.6 ? 'ok' : 'warn'],
                 [tt('Ejes retenidos'), P.k, `${tt('de')} ${K}`]];
  if (id === 'ca') tiles.push([tt('Filas'), R.filas.length], [tt('Columnas'), R.cols.length]);
  else tiles.push([tt('Individuos'), P.n], [id === 'mca' ? tt('Categorías') : tt('Columnas'), P.p]);
  if (id === 'mfa') tiles.push([tt('Bloques'), R.grupos.length]);
  el('resumenMapas').innerHTML = '<div class="tiles" id="resumenMapasTiles"></div>';
  statTiles('resumenMapasTiles', tiles);

  /* ---------- AC: mapa simétrico / asimétrico ---------- */
  if (id === 'ca') {
    const filas = R.filas.map((f, i) => ({ coord: R.rowCoord[i], label: f, cos2: R.rowCos2[i], contrib: R.rowContrib[i] }));
    const cols = (asim) => R.cols.map((cn, j) => ({
      coord: asim ? R.colCoord[j].map((v, k) => v / (R.d[k] || 1)) : R.colCoord[j],
      label: cn, cos2: R.colCos2[j], contrib: R.colContrib[j],
    }));
    Fig.mount('figCaSim', {
      title: tt('Mapa del análisis de correspondencias'), fileName: base + '_mapa',
      defaults: Mapas.defPuntos({ title: tt('Análisis de correspondencias'), subtitle: TT(`Plano 1–2 · ${plano} de la inercia · χ² = ${fmtNum(R.chi2.chi2, 1)}`, `Plane 1–2 · ${plano} of the inertia · χ² = ${fmtNum(R.chi2.chi2, 1)}`), asimetrico: false, labelColorBySeries: true }),
      controls: Mapas.controlesPuntos(dimOpts, [{ key: 'asimetrico', label: tt('Vista asimétrica (columnas en coordenadas estándar)'), type: 'checkbox' }]),
      render: cfg => Plots6.puntos(cfg, { labels, pct: P.pct, series: [
        { name: tt('Filas'), color: '#5b3fd6', glyph: 'circle', bold: true, points: filas },
        { name: tt('Columnas'), color: '#0d9488', glyph: 'square', points: cols(cfg.asimetrico) },
      ] }),
    });
  }

  /* ---------- categorías (ACM y AFDM) ---------- */
  if (id === 'mca' || id === 'famd') {
    let series;
    if (id === 'mca') {
      series = R.varNombres.map((vn, j) => ({ name: vn, glyph: 'circle', points: [] }));
      R.cols.forEach((cn, jc) => { series[R.grupoDe[jc]].points.push({ coord: R.colCoord[jc], label: cn, cos2: R.colCos2[jc], contrib: R.colContrib[jc] }); });
    } else {
      series = R.nomQual.map((vn, j) => ({ name: vn, glyph: 'circle', points: [] }));
      let c0 = 0;
      R.niveles.forEach((ns, j) => ns.forEach(() => {
        const jc = R.nQuant + c0;                 // columna de esa categoría en el núcleo
        series[j].points.push({ coord: R.coordCat[c0], label: R.catEtiq[c0], cos2: R.colCos2[jc], contrib: R.colContrib[jc] });
        c0++;
      }));
    }
    Fig.mount('figCat', {
      title: tt('Mapa de categorías'), fileName: base + '_categorias',
      defaults: Mapas.defPuntos({ title: tt('Mapa de categorías'), subtitle: TT(`Plano 1–2 · ${plano} de la inercia`, `Plane 1–2 · ${plano} of the inertia`), labelColorBySeries: true }),
      controls: Mapas.controlesPuntos(dimOpts),
      render: cfg => Plots6.puntos(cfg, { labels, pct: P.pct, series }),
    });
  }

  /* ---------- AFDM: círculo de cuantitativas y mapa de variables ---------- */
  if (id === 'famd') {
    Fig.mount('figCircM', {
      title: tt('Círculo de correlaciones'), fileName: base + '_circulo',
      defaults: Mapas.defCirculo(P, plano),
      controls: Mapas.controlesCirculo(dimOpts),
      render: cfg => Plots4.corrCircle(cfg, { vars: R.nomQuant, coord: R.corQuant, contrib: R.colContrib.slice(0, R.nQuant), labels, pct: P.pct, supp: [] }),
    });
    const sq = [
      { name: tt('Cuantitativas (r²)'), color: '#5b3fd6', glyph: 'circle', points: R.nomQuant.map((vn, j) => ({ coord: R.corQuant[j].map(v => v * v), label: vn })) },
      { name: tt('Cualitativas (η²)'), color: '#e8890c', glyph: 'triangle', points: R.nomQual.map((vn, j) => ({ coord: R.eta2[j], label: vn })) },
    ];
    Fig.mount('figEta', {
      title: tt('Mapa de variables'), fileName: base + '_variables',
      defaults: Mapas.defPuntos({ title: tt('Mapa de variables'), subtitle: tt('correlación al cuadrado y razón de correlación, en [0, 1]'), zeroLines: false, box: true, labelColorBySeries: true, diagonal: true }),
      controls: Mapas.controlesPuntos(dimOpts, [{ key: 'diagonal', label: tt('Diagonal de referencia'), type: 'checkbox' }]),
      render: cfg => Plots6.puntos(cfg, { labels, pct: P.pct, series: sq, square01: true }),
    });
  }

  /* ---------- AFM: bloques, círculo por bloque, parciales ---------- */
  if (id === 'mfa') {
    Fig.mount('figGrupos', {
      title: tt('Mapa de los bloques'), fileName: base + '_bloques',
      defaults: Mapas.defPuntos({ title: tt('Mapa de los bloques'), subtitle: tt('inercia de cada bloque en cada eje'), zeroLines: false, box: true, pointSize: 6, labelColorBySeries: false, diagonal: true }),
      controls: Mapas.controlesPuntos(dimOpts, [{ key: 'diagonal', label: tt('Diagonal de referencia'), type: 'checkbox' }]),
      render: cfg => Plots6.puntos(cfg, { labels, pct: P.pct, square01: true, series: [{ name: tt('Bloques'), color: '#5b3fd6', glyph: 'square', bold: true,
        points: R.grupos.map((g, gi) => ({ coord: R.inerciaGrupo[gi], label: g.nombre })) }] }),
    });
    /* correlaciones de cada variable con cada eje, calculadas aquí porque el
       AFM entrega coordenadas ponderadas, no correlaciones */
    const D = P.datos, n = P.n;
    const cor = D.quant.map(col => {
      const m = S.mean(col), s = GSV.sdPob(col);
      const z = col.map(v => (v - m) / s);
      return Array.from({ length: K }, (_, k) => {
        let acc = 0; for (let i = 0; i < n; i++) acc += z[i] * R.rowCoord[i][k];
        const sf = Math.sqrt(R.values[k]); return sf > 0 ? acc / n / sf : 0;
      });
    });
    Fig.mount('figCircM', {
      title: tt('Círculo de correlaciones'), fileName: base + '_circulo',
      defaults: Mapas.defCirculo(P, plano),
      controls: Mapas.controlesCirculo(dimOpts),
      render: cfg => Plots4.corrCircle(cfg, { vars: D.quantNombres, coord: cor, contrib: R.colContrib, labels, pct: P.pct, supp: [] }),
    });
    Fig.mount('figParc', {
      title: tt('Puntos parciales'), fileName: base + '_parciales',
      defaults: { title: tt('Puntos parciales por bloque'), subtitle: TT(`Plano 1–2 · ${plano} de la inercia`, `Plane 1–2 · ${plano} of the inertia`),
        dimX: '1', dimY: K > 1 ? '2' : '1', size: 660, pad: 0.08, equalScale: true, palette: 'pcapro', topN: 8, todos: false,
        pointSize: 4.8, lineWidth: 1.2, showLabels: true, labelSize: 10.5, zeroLines: true, box: false, legend: true, xlab: '', ylab: '', theme: 'claro', font: 'sans', titleSize: 17 },
      controls: [
        { key: 'title', label: tt('Título'), type: 'text' }, { key: 'subtitle', label: tt('Subtítulo'), type: 'text' },
        { key: 'dimX', label: tt('Eje horizontal'), type: 'select', options: dimOpts }, { key: 'dimY', label: tt('Eje vertical'), type: 'select', options: dimOpts },
        { key: 'todos', label: tt('Todos los individuos'), type: 'checkbox' },
        { key: 'topN', label: tt('Solo los N que más contribuyen'), type: 'number', min: 1, max: 60 },
        { key: 'palette', label: tt('Paleta de bloques'), type: 'select', options: Object.entries(Fig.paletteNames) },
        { key: 'pointSize', label: tt('Tamaño del punto'), type: 'range', min: 1.5, max: 10, step: 0.2 },
        { key: 'lineWidth', label: tt('Grosor de las líneas'), type: 'range', min: 0.5, max: 4, step: 0.25 },
        { key: 'showLabels', label: tt('Etiquetas'), type: 'checkbox' }, { key: 'labelSize', label: tt('Tamaño etiqueta'), type: 'range', min: 6, max: 18, step: 0.5 },
        { key: 'equalScale', label: tt('Misma escala en ambos ejes'), type: 'checkbox' }, { key: 'zeroLines', label: tt('Ejes en cero'), type: 'checkbox' },
        { key: 'box', label: tt('Marco'), type: 'checkbox' }, { key: 'legend', label: tt('Leyenda'), type: 'checkbox' },
        { key: 'size', label: tt('Tamaño (px)'), type: 'number', min: 380, max: 1200, step: 20 },
        { key: 'theme', label: tt('Tema'), type: 'select', options: Object.entries(Fig.themeNames) }, { key: 'font', label: tt('Tipografía'), type: 'select', options: Object.entries(Fig.fontNames) },
      ],
      render: cfg => Plots6.parciales(cfg, { coord: R.rowCoord, parciales: R.parciales, grupos: R.grupos, ids: P.labelsRow, labels, pct: P.pct, contrib: R.rowContrib }),
    });
  }

  /* ---------- individuos: el mismo mapa que el ACP ---------- */
  if (id !== 'ca') {
    const coord = Mapas.transpuesta(R.rowCoord), cos2 = Mapas.transpuesta(R.rowCos2), contrib = Mapas.transpuesta(R.rowContrib);
    const grpOpts = [['', tt('Ninguna')]].concat(cualNombres.map(nm => [nm, nm]));
    Fig.mount('figIndM', {
      title: tt('Mapa de individuos'), fileName: base + '_individuos',
      defaults: {
        title: tt('Mapa factorial de individuos'), subtitle: TT(`${P.n} individuos · ${sig}`, `${P.n} individuals · ${sig}`),
        dimX: '1', dimY: K > 1 ? '2' : '1', size: 660, pad: 0.08, equalScale: true,
        theme: 'claro', font: 'sans', palette: 'pcapro', colormap: 'calor',
        colorBy: 'grupo', groupVar: cualNombres[0] || '', pointColor: '#5b3fd6', pointSize: 4.2, pointOpacity: 0.82,
        pointStroke: true, sizeByCos2: false,
        shape: 'concentracion', level: 0.95, fillOpacity: 0.12, ellipseWidth: 1.6,
        showCentroids: true, centroidLabels: true,
        labelMode: 'ninguna', labelSize: 10, labelTopN: 10,
        zeroLines: true, box: false, legend: true, xlab: '', ylab: '', titleSize: 17,
      },
      controls: [
        { key: 'title', label: tt('Título'), type: 'text' }, { key: 'subtitle', label: tt('Subtítulo'), type: 'text' },
        { key: 'dimX', label: tt('Eje horizontal'), type: 'select', options: dimOpts }, { key: 'dimY', label: tt('Eje vertical'), type: 'select', options: dimOpts },
        { key: 'xlab', label: tt('Título eje X'), type: 'text' }, { key: 'ylab', label: tt('Título eje Y'), type: 'text' },
        { key: 'groupVar', label: tt('Variable de grupo'), type: 'select', options: grpOpts },
        { key: 'colorBy', label: tt('Colorear por'), type: 'select', options: [['grupo', tt('Grupo / color fijo')], ['cos2', tt('Calidad (cos²)')], ['contrib', tt('Contribución')]] },
        { key: 'palette', label: tt('Paleta de grupos'), type: 'select', options: Object.entries(Fig.paletteNames) },
        { key: 'colormap', label: tt('Paleta continua'), type: 'select', options: Object.entries(Fig.colormapNames) },
        { key: 'pointColor', label: tt('Color sin grupo'), type: 'color' },
        { key: 'shape', label: tt('Envoltura por grupo'), type: 'select', options: [['concentracion', tt('Elipse de concentración')], ['media', tt('Elipse de confianza de la media')], ['envolvente', tt('Envolvente convexa')], ['ninguna', tt('Ninguna')]] },
        { key: 'level', label: tt('Nivel de confianza'), type: 'select', options: [['0.9', '90 %'], ['0.95', '95 %'], ['0.99', '99 %']] },
        { key: 'fillOpacity', label: tt('Relleno de la elipse'), type: 'range', min: 0, max: 0.5, step: 0.02 },
        { key: 'ellipseWidth', label: tt('Grosor del borde'), type: 'range', min: 0.5, max: 4, step: 0.25 },
        { key: 'showCentroids', label: tt('Centroides'), type: 'checkbox' }, { key: 'centroidLabels', label: tt('Etiqueta del centroide'), type: 'checkbox' },
        { key: 'pointSize', label: tt('Tamaño del punto'), type: 'range', min: 1.5, max: 10, step: 0.2 },
        { key: 'sizeByCos2', label: tt('Tamaño según cos²'), type: 'checkbox' },
        { key: 'pointOpacity', label: tt('Opacidad'), type: 'range', min: 0.15, max: 1, step: 0.05 },
        { key: 'pointStroke', label: tt('Borde blanco'), type: 'checkbox' },
        { key: 'labelMode', label: tt('Etiquetas'), type: 'select', options: [['ninguna', tt('Ninguna')], ['todas', tt('Todas las que quepan')], ['top', tt('Solo las N que más contribuyen')]] },
        { key: 'labelTopN', label: tt('N etiquetas'), type: 'number', min: 1, max: 60 },
        { key: 'labelSize', label: tt('Tamaño etiqueta'), type: 'range', min: 6, max: 18, step: 0.5 },
        { key: 'equalScale', label: tt('Misma escala en ambos ejes'), type: 'checkbox' },
        { key: 'zeroLines', label: tt('Ejes en cero'), type: 'checkbox' }, { key: 'box', label: tt('Marco'), type: 'checkbox' }, { key: 'legend', label: tt('Leyenda'), type: 'checkbox' },
        { key: 'size', label: tt('Tamaño (px)'), type: 'number', min: 380, max: 1200, step: 20 },
        { key: 'theme', label: tt('Tema'), type: 'select', options: Object.entries(Fig.themeNames) }, { key: 'font', label: tt('Tipografía'), type: 'select', options: Object.entries(Fig.fontNames) },
      ],
      render: cfg => Plots4.indMap(cfg, {
        coord, cos2, contrib, ids: P.labelsRow, labels, pct: P.pct,
        groups: cfg.shape !== 'ninguna' || cfg.colorBy === 'grupo' ? Mapas.grupoDe(P, cfg.groupVar) : null,
      }),
    });
  }
};

/* círculo de correlaciones: mismos valores por defecto y controles que el ACP */
Mapas.defCirculo = function (P, plano) {
  return {
    title: tt('Círculo de correlaciones'), subtitle: TT(`Plano 1–2 · ${plano} de la inercia`, `Plane 1–2 · ${plano} of the inertia`),
    dimX: '1', dimY: (Mapas._K || 2) > 1 ? '2' : '1', colorBy: 'contrib', colormap: 'calor', palette: 'pcapro', singleColor: false, vecColor: '#5b3fd6',
    minCos2: 0, topN: 0, showSupp: false, suppColor: '#e8890c', unitCircle: true, innerCircle: true,
    showLabels: true, labelSize: 11, vecWidth: 1.8, zeroLines: true, box: false, legend: true,
    xlab: '', ylab: '', size: 620, theme: 'claro', font: 'sans', titleSize: 17,
  };
};
Mapas.controlesCirculo = function (dimOpts) {
  return [
    { key: 'title', label: tt('Título'), type: 'text' }, { key: 'subtitle', label: tt('Subtítulo'), type: 'text' },
    { key: 'dimX', label: tt('Eje horizontal'), type: 'select', options: dimOpts }, { key: 'dimY', label: tt('Eje vertical'), type: 'select', options: dimOpts },
    { key: 'xlab', label: tt('Título eje X'), type: 'text' }, { key: 'ylab', label: tt('Título eje Y'), type: 'text' },
    { key: 'colorBy', label: tt('Colorear por'), type: 'select', options: [['cos2', tt('Calidad (cos²)')], ['contrib', tt('Contribución')], ['variable', tt('Variable')]] },
    { key: 'colormap', label: tt('Paleta continua'), type: 'select', options: Object.entries(Fig.colormapNames) },
    { key: 'palette', label: tt('Paleta categórica'), type: 'select', options: Object.entries(Fig.paletteNames) },
    { key: 'singleColor', label: tt('Un solo color'), type: 'checkbox' }, { key: 'vecColor', label: tt('Color único'), type: 'color' },
    { key: 'minCos2', label: tt('Ocultar cos² menor a'), type: 'range', min: 0, max: 0.9, step: 0.05 },
    { key: 'topN', label: tt('Solo las N mejores (0 = todas)'), type: 'number', min: 0, max: 60 },
    { key: 'unitCircle', label: tt('Círculo unitario'), type: 'checkbox' }, { key: 'innerCircle', label: tt('Círculo 0.71'), type: 'checkbox' },
    { key: 'showLabels', label: tt('Etiquetas'), type: 'checkbox' }, { key: 'labelSize', label: tt('Tamaño etiqueta'), type: 'range', min: 7, max: 20, step: 0.5 },
    { key: 'vecWidth', label: tt('Grosor del vector'), type: 'range', min: 0.5, max: 5, step: 0.25 },
    { key: 'zeroLines', label: tt('Ejes en cero'), type: 'checkbox' }, { key: 'box', label: tt('Marco'), type: 'checkbox' }, { key: 'legend', label: tt('Leyenda'), type: 'checkbox' },
    { key: 'size', label: tt('Tamaño (px)'), type: 'number', min: 380, max: 1100, step: 20 },
    { key: 'theme', label: tt('Tema'), type: 'select', options: Object.entries(Fig.themeNames) }, { key: 'font', label: tt('Tipografía'), type: 'select', options: Object.entries(Fig.fontNames) },
  ];
};

document.addEventListener('DOMContentLoaded', () => {
  if (typeof I18N !== 'undefined') I18N.onChange.push(() => {
    if (state.pca && state.pca.method && state.pca.method !== 'pca' && el('mapasResults') && el('mapasResults').style.display !== 'none') Mapas.renderBloque4(state.pca);
  });
});

if (typeof window !== 'undefined') { window.Mapas = Mapas; window.Plots6 = Plots6; }

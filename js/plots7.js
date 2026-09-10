/* PCAPro — análisis de componentes principales en el navegador.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán
   GPL-3.0-or-later — véase LICENSE en la raíz del repositorio. */

/* Figuras del agrupamiento jerárquico (bloque 5b).
 *
 * Tres dibujantes nuevos. El dendrograma es el único que no tenía nada
 * parecido en la aplicación; los otros dos son variaciones de barras que se
 * apoyan en los mismos ayudantes de marco y de etiquetas que plots4.js, para
 * que el conjunto de figuras siga teniendo un solo aspecto.
 *
 * El mapa factorial coloreado por grupo NO está aquí: es el mapa de individuos
 * de siempre (Plots4.indMap) al que se le pasa la partición como variable de
 * grupo, así que hereda las elipses, los centroides y todo el panel de edición
 * sin escribir una línea.
 */

const Plots7 = (function () {
  /* Igual que en mapas.js: figure.js puede cargarse después que este archivo. */
  const F = new Proxy({}, { get: (_, k) => Fig[k] });
  const H = () => Plots4._h;

  /* ------------------------------------------------------------
     Del registro de fusiones al árbol dibujable
     ------------------------------------------------------------
     HCPC.ward devuelve las fusiones en el orden en que ocurrieron, cada una
     identificada por los dos representantes vivos que se unieron. Para
     dibujar hace falta el árbol propiamente dicho: qué nodo cuelga de cuál.
     ------------------------------------------------------------ */
  function arbolDe(merges, n) {
    const nodos = [];
    for (let i = 0; i < n; i++) nodos.push({ id: i, hoja: true, i, h: 0, nm: 1 });
    const nodoDe = Array.from({ length: n }, (_, i) => i);
    const miembros = Array.from({ length: n }, (_, i) => [i]);
    merges.forEach((m, s) => {
      const L = nodoDe[m.a], R = nodoDe[m.b], id = n + s;
      nodos.push({ id, hoja: false, izq: L, der: R, h: m.altura, nm: nodos[L].nm + nodos[R].nm });
      miembros[id] = miembros[L].concat(miembros[R]);
      nodoDe[m.a] = id;
    });
    return { nodos, miembros, raiz: nodos.length - 1 };
  }

  /* Orden de las hojas: recorrido en profundidad, dejando a la izquierda la
     rama que se cerró antes. Iterativo porque con miles de individuos la
     recursión desborda la pila. */
  function ordenHojas(A) {
    const orden = [], pila = [A.raiz];
    while (pila.length) {
      const id = pila.pop(), nd = A.nodos[id];
      if (nd.hoja) { orden.push(nd.i); continue; }
      const a = A.nodos[nd.izq], b = A.nodos[nd.der];
      const [p, q] = a.h <= b.h ? [nd.izq, nd.der] : [nd.der, nd.izq];
      pila.push(q, p);                       // p se procesa primero
    }
    return orden;
  }

  /* ------------------------------------------------------------
     Dendrograma
     ------------------------------------------------------------
     data: { merges, n, grupo, ids, q, alturas }
     ------------------------------------------------------------ */
  function dendro(cfg, data) {
    const n = data.n;
    const A = arbolDe(data.merges, n);
    const orden = ordenHojas(A);
    const pos = new Array(n);                // posición de cada hoja en el eje
    orden.forEach((i, k) => { pos[i] = k; });

    const vertical = cfg.orient !== 'horizontal';
    const q = data.q || 1;
    const alt = data.alturas;
    /* La línea de corte va entre la última fusión que se conserva y la primera
       que se deshace. Con Ward las alturas son monótonas, así que el punto
       medio es una línea legítima, no un adorno. */
    const hCorte = q >= 2 && q <= n - 1 ? (alt[n - 1 - q] + alt[n - q]) / 2 : null;

    /* grupo de un nodo: el de sus miembros si todos coinciden */
    const grupoDe = id => {
      const ms = A.miembros[id] || [id];
      if (!data.grupo) return -1;
      const g = data.grupo[ms[0]];
      for (let k = 1; k < ms.length; k++) if (data.grupo[ms[k]] !== g) return -1;
      return g;
    };

    const hmax = A.nodos[A.raiz].h || 1;
    const tf = v => cfg.raiz === true ? Math.sqrt(v) : v;   // escala de alturas
    const vmax = tf(hmax) * 1.04;

    /* --- lienzo --- */
    const nEtiq = n <= (+cfg.maxLabels || 80) && cfg.showLeafLabels !== false;
    const largoEtiq = nEtiq ? Math.min(120, 7 + 6.2 * Math.max(...data.ids.map(s => String(s).length))) : 0;
    const largo = +cfg.largo || 900;         // a lo largo de las hojas
    const alto = +cfg.alto || 420;           // a lo alto de las alturas
    const franja = cfg.strip !== false && data.grupo ? 12 : 0;

    let w, h, m;
    if (vertical) {
      m = { top: cfg.title ? 66 : 30, right: cfg.legend !== false ? 150 : 24, bottom: 42 + franja + largoEtiq, left: 66 };
      w = largo + m.left + m.right; h = alto + m.top + m.bottom;
    } else {
      m = { top: cfg.title ? 66 : 30, right: 30, bottom: 46, left: 66 + franja + largoEtiq };
      w = alto + m.left + m.right + (cfg.legend !== false ? 150 : 0); h = largo + m.top + m.bottom;
    }
    const { svg, t, font } = H().frame(cfg, w, h);
    H().addTitle(svg, cfg, t, font, w);

    const anchoHojas = vertical ? w - m.left - m.right : h - m.top - m.bottom;
    const anchoAlt = alto;
    const paso = anchoHojas / Math.max(n, 1);
    /* u = posición de hoja; v = altura */
    const u = k => (vertical ? m.left : m.top) + (k + 0.5) * paso;
    const v = vertical
      ? F.scaleLinear(0, vmax, m.top + anchoAlt, m.top)
      : F.scaleLinear(0, vmax, m.left, m.left + anchoAlt);
    const P = (uu, vv) => (vertical ? [uu, v(tf(vv))] : [v(tf(vv)), uu]);

    /* --- eje de alturas --- */
    const ticks = F.ticks(0, vmax, 6);
    ticks.forEach(tv => {
      const val = cfg.raiz === true ? tv * tv : tv;
      if (vertical) {
        if (t.grid !== 'none') svg.appendChild(F.el('line', { x1: m.left, y1: v(tv), x2: m.left + anchoHojas, y2: v(tv), stroke: t.grid }));
        svg.appendChild(F.text(m.left - 8, v(tv), F.fmtTick(+val.toPrecision(3)), { role: 'tick', size: 10.5, fill: t.muted, anchor: 'end', baseline: 'middle', font }));
      } else {
        if (t.grid !== 'none') svg.appendChild(F.el('line', { x1: v(tv), y1: m.top, x2: v(tv), y2: m.top + anchoHojas, stroke: t.grid }));
        svg.appendChild(F.text(v(tv), m.top + anchoHojas + 18, F.fmtTick(+val.toPrecision(3)), { role: 'tick', size: 10.5, fill: t.muted, anchor: 'middle', font }));
      }
    });
    const ylab = cfg.ylab || tt('Pérdida de inercia al fusionar');
    if (vertical) svg.appendChild(F.text(18, m.top + anchoAlt / 2, ylab, { role: 'axis', size: 12.5, fill: t.fg, anchor: 'middle', font, rotate: -90 }));
    else svg.appendChild(F.text(m.left + anchoAlt / 2, h - 12, ylab, { role: 'axis', size: 12.5, fill: t.fg, anchor: 'middle', font }));

    /* --- ramas --- */
    const col = g => (g < 0 ? (cfg.colorTronco || t.axis) : F.color(cfg.palette, g));
    const lw = +cfg.lineWidth || 1.4;
    const uDe = new Array(A.nodos.length).fill(0);
    /* de abajo arriba: cada nodo interno ya tiene calculada la u de sus hijos */
    for (let id = 0; id < A.nodos.length; id++) {
      const nd = A.nodos[id];
      uDe[id] = nd.hoja ? u(pos[nd.i]) : (uDe[nd.izq] + uDe[nd.der]) / 2;
    }
    const ramas = F.g ? F.g() : null;
    for (let id = n; id < A.nodos.length; id++) {
      const nd = A.nodos[id];
      const g = cfg.colorClusters === false ? -1 : grupoDe(id);
      const c = col(g);
      const [xa, ya] = P(uDe[nd.izq], A.nodos[nd.izq].h);
      const [xa2, ya2] = P(uDe[nd.izq], nd.h);
      const [xb, yb] = P(uDe[nd.der], A.nodos[nd.der].h);
      const [xb2, yb2] = P(uDe[nd.der], nd.h);
      const d = `M${xa},${ya} L${xa2},${ya2} L${xb2},${yb2} L${xb},${yb}`;
      const rama = F.el('path', { d, fill: 'none', stroke: c, 'stroke-width': lw, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
      if (ramas) ramas.appendChild(rama); else svg.appendChild(rama);
    }
    if (ramas) svg.appendChild(ramas);

    /* --- línea de corte --- */
    if (hCorte != null && cfg.showCut !== false) {
      const [x1, y1] = P(vertical ? m.left : m.top, hCorte);
      const largoTot = anchoHojas;
      if (vertical) svg.appendChild(F.el('line', { x1: m.left, y1, x2: m.left + largoTot, y2: y1, stroke: cfg.cutColor || '#e8890c', 'stroke-width': 1.6, 'stroke-dasharray': '6 4' }));
      else svg.appendChild(F.el('line', { x1, y1: m.top, x2: x1, y2: m.top + largoTot, stroke: cfg.cutColor || '#e8890c', 'stroke-width': 1.6, 'stroke-dasharray': '6 4' }));
      const et = TT(`corte en ${q} grupos`, `cut into ${q} clusters`);
      if (vertical) svg.appendChild(F.text(m.left + largoTot - 4, y1 - 6, et, { size: 10.5, fill: cfg.cutColor || '#e8890c', anchor: 'end', font, halo: t.bg }));
      else svg.appendChild(F.text(x1 + 5, m.top + 12, et, { size: 10.5, fill: cfg.cutColor || '#e8890c', anchor: 'start', font, halo: t.bg }));
    }

    /* --- franja de grupos y etiquetas de las hojas --- */
    const base = vertical ? m.top + anchoAlt : m.left;
    if (franja) orden.forEach((i, k) => {
      const c = F.color(cfg.palette, data.grupo[i]);
      if (vertical) svg.appendChild(F.el('rect', { x: u(k) - paso / 2, y: base + 5, width: Math.max(paso, 1), height: franja - 2, fill: c, opacity: 0.9 }));
      else svg.appendChild(F.el('rect', { x: base - franja - 3, y: u(k) - paso / 2, width: franja - 2, height: Math.max(paso, 1), fill: c, opacity: 0.9 }));
    });
    if (nEtiq) orden.forEach((i, k) => {
      const c = data.grupo ? F.color(cfg.palette, data.grupo[i]) : t.fg;
      const txt = String(data.ids[i]);
      if (vertical) svg.appendChild(F.text(u(k), base + franja + 12, txt, { size: +cfg.labelSize || 9.5, fill: c, anchor: 'end', font, rotate: -90, baseline: 'middle' }));
      else svg.appendChild(F.text(base - franja - 8, u(k), txt, { size: +cfg.labelSize || 9.5, fill: c, anchor: 'end', baseline: 'middle', font }));
    });

    /* --- leyenda --- */
    if (cfg.legend !== false && data.grupo) {
      const q2 = Math.max(...data.grupo) + 1;
      const lx = vertical ? w - m.right + 16 : w - 140;
      let ly = m.top + 8;
      svg.appendChild(F.text(lx, ly, tt('Grupos'), { role: 'legend', size: 11.5, weight: '600', fill: t.fg, font })); ly += 17;
      for (let g = 0; g < q2; g++) {
        const ng = data.grupo.reduce((a, x) => a + (x === g ? 1 : 0), 0);
        svg.appendChild(F.el('rect', { x: lx, y: ly - 8, width: 11, height: 11, rx: 2.5, fill: F.color(cfg.palette, g) }));
        svg.appendChild(F.text(lx + 17, ly, `${TT('Grupo', 'Cluster')} ${g + 1} (n = ${ng})`, { role: 'legend', size: 11, fill: t.fg, font }));
        ly += 17;
      }
    }
    return svg;
  }

  /* ------------------------------------------------------------
     Cuántos grupos: ganancia de inercia y silueta
     ------------------------------------------------------------
     data: { qs, ganancia, silueta, elegido, reglas }
     ------------------------------------------------------------ */
  function corte(cfg, data) {
    const w = +cfg.width || 860, h = +cfg.height || 400;
    const { svg, t, font } = H().frame(cfg, w, h);
    H().addTitle(svg, cfg, t, font, w);
    const m = { top: cfg.title ? 66 : 30, right: 26, bottom: 52, left: 68 };
    const pw = w - m.left - m.right, ph = h - m.top - m.bottom;

    const usaSil = cfg.serie === 'silueta';
    const vals = usaSil ? data.silueta : data.ganancia;
    const vmin = usaSil ? Math.min(0, ...vals) : 0;
    const vmax = Math.max(...vals) * 1.08 || 1;
    const x = F.scaleLinear(0, data.qs.length, m.left, m.left + pw);
    const y = F.scaleLinear(vmin, vmax, m.top + ph, m.top); y.domain = [vmin, vmax];

    F.ticks(vmin, vmax, 6).forEach(tv => {
      if (t.grid !== 'none') svg.appendChild(F.el('line', { x1: m.left, y1: y(tv), x2: m.left + pw, y2: y(tv), stroke: t.grid }));
      svg.appendChild(F.text(m.left - 8, y(tv), F.fmtTick(+tv.toPrecision(3)), { role: 'tick', size: 10.5, fill: t.muted, anchor: 'end', baseline: 'middle', font }));
    });

    const bw = pw / data.qs.length * (+cfg.barWidth || 0.7);
    data.qs.forEach((qq, i) => {
      const cx = x(i + 0.5);
      const elegido = qq === data.elegido;
      const c = elegido ? (cfg.highlightColor || '#e8890c') : (cfg.barColor || '#5b3fd6');
      const y0 = y(Math.max(vmin, 0)), y1 = y(vals[i]);
      svg.appendChild(F.el('rect', {
        x: cx - bw / 2, y: Math.min(y0, y1), width: bw, height: Math.abs(y1 - y0) || 1,
        rx: 2.5, fill: c, opacity: elegido ? 0.95 : 0.7,
      }));
      svg.appendChild(F.text(cx, m.top + ph + 18, String(qq), { role: 'tick', size: 11.5, weight: elegido ? '700' : 'normal', fill: elegido ? c : t.muted, anchor: 'middle', font }));
      if (cfg.showValues !== false) svg.appendChild(F.text(cx, Math.min(y0, y1) - 5, F.fmtTick(+vals[i].toPrecision(3)), { size: 10, fill: t.muted, anchor: 'middle', font }));
    });

    if (vmin < 0) svg.appendChild(F.el('line', { x1: m.left, y1: y(0), x2: m.left + pw, y2: y(0), stroke: t.axis }));
    svg.appendChild(F.text(m.left + pw / 2, h - 14, cfg.xlab || tt('Número de grupos'), { role: 'axis', size: 12.5, fill: t.fg, anchor: 'middle', font }));
    svg.appendChild(F.text(18, m.top + ph / 2, cfg.ylab || (usaSil ? tt('Silueta media') : tt('Pérdida de inercia del corte')),
      { role: 'axis', size: 12.5, fill: t.fg, anchor: 'middle', font, rotate: -90 }));
    return svg;
  }

  /* ------------------------------------------------------------
     Perfil de los grupos: valores test en pequeños múltiplos
     ------------------------------------------------------------
     data: { grupos: [{ nombre, n, items: [{name, v}] }], umbral }
     ------------------------------------------------------------ */
  function perfil(cfg, data) {
    const G = data.grupos.length;
    const cols = Math.min(+cfg.columnas || 3, G), filas = Math.ceil(G / cols);
    const pw = +cfg.anchoPanel || 300, ph0 = +cfg.altoBarra || 17;
    const maxItems = Math.max(1, ...data.grupos.map(g => g.items.length));
    const ph = Math.max(90, maxItems * ph0 + 30);
    const m = { top: cfg.title ? 70 : 32, right: 22, bottom: 40, left: 22 };
    const w = cols * pw + m.left + m.right, h = filas * (ph + 26) + m.top + m.bottom;
    const { svg, t, font } = H().frame(cfg, w, h);
    H().addTitle(svg, cfg, t, font, w);

    const vmax = Math.max(2.5, ...data.grupos.flatMap(g => g.items.map(o => Math.abs(o.v)))) * 1.12;
    const etiq = +cfg.anchoEtiqueta || 108;

    data.grupos.forEach((gr, gi) => {
      const cx = m.left + (gi % cols) * pw;
      const cy = m.top + Math.floor(gi / cols) * (ph + 26);
      const x = F.scaleLinear(-vmax, vmax, cx + etiq, cx + pw - 16);
      svg.appendChild(F.text(cx + etiq, cy - 8, `${gr.nombre} (n = ${gr.n})`,
        { role: 'legend', size: 12, weight: '600', fill: F.color(cfg.palette, gi), anchor: 'middle', font }));
      /* referencia en ±1.96: por debajo, la desviación es compatible con el azar */
      [-1.96, 1.96].forEach(r => svg.appendChild(F.el('line', {
        x1: x(r), y1: cy, x2: x(r), y2: cy + ph - 12, stroke: t.axis, 'stroke-dasharray': '3 3', opacity: 0.7 })));
      svg.appendChild(F.el('line', { x1: x(0), y1: cy, x2: x(0), y2: cy + ph - 12, stroke: t.axis }));

      gr.items.forEach((o, k) => {
        const yy = cy + k * ph0 + ph0 / 2;
        const x0 = x(0), x1 = x(o.v);
        const c = o.v >= 0 ? (cfg.colorAlto || '#0d9488') : (cfg.colorBajo || '#c2410c');
        svg.appendChild(F.el('rect', {
          x: Math.min(x0, x1), y: yy - ph0 * 0.34, width: Math.abs(x1 - x0) || 1, height: ph0 * 0.68,
          rx: 2, fill: c, opacity: 0.88,
        }));
        svg.appendChild(F.text(cx + etiq - 8, yy, o.name, { size: +cfg.labelSize || 10, fill: t.fg, anchor: 'end', baseline: 'middle', font }));
        if (cfg.showValues !== false) {
          /* La cifra va al final de la barra, por fuera. Si por fuera invade
             la columna de rótulos —barras negativas largas—, se mete dentro
             de la barra: es preferible a que se solape con el nombre. */
          const txt = F.fmtTick(+o.v.toFixed(1));
          const ancho = txt.length * 9.5 * 0.58 * F.fs('label');
          const fuera = o.v >= 0 ? x1 + 4 : x1 - 4;
          const cabe = o.v >= 0 ? true : (fuera - ancho) > (cx + etiq + 2);
          svg.appendChild(F.text(cabe ? fuera : x1 + 4, yy, txt, {
            size: 9.5, fill: cabe ? t.muted : t.bg, anchor: cabe ? (o.v >= 0 ? 'start' : 'end') : 'start',
            baseline: 'middle', font, weight: cabe ? 'normal' : '600',
          }));
        }
      });
      if (!gr.items.length) svg.appendChild(F.text(cx + pw / 2, cy + 24,
        tt('Nada característico por encima del umbral'), { size: 10.5, fill: t.muted, anchor: 'middle', font, italic: true }));
    });

    svg.appendChild(F.text(w / 2, h - 12, cfg.xlab || tt('Valor test (líneas de referencia en ±1.96)'),
      { role: 'axis', size: 12, fill: t.muted, anchor: 'middle', font }));
    return svg;
  }

  return { dendro, corte, perfil, _arbol: arbolDe, _orden: ordenHojas };
})();

if (typeof window !== 'undefined') window.Plots7 = Plots7;

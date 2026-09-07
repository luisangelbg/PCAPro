/* PCAPro — análisis de componentes principales en el navegador.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it
   under the terms of the GNU General Public License as published by the Free
   Software Foundation, either version 3 of the License, or (at your option)
   any later version. This program is distributed WITHOUT ANY WARRANTY; see
   the GNU General Public License for more details. You should have received
   a copy of the License along with this program; if not, see
   <https://www.gnu.org/licenses/>. */

/* PCAPro — figuras del Bloque 3 (rotación). */

(function () {

  const F = Fig;

  function frame(cfg, w, h) {
    const t = F.themes[cfg.theme] || F.themes.claro;
    return { svg: F.svg(w, h, cfg.theme), t, font: F.fonts[cfg.font] || F.fonts.sans };
  }
  function addTitle(svg, cfg, t, font, w) {
    if (cfg.title) svg.appendChild(F.text(w / 2, 30, cfg.title,
      { role: 'title', size: +cfg.titleSize || 17, weight: '600', fill: t.fg, anchor: 'middle', font }));
    if (cfg.subtitle) svg.appendChild(F.text(w / 2, cfg.title ? 49 : 30, cfg.subtitle,
      { role: 'subtitle', size: 11.5, fill: t.muted, anchor: 'middle', font }));
  }

  /* =========================================================
     1) Mapa de calor de la matriz de cargas
     ========================================================= */
  function loadHeat(cfg, data) {
    // data: { vars, labels, M }   M: p × k
    let vars = data.vars.slice(), M = data.M.map(r => r.slice());
    const k = data.labels.length;
    if (cfg.sortVars) {
      const key = M.map(r => {
        let bi = 0;
        for (let j = 1; j < k; j++) if (Math.abs(r[j]) > Math.abs(r[bi])) bi = j;
        return { bi, v: -Math.abs(r[bi]) };
      });
      const idx = vars.map((_, i) => i).sort((a, b) => key[a].bi - key[b].bi || key[a].v - key[b].v);
      vars = idx.map(i => data.vars[i]);
      M = idx.map(i => data.M[i].slice());
    }
    const p = vars.length;
    const maxLab = Math.max(...vars.map(v => v.length));
    const cw = Math.max(52, Math.min(110, 560 / k));
    const rh = Math.max(20, Math.min(38, 620 / p));
    const m = { top: (cfg.title ? 66 : 26) + 26, right: 96, bottom: 26, left: Math.min(230, 14 + 7.2 * maxLab) };
    const w = m.left + k * cw + m.right, h = m.top + p * rh + m.bottom;
    const { svg, t, font } = frame(cfg, w, h);
    addTitle(svg, cfg, t, font, w);

    const cmap = F.colormaps[cfg.colormap] || F.colormaps.rdbu;
    const thr = +cfg.threshold || 0;

    for (let i = 0; i < p; i++) for (let j = 0; j < k; j++) {
      const v = M[i][j];
      const x = m.left + j * cw, y = m.top + i * rh;
      const faded = thr > 0 && Math.abs(v) < thr;
      const fill = cfg.fadeBelow && faded ? t.bg : cmap((v + 1) / 2);
      const alpha = cfg.fadeBelow && faded ? 1 : (faded ? 0.25 : 1);
      svg.appendChild(F.el('rect', {
        x, y, width: cw, height: rh, fill, opacity: alpha,
        stroke: cfg.gridLines ? t.bg : 'none', 'stroke-width': 1,
      }));
      if (cfg.showValues) {
        svg.appendChild(F.text(x + cw / 2, y + rh / 2, v.toFixed(2).replace('-', '−'), {
          size: Math.min(12.5, rh * 0.5),
          /* el color del texto se decide por la luminancia real de la celda */
          fill: (cfg.fadeBelow && faded) ? t.muted : (alpha < 1 ? t.fg : F.onColor(fill, t.fg)),
          anchor: 'middle', baseline: 'middle', font,
          weight: !faded && Math.abs(v) >= (thr || 0.4) ? '700' : 'normal',
        }));
      }
    }
    vars.forEach((v, i) => svg.appendChild(F.text(m.left - 9, m.top + i * rh + rh / 2, v,
      { size: Math.min(12.5, rh * 0.56), fill: t.fg, anchor: 'end', baseline: 'middle', font })));
    data.labels.forEach((l, j) => svg.appendChild(F.text(m.left + j * cw + cw / 2, m.top - 11, l,
      { role: 'axis', size: 12.5, fill: t.fg, anchor: 'middle', weight: '600', font })));

    if (cfg.legend !== false) {
      const bx = m.left + k * cw + 26, by = m.top, bh = Math.min(p * rh, 240), bw = 15;
      const defs = F.el('defs');
      const gid = 'cbar3_' + Math.random().toString(36).slice(2, 8);
      const grad = F.el('linearGradient', { id: gid, x1: '0', y1: '1', x2: '0', y2: '0' });
      for (let q = 0; q <= 20; q++) grad.appendChild(F.el('stop', { offset: (q * 5) + '%', 'stop-color': cmap(q / 20) }));
      defs.appendChild(grad); svg.appendChild(defs);
      svg.appendChild(F.el('rect', { x: bx, y: by, width: bw, height: bh, fill: `url(#${gid})`, stroke: t.axis, 'stroke-width': 0.6 }));
      [['+1', by], ['0', by + bh / 2], ['−1', by + bh]].forEach(([s, y]) =>
        svg.appendChild(F.text(bx + bw + 5, y, s, { size: 10.5, fill: t.muted, baseline: 'middle', font })));
      svg.appendChild(F.text(bx + bw / 2, by - 12, cfg.legendTitle || 'carga',
        { size: 11, fill: t.fg, anchor: 'middle', font }));
    }
    return svg;
  }

  /* =========================================================
     2) Plano de cargas (círculo de correlaciones simplificado)
     ========================================================= */
  function loadPlane(cfg, data) {
    // data: { vars, R:[p][k] rotadas, U:[p][k] sin rotar, labels, pctR, pctU, dimX, dimY, unitCircle }
    const a = +cfg.dimX - 1, b = +cfg.dimY - 1;
    const size = +cfg.size || 620;
    /* margen suficiente para que las etiquetas no se salgan del lienzo */
    const labSize = +cfg.labelSize || 11.5;
    const labPad = cfg.showLabels
      ? Math.min(190, 16 + labSize * 0.58 * Math.max(...data.vars.map(v => v.length))) : 24;
    const m = { top: cfg.title ? 74 : 40, right: labPad, bottom: 58, left: Math.max(62, labPad) };
    const w = size + m.left + m.right, h = size + m.top + m.bottom;
    const { svg, t, font } = frame(cfg, w, h);
    addTitle(svg, cfg, t, font, w);

    const lim = +cfg.limit || 1.05;
    const x = F.scaleLinear(-lim, lim, m.left, m.left + size);
    const y = F.scaleLinear(-lim, lim, m.top + size, m.top);

    /* rejilla y ejes */
    F.ticks(-lim, lim, 6).forEach(v => {
      if (t.grid !== 'none') {
        svg.appendChild(F.el('line', { x1: x(v), y1: m.top, x2: x(v), y2: m.top + size, stroke: t.grid }));
        svg.appendChild(F.el('line', { x1: m.left, y1: y(v), x2: m.left + size, y2: y(v), stroke: t.grid }));
      }
      svg.appendChild(F.text(x(v), m.top + size + 17, F.fmtTick(+v.toFixed(2)), { role: 'tick', size: 10.5, fill: t.muted, anchor: 'middle', font }));
      svg.appendChild(F.text(m.left - 8, y(v), F.fmtTick(+v.toFixed(2)), { role: 'tick', size: 10.5, fill: t.muted, anchor: 'end', baseline: 'middle', font }));
    });
    svg.appendChild(F.el('line', { x1: m.left, y1: y(0), x2: m.left + size, y2: y(0), stroke: t.axis, 'stroke-dasharray': '5 4' }));
    svg.appendChild(F.el('line', { x1: x(0), y1: m.top, x2: x(0), y2: m.top + size, stroke: t.axis, 'stroke-dasharray': '5 4' }));

    if (cfg.unitCircle && data.unitCircle) {
      svg.appendChild(F.el('circle', { cx: x(0), cy: y(0), r: Math.abs(x(1) - x(0)), fill: 'none', stroke: t.axis, 'stroke-width': 1.2 }));
      if (cfg.innerCircle) svg.appendChild(F.el('circle', {
        cx: x(0), cy: y(0), r: Math.abs(x(0.7071) - x(0)), fill: 'none', stroke: t.axis,
        'stroke-width': 0.9, 'stroke-dasharray': '3 4', opacity: 0.7,
      }));
    }

    /* vectores sin rotar, de referencia */
    if (cfg.showUnrotated && data.U) {
      data.U.forEach((r, i) => {
        svg.appendChild(F.el('line', {
          x1: x(0), y1: y(0), x2: x(r[a]), y2: y(r[b]),
          stroke: cfg.unrotColor, 'stroke-width': 1.2, opacity: 0.55, 'stroke-dasharray': '4 3',
        }));
        svg.appendChild(F.el('circle', { cx: x(r[a]), cy: y(r[b]), r: 2.6, fill: cfg.unrotColor, opacity: 0.6 }));
        if (cfg.linkPairs) svg.appendChild(F.el('line', {
          x1: x(r[a]), y1: y(r[b]), x2: x(data.R[i][a]), y2: y(data.R[i][b]),
          stroke: cfg.unrotColor, 'stroke-width': 0.8, opacity: 0.4,
        }));
      });
    }

    /* vectores rotados */
    const defs = F.el('defs');
    const arrowIds = [];
    data.R.forEach((r, i) => {
      const col = cfg.colorBy === 'contrib'
        ? (F.colormaps[cfg.colormap] || F.colormaps.viridis)(Math.min(1, (r[a] * r[a] + r[b] * r[b])))
        : (cfg.singleColor ? cfg.vecColor : F.color(cfg.palette, i));
      const id = 'ar' + i + '_' + Math.random().toString(36).slice(2, 6);
      arrowIds.push(id);
      const mk2 = F.el('marker', {
        id, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 5.5, markerHeight: 5.5, orient: 'auto-start-reverse',
      });
      mk2.appendChild(F.el('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: col }));
      defs.appendChild(mk2);
    });
    svg.appendChild(defs);

    const colOf = (r, i) => cfg.colorBy === 'contrib'
      ? (F.colormaps[cfg.colormap] || F.colormaps.viridis)(Math.min(1, (r[a] * r[a] + r[b] * r[b])))
      : (cfg.singleColor ? cfg.vecColor : F.color(cfg.palette, i));

    data.R.forEach((r, i) => {
      svg.appendChild(F.el('line', {
        x1: x(0), y1: y(0), x2: x(r[a]), y2: y(r[b]),
        stroke: colOf(r, i), 'stroke-width': +cfg.vecWidth || 2, 'marker-end': `url(#${arrowIds[i]})`,
      }));
    });

    /* Etiquetas con separación vertical: se ordenan por altura dentro de cada
       lado y se empujan lo mínimo para que no se pisen; si una se mueve mucho,
       se traza un conector hasta la punta de su flecha. */
    if (cfg.showLabels) {
      const gap = (labSize + 2.5) * F.fs('label');
      const sides = { der: [], izq: [] };
      data.R.forEach((r, i) => {
        (r[a] >= 0 ? sides.der : sides.izq).push({
          i, tipX: x(r[a]), tipY: y(r[b]),
          lx: x(r[a]) + (r[a] >= 0 ? 7 : -7), ly: y(r[b]) - 5,
          anchor: r[a] >= 0 ? 'start' : 'end', col: colOf(r, i),
        });
      });
      Object.values(sides).forEach(group => {
        group.sort((p1, p2) => p1.ly - p2.ly);
        for (let n = 1; n < group.length; n++)          // empuje hacia abajo
          if (group[n].ly - group[n - 1].ly < gap) group[n].ly = group[n - 1].ly + gap;
        const bottom = m.top + size;
        for (let n = group.length - 1; n >= 0; n--) {   // reacomodo si se salen
          if (group[n].ly > bottom) group[n].ly = bottom;
          if (n > 0 && group[n].ly - group[n - 1].ly < gap) group[n - 1].ly = group[n].ly - gap;
        }
        group.forEach(g => {
          if (Math.abs(g.ly - (g.tipY - 5)) > 4) svg.appendChild(F.el('line', {
            x1: g.tipX, y1: g.tipY, x2: g.lx, y2: g.ly - labSize * 0.3,
            stroke: g.col, 'stroke-width': 0.7, opacity: 0.45,
          }));
          svg.appendChild(F.text(g.lx, g.ly, data.vars[g.i], {
            size: labSize, fill: g.col, anchor: g.anchor, weight: '600', font, halo: t.bg,
          }));
        });
      });
    }

    svg.appendChild(F.text(m.left + size / 2, h - 14,
      cfg.xlab || `${data.labels[a]} (${(data.pctR[a] * 100).toFixed(1)} %)`,
      { role: 'axis', size: 12.5, fill: t.fg, anchor: 'middle', font }));
    svg.appendChild(F.text(16, m.top + size / 2,
      cfg.ylab || `${data.labels[b]} (${(data.pctR[b] * 100).toFixed(1)} %)`,
      { role: 'axis', size: 12.5, fill: t.fg, anchor: 'middle', font, rotate: -90 }));

    if (cfg.showUnrotated && cfg.legend !== false) {
      svg.appendChild(F.el('line', { x1: m.left + 6, y1: m.top + 12, x2: m.left + 24, y2: m.top + 12, stroke: cfg.unrotColor, 'stroke-dasharray': '4 3', 'stroke-width': 1.4 }));
      svg.appendChild(F.text(m.left + 29, m.top + 12, 'sin rotar', { size: 10.5, fill: t.muted, baseline: 'middle', font, halo: t.bg }));
    }
    return svg;
  }

  /* =========================================================
     3) Varianza por componente: antes vs. después de rotar
     ========================================================= */
  function varCompare(cfg, data) {
    // data: { labels, before:[], after:[], total }
    const k = data.labels.length;
    const w = +cfg.width || 780;
    const m = { top: cfg.title ? 74 : 38, right: 30, bottom: 60, left: 68 };
    const h = +cfg.height || 420;
    const { svg, t, font } = frame(cfg, w, h);
    addTitle(svg, cfg, t, font, w);
    const pw = w - m.left - m.right, ph = h - m.top - m.bottom;
    const band = pw / k;
    const before = data.before.map(v => v / data.total * 100);
    const after = data.after.map(v => v / data.total * 100);
    const ymax = Math.max(...before, ...after) * 1.18;
    const y = F.scaleLinear(0, ymax, m.top + ph, m.top);

    F.ticks(0, ymax, 6).forEach(v => {
      if (t.grid !== 'none') svg.appendChild(F.el('line', { x1: m.left, y1: y(v), x2: m.left + pw, y2: y(v), stroke: t.grid }));
      svg.appendChild(F.text(m.left - 9, y(v), v.toFixed(0) + '%', { role: 'tick', size: 11, fill: t.muted, anchor: 'end', baseline: 'middle', font }));
    });

    const bw = band * 0.34;
    for (let j = 0; j < k; j++) {
      const cx = m.left + band * (j + 0.5);
      [[before[j], -bw / 2 - 2, cfg.colorBefore, 'sin rotar'], [after[j], bw / 2 + 2, cfg.colorAfter, 'rotada']]
        .forEach(([v, off, col]) => {
          svg.appendChild(F.el('rect', {
            x: cx + off - bw / 2, y: y(v), width: bw, height: Math.max(0, y(0) - y(v)),
            fill: col, rx: 2, opacity: 0.9, stroke: cfg.outline ? t.fg : 'none', 'stroke-width': 0.7,
          }));
          if (cfg.showValues) svg.appendChild(F.text(cx + off, y(v) - 7, v.toFixed(1) + '%',
            { size: 10, fill: t.fg, anchor: 'middle', weight: '600', font, halo: t.bg }));
        });
      svg.appendChild(F.text(cx, y(0) + 18, data.labels[j], { size: 11.5, fill: t.fg, anchor: 'middle', font }));
    }

    svg.appendChild(F.el('line', { x1: m.left, y1: y(0), x2: m.left + pw, y2: y(0), stroke: t.axis }));
    svg.appendChild(F.el('line', { x1: m.left, y1: m.top, x2: m.left, y2: y(0), stroke: t.axis }));
    svg.appendChild(F.text(m.left + pw / 2, h - 12, cfg.xlab || 'Componente', { role: 'axis', size: 12.5, fill: t.fg, anchor: 'middle', font }));
    svg.appendChild(F.text(16, m.top + ph / 2, cfg.ylab || '% de la varianza total', { role: 'axis', size: 12.5, fill: t.fg, anchor: 'middle', font, rotate: -90 }));

    if (cfg.legend !== false) {
      [[cfg.colorBefore, 'Sin rotar', 0], [cfg.colorAfter, 'Rotada', 108]].forEach(([c, lab, off]) => {
        svg.appendChild(F.el('rect', { x: m.left + off, y: m.top - 18, width: 12, height: 11, fill: c }));
        svg.appendChild(F.text(m.left + off + 17, m.top - 12, lab, { size: 11, fill: t.fg, baseline: 'middle', font }));
      });
    }
    return svg;
  }

  /* =========================================================
     4) Barras de cargas por componente
     ========================================================= */
  function loadBars(cfg, data) {
    // data: { vars, M, labels }
    const k = data.labels.length, p = data.vars.length;
    const ncol = Math.min(+cfg.cols || 2, k);
    const nrow = Math.ceil(k / ncol);
    const maxLab = Math.max(...data.vars.map(v => v.length));
    const padL = Math.min(180, 12 + 6.8 * maxLab);
    const cw = 220 + padL, rowH = Math.max(15, Math.min(26, 380 / p));
    const chH = 46 + p * rowH + 34;
    const w = ncol * cw + 26, h = (cfg.title ? 62 : 22) + nrow * chH + 14;
    const { svg, t, font } = frame(cfg, w, h);
    addTitle(svg, cfg, t, font, w);
    const top0 = cfg.title ? 62 : 22;
    const thr = +cfg.threshold || 0.4;
    /* con rotación oblicua los coeficientes de patrón pueden pasar de 1 */
    const amax = Math.max(1, ...data.M.map(r => Math.max(...r.map(Math.abs))));
    const lim = Math.ceil(amax * 10) / 10;
    const ticksX = lim > 1 ? [-lim, -0.5, 0, 0.5, 1, lim] : [-1, -0.5, 0, 0.5, 1];

    for (let j = 0; j < k; j++) {
      const cx = 14 + (j % ncol) * cw, cy = top0 + Math.floor(j / ncol) * chH;
      const plotW = cw - padL - 40;
      const x0 = cx + padL;
      const x = F.scaleLinear(-lim, lim, x0, x0 + plotW);
      const order = data.vars.map((_, i) => i);
      if (cfg.sortBars) order.sort((a2, b2) => Math.abs(data.M[b2][j]) - Math.abs(data.M[a2][j]));

      svg.appendChild(F.text(cx + padL, cy + 16, data.labels[j], { role: 'axis', size: 12.5, weight: '600', fill: t.fg, font }));
      if (t.grid !== 'none') ticksX.filter(v => v !== 0).forEach(v =>
        svg.appendChild(F.el('line', { x1: x(v), y1: cy + 26, x2: x(v), y2: cy + 26 + p * rowH, stroke: t.grid })));
      [-thr, thr].forEach(v => svg.appendChild(F.el('line', {
        x1: x(v), y1: cy + 26, x2: x(v), y2: cy + 26 + p * rowH,
        stroke: cfg.thrColor, 'stroke-width': 1, 'stroke-dasharray': '4 3', opacity: 0.8,
      })));

      order.forEach((i, r) => {
        const v = data.M[i][j];
        const yy = cy + 26 + r * rowH;
        const strong = Math.abs(v) >= thr;
        svg.appendChild(F.el('rect', {
          x: Math.min(x(0), x(v)), y: yy + rowH * 0.18, width: Math.abs(x(v) - x(0)), height: rowH * 0.64,
          fill: v >= 0 ? cfg.colorPos : cfg.colorNeg, opacity: strong ? 0.92 : 0.34, rx: 2,
        }));
        svg.appendChild(F.text(cx + padL - 8, yy + rowH / 2, data.vars[i], {
          size: Math.min(11.5, rowH * 0.62), fill: strong ? t.fg : t.muted,
          anchor: 'end', baseline: 'middle', font, weight: strong ? '600' : 'normal',
        }));
        if (cfg.showValues) svg.appendChild(F.text(
          x(v) + (v >= 0 ? 5 : -5), yy + rowH / 2, v.toFixed(2).replace('-', '−'),
          { size: Math.min(10.5, rowH * 0.55), fill: t.muted, anchor: v >= 0 ? 'start' : 'end', baseline: 'middle', font }));
      });
      svg.appendChild(F.el('line', { x1: x(0), y1: cy + 26, x2: x(0), y2: cy + 26 + p * rowH, stroke: t.axis }));
      ticksX.forEach(v => svg.appendChild(F.text(x(v), cy + 26 + p * rowH + 16,
        String(v), { role: 'tick', size: 10, fill: t.muted, anchor: 'middle', font })));
    }
    return svg;
  }

  window.Plots3 = { loadHeat, loadPlane, varCompare, loadBars };
})();

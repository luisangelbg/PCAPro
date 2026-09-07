/* PCAPro — análisis de componentes principales en el navegador.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it
   under the terms of the GNU General Public License as published by the Free
   Software Foundation, either version 3 of the License, or (at your option)
   any later version. This program is distributed WITHOUT ANY WARRANTY; see
   the GNU General Public License for more details. You should have received
   a copy of the License along with this program; if not, see
   <https://www.gnu.org/licenses/>. */

/* PCAPro — figuras del Bloque 4: mapas factoriales. */

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
  /* ejes cartesianos con rejilla, líneas en cero y rótulos */
  function axes(svg, cfg, t, font, m, pw, ph, x, y, xlab, ylab, h, w) {
    const tx = F.ticks(x.domain[0], x.domain[1], 7), ty = F.ticks(y.domain[0], y.domain[1], 7);
    if (t.grid !== 'none') {
      tx.forEach(v => svg.appendChild(F.el('line', { x1: x(v), y1: m.top, x2: x(v), y2: m.top + ph, stroke: t.grid })));
      ty.forEach(v => svg.appendChild(F.el('line', { x1: m.left, y1: y(v), x2: m.left + pw, y2: y(v), stroke: t.grid })));
    }
    tx.forEach(v => svg.appendChild(F.text(x(v), m.top + ph + 17, F.fmtTick(+v.toPrecision(3)), { role: 'tick', size: 10.5, fill: t.muted, anchor: 'middle', font })));
    ty.forEach(v => svg.appendChild(F.text(m.left - 8, y(v), F.fmtTick(+v.toPrecision(3)), { role: 'tick', size: 10.5, fill: t.muted, anchor: 'end', baseline: 'middle', font })));
    if (cfg.zeroLines !== false) {
      svg.appendChild(F.el('line', { x1: m.left, y1: y(0), x2: m.left + pw, y2: y(0), stroke: t.axis, 'stroke-dasharray': '5 4' }));
      svg.appendChild(F.el('line', { x1: x(0), y1: m.top, x2: x(0), y2: m.top + ph, stroke: t.axis, 'stroke-dasharray': '5 4' }));
    }
    if (cfg.box) svg.appendChild(F.el('rect', { x: m.left, y: m.top, width: pw, height: ph, fill: 'none', stroke: t.axis, 'stroke-width': 1 }));
    svg.appendChild(F.text(m.left + pw / 2, h - 14, xlab, { role: 'axis', size: 12.5, fill: t.fg, anchor: 'middle', font }));
    svg.appendChild(F.text(16, m.top + ph / 2, ylab, { role: 'axis', size: 12.5, fill: t.fg, anchor: 'middle', font, rotate: -90 }));
  }
  /* colocación de etiquetas evitando solapes (voraz, por prioridad) */
  function placeLabels(svg, items, t, font, size, maxN) {
    const boxes = [];
    let placed = 0;
    for (const it of items) {
      if (maxN && placed >= maxN) break;
      const k = F.fs('label');
      const wpx = it.text.length * size * 0.55 * k, hpx = size * 1.15 * k;
      const bx = it.anchor === 'end' ? it.x - wpx : it.anchor === 'middle' ? it.x - wpx / 2 : it.x;
      const box = [bx, it.y - hpx, bx + wpx, it.y + hpx * 0.25];
      if (boxes.some(b => !(box[2] < b[0] || box[0] > b[2] || box[3] < b[1] || box[1] > b[3]))) continue;
      boxes.push(box);
      svg.appendChild(F.text(it.x, it.y, it.text, {
        size, fill: it.color || t.fg, anchor: it.anchor || 'start',
        weight: it.weight || 'normal', font, halo: t.bg,
      }));
      placed++;
    }
    return placed;
  }
  /* colocación de etiquetas apilándolas: no descarta ninguna, las separa
     verticalmente dentro de cada lado y traza un conector si se movieron */
  function stackLabels(svg, items, t, font, size, top, bottom) {
    const gap = (size + 2.5) * F.fs('label');
    const sides = { der: items.filter(i => i.anchor !== 'end'), izq: items.filter(i => i.anchor === 'end') };
    Object.values(sides).forEach(group => {
      group.sort((p1, p2) => p1.y - p2.y);
      for (let n = 1; n < group.length; n++)
        if (group[n].y - group[n - 1].y < gap) group[n].y = group[n - 1].y + gap;
      for (let n = group.length - 1; n >= 0; n--) {
        if (group[n].y > bottom) group[n].y = bottom;
        if (n > 0 && group[n].y - group[n - 1].y < gap) group[n - 1].y = group[n].y - gap;
      }
      group.forEach(g => {
        if (g.tipX != null && Math.abs(g.y - g.y0) > 4) svg.appendChild(F.el('line', {
          x1: g.tipX, y1: g.tipY, x2: g.x, y2: g.y - size * 0.3,
          stroke: g.color, 'stroke-width': 0.7, opacity: 0.45,
        }));
        svg.appendChild(F.text(g.x, g.y, g.text, {
          size, fill: g.color, anchor: g.anchor, weight: g.weight || '600',
          font, halo: t.bg, italic: g.italic,
        }));
      });
    });
  }

  /* barra de color continua */
  function colorbar(svg, cfg, t, font, x, y, h, cmap, lo, hi, title) {
    const w = 15;
    const defs = F.el('defs');
    const id = 'cb4_' + Math.random().toString(36).slice(2, 8);
    const g = F.el('linearGradient', { id, x1: '0', y1: '1', x2: '0', y2: '0' });
    for (let i = 0; i <= 20; i++) g.appendChild(F.el('stop', { offset: (i * 5) + '%', 'stop-color': cmap(i / 20) }));
    defs.appendChild(g); svg.appendChild(defs);
    svg.appendChild(F.el('rect', { x, y, width: w, height: h, fill: `url(#${id})`, stroke: t.axis, 'stroke-width': 0.6 }));
    [[hi, y], [(lo + hi) / 2, y + h / 2], [lo, y + h]].forEach(([v, yy]) =>
      svg.appendChild(F.text(x + w + 5, yy, F.fmtTick(+v.toPrecision(2)), { role: 'legend', size: 10, fill: t.muted, baseline: 'middle', font })));
    svg.appendChild(F.text(x + w / 2, y - 10, title, { size: 10.5, fill: t.fg, anchor: 'middle', font }));
  }

  /* =========================================================
     1) Círculo de correlaciones (variables)
     ========================================================= */
  function corrCircle(cfg, data) {
    const a = +cfg.dimX - 1, b = +cfg.dimY - 1;
    const size = +cfg.size || 640;
    const labSize = +cfg.labelSize || 11.5;
    const names = data.vars.concat(data.supp.map(s => s.name));
    const labPad = cfg.showLabels ? Math.min(190, 18 + labSize * 0.58 * Math.max(...names.map(v => v.length))) : 26;
    const legendW = cfg.colorBy !== 'variable' ? 80 : 0;
    const m = { top: cfg.title ? 74 : 40, right: labPad + legendW, bottom: 56, left: Math.max(64, labPad) };
    const w = size + m.left + m.right, h = size + m.top + m.bottom;
    const { svg, t, font } = frame(cfg, w, h);
    addTitle(svg, cfg, t, font, w);

    const lim = +cfg.limit || 1.06;
    const x = F.scaleLinear(-lim, lim, m.left, m.left + size);
    const y = F.scaleLinear(-lim, lim, m.top + size, m.top);
    axes(svg, cfg, t, font, m, size, size, x, y,
      cfg.xlab || `${data.labels[a]} (${(data.pct[a] * 100).toFixed(1)} %)`,
      cfg.ylab || `${data.labels[b]} (${(data.pct[b] * 100).toFixed(1)} %)`, h, w);

    if (cfg.unitCircle) {
      svg.appendChild(F.el('circle', { cx: x(0), cy: y(0), r: Math.abs(x(1) - x(0)), fill: 'none', stroke: t.axis, 'stroke-width': 1.3 }));
      if (cfg.innerCircle) svg.appendChild(F.el('circle', {
        cx: x(0), cy: y(0), r: Math.abs(x(0.7071) - x(0)), fill: 'none',
        stroke: t.axis, 'stroke-width': 0.9, 'stroke-dasharray': '3 4', opacity: 0.7,
      }));
    }

    const cmap = F.colormaps[cfg.colormap] || F.colormaps.viridis;
    const q = data.coord.map(r => r[a] * r[a] + r[b] * r[b]);          // cos² del plano
    const ct = data.contrib.map(r => r[a] + r[b]);
    const metric = cfg.colorBy === 'cos2' ? q : cfg.colorBy === 'contrib' ? ct : null;
    const lo = metric ? Math.min(...metric) : 0, hi = metric ? Math.max(...metric) : 1;
    const colOf = i => cfg.colorBy === 'variable'
      ? (cfg.singleColor ? cfg.vecColor : F.color(cfg.palette, i))
      : cmap(hi > lo ? (metric[i] - lo) / (hi - lo) : 0.5);

    /* filtro por calidad */
    const keep = data.vars.map((_, i) => i)
      .filter(i => q[i] >= (+cfg.minCos2 || 0))
      .sort((i, j) => q[j] - q[i])
      .slice(0, +cfg.topN > 0 ? +cfg.topN : data.vars.length);

    const defs = F.el('defs'); svg.appendChild(defs);
    const arrow = (col) => {
      const id = 'am' + Math.random().toString(36).slice(2, 8);
      const mk2 = F.el('marker', { id, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 5.5, markerHeight: 5.5, orient: 'auto-start-reverse' });
      mk2.appendChild(F.el('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: col }));
      defs.appendChild(mk2); return id;
    };

    const labelItems = [];
    const cont = cfg.colorBy !== 'variable';
    keep.forEach(i => {
      const r = data.coord[i], col = colOf(i);
      svg.appendChild(F.el('line', {
        x1: x(0), y1: y(0), x2: x(r[a]), y2: y(r[b]),
        stroke: col, 'stroke-width': +cfg.vecWidth || 2.1, 'marker-end': `url(#${arrow(col)})`,
      }));
      labelItems.push({
        x: x(r[a]) + (r[a] >= 0 ? 8 : -8), y: y(r[b]) - 5, y0: y(r[b]) - 5,
        tipX: x(r[a]), tipY: y(r[b]), text: data.vars[i],
        anchor: r[a] >= 0 ? 'start' : 'end',
        color: cont ? F.darken(col, 0.52) : col, weight: '600', pr: q[i],
      });
    });

    /* suplementarias cuantitativas */
    if (cfg.showSupp) data.supp.forEach(s => {
      const r = s.coord;
      svg.appendChild(F.el('line', {
        x1: x(0), y1: y(0), x2: x(r[a]), y2: y(r[b]),
        stroke: cfg.suppColor, 'stroke-width': 1.8, 'stroke-dasharray': '6 3',
        'marker-end': `url(#${arrow(cfg.suppColor)})`,
      }));
      labelItems.push({
        x: x(r[a]) + (r[a] >= 0 ? 8 : -8), y: y(r[b]) - 5, y0: y(r[b]) - 5,
        tipX: x(r[a]), tipY: y(r[b]), text: s.name,
        anchor: r[a] >= 0 ? 'start' : 'end', color: cfg.suppColor, weight: '600', pr: 2, italic: true,
      });
    });

    if (cfg.showLabels) stackLabels(svg, labelItems, t, font, labSize, m.top, m.top + size);
    if (metric && cfg.legend !== false) {
      colorbar(svg, cfg, t, font, m.left + size + labPad - 40, m.top + 20, Math.min(size - 60, 220),
        cmap, lo, hi, cfg.colorBy === 'cos2' ? 'cos²' : 'contrib. %');
    }
    if (cfg.showSupp && data.supp.length && cfg.legend !== false) {
      svg.appendChild(F.el('line', { x1: m.left + 8, y1: m.top + 14, x2: m.left + 28, y2: m.top + 14, stroke: cfg.suppColor, 'stroke-dasharray': '6 3', 'stroke-width': 1.6 }));
      svg.appendChild(F.text(m.left + 33, m.top + 14, 'suplementaria', { size: 10.5, fill: t.muted, baseline: 'middle', font, halo: t.bg }));
    }
    return svg;
  }

  /* =========================================================
     2) Mapa de individuos
     ========================================================= */
  function indMap(cfg, data) {
    const a = +cfg.dimX - 1, b = +cfg.dimY - 1;
    const size = +cfg.size || 660;
    const groups = data.groups;                      // {name, levels:[{level, idx}]} o null
    const legendW = (groups && cfg.legend !== false) ? 150 :
      (cfg.colorBy === 'cos2' || cfg.colorBy === 'contrib') ? 84 : 24;
    const m = { top: cfg.title ? 74 : 40, right: legendW + 16, bottom: 56, left: 66 };
    const w = size + m.left + m.right, h = size + m.top + m.bottom;
    const { svg, t, font } = frame(cfg, w, h);
    addTitle(svg, cfg, t, font, w);

    const X = data.coord[a], Y = data.coord[b];

    /* Las envolturas se calculan ANTES de fijar la escala para que los ejes
       las incluyan y no queden cortadas. */
    const shapes = [];
    if (groups && cfg.shape !== 'ninguna') groups.levels.forEach((lv, gi) => {
      const gx = lv.idx.map(i => X[i]), gy = lv.idx.map(i => Y[i]);
      if (gx.length < 3) return;
      let pts;
      if (cfg.shape === 'envolvente') pts = Fac.hull(gx, gy);
      else {
        const e = Fac.ellipse(gx, gy, +cfg.level || 0.95, cfg.shape === 'media' ? 'mean' : 'conc');
        pts = e && e.pts;
      }
      if (pts && pts.length >= 3) shapes.push({ gi, pts });
    });

    const allX = X.concat(...shapes.map(s => s.pts.map(q => q[0])));
    const allY = Y.concat(...shapes.map(s => s.pts.map(q => q[1])));
    const pad = +cfg.pad || 0.08;
    const rx = (S.max(allX) - S.min(allX)) * pad || 1, ry = (S.max(allY) - S.min(allY)) * pad || 1;
    let x0 = S.min(allX) - rx, x1 = S.max(allX) + rx, y0 = S.min(allY) - ry, y1 = S.max(allY) + ry;
    if (cfg.equalScale) {
      const c1 = (x0 + x1) / 2, c2 = (y0 + y1) / 2;
      const half = Math.max(x1 - x0, y1 - y0) / 2;
      x0 = c1 - half; x1 = c1 + half; y0 = c2 - half; y1 = c2 + half;
    }
    const x = F.scaleLinear(x0, x1, m.left, m.left + size);
    const y = F.scaleLinear(y0, y1, m.top + size, m.top);
    axes(svg, cfg, t, font, m, size, size, x, y,
      cfg.xlab || `${data.labels[a]} (${(data.pct[a] * 100).toFixed(1)} %)`,
      cfg.ylab || `${data.labels[b]} (${(data.pct[b] * 100).toFixed(1)} %)`, h, w);

    const cmap = F.colormaps[cfg.colormap] || F.colormaps.viridis;
    const q = data.cos2.map((_, i) => data.cos2[a][i] + data.cos2[b][i]);
    const ct = data.contrib[a].map((v, i) => v + data.contrib[b][i]);
    const metric = cfg.colorBy === 'cos2' ? q : cfg.colorBy === 'contrib' ? ct : null;
    const lo = metric ? Math.min(...metric) : 0, hi = metric ? Math.max(...metric) : 1;

    const grpOf = new Array(X.length).fill(-1);
    if (groups) groups.levels.forEach((lv, gi) => lv.idx.forEach(i => grpOf[i] = gi));
    const colOf = i => {
      if (metric) return cmap(hi > lo ? (metric[i] - lo) / (hi - lo) : 0.5);
      if (groups && grpOf[i] >= 0) return F.color(cfg.palette, grpOf[i]);
      return cfg.pointColor;
    };
    const rOf = i => cfg.sizeByCos2 ? (2 + 5.5 * Math.sqrt(Math.min(1, q[i]))) : (+cfg.pointSize || 4);

    /* elipses / envolventes por grupo (ya calculadas arriba) */
    shapes.forEach(sh => {
      const col = F.color(cfg.palette, sh.gi);
      svg.appendChild(F.el('polygon', {
        points: sh.pts.map(q2 => `${x(q2[0]).toFixed(1)},${y(q2[1]).toFixed(1)}`).join(' '),
        fill: col, 'fill-opacity': +cfg.fillOpacity || 0.12,
        stroke: col, 'stroke-width': +cfg.ellipseWidth || 1.6,
        'stroke-dasharray': cfg.shape === 'media' ? '6 3' : null,
      }));
    });

    /* puntos */
    const order = X.map((_, i) => i);
    if (metric) order.sort((i, j) => metric[i] - metric[j]);
    order.forEach(i => {
      svg.appendChild(F.el('circle', {
        cx: x(X[i]), cy: y(Y[i]), r: rOf(i), fill: colOf(i),
        'fill-opacity': +cfg.pointOpacity || 0.82,
        stroke: cfg.pointStroke ? t.bg : 'none', 'stroke-width': 0.9,
      }));
    });

    /* centroides de grupo */
    if (groups && cfg.showCentroids) groups.levels.forEach((lv, gi) => {
      const col = F.color(cfg.palette, gi);
      const cx = S.mean(lv.idx.map(i => X[i])), cy = S.mean(lv.idx.map(i => Y[i]));
      svg.appendChild(F.el('rect', {
        x: x(cx) - 6, y: y(cy) - 6, width: 12, height: 12, fill: col,
        stroke: t.bg, 'stroke-width': 1.8, transform: `rotate(45 ${x(cx)} ${y(cy)})`,
      }));
      if (cfg.centroidLabels) svg.appendChild(F.text(x(cx), y(cy) - 12, lv.level,
        { size: 12, fill: col, anchor: 'middle', weight: '700', font, halo: t.bg }));
    });

    /* etiquetas de individuos */
    if (cfg.labelMode !== 'ninguna') {
      const items = X.map((_, i) => ({
        x: x(X[i]) + rOf(i) + 3, y: y(Y[i]) + 4, text: data.ids[i],
        anchor: 'start', color: t.fg, pr: cfg.labelMode === 'top' ? ct[i] : -i,
      }));
      items.sort((p1, p2) => p2.pr - p1.pr);
      placeLabels(svg, items, t, font, +cfg.labelSize || 10,
        cfg.labelMode === 'top' ? (+cfg.labelTopN || 10) : 0);
    }

    /* leyenda */
    if (cfg.legend !== false) {
      let ly0 = m.top + 16;
      if (metric) {
        const bh = Math.min(size - 60, 200);
        colorbar(svg, cfg, t, font, m.left + size + 18, m.top + 20, bh,
          cmap, lo, hi, cfg.colorBy === 'cos2' ? 'cos²' : 'contrib. %');
        ly0 = m.top + 20 + bh + 34;      // la leyenda de grupos va debajo de la barra
      }
      if (groups && shapes.length) {
        let ly = ly0;
        svg.appendChild(F.text(m.left + size + 18, ly, groups.name, { size: 11.5, fill: t.fg, weight: '700', font }));
        ly += 18 * F.fs('label');
        groups.levels.forEach((lv, gi) => {
          svg.appendChild(F.el('circle', { cx: m.left + size + 25, cy: ly - 4, r: 5, fill: F.color(cfg.palette, gi) }));
          svg.appendChild(F.text(m.left + size + 36, ly, `${lv.level} (${lv.idx.length})`,
            { size: 11, fill: t.fg, baseline: 'middle', font }));
          ly += 19 * F.fs('label');
        });
        ly += 6 * F.fs('label');
        svg.appendChild(F.text(m.left + size + 18, ly, cfg.shape === 'envolvente' ? 'envolvente convexa'
          : cfg.shape === 'media' ? `elipse de la media ${Math.round((+cfg.level || 0.95) * 100)} %`
            : `elipse de concentración ${Math.round((+cfg.level || 0.95) * 100)} %`,
          { size: 9.5, fill: t.muted, font }));
      } else if (!metric && groups) {
        let ly = ly0;
        svg.appendChild(F.text(m.left + size + 18, ly, groups.name, { size: 11.5, fill: t.fg, weight: '700', font }));
        ly += 18 * F.fs('label');
        groups.levels.forEach((lv, gi) => {
          svg.appendChild(F.el('circle', { cx: m.left + size + 25, cy: ly - 4, r: 5, fill: F.color(cfg.palette, gi) }));
          svg.appendChild(F.text(m.left + size + 36, ly, `${lv.level} (${lv.idx.length})`,
            { size: 11, fill: t.fg, baseline: 'middle', font }));
          ly += 19 * F.fs('label');
        });
        if (cfg.shape !== 'ninguna') {
          ly += 6 * F.fs('label');
          svg.appendChild(F.text(m.left + size + 18, ly, cfg.shape === 'envolvente' ? 'envolvente convexa'
            : cfg.shape === 'media' ? `elipse de la media ${Math.round((+cfg.level || 0.95) * 100)} %`
              : `elipse de concentración ${Math.round((+cfg.level || 0.95) * 100)} %`,
            { size: 9.5, fill: t.muted, font }));
        }
      }
    }
    return svg;
  }

  /* =========================================================
     3) Biplot
     ========================================================= */
  function biplot(cfg, data) {
    const a = +cfg.dimX - 1, b = +cfg.dimY - 1;
    const size = +cfg.size || 680;
    const groups = data.groups;
    const legendW = (groups && cfg.legend !== false) ? 150 : 30;
    const labSize = +cfg.labelSize || 11.5;
    const labPad = Math.min(150, 20 + labSize * 0.55 * Math.max(...data.vars.map(v => v.length)));
    const m = { top: cfg.title ? 74 : 40, right: Math.max(legendW, labPad) + 12, bottom: 56, left: 66 };
    const w = size + m.left + m.right, h = size + m.top + m.bottom;
    const { svg, t, font } = frame(cfg, w, h);
    addTitle(svg, cfg, t, font, w);

    const X = data.coord[a], Y = data.coord[b];

    const shapes = [];
    if (groups && cfg.shape !== 'ninguna') groups.levels.forEach((lv, gi) => {
      const gx = lv.idx.map(i => X[i]), gy = lv.idx.map(i => Y[i]);
      if (gx.length < 3) return;
      const pts = cfg.shape === 'envolvente' ? Fac.hull(gx, gy)
        : (Fac.ellipse(gx, gy, +cfg.level || 0.95, cfg.shape === 'media' ? 'mean' : 'conc') || {}).pts;
      if (pts && pts.length >= 3) shapes.push({ gi, pts });
    });
    const allX = X.concat(...shapes.map(s => s.pts.map(q => q[0])));
    const allY = Y.concat(...shapes.map(s => s.pts.map(q => q[1])));
    const pad = 0.1;
    const rx = (S.max(allX) - S.min(allX)) * pad || 1, ry = (S.max(allY) - S.min(allY)) * pad || 1;
    const x0 = S.min(allX) - rx, x1 = S.max(allX) + rx, y0 = S.min(allY) - ry, y1 = S.max(allY) + ry;
    const x = F.scaleLinear(x0, x1, m.left, m.left + size);
    const y = F.scaleLinear(y0, y1, m.top + size, m.top);
    axes(svg, cfg, t, font, m, size, size, x, y,
      cfg.xlab || `${data.labels[a]} (${(data.pct[a] * 100).toFixed(1)} %)`,
      cfg.ylab || `${data.labels[b]} (${(data.pct[b] * 100).toFixed(1)} %)`, h, w);

    /* factor de escala de las flechas */
    const maxVar = Math.max(...data.coordVar.map(r => Math.max(Math.abs(r[a]), Math.abs(r[b])))) || 1;
    const maxInd = Math.max(Math.max(...X.map(Math.abs)), Math.max(...Y.map(Math.abs))) || 1;
    const k = (maxInd / maxVar) * (+cfg.arrowScale || 0.8);

    const grpOf = new Array(X.length).fill(-1);
    if (groups) groups.levels.forEach((lv, gi) => lv.idx.forEach(i => grpOf[i] = gi));

    shapes.forEach(sh => {
      const col = F.color(cfg.palette, sh.gi);
      svg.appendChild(F.el('polygon', {
        points: sh.pts.map(q => `${x(q[0]).toFixed(1)},${y(q[1]).toFixed(1)}`).join(' '),
        fill: col, 'fill-opacity': +cfg.fillOpacity || 0.1, stroke: col, 'stroke-width': 1.4,
      }));
    });

    X.forEach((_, i) => svg.appendChild(F.el('circle', {
      cx: x(X[i]), cy: y(Y[i]), r: +cfg.pointSize || 3.4,
      fill: (groups && grpOf[i] >= 0) ? F.color(cfg.palette, grpOf[i]) : cfg.pointColor,
      'fill-opacity': +cfg.pointOpacity || 0.6,
    })));

    const defs = F.el('defs'); svg.appendChild(defs);
    const items = [];
    data.coordVar.forEach((r, i) => {
      const vx = r[a] * k, vy = r[b] * k;
      const id = 'bm' + i + Math.random().toString(36).slice(2, 5);
      const mk2 = F.el('marker', { id, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 5.5, markerHeight: 5.5, orient: 'auto-start-reverse' });
      mk2.appendChild(F.el('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: cfg.arrowColor }));
      defs.appendChild(mk2);
      svg.appendChild(F.el('line', {
        x1: x(0), y1: y(0), x2: x(vx), y2: y(vy),
        stroke: cfg.arrowColor, 'stroke-width': +cfg.arrowWidth || 2, 'marker-end': `url(#${id})`,
      }));
      items.push({
        x: x(vx) + (vx >= 0 ? 8 : -8), y: y(vy) - 4, y0: y(vy) - 4,
        tipX: x(vx), tipY: y(vy), text: data.vars[i],
        anchor: vx >= 0 ? 'start' : 'end', color: cfg.arrowColor, weight: '700',
        pr: Math.hypot(r[a], r[b]),
      });
    });
    if (cfg.showVarLabels) stackLabels(svg, items, t, font, labSize, m.top, m.top + size);

    if (groups && cfg.legend !== false) {
      let ly = m.top + 16;
      svg.appendChild(F.text(m.left + size + 18, ly, groups.name, { size: 11.5, fill: t.fg, weight: '700', font }));
      ly += 18 * F.fs('label');
      groups.levels.forEach((lv, gi) => {
        svg.appendChild(F.el('circle', { cx: m.left + size + 25, cy: ly - 4, r: 5, fill: F.color(cfg.palette, gi) }));
        svg.appendChild(F.text(m.left + size + 36, ly, lv.level, { size: 11, fill: t.fg, baseline: 'middle', font }));
        ly += 19 * F.fs('label');
      });
    }
    return svg;
  }

  /* =========================================================
     4) Contribuciones a un eje
     ========================================================= */
  function contribBars(cfg, data) {
    // data: { names, values, expected, dimLabel }
    const n0 = data.values.length;
    const idx = data.values.map((_, i) => i).sort((i, j) => data.values[j] - data.values[i]);
    const keep = idx.slice(0, +cfg.topN > 0 ? Math.min(+cfg.topN, n0) : n0);
    const p = keep.length;
    const maxLab = Math.max(...keep.map(i => data.names[i].length));
    const rowH = Math.max(15, Math.min(30, 460 / p));
    const m = { top: cfg.title ? 74 : 38, right: 56, bottom: 52, left: Math.min(240, 16 + 7.2 * maxLab) };
    const w = +cfg.width || 860;
    const h = m.top + p * rowH + m.bottom;
    const { svg, t, font } = frame(cfg, w, h);
    addTitle(svg, cfg, t, font, w);
    const pw = w - m.left - m.right;
    const vmax = Math.max(...keep.map(i => data.values[i]), data.expected) * 1.1;
    const x = F.scaleLinear(0, vmax, m.left, m.left + pw);

    F.ticks(0, vmax, 6).forEach(v => {
      if (t.grid !== 'none') svg.appendChild(F.el('line', { x1: x(v), y1: m.top - 6, x2: x(v), y2: m.top + p * rowH, stroke: t.grid }));
      svg.appendChild(F.text(x(v), m.top + p * rowH + 18, F.fmtTick(+v.toPrecision(3)) + '%', { role: 'tick', size: 10.5, fill: t.muted, anchor: 'middle', font }));
    });

    keep.forEach((i, r) => {
      const yy = m.top + r * rowH;
      const above = data.values[i] >= data.expected;
      svg.appendChild(F.el('rect', {
        x: m.left, y: yy + rowH * 0.16, width: Math.max(1, x(data.values[i]) - m.left), height: rowH * 0.68,
        fill: cfg.gradient ? F.color(cfg.palette, r) : (above ? cfg.barColor : cfg.barColorLow),
        rx: 2, opacity: 0.92, stroke: cfg.outline ? t.fg : 'none', 'stroke-width': 0.7,
      }));
      svg.appendChild(F.text(m.left - 9, yy + rowH / 2, data.names[i], {
        size: Math.min(12, rowH * 0.6), fill: above ? t.fg : t.muted,
        anchor: 'end', baseline: 'middle', font, weight: above ? '600' : 'normal',
      }));
      if (cfg.showValues) svg.appendChild(F.text(x(data.values[i]) + 6, yy + rowH / 2,
        data.values[i].toFixed(1), { size: Math.min(11, rowH * 0.55), fill: t.muted, baseline: 'middle', font }));
    });

    if (cfg.showExpected) {
      svg.appendChild(F.el('line', {
        x1: x(data.expected), y1: m.top - 8, x2: x(data.expected), y2: m.top + p * rowH + 4,
        stroke: cfg.expectedColor, 'stroke-width': 1.6, 'stroke-dasharray': '6 4',
      }));
      svg.appendChild(F.text(x(data.expected), m.top - 14, `esperado si todas aportaran igual (${data.expected.toFixed(2)} %)`,
        { size: 10.5, fill: cfg.expectedColor, anchor: 'middle', font, halo: t.bg }));
    }
    svg.appendChild(F.el('line', { x1: m.left, y1: m.top + p * rowH, x2: m.left + pw, y2: m.top + p * rowH, stroke: t.axis }));
    svg.appendChild(F.text(m.left + pw / 2, h - 12, cfg.xlab || `Contribución a ${data.dimLabel} (%)`,
      { role: 'axis', size: 12.5, fill: t.fg, anchor: 'middle', font }));
    return svg;
  }

  /* =========================================================
     5) Calidad de representación (cos²) — mapa de calor
     ========================================================= */
  function cos2Heat(cfg, data) {
    // data: { names, M (n × k), labels }
    let names = data.names.slice(), M = data.M.map(r => r.slice());
    if (cfg.sortRows) {
      const key = M.map(r => r.slice(0, +cfg.sortBy || 1).reduce((a2, b2) => a2 + b2, 0));
      const idx = names.map((_, i) => i).sort((i, j) => key[j] - key[i]);
      names = idx.map(i => data.names[i]); M = idx.map(i => data.M[i].slice());
    }
    const k = data.labels.length, p = names.length;
    const cw = Math.max(52, Math.min(110, 520 / k));
    const rh = Math.max(17, Math.min(34, 560 / p));
    const maxLab = Math.max(...names.map(v => v.length));
    const m = { top: (cfg.title ? 66 : 26) + 26, right: 92, bottom: 26, left: Math.min(230, 14 + 7.2 * maxLab) };
    const w = m.left + k * cw + m.right, h = m.top + p * rh + m.bottom;
    const { svg, t, font } = frame(cfg, w, h);
    addTitle(svg, cfg, t, font, w);
    const cmap = F.colormaps[cfg.colormap] || F.colormaps.viridis;
    const vmax = cfg.scaleMax === 'auto' ? Math.max(...M.flat()) : 1;

    for (let i = 0; i < p; i++) for (let j = 0; j < k; j++) {
      const v = M[i][j];
      const fill = cmap(vmax > 0 ? v / vmax : 0);
      svg.appendChild(F.el('rect', {
        x: m.left + j * cw, y: m.top + i * rh, width: cw, height: rh,
        fill, stroke: cfg.gridLines ? t.bg : 'none', 'stroke-width': 1,
      }));
      if (cfg.showValues) svg.appendChild(F.text(m.left + j * cw + cw / 2, m.top + i * rh + rh / 2,
        v.toFixed(2), {
          size: Math.min(12, rh * 0.5), fill: F.onColor(fill, t.fg),
          anchor: 'middle', baseline: 'middle', font,
        }));
    }
    names.forEach((v, i) => svg.appendChild(F.text(m.left - 9, m.top + i * rh + rh / 2, v,
      { size: Math.min(12, rh * 0.56), fill: t.fg, anchor: 'end', baseline: 'middle', font })));
    data.labels.forEach((l, j) => svg.appendChild(F.text(m.left + j * cw + cw / 2, m.top - 11, l,
      { role: 'axis', size: 12.5, fill: t.fg, anchor: 'middle', weight: '600', font })));
    if (cfg.legend !== false) colorbar(svg, cfg, t, font, m.left + k * cw + 24, m.top,
      Math.min(p * rh, 230), cmap, 0, vmax, cfg.legendTitle || 'cos²');
    return svg;
  }

  window.Plots4 = { corrCircle, indMap, biplot, contribBars, cos2Heat };
})();

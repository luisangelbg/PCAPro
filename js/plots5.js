/* PCAPro — análisis de componentes principales en el navegador.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it
   under the terms of the GNU General Public License as published by the Free
   Software Foundation, either version 3 of the License, or (at your option)
   any later version. This program is distributed WITHOUT ANY WARRANTY; see
   the GNU General Public License for more details. You should have received
   a copy of the License along with this program; if not, see
   <https://www.gnu.org/licenses/>. */

/* PCAPro — figuras del Bloque 5: interpretación. */

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
     1) Perfil de los componentes por grupo
     ========================================================= */
  function groupProfile(cfg, data) {
    // data: { comps:[{label, groups:[{level, values, mean, ciLo, ciHi}], test}] }
    const k = data.comps.length;
    const ncol = Math.min(+cfg.cols || 2, k);
    const nrow = Math.ceil(k / ncol);
    const G = data.comps[0].groups.length;
    const bw = Math.max(46, Math.min(110, 420 / G));
    const cw = Math.max(300, 90 + G * bw);
    const maxLab = Math.max(...data.comps[0].groups.map(g => g.level.length));
    const chH = 300 + Math.min(110, 6 * maxLab);
    const w = ncol * cw + 30, h = (cfg.title ? 66 : 24) + nrow * chH + 16;
    const { svg, t, font } = frame(cfg, w, h);
    addTitle(svg, cfg, t, font, w);
    const top0 = cfg.title ? 66 : 24;

    data.comps.forEach((comp, ci) => {
      const cx = 16 + (ci % ncol) * cw, cy = top0 + Math.floor(ci / ncol) * chH;
      const m = { top: 40, left: 62, bottom: 30 + Math.min(105, 5.6 * maxLab) };
      const ph = 230;
      const all = comp.groups.flatMap(g => g.values);
      let lo = S.min(all), hi = S.max(all);
      const pad = (hi - lo) * 0.08 || 1;
      lo -= pad; hi += pad;
      const y = F.scaleLinear(lo, hi, cy + m.top + ph, cy + m.top);
      const x0 = cx + m.left;

      F.ticks(lo, hi, 6).forEach(v => {
        if (t.grid !== 'none') svg.appendChild(F.el('line', { x1: x0, y1: y(v), x2: x0 + G * bw, y2: y(v), stroke: t.grid }));
        svg.appendChild(F.text(x0 - 8, y(v), F.fmtTick(+v.toPrecision(3)), { role: 'tick', size: 10, fill: t.muted, anchor: 'end', baseline: 'middle', font }));
      });
      if (lo < 0 && hi > 0) svg.appendChild(F.el('line', { x1: x0, y1: y(0), x2: x0 + G * bw, y2: y(0), stroke: t.axis, 'stroke-dasharray': '4 3' }));

      comp.groups.forEach((g, gi) => {
        const col = F.color(cfg.palette, gi);
        const gx = x0 + gi * bw + bw / 2;
        const v = g.values;
        if (cfg.kind === 'caja') {
          const q1 = S.quantile(v, 0.25), q2 = S.median(v), q3 = S.quantile(v, 0.75);
          const iqr = q3 - q1;
          const inner = v.filter(z => z >= q1 - 1.5 * iqr && z <= q3 + 1.5 * iqr);
          const wlo = inner.length ? S.min(inner) : q1, whi = inner.length ? S.max(inner) : q3;
          const half = bw * 0.28;
          svg.appendChild(F.el('line', { x1: gx, y1: y(wlo), x2: gx, y2: y(whi), stroke: t.fg, 'stroke-width': 1.1 }));
          svg.appendChild(F.el('line', { x1: gx - half * 0.5, y1: y(wlo), x2: gx + half * 0.5, y2: y(wlo), stroke: t.fg }));
          svg.appendChild(F.el('line', { x1: gx - half * 0.5, y1: y(whi), x2: gx + half * 0.5, y2: y(whi), stroke: t.fg }));
          svg.appendChild(F.el('rect', {
            x: gx - half, y: y(q3), width: half * 2, height: Math.max(1, y(q1) - y(q3)),
            fill: col, opacity: 0.7, stroke: t.fg, 'stroke-width': 1, rx: 2,
          }));
          svg.appendChild(F.el('line', { x1: gx - half, y1: y(q2), x2: gx + half, y2: y(q2), stroke: t.fg, 'stroke-width': 1.9 }));
          if (cfg.showOutliers) v.forEach(z => {
            if (z < wlo || z > whi) svg.appendChild(F.el('circle', { cx: gx + (Math.random() - 0.5) * half, cy: y(z), r: 2, fill: '#e03131', opacity: 0.75 }));
          });
        } else {                                  // media con intervalo de confianza
          svg.appendChild(F.el('line', { x1: gx, y1: y(g.ciLo), x2: gx, y2: y(g.ciHi), stroke: col, 'stroke-width': 2.4 }));
          svg.appendChild(F.el('line', { x1: gx - 9, y1: y(g.ciLo), x2: gx + 9, y2: y(g.ciLo), stroke: col, 'stroke-width': 2 }));
          svg.appendChild(F.el('line', { x1: gx - 9, y1: y(g.ciHi), x2: gx + 9, y2: y(g.ciHi), stroke: col, 'stroke-width': 2 }));
          svg.appendChild(F.el('circle', { cx: gx, cy: y(g.mean), r: 6, fill: col, stroke: t.bg, 'stroke-width': 1.6 }));
        }
        if (cfg.showPoints) v.forEach(z => svg.appendChild(F.el('circle', {
          cx: gx + (Math.random() - 0.5) * bw * 0.42, cy: y(z), r: 1.8, fill: col, opacity: 0.3,
        })));
        svg.appendChild(F.text(gx, cy + m.top + ph + 12, g.level + ` (${v.length})`, {
          size: Math.min(11.5, bw * 0.26), fill: t.fg, anchor: 'end', baseline: 'middle', font, rotate: -40,
        }));
      });

      svg.appendChild(F.el('line', { x1: x0, y1: y(lo), x2: x0 + G * bw, y2: y(lo), stroke: t.axis }));
      svg.appendChild(F.el('line', { x1: x0, y1: cy + m.top, x2: x0, y2: y(lo), stroke: t.axis }));
      svg.appendChild(F.text(cx + m.left, cy + 16, comp.label, { size: 13, weight: '600', fill: t.fg, font }));
      if (cfg.showTest && comp.test) svg.appendChild(F.text(x0 + G * bw, cy + 16, comp.test,
        { size: 10.5, fill: t.muted, anchor: 'end', font }));
      svg.appendChild(F.text(cx + 16, cy + m.top + ph / 2, cfg.ylab || 'Puntuación',
        { role: 'axis', size: 11.5, fill: t.fg, anchor: 'middle', font, rotate: -90 }));
    });
    return svg;
  }

  /* =========================================================
     2) Mapa de calor de valores test
     ========================================================= */
  function vtestHeat(cfg, data) {
    // data: { rows:[{name, group}], M, labels }
    const p = data.rows.length, k = data.labels.length;
    const maxLab = Math.max(...data.rows.map(r => r.name.length));
    const cw = Math.max(56, Math.min(110, 520 / k));
    const rh = Math.max(19, Math.min(34, 560 / p));
    /* con leyenda hacen falta dos renglones extra debajo de la barra de color */
    const m = {
      top: (cfg.title ? 66 : 26) + 26, right: 96,
      bottom: cfg.legend !== false ? 52 : 26,
      left: Math.min(250, 14 + 7.2 * maxLab),
    };
    const w = m.left + k * cw + m.right;
    const barBottom = m.top + Math.min(p * rh, 230) + 40;
    const h = Math.max(m.top + p * rh + m.bottom, barBottom + 10);
    const { svg, t, font } = frame(cfg, w, h);
    addTitle(svg, cfg, t, font, w);
    const cmap = F.colormaps[cfg.colormap] || F.colormaps.rdbu;
    const lim = +cfg.limit || Math.max(3, Math.ceil(Math.max(...data.M.flat().map(Math.abs))));

    for (let i = 0; i < p; i++) for (let j = 0; j < k; j++) {
      const v = data.M[i][j];
      const fill = cmap((Math.max(-lim, Math.min(lim, v)) + lim) / (2 * lim));
      const sig = Math.abs(v) >= 1.96;
      svg.appendChild(F.el('rect', {
        x: m.left + j * cw, y: m.top + i * rh, width: cw, height: rh, fill,
        opacity: cfg.fadeNS && !sig ? 0.3 : 1,
        stroke: cfg.gridLines ? t.bg : 'none', 'stroke-width': 1,
      }));
      if (cfg.showValues) svg.appendChild(F.text(m.left + j * cw + cw / 2, m.top + i * rh + rh / 2,
        v.toFixed(1).replace('-', '−') + (cfg.showStars && sig ? (Math.abs(v) >= 2.58 ? ' **' : ' *') : ''), {
          size: Math.min(11.5, rh * 0.46),
          fill: (cfg.fadeNS && !sig) ? t.muted : F.onColor(fill, t.fg),
          anchor: 'middle', baseline: 'middle', font, weight: sig ? '700' : 'normal',
        }));
    }
    data.rows.forEach((r, i) => {
      svg.appendChild(F.text(m.left - 9, m.top + i * rh + rh / 2, r.name,
        { size: Math.min(12, rh * 0.52), fill: t.fg, anchor: 'end', baseline: 'middle', font }));
    });
    data.labels.forEach((l, j) => svg.appendChild(F.text(m.left + j * cw + cw / 2, m.top - 11, l,
      { role: 'axis', size: 12.5, fill: t.fg, anchor: 'middle', weight: '600', font })));

    if (cfg.legend !== false) {
      const bx = m.left + k * cw + 26, by = m.top, bh = Math.min(p * rh, 230), bwd = 15;
      const defs = F.el('defs');
      const id = 'vt' + Math.random().toString(36).slice(2, 8);
      const g = F.el('linearGradient', { id, x1: '0', y1: '1', x2: '0', y2: '0' });
      for (let i = 0; i <= 20; i++) g.appendChild(F.el('stop', { offset: (i * 5) + '%', 'stop-color': cmap(i / 20) }));
      defs.appendChild(g); svg.appendChild(defs);
      svg.appendChild(F.el('rect', { x: bx, y: by, width: bwd, height: bh, fill: `url(#${id})`, stroke: t.axis, 'stroke-width': 0.6 }));
      [[`+${lim}`, by], ['0', by + bh / 2], [`−${lim}`, by + bh]].forEach(([s, yy]) =>
        svg.appendChild(F.text(bx + bwd + 5, yy, s, { size: 10, fill: t.muted, baseline: 'middle', font })));
      svg.appendChild(F.text(bx + bwd / 2, by - 12, cfg.legendTitle || 'v.test', { size: 10.5, fill: t.fg, anchor: 'middle', font }));
      svg.appendChild(F.text(bx, by + bh + 22, '* |v| ≥ 1.96', { size: 9.5, fill: t.muted, font }));
      svg.appendChild(F.text(bx, by + bh + 34, '** |v| ≥ 2.58', { size: 9.5, fill: t.muted, font }));
    }
    return svg;
  }

  /* =========================================================
     3) Descripción de una dimensión (correlaciones ordenadas)
     ========================================================= */
  function dimDesc(cfg, data) {
    // data: { items:[{name, r, p, supp}], dimLabel, n }
    let items = data.items.slice();
    if (cfg.onlySig) items = items.filter(i => i.p < 0.05);
    items.sort((a, b) => (cfg.sort === 'signo' ? b.r - a.r : Math.abs(b.r) - Math.abs(a.r)));
    if (+cfg.topN > 0) items = items.slice(0, +cfg.topN);
    const p = items.length || 1;
    const maxLab = Math.max(...items.map(i => i.name.length), 6);
    const rowH = Math.max(16, Math.min(30, 460 / p));
    const m = { top: cfg.title ? 74 : 38, right: 62, bottom: 52, left: Math.min(240, 16 + 7.2 * maxLab) };
    const w = +cfg.width || 820, h = m.top + p * rowH + m.bottom;
    const { svg, t, font } = frame(cfg, w, h);
    addTitle(svg, cfg, t, font, w);
    const pw = w - m.left - m.right;
    const x = F.scaleLinear(-1, 1, m.left, m.left + pw);

    [-1, -0.5, 0, 0.5, 1].forEach(v => {
      if (t.grid !== 'none' && v !== 0) svg.appendChild(F.el('line', { x1: x(v), y1: m.top - 6, x2: x(v), y2: m.top + p * rowH, stroke: t.grid }));
      svg.appendChild(F.text(x(v), m.top + p * rowH + 18, String(v), { role: 'tick', size: 10.5, fill: t.muted, anchor: 'middle', font }));
    });
    if (cfg.showThreshold) [-0.3, 0.3].forEach(v => svg.appendChild(F.el('line', {
      x1: x(v), y1: m.top - 6, x2: x(v), y2: m.top + p * rowH,
      stroke: cfg.thrColor, 'stroke-width': 1, 'stroke-dasharray': '4 3', opacity: 0.8,
    })));

    items.forEach((it, i) => {
      const yy = m.top + i * rowH;
      const col = it.supp ? cfg.suppColor : (it.r >= 0 ? cfg.colorPos : cfg.colorNeg);
      svg.appendChild(F.el('rect', {
        x: Math.min(x(0), x(it.r)), y: yy + rowH * 0.18, width: Math.abs(x(it.r) - x(0)),
        height: rowH * 0.64, fill: col, opacity: it.p < 0.05 ? 0.92 : 0.3, rx: 2,
      }));
      svg.appendChild(F.text(m.left - 9, yy + rowH / 2, it.name + (it.supp ? ' †' : ''), {
        size: Math.min(11.5, rowH * 0.6), fill: it.p < 0.05 ? t.fg : t.muted,
        anchor: 'end', baseline: 'middle', font, weight: it.p < 0.05 ? '600' : 'normal',
      }));
      if (cfg.showValues) svg.appendChild(F.text(x(it.r) + (it.r >= 0 ? 5 : -5), yy + rowH / 2,
        it.r.toFixed(2).replace('-', '−') + (it.p < 0.001 ? '***' : it.p < 0.01 ? '**' : it.p < 0.05 ? '*' : ''),
        { size: Math.min(10.5, rowH * 0.55), fill: t.muted, anchor: it.r >= 0 ? 'start' : 'end', baseline: 'middle', font }));
    });

    svg.appendChild(F.el('line', { x1: x(0), y1: m.top - 6, x2: x(0), y2: m.top + p * rowH, stroke: t.axis }));
    svg.appendChild(F.text(m.left + pw / 2, h - 12, cfg.xlab || `Correlación con ${data.dimLabel}  (n = ${data.n})`,
      { role: 'axis', size: 12.5, fill: t.fg, anchor: 'middle', font }));
    if (data.items.some(i => i.supp)) svg.appendChild(F.text(m.left, h - 30, '† variable suplementaria',
      { size: 9.5, fill: t.muted, font }));
    return svg;
  }

  /* =========================================================
     4) Residuos de la matriz de correlaciones reproducida
     ========================================================= */
  function residualHeat(cfg, data) {
    // data: { vars, R (residuos), rmsr, k }
    const p = data.vars.length;
    const maxLab = Math.max(...data.vars.map(v => v.length));
    const cell = Math.max(20, Math.min(54, 560 / p));
    const m = {
      top: (cfg.title ? 64 : 26) + Math.min(150, 6.6 * maxLab),
      right: 96, bottom: 34, left: Math.min(210, 12 + 7.2 * maxLab),
    };
    const w = m.left + p * cell + m.right, h = m.top + p * cell + m.bottom;
    const { svg, t, font } = frame(cfg, w, h);
    addTitle(svg, cfg, t, font, w);
    const cmap = F.colormaps[cfg.colormap] || F.colormaps.rdbu;
    const lim = +cfg.limit || Math.max(0.1, Math.ceil(Math.max(...data.R.flatMap((r, i) => r.filter((_, j) => i !== j).map(Math.abs))) * 20) / 20);

    for (let i = 0; i < p; i++) for (let j = 0; j < p; j++) {
      if (cfg.triangle === 'lower' && j > i) continue;
      if (cfg.triangle === 'upper' && j < i) continue;
      const diag = i === j;
      const v = diag ? 0 : data.R[i][j];
      const fill = diag ? t.bg : cmap((Math.max(-lim, Math.min(lim, v)) + lim) / (2 * lim));
      svg.appendChild(F.el('rect', {
        x: m.left + j * cell, y: m.top + i * cell, width: cell, height: cell,
        fill, stroke: cfg.gridLines ? t.bg : 'none', 'stroke-width': 1,
      }));
      if (cfg.showValues && cell >= 26 && !diag) svg.appendChild(F.text(
        m.left + j * cell + cell / 2, m.top + i * cell + cell / 2,
        v.toFixed(2).replace('0.', '.').replace('-.', '−.'),
        {
          size: Math.min(11, cell * 0.3), fill: F.onColor(fill, t.fg),
          anchor: 'middle', baseline: 'middle', font,
          weight: Math.abs(v) > 0.05 ? '700' : 'normal',
        }));
    }
    data.vars.forEach((v, i) => {
      svg.appendChild(F.text(m.left - 8, m.top + i * cell + cell / 2, v,
        { size: Math.min(12, cell * 0.46), fill: t.fg, anchor: 'end', baseline: 'middle', font }));
      svg.appendChild(F.text(m.left + i * cell + cell / 2, m.top - 8, v,
        { size: Math.min(12, cell * 0.46), fill: t.fg, anchor: 'start', baseline: 'middle', font, rotate: -90 }));
    });
    svg.appendChild(F.text(m.left, h - 12,
      `RMSR = ${data.rmsr.toFixed(4)} · residuos |r| > 0.05: ${data.big} de ${p * (p - 1) / 2}`,
      { size: 11, fill: t.fg, font }));

    if (cfg.legend !== false) {
      const bx = m.left + p * cell + 26, by = m.top, bh = Math.min(p * cell, 220), bwd = 15;
      const defs = F.el('defs');
      const id = 'rs' + Math.random().toString(36).slice(2, 8);
      const g = F.el('linearGradient', { id, x1: '0', y1: '1', x2: '0', y2: '0' });
      for (let i = 0; i <= 20; i++) g.appendChild(F.el('stop', { offset: (i * 5) + '%', 'stop-color': cmap(i / 20) }));
      defs.appendChild(g); svg.appendChild(defs);
      svg.appendChild(F.el('rect', { x: bx, y: by, width: bwd, height: bh, fill: `url(#${id})`, stroke: t.axis, 'stroke-width': 0.6 }));
      [[`+${lim}`, by], ['0', by + bh / 2], [`−${lim}`, by + bh]].forEach(([s, yy]) =>
        svg.appendChild(F.text(bx + bwd + 5, yy, s, { size: 10, fill: t.muted, baseline: 'middle', font })));
      svg.appendChild(F.text(bx + bwd / 2, by - 12, 'residuo', { size: 10.5, fill: t.fg, anchor: 'middle', font }));
    }
    return svg;
  }

  window.Plots5 = { groupProfile, vtestHeat, dimDesc, residualHeat };
})();

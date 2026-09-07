/* PCAPro — figuras del Bloque 1 (exploración previa al ACP).
   Cada funcion devuelve un <svg> completamente autocontenido. */

(function () {

  const F = Fig;

  /* ---------- utilidades comunes de marco ---------- */
  function frame(cfg, w, h, m) {
    const t = F.themes[cfg.theme] || F.themes.claro;
    const svg = F.svg(w, h, cfg.theme);
    const font = F.fonts[cfg.font] || F.fonts.sans;
    return { svg, t, font, m };
  }
  function addTitle(svg, cfg, t, font, w, sub) {
    let y = 30;
    if (cfg.title) {
      svg.appendChild(F.text(w / 2, y, cfg.title,
        { role: 'title', size: +cfg.titleSize || 17, weight: '600', fill: t.fg, anchor: 'middle', font }));
      y += 19;
    }
    if (sub) svg.appendChild(F.text(w / 2, y, sub, { role: 'subtitle', size: 11.5, fill: t.muted, anchor: 'middle', font }));
    return y;
  }

  /* =========================================================
     1) Mapa de datos faltantes
     ========================================================= */
  function missingMap(cfg, data) {
    // data: { vars:[nombres], present: [[bool...]] filas x vars, n }
    const vars = data.vars, n = data.n;
    const m = { top: cfg.title ? 84 : 40, right: 30, bottom: 46, left: Math.min(220, 10 + 7.4 * Math.max(...vars.map(v => v.length))) };
    const rowH = Math.max(10, Math.min(26, 420 / vars.length));
    const w = 920;
    const plotW = w - m.left - m.right;
    const h = m.top + vars.length * rowH + m.bottom;
    const { svg, t, font } = frame(cfg, w, h, m);

    addTitle(svg, cfg, t, font, w, cfg.subtitle);

    const cellW = plotW / n;
    vars.forEach((v, j) => {
      const y = m.top + j * rowH;
      // fondo "presente"
      svg.appendChild(F.el('rect', { x: m.left, y, width: plotW, height: rowH - 1.5, fill: cfg.colorPresent, opacity: 0.85 }));
      // marcas de faltante
      let run = null;
      for (let i = 0; i <= n; i++) {
        const miss = i < n && !data.present[i][j];
        if (miss && run === null) run = i;
        if (!miss && run !== null) {
          svg.appendChild(F.el('rect', {
            x: m.left + run * cellW, y, width: Math.max(1, (i - run) * cellW),
            height: rowH - 1.5, fill: cfg.colorMissing,
          }));
          run = null;
        }
      }
      svg.appendChild(F.text(m.left - 8, y + rowH / 2, v,
        { size: Math.min(12, rowH * 0.75), fill: t.fg, anchor: 'end', baseline: 'middle', font }));
      const nm = data.present.reduce((s, r) => s + (r[j] ? 0 : 1), 0);
      if (cfg.showCounts) {
        svg.appendChild(F.text(m.left + plotW + 6, y + rowH / 2, nm ? `${nm}` : '0',
          { size: Math.min(11, rowH * 0.7), fill: nm ? '#e03131' : t.muted, baseline: 'middle', font }));
      }
    });

    // eje x
    const yb = m.top + vars.length * rowH;
    svg.appendChild(F.el('line', { x1: m.left, y1: yb + 4, x2: m.left + plotW, y2: yb + 4, stroke: t.axis, 'stroke-width': 1 }));
    F.ticks(1, n, 6).forEach(v => {
      if (v < 1 || v > n) return;
      const x = m.left + (v - 0.5) * cellW;
      svg.appendChild(F.el('line', { x1: x, y1: yb + 4, x2: x, y2: yb + 9, stroke: t.axis }));
      svg.appendChild(F.text(x, yb + 22, String(v), { role: 'tick', size: 10.5, fill: t.muted, anchor: 'middle', font }));
    });
    svg.appendChild(F.text(m.left + plotW / 2, h - 8, cfg.xlab || 'Observación (fila del archivo)',
      { role: 'axis', size: 12, fill: t.fg, anchor: 'middle', font }));

    // leyenda
    const lx = m.left, ly = m.top - 14;
    svg.appendChild(F.el('rect', { x: lx, y: ly - 9, width: 11, height: 11, fill: cfg.colorPresent }));
    svg.appendChild(F.text(lx + 16, ly, 'dato presente', { size: 11, fill: t.muted, baseline: 'middle', font }));
    svg.appendChild(F.el('rect', { x: lx + 120, y: ly - 9, width: 11, height: 11, fill: cfg.colorMissing }));
    svg.appendChild(F.text(lx + 136, ly, 'dato faltante', { size: 11, fill: t.muted, baseline: 'middle', font }));
    return svg;
  }

  /* =========================================================
     2) Perfil de escalas (barras de desviación estándar)
     ========================================================= */
  function scaleProfile(cfg, data) {
    // data: { vars, sd[], mean[], cv[] }
    const vars = data.vars;
    const metric = cfg.metric || 'sd';
    const vals = vars.map((_, i) => metric === 'sd' ? data.sd[i] : metric === 'mean' ? Math.abs(data.mean[i]) : data.cv[i]);
    const label = metric === 'sd' ? 'Desviación estándar' : metric === 'mean' ? 'Media (valor absoluto)' : 'Coeficiente de variación (%)';
    const useLog = cfg.logScale && vals.every(v => v > 0);

    const order = vars.map((v, i) => i);
    if (cfg.sort === 'desc') order.sort((a, b) => vals[b] - vals[a]);
    else if (cfg.sort === 'asc') order.sort((a, b) => vals[a] - vals[b]);

    const w = 920;
    const rowH = Math.max(16, Math.min(34, 460 / vars.length));
    const m = { top: cfg.title ? 70 : 34, right: 66, bottom: 52, left: Math.min(230, 14 + 7.4 * Math.max(...vars.map(v => v.length))) };
    const h = m.top + vars.length * rowH + m.bottom;
    const plotW = w - m.left - m.right;
    const { svg, t, font } = frame(cfg, w, h, m);
    addTitle(svg, cfg, t, font, w, cfg.subtitle);

    const mx = Math.max(...vals), mn = Math.min(...vals.filter(v => v > 0));
    const x = useLog
      ? (() => {
          const lo = Math.log10(mn) - 0.15, hi = Math.log10(mx) + 0.15;
          const s = F.scaleLinear(lo, hi, m.left, m.left + plotW);
          return v => s(Math.log10(Math.max(v, 1e-12)));
        })()
      : F.scaleLinear(0, mx * 1.08, m.left, m.left + plotW);

    // rejilla
    const tickVals = useLog
      ? F.ticks(Math.log10(mn) - 0.15, Math.log10(mx) + 0.15, 5).map(v => Math.pow(10, v))
      : F.ticks(0, mx * 1.08, 6);
    tickVals.forEach(v => {
      const px = x(v);
      if (px < m.left - 1 || px > m.left + plotW + 1) return;
      if (t.grid !== 'none') svg.appendChild(F.el('line', { x1: px, y1: m.top - 6, x2: px, y2: m.top + vars.length * rowH, stroke: t.grid }));
      svg.appendChild(F.text(px, m.top + vars.length * rowH + 18, F.fmtTick(+v.toPrecision(3)),
        { role: 'tick', size: 10.5, fill: t.muted, anchor: 'middle', font }));
    });

    order.forEach((idx, k) => {
      const y = m.top + k * rowH;
      const bw = Math.max(1, x(vals[idx]) - m.left);
      svg.appendChild(F.el('rect', {
        x: m.left, y: y + rowH * 0.16, width: bw, height: rowH * 0.68,
        fill: cfg.singleColor ? cfg.barColor : F.color(cfg.palette, k),
        rx: 3, opacity: cfg.opacity != null ? cfg.opacity : 0.92,
        stroke: cfg.outline ? t.fg : 'none', 'stroke-width': 0.7,
      }));
      svg.appendChild(F.text(m.left - 9, y + rowH / 2, vars[idx],
        { size: Math.min(12.5, rowH * 0.62), fill: t.fg, anchor: 'end', baseline: 'middle', font }));
      if (cfg.showValues) {
        svg.appendChild(F.text(m.left + bw + 6, y + rowH / 2, F.fmtTick(+vals[idx].toPrecision(3)),
          { size: Math.min(11.5, rowH * 0.58), fill: t.muted, baseline: 'middle', font }));
      }
    });

    svg.appendChild(F.el('line', { x1: m.left, y1: m.top + vars.length * rowH, x2: m.left + plotW, y2: m.top + vars.length * rowH, stroke: t.axis }));
    svg.appendChild(F.text(m.left + plotW / 2, h - 10, cfg.xlab || (label + (useLog ? ' — escala logarítmica' : '')),
      { role: 'axis', size: 12.5, fill: t.fg, anchor: 'middle', font }));
    return svg;
  }

  /* =========================================================
     3) Matriz de correlaciones (mapa de calor)
     ========================================================= */
  function corrHeatmap(cfg, data) {
    // data: { vars, R }
    let vars = data.vars.slice(), R = data.R.map(r => r.slice());
    if (cfg.reorder) {
      // ordenamiento por el primer autovector (agrupa variables correlacionadas)
      const e = S.eigenSym(R);
      const v1 = R.map((_, i) => e.vectors[i][0]);
      const v2 = R.map((_, i) => e.vectors[i][1] || 0);
      const ang = v1.map((x, i) => Math.atan2(v2[i], x));
      const idx = vars.map((_, i) => i).sort((a, b) => ang[a] - ang[b]);
      vars = idx.map(i => data.vars[i]);
      R = idx.map(i => idx.map(j => data.R[i][j]));
    }
    const p = vars.length;
    const maxLab = Math.max(...vars.map(v => v.length));
    const cell = Math.max(18, Math.min(56, 620 / p));
    const m = { top: (cfg.title ? 64 : 26) + Math.min(150, 6.6 * maxLab), right: 96, bottom: 24, left: Math.min(200, 12 + 7.2 * maxLab) };
    const w = m.left + p * cell + m.right;
    const h = m.top + p * cell + m.bottom;
    const { svg, t, font } = frame(cfg, w, h, m);
    addTitle(svg, cfg, t, font, w, cfg.subtitle);

    const cmap = F.colormaps[cfg.colormap] || F.colormaps.rdbu;
    const col = r => cmap((r + 1) / 2);

    for (let i = 0; i < p; i++) for (let j = 0; j < p; j++) {
      if (cfg.triangle === 'lower' && j > i) continue;
      if (cfg.triangle === 'upper' && j < i) continue;
      const x = m.left + j * cell, y = m.top + i * cell;
      const r = R[i][j];
      if (cfg.shape === 'circle') {
        const rad = (cell / 2 - 1.5) * Math.min(1, Math.abs(r) + 0.06);
        svg.appendChild(F.el('circle', { cx: x + cell / 2, cy: y + cell / 2, r: rad, fill: col(r) }));
      } else {
        svg.appendChild(F.el('rect', { x, y, width: cell, height: cell, fill: col(r), stroke: cfg.gridLines ? t.bg : 'none', 'stroke-width': 1 }));
      }
      if (cfg.showValues && cell >= 24) {
        svg.appendChild(F.text(x + cell / 2, y + cell / 2, r.toFixed(2).replace('0.', '.').replace('-.', '−.'),
          { size: Math.min(12, cell * 0.32), fill: F.onColor(col(r), t.fg), anchor: 'middle', baseline: 'middle', font }));
      }
    }

    vars.forEach((v, i) => {
      svg.appendChild(F.text(m.left - 8, m.top + i * cell + cell / 2, v,
        { size: Math.min(12.5, cell * 0.48), fill: t.fg, anchor: 'end', baseline: 'middle', font }));
      const x = m.left + i * cell + cell / 2;
      svg.appendChild(F.text(x, m.top - 8, v,
        { size: Math.min(12.5, cell * 0.48), fill: t.fg, anchor: 'start', baseline: 'middle', font, rotate: -90 }));
    });

    // barra de color
    if (cfg.legend !== false) {
      const bx = m.left + p * cell + 26, by = m.top, bh = Math.min(p * cell, 260), bw = 15;
      const defs = F.el('defs');
      const grad = F.el('linearGradient', { id: 'cbar', x1: '0', y1: '1', x2: '0', y2: '0' });
      for (let k = 0; k <= 20; k++) grad.appendChild(F.el('stop', { offset: (k / 20 * 100) + '%', 'stop-color': cmap(k / 20) }));
      defs.appendChild(grad); svg.appendChild(defs);
      svg.appendChild(F.el('rect', { x: bx, y: by, width: bw, height: bh, fill: 'url(#cbar)', stroke: t.axis, 'stroke-width': 0.6 }));
      [[-1, by + bh], [0, by + bh / 2], [1, by]].forEach(([v, y]) => {
        svg.appendChild(F.text(bx + bw + 5, y, v === 0 ? '0' : (v > 0 ? '+1' : '−1'),
          { size: 10.5, fill: t.muted, baseline: 'middle', font }));
      });
      svg.appendChild(F.text(bx + bw / 2, by - 12, cfg.legendTitle || 'r',
        { size: 11.5, fill: t.fg, anchor: 'middle', font, italic: true }));
    }
    return svg;
  }

  /* =========================================================
     4) Histogramas (rejilla de distribuciones)
     ========================================================= */
  function histGrid(cfg, data) {
    // data: { vars, cols: [[valores]] }
    const p = data.vars.length;
    const ncol = Math.min(+cfg.cols || 3, p);
    const nrow = Math.ceil(p / ncol);
    const cw = 300, ch = 190;
    const w = ncol * cw + 30, h = (cfg.title ? 58 : 20) + nrow * ch + 14;
    const { svg, t, font } = frame(cfg, w, h, {});
    addTitle(svg, cfg, t, font, w, cfg.subtitle);
    const top0 = cfg.title ? 58 : 20;

    data.vars.forEach((name, k) => {
      const v = data.cols[k];
      const cx = 18 + (k % ncol) * cw, cy = top0 + Math.floor(k / ncol) * ch;
      const m = { top: 24, right: 16, bottom: 30, left: 40 };
      const pw = cw - m.left - m.right - 12, ph = ch - m.top - m.bottom;
      const hist = S.histogram(v, +cfg.bins || 0);
      const maxC = Math.max(...hist.counts);
      const x = F.scaleLinear(hist.min, hist.max, cx + m.left, cx + m.left + pw);
      const y = F.scaleLinear(0, maxC * 1.1, cy + m.top + ph, cy + m.top);

      if (t.grid !== 'none') F.ticks(0, maxC * 1.1, 4).forEach(c =>
        svg.appendChild(F.el('line', { x1: cx + m.left, y1: y(c), x2: cx + m.left + pw, y2: y(c), stroke: t.grid })));

      hist.counts.forEach((c, i) => {
        const x0 = x(hist.min + i * hist.width), x1 = x(hist.min + (i + 1) * hist.width);
        svg.appendChild(F.el('rect', {
          x: x0 + 0.5, y: y(c), width: Math.max(1, x1 - x0 - 1), height: y(0) - y(c),
          fill: cfg.singleColor ? cfg.barColor : F.color(cfg.palette, k), opacity: 0.85,
          stroke: cfg.outline ? t.fg : 'none', 'stroke-width': 0.6,
        }));
      });

      if (cfg.showNormal) {                  // curva normal de referencia
        const mu = S.mean(v), sd = S.sd(v);
        if (sd > 0) {
          const pts = [];
          for (let i = 0; i <= 60; i++) {
            const xv = hist.min + (hist.max - hist.min) * i / 60;
            const dens = Math.exp(-0.5 * Math.pow((xv - mu) / sd, 2)) / (sd * Math.sqrt(2 * Math.PI));
            pts.push(`${x(xv).toFixed(1)},${y(dens * v.length * hist.width).toFixed(1)}`);
          }
          svg.appendChild(F.el('polyline', { points: pts.join(' '), fill: 'none', stroke: cfg.normalColor || '#e03131', 'stroke-width': 1.6, 'stroke-dasharray': '5 3' }));
        }
      }
      if (cfg.showMean) {
        const mu = S.mean(v);
        svg.appendChild(F.el('line', { x1: x(mu), y1: y(0), x2: x(mu), y2: y(maxC * 1.1), stroke: t.fg, 'stroke-width': 1.2, 'stroke-dasharray': '3 3', opacity: 0.7 }));
      }

      svg.appendChild(F.el('line', { x1: cx + m.left, y1: y(0), x2: cx + m.left + pw, y2: y(0), stroke: t.axis }));
      svg.appendChild(F.el('line', { x1: cx + m.left, y1: y(0), x2: cx + m.left, y2: cy + m.top, stroke: t.axis }));
      F.ticks(hist.min, hist.max, 4).forEach(tv => {
        if (tv < hist.min || tv > hist.max) return;
        svg.appendChild(F.text(x(tv), y(0) + 14, F.fmtTick(+tv.toPrecision(3)), { role: 'tick', size: 9.5, fill: t.muted, anchor: 'middle', font }));
      });
      F.ticks(0, maxC * 1.1, 4).forEach(c =>
        svg.appendChild(F.text(cx + m.left - 5, y(c), String(Math.round(c)), { role: 'tick', size: 9.5, fill: t.muted, anchor: 'end', baseline: 'middle', font })));

      const sk = S.skewness(v);
      svg.appendChild(F.text(cx + m.left, cy + 14, name, { size: 12, weight: '600', fill: t.fg, font }));
      if (cfg.showSkew) svg.appendChild(F.text(cx + m.left + pw, cy + 14, 'g₁ = ' + sk.toFixed(2),
        { size: 10, fill: Math.abs(sk) > 1 ? '#e8890c' : t.muted, anchor: 'end', font }));
    });
    return svg;
  }

  /* =========================================================
     5) Diagrama de cajas de las variables estandarizadas
     ========================================================= */
  function boxPanel(cfg, data) {
    // data: { vars, cols: [[valores escalados]] }
    const vars = data.vars, p = vars.length;
    const bw = Math.max(26, Math.min(64, 760 / p));
    const m = { top: cfg.title ? 68 : 32, right: 26, bottom: 26 + Math.min(110, 5.0 * Math.max(...vars.map(v => v.length))), left: 62 };
    const w = m.left + p * bw + m.right, h = m.top + 360 + m.bottom;
    const { svg, t, font } = frame(cfg, w, h, m);
    addTitle(svg, cfg, t, font, w, cfg.subtitle);

    const all = data.cols.flat();
    let lo = S.min(all), hi = S.max(all);
    if (cfg.trim) { lo = S.quantile(all, 0.002); hi = S.quantile(all, 0.998); }
    const pad = (hi - lo) * 0.06;
    const y = F.scaleLinear(lo - pad, hi + pad, m.top + 360, m.top);

    F.ticks(lo - pad, hi + pad, 7).forEach(v => {
      if (t.grid !== 'none') svg.appendChild(F.el('line', { x1: m.left, y1: y(v), x2: m.left + p * bw, y2: y(v), stroke: t.grid }));
      svg.appendChild(F.text(m.left - 8, y(v), F.fmtTick(+v.toPrecision(3)), { role: 'tick', size: 10.5, fill: t.muted, anchor: 'end', baseline: 'middle', font }));
    });
    if (lo < 0 && hi > 0) svg.appendChild(F.el('line', { x1: m.left, y1: y(0), x2: m.left + p * bw, y2: y(0), stroke: t.axis, 'stroke-dasharray': '4 3' }));

    data.cols.forEach((v, k) => {
      const cx = m.left + k * bw + bw / 2;
      const q1 = S.quantile(v, 0.25), q2 = S.median(v), q3 = S.quantile(v, 0.75);
      const iqr = q3 - q1;
      const inner = v.filter(x => x >= q1 - 1.5 * iqr && x <= q3 + 1.5 * iqr);
      const wlo = inner.length ? S.min(inner) : q1, whi = inner.length ? S.max(inner) : q3;
      const c = cfg.singleColor ? cfg.barColor : F.color(cfg.palette, k);
      const half = bw * 0.3;
      svg.appendChild(F.el('line', { x1: cx, y1: y(wlo), x2: cx, y2: y(whi), stroke: t.fg, 'stroke-width': 1.1 }));
      svg.appendChild(F.el('line', { x1: cx - half * 0.5, y1: y(wlo), x2: cx + half * 0.5, y2: y(wlo), stroke: t.fg, 'stroke-width': 1.1 }));
      svg.appendChild(F.el('line', { x1: cx - half * 0.5, y1: y(whi), x2: cx + half * 0.5, y2: y(whi), stroke: t.fg, 'stroke-width': 1.1 }));
      svg.appendChild(F.el('rect', { x: cx - half, y: y(q3), width: half * 2, height: Math.max(1, y(q1) - y(q3)), fill: c, opacity: 0.75, stroke: t.fg, 'stroke-width': 1, rx: 2 }));
      svg.appendChild(F.el('line', { x1: cx - half, y1: y(q2), x2: cx + half, y2: y(q2), stroke: t.fg, 'stroke-width': 1.9 }));
      if (cfg.showOutliers) v.forEach(x => {
        if (x < wlo || x > whi) svg.appendChild(F.el('circle', { cx: cx + (Math.random() - 0.5) * half, cy: y(x), r: 2.1, fill: '#e03131', opacity: 0.75 }));
      });
      if (cfg.showPoints) v.forEach(x => {
        svg.appendChild(F.el('circle', { cx: cx + (Math.random() - 0.5) * half * 1.4, cy: y(x), r: 1.5, fill: c, opacity: 0.28 }));
      });
      svg.appendChild(F.text(cx, m.top + 372, vars[k], { size: Math.min(12, bw * 0.36), fill: t.fg, anchor: 'end', baseline: 'middle', font, rotate: -45 }));
    });

    svg.appendChild(F.el('line', { x1: m.left, y1: m.top + 360, x2: m.left + p * bw, y2: m.top + 360, stroke: t.axis }));
    svg.appendChild(F.el('line', { x1: m.left, y1: m.top, x2: m.left, y2: m.top + 360, stroke: t.axis }));
    svg.appendChild(F.text(16, m.top + 180, cfg.ylab || 'Valor', { role: 'axis', size: 12.5, fill: t.fg, anchor: 'middle', font, rotate: -90 }));
    return svg;
  }

  window.Plots1 = { missingMap, scaleProfile, corrHeatmap, histGrid, boxPanel };
})();

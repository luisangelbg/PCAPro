/* PCAPro — análisis de componentes principales en el navegador.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it
   under the terms of the GNU General Public License as published by the Free
   Software Foundation, either version 3 of the License, or (at your option)
   any later version. This program is distributed WITHOUT ANY WARRANTY; see
   the GNU General Public License for more details. You should have received
   a copy of the License along with this program; if not, see
   <https://www.gnu.org/licenses/>. */

/* PCAPro — figuras del Bloque 2 (extracción y retención de componentes). */

(function () {

  const F = Fig;

  function frame(cfg, w, h) {
    const t = F.themes[cfg.theme] || F.themes.claro;
    const svg = F.svg(w, h, cfg.theme);
    const font = F.fonts[cfg.font] || F.fonts.sans;
    return { svg, t, font };
  }
  function addTitle(svg, cfg, t, font, w) {
    if (cfg.title) svg.appendChild(F.text(w / 2, 30, cfg.title,
      { role: 'title', size: +cfg.titleSize || 17, weight: '600', fill: t.fg, anchor: 'middle', font }));
    if (cfg.subtitle) svg.appendChild(F.text(w / 2, cfg.title ? 49 : 30, cfg.subtitle,
      { role: 'subtitle', size: 11.5, fill: t.muted, anchor: 'middle', font }));
  }
  /* leyenda compacta: items = [{label, color, type:'line'|'box'|'dash'}] */
  function legend(svg, items, x, y, t, font, size) {
    size = size || 11;
    let yy = y;
    items.forEach(it => {
      if (it.type === 'box') svg.appendChild(F.el('rect', { x, y: yy - 8, width: 12, height: 11, fill: it.color, opacity: it.opacity || 1 }));
      else svg.appendChild(F.el('line', {
        x1: x, y1: yy - 3, x2: x + 14, y2: yy - 3, stroke: it.color, 'stroke-width': it.width || 2,
        'stroke-dasharray': it.type === 'dash' ? '5 3' : null,
      }));
      if (it.point) svg.appendChild(F.el('circle', { cx: x + 7, cy: yy - 3, r: 3, fill: it.color }));
      svg.appendChild(F.text(x + 20, yy - 2, it.label, { size, fill: t.fg, baseline: 'middle', font }));
      yy += (size + 7) * F.fs('label');   // el interlineado debe crecer con la letra
    });
  }

  /* =========================================================
     1) Gráfico de sedimentación (scree plot)
     ========================================================= */
  function scree(cfg, data) {
    // data: { eig, pct, horn:{mean,p95}, bstick, k, n }
    const p = data.eig.length;
    const mode = cfg.yMode || 'eigen';
    const vals = mode === 'eigen' ? data.eig : data.pct.map(x => x * 100);
    const hornM = data.horn ? (mode === 'eigen' ? data.horn.mean : data.horn.mean.map(v => v / data.total * 100)) : null;
    const hornP = data.horn ? (mode === 'eigen' ? data.horn.p95 : data.horn.p95.map(v => v / data.total * 100)) : null;
    const bs = data.bstick ? (mode === 'eigen' ? data.bstick : data.bstick.map(v => v / data.total * 100)) : null;
    const kaiser = mode === 'eigen' ? 1 : (1 / data.total * 100);

    const w = +cfg.width || 900, h = +cfg.height || 520;
    const m = { top: cfg.title ? 70 : 34, right: 26, bottom: 58, left: 68 };
    const { svg, t, font } = frame(cfg, w, h);
    addTitle(svg, cfg, t, font, w);

    const pw = w - m.left - m.right, ph = h - m.top - m.bottom;
    const band = pw / p;
    let ymax = Math.max(...vals);
    if (cfg.showHorn && hornP) ymax = Math.max(ymax, Math.max(...hornP));
    if (cfg.showKaiser && data.isCorr) ymax = Math.max(ymax, kaiser);
    ymax *= 1.14;
    const x = i => m.left + band * (i + 0.5);
    const y = F.scaleLinear(0, ymax, m.top + ph, m.top);

    /* rejilla */
    const ticks = F.ticks(0, ymax, 6);
    ticks.forEach(v => {
      if (t.grid !== 'none') svg.appendChild(F.el('line', { x1: m.left, y1: y(v), x2: m.left + pw, y2: y(v), stroke: t.grid }));
      svg.appendChild(F.text(m.left - 9, y(v), F.fmtTick(+v.toPrecision(3)), { role: 'tick', size: 11, fill: t.muted, anchor: 'end', baseline: 'middle', font }));
    });

    /* zona de componentes retenidos */
    if (cfg.highlightK && data.k > 0) {
      svg.appendChild(F.el('rect', {
        x: m.left, y: m.top, width: band * data.k, height: ph,
        fill: cfg.highlightColor || '#5b3fd6', opacity: 0.07,
      }));
      svg.appendChild(F.el('line', {
        x1: m.left + band * data.k, y1: m.top, x2: m.left + band * data.k, y2: m.top + ph,
        stroke: cfg.highlightColor || '#5b3fd6', 'stroke-width': 1.4, 'stroke-dasharray': '6 4',
      }));
      svg.appendChild(F.text(m.left + band * data.k - 6, m.top + 13,
        `${data.k} componente${data.k > 1 ? 's' : ''} retenido${data.k > 1 ? 's' : ''}`,
        { size: 11, fill: cfg.highlightColor || '#5b3fd6', anchor: 'end', weight: '600', font, halo: t.bg }));
    }

    /* barras */
    if (cfg.showBars) vals.forEach((v, i) => {
      const bwd = band * (+cfg.barWidth || 0.68);
      svg.appendChild(F.el('rect', {
        x: x(i) - bwd / 2, y: y(v), width: bwd, height: Math.max(0, y(0) - y(v)),
        fill: cfg.gradientBars ? F.color(cfg.palette, i) : cfg.barColor,
        opacity: cfg.barOpacity != null ? +cfg.barOpacity : 0.9, rx: 2,
        stroke: cfg.outline ? t.fg : 'none', 'stroke-width': 0.7,
      }));
    });

    /* línea del scree */
    if (cfg.showLine) {
      svg.appendChild(F.el('polyline', {
        points: vals.map((v, i) => `${x(i)},${y(v)}`).join(' '),
        fill: 'none', stroke: cfg.lineColor, 'stroke-width': +cfg.lineWidth || 2,
      }));
      vals.forEach((v, i) => svg.appendChild(F.el('circle', {
        cx: x(i), cy: y(v), r: +cfg.pointSize || 4, fill: cfg.lineColor,
        stroke: t.bg, 'stroke-width': 1.2,
      })));
    }

    /* referencias */
    const leg = [];
    if (cfg.showBars) leg.push({ label: mode === 'eigen' ? 'Valor propio (λ)' : '% de varianza', color: cfg.gradientBars ? F.color(cfg.palette, 0) : cfg.barColor, type: 'box', opacity: 0.9 });
    if (cfg.showKaiser && data.isCorr) {
      svg.appendChild(F.el('line', { x1: m.left, y1: y(kaiser), x2: m.left + pw, y2: y(kaiser), stroke: cfg.kaiserColor, 'stroke-width': 1.5, 'stroke-dasharray': '7 4' }));
      leg.push({ label: 'Kaiser (λ = 1)', color: cfg.kaiserColor, type: 'dash' });
    }
    if (cfg.showHorn && hornP) {
      svg.appendChild(F.el('polyline', { points: hornP.map((v, i) => `${x(i)},${y(v)}`).join(' '), fill: 'none', stroke: cfg.hornColor, 'stroke-width': 1.8, 'stroke-dasharray': '6 3' }));
      hornP.forEach((v, i) => svg.appendChild(F.el('circle', { cx: x(i), cy: y(v), r: 2.6, fill: cfg.hornColor })));
      leg.push({ label: 'Análisis paralelo (p95)', color: cfg.hornColor, type: 'dash', point: true });
    }
    if (cfg.showBstick && bs) {
      svg.appendChild(F.el('polyline', { points: bs.map((v, i) => `${x(i)},${y(v)}`).join(' '), fill: 'none', stroke: cfg.bstickColor, 'stroke-width': 1.6, 'stroke-dasharray': '2 3' }));
      leg.push({ label: 'Bastón roto', color: cfg.bstickColor, type: 'dash' });
    }

    /* etiquetas de valor */
    if (cfg.showLabels) vals.forEach((v, i) => {
      if (i >= (+cfg.maxLabels || 99)) return;
      svg.appendChild(F.text(x(i), y(v) - 11,
        mode === 'eigen' ? (+v.toPrecision(3)).toString() : v.toFixed(1) + '%',
        { size: 10.5, fill: t.fg, anchor: 'middle', weight: '600', font, halo: t.bg }));
    });

    /* ejes */
    svg.appendChild(F.el('line', { x1: m.left, y1: y(0), x2: m.left + pw, y2: y(0), stroke: t.axis }));
    svg.appendChild(F.el('line', { x1: m.left, y1: m.top, x2: m.left, y2: y(0), stroke: t.axis }));
    vals.forEach((_, i) => {
      if (p > 25 && i % Math.ceil(p / 25) !== 0) return;
      svg.appendChild(F.text(x(i), y(0) + 17, String(i + 1), { role: 'tick', size: 11, fill: t.muted, anchor: 'middle', font }));
    });
    svg.appendChild(F.text(m.left + pw / 2, h - 14, cfg.xlab || 'Componente principal',
      { role: 'axis', size: 12.5, fill: t.fg, anchor: 'middle', font }));
    svg.appendChild(F.text(18, m.top + ph / 2, cfg.ylab || (mode === 'eigen' ? 'Valor propio (λ)' : 'Porcentaje de varianza explicada (%)'),
      { role: 'axis', size: 12.5, fill: t.fg, anchor: 'middle', font, rotate: -90 }));

    if (cfg.legend !== false && leg.length) legend(svg, leg, m.left + pw - 190, m.top + 20, t, font);
    return svg;
  }

  /* =========================================================
     2) Varianza acumulada
     ========================================================= */
  function cumulative(cfg, data) {
    const p = data.cum.length;
    const w = +cfg.width || 900, h = +cfg.height || 460;
    const m = { top: cfg.title ? 84 : 40, right: 46, bottom: 58, left: 68 };
    const { svg, t, font } = frame(cfg, w, h);
    addTitle(svg, cfg, t, font, w);
    const pw = w - m.left - m.right, ph = h - m.top - m.bottom;
    const x = F.scaleLinear(1, p, m.left, m.left + pw);
    const y = F.scaleLinear(0, 100, m.top + ph, m.top);

    F.ticks(0, 100, 6).forEach(v => {
      if (t.grid !== 'none') svg.appendChild(F.el('line', { x1: m.left, y1: y(v), x2: m.left + pw, y2: y(v), stroke: t.grid }));
      svg.appendChild(F.text(m.left - 9, y(v), v + '%', { role: 'tick', size: 11, fill: t.muted, anchor: 'end', baseline: 'middle', font }));
    });

    const cum = data.cum.map(v => v * 100);
    if (cfg.showArea) {
      const pts = cum.map((v, i) => `${x(i + 1)},${y(v)}`).join(' ');
      svg.appendChild(F.el('polygon', {
        points: `${m.left},${y(0)} ${pts} ${m.left + pw},${y(0)}`,
        fill: cfg.lineColor, opacity: 0.13,
      }));
    }
    /* umbral */
    if (cfg.showThreshold) {
      const thr = +cfg.threshold || 80;
      svg.appendChild(F.el('line', { x1: m.left, y1: y(thr), x2: m.left + pw, y2: y(thr), stroke: cfg.thresholdColor, 'stroke-width': 1.5, 'stroke-dasharray': '7 4' }));
      const kThr = cum.findIndex(v => v >= thr) + 1;
      svg.appendChild(F.text(m.left + pw - 4, y(thr) - 7, TT(`umbral ${thr}%` + (kThr ? ` · alcanzado en CP${kThr}` : ' · no alcanzado'),
        `${thr}% threshold` + (kThr ? ` · reached at PC${kThr}` : ' · not reached')),
        { size: 11, fill: cfg.thresholdColor, anchor: 'end', font, halo: t.bg }));
    }
    if (cfg.highlightK && data.k > 0) {
      svg.appendChild(F.el('line', { x1: x(data.k), y1: m.top, x2: x(data.k), y2: y(0), stroke: cfg.highlightColor || '#5b3fd6', 'stroke-width': 1.4, 'stroke-dasharray': '6 4' }));
      svg.appendChild(F.el('circle', { cx: x(data.k), cy: y(cum[data.k - 1]), r: 6.5, fill: 'none', stroke: cfg.highlightColor || '#5b3fd6', 'stroke-width': 2 }));
    }

    svg.appendChild(F.el('polyline', {
      points: cum.map((v, i) => `${x(i + 1)},${y(v)}`).join(' '),
      fill: 'none', stroke: cfg.lineColor, 'stroke-width': +cfg.lineWidth || 2.4,
    }));
    cum.forEach((v, i) => svg.appendChild(F.el('circle', {
      cx: x(i + 1), cy: y(v), r: +cfg.pointSize || 4.2, fill: cfg.lineColor, stroke: t.bg, 'stroke-width': 1.2,
    })));
    if (cfg.showLabels) cum.forEach((v, i) => {
      if (i >= (+cfg.maxLabels || 99)) return;
      /* la última etiqueta se ancla al final para que no se salga del lienzo */
      const last = i === p - 1;
      svg.appendChild(F.text(x(i + 1) + (last ? 4 : 0), y(v) - 11, v.toFixed(1) + '%',
        { size: 10.5, fill: t.fg, anchor: last ? 'end' : 'middle', weight: '600', font, halo: t.bg }));
    });

    svg.appendChild(F.el('line', { x1: m.left, y1: y(0), x2: m.left + pw, y2: y(0), stroke: t.axis }));
    svg.appendChild(F.el('line', { x1: m.left, y1: m.top, x2: m.left, y2: y(0), stroke: t.axis }));
    for (let i = 1; i <= p; i++) {
      if (p > 25 && (i - 1) % Math.ceil(p / 25) !== 0) continue;
      svg.appendChild(F.text(x(i), y(0) + 17, String(i), { role: 'tick', size: 11, fill: t.muted, anchor: 'middle', font }));
    }
    svg.appendChild(F.text(m.left + pw / 2, h - 14, cfg.xlab || 'Número de componentes retenidos',
      { role: 'axis', size: 12.5, fill: t.fg, anchor: 'middle', font }));
    svg.appendChild(F.text(18, m.top + ph / 2, cfg.ylab || 'Varianza acumulada explicada',
      { role: 'axis', size: 12.5, fill: t.fg, anchor: 'middle', font, rotate: -90 }));
    return svg;
  }

  /* =========================================================
     3) Comparación de criterios de retención
     ========================================================= */
  function criteria(cfg, data) {
    // data: { items: [{name, k, note}], p, chosen }
    const items = data.items;
    const rowH = 34;
    const w = +cfg.width || 860;
    const m = { top: cfg.title ? 90 : 40, right: 210, bottom: 48, left: 232 };
    const h = m.top + items.length * rowH + m.bottom;
    const { svg, t, font } = frame(cfg, w, h);
    addTitle(svg, cfg, t, font, w);
    const pw = w - m.left - m.right;
    const x = F.scaleLinear(0, Math.max(data.p, 1), m.left, m.left + pw);

    for (let i = 0; i <= data.p; i++) {
      if (data.p > 25 && i % Math.ceil(data.p / 25) !== 0) continue;
      if (t.grid !== 'none') svg.appendChild(F.el('line', { x1: x(i), y1: m.top - 8, x2: x(i), y2: m.top + items.length * rowH, stroke: t.grid }));
      svg.appendChild(F.text(x(i), m.top + items.length * rowH + 18, String(i), { role: 'tick', size: 11, fill: t.muted, anchor: 'middle', font }));
    }
    if (cfg.showChosen && data.chosen > 0) {
      svg.appendChild(F.el('line', {
        x1: x(data.chosen), y1: m.top - 10, x2: x(data.chosen), y2: m.top + items.length * rowH + 4,
        stroke: cfg.chosenColor || '#5b3fd6', 'stroke-width': 1.8, 'stroke-dasharray': '6 4',
      }));
      svg.appendChild(F.text(x(data.chosen), m.top - 16, 'tu elección: ' + data.chosen,
        { size: 11.5, fill: cfg.chosenColor || '#5b3fd6', anchor: 'middle', weight: '600', font }));
    }

    items.forEach((it, i) => {
      const y = m.top + i * rowH + rowH / 2;
      const c = cfg.singleColor ? cfg.dotColor : F.color(cfg.palette, i);
      svg.appendChild(F.el('line', { x1: x(0), y1: y, x2: x(it.k), y2: y, stroke: c, 'stroke-width': +cfg.stemWidth || 3, opacity: 0.55, 'stroke-linecap': 'round' }));
      svg.appendChild(F.el('circle', { cx: x(it.k), cy: y, r: +cfg.dotSize || 8, fill: c, stroke: t.bg, 'stroke-width': 1.5 }));
      svg.appendChild(F.text(x(it.k), y, String(it.k), { size: 10.5, fill: '#ffffff', anchor: 'middle', baseline: 'middle', weight: '700', font }));
      svg.appendChild(F.text(m.left - 12, y, it.name, { size: 12, fill: t.fg, anchor: 'end', baseline: 'middle', font }));
      if (cfg.showNotes && it.note) svg.appendChild(F.text(m.left + pw + 12, y, it.note,
        { size: 10.5, fill: t.muted, baseline: 'middle', font }));
    });

    svg.appendChild(F.el('line', { x1: m.left, y1: m.top + items.length * rowH, x2: m.left + pw, y2: m.top + items.length * rowH, stroke: t.axis }));
    svg.appendChild(F.text(m.left + pw / 2, h - 12, cfg.xlab || 'Número de componentes recomendado',
      { role: 'axis', size: 12.5, fill: t.fg, anchor: 'middle', font }));
    return svg;
  }

  /* =========================================================
     4) Valores propios observados vs. simulados (análisis paralelo)
     ========================================================= */
  function parallelPlot(cfg, data) {
    const p = data.eig.length;
    const w = +cfg.width || 900, h = +cfg.height || 470;
    const m = { top: cfg.title ? 70 : 34, right: 28, bottom: 58, left: 68 };
    const { svg, t, font } = frame(cfg, w, h);
    addTitle(svg, cfg, t, font, w);
    const pw = w - m.left - m.right, ph = h - m.top - m.bottom;
    const x = F.scaleLinear(1, p, m.left, m.left + pw);
    const ymax = Math.max(Math.max(...data.eig), Math.max(...data.horn.p95)) * 1.12;
    const y = F.scaleLinear(0, ymax, m.top + ph, m.top);

    F.ticks(0, ymax, 6).forEach(v => {
      if (t.grid !== 'none') svg.appendChild(F.el('line', { x1: m.left, y1: y(v), x2: m.left + pw, y2: y(v), stroke: t.grid }));
      svg.appendChild(F.text(m.left - 9, y(v), F.fmtTick(+v.toPrecision(3)), { role: 'tick', size: 11, fill: t.muted, anchor: 'end', baseline: 'middle', font }));
    });

    /* banda entre media y p95 de los datos aleatorios */
    if (cfg.showBand) {
      const up = data.horn.p95.map((v, i) => `${x(i + 1)},${y(v)}`);
      const dn = data.horn.mean.map((v, i) => `${x(i + 1)},${y(v)}`).reverse();
      svg.appendChild(F.el('polygon', { points: [...up, ...dn].join(' '), fill: cfg.hornColor, opacity: 0.16 }));
    }
    [['mean', 'Media aleatoria', '4 3'], ['p95', 'Percentil 95 aleatorio', '7 3']].forEach(([key, lab, dash]) => {
      if (key === 'mean' && !cfg.showMean) return;
      svg.appendChild(F.el('polyline', {
        points: data.horn[key].map((v, i) => `${x(i + 1)},${y(v)}`).join(' '),
        fill: 'none', stroke: cfg.hornColor, 'stroke-width': 1.8, 'stroke-dasharray': dash,
      }));
    });
    svg.appendChild(F.el('polyline', {
      points: data.eig.map((v, i) => `${x(i + 1)},${y(v)}`).join(' '),
      fill: 'none', stroke: cfg.lineColor, 'stroke-width': 2.6,
    }));
    data.eig.forEach((v, i) => {
      const retained = v > data.horn.p95[i];
      svg.appendChild(F.el('circle', {
        cx: x(i + 1), cy: y(v), r: retained ? 5.5 : 4,
        fill: retained ? cfg.lineColor : t.bg, stroke: cfg.lineColor, 'stroke-width': 1.8,
      }));
    });

    svg.appendChild(F.el('line', { x1: m.left, y1: y(0), x2: m.left + pw, y2: y(0), stroke: t.axis }));
    svg.appendChild(F.el('line', { x1: m.left, y1: m.top, x2: m.left, y2: y(0), stroke: t.axis }));
    for (let i = 1; i <= p; i++) {
      if (p > 25 && (i - 1) % Math.ceil(p / 25) !== 0) continue;
      svg.appendChild(F.text(x(i), y(0) + 17, String(i), { role: 'tick', size: 11, fill: t.muted, anchor: 'middle', font }));
    }
    svg.appendChild(F.text(m.left + pw / 2, h - 14, cfg.xlab || 'Componente principal', { role: 'axis', size: 12.5, fill: t.fg, anchor: 'middle', font }));
    svg.appendChild(F.text(18, m.top + ph / 2, cfg.ylab || 'Valor propio (λ)', { role: 'axis', size: 12.5, fill: t.fg, anchor: 'middle', font, rotate: -90 }));

    const leg = [
      { label: 'Datos observados', color: cfg.lineColor, type: 'line', width: 2.6, point: true },
      { label: 'Percentil 95 aleatorio', color: cfg.hornColor, type: 'dash' },
    ];
    if (cfg.showMean) leg.push({ label: 'Media aleatoria', color: cfg.hornColor, type: 'dash' });
    if (cfg.legend !== false) legend(svg, leg, m.left + pw - 200, m.top + 20, t, font);
    return svg;
  }

  window.Plots2 = { scree, cumulative, criteria, parallelPlot };
})();

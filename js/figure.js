/* PCAPro — motor de figuras SVG.
   Todas las figuras de la app se dibujan como SVG "puro" (atributos de estilo
   en linea, sin CSS externo) para que la exportacion a PNG/JPG/WEBP/SVG sea
   fiel y a cualquier resolucion. */

const Fig = {};
const NS = 'http://www.w3.org/2000/svg';

/* ================= paletas ================= */
Fig.palettes = {
  pcapro:     ['#5b3fd6', '#0d9488', '#e8890c', '#e0316f', '#2f9e44', '#0ea5e9', '#a855f7', '#84cc16', '#f43f5e', '#14b8a6'],
  npg:       ['#E64B35', '#4DBBD5', '#00A087', '#3C5488', '#F39B7F', '#8491B4', '#91D1C2', '#DC0000', '#7E6148', '#B09C85'],
  lancet:    ['#00468B', '#ED0000', '#42B540', '#0099B4', '#925E9F', '#FDAF91', '#AD002A', '#ADB6B6', '#1B1919', '#00A087'],
  jco:       ['#0073C2', '#EFC000', '#868686', '#CD534C', '#7AA6DC', '#003C67', '#8F7700', '#3B3B3B', '#A73030', '#4A6990'],
  nejm:      ['#BC3C29', '#0072B5', '#E18727', '#20854E', '#7876B1', '#6F99AD', '#FFDC91', '#EE4C97', '#1B1919', '#00468B'],
  d3:        ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'],
  set2:      ['#66C2A5', '#FC8D62', '#8DA0CB', '#E78AC3', '#A6D854', '#FFD92F', '#E5C494', '#B3B3B3', '#66A61E', '#E6AB02'],
  okabe:     ['#E69F00', '#56B4E9', '#009E73', '#F0E442', '#0072B2', '#D55E00', '#CC79A7', '#000000', '#999999', '#661100'],
  botanica:  ['#2d6a4f', '#95d5b2', '#b7791f', '#7f5539', '#40916c', '#d8f3dc', '#e9c46a', '#9c6644', '#1b4332', '#588157'],
  grises:    ['#111827', '#374151', '#6b7280', '#9ca3af', '#d1d5db', '#4b5563', '#1f2937', '#e5e7eb', '#111827', '#6b7280'],
};
Fig.paletteNames = {
  pcapro: 'PCAPro (violeta)', npg: 'Nature (NPG)', lancet: 'Lancet', jco: 'Clinical Oncology',
  nejm: 'NEJM', d3: 'D3 clásica', set2: 'Set2 (suave)', okabe: 'Okabe–Ito (daltónicos)',
  botanica: 'Botánica', grises: 'Escala de grises',
};

/* mapas continuos: t en [0,1] -> color */
function lerp(a, b, t) { return a + (b - a) * t; }
function rgb(r, g, b) { return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`; }
function rampFrom(stops) {
  return t => {
    t = Math.max(0, Math.min(1, isFinite(t) ? t : 0));
    const n = stops.length - 1;
    const i = Math.min(n - 1, Math.floor(t * n));
    const u = t * n - i;
    const a = stops[i], b = stops[i + 1];
    return rgb(lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u));
  };
}
Fig.colormaps = {
  viridis: rampFrom([[68,1,84],[59,82,139],[33,145,140],[94,201,98],[253,231,37]]),
  magma:   rampFrom([[0,0,4],[81,18,124],[183,55,121],[252,137,97],[252,253,191]]),
  inferno: rampFrom([[0,0,4],[87,16,110],[188,55,84],[249,142,9],[252,255,164]]),
  plasma:  rampFrom([[13,8,135],[126,3,168],[204,71,120],[248,149,64],[240,249,33]]),
  cividis: rampFrom([[0,32,77],[60,86,120],[124,123,120],[192,164,98],[255,234,70]]),
  rdylbu:  rampFrom([[49,54,149],[145,191,219],[255,255,191],[252,141,89],[165,0,38]]),
  rdbu:    rampFrom([[5,48,97],[103,169,207],[247,247,247],[239,138,98],[103,0,31]]),
  spectral:rampFrom([[94,79,162],[102,194,165],[255,255,191],[252,141,89],[158,1,66]]),
  bluered: rampFrom([[33,102,172],[247,247,247],[178,24,43]]),
  verdes:  rampFrom([[247,252,245],[116,196,118],[0,68,27]]),
  calor:   rampFrom([[255,255,204],[254,178,76],[189,0,38]]),
};
Fig.colormapNames = {
  viridis: 'Viridis', magma: 'Magma', inferno: 'Inferno', plasma: 'Plasma',
  cividis: 'Cividis (daltónicos)', rdylbu: 'Rojo–Amarillo–Azul', rdbu: 'Rojo–Azul (divergente)',
  spectral: 'Espectral', bluered: 'Azul–Blanco–Rojo', verdes: 'Verdes', calor: 'Calor',
};

/* Oscurece un color hacia el negro. Sirve para que un texto coloreado con una
   paleta continua siga siendo legible sobre fondo claro (el amarillo de viridis
   sobre blanco es ilegible). */
Fig.darken = (col, amount) => {
  const k = 1 - (amount == null ? 0.35 : amount);
  let r, g, b;
  let m = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/.exec(col);
  if (m) { r = +m[1]; g = +m[2]; b = +m[3]; }
  else {
    m = /^#([0-9a-f]{6})$/i.exec(col);
    if (!m) return col;
    const v = parseInt(m[1], 16);
    r = (v >> 16) & 255; g = (v >> 8) & 255; b = v & 255;
  }
  return rgb(r * k, g * k, b * k);
};

/* Luminancia percibida (0 = negro, 1 = blanco). Sirve para decidir si el texto
   sobre una celda coloreada debe ir en blanco o en negro, en vez de suponerlo
   a partir del valor: en viridis los valores BAJOS son los oscuros. */
Fig.luminance = col => {
  let r, g, b;
  let m = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/.exec(col);
  if (m) { r = +m[1]; g = +m[2]; b = +m[3]; }
  else {
    m = /^#([0-9a-f]{6})$/i.exec(col);
    if (!m) return 1;
    const v = parseInt(m[1], 16);
    r = (v >> 16) & 255; g = (v >> 8) & 255; b = v & 255;
  }
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
};
/* color de texto legible sobre un fondo dado */
Fig.onColor = (col, darkFg) => Fig.luminance(col) > 0.55 ? (darkFg || '#1b1f2a') : '#ffffff';

Fig.color = (palette, i) => {
  const p = Fig.palettes[palette] || Fig.palettes.pcapro;
  return p[i % p.length];
};

/* ================= tipografia y temas ================= */
Fig.themes = {
  claro:   { bg: '#ffffff', fg: '#1b1f2a', muted: '#667085', grid: '#e6e9ef', axis: '#9aa3b2' },
  papel:   { bg: '#fbf9f4', fg: '#2b2b28', muted: '#6b6a63', grid: '#e8e2d6', axis: '#a8a294' },
  oscuro:  { bg: '#171a22', fg: '#e9edf3', muted: '#98a1b3', grid: '#2a2f3d', axis: '#4b5364' },
  minimal: { bg: '#ffffff', fg: '#111111', muted: '#555555', grid: 'none',    axis: '#111111' },
};
Fig.themeNames = { claro: 'Claro', papel: 'Papel', oscuro: 'Oscuro', minimal: 'Minimalista' };
Fig.fonts = {
  sans: 'Helvetica, Arial, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  segoe: '"Segoe UI", Roboto, sans-serif',
  mono: 'Consolas, "Courier New", monospace',
};
Fig.fontNames = { sans: 'Helvetica / Arial', serif: 'Serif (Times)', segoe: 'Segoe UI', mono: 'Monoespaciada' };

/* ================= constructores SVG ================= */
Fig.svg = (w, h, theme) => {
  const t = Fig.themes[theme] || Fig.themes.claro;
  const s = document.createElementNS(NS, 'svg');
  s.setAttribute('xmlns', NS);
  s.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  s.setAttribute('viewBox', `0 0 ${w} ${h}`);
  s.setAttribute('width', w);
  s.setAttribute('height', h);
  s.dataset.w = w; s.dataset.h = h;
  const bg = Fig.el('rect', { x: 0, y: 0, width: w, height: h, fill: t.bg });
  s.appendChild(bg);
  return s;
};
Fig.el = (tag, attrs, text) => {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
  if (text != null) n.textContent = text;
  return n;
};
Fig.g = attrs => Fig.el('g', attrs);
/* ---------- escala tipográfica ----------
   Multiplicadores vigentes durante el dibujado de una figura. Los fija
   Fig.mount antes de llamar al render, así que TODO texto que pase por
   Fig.text queda afectado sin tocar cada figura una por una.
   Roles: 'title'/'subtitle' → títulos · 'axis'/'tick' → ejes y marcas ·
   'legend'/'label' (por defecto) → etiquetas y leyendas. */
Fig._fs = { title: 1, axis: 1, label: 1 };
Fig.fsGroup = role =>
  (role === 'title' || role === 'subtitle') ? 'title'
    : (role === 'axis' || role === 'tick') ? 'axis' : 'label';
Fig.fs = role => Fig._fs[Fig.fsGroup(role)] || 1;
Fig.setFontScale = cfg => {
  const g = +cfg.fontScale || 1;
  Fig._fs = {
    title: g * (+cfg.fsTitle || 1),
    axis: g * (+cfg.fsAxis || 1),
    label: g * (+cfg.fsLabel || 1),
  };
};

/* o.halo = color de fondo: dibuja un contorno del mismo color detrás del texto
   para que siga siendo legible cuando cae sobre una línea o un relleno.
   o.role = categoría tipográfica (ver arriba). */
Fig.text = (x, y, str, o) => {
  o = o || {};
  const size = (o.size || 12) * Fig.fs(o.role);
  return Fig.el('text', {
    stroke: o.halo || null,
    'stroke-width': o.halo ? (o.haloWidth || 3) * Fig.fs(o.role) : null,
    'stroke-linejoin': o.halo ? 'round' : null,
    'paint-order': o.halo ? 'stroke fill' : null,
    x, y,
    'font-family': o.font || Fig.fonts.sans,
    'font-size': +size.toFixed(2),
    'font-weight': o.weight || 'normal',
    'font-style': o.italic ? 'italic' : null,
    fill: o.fill || '#1b1f2a',
    'text-anchor': o.anchor || 'start',
    'dominant-baseline': o.baseline || null,
    transform: o.rotate ? `rotate(${o.rotate} ${x} ${y})` : null,
    opacity: o.opacity != null ? o.opacity : null,
  }, str);
};

/* escala lineal */
Fig.scaleLinear = (d0, d1, r0, r1) => {
  const span = (d1 - d0) || 1;
  const f = v => r0 + (v - d0) / span * (r1 - r0);
  f.invert = q => d0 + (q - r0) / ((r1 - r0) || 1) * span;
  f.domain = [d0, d1]; f.range = [r0, r1];
  return f;
};
/* marcas "bonitas" para un eje */
Fig.ticks = (min, max, count) => {
  count = count || 6;
  const span = (max - min) || 1;
  const step0 = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const norm = step0 / mag;
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
  const out = [];
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) {
    out.push(Math.abs(v) < step * 1e-9 ? 0 : +v.toFixed(10));
  }
  return out;
};
Fig.fmtTick = v => {
  if (v === 0) return '0';
  const a = Math.abs(v);
  if (a < 1e-4 || a >= 1e6) return v.toExponential(1);
  return String(+v.toFixed(6));
};

/* ================= exportacion ================= */
Fig.serialize = svg => {
  const clone = svg.cloneNode(true);
  clone.setAttribute('xmlns', NS);
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  return '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n' +
    new XMLSerializer().serializeToString(clone);
};

/* Exporta a mapa de bits. scale = factor de multiplicacion del tamano base.
   Con base 900 px y scale 8 se obtienen 7200 px de ancho (~600 ppp para 12 cm). */
Fig.toRaster = (svg, { format = 'png', scale = 4, background = '#ffffff' } = {}) =>
  new Promise((resolve, reject) => {
    const w = +svg.dataset.w || svg.viewBox.baseVal.width || 900;
    const h = +svg.dataset.h || svg.viewBox.baseVal.height || 600;
    const src = Fig.serialize(svg);
    const blob = new Blob([src], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = Math.round(w * scale); c.height = Math.round(h * scale);
      const ctx = c.getContext('2d');
      if (format !== 'png' || background) {
        ctx.fillStyle = background || '#ffffff';
        ctx.fillRect(0, 0, c.width, c.height);
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      const mime = format === 'jpg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
      c.toBlob(b => b ? resolve(b) : reject(new Error('No se pudo generar la imagen')), mime, 0.97);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo rasterizar el SVG')); };
    img.src = url;
  });

Fig.exportFigure = async (svg, { format = 'png', scale = 4, name = 'figura', background = '#ffffff' } = {}) => {
  if (format === 'svg') {
    download(new Blob([Fig.serialize(svg)], { type: 'image/svg+xml;charset=utf-8' }), name + '.svg');
    return;
  }
  const blob = await Fig.toRaster(svg, { format, scale, background });
  download(blob, name + '.' + (format === 'jpg' ? 'jpg' : format));
};

/* ================= barra de herramientas de figura =================
   host: contenedor .fig-block; render: funcion que devuelve un <svg> nuevo;
   opts: definiciones de controles editables. */
/* Registro de figuras montadas: el Bloque 6 lo recorre para armar el informe
   con las figuras EN EL ESTADO EN QUE EL USUARIO LAS DEJÓ. */
Fig.registry = {};

/* Contenedor auxiliar de medición: fuera de la pantalla pero CON maquetación
   (visibility:hidden, no display:none), para que getBBox funcione aunque el
   paso del asistente que contiene la figura esté oculto. */
let measureHost = null;
function measured(svg, fn) {
  if (!measureHost) {
    measureHost = document.createElement('div');
    measureHost.setAttribute('style',
      'position:fixed;left:-100000px;top:0;width:6000px;height:6000px;visibility:hidden;pointer-events:none');
    document.body.appendChild(measureHost);
  }
  measureHost.appendChild(svg);
  try { fn(svg); } finally { measureHost.removeChild(svg); }
}

/* Red de seguridad: si al agrandar la letra algún texto se sale del lienzo,
   se amplía el viewBox en lugar de recortarlo. */
function fitViewBox(svg) {
  let b;
  try { b = svg.getBBox(); } catch (e) { return; }
  if (!b || (!b.width && !b.height)) return;
  const w = +svg.dataset.w, h = +svg.dataset.h, pad = 5;
  const x0 = Math.min(0, b.x - pad), y0 = Math.min(0, b.y - pad);
  const x1 = Math.max(w, b.x + b.width + pad), y1 = Math.max(h, b.y + b.height + pad);
  if (x0 === 0 && y0 === 0 && x1 === w && y1 === h) return;
  const nw = x1 - x0, nh = y1 - y0;
  svg.setAttribute('viewBox', `${x0.toFixed(1)} ${y0.toFixed(1)} ${nw.toFixed(1)} ${nh.toFixed(1)}`);
  svg.setAttribute('width', nw.toFixed(1));
  svg.setAttribute('height', nh.toFixed(1));
  svg.dataset.w = nw; svg.dataset.h = nh;
  const bg = svg.firstElementChild;               // el rectángulo de fondo
  if (bg && bg.tagName === 'rect') {
    bg.setAttribute('x', x0.toFixed(1)); bg.setAttribute('y', y0.toFixed(1));
    bg.setAttribute('width', nw.toFixed(1)); bg.setAttribute('height', nh.toFixed(1));
  }
}

Fig.mount = (host, spec) => {
  if (typeof host === 'string') host = el(host);
  const hostId = host.id || ('fig_' + Math.random().toString(36).slice(2, 8));
  host.innerHTML = '';
  const cfg = Object.assign({}, spec.defaults || {});
  /* Los textos por defecto vienen en espanol; se traducen UNA vez, al montar,
     para que el lienzo, los controles y el informe usen el mismo texto y para
     no pisar lo que el usuario escriba despues. */
  ['title', 'subtitle', 'xlab', 'ylab', 'legendTitle', 'caption'].forEach(k => {
    if (typeof cfg[k] === 'string' && cfg[k]) cfg[k] = tt(cfg[k]);
  });

  const head = mk('div', { class: 'fig-head' });
  const h4 = mk('h4', null, tt(spec.title || 'Figura'));
  h4.dataset.es = spec.title || 'Figura';   // clave para retraducir al cambiar de idioma
  head.appendChild(h4);
  host.appendChild(head);

  const canvas = mk('div', { class: 'fig-canvas' });
  host.appendChild(canvas);

  let current = null;
  function redraw() {
    canvas.innerHTML = '';
    Fig.setFontScale(cfg);
    try { current = spec.render(cfg); } finally { Fig._fs = { title: 1, axis: 1, label: 1 }; }
    measured(current, fitViewBox);
    canvas.appendChild(current);
  }

  /* --- controles editables --- */
  /* Controles tipográficos comunes a TODAS las figuras: se añaden aquí, no en
     cada figura, para que ninguna se quede sin ellos. */
  const FONT_CONTROLS = [
    { key: 'fontScale', label: 'Letra: todo', type: 'range', min: 0.6, max: 2.6, step: 0.05 },
    { key: 'fsTitle', label: 'Letra: títulos', type: 'range', min: 0.6, max: 3, step: 0.05 },
    { key: 'fsAxis', label: 'Letra: ejes y marcas', type: 'range', min: 0.6, max: 3, step: 0.05 },
    { key: 'fsLabel', label: 'Letra: etiquetas y leyenda', type: 'range', min: 0.6, max: 3, step: 0.05 },
  ];
  FONT_CONTROLS.forEach(c => { if (cfg[c.key] == null) cfg[c.key] = 1; });

  if (spec.controls && spec.controls.length) {
    const det = mk('details', { class: 'fig-editor' });
    det.appendChild(mk('summary', null, tt('⚙ Editar figura (colores, títulos, tamaño de letra)')));
    const grid = mk('div', { class: 'fig-opts' });
    spec.controls.concat(FONT_CONTROLS).forEach(c => {
      const lab = mk('label', { class: 'inline-label' });
      lab.appendChild(document.createTextNode(tt(c.label) + ' '));
      let input;
      if (c.type === 'select') {
        input = mk('select');
        (c.options || []).forEach(o => {
          const [val, txt] = Array.isArray(o) ? o : [o, o];
          const op = mk('option', { value: val }, tt(txt));
          if (String(cfg[c.key]) === String(val)) op.selected = true;
          input.appendChild(op);
        });
        input.addEventListener('change', () => { cfg[c.key] = input.value; redraw(); });
      } else if (c.type === 'checkbox') {
        input = mk('input', { type: 'checkbox' });
        input.checked = !!cfg[c.key];
        input.addEventListener('change', () => { cfg[c.key] = input.checked; redraw(); });
        lab.insertBefore(input, lab.firstChild);
        grid.appendChild(lab);
        return;
      } else if (c.type === 'color') {
        input = mk('input', { type: 'color', value: cfg[c.key] || '#5b3fd6' });
        input.addEventListener('input', () => { cfg[c.key] = input.value; redraw(); });
      } else if (c.type === 'range') {
        input = mk('input', { type: 'range', min: c.min, max: c.max, step: c.step || 1, value: cfg[c.key] });
        /* lectura numérica al lado: sin ella no se sabe en qué aumento se está */
        const out = mk('span', { class: 'range-val' }, String(cfg[c.key]));
        input.addEventListener('input', () => {
          cfg[c.key] = +input.value;
          out.textContent = String(cfg[c.key]);
          redraw();
        });
        lab.appendChild(input);
        lab.appendChild(out);
        grid.appendChild(lab);
        return;
      } else if (c.type === 'number') {
        input = mk('input', { type: 'number', min: c.min, max: c.max, step: c.step || 1, value: cfg[c.key], style: 'width:82px' });
        input.addEventListener('change', () => { cfg[c.key] = +input.value; redraw(); });
      } else {
        input = mk('input', { type: 'text', value: cfg[c.key] != null ? cfg[c.key] : '', style: 'width:170px' });
        input.addEventListener('change', () => { cfg[c.key] = input.value; redraw(); });
      }
      lab.appendChild(input);
      grid.appendChild(lab);
    });
    det.appendChild(grid);
    host.appendChild(det);
  }

  /* --- exportacion --- */
  const tools = mk('div', { class: 'fig-tools' });
  const fmt = mk('select');
  [['png', 'PNG (mapa de bits)'], ['svg', 'SVG (vectorial, editable)'],
   ['jpg', 'JPG'], ['webp', 'WEBP']].forEach(([v, t]) => fmt.appendChild(mk('option', { value: v }, tt(t))));
  const res = mk('select');
  [['2', 'Pantalla · 2× (~150 ppp)'], ['4', 'Alta · 4× (~300 ppp)'],
   ['6', 'Muy alta · 6× (~450 ppp)'], ['8', 'Publicación · 8× (~600 ppp)'],
   ['12', 'Máxima · 12× (~900 ppp)']].forEach(([v, t]) => res.appendChild(mk('option', { value: v }, tt(t))));
  res.value = '4';
  const bgSel = mk('select');
  [['#ffffff', 'Fondo blanco'], ['transparent', 'Fondo transparente (PNG)']]
    .forEach(([v, t]) => bgSel.appendChild(mk('option', { value: v }, tt(t))));
  const btn = mk('button', { class: 'btn btn-secondary btn-sm' }, tt('⬇ Descargar figura'));
  const info = mk('span', { class: 'hint', style: 'margin:0' });

  function updateInfo() {
    if (!current) return;
    const w = +current.dataset.w, h = +current.dataset.h, k = +res.value;
    info.textContent = fmt.value === 'svg'
      ? 'Vectorial: se puede escalar sin perder nitidez y editar en Inkscape o Illustrator.'
      : `${Math.round(w * k)} × ${Math.round(h * k)} px`;
  }
  fmt.addEventListener('change', updateInfo);
  res.addEventListener('change', updateInfo);
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    try {
      await Fig.exportFigure(current, {
        format: fmt.value, scale: +res.value,
        name: (spec.fileName || slug(spec.title || 'figura')),
        background: bgSel.value === 'transparent' ? null : bgSel.value,
      });
    } catch (e) { alert(tt('No se pudo exportar: ') + e.message); }
    btn.disabled = false;
  });

  tools.appendChild(mk('span', { class: 'inline-label' }, tt('Formato')));
  tools.appendChild(fmt);
  tools.appendChild(mk('span', { class: 'inline-label' }, tt('Resolución')));
  tools.appendChild(res);
  tools.appendChild(bgSel);
  tools.appendChild(btn);
  tools.appendChild(info);
  host.appendChild(tools);

  redraw();
  updateInfo();
  const api = {
    redraw, cfg, hostId,
    title: tt(spec.title || hostId),
    fileName: spec.fileName || slug(spec.title || hostId),
    get svg() { return current; },
  };
  Fig.registry[hostId] = api;
  return api;
};
/* Figuras vigentes, en el orden en que aparecen en la página.
   No se puede usar offsetParent: solo un paso del asistente está visible a la
   vez, y el informe necesita las figuras de TODOS los bloques. Se comprueba en
   cambio que ningún contenedor de resultados esté oculto (los bloques ocultan
   sus resultados cuando el análisis anterior queda invalidado). */
Fig.mounted = () => Object.values(Fig.registry).filter(a => {
  const h = document.getElementById(a.hostId);
  if (!h || !a.svg || !document.body.contains(h)) return false;
  for (let n = h; n && n !== document.body; n = n.parentElement) {
    if (n.classList.contains('step-panel')) continue;
    if (n.style && n.style.display === 'none') return false;
  }
  return true;
});

/* El encabezado de cada figura no es editable, asi que puede retraducirse en
   caliente. Los textos del lienzo no: el usuario pudo haberlos cambiado. */
if (typeof I18N !== 'undefined') I18N.onChange.push(() => {
  document.querySelectorAll('.fig-head h4[data-es]').forEach(h => {
    h.textContent = tt(h.dataset.es);
  });
});

window.Fig = Fig;

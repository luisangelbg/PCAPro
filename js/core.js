/* PCAPro — análisis de componentes principales en el navegador.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it
   under the terms of the GNU General Public License as published by the Free
   Software Foundation, either version 3 of the License, or (at your option)
   any later version. This program is distributed WITHOUT ANY WARRANTY; see
   the GNU General Public License for more details. You should have received
   a copy of the License along with this program; if not, see
   <https://www.gnu.org/licenses/>. */

/* PCAPro — estado global y utilidades comunes.
   Sin modulos ES: todo cuelga de window para que funcione tambien con file://  */

const state = {
  /* --- Bloque 1: datos --- */
  fileName: null,
  sheetName: null,
  sheets: [],            // hojas del libro xlsx
  rawHeader: [],         // nombres originales de columna
  rawRows: [],           // filas crudas: array de arrays (strings/numeros)
  columns: [],           // [{name, role, detected, n, missing, unique, stats..., levels[]}]
  //   role: 'active' | 'supp-num' | 'supp-cat' | 'id' | 'excluded'

  /* --- preparacion --- */
  prep: {
    missing: 'listwise',   // listwise | mean | median
    transform: 'none',     // none | log | sqrt | boxcox-ish
    scaling: 'z',          // none | center | z | pareto | vast | range | robust
  },

  /* --- matriz preparada --- */
  ready: false,
  X: null,               // matriz numerica final (n x p) ya transformada/escalada
  Xraw: null,            // matriz numerica sin escalar (mismas filas/cols)
  activeVars: [],        // nombres de columnas activas
  rowIds: [],            // etiquetas de individuos
  suppNum: [],           // {name, values[]}
  suppCat: [],           // {name, values[], levels[]}
  keptRows: [],          // indices de filas conservadas
  diagnostics: null,     // resultado del diagnostico

  /* --- bloques 2, 3 y 4 --- */
  pca: null,
  rot: null,
  fac: null,
  interp: null,
  hcpc: null,
};
window.state = state;

/* Traduccion tolerante: si i18n.js no esta cargado (pruebas, uso aislado)
   devuelve el texto original en espanol. */
function tt(s) { return (typeof t === 'function') ? t(s) : s; }
function TT(es, en) { return (typeof T === 'function') ? T(es, en) : es; }

/* Etiqueta de un componente principal: CP1 en espanol, PC1 en ingles.
   n es 1-based. cpr() es la version rotada (CPR1 / RPC1). */
function cp(n) { return TT('CP', 'PC') + n; }
function cpr(n) { return TT('CPR', 'RPC') + n; }

/* ---------------- DOM ---------------- */
function el(id) { return document.getElementById(id); }
function els(sel, root) { return [...(root || document).querySelectorAll(sel)]; }
function mk(tag, attrs, html) {
  const n = document.createElement(tag);
  if (attrs) for (const k in attrs) {
    if (k === 'class') n.className = attrs[k];
    else if (k === 'style') n.setAttribute('style', attrs[k]);
    else if (k.startsWith('on') && typeof attrs[k] === 'function') n.addEventListener(k.slice(2), attrs[k]);
    else if (attrs[k] != null) n.setAttribute(k, attrs[k]);
  }
  if (html != null) n.innerHTML = html;
  return n;
}

function showMessage(container, type, text) {
  if (typeof container === 'string') container = el(container);
  if (!container) return null;
  const div = mk('div', { class: 'msg msg-' + type }, text);
  container.appendChild(div);
  return div;
}
function clearMessages(container) {
  if (typeof container === 'string') container = el(container);
  if (container) container.innerHTML = '';
}

function statTiles(container, tiles) {
  if (typeof container === 'string') container = el(container);
  container.innerHTML = '';
  tiles.forEach(t => {
    const [label, value, sub, level] = Array.isArray(t) ? t : [t.label, t.value, t.sub, t.level];
    const d = mk('div', { class: 'stat-tile' + (level ? ' ' + level : '') });
    d.innerHTML = `<div class="stat-label">${tt(label)}</div><div class="stat-value">${value}</div>` +
      (sub ? `<div class="stat-sub">${tt(sub)}</div>` : '');
    container.appendChild(d);
  });
}

/* Construye una <table>. columns: [{key,label,get?,fmt?,num?}] */
function buildTable(container, columns, rows, opts) {
  opts = opts || {};
  if (typeof container === 'string') container = el(container);
  container.innerHTML = '';
  const table = mk('table');
  const thead = mk('thead'), trh = mk('tr');
  columns.forEach(c => {
    const th = mk('th', { class: c.num ? 'num' : null });
    th.textContent = tt(c.label != null ? c.label : c.key);
    trh.appendChild(th);
  });
  thead.appendChild(trh); table.appendChild(thead);
  const tbody = mk('tbody');
  const shown = opts.limit ? rows.slice(0, opts.limit) : rows;
  shown.forEach(r => {
    const tr = mk('tr');
    columns.forEach(c => {
      const td = mk('td', { class: c.num ? 'num' : null });
      let v = c.get ? c.get(r) : r[c.key];
      if (c.html) { td.innerHTML = v == null ? '—' : v; tr.appendChild(td); return; }
      if (c.fmt && v != null && v !== '') v = c.fmt(v);
      td.textContent = (v === null || v === undefined || v === '' ||
        (typeof v === 'number' && !isFinite(v))) ? '—' : v;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  container.appendChild(table);
  if (opts.limit && rows.length > opts.limit) {
    const p = mk('p', { class: 'hint', style: 'padding:6px 12px;margin:0' });
    p.textContent = TT(`Mostrando ${opts.limit} de ${rows.length} filas.`,
      `Showing ${opts.limit} of ${rows.length} rows.`);
    container.appendChild(p);
  }
  return table;
}

/* ---------------- numeros ---------------- */
function fmtNum(v, d) {
  if (v === null || v === undefined || v === '' || (typeof v === 'number' && !isFinite(v))) return '—';
  const n = Number(v);
  if (!isFinite(n)) return String(v);
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (abs < 1e-4 || abs >= 1e7) return n.toExponential(d != null ? d : 2);
  return n.toLocaleString('es-MX', { maximumFractionDigits: d != null ? d : 3 });
}
function fmtP(p) {
  if (p == null || !isFinite(p)) return '—';
  if (p < 0.0001) return '< 0.0001';
  return Number(p).toLocaleString('es-MX', { maximumFractionDigits: 4 });
}
/* etiqueta completa de un valor p: evita el feo "p = < 0.0001" */
function fmtPLabel(p) {
  if (p == null || !isFinite(p)) return 'p = —';
  return p < 0.0001 ? 'p < 0.0001' : 'p = ' + Number(p).toLocaleString('es-MX', { maximumFractionDigits: 4 });
}
function fmtPct(x, d) {
  if (x == null || !isFinite(x)) return '—';
  return (x * 100).toLocaleString('es-MX', { maximumFractionDigits: d == null ? 1 : d }) + '%';
}

/* ---------------- CSV / descargas ---------------- */
function csvEscape(v) {
  const s = String(v ?? '');
  return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function matrixToCSV(header, rows) {
  const head = header.map(csvEscape).join(',');
  const body = rows.map(r => r.map(csvEscape).join(','));
  return '﻿' + [head, ...body].join('\r\n');
}
function download(content, filename, mime) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = mk('a', { href: url, download: filename });
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function slug(s) {
  return String(s || 'pcapro').replace(/\.[^.]+$/, '')
    .normalize('NFD').replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
    .replace(/[^\w\-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'pcapro';
}

/* ---------------- navegacion por pasos ---------------- */
function goStep(n) {
  els('.step-panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + n));
  els('.step-btn').forEach(b => b.classList.toggle('active', b.dataset.step === String(n)));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function enableStep(n, on) {
  const b = document.querySelector('.step-btn[data-step="' + n + '"]');
  if (b) b.disabled = (on === false);
}

/* Copia al portapapeles y confirma en el propio boton. Guarda el rotulo previo
   en lugar de reescribirlo: con una cadena fija, el boton se quedaba en el
   idioma en que estaba escrita. */
function copyToClipboard(btnId, text) {
  navigator.clipboard.writeText(text).then(() => {
    const b = el(btnId);
    if (!b) return;
    const antes = b.textContent;
    b.textContent = tt('✔ Copiado');
    setTimeout(() => { b.textContent = antes; }, 1800);
  }, () => alert(tt('No se pudo copiar automáticamente. Selecciona el texto y cópialo a mano.')));
}

Object.assign(window, {
  el, els, mk, showMessage, clearMessages, statTiles, buildTable,
  fmtNum, fmtP, fmtPLabel, fmtPct, csvEscape, matrixToCSV, download, slug, goStep, enableStep,
  tt, TT, cp, cpr, copyToClipboard,
});

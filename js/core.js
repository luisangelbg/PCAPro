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
  /* un error durante un cálculo cierra la ventana de espera sin palomita */
  if (type === 'error' && pcaWork.current) pcaWork.current._failed = true;
  if (!container) return null;
  const div = mk('div', { class: 'msg msg-' + type }, text);
  /* errores y avisos se anuncian al lector de pantalla */
  if (window.LABG) LABG.messageRole(div, type);
  container.appendChild(div);
  return div;
}
function clearMessages(container) {
  if (typeof container === 'string') container = el(container);
  if (container) container.innerHTML = '';
}

/* ---------------- Ventana de espera (LABG.work) ----------------
   pcaWork abre la ventana animada común (con demora de 300 ms: un cálculo
   rápido termina antes de que se vea). pcaAfterPaint deja que el navegador
   pinte, ejecuta el cálculo tal cual y cierra la ventana con palomita, o sin
   ella si el cálculo lanzó una excepción o mostró un error. Sin labg-core
   (pruebas) todo sigue funcionando: la ventana es null y solo se cede el hilo. */
function pcaWork(es, en) {
  if (!window.LABG || !LABG.work) return null;
  const w = LABG.work({ title: LABG.t(es, en || es), delay: 300 });
  pcaWork.current = w;
  return w;
}
pcaWork.current = null;
function pcaAfterPaint(f, w) {
  const done = () => {
    if (pcaWork.current === w) pcaWork.current = null;
    if (w && !w.ended) { if (w._failed) w.close(); else w.done(); }
  };
  return (window.LABG ? LABG.nextPaint() : new Promise(r => setTimeout(r, 30)))
    .then(f).then(done, e => { console.error(e); if (w) w._failed = true; done(); });
}

/* El número de un indicador sube hasta su valor en poco menos de medio
   segundo. Solo con cifras simples: si el indicador trae texto («4 de 12»,
   «—», una etiqueta), se queda como está. El último fotograma escribe el
   texto original, así que lo que queda en pantalla nunca difiere de lo
   calculado. */
function pcaCuenta(nodo, retraso) {
  if (!nodo) return;
  const texto = nodo.textContent.trim();
  const m = texto.match(/^(-?[\d.,]+)(\s*%?)$/);
  if (!m) return;
  const crudo = m[1].replace(/,/g, ''), suf = m[2] || '';
  const punto = crudo.lastIndexOf('.');
  const dec = punto >= 0 ? crudo.length - punto - 1 : 0;
  const fin = Number(crudo);
  if (!isFinite(fin) || dec > 6) return;
  /* en una pestaña de fondo el navegador congela los fotogramas: el número se
     quedaría en cero hasta que alguien la mirara, así que ahí no se anima */
  if (document.hidden) return;
  const fmt = { minimumFractionDigits: dec, maximumFractionDigits: dec };
  const dur = 420, t0 = performance.now() + (retraso || 0);
  nodo.textContent = (0).toLocaleString('es-MX', fmt) + suf;
  /* red de seguridad: si la cuenta se interrumpe a medias —la pestaña se va al
     fondo, el equipo se atasca— el valor verdadero se escribe de todos modos */
  setTimeout(() => { if (nodo.textContent !== texto) nodo.textContent = texto; }, (retraso || 0) + dur + 300);
  const paso = t => {
    if (t < t0) { requestAnimationFrame(paso); return; }
    const k = Math.min(1, (t - t0) / dur);
    if (k >= 1) { nodo.textContent = texto; return; }
    nodo.textContent = (fin * (1 - Math.pow(1 - k, 3))).toLocaleString('es-MX', fmt) + suf;
    requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
}

function statTiles(container, tiles) {
  if (typeof container === 'string') container = el(container);
  container.innerHTML = '';
  /* lfx-motion la pone labg-fx: sin ella (botón «Animaciones» apagado o
     «reducir movimiento» del sistema) los indicadores salen de golpe */
  const anima = document.documentElement.classList.contains('lfx-motion');
  tiles.forEach((t, i) => {
    const [label, value, sub, level] = Array.isArray(t) ? t : [t.label, t.value, t.sub, t.level];
    const d = mk('div', { class: 'stat-tile' + (level ? ' ' + level : '') + (anima ? ' pca-entra' : '') });
    if (anima) d.style.setProperty('--pca-i', i);
    d.innerHTML = `<div class="stat-label">${tt(label)}</div><div class="stat-value">${value}</div>` +
      (sub ? `<div class="stat-sub">${tt(sub)}</div>` : '');
    container.appendChild(d);
    if (anima) pcaCuenta(d.querySelector('.stat-value'), i * 45);
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

/* ---------------- navegacion por pasos ----------------
   Orden de lectura de los bloques: el 5b (data-step 7) va entre el 5 y el 6. */
const STEP_ORDER = ['0', '1', '2', '3', '4', '5', '7', '6'];
const stepBtn = n => document.querySelector('.step-btn[data-step="' + n + '"]');
const stepOn = n => { const b = stepBtn(n); return !!b && !b.disabled; };

/* La corredera: un rectángulo que se queda detrás del bloque activo y viaja
   hasta el siguiente al cambiar de bloque, en lugar de aparecer y desaparecer.
   Va en los dos sitios donde se listan los bloques: la barra horizontal propia
   de la app y la lista lateral que dibuja el navegador compartido. Se mide con
   offsetLeft y offsetTop, no con la posición en pantalla, para que siga en su
   sitio cuando la barra está desplazada. Si no encuentra el bloque activo —o
   todavía no se ve— no hace nada y el bloque activo conserva su fondo de
   siempre: la clase pca-corre, que es la que apaga ese fondo, solo se pone
   cuando la corredera ya pudo medirse. */
function pcaCorredera(caja, selActivo) {
  if (!caja) return;
  const activo = caja.querySelector(selActivo);
  if (!activo || !activo.offsetHeight) return;
  let pill = caja.querySelector(':scope > .pca-pill');
  if (!pill) {
    pill = mk('span', { class: 'pca-pill', 'aria-hidden': 'true' });
    caja.insertBefore(pill, caja.firstChild);
    caja.classList.add('pca-corre');
  }
  pill.style.width = activo.offsetWidth + 'px';
  pill.style.height = activo.offsetHeight + 'px';
  pill.style.transform = `translate(${activo.offsetLeft}px, ${activo.offsetTop}px)`;
}

function pcaPill() {
  pcaCorredera(el('stepper'), '.step-btn.active');
  pcaCorredera(document.querySelector('.lnav-list'), '.lnav-item.on');
}

/* Al cambiar de bloque, la app y el navegador compartido se reparten el
   trabajo y no siempre en el mismo orden: se vuelve a medir en cuanto el
   navegador suelta el hilo y otra vez un momento después, ya con todo pintado. */
function pcaPillPronto() {
  setTimeout(pcaPill, 0);
  setTimeout(pcaPill, 160);
}

/* La lista lateral la rehace el navegador compartido cuando cambia de bloque,
   de idioma o de ancho, y no avisa: se vigila el DOM y se vuelve a medir. */
function pcaVigilaBloques() {
  pcaPill();
  window.addEventListener('resize', pcaPill);
  const nav = el('stepper');
  if (nav && window.ResizeObserver) new ResizeObserver(pcaPill).observe(nav);
  if (!window.MutationObserver) return;
  const esperar = () => {
    const lista = document.querySelector('.lnav-list');
    if (!lista) return false;
    new MutationObserver(pcaPillPronto)
      .observe(lista, { attributes: true, attributeFilter: ['class'], childList: true, subtree: true });
    if (window.ResizeObserver) new ResizeObserver(pcaPill).observe(lista);
    pcaPill();
    return true;
  };
  if (esperar()) return;
  /* el navegador se carga con defer: se espera a que aparezca su lista */
  const ob = new MutationObserver(() => { if (esperar()) ob.disconnect(); });
  ob.observe(document.body, { childList: true, subtree: true });
  setTimeout(() => ob.disconnect(), 10000);
}

function goStep(n) {
  n = String(n);
  els('.step-panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + n));
  els('.step-btn').forEach(b => b.classList.toggle('active', b.dataset.step === n));
  pcaPill(); pcaPillPronto();
  if (window.LABG) {
    LABG.setCurrentStep(n);
    const b = stepBtn(n);
    if (b) LABG.announce(TT('Bloque: ', 'Block: ') + b.textContent.replace(/\s+/g, ' ').trim());
  }
  refreshStepFooters();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function enableStep(n, on) {
  const b = stepBtn(n);
  /* un bloque que se acaba de abrir da dos latidos: es la respuesta a
     «¿ya puedo seguir?», y se apaga solo. El mismo aviso va en la lista
     lateral, donde los bloques van en el orden de la barra. */
  if (b && b.disabled && on !== false) {
    const i = els('.step-btn').indexOf(b);
    const lat = [b, i >= 0 ? document.querySelector(`.lnav-item[data-n="${i}"]`) : null];
    lat.forEach(x => { if (x) x.classList.add('pca-nuevo'); });
    setTimeout(() => lat.forEach(x => { if (x) x.classList.remove('pca-nuevo'); }), 2400);
  }
  if (b) b.disabled = (on === false);
  refreshStepMarks();
  refreshStepFooters();
}

/* Un bloque queda «terminado» cuando ya se puede pasar a uno posterior. */
function refreshStepMarks() {
  if (!window.LABG) return;
  STEP_ORDER.forEach((s, i) => {
    if (s === '0') return;
    const later = STEP_ORDER.slice(i + 1).some(stepOn);
    LABG.markStep(s, stepOn(s) && later ? 'done' : null);
  });
}

/* Pie de cada bloque: Anterior / Siguiente, con el nombre del bloque. */
function stepLabel(n) {
  const b = stepBtn(n); if (!b) return '';
  const num = b.querySelector('.step-num').textContent.trim();
  const name = (b.querySelector('[data-i18n]') || b).textContent.replace(/\s+/g, ' ').trim();
  return (num === '◆' ? '' : num + ' · ') + name;
}
function refreshStepFooters() {
  els('.step-panel').forEach(p => {
    const n = p.id.replace('panel-', '');
    const i = STEP_ORDER.indexOf(n);
    if (i < 0) return;
    let f = p.querySelector(':scope > .step-footer');
    if (!f) {
      f = mk('nav', { class: 'step-footer no-print' });
      f.innerHTML = '<button type="button" class="btn btn-secondary prev"></button><button type="button" class="btn btn-primary next"></button>';
      f.addEventListener('click', e => { const b = e.target.closest('button[data-go]'); if (b && !b.disabled) goStep(b.dataset.go); });
      p.appendChild(f);
    }
    f.setAttribute('aria-label', TT('Bloques', 'Blocks'));
    const prev = STEP_ORDER.slice(0, i).reverse().find(stepOn);
    const next = STEP_ORDER.slice(i + 1).find(s => stepBtn(s));
    const bp = f.querySelector('.prev'), bn = f.querySelector('.next');
    bp.hidden = !prev;
    if (prev) { bp.dataset.go = prev; bp.innerHTML = `← <span><small>${tt('Anterior')}</small>${stepLabel(prev)}</span>`; }
    bn.hidden = !next;
    if (next) {
      bn.dataset.go = next; bn.disabled = !stepOn(next);
      bn.innerHTML = `<span><small>${tt('Siguiente')}</small>${stepLabel(next)}</span> →`;
    }
  });
}

/* Barra común: tema, atajos, aviso al salir y teclado. Solo en la app
   (las pruebas cargan core.js sin labg-core.js). */
document.addEventListener('DOMContentLoaded', () => {
  pcaVigilaBloques();
  if (!window.LABG) return;
  if (LABG.work) {
    LABG.work.scene = 'fit';
    LABG.work.tips = [
      ['El análisis paralelo de Horn compara cada valor propio con el percentil 95 de matrices aleatorias simuladas.',
        'Horn\'s parallel analysis compares each eigenvalue with the 95th percentile of simulated random matrices.'],
      ['El número de componentes que PCAPro recomienda es el consenso de ocho criterios, no de uno solo.',
        'The number of components PCAPro recommends is the consensus of eight criteria, not of a single one.'],
      ['Con n < 100 conviene interpretar solo las cargas con |carga| ≥ 0.55.',
        'With n < 100 it is wise to interpret only loadings with |loading| ≥ 0.55.'],
    ];
  }
  LABG.theme.init('pcapro.theme');
  const tb = el('themeBtn');
  if (tb) tb.addEventListener('click', () => LABG.theme.toggle());
  const hb = el('helpBtn');
  if (hb) hb.addEventListener('click', () => LABG.showShortcuts());
  LABG.shortcuts([]);
  LABG.bindStepKeys(goStep);
  LABG.guardUnload(() => !!state.fileName);
  LABG.setCurrentStep((document.querySelector('.step-btn.active') || {}).dataset?.step || '0');
  if (window.I18N) I18N.onChange.push(() => { LABG.theme.paint(); refreshStepFooters(); });
  refreshStepMarks();
  refreshStepFooters();
});

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
  tt, TT, cp, cpr, copyToClipboard, pcaWork, pcaAfterPaint,
});

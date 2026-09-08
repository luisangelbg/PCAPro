/* PCAPro — análisis de componentes principales en el navegador.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán

   This program is free software: you can redistribute it and/or modify it
   under the terms of the GNU General Public License as published by the Free
   Software Foundation, either version 3 of the License, or (at your option)
   any later version. This program is distributed WITHOUT ANY WARRANTY; see
   the GNU General Public License for more details. You should have received
   a copy of the License along with this program; if not, see
   <https://www.gnu.org/licenses/>. */

/* PCAPro — Bloque 1: carga, tipificación de variables, preparación y diagnóstico. */

(function () {

const MISSING_CODES = new Set(['', 'na', 'n/a', 'nan', 'null', 'nulo', '.', '-', '--', '?',
  'nd', 's/d', 'sd', 'missing', 'faltante', '#n/a', '#¡div/0!', '#value!', '#valor!']);

const ROLE_LABEL = {
  active: 'Activa (entra al ACP)',
  'supp-num': 'Cuantitativa suplementaria',
  'supp-cat': 'Cualitativa / grupo',
  id: 'Identificador de fila',
  excluded: 'Excluir',
};

/* ============================================================
   Lectura de archivos
   ============================================================ */
function detectDelimiter(text) {
  const line = text.split(/\r?\n/).find(l => l.trim().length) || '';
  const cands = [',', ';', '\t', '|'];
  let best = ',', bestN = -1;
  cands.forEach(d => {
    const n = line.split(d).length - 1;
    if (n > bestN) { bestN = n; best = d; }
  });
  return best;
}
function parseCSV(text, delim) {
  text = text.replace(/^﻿/, '');
  const d = delim || detectDelimiter(text);
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === d) { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c === '\r') { /* ignora */ }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(v => String(v).trim() !== ''));
}

/* Convierte un texto a numero respetando el separador decimal elegido */
function toNumber(v, decimal) {
  if (v == null) return null;
  if (typeof v === 'number') return isFinite(v) ? v : null;
  let s = String(v).trim();
  if (!s || MISSING_CODES.has(s.toLowerCase())) return null;
  s = s.replace(/\s| /g, '').replace(/%$/, '');
  if (decimal === 'comma') s = s.replace(/\./g, '').replace(',', '.');
  else if (decimal === 'auto') {
    if (/,\d{1,3}$/.test(s) && !/\.\d/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else s = s.replace(/,/g, '');
  if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(s)) return null;
  const n = parseFloat(s);
  return isFinite(n) ? n : null;
}
function isMissing(v) {
  if (v == null) return true;
  const s = String(v).trim().toLowerCase();
  return MISSING_CODES.has(s);
}

/* ============================================================
   Tipificacion de columnas
   ============================================================ */
function profileColumns(header, rows, decimal) {
  return header.map((name, j) => {
    const raw = rows.map(r => r[j]);
    const present = raw.filter(v => !isMissing(v));
    const nums = present.map(v => toNumber(v, decimal));
    const nOk = nums.filter(v => v !== null).length;
    const numericRatio = present.length ? nOk / present.length : 0;
    const uniq = new Set(present.map(v => String(v).trim()));
    const col = {
      name: name || ('V' + (j + 1)),
      index: j,
      n: present.length,
      missing: rows.length - present.length,
      missingPct: rows.length ? (rows.length - present.length) / rows.length : 0,
      unique: uniq.size,
      numericRatio,
      values: raw,
    };
    if (numericRatio >= 0.85 && nOk >= 3) {
      const v = nums.filter(x => x !== null);
      const allInt = v.every(x => Number.isInteger(x));
      col.kind = 'numeric';
      col.num = v;
      col.mean = S.mean(v); col.sd = S.sd(v);
      col.min = S.min(v); col.max = S.max(v);
      col.median = S.median(v);
      col.q1 = S.quantile(v, 0.25); col.q3 = S.quantile(v, 0.75);
      col.cv = col.mean ? Math.abs(col.sd / col.mean) * 100 : NaN;
      col.skew = S.skewness(v); col.kurt = S.kurtosis(v);
      col.zeros = v.filter(x => x === 0).length;
      col.negatives = v.filter(x => x < 0).length;
      col.allInt = allInt;
      col.outliers = col.sd > 0 ? v.filter(x => Math.abs((x - col.mean) / col.sd) > 3).length : 0;
      col.constant = col.sd === 0 || !isFinite(col.sd);
      // sugerencia de rol
      if (col.constant) col.role = 'excluded';
      else if (allInt && uniq.size <= Math.min(8, Math.max(2, Math.round(rows.length * 0.05))) && uniq.size <= 8) {
        col.role = 'supp-cat'; col.hintCat = true;
      } else col.role = 'active';
      col.detected = col.constant ? tt('Constante') : (allInt ? tt('Numérica (enteros)') : tt('Numérica continua'));
    } else {
      col.kind = 'categorical';
      col.levels = [...uniq];
      col.levelCounts = {};
      present.forEach(v => { const k = String(v).trim(); col.levelCounts[k] = (col.levelCounts[k] || 0) + 1; });
      if (uniq.size === present.length && present.length > 3) { col.role = 'id'; col.detected = tt('Identificador (todos distintos)'); }
      else if (uniq.size > 30) { col.role = 'excluded'; col.detected = TT(`Texto (${uniq.size} categorías)`, `Text (${uniq.size} categories)`); }
      else { col.role = 'supp-cat'; col.detected = TT(`Categórica (${uniq.size} niveles)`, `Categorical (${uniq.size} levels)`); }
    }
    return col;
  });
}

/* ============================================================
   Interfaz: carga
   ============================================================ */
function afterLoad(header, rows, fileName, sheetName) {
  const decimal = el('decimalSel').value;
  state.fileName = fileName; state.sheetName = sheetName || null;
  state.rawHeader = header; state.rawRows = rows;
  state.columns = profileColumns(header, rows, decimal);
  state.ready = false;

  clearMessages('dataMessages');
  showMessage('dataMessages', 'success',
    TT(`<b>${fileName}</b>${sheetName ? ' · hoja <b>' + sheetName + '</b>' : ''} — ` +
    `${rows.length} filas × ${header.length} columnas leídas correctamente.`,
    `<b>${fileName}</b>${sheetName ? ' · sheet <b>' + sheetName + '</b>' : ''} — ` +
    `${rows.length} rows × ${header.length} columns read successfully.`));

  const nNum = state.columns.filter(c => c.role === 'active').length;
  if (nNum < 2) {
    showMessage('dataMessages', 'warning',
      tt('Se detectaron menos de 2 variables numéricas activas. Revisa la tabla de abajo y marca manualmente como <b>Activa</b> las columnas de medición, o revisa el separador decimal.'));
  }
  renderVarTable();
  el('varCard').style.display = '';
  el('prepCard').style.display = '';
  el('previewCard').style.display = '';
  renderPreview();
  el('resultsWrap').style.display = 'none';
  el('varCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function readFile(file) {
  const name = file.name.toLowerCase();
  const reader = new FileReader();
  clearMessages('dataMessages');
  showMessage('dataMessages', 'info', '<span class="loading"></span> ' + tt('Leyendo archivo…'));
  if (name.endsWith('.csv') || name.endsWith('.tsv') || name.endsWith('.txt')) {
    reader.onload = e => {
      try {
        const rows = parseCSV(e.target.result, el('delimSel').value || null);
        const hdr = rows.shift().map(h => String(h).trim());
        afterLoad(hdr, rows, file.name);
      } catch (err) {
        clearMessages('dataMessages');
        showMessage('dataMessages', 'error', tt('No se pudo leer el CSV: ') + err.message);
      }
    };
    reader.readAsText(file, 'UTF-8');
  } else {
    reader.onload = e => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array', cellDates: true });
        state.sheets = wb.SheetNames;
        state.workbook = wb;
        const pick = el('sheetSelect');
        pick.innerHTML = '';
        wb.SheetNames.forEach(s => pick.appendChild(mk('option', { value: s }, s)));
        el('sheetPicker').style.display = wb.SheetNames.length > 1 ? '' : 'none';
        loadSheet(wb.SheetNames[0], file.name);
      } catch (err) {
        clearMessages('dataMessages');
        showMessage('dataMessages', 'error', tt('No se pudo leer el archivo de Excel: ') + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  }
}
function loadSheet(sheetName, fileName) {
  const ws = state.workbook.Sheets[sheetName];
  const arr = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '', raw: true });
  const rows = arr.filter(r => r.some(v => String(v).trim() !== ''));
  if (!rows.length) { showMessage('dataMessages', 'error', tt('La hoja está vacía.')); return; }
  const hdr = rows.shift().map(h => String(h).trim());
  afterLoad(hdr, rows, fileName || state.fileName, sheetName);
}

/* ============================================================
   Interfaz: tabla de variables
   ============================================================ */
function sparkline(col) {
  const w = 96, h = 24;
  const svg = `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">`;
  let body = '';
  if (col.kind === 'numeric' && col.num.length > 1 && col.sd > 0) {
    const hist = S.histogram(col.num, 18);
    const mx = Math.max(...hist.counts);
    const bw = w / hist.k;
    hist.counts.forEach((c, i) => {
      const bh = mx ? (c / mx) * (h - 3) : 0;
      body += `<rect x="${(i * bw).toFixed(1)}" y="${(h - bh).toFixed(1)}" width="${(bw - 0.6).toFixed(1)}" height="${bh.toFixed(1)}" fill="#0d9488" opacity="0.75"/>`;
    });
  } else if (col.kind === 'categorical' && col.levelCounts) {
    const ent = Object.entries(col.levelCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const mx = Math.max(...ent.map(e => e[1]));
    const bw = w / Math.max(ent.length, 1);
    ent.forEach((e, i) => {
      const bh = (e[1] / mx) * (h - 3);
      body += `<rect x="${(i * bw).toFixed(1)}" y="${(h - bh).toFixed(1)}" width="${(bw - 1).toFixed(1)}" height="${bh.toFixed(1)}" fill="#e8890c" opacity="0.75"/>`;
    });
  }
  return svg + body + '</svg>';
}

function flagsFor(col) {
  const f = [];
  if (col.constant) f.push('<span class="flag bad">' + tt('varianza cero') + '</span>');
  if (col.missingPct > 0.2) f.push(`<span class="flag bad">${fmtPct(col.missingPct, 0)} ${tt('faltantes')}</span>`);
  else if (col.missingPct > 0.05) f.push(`<span class="flag">${fmtPct(col.missingPct, 0)} ${tt('faltantes')}</span>`);
  if (col.kind === 'numeric') {
    if (Math.abs(col.skew) > 2) f.push('<span class="flag bad">' + tt('muy asimétrica') + '</span>');
    else if (Math.abs(col.skew) > 1) f.push('<span class="flag">' + tt('asimétrica') + '</span>');
    if (col.outliers > 0) f.push(`<span class="flag">${col.outliers} ${tt('at.')} |z|&gt;3</span>`);
    if (col.hintCat) f.push('<span class="flag">' + tt('¿código de grupo?') + '</span>');
  }
  if (!f.length) f.push('<span class="flag ok">' + tt('sin alertas') + '</span>');
  return f.join(' ');
}

/* Casillas de selección rápida: atajo del desplegable de rol para las columnas
   numéricas. Desmarcar deja la variable como cuantitativa suplementaria. */
function renderQuickVars() {
  const host = el('quickVars');
  host.innerHTML = '';
  const nums = state.columns.filter(c => c.kind === 'numeric' && !c.constant);
  if (!nums.length) {
    host.innerHTML = '<span class="hint">No se detectaron columnas numéricas utilizables.</span>';
    return;
  }
  nums.forEach(col => {
    const lab = mk('label', { class: 'checkbox-label' });
    const cb = mk('input', { type: 'checkbox', 'data-col': col.name });
    cb.checked = col.role === 'active';
    cb.addEventListener('change', () => {
      col.role = cb.checked ? 'active' : 'supp-num';
      /* se reconstruye la tabla, pero NO estas casillas: si se regeneraran, el
         usuario perdería el foco y no podría marcar varias seguidas */
      renderVarTable(true);
      renderPreview();
    });
    lab.appendChild(cb);
    lab.appendChild(document.createTextNode(' ' + col.name));
    if (col.hintCat) lab.appendChild(mk('span', { class: 'flag', style: 'margin-left:4px' }, tt('¿grupo?')));
    host.appendChild(lab);
  });
}

function renderVarTable(skipQuick) {
  const host = el('varTable');
  host.innerHTML = '';
  if (!skipQuick) renderQuickVars();
  const table = mk('table', { class: 'var-table' });
  const thead = mk('thead');
  thead.innerHTML = `<tr>
    <th>${tt('Variable')}</th><th>${tt('Tipo detectado')}</th><th>${tt('Distribución')}</th>
    <th class="num">n</th><th class="num">${tt('Faltan')}</th><th class="num">${tt('Únicos')}</th>
    <th class="num">${tt('Media')}</th><th class="num">${tt('DE')}</th><th class="num">${tt('Mín')}</th><th class="num">${tt('Máx')}</th>
    <th class="num">${tt('Asim.')}</th><th class="num">${tt('Curt.')}</th><th class="num">CV%</th>
    <th>${tt('Alertas')}</th><th>${tt('Papel en el ACP')}</th></tr>`;
  table.appendChild(thead);
  const tb = mk('tbody');
  state.columns.forEach(col => {
    const tr = mk('tr');
    const pill = col.kind === 'numeric'
      ? `<span class="pill num">⌗ num</span>` : (col.role === 'id'
        ? `<span class="pill id">◇ id</span>` : `<span class="pill cat">⌸ cat</span>`);
    tr.innerHTML = `
      <td class="var-name">${col.name}</td>
      <td>${pill} <span class="hint" style="margin:0">${col.detected}</span></td>
      <td>${sparkline(col)}</td>
      <td class="num">${col.n}</td>
      <td class="num">${col.missing || '—'}</td>
      <td class="num">${col.unique}</td>
      <td class="num">${col.kind === 'numeric' ? fmtNum(col.mean) : '—'}</td>
      <td class="num">${col.kind === 'numeric' ? fmtNum(col.sd) : '—'}</td>
      <td class="num">${col.kind === 'numeric' ? fmtNum(col.min) : '—'}</td>
      <td class="num">${col.kind === 'numeric' ? fmtNum(col.max) : '—'}</td>
      <td class="num">${col.kind === 'numeric' ? fmtNum(col.skew, 2) : '—'}</td>
      <td class="num">${col.kind === 'numeric' ? fmtNum(col.kurt, 2) : '—'}</td>
      <td class="num">${col.kind === 'numeric' && isFinite(col.cv) ? fmtNum(col.cv, 1) : '—'}</td>
      <td>${flagsFor(col)}</td>`;
    const tdRole = mk('td');
    const sel = mk('select');
    Object.entries(ROLE_LABEL).forEach(([v, t]) => {
      if (col.kind === 'categorical' && (v === 'active' || v === 'supp-num')) return;
      const o = mk('option', { value: v }, tt(t));
      if (col.role === v) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener('change', () => {
      col.role = sel.value;
      /* mantiene sincronizada la casilla de selección rápida */
      const cb = document.querySelector(`#quickVars input[data-col="${CSS.escape(col.name)}"]`);
      if (cb) cb.checked = col.role === 'active';
      updateRoleSummary();
      renderPreview();
    });
    tdRole.appendChild(sel);
    tr.appendChild(tdRole);
    tb.appendChild(tr);
  });
  table.appendChild(tb);
  host.appendChild(table);
  updateRoleSummary();
}

function updateRoleSummary() {
  const c = state.columns;
  const nAct = c.filter(x => x.role === 'active').length;
  const nSn = c.filter(x => x.role === 'supp-num').length;
  const nSc = c.filter(x => x.role === 'supp-cat').length;
  const nEx = c.filter(x => x.role === 'excluded').length;
  const nId = c.filter(x => x.role === 'id').length;
  const n = state.rawRows.length;
  statTiles('roleSummary', [
    ['Observaciones', n, 'filas del archivo'],
    ['Variables activas', nAct, 'entran al ACP', nAct >= 3 ? 'ok' : 'bad'],
    ['Razón n : p', nAct ? (n / nAct).toFixed(1) + ' : 1' : '—', 'individuos por variable',
      nAct ? (n / nAct >= 10 ? 'ok' : n / nAct >= 5 ? 'warn' : 'bad') : 'bad'],
    ['Cuanti. suplementarias', nSn, 'se proyectan, no construyen ejes'],
    ['Cualitativas / grupos', nSc, 'colorean individuos'],
    ['Identificador', nId, nId ? 'etiqueta las filas' : 'se usará el número de fila'],
    ['Excluidas', nEx, 'fuera del análisis'],
  ]);
  el('processBtn').disabled = nAct < 2;
  el('roleHint').innerHTML = nAct < 2
    ? '<span style="color:var(--danger)">' + tt('Necesitas al menos 2 variables activas (idealmente 3 o más) para un ACP.') + '</span>'
    : TT(`Se construirá el ACP con <b>${nAct}</b> variables activas.`, `The PCA will be built with <b>${nAct}</b> active variables.`);
}

function renderPreview() {
  const cols = state.columns;
  const header = cols.map(c => {
    const icon = c.role === 'active' ? '⌗' : c.role === 'supp-num' ? '⊕' : c.role === 'supp-cat' ? '⌸' : c.role === 'id' ? '◇' : '∅';
    return icon + ' ' + c.name;
  });
  const rows = state.rawRows.slice(0, 12).map(r => cols.map(c => {
    const v = r[c.index];
    return isMissing(v) ? '—' : (typeof v === 'number' ? fmtNum(v) : String(v));
  }));
  buildTable('dataPreview', header.map((h, i) => ({ key: i, label: h, num: cols[i].kind === 'numeric' })),
    rows.map(r => Object.fromEntries(r.map((v, i) => [i, v]))), { limit: 12 });
  el('previewNote').textContent =
    TT(`Mostrando 12 de ${state.rawRows.length} filas. ⌗ activa · ⊕ cuantitativa suplementaria · ⌸ cualitativa · ◇ identificador · ∅ excluida.`, `Showing 12 of ${state.rawRows.length} rows. ⌗ active · ⊕ supplementary quantitative · ⌸ qualitative · ◇ identifier · ∅ excluded.`);
}

/* ============================================================
   Preparación de la matriz
   ============================================================ */
function prepare() {
  const decimal = el('decimalSel').value;
  const missingMode = el('missingSel').value;
  const transform = el('transformSel').value;
  const scaling = document.querySelector('input[name="scaling"]:checked').value;
  state.prep = { missing: missingMode, transform, scaling };

  const act = state.columns.filter(c => c.role === 'active');
  const sn = state.columns.filter(c => c.role === 'supp-num');
  const sc = state.columns.filter(c => c.role === 'supp-cat');
  const idc = state.columns.find(c => c.role === 'id');
  const nAll = state.rawRows.length;

  /* matriz cruda con nulos */
  const raw = state.rawRows.map(r => act.map(c => toNumber(r[c.index], decimal)));

  /* mapa de presencia (para la figura de faltantes): activas + suplementarias */
  const mapVars = [...act, ...sn, ...sc].map(c => c.name);
  const present = state.rawRows.map(r => [...act, ...sn, ...sc].map(c => !isMissing(r[c.index])));

  /* manejo de faltantes */
  let keep = [];
  let X = [];
  const imputed = act.map(() => 0);
  if (missingMode === 'listwise') {
    raw.forEach((r, i) => { if (r.every(v => v !== null)) { keep.push(i); X.push(r.slice()); } });
  } else {
    const fill = act.map((c, j) => {
      const vals = raw.map(r => r[j]).filter(v => v !== null);
      return missingMode === 'median' ? S.median(vals) : S.mean(vals);
    });
    raw.forEach((r, i) => {
      if (r.every(v => v === null)) return;       // fila totalmente vacia: fuera
      keep.push(i);
      X.push(r.map((v, j) => { if (v === null) { imputed[j]++; return fill[j]; } return v; }));
    });
  }
  if (X.length < 3) {
    clearMessages('prepMessages');
    showMessage('prepMessages', 'error',
      tt('Quedan menos de 3 filas completas. Prueba con imputación por media/mediana o revisa las variables activas.'));
    return null;
  }

  /* columnas */
  let cols = act.map((_, j) => X.map(r => r[j]));
  const rawCols = cols.map(c => c.slice());

  /* transformacion */
  const transWarn = [];
  if (transform !== 'none') {
    cols = cols.map((c, j) => {
      if (transform === 'log' || transform === 'log10' || transform === 'inverse') {
        if (S.min(c) <= 0) transWarn.push(act[j].name);
      }
      return S.transformColumn(c, transform);
    });
  }

  /* escalado */
  const scaleInfo = cols.map(c => S.scaleColumn(c, scaling));
  cols = scaleInfo.map(s => s.v);

  state.X = cols;                    // por columnas
  state.Xraw = rawCols;
  state.activeVars = act.map(c => c.name);
  state.keptRows = keep;
  state.rowIds = keep.map((i, k) => idc ? String(state.rawRows[i][idc.index]) : 'Ind ' + (i + 1));
  state.suppNum = sn.map(c => ({ name: c.name, values: keep.map(i => toNumber(state.rawRows[i][c.index], decimal)) }));
  state.suppCat = sc.map(c => {
    const vals = keep.map(i => isMissing(state.rawRows[i][c.index]) ? null : String(state.rawRows[i][c.index]).trim());
    return { name: c.name, values: vals, levels: [...new Set(vals.filter(v => v !== null))] };
  });
  state.missingMap = { vars: mapVars, present, n: nAll };
  state.scaleInfo = scaleInfo;
  state.imputed = imputed;
  state.transWarn = transWarn;
  state.ready = true;
  return true;
}

/* ============================================================
   Diagnóstico
   ============================================================ */
function diagnose() {
  const cols = state.X, vars = state.activeVars;
  const n = cols[0].length, p = cols.length;
  const R = S.corrMatrix(cols, 'pearson');
  const det = S.determinant(R);
  const bart = S.bartlett(R, n);
  const kmo = S.kmo(R);
  const eig = S.eigenSym(R);

  /* pares muy correlacionados */
  const pairs = [];
  for (let i = 0; i < p; i++) for (let j = i + 1; j < p; j++) pairs.push({ a: vars[i], b: vars[j], r: R[i][j] });
  pairs.sort((x, y) => Math.abs(y.r) - Math.abs(x.r));
  const redundant = pairs.filter(x => Math.abs(x.r) >= 0.9);
  const strong = pairs.filter(x => Math.abs(x.r) >= 0.3);
  const meanAbsR = pairs.length ? S.mean(pairs.map(x => Math.abs(x.r))) : 0;

  /* atipicos multivariados */
  let mahal = null, mOut = [];
  if (n > p + 2) {
    const d2 = S.mahalanobis(state.Xraw);
    if (d2) {
      const cut = S.chi2Inv(0.999, p);
      mahal = { d2, cut };
      mOut = d2.map((d, i) => ({ i, d2: d, id: state.rowIds[i] })).filter(o => o.d2 > cut)
        .sort((a, b) => b.d2 - a.d2);
    }
  }

  /* escalas originales */
  const sds = state.Xraw.map(S.sd);
  const scaleRatio = S.max(sds) / (S.min(sds.filter(s => s > 0)) || 1);

  /* asimetria */
  const skews = state.Xraw.map(S.skewness);
  const skewed = vars.filter((v, i) => Math.abs(skews[i]) > 1);

  /* faltantes */
  const totalCells = state.rawRows.length * p;
  const missCells = state.rawRows.length * p - state.keptRows.length * p +
    state.imputed.reduce((a, b) => a + b, 0);
  const missPct = state.missingMap.present.length
    ? 1 - S.mean(state.missingMap.present.map(r => S.mean(r.map(x => x ? 1 : 0))))
    : 0;

  /* puntuacion global */
  let score = 0;
  const K = kmo ? kmo.overall : 0;
  score += K >= 0.8 ? 30 : K >= 0.7 ? 24 : K >= 0.6 ? 17 : K >= 0.5 ? 9 : 0;
  score += (bart.p < 0.05) ? 20 : 0;
  const ratio = n / p;
  score += ratio >= 10 ? 20 : ratio >= 5 ? 14 : ratio >= 3 ? 8 : 2;
  score += n >= 100 ? 10 : n >= 50 ? 7 : n >= 30 ? 4 : 1;
  score += missPct < 0.05 ? 10 : missPct < 0.15 ? 6 : 2;
  score += (det > 1e-5 && !bart.singular) ? 10 : (det > 1e-9 ? 5 : 0);

  return {
    n, p, R, det, bart, kmo, eig, pairs, redundant, strong, meanAbsR,
    mahal, mOut, sds, scaleRatio, skews, skewed, missPct, ratio, score,
    nAbove1: eig.values.filter(v => v > 1).length,
    varExplained2: eig.values.slice(0, 2).reduce((a, b) => a + b, 0) / p,
  };
}

/* ============================================================
   Presentación de resultados
   ============================================================ */
function grade(score) {
  if (score >= 82) return ['A', 'g-a', tt('Excelente'), tt('La base cumple bien los requisitos del ACP. Puedes avanzar con confianza.')];
  if (score >= 66) return ['B', 'g-b', tt('Buena'), tt('La base es apta para el ACP; atiende las observaciones marcadas en ámbar para mejorar la solución.')];
  if (score >= 48) return ['C', 'g-c', tt('Aceptable con reservas'), tt('El ACP es posible, pero varios supuestos están al límite. Interpreta los resultados con cautela y considera las correcciones sugeridas.')];
  return ['D', 'g-d', tt('Problemática'), tt('La base incumple requisitos importantes. Corrige lo señalado en rojo antes de interpretar componentes.')];
}

function check(list, level, title, text) { list.push({ level, title, text }); }

function buildRecommendations(d) {
  const rec = [];
  const vars = state.activeVars;

  /* 1. Tamaño muestral */
  if (d.ratio >= 10 && d.n >= 100) check(rec, 'ok', tt('Tamaño de muestra adecuado'),
    TT(`<b>${d.n}</b> observaciones para <b>${d.p}</b> variables (razón <b>${d.ratio.toFixed(1)}:1</b>). Cumple la regla clásica de 10 individuos por variable y el mínimo recomendado de n ≥ 100.`,
       `<b>${d.n}</b> observations for <b>${d.p}</b> variables (ratio <b>${d.ratio.toFixed(1)}:1</b>). This meets the classic rule of 10 individuals per variable and the recommended minimum of n ≥ 100.`));
  else if (d.ratio >= 5) check(rec, 'warn', tt('Tamaño de muestra suficiente pero justo'),
    TT(`Razón <b>${d.ratio.toFixed(1)}:1</b> con n = <b>${d.n}</b>. Se sostiene la regla de 5:1, pero las cargas factoriales serán menos estables. Con n < 100 conviene interpretar solo cargas |carga| ≥ 0.55 y no sobreinterpretar componentes menores.`,
       `Ratio <b>${d.ratio.toFixed(1)}:1</b> with n = <b>${d.n}</b>. The 5:1 rule holds, but the loadings will be less stable. With n < 100 it is wise to interpret only loadings |loading| ≥ 0.55 and not to over-read minor components.`));
  else check(rec, 'bad', tt('Tamaño de muestra insuficiente'),
    TT(`Solo <b>${d.ratio.toFixed(1)}</b> observaciones por variable (n = ${d.n}, p = ${d.p}). Con menos de 5:1 la solución es inestable y poco replicable. Opciones: aumentar n, reducir el número de variables activas, o agrupar variables redundantes.`,
       `Only <b>${d.ratio.toFixed(1)}</b> observations per variable (n = ${d.n}, p = ${d.p}). Below 5:1 the solution is unstable and hard to replicate. Options: increase n, reduce the number of active variables, or merge redundant variables.`));

  /* 2. Bartlett */
  if (d.bart.singular) check(rec, 'bad', tt('Matriz de correlaciones singular'),
    tt('El determinante de R es ≈ 0: hay dependencia lineal exacta entre variables (por ejemplo, una variable que es suma o porcentaje de otras). Elimina una de las variables redundantes antes de continuar.'));
  else if (d.bart.p < 0.05) check(rec, 'ok', tt('Prueba de esfericidad de Bartlett significativa'),
    TT(`χ² = <b>${fmtNum(d.bart.chi2, 1)}</b>, gl = ${d.bart.df}, <b>${fmtPLabel(d.bart.p)}</b>. Se rechaza que R sea una matriz identidad: existen correlaciones suficientes para extraer componentes.`,
       `χ² = <b>${fmtNum(d.bart.chi2, 1)}</b>, df = ${d.bart.df}, <b>${fmtPLabel(d.bart.p)}</b>. The hypothesis that R is an identity matrix is rejected: there are enough correlations to extract components.`));
  else check(rec, 'bad', tt('Bartlett no significativa: las variables no están correlacionadas'),
    TT(`χ² = ${fmtNum(d.bart.chi2, 1)}, gl = ${d.bart.df}, <b>${fmtPLabel(d.bart.p)}</b>. La matriz de correlaciones no difiere de una identidad, así que el ACP no tiene nada que resumir: cada variable aportaría su propio componente.`,
       `χ² = ${fmtNum(d.bart.chi2, 1)}, df = ${d.bart.df}, <b>${fmtPLabel(d.bart.p)}</b>. The correlation matrix does not differ from an identity, so the PCA has nothing to summarise: each variable would contribute its own component.`));

  /* 3. KMO */
  if (d.kmo) {
    const K = d.kmo.overall;
    const etiq = K >= 0.9 ? 'excelente' : K >= 0.8 ? 'meritorio' : K >= 0.7 ? 'aceptable' : K >= 0.6 ? 'mediocre' : K >= 0.5 ? 'bajo' : 'inaceptable';
    const bajos = vars.map((v, i) => [v, d.kmo.msa[i]]).filter(x => x[1] < 0.5);
    let lvl = K >= 0.8 ? 'ok' : K >= 0.6 ? 'warn' : 'bad';
    if (bajos.length && lvl === 'ok') lvl = 'warn';   // el KMO global puede ser bueno y aun así haber variables inadecuadas
    check(rec, lvl, TT(`Índice KMO = ${fmtNum(K, 3)} (${tt(etiq)})`, `KMO index = ${fmtNum(K, 3)} (${tt(etiq)})`),
      TT('Kaiser–Meyer–Olkin mide qué proporción de la correlación entre variables es común y no parcial. ',
         'Kaiser–Meyer–Olkin measures what share of the correlation between variables is common rather than partial. ') +
      (K >= 0.6 ? tt('El valor está en el rango aceptable para el análisis factorial/ACP.') :
        tt('Por debajo de 0.6 el ACP se desaconseja: las correlaciones son en su mayoría espurias o específicas de pares.')) +
      (bajos.length
        ? TT(` <b>Variables con MSA &lt; 0.5</b> (candidatas a eliminar, una a la vez, recalculando): ${bajos.map(b => b[0] + ' (' + fmtNum(b[1], 2) + ')').join(', ')}.`,
             ` <b>Variables with MSA &lt; 0.5</b> (candidates for removal, one at a time, recomputing): ${bajos.map(b => b[0] + ' (' + fmtNum(b[1], 2) + ')').join(', ')}.`)
        : tt(' Ninguna variable individual tiene MSA por debajo de 0.5.')));
  }

  /* 4. Estructura de correlación */
  if (d.meanAbsR < 0.3 && d.strong.length === 0) check(rec, 'bad', tt('Correlaciones demasiado débiles'),
    TT(`La correlación absoluta media entre pares es <b>${fmtNum(d.meanAbsR, 3)}</b> y ningún par supera |r| = 0.30. Sin redundancia entre variables, el ACP no reduce dimensiones de forma útil.`,
       `The mean absolute pairwise correlation is <b>${fmtNum(d.meanAbsR, 3)}</b> and no pair exceeds |r| = 0.30. Without redundancy between variables, PCA does not usefully reduce dimensions.`));
  else check(rec, 'ok', tt('Existe estructura de correlación aprovechable'),
    TT(`Correlación absoluta media = <b>${fmtNum(d.meanAbsR, 3)}</b>; <b>${d.strong.length}</b> de ${d.pairs.length} pares superan |r| = 0.30. El par más fuerte es <b>${d.pairs[0].a} ↔ ${d.pairs[0].b}</b> (r = ${fmtNum(d.pairs[0].r, 3)}).`,
       `Mean absolute correlation = <b>${fmtNum(d.meanAbsR, 3)}</b>; <b>${d.strong.length}</b> of ${d.pairs.length} pairs exceed |r| = 0.30. The strongest pair is <b>${d.pairs[0].a} ↔ ${d.pairs[0].b}</b> (r = ${fmtNum(d.pairs[0].r, 3)}).`));

  /* 5. Multicolinealidad */
  if (d.redundant.length) check(rec, 'warn', tt('Variables casi redundantes (|r| ≥ 0.90)'),
    TT(`${d.redundant.slice(0, 6).map(x => `<b>${x.a}–${x.b}</b> (r = ${fmtNum(x.r, 3)})`).join(', ')}${d.redundant.length > 6 ? ` y ${d.redundant.length - 6} par(es) más` : ''}. `,
       `${d.redundant.slice(0, 6).map(x => `<b>${x.a}–${x.b}</b> (r = ${fmtNum(x.r, 3)})`).join(', ')}${d.redundant.length > 6 ? ` and ${d.redundant.length - 6} more pair(s)` : ''}. `) +
    tt('No invalida el ACP, pero infla artificialmente el primer componente y puede volver inestable la rotación. Considera conservar una sola variable de cada par o promediarlas en un índice.'));
  else check(rec, 'ok', tt('Sin multicolinealidad extrema'),
    TT(`Ningún par de variables supera |r| = 0.90 (máximo observado: ${fmtNum(Math.abs(d.pairs[0].r), 3)}). La matriz es invertible: determinante de R = ${d.det.toExponential(2)}.`,
       `No pair of variables exceeds |r| = 0.90 (largest observed: ${fmtNum(Math.abs(d.pairs[0].r), 3)}). The matrix is invertible: determinant of R = ${d.det.toExponential(2)}.`));

  /* 6. Escalas */
  if (state.prep.scaling === 'none' || state.prep.scaling === 'center') {
    if (d.scaleRatio > 4) check(rec, 'bad', tt('Escalas muy dispares sin estandarizar'),
      TT(`La variable de mayor dispersión tiene una desviación estándar <b>${fmtNum(d.scaleRatio, 1)} veces</b> mayor que la de menor. Con ACP sobre la matriz de covarianzas, esa variable dominará el primer componente solo por su unidad de medida. <b>Recomendación: usa estandarización z</b> (ACP sobre correlaciones).`,
         `The most dispersed variable has a standard deviation <b>${fmtNum(d.scaleRatio, 1)} times</b> larger than the least dispersed one. With PCA on the covariance matrix, that variable will dominate the first component purely because of its unit of measurement. <b>Recommendation: use z standardisation</b> (PCA on correlations).`));
    else check(rec, 'warn', tt('ACP sobre covarianzas (sin estandarizar)'),
      TT(`Las escalas son comparables (razón de desviaciones = ${fmtNum(d.scaleRatio, 1)}), así que el ACP sobre covarianzas es defendible y conserva las unidades originales. Verifica que todas las variables estén medidas en la misma unidad.`,
         `The scales are comparable (ratio of standard deviations = ${fmtNum(d.scaleRatio, 1)}), so PCA on covariances is defensible and keeps the original units. Check that every variable is measured in the same unit.`));
  } else if (state.prep.scaling === 'z') {
    check(rec, 'ok', tt('Variables estandarizadas (ACP sobre correlaciones)'),
      TT(`Todas las variables tienen ahora media 0 y desviación 1, así que contribuyen por igual al análisis independientemente de sus unidades. Es la opción por defecto y la correcta cuando las variables están en unidades distintas (razón de escalas original: ${fmtNum(d.scaleRatio, 1)}×).`,
         `Every variable now has mean 0 and standard deviation 1, so they contribute equally to the analysis regardless of their units. This is the default and the correct choice when the variables are in different units (original scale ratio: ${fmtNum(d.scaleRatio, 1)}×).`));
  } else {
    check(rec, 'info', TT(`Escalado aplicado: ${el('scaleLabel').textContent}`, `Scaling applied: ${el('scaleLabel').textContent}`),
      tt('Recuerda que el escalado elegido cambia el peso relativo de cada variable en los componentes. Documenta esta decisión en la sección de métodos de tu trabajo.'));
  }

  /* 7. Faltantes */
  if (d.missPct === 0) check(rec, 'ok', tt('Sin datos faltantes'),
    tt('La matriz está completa; no hubo que eliminar ni imputar observaciones.'));
  else {
    const perdidas = state.rawRows.length - d.n;
    const lvl = d.missPct > 0.15 ? 'bad' : d.missPct > 0.05 ? 'warn' : 'ok';
    check(rec, lvl, TT(`Datos faltantes: ${fmtPct(d.missPct, 1)} de las celdas`, `Missing data: ${fmtPct(d.missPct, 1)} of the cells`),
      state.prep.missing === 'listwise'
        ? TT(`Se eliminaron <b>${perdidas}</b> filas incompletas (quedaron ${d.n} de ${state.rawRows.length}). `,
             `<b>${perdidas}</b> incomplete rows were removed (${d.n} of ${state.rawRows.length} remain). `) +
          (perdidas / state.rawRows.length > 0.1
            ? tt('Estás perdiendo más del 10% de la muestra: valora imputar por mediana en lugar de eliminar, o excluir la variable con más vacíos.')
            : tt('La pérdida es tolerable.'))
        : TT(`Se imputaron <b>${state.imputed.reduce((a, b) => a + b, 0)}</b> celdas por ${state.prep.missing === 'median' ? 'la mediana' : 'la media'} de cada variable. La imputación por media reduce artificialmente la varianza y atenúa las correlaciones; declárala en tu reporte y, si el porcentaje es alto, considera métodos iterativos (imputePCA, missMDA).`,
             `<b>${state.imputed.reduce((a, b) => a + b, 0)}</b> cells were imputed with the ${state.prep.missing === 'median' ? 'median' : 'mean'} of each variable. Mean imputation artificially reduces variance and attenuates the correlations; declare it in your report and, if the percentage is high, consider iterative methods (imputePCA, missMDA).`));
  }

  /* 8. Atípicos */
  if (d.mOut && d.mOut.length) check(rec, 'warn',
    TT(`${d.mOut.length} observación(es) atípica(s) multivariante(s)`, `${d.mOut.length} multivariate outlier observation(s)`),
    TT(`Distancia de Mahalanobis por encima del percentil 99.9 de χ² con ${d.p} gl (corte D² = ${fmtNum(d.mahal.cut, 1)}): `,
       `Mahalanobis distance above the 99.9th percentile of χ² with ${d.p} df (cut-off D² = ${fmtNum(d.mahal.cut, 1)}): `) +
    `${d.mOut.slice(0, 8).map(o => `<b>${o.id}</b> (D² = ${fmtNum(o.d2, 1)})`).join(', ')}${d.mOut.length > 8 ? '…' : ''}. ` +
    tt('El ACP maximiza varianza, así que un atípico puede crear él solo un componente. Revisa si son errores de captura; si son casos reales, corre el ACP con y sin ellos y compara.'));
  else if (d.mahal) check(rec, 'ok', tt('Sin atípicos multivariantes graves'),
    TT(`Ninguna observación supera el corte de Mahalanobis (D² > ${fmtNum(d.mahal.cut, 1)}, χ²₀.₉₉₉ con ${d.p} gl).`,
       `No observation exceeds the Mahalanobis cut-off (D² > ${fmtNum(d.mahal.cut, 1)}, χ²₀.₉₉₉ with ${d.p} df).`));
  else check(rec, 'info', tt('Atípicos multivariantes no evaluables'),
    tt('Se necesitan más observaciones que variables (n > p + 2) para calcular la distancia de Mahalanobis.'));

  /* 9. Normalidad / asimetría */
  if (d.skewed.length) check(rec, 'warn',
    TT(`${d.skewed.length} variable(s) con asimetría marcada`, `${d.skewed.length} variable(s) with marked skewness`),
    `${d.skewed.slice(0, 8).map(v => `<b>${v}</b>`).join(', ')}${d.skewed.length > 8 ? '…' : ''} ` +
    TT('tienen |g₁| > 1. ', 'have |g₁| > 1. ') +
    tt('El ACP <i>descriptivo</i> no exige normalidad, pero la correlación de Pearson sí supone relaciones lineales y es sensible a distribuciones muy sesgadas. Prueba una transformación logarítmica o de raíz cuadrada arriba y compara el diagnóstico.'));
  else check(rec, 'ok', tt('Distribuciones razonablemente simétricas'),
    tt('Ninguna variable activa supera |g₁| = 1, así que la correlación de Pearson describe bien las relaciones lineales.'));

  /* 10. Dimensionalidad esperada */
  check(rec, 'info', tt('Dimensionalidad esperada (vista previa)'),
    TT(`Con el criterio de Kaiser (λ > 1) se retendrían <b>${d.nAbove1}</b> componentes; los dos primeros ejes ya explicarían <b>${fmtPct(d.varExplained2, 1)}</b> de la varianza total. `,
       `Under Kaiser's criterion (λ > 1), <b>${d.nAbove1}</b> components would be retained; the first two axes alone would already explain <b>${fmtPct(d.varExplained2, 1)}</b> of the total variance. `) +
    (d.varExplained2 > 0.6
      ? tt('Un plano factorial 1–2 bastará para representar bien la estructura.')
      : tt('Necesitarás mirar más de dos ejes, o el plano 1–2 dará una imagen incompleta.')) +
    tt(' El Bloque 2 confirmará esto con gráfico de sedimentación y análisis paralelo.'));

  return rec;
}

function renderResults() {
  const d = state.diagnostics;
  const [g, cls, etiq, txt] = grade(d.score);

  el('verdict').innerHTML =
    TT(`<div class="grade ${cls}">${g}<small>aptitud</small></div>
     <div class="v-text"><b>Aptitud de la base para ACP: ${etiq}</b> (${d.score}/100).<br>${txt}</div>`,
     `<div class="grade ${cls}">${g}<small>fitness</small></div>
     <div class="v-text"><b>Fitness of the data set for PCA: ${etiq}</b> (${d.score}/100).<br>${txt}</div>`);

  statTiles('diagTiles', [
    ['Observaciones (n)', d.n, TT(`de ${state.rawRows.length} filas del archivo`, `of ${state.rawRows.length} rows in the file`)],
    ['Variables activas (p)', d.p, 'construyen los componentes'],
    ['KMO global', d.kmo ? fmtNum(d.kmo.overall, 3) : '—', 'adecuación muestral',
      d.kmo ? (d.kmo.overall >= 0.8 ? 'ok' : d.kmo.overall >= 0.6 ? 'warn' : 'bad') : 'bad'],
    ['Bartlett', fmtPLabel(d.bart.p), TT(`χ² = ${fmtNum(d.bart.chi2, 1)}, gl ${d.bart.df}`, `χ² = ${fmtNum(d.bart.chi2, 1)}, df ${d.bart.df}`),
      d.bart.p < 0.05 ? 'ok' : 'bad'],
    ['Determinante de R', d.det.toExponential(2), d.det > 1e-5 ? tt('sin singularidad') : tt('cercano a 0'),
      d.det > 1e-5 ? 'ok' : 'warn'],
    ['|r| media', fmtNum(d.meanAbsR, 3), TT(`${d.strong.length}/${d.pairs.length} pares con |r| ≥ 0.3`, `${d.strong.length}/${d.pairs.length} pairs with |r| ≥ 0.3`),
      d.meanAbsR >= 0.3 ? 'ok' : 'warn'],
    ['Componentes λ > 1', d.nAbove1, TT(`explican ${fmtPct(d.eig.values.filter(v => v > 1).reduce((a, b) => a + b, 0) / d.p, 1)}`, `explain ${fmtPct(d.eig.values.filter(v => v > 1).reduce((a, b) => a + b, 0) / d.p, 1)}`)],
    ['Atípicos (Mahalanobis)', d.mOut ? d.mOut.length : '—', 'D² > χ²₀.₉₉₉',
      d.mOut && d.mOut.length ? 'warn' : 'ok'],
  ]);

  /* MSA por variable */
  if (d.kmo) {
    buildTable('msaTable',
      [{ key: 'v', label: 'Variable' }, { key: 'msa', label: 'MSA', num: true, fmt: x => fmtNum(x, 3) },
       { key: 'j', label: 'Interpretación' }, { key: 'sd', label: 'DE original', num: true, fmt: x => fmtNum(x, 3) },
       { key: 'sk', label: 'Asimetría', num: true, fmt: x => fmtNum(x, 2) }],
      state.activeVars.map((v, i) => ({
        v, msa: d.kmo.msa[i], sd: d.sds[i], sk: d.skews[i],
        j: tt(d.kmo.msa[i] >= 0.8 ? 'meritorio' : d.kmo.msa[i] >= 0.7 ? 'aceptable' :
           d.kmo.msa[i] >= 0.6 ? 'mediocre' : d.kmo.msa[i] >= 0.5 ? 'bajo' : 'inaceptable — considera eliminar'),
      })).sort((a, b) => a.msa - b.msa));
  }

  /* recomendaciones */
  const rec = buildRecommendations(d);
  const ul = el('recList'); ul.innerHTML = '';
  const icons = { ok: '✔', warn: '⚠', bad: '✖', info: 'ℹ' };
  rec.forEach(r => {
    const li = mk('li', { class: 'check-item ' + r.level });
    li.innerHTML = `<div class="ck-icon">${icons[r.level]}</div>
      <div class="ck-body"><div class="ck-title">${r.title}</div><div class="ck-text">${r.text}</div></div>`;
    ul.appendChild(li);
  });

  renderFigures(d);

  /* vista previa de la matriz preparada */
  const hdr = ['Individuo', ...state.activeVars];
  const prevRows = state.rowIds.slice(0, 10).map((id, i) => {
    const o = { Individuo: id };
    state.activeVars.forEach((v, j) => o[v] = fmtNum(state.X[j][i], 3));
    return o;
  });
  buildTable('preparedPreview', hdr.map(h => ({ key: h, label: h, num: h !== 'Individuo' })), prevRows);
  el('preparedNote').textContent =
    TT(`Matriz final: ${d.n} × ${d.p}. Transformación: ${el('transformSel').selectedOptions[0].text}. Escalado: ${el('scaleLabel').textContent}.`,
     `Final matrix: ${d.n} × ${d.p}. Transformation: ${el('transformSel').selectedOptions[0].text}. Scaling: ${el('scaleLabel').textContent}.`);

  el('pcaSourceNote').innerHTML =
    TT(`Matriz preparada en el Bloque 1: <b>${d.n}</b> individuos × <b>${d.p}</b> variables activas ` +
      `(${state.activeVars.join(', ')}). Escalado: <b>${el('scaleLabel').textContent}</b>, así que el ACP se calculará ` +
      `sobre la matriz de <b>${state.prep.scaling === 'z' ? 'correlaciones' : 'covarianzas de los datos escalados'}</b>.`,
      `Matrix prepared in Block 1: <b>${d.n}</b> individuals × <b>${d.p}</b> active variables ` +
      `(${state.activeVars.join(', ')}). Scaling: <b>${el('scaleLabel').textContent}</b>, so the PCA will be computed ` +
      `on the <b>${state.prep.scaling === 'z' ? 'correlation' : 'covariance (scaled data)'}</b> matrix.`);
  state.pca = null;                       // una nueva preparación invalida la extracción anterior
  el('pcaResults').style.display = 'none';

  el('resultsWrap').style.display = '';
  enableStep(2, true);
}

/* ============================================================
   Figuras
   ============================================================ */
function renderFigures(d) {
  const base = slug(state.fileName || 'pcapro');
  const paletteOpts = Object.entries(Fig.paletteNames);
  const themeOpts = Object.entries(Fig.themeNames);
  const fontOpts = Object.entries(Fig.fontNames);
  const cmapOpts = Object.entries(Fig.colormapNames);

  /* --- faltantes --- */
  Fig.mount('figMissing', {
    title: 'Mapa de datos faltantes',
    fileName: base + '_faltantes',
    defaults: {
      title: 'Mapa de datos faltantes', subtitle: `${state.fileName || ''}`,
      theme: 'claro', font: 'sans', colorPresent: '#dbe3f0', colorMissing: '#e03131',
      showCounts: true, xlab: 'Observación (fila del archivo)', titleSize: 17,
    },
    controls: [
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'subtitle', label: 'Subtítulo', type: 'text' },
      { key: 'xlab', label: 'Eje X', type: 'text' },
      { key: 'colorPresent', label: 'Color presente', type: 'color' },
      { key: 'colorMissing', label: 'Color faltante', type: 'color' },
      { key: 'theme', label: 'Tema', type: 'select', options: themeOpts },
      { key: 'font', label: 'Tipografía', type: 'select', options: fontOpts },
      { key: 'showCounts', label: 'Mostrar conteos', type: 'checkbox' },
      { key: 'titleSize', label: 'Tamaño título', type: 'number', min: 10, max: 30 },
    ],
    render: cfg => Plots1.missingMap(cfg, state.missingMap),
  });

  /* --- escalas --- */
  Fig.mount('figScales', {
    title: 'Perfil de escalas de las variables activas',
    fileName: base + '_escalas',
    defaults: {
      title: 'Dispersión original de cada variable',
      subtitle: TT(`Razón entre la mayor y la menor desviación estándar: ${fmtNum(d.scaleRatio, 1)}×`,
        `Ratio of the largest to the smallest standard deviation: ${fmtNum(d.scaleRatio, 1)}×`),
      theme: 'claro', font: 'sans', palette: 'pcapro', metric: 'sd', logScale: d.scaleRatio > 20,
      sort: 'desc', showValues: true, singleColor: false, barColor: '#5b3fd6', outline: false,
      opacity: 0.92, xlab: '', titleSize: 17,
    },
    controls: [
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'subtitle', label: 'Subtítulo', type: 'text' },
      { key: 'xlab', label: 'Eje X', type: 'text' },
      { key: 'metric', label: 'Métrica', type: 'select', options: [['sd', 'Desviación estándar'], ['mean', 'Media'], ['cv', 'Coef. de variación']] },
      { key: 'palette', label: 'Paleta', type: 'select', options: paletteOpts },
      { key: 'singleColor', label: 'Un solo color', type: 'checkbox' },
      { key: 'barColor', label: 'Color único', type: 'color' },
      { key: 'sort', label: 'Orden', type: 'select', options: [['desc', 'Mayor a menor'], ['asc', 'Menor a mayor'], ['none', 'Original']] },
      { key: 'logScale', label: 'Escala log', type: 'checkbox' },
      { key: 'showValues', label: 'Mostrar valores', type: 'checkbox' },
      { key: 'outline', label: 'Contorno', type: 'checkbox' },
      { key: 'theme', label: 'Tema', type: 'select', options: themeOpts },
      { key: 'font', label: 'Tipografía', type: 'select', options: fontOpts },
    ],
    render: cfg => Plots1.scaleProfile(cfg, {
      vars: state.activeVars, sd: d.sds,
      mean: state.Xraw.map(S.mean),
      cv: state.Xraw.map(c => { const m = S.mean(c); return m ? Math.abs(S.sd(c) / m) * 100 : 0; }),
    }),
  });

  /* --- correlaciones --- */
  Fig.mount('figCorr', {
    title: 'Matriz de correlaciones entre variables activas',
    fileName: base + '_correlaciones',
    defaults: {
      title: 'Matriz de correlaciones (Pearson)',
      subtitle: TT(`n = ${d.n} · |r| media = ${fmtNum(d.meanAbsR, 3)}`,
        `n = ${d.n} · mean |r| = ${fmtNum(d.meanAbsR, 3)}`),
      theme: 'claro', font: 'sans', colormap: 'rdbu', shape: 'square',
      showValues: state.activeVars.length <= 15, triangle: 'full', reorder: false,
      gridLines: true, legend: true, legendTitle: 'r', titleSize: 17,
    },
    controls: [
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'subtitle', label: 'Subtítulo', type: 'text' },
      { key: 'colormap', label: 'Paleta continua', type: 'select', options: cmapOpts },
      { key: 'shape', label: 'Forma', type: 'select', options: [['square', 'Celdas'], ['circle', 'Círculos']] },
      { key: 'triangle', label: 'Triángulo', type: 'select', options: [['full', 'Completa'], ['lower', 'Inferior'], ['upper', 'Superior']] },
      { key: 'showValues', label: 'Mostrar r', type: 'checkbox' },
      { key: 'reorder', label: 'Reordenar por similitud', type: 'checkbox' },
      { key: 'gridLines', label: 'Separadores', type: 'checkbox' },
      { key: 'legend', label: 'Leyenda', type: 'checkbox' },
      { key: 'legendTitle', label: 'Título leyenda', type: 'text' },
      { key: 'theme', label: 'Tema', type: 'select', options: themeOpts },
      { key: 'font', label: 'Tipografía', type: 'select', options: fontOpts },
    ],
    render: cfg => Plots1.corrHeatmap(cfg, { vars: state.activeVars, R: d.R }),
  });

  /* --- histogramas --- */
  Fig.mount('figHist', {
    title: 'Distribución de cada variable activa',
    fileName: base + '_distribuciones',
    defaults: {
      title: 'Distribución de las variables activas (datos originales)',
      subtitle: 'Línea roja: curva normal de referencia',
      theme: 'claro', font: 'sans', palette: 'pcapro', cols: 3, bins: 0,
      showNormal: true, showMean: false, showSkew: true, singleColor: false,
      barColor: '#5b3fd6', outline: false, normalColor: '#e03131', titleSize: 17,
    },
    controls: [
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'subtitle', label: 'Subtítulo', type: 'text' },
      { key: 'cols', label: 'Columnas', type: 'number', min: 1, max: 6 },
      { key: 'bins', label: 'Intervalos (0 = auto)', type: 'number', min: 0, max: 60 },
      { key: 'palette', label: 'Paleta', type: 'select', options: paletteOpts },
      { key: 'singleColor', label: 'Un solo color', type: 'checkbox' },
      { key: 'barColor', label: 'Color único', type: 'color' },
      { key: 'showNormal', label: 'Curva normal', type: 'checkbox' },
      { key: 'normalColor', label: 'Color curva', type: 'color' },
      { key: 'showMean', label: 'Línea de la media', type: 'checkbox' },
      { key: 'showSkew', label: 'Mostrar g₁', type: 'checkbox' },
      { key: 'theme', label: 'Tema', type: 'select', options: themeOpts },
      { key: 'font', label: 'Tipografía', type: 'select', options: fontOpts },
    ],
    render: cfg => Plots1.histGrid(cfg, { vars: state.activeVars, cols: state.Xraw }),
  });

  /* --- cajas tras escalado --- */
  Fig.mount('figBox', {
    title: 'Comparación de escalas después del preprocesamiento',
    fileName: base + '_cajas',
    defaults: {
      title: 'Variables tras la transformación y el escalado',
      subtitle: el('scaleLabel').textContent,
      theme: 'claro', font: 'sans', palette: 'pcapro', showOutliers: true, showPoints: false,
      trim: false, ylab: 'Valor escalado', singleColor: false, barColor: '#0d9488', titleSize: 17,
    },
    controls: [
      { key: 'title', label: 'Título', type: 'text' },
      { key: 'subtitle', label: 'Subtítulo', type: 'text' },
      { key: 'ylab', label: 'Eje Y', type: 'text' },
      { key: 'palette', label: 'Paleta', type: 'select', options: paletteOpts },
      { key: 'singleColor', label: 'Un solo color', type: 'checkbox' },
      { key: 'barColor', label: 'Color único', type: 'color' },
      { key: 'showOutliers', label: 'Marcar atípicos', type: 'checkbox' },
      { key: 'showPoints', label: 'Superponer datos', type: 'checkbox' },
      { key: 'trim', label: 'Recortar colas extremas', type: 'checkbox' },
      { key: 'theme', label: 'Tema', type: 'select', options: themeOpts },
      { key: 'font', label: 'Tipografía', type: 'select', options: fontOpts },
    ],
    render: cfg => Plots1.boxPanel(cfg, { vars: state.activeVars, cols: state.X }),
  });
}

/* ============================================================
   Descargas
   ============================================================ */
function downloadPrepared() {
  const hdr = ['Individuo', ...state.activeVars,
    ...state.suppNum.map(s => s.name), ...state.suppCat.map(s => s.name)];
  const rows = state.rowIds.map((id, i) => [
    id,
    ...state.X.map(c => c[i]),
    ...state.suppNum.map(s => s.values[i]),
    ...state.suppCat.map(s => s.values[i]),
  ]);
  download(matrixToCSV(hdr, rows), slug(state.fileName) + '_matriz_preparada.csv', 'text/csv;charset=utf-8');
}
function downloadCorr() {
  const d = state.diagnostics;
  const hdr = ['', ...state.activeVars];
  const rows = state.activeVars.map((v, i) => [v, ...d.R[i].map(x => x.toFixed(6))]);
  download(matrixToCSV(hdr, rows), slug(state.fileName) + '_correlaciones.csv', 'text/csv;charset=utf-8');
}
function downloadSummary() {
  const d = state.diagnostics;
  const hdr = ['Variable', 'Papel', 'n', 'Faltantes', 'Unicos', 'Media', 'DE', 'Min', 'Max', 'Mediana', 'CV%', 'Asimetria', 'Curtosis', 'MSA'];
  const rows = state.columns.map(c => {
    const k = state.activeVars.indexOf(c.name);
    return [c.name, ROLE_LABEL[c.role], c.n, c.missing, c.unique,
      c.kind === 'numeric' ? c.mean : '', c.kind === 'numeric' ? c.sd : '',
      c.kind === 'numeric' ? c.min : '', c.kind === 'numeric' ? c.max : '',
      c.kind === 'numeric' ? c.median : '', c.kind === 'numeric' ? c.cv : '',
      c.kind === 'numeric' ? c.skew : '', c.kind === 'numeric' ? c.kurt : '',
      (k >= 0 && d.kmo) ? d.kmo.msa[k] : ''];
  });
  download(matrixToCSV(hdr, rows), slug(state.fileName) + '_resumen_variables.csv', 'text/csv;charset=utf-8');
}
function downloadReport() {
  const d = state.diagnostics;
  const [g, , etiq] = grade(d.score);
  const L = [];
  L.push('INFORME DE PREPARACIÓN DE DATOS PARA ACP — PCAPro');
  L.push('='.repeat(62));
  L.push('Archivo: ' + (state.fileName || '—') + (state.sheetName ? ' · hoja: ' + state.sheetName : ''));
  L.push('Fecha: ' + new Date().toLocaleString('es-MX'));
  L.push('');
  L.push('1. MATRIZ ANALIZADA');
  L.push(`   Observaciones (n): ${d.n} de ${state.rawRows.length} filas del archivo`);
  L.push(`   Variables activas (p): ${d.p} — ${state.activeVars.join(', ')}`);
  if (state.suppNum.length) L.push(`   Cuantitativas suplementarias: ${state.suppNum.map(s => s.name).join(', ')}`);
  if (state.suppCat.length) L.push(`   Cualitativas: ${state.suppCat.map(s => s.name).join(', ')}`);
  L.push(`   Faltantes: ${(d.missPct * 100).toFixed(2)}% — tratamiento: ${state.prep.missing}`);
  L.push(`   Transformación: ${state.prep.transform} · Escalado: ${state.prep.scaling}`);
  L.push('');
  L.push('2. SUPUESTOS Y ADECUACIÓN');
  L.push(`   Razón n:p = ${d.ratio.toFixed(2)}:1`);
  L.push(`   Determinante de R = ${d.det.toExponential(4)}`);
  L.push(`   Bartlett: chi2 = ${d.bart.chi2.toFixed(3)}, gl = ${d.bart.df}, p = ${d.bart.p.toExponential(3)}`);
  if (d.kmo) L.push(`   KMO global = ${d.kmo.overall.toFixed(4)}`);
  L.push(`   |r| media = ${d.meanAbsR.toFixed(4)}; pares con |r| >= 0.9: ${d.redundant.length}`);
  L.push(`   Razón de escalas (DE max/min) = ${d.scaleRatio.toFixed(2)}`);
  if (d.mahal) L.push(`   Atípicos multivariantes (D2 > ${d.mahal.cut.toFixed(2)}): ${d.mOut.length}`);
  L.push(`   Componentes con lambda > 1: ${d.nAbove1}; varianza de los 2 primeros ejes: ${(d.varExplained2 * 100).toFixed(2)}%`);
  L.push('');
  if (d.kmo) {
    L.push('3. MSA POR VARIABLE');
    state.activeVars.forEach((v, i) => L.push(`   ${v.padEnd(28)} ${d.kmo.msa[i].toFixed(4)}`));
    L.push('');
  }
  L.push('4. VEREDICTO');
  L.push(`   Aptitud: ${g} (${etiq}) — ${d.score}/100`);
  L.push('');
  L.push('5. RECOMENDACIONES');
  buildRecommendations(d).forEach((r, i) => {
    const tag = { ok: '[OK]  ', warn: '[AVISO]', bad: '[GRAVE]', info: '[INFO]' }[r.level];
    /* se limpia el HTML con el propio DOM: un replace por regex se comería
       los "<" literales de textos como "p < 0.0001" */
    const tmp = mk('div', null, r.text);
    L.push(`   ${tag} ${r.title.replace(/<[^>]*>/g, '')}`);
    L.push('        ' + tmp.textContent.replace(/\s+/g, ' ').trim());
  });
  L.push('');
  L.push('Generado por PCAPro — todo el cálculo se realizó localmente en el navegador.');
  download('﻿' + L.join('\r\n'), slug(state.fileName) + '_informe_bloque1.txt', 'text/plain;charset=utf-8');
}

/* ============================================================
   Eventos
   ============================================================ */
/* Boton «Como citar» del bloque 1. La referencia sale de Rep.CITATION, igual que
   el apartado 6.4 y el informe; report.js ya esta cargado cuando corre esto. */
function initCiteDialog() {
  const dlg = el('citeDialog'), btn = el('citeBtn');
  if (!dlg || !btn || typeof Rep === 'undefined') return;
  el('citeDialogRef').innerHTML = Rep.CITATION.apa;
  btn.addEventListener('click', () => dlg.showModal());
  el('closeCiteDlg').addEventListener('click', () => dlg.close());
  el('copyCiteDlg').addEventListener('click',
    () => copyToClipboard('copyCiteDlg', el('citeDialogRef').textContent));
  el('copyBibtexDlg').addEventListener('click',
    () => copyToClipboard('copyBibtexDlg', Rep.CITATION.bibtex));
}

function init() {
  initCiteDialog();
  /* los módulos deben poder cargarse fuera de index.html (por ejemplo en las pruebas):
     si la interfaz no está presente, no se enlaza nada */
  if (!el('dropZone')) return;
  const dz = el('dropZone'), fi = el('fileInput');
  dz.addEventListener('click', () => fi.click());
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('dragover'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
  dz.addEventListener('drop', e => {
    e.preventDefault(); dz.classList.remove('dragover');
    if (e.dataTransfer.files.length) readFile(e.dataTransfer.files[0]);
  });
  fi.addEventListener('change', () => { if (fi.files.length) readFile(fi.files[0]); });
  el('sheetSelect').addEventListener('change', e => loadSheet(e.target.value));

  el('exampleIris').addEventListener('click', () => loadExample('datos/iris.csv', 'iris.csv'));
  el('exampleSim').addEventListener('click', loadSimulated);

  /* tarjetas de escalado */
  const syncScaleLabel = () => {
    els('.opt-card').forEach(c => c.classList.toggle('selected', c.querySelector('input').checked));
    const chk = document.querySelector('input[name="scaling"]:checked');
    if (chk && el('scaleLabel')) el('scaleLabel').textContent = tt(chk.dataset.label);
  };
  els('input[name="scaling"]').forEach(r => r.addEventListener('change', syncScaleLabel));
  /* al cambiar de idioma, data-i18n-auto reescribe el parrafo entero: hay que
     volver a poner la etiqueta de la opcion realmente elegida */
  if (typeof I18N !== 'undefined') I18N.onChange.push(syncScaleLabel);

  el('processBtn').addEventListener('click', () => {
    clearMessages('prepMessages');
    const btn = el('processBtn');
    btn.disabled = true; btn.innerHTML = '<span class="loading"></span> ' + tt('Calculando…');
    setTimeout(() => {
      try {
        if (prepare()) {
          if (state.transWarn.length) showMessage('prepMessages', 'warning',
            TT(`La transformación pedida requiere valores positivos; se desplazaron automáticamente las variables <b>${state.transWarn.join(', ')}</b> sumando una constante antes de transformar.`,
            `The requested transformation requires positive values; the variables <b>${state.transWarn.join(', ')}</b> were automatically shifted by a constant before transforming.`));
          state.diagnostics = diagnose();
          renderResults();
          el('resultsWrap').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      } catch (err) {
        showMessage('prepMessages', 'error', tt('Error en el cálculo: ') + err.message);
        console.error(err);
      }
      btn.disabled = false; btn.textContent = tt('Preparar matriz y diagnosticar →');
    }, 30);
  });

  el('goStep2').addEventListener('click', () => goStep(2));
  el('dlPrepared').addEventListener('click', downloadPrepared);
  el('dlCorr').addEventListener('click', downloadCorr);
  el('dlSummary').addEventListener('click', downloadSummary);
  el('dlReport').addEventListener('click', downloadReport);

  el('bulkActive').addEventListener('click', () => {
    state.columns.forEach(c => { if (c.kind === 'numeric' && !c.constant) c.role = 'active'; });
    renderVarTable(); renderPreview();
  });
  el('bulkNone').addEventListener('click', () => {
    state.columns.forEach(c => { if (c.role === 'active') c.role = 'supp-num'; });
    renderVarTable(); renderPreview();
  });
  el('bulkReset').addEventListener('click', () => {
    state.columns = profileColumns(state.rawHeader, state.rawRows, el('decimalSel').value);
    renderVarTable(); renderPreview();
  });

  els('.step-btn').forEach(b => b.addEventListener('click', () => { if (!b.disabled) goStep(b.dataset.step); }));
}

function loadExample(path, name) {
  clearMessages('dataMessages');
  showMessage('dataMessages', 'info', '<span class="loading"></span> ' + tt('Cargando ejemplo…'));
  fetch(path).then(r => {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.text();
  }).then(txt => {
    const rows = parseCSV(txt);
    const hdr = rows.shift().map(h => String(h).trim());
    afterLoad(hdr, rows, name);
  }).catch(e => {
    clearMessages('dataMessages');
    showMessage('dataMessages', 'error',
      TT('No se pudo cargar el ejemplo (' + e.message + '). Si abriste el archivo con doble clic, usa <b>servidor.ps1</b> para servir la carpeta por http://localhost:8790.',
      'The example could not be loaded (' + e.message + '). If you opened the file by double-clicking it, use <b>servidor.ps1</b> to serve the folder at http://localhost:8790.'));
  });
}

/* Conjunto SIMULADO (no son datos reales): 120 individuos, 3 factores latentes
   que generan 9 variables morfométricas en unidades muy distintas, con algo de
   asimetría y unos pocos vacíos. Sirve para ver cómo responden KMO, Bartlett y
   el diagnóstico de escalas. */
function loadSimulated() {
  let seed = 20260905;
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const gauss = () => {
    let u = 0, v = 0;
    while (u === 0) u = rnd(); while (v === 0) v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const grupos = ['Sitio A', 'Sitio B', 'Sitio C'];
  const header = ['ID', 'Sitio', 'Largo_hoja_mm', 'Ancho_hoja_mm', 'Area_foliar_mm2',
    'Peso_seco_g', 'Grosor_lamina_um', 'Densidad_estomas_mm2', 'Longitud_peciolo_mm',
    'Clorofila_SPAD', 'Altura_planta_cm'];
  const rows = [];
  for (let i = 0; i < 120; i++) {
    const g = Math.floor(i / 40);
    const tam = gauss() + (g - 1) * 1.1;          // factor 1: tamaño
    const gro = gauss() + (g === 2 ? 0.8 : 0);    // factor 2: robustez/grosor
    const fis = gauss();                          // factor 3: fisiología
    const e = () => gauss() * 0.45;
    const largo = 78 + 14 * tam + e() * 6;
    const ancho = 41 + 7.5 * tam + 1.2 * gro + e() * 4;
    const area = 0.62 * largo * ancho * (1 + e() * 0.05);
    const peso = 0.42 + 0.11 * tam + 0.05 * gro + e() * 0.03;
    const grosor = 168 + 26 * gro + 4 * tam + e() * 9;
    const estomas = 231 - 24 * gro + 12 * fis + e() * 14;
    const peciolo = 15.6 + 3.1 * tam + e() * 1.6;
    const spad = 38.4 + 4.6 * fis + 1.1 * gro + e() * 1.9;
    const altura = 96 + 17 * tam + 6 * fis + e() * 9;
    const r = ['P' + String(i + 1).padStart(3, '0'), grupos[g],
      largo.toFixed(2), ancho.toFixed(2), area.toFixed(1), peso.toFixed(3),
      grosor.toFixed(1), estomas.toFixed(1), peciolo.toFixed(2), spad.toFixed(1), altura.toFixed(1)];
    if (i === 17 || i === 63) r[7] = '';          // dos vacíos
    if (i === 88) r[5] = 'NA';
    rows.push(r);
  }
  afterLoad(header, rows, 'ejemplo_simulado_morfometria.csv');
  showMessage('dataMessages', 'warning',
    tt('Ojo: este conjunto es <b>simulado</b> (generado por la propia app a partir de 3 factores latentes). Sirve para explorar la plataforma, no para reportar resultados.'));
}

document.addEventListener('DOMContentLoaded', init);
window.PCAProData = { parseCSV, profileColumns, prepare, diagnose };
})();

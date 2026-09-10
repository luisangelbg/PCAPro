/* PCAPro — análisis de componentes principales en el navegador.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán
   GPL-3.0-or-later — véase LICENSE en la raíz del repositorio. */

/* Bloque de entrada: portada, recorrido y tarjetas de cada bloque.
   El arte se dibuja aquí en SVG, sin pasar por figure.js, para que la portada
   aparezca aunque el resto de la aplicación todavía no haya corrido nada. */

(function () {

/* Generador reproducible: la portada se ve igual en cada visita. */
function rng(semilla) {
  let s = semilla >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
function normal(r) {
  return Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
}

const VIO = '#5b3fd6', TEA = '#0d9488', ORA = '#e8890c';

/* ---------- mapa de individuos ---------- */
function mapaArt() {
  const r = rng(20260909);
  const grupos = [
    { c: [-58, 12], sx: 14, sy: 20, col: VIO },
    { c: [18, -18], sx: 19, sy: 19, col: TEA },
    { c: [62, 16], sx: 21, sy: 21, col: ORA },
  ];
  let pts = '', eli = '';
  grupos.forEach(g => {
    for (let i = 0; i < 24; i++) {
      const x = 150 + g.c[0] + normal(r) * g.sx;
      const y = 104 - g.c[1] - normal(r) * g.sy;
      pts += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="3.5" fill="' + g.col + '" fill-opacity="0.8"/>';
    }
    eli += '<ellipse cx="' + (150 + g.c[0]) + '" cy="' + (104 - g.c[1]) + '" rx="' + (g.sx * 2.1).toFixed(1) +
           '" ry="' + (g.sy * 2.1).toFixed(1) + '" fill="' + g.col + '" fill-opacity="0.07" stroke="' + g.col +
           '" stroke-opacity="0.45" stroke-width="1.2"/>';
  });
  return '<line x1="18" y1="104" x2="284" y2="104" class="art-ax"/>' +
         '<line x1="150" y1="6" x2="150" y2="200" class="art-ax"/>' + eli + pts;
}

/* ---------- círculo de correlaciones ---------- */
function circuloArt() {
  const vars = [
    ['Longitud', 0.93, 0.21], ['Anchura', 0.78, -0.44], ['Peso', 0.88, 0.34],
    ['pH', -0.52, 0.71], ['Materia org.', -0.36, -0.80],
  ];
  const R = 74, cx = 132, cy = 104;
  let s = '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="none" class="art-ax"/>' +
          '<line x1="' + (cx - R - 8) + '" y1="' + cy + '" x2="' + (cx + R + 8) + '" y2="' + cy + '" class="art-ax"/>' +
          '<line x1="' + cx + '" y1="' + (cy - R - 8) + '" x2="' + cx + '" y2="' + (cy + R + 8) + '" class="art-ax"/>';
  vars.forEach(v => {
    const nom = tt(v[0]), a = v[1], b = v[2];
    const x = cx + a * R, y = cy - b * R, col = a > 0 ? VIO : TEA;
    s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + x.toFixed(1) + '" y2="' + y.toFixed(1) +
         '" stroke="' + col + '" stroke-width="2" stroke-linecap="round"/>' +
         '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="2.6" fill="' + col + '"/>' +
         '<text x="' + (x + (a > 0 ? 6 : -6)).toFixed(1) + '" y="' + (y + (b > 0 ? -6 : 12)).toFixed(1) +
         '" text-anchor="' + (a > 0 ? 'start' : 'end') + '" font-size="8.5" class="art-mut">' + nom + '</text>';
  });
  return s;
}

/* ---------- sedimentación con el corte del consenso ---------- */
function screeArt() {
  const lam = [3.42, 1.86, 0.94, 0.51, 0.32, 0.21, 0.14, 0.09];
  const x0 = 26, y0 = 150, w = 30, gap = 10, esc = 30;
  let barras = '', linea = '';
  lam.forEach((v, i) => {
    const h = v * esc, x = x0 + i * (w + gap), dentro = i < 2;
    barras += '<rect x="' + x + '" y="' + (y0 - h).toFixed(1) + '" width="' + w + '" height="' + h.toFixed(1) +
              '" rx="5" fill="' + (dentro ? VIO : 'var(--border-strong)') + '" fill-opacity="' + (dentro ? 0.9 : 0.6) + '"/>';
    linea += (i ? 'L' : 'M') + (x + w / 2).toFixed(1) + ',' + (y0 - h).toFixed(1);
  });
  const corte = x0 + 2 * (w + gap) - gap / 2;
  const chips = ['Horn', 'Kaiser', 'Bastón roto', 'MAP', '70 %', 'Codo', 'Jolliffe', '80 %'];
  let etiq = '';
  chips.forEach((c, i) => {
    const x = 372 + (i % 2) * 122, y = 46 + Math.floor(i / 2) * 26;
    etiq += '<circle cx="' + x + '" cy="' + (y - 3.5) + '" r="3.6" fill="' + (i < 5 ? VIO : TEA) + '"/>' +
            '<text x="' + (x + 10) + '" y="' + y + '" font-size="9.5" class="art-mut">' + tt(c) + '</text>';
  });
  return '<line x1="18" y1="' + y0 + '" x2="340" y2="' + y0 + '" class="art-ax"/>' + barras +
         '<path d="' + linea + '" fill="none" stroke="' + TEA + '" stroke-width="1.8" stroke-opacity="0.85"/>' +
         '<line x1="' + corte + '" y1="30" x2="' + corte + '" y2="' + (y0 + 6) + '" stroke="' + TEA +
         '" stroke-width="1.6" stroke-dasharray="5 4"/>' +
         '<text x="' + (corte + 7) + '" y="40" font-size="9.5" fill="' + TEA + '" font-weight="600">' +
         tt('corte del consenso') + '</text>' + etiq;
}

function heroArt() {
  return '<svg viewBox="0 0 640 470" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' +
    tt('Mapa de individuos, círculo de correlaciones y criterios de retención') + '">' +
    '<g transform="translate(6,8)"><rect width="310" height="216" rx="14" class="art-card"/>' +
      '<text x="16" y="24" font-size="10" font-weight="600" class="art-mut">' + tt('Mapa de individuos') + '</text>' +
      '<g transform="translate(6,22)">' + mapaArt() + '</g></g>' +
    '<g transform="translate(324,8)"><rect width="310" height="216" rx="14" class="art-card"/>' +
      '<text x="16" y="24" font-size="10" font-weight="600" class="art-mut">' + tt('Círculo de correlaciones') + '</text>' +
      '<g transform="translate(12,22)">' + circuloArt() + '</g></g>' +
    '<g transform="translate(6,236)"><rect width="628" height="226" rx="14" class="art-card"/>' +
      '<text x="16" y="26" font-size="10" font-weight="600" class="art-mut">' +
      tt('¿Cuántos componentes retener? Ocho criterios, no uno') + '</text>' +
      '<g transform="translate(6,26)">' + screeArt() + '</g></g>' +
    '</svg>';
}

/* ---------- recorrido y tarjetas ---------- */
const PASOS = [
  ['Datos y supuestos', 'tipos, escalado, faltantes, KMO y Bartlett'],
  ['Extracción', 'valores propios y ocho criterios de retención'],
  ['Rotación', 'siete métodos, y cuándo conviene no rotar'],
  ['Gráficos factoriales', 'círculo, individuos, biplot, cos² y contribuciones'],
  ['Interpretación', 'nombrar ejes, valores test, comparación de grupos'],
  ['Informe', 'HTML, PDF y paquete ZIP con figuras y tablas'],
];

const BLOQUES = [
  ['Datos y supuestos',
   'Lee xlsx, csv y json. Detecta el tipo de cada columna y te la devuelve para que la revises: solo las numéricas activas construyen los componentes. Trata faltantes, transforma, escala de seis maneras y diagnostica la matriz antes de tocar nada.'],
  ['Extracción',
   'Valores propios con su error estándar, varianza explicada y acumulada, y los ocho criterios lado a lado con la cantidad que decide cada uno. El consenso es una recomendación; el número lo fijas tú.'],
  ['Rotación',
   'Cuatro rotaciones ortogonales y tres oblicuas por proyección de gradiente, con las matrices de patrón y estructura. Abre advirtiendo que la rotación pertenece al análisis factorial y que hay que declararla.'],
  ['Gráficos factoriales',
   'Círculo de correlaciones, mapa de individuos y biplot, con cos² y contribuciones para saber a qué puntos hacer caso. Proyecta variables y categorías suplementarias sin que intervengan en los ejes.'],
  ['Interpretación',
   'Umbral de carga ajustable, descripción de cada dimensión, valores test por categoría, comparación de grupos e individuos característicos. Redacta un borrador con tus propios números, para que lo revises.'],
  ['Informe',
   'Informe HTML autocontenido, impresión a PDF y paquete ZIP con las figuras tal como las editaste, las tablas en CSV y la referencia para citar la plataforma.'],
];

function pintar() {
  const wf = el('workflow');
  if (wf) wf.innerHTML = PASOS.map((p, i) =>
    '<div class="wf-step" data-ir="' + (i + 1) + '">' +
      '<div class="wf-n">' + tt('PASO') + ' ' + (i + 1) + '</div>' +
      '<div class="wf-t">' + tt(p[0]) + '</div>' +
      '<div class="wf-d">' + tt(p[1]) + '</div></div>').join('');

  const fg = el('featureGrid');
  if (fg) fg.innerHTML = BLOQUES.map((b, i) =>
    '<button class="feat" data-ir="' + (i + 1) + '" type="button">' +
      '<span class="feat-n">' + (i + 1) + '</span>' +
      '<span><span class="feat-t">' + tt(b[0]) + '</span>' +
      '<span class="feat-d">' + tt(b[1]) + '</span></span></button>').join('');

  els('[data-ir]').forEach(e => e.addEventListener('click', () => {
    const n = Number(e.dataset.ir);
    const b = document.querySelector('.step-btn[data-step="' + n + '"]');
    if (b && !b.disabled) goStep(n); else goStep(1);
  }));

  const art = el('heroArt');
  if (art) art.innerHTML = heroArt();

  const ref = el('homeCiteRef');
  if (ref && typeof Rep !== 'undefined') ref.innerHTML = Rep.CITATION.apa;
}

function init() {
  if (!el('panel-0')) return;
  pintar();

  el('startBtn').addEventListener('click', () => goStep(1));
  el('brandLink').addEventListener('click', e => { e.preventDefault(); goStep(0); });

  el('theoryBtn').addEventListener('click', () => {
    goStep(1);
    const acc = document.querySelector('#panel-1 details.acc');
    if (acc) { acc.open = true; setTimeout(() => acc.scrollIntoView({ behavior: 'smooth', block: 'start' }), 90); }
  });

  el('demoBtn').addEventListener('click', () => {
    goStep(1);
    const b = el('exampleIris');
    if (b) { b.click(); setTimeout(() => b.scrollIntoView({ behavior: 'smooth', block: 'center' }), 140); }
  });

  const cc = el('copyCiteHome');
  if (cc) cc.addEventListener('click', () => copyToClipboard('copyCiteHome', el('homeCiteRef').textContent));

  /* El arte y las tarjetas se generan con tt() al dibujarse, no con data-i18n:
     hay que volver a pintarlos cuando cambie el idioma. */
  if (typeof I18N !== 'undefined') I18N.onChange.push(pintar);
}

document.addEventListener('DOMContentLoaded', init);
})();

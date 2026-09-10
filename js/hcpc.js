/* PCAPro — análisis de componentes principales en el navegador.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán
   GPL-3.0-or-later — véase LICENSE en la raíz del repositorio. */

/* HCPC — agrupamiento jerárquico sobre componentes principales.
 * Husson, Josse y Pagès.
 *
 * La idea: agrupar sobre las primeras coordenadas factoriales en vez de sobre
 * las variables originales. Tiene dos ventajas que se notan en datos reales.
 * La primera es que los ejes que se descartan suelen ser ruido, así que el
 * agrupamiento se hace sobre una versión limpia de la tabla. La segunda es que
 * funciona igual con cualquier tipo de dato: sobre las coordenadas de un ACM o
 * de un AFDM se puede agrupar con distancia euclídea aunque las variables
 * originales sean cualitativas, que de otro modo obligaría a elegir un
 * coeficiente de similitud.
 *
 * El procedimiento es Ward sobre las coordenadas, un corte, y —opcionalmente—
 * una consolidación por k-medias que parte de los centros de ese corte.
 *
 * Igual que en el bloque 2 con los criterios de retención, aquí no se ofrece
 * un único número de grupos: se calculan tres reglas y se muestra su acuerdo o
 * su desacuerdo, que es la información honesta.
 */

const HCPC = {};

/* ============================================================
   Ward sobre puntos ponderados
   ============================================================
   El criterio de Ward agrega los dos grupos cuya unión menos aumenta la
   inercia intra:
       Δ(A,B) = (w_A · w_B)/(w_A + w_B) · d²(g_A, g_B)
   con g los centroides y w las masas. Con pesos uniformes se reduce al Ward
   clásico. Se mantiene un vecino más próximo por grupo para no rehacer el
   barrido completo en cada fusión.
   ============================================================ */
HCPC.ward = function (X, w) {
  const n = X.length, p = X[0].length;
  w = w || new Array(n).fill(1 / n);

  const cen = X.map(r => r.slice());          // centroide de cada grupo activo
  const masa = w.slice();
  const vivos = new Array(n).fill(true);
  const miembros = X.map((_, i) => [i]);

  const delta = (a, b) => {
    let d2 = 0;
    for (let j = 0; j < p; j++) { const t = cen[a][j] - cen[b][j]; d2 += t * t; }
    return masa[a] * masa[b] / (masa[a] + masa[b]) * d2;
  };

  /* vecino más próximo de cada grupo, con su distancia */
  const nn = new Array(n).fill(-1), nd = new Array(n).fill(Infinity);
  const recalcNN = a => {
    let mejor = -1, md = Infinity;
    for (let b = 0; b < n; b++) {
      if (b === a || !vivos[b]) continue;
      const d = delta(a, b);
      if (d < md) { md = d; mejor = b; }
    }
    nn[a] = mejor; nd[a] = md;
  };
  for (let i = 0; i < n; i++) recalcNN(i);

  const merges = [];                           // [a, b, altura, tamaño]
  for (let paso = 0; paso < n - 1; paso++) {
    let a = -1, md = Infinity;
    for (let i = 0; i < n; i++) if (vivos[i] && nd[i] < md) { md = nd[i]; a = i; }
    const b = nn[a];

    /* fusiona b dentro de a */
    const ma = masa[a], mb = masa[b], mt = ma + mb;
    for (let j = 0; j < p; j++) cen[a][j] = (ma * cen[a][j] + mb * cen[b][j]) / mt;
    masa[a] = mt;
    miembros[a] = miembros[a].concat(miembros[b]);
    vivos[b] = false;
    merges.push({ a, b, altura: md, n: miembros[a].length, miembros: miembros[a].slice() });

    /* solo hay que rehacer el vecino de quien apuntaba a los fusionados */
    for (let i = 0; i < n; i++) {
      if (!vivos[i]) continue;
      if (i === a || nn[i] === a || nn[i] === b) recalcNN(i);
      else {
        const d = delta(i, a);
        if (d < nd[i]) { nd[i] = d; nn[i] = a; }
      }
    }
  }

  return { merges, alturas: merges.map(m => m.altura), n };
};

/* Corta el árbol en q grupos: se deshacen las q-1 últimas fusiones. */
HCPC.corta = function (arbol, q) {
  const n = arbol.n;
  if (q < 1 || q > n) throw new Error('Número de grupos fuera de rango.');
  const grupo = new Array(n).fill(-1);
  /* Las fusiones hasta n-q construyen los grupos del corte. */
  const activo = [];
  const usado = new Array(n).fill(false);
  for (let i = arbol.merges.length - q; i >= 0; i--) {
    const m = arbol.merges[i];
    if (m.miembros.some(x => usado[x])) continue;
    activo.push(m.miembros);
    m.miembros.forEach(x => { usado[x] = true; });
  }
  for (let i = 0; i < n; i++) if (!usado[i]) { activo.push([i]); usado[i] = true; }
  activo.sort((A, B) => Math.min(...A) - Math.min(...B));
  activo.forEach((ms, g) => ms.forEach(i => { grupo[i] = g; }));
  return grupo;
};

/* ============================================================
   Inercias de una partición
   ============================================================ */
HCPC.inercias = function (X, w, grupo) {
  const n = X.length, p = X[0].length;
  const q = Math.max(...grupo) + 1;
  const g0 = new Array(p).fill(0);
  let W = 0;
  for (let i = 0; i < n; i++) { W += w[i]; for (let j = 0; j < p; j++) g0[j] += w[i] * X[i][j]; }
  for (let j = 0; j < p; j++) g0[j] /= W;

  const cen = Array.from({ length: q }, () => new Array(p).fill(0));
  const masa = new Array(q).fill(0);
  for (let i = 0; i < n; i++) {
    masa[grupo[i]] += w[i];
    for (let j = 0; j < p; j++) cen[grupo[i]][j] += w[i] * X[i][j];
  }
  for (let g = 0; g < q; g++) for (let j = 0; j < p; j++) if (masa[g] > 0) cen[g][j] /= masa[g];

  let intra = 0, entre = 0, total = 0;
  for (let i = 0; i < n; i++) {
    let a = 0, b = 0;
    for (let j = 0; j < p; j++) {
      const u = X[i][j] - cen[grupo[i]][j]; a += u * u;
      const v = X[i][j] - g0[j]; b += v * v;
    }
    intra += w[i] * a; total += w[i] * b;
  }
  for (let g = 0; g < q; g++) {
    let d = 0;
    for (let j = 0; j < p; j++) { const u = cen[g][j] - g0[j]; d += u * u; }
    entre += masa[g] * d;
  }
  return { intra, entre, total, cen, masa, media: g0, ratio: total > 0 ? entre / total : 0 };
};

/* ============================================================
   Cuántos grupos: tres reglas, no una
   ============================================================ */
HCPC.criterios = function (X, w, arbol, qmax) {
  const n = arbol.n;
  qmax = Math.min(qmax || 10, n - 1);
  const alt = arbol.alturas;                  // en orden creciente de fusión

  /* altura de la fusión que hay que deshacer para pasar de q-1 a q grupos */
  const salto = [];
  for (let q = 2; q <= qmax; q++) salto.push({ q, altura: alt[alt.length - q + 1] });

  /* regla 1 — mayor salto absoluto entre alturas consecutivas */
  let mejorSalto = 2, maxS = -Infinity;
  for (let q = 2; q <= qmax; q++) {
    const h1 = alt[alt.length - q + 1], h0 = alt[alt.length - q];
    const s = h1 - h0;
    if (s > maxS) { maxS = s; mejorSalto = q; }
  }

  /* regla 2 — mayor pérdida relativa de inercia (la de Husson y Josse) */
  let mejorRel = 2, maxR = -Infinity;
  for (let q = 2; q <= qmax; q++) {
    const h1 = alt[alt.length - q + 1], h0 = alt[alt.length - q];
    const r = h0 > 0 ? (h1 - h0) / h0 : 0;
    if (r > maxR) { maxR = r; mejorRel = q; }
  }

  /* regla 3 — máxima silueta media sobre las coordenadas */
  const sils = [];
  for (let q = 2; q <= qmax; q++) sils.push({ q, s: HCPC.silueta(X, HCPC.corta(arbol, q)) });
  const mejorSil = sils.reduce((a, b) => (b.s > a.s ? b : a)).q;

  /* consenso: la moda; si las tres discrepan, la regla relativa decide */
  const votos = {};
  [mejorSalto, mejorRel, mejorSil].forEach(v => { votos[v] = (votos[v] || 0) + 1; });
  let consenso = mejorRel, mv = 0;
  Object.entries(votos).forEach(([k, v]) => { if (v > mv) { mv = v; consenso = +k; } });

  return {
    qmax, salto,
    reglas: [
      { id: 'salto', nombre: 'Mayor salto de altura', q: mejorSalto,
        nota: 'la fusión más costosa del árbol' },
      { id: 'relativa', nombre: 'Mayor pérdida relativa de inercia', q: mejorRel,
        nota: 'la regla de Husson y Josse' },
      { id: 'silueta', nombre: 'Máxima silueta media', q: mejorSil,
        nota: 'compara cohesión y separación' },
    ],
    siluetas: sils,
    consenso, acuerdo: mv === 3,
  };
};

/* Silueta media sobre las coordenadas factoriales. */
HCPC.silueta = function (X, grupo) {
  const n = X.length, p = X[0].length;
  const q = Math.max(...grupo) + 1;
  if (q < 2) return 0;
  const d = (i, j) => { let s = 0; for (let k = 0; k < p; k++) { const t = X[i][k] - X[j][k]; s += t * t; } return Math.sqrt(s); };
  const tam = new Array(q).fill(0);
  grupo.forEach(g => tam[g]++);
  let suma = 0;
  for (let i = 0; i < n; i++) {
    if (tam[grupo[i]] <= 1) continue;
    const acum = new Array(q).fill(0);
    for (let j = 0; j < n; j++) if (j !== i) acum[grupo[j]] += d(i, j);
    const a = acum[grupo[i]] / (tam[grupo[i]] - 1);
    let b = Infinity;
    for (let g = 0; g < q; g++) if (g !== grupo[i] && tam[g] > 0) b = Math.min(b, acum[g] / tam[g]);
    suma += (b - a) / Math.max(a, b);
  }
  return suma / n;
};

/* ============================================================
   Consolidación por k-medias
   ============================================================
   Parte de los centros del corte. Nunca puede empeorar la inercia intra: si lo
   hiciera, sería un error de implementación, y la suite lo comprueba.
   ============================================================ */
HCPC.consolida = function (X, w, grupo, maxIter) {
  const n = X.length, p = X[0].length;
  let g = grupo.slice();
  const q = Math.max(...g) + 1;
  maxIter = maxIter || 30;
  let iter = 0, cambios = 0;

  for (; iter < maxIter; iter++) {
    const { cen } = HCPC.inercias(X, w, g);
    cambios = 0;
    for (let i = 0; i < n; i++) {
      let mejor = g[i], md = Infinity;
      for (let c = 0; c < q; c++) {
        let d2 = 0;
        for (let j = 0; j < p; j++) { const t = X[i][j] - cen[c][j]; d2 += t * t; }
        if (d2 < md) { md = d2; mejor = c; }
      }
      if (mejor !== g[i]) { g[i] = mejor; cambios++; }
    }
    if (!cambios) break;
  }
  /* si alguna clase se vacía, se renumera para no dejar huecos */
  const usados = [...new Set(g)].sort((a, b) => a - b);
  const mapa = new Map(usados.map((v, i) => [v, i]));
  g = g.map(v => mapa.get(v));
  return { grupo: g, iteraciones: iter, convergio: cambios === 0 };
};

/* ============================================================
   Descripción de los grupos
   ============================================================ */

/* Valor test de una variable cuantitativa en un grupo: cuántas desviaciones
   típicas se aparta la media del grupo de la media general, bajo muestreo sin
   reemplazo. Por encima de |2| se considera característica. */
HCPC.vtest = function (x, grupo) {
  const n = x.length, q = Math.max(...grupo) + 1;
  const media = S.mean(x);
  const varTot = x.reduce((a, v) => a + (v - media) * (v - media), 0) / n;
  const out = [];
  for (let g = 0; g < q; g++) {
    const idx = []; for (let i = 0; i < n; i++) if (grupo[i] === g) idx.push(i);
    const ng = idx.length;
    const mg = idx.reduce((a, i) => a + x[i], 0) / ng;
    const den = Math.sqrt(varTot / ng * (n - ng) / (n - 1));
    const v = den > 0 ? (mg - media) / den : 0;
    out.push({ grupo: g, n: ng, media: mg, mediaGeneral: media, vtest: v, p: 2 * (1 - S.normalCDF(Math.abs(v))) });
  }
  return out;
};

/* Valor test de una categoría en un grupo: compara la proporción de la
   categoría dentro del grupo con la que tiene en el conjunto. */
HCPC.vtestCat = function (c, grupo) {
  const n = c.length, q = Math.max(...grupo) + 1;
  const niveles = [...new Set(c)];
  const out = [];
  niveles.forEach(v => {
    const nv = c.reduce((a, x) => a + (x === v ? 1 : 0), 0);
    for (let g = 0; g < q; g++) {
      const idx = []; for (let i = 0; i < n; i++) if (grupo[i] === g) idx.push(i);
      const ng = idx.length;
      const nvg = idx.reduce((a, i) => a + (c[i] === v ? 1 : 0), 0);
      const esp = ng * nv / n;
      const den = Math.sqrt(ng * (nv / n) * (1 - nv / n) * (n - ng) / (n - 1));
      const vt = den > 0 ? (nvg - esp) / den : 0;
      out.push({
        categoria: v, grupo: g, nEnGrupo: nvg, nGrupo: ng, nTotal: nv,
        pctGrupo: 100 * nvg / ng, pctGlobal: 100 * nv / n,
        vtest: vt, p: 2 * (1 - S.normalCDF(Math.abs(vt))),
      });
    }
  });
  return out;
};

/* Paragones: los individuos más cercanos al centro de su grupo, es decir los
   ejemplares que mejor lo representan. Y los específicos: los más alejados del
   resto de los centros, que son los casos que menos se confunden. */
HCPC.paragones = function (X, grupo, cuantos) {
  const n = X.length, p = X[0].length;
  const q = Math.max(...grupo) + 1;
  cuantos = cuantos || 5;
  const { cen } = HCPC.inercias(X, new Array(n).fill(1 / n), grupo);
  const d2 = (i, c) => { let s = 0; for (let j = 0; j < p; j++) { const t = X[i][j] - cen[c][j]; s += t * t; } return s; };

  const para = [], espec = [];
  for (let g = 0; g < q; g++) {
    const idx = []; for (let i = 0; i < n; i++) if (grupo[i] === g) idx.push(i);
    para.push(idx.map(i => ({ i, d: Math.sqrt(d2(i, g)) }))
      .sort((a, b) => a.d - b.d).slice(0, cuantos));
    espec.push(idx.map(i => {
      let m = Infinity;
      for (let c = 0; c < q; c++) if (c !== g) m = Math.min(m, d2(i, c));
      return { i, d: Math.sqrt(m) };
    }).sort((a, b) => b.d - a.d).slice(0, cuantos));
  }
  return { paragones: para, especificos: espec };
};

/* ============================================================
   El procedimiento completo
   ============================================================
   res: salida de cualquiera de los métodos (ACP, AC, ACM, AFDM, AFM)
   ============================================================ */
HCPC.run = function (res, opt) {
  opt = opt || {};
  const k = opt.ejes || Math.min(res.k, 5);
  const X = res.rowCoord.map(f => f.slice(0, k));
  const w = res.rowW ? res.rowW.slice() : new Array(X.length).fill(1 / X.length);

  const arbol = HCPC.ward(X, w);
  const crit = HCPC.criterios(X, w, arbol, opt.qmax);
  const q = opt.q || crit.consenso;

  const corte = HCPC.corta(arbol, q);
  const antes = HCPC.inercias(X, w, corte);

  let grupo = corte, cons = null, despues = antes;
  if (opt.consolidar !== false) {
    cons = HCPC.consolida(X, w, corte);
    grupo = cons.grupo;
    despues = HCPC.inercias(X, w, grupo);
  }

  return {
    tipo: 'hcpc', ejes: k, q: Math.max(...grupo) + 1,
    arbol, criterios: crit,
    grupoAntes: corte, grupo,
    inerciaAntes: antes, inercia: despues,
    consolidacion: cons,
    coords: X, pesos: w,
    ...HCPC.paragones(X, grupo, opt.paragones || 5),
  };
};

/* Doble salida: <script> en el navegador y require en Node. */
if (typeof require === 'function' && typeof S === 'undefined') global.S = require('./stats.js');
if (typeof module !== 'undefined' && module.exports) module.exports = HCPC;
if (typeof window !== 'undefined') window.HCPC = HCPC;

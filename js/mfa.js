/* PCAPro — análisis de componentes principales en el navegador.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán
   GPL-3.0-or-later — véase LICENSE en la raíz del repositorio. */

/* Análisis factorial múltiple (AFM) — Escofier y Pagès (1994).
 *
 * El caso que resuelve es corriente en biología y agronomía: sobre los mismos
 * individuos —especies, parcelas, tratamientos— se miden varios bloques de
 * variables, digamos morfología, química del suelo y clima. Juntarlos en un
 * único ACP deja mandar al bloque que traiga más columnas, que es un accidente
 * del diseño de muestreo y no un hecho biológico.
 *
 * El AFM lo corrige con una idea simple: analizar cada grupo por separado y
 * dividir sus columnas entre su primer valor singular. Así ningún grupo puede
 * aportar más de 1 a la inercia del primer eje, y todos entran con el mismo
 * peso máximo con independencia de cuántas variables tengan. Después se corre
 * un análisis global ponderado sobre la concatenación.
 *
 * Además del mapa habitual, el AFM da dos lecturas que no existen en el ACP:
 *
 *   - los puntos parciales: dónde quedaría cada individuo si solo se mirara un
 *     grupo. El punto global es su baricentro, y la dispersión entre parciales
 *     dice hasta qué punto los bloques cuentan la misma historia;
 *   - los coeficientes Lg y RV entre grupos, que miden cuánta estructura
 *     comparten dos bloques.
 */

const MFA = {};


/* grupos: [{ nombre, tipo: 'quant'|'qual', cols: [...], nombres: [...] }] */
MFA.run = function (grupos) {
  if (!grupos || !grupos.length) throw new Error('El AFM necesita al menos un grupo.');
  const n = grupos[0].cols[0].length;
  grupos.forEach(g => {
    if (!g.cols || !g.cols.length) throw new Error('El grupo "' + g.nombre + '" no tiene variables.');
    g.cols.forEach(c => { if (c.length !== n) throw new Error('Todos los grupos deben tener las mismas filas.'); });
  });

  const rw = new Array(n).fill(1 / n);

  /* ---------- 1. análisis separado de cada grupo ---------- */
  const bloques = [];
  grupos.forEach((g, gi) => {
    const cols = [], etiq = [], catDe = [], niveles = [];

    if (g.tipo === 'qual') {
      /* codificación del ACM dentro del AFM: indicadora entre la raíz de la
         proporción, igual que en el AFDM */
      g.cols.forEach((c, j) => {
        const ns = [...new Set(c)];
        niveles.push(ns);
        ns.forEach(v => {
          const p = c.reduce((a, x) => a + (x === v ? 1 : 0), 0) / n;
          cols.push(c.map(x => (x === v ? 1 : 0) / Math.sqrt(p)));
          etiq.push(v); catDe.push(j);
        });
      });
    } else {
      g.cols.forEach((c, j) => {
        const m = S.mean(c), s = GSV.sdPob(c);
        if (!(s > 0)) throw new Error('La variable "' + ((g.nombres || [])[j] || '') + '" es constante.');
        cols.push(c.map(v => (v - m) / s));
        etiq.push((g.nombres || [])[j] || g.nombre + '.' + (j + 1));
      });
    }

    const Xg = [];
    for (let i = 0; i < n; i++) Xg.push(cols.map(c => c[i]));
    const sep = GSV.core(Xg, rw, new Array(cols.length).fill(1), { method: 'grupo' });

    bloques.push({
      nombre: g.nombre, tipo: g.tipo || 'quant',
      cols, etiq, catDe, niveles, indice: gi,
      separado: sep,
      lambda1: sep.values[0],
      peso: sep.values[0] > 0 ? 1 / sep.values[0] : 0,   // 1 / primer valor propio
    });
  });

  /* ---------- 2. análisis global ponderado ---------- */
  const todasCols = [], pesos = [], grupoDe = [], etiqTodas = [], tipoTodas = [];
  bloques.forEach(b => b.cols.forEach((c, j) => {
    todasCols.push(c); pesos.push(b.peso); grupoDe.push(b.indice);
    etiqTodas.push(b.etiq[j]); tipoTodas.push(b.tipo);
  }));

  const X = [];
  for (let i = 0; i < n; i++) X.push(todasCols.map(c => c[i]));
  const res = GSV.core(X, rw, pesos, { method: 'mfa' });

  res.tipo = 'mfa';
  res.grupos = bloques.map(b => ({
    nombre: b.nombre, tipo: b.tipo, nVar: b.cols.length,
    lambda1: b.lambda1, peso: b.peso,
    inercia: b.separado.total,
  }));
  res.grupoDe = grupoDe;
  res.etiquetas = etiqTodas;
  res.tipoCol = tipoTodas;
  res.nGrupos = bloques.length;

  const K = res.k, Gn = bloques.length;

  /* ---------- 3. puntos parciales ----------
     La coordenada global de un individuo es la suma de lo que aporta cada
     grupo; multiplicando cada aporte por el número de grupos se obtienen unos
     puntos cuyo baricentro es exactamente el punto global. */
  const Xc = X.map(r => r.map((v, j) => v - res.mean[j]));
  res.parciales = [];                          // [grupo][individuo][eje]
  bloques.forEach(b => {
    const P = [];
    for (let i = 0; i < n; i++) {
      const f = new Array(K).fill(0);
      for (let k = 0; k < K; k++) {
        let s = 0;
        for (let j = 0; j < todasCols.length; j++) {
          if (grupoDe[j] !== b.indice) continue;
          s += Xc[i][j] * Math.sqrt(pesos[j]) * res.V[k][j];
        }
        f[k] = s * Gn;
      }
      P.push(f);
    }
    res.parciales.push(P);
  });

  /* ---------- 4. inercia de cada grupo en cada eje ----------
     Ninguna puede pasar de 1: es lo que garantiza la normalización. */
  res.inerciaGrupo = bloques.map(b => {
    const fila = new Array(K).fill(0);
    for (let k = 0; k < K; k++) {
      let s = 0;
      for (let j = 0; j < todasCols.length; j++) {
        if (grupoDe[j] !== b.indice) continue;
        s += pesos[j] * res.colCoord[j][k] * res.colCoord[j][k];
      }
      fila[k] = s;
    }
    return fila;
  });

  /* ---------- 5. Lg y RV entre grupos ----------
     Lg mide la estructura común; RV es su versión normalizada a [0, 1] y es la
     que se interpreta: 0 significa que los bloques no comparten nada. */
  const prodEsc = (bi, bj) => {
    let s = 0;
    for (let a = 0; a < todasCols.length; a++) {
      if (grupoDe[a] !== bi) continue;
      for (let b2 = 0; b2 < todasCols.length; b2++) {
        if (grupoDe[b2] !== bj) continue;
        let c = 0;
        for (let i = 0; i < n; i++) c += rw[i] * Xc[i][a] * Xc[i][b2];
        s += pesos[a] * pesos[b2] * c * c;
      }
    }
    return s;
  };
  res.Lg = []; res.RV = [];
  for (let i = 0; i < Gn; i++) {
    res.Lg.push(new Array(Gn).fill(0));
    res.RV.push(new Array(Gn).fill(0));
  }
  for (let i = 0; i < Gn; i++) for (let j = i; j < Gn; j++) {
    const v = prodEsc(i, j);
    res.Lg[i][j] = res.Lg[j][i] = v;
  }
  for (let i = 0; i < Gn; i++) for (let j = 0; j < Gn; j++) {
    const den = Math.sqrt(res.Lg[i][i] * res.Lg[j][j]);
    res.RV[i][j] = den > 0 ? res.Lg[i][j] / den : 0;
  }

  /* ---------- 6. coordenadas de los grupos ----------
     Un grupo se sitúa en el mapa por su inercia en cada eje: cerca de 1 en un
     eje significa que ese eje está muy presente en ese bloque. */
  res.coordGrupo = res.inerciaGrupo.map(f => f.slice());

  return res;
};

/* Doble salida: <script> en el navegador y require en Node. */
if (typeof require === 'function' && typeof S === 'undefined') global.S = require('./stats.js');
if (typeof require === 'function' && typeof GSV === 'undefined') global.GSV = require('./gsvd.js');
if (typeof module !== 'undefined' && module.exports) module.exports = MFA;
if (typeof window !== 'undefined') window.MFA = MFA;

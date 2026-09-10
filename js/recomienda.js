/* PCAPro — análisis de componentes principales en el navegador.
   Copyright (C) 2026  Luis Ángel Barrera-Guzmán
   GPL-3.0-or-later — véase LICENSE en la raíz del repositorio. */

/* Qué método factorial corresponde a estos datos.
 *
 * El árbol de decisión por tipo de variable —cuantitativas al ACP, dos
 * cualitativas al AC, más de dos al ACM, mezcla al AFDM, grupos al AFM— es la
 * parte fácil y está en cualquier manual. Lo que casi nunca acompaña a ese
 * árbol es la comprobación de si el método elegido tiene algo que encontrar en
 * ESTOS datos, y esa es la parte que aquí se calcula:
 *
 *   - si las variables no están correlacionadas, un ACP no reduce nada;
 *   - si la tabla no se aparta de la independencia, un AC no tiene estructura
 *     que dibujar por muy bonito que salga el mapa;
 *   - si las categorías raras son muchas, dominarán el mapa del ACM y lo que
 *     se verá es su rareza, no la estructura;
 *   - si la tabla son abundancias, un ACP sobre los datos crudos produce el
 *     arco de Gauch y hay que ir al AC o transformar.
 *
 * Cada aviso lleva el número que lo motiva. Ninguno se emite "por si acaso".
 */

const REC = {};

/* umbrales, en un solo sitio para poder discutirlos */
REC.U = {
  corrDebil: 0.30,       // por debajo, no hay redundancia que resumir
  corrRedundante: 0.90,  // por encima, dos variables dicen lo mismo
  nPorVariable: 5,       // n/p mínimo cómodo
  nMinimo: 50,
  catRara: 0.02,         // categorías bajo el 2 % distorsionan el mapa
  catRaraN: 5,
  cramerDebil: 0.10,
  espMinima: 5,          // frecuencia esperada mínima en el AC
  ceros: 0.20,           // proporción de ceros típica de una tabla de abundancias
};

/* ============================================================
   Inventario de las columnas
   ============================================================ */
REC.inventario = function (columnas) {
  const act = columnas.filter(c => c.role === 'active' && c.kind === 'numeric');
  const cat = columnas.filter(c => c.role === 'supp-cat');
  const catUsable = cat.filter(c => (c.levels || []).length >= 2);
  const n = (columnas[0] && columnas[0].values) ? columnas[0].values.length : 0;
  return {
    n,
    quant: act, qual: catUsable,
    nQuant: act.length, nQual: catUsable.length,
    nId: columnas.filter(c => c.role === 'id').length,
    nExcl: columnas.filter(c => c.role === 'excluded').length,
  };
};

/* ============================================================
   ¿Parece una tabla de abundancias?
   ============================================================
   Enteros no negativos con muchos ceros: la firma de una tabla de especies por
   sitio. Sobre esos datos el ACP crudo produce el arco de Gauch, un artefacto
   que se confunde con un gradiente.
   ============================================================ */
REC.pareceAbundancia = function (quant) {
  if (quant.length < 3) return null;
  const todasEnteras = quant.every(c => c.allInt);
  const sinNegativos = quant.every(c => (c.negatives || 0) === 0);
  if (!todasEnteras || !sinNegativos) return null;
  const total = quant.reduce((a, c) => a + c.num.length, 0);
  const ceros = quant.reduce((a, c) => a + (c.zeros || 0), 0);
  const pCeros = total ? ceros / total : 0;
  if (pCeros < REC.U.ceros) return null;
  return { pCeros, ceros, total };
};

/* ============================================================
   Estructura de correlación
   ============================================================ */
REC.correlacion = function (quant) {
  if (quant.length < 2) return null;
  const X = quant.map(c => c.num);
  const R = S.corrMatrix(X);
  const pares = [], p = quant.length;
  for (let i = 0; i < p; i++) for (let j = i + 1; j < p; j++) {
    pares.push({ a: quant[i].name, b: quant[j].name, r: R[i][j] });
  }
  pares.sort((x, y) => Math.abs(y.r) - Math.abs(x.r));
  const abs = pares.map(x => Math.abs(x.r));
  const n = quant[0].num.length;
  /* Bartlett contrasta exactamente "R = I". Un solo par que cruce 0.30 por
     azar no es estructura; que Bartlett no rechace sí es ausencia de ella. */
  const bart = S.bartlett(R, n);
  return {
    R, pares,
    media: abs.reduce((a, b) => a + b, 0) / abs.length,
    fuertes: pares.filter(x => Math.abs(x.r) >= REC.U.corrDebil).length,
    redundantes: pares.filter(x => Math.abs(x.r) >= REC.U.corrRedundante),
    nPares: pares.length,
    bartlett: bart,
    sinEstructura: bart.p >= 0.05 || (abs.reduce((a, b) => a + b, 0) / abs.length < 0.20 &&
      pares.filter(x => Math.abs(x.r) >= REC.U.corrDebil).length <= 1),
  };
};

/* ============================================================
   Categorías raras: las que hunden un mapa de ACM
   ============================================================ */
REC.categoriasRaras = function (qual, n) {
  const raras = [];
  qual.forEach(c => {
    Object.entries(c.levelCounts || {}).forEach(([nivel, k]) => {
      if (k < REC.U.catRaraN || k / n < REC.U.catRara) {
        raras.push({ variable: c.name, nivel, n: k, pct: 100 * k / n });
      }
    });
  });
  return raras;
};

/* ============================================================
   ¿Los nombres sugieren grupos de variables?
   ============================================================
   En tablas reales los bloques suelen venir marcados en el nombre:
   suelo_pH, suelo_MO, morf_largo... Si el patrón está, se propone el AFM con
   esa partición ya hecha; si no, no se inventa ninguna.
   ============================================================ */
REC.detectaGrupos = function (quant) {
  if (quant.length < 6) return null;
  /* El punto queda fuera a propósito: "Sepal.Length" es cómo R nombra UNA
     variable, y partirlo por ahí inventa bloques donde no los hay. Los
     bloques declarados a mano vienen con guion bajo o guion. */
  const sep = /[_\-]/;
  const pref = new Map();
  quant.forEach(c => {
    const partes = String(c.name).split(sep);
    if (partes.length < 2 || !partes[0]) return;
    const k = partes[0].toLowerCase();
    if (!pref.has(k)) pref.set(k, []);
    pref.get(k).push(c.name);
  });
  const grupos = [...pref.entries()].filter(([, v]) => v.length >= 2);
  const cubiertas = grupos.reduce((a, [, v]) => a + v.length, 0);
  /* Hacen falta al menos dos bloques, que cubran casi toda la tabla, y que no
     sean todos de dos variables: dos parejas no son un diseño por bloques. */
  if (grupos.length < 2 || cubiertas < quant.length * 0.75) return null;
  if (!grupos.some(([, v]) => v.length >= 3)) return null;
  return grupos.map(([nombre, vars]) => ({ nombre, variables: vars }));
};

/* ============================================================
   El dictamen
   ============================================================ */
REC.analiza = function (columnas) {
  const inv = REC.inventario(columnas);
  const { n, nQuant, nQual, quant, qual } = inv;

  const cor = REC.correlacion(quant);
  const abund = REC.pareceAbundancia(quant);
  const raras = REC.categoriasRaras(qual, n);
  const grupos = REC.detectaGrupos(quant);

  const metodos = [];
  const M = (id, nombre, veredicto, razon, extra) =>
    metodos.push(Object.assign({ id, nombre, veredicto, razon }, extra || {}));

  /* ---------- ACP y AFDM: la distinción que casi nadie hace ----------
     Una variable cualitativa puede ser dos cosas distintas. Si es un factor
     de diseño —especie, tratamiento, sitio—, lo que se quiere es COMPARAR sus
     grupos sobre los ejes: va como suplementaria y el método es el ACP. Si es
     una característica más del individuo —tipo de suelo, color, presencia de
     un rasgo—, debe entrar en los ejes y el método es el AFDM. Los datos no
     dicen cuál de las dos es; lo dice la pregunta. Aquí se propone el ACP
     cuando las cualitativas son pocas frente a las cuantitativas, que es la
     firma de un factor de diseño, y se deja el AFDM a un clic. */
  const pocasCual = nQual > 0 && nQual <= 2 && nQuant >= 3;
  if (nQuant >= 2) {
    let razon;
    if (nQual === 0) {
      razon = TT(
        `Todas las variables activas son cuantitativas (${nQuant}). Es el caso para el que se diseñó el ACP.`,
        `Every active variable is quantitative (${nQuant}). This is the case PCA was designed for.`);
    } else if (pocasCual) {
      razon = TT(
        `${nQuant} cuantitativas y ${nQual === 1 ? 'una cualitativa' : nQual + ' cualitativas'}: la proporción típica de mediciones más un factor de diseño (especie, tratamiento, sitio). Si eso es la cualitativa, entra como suplementaria y colorea el mapa sin intervenir en los ejes, y el ACP es el método. Si en cambio es una característica del individuo que quieres dentro de los ejes, el AFDM.`,
        `${nQuant} quantitative and ${nQual === 1 ? 'one qualitative' : nQual + ' qualitative'}: the usual shape of measurements plus a design factor (species, treatment, site). If that is what the qualitative variable is, it enters as supplementary and colours the map without shaping the axes, and PCA is the method. If instead it is a characteristic of the individual that belongs inside the axes, FAMD.`);
    } else {
      razon = TT(
        `Hay ${nQuant} cuantitativas frente a ${nQual} cualitativas. Un ACP solo usaría las primeras; las cualitativas quedarían como suplementarias, fuera de los ejes.`,
        `There are ${nQuant} quantitative against ${nQual} qualitative variables. A PCA would only use the former; the qualitative ones would stay supplementary, outside the axes.`);
    }
    M('pca', TT('Análisis de componentes principales', 'Principal component analysis'),
      (nQual === 0 || pocasCual) ? 'recomendado' : 'posible', razon);
  } else {
    M('pca', TT('Análisis de componentes principales', 'Principal component analysis'), 'no aplica',
      TT(`Hacen falta al menos dos variables cuantitativas activas y hay ${nQuant}.`,
         `At least two active quantitative variables are needed and there are ${nQuant}.`));
  }

  /* ---------- AC ---------- */
  if (nQual === 2 && nQuant === 0) {
    M('ca', TT('Análisis de correspondencias', 'Correspondence analysis'), 'recomendado',
      TT('Dos variables cualitativas y ninguna cuantitativa: es exactamente una tabla de contingencia, que es el objeto del AC.',
         'Two qualitative variables and no quantitative ones: this is exactly a contingency table, which is what CA is for.'));
  } else if (nQual >= 2) {
    M('ca', TT('Análisis de correspondencias', 'Correspondence analysis'), 'posible',
      TT('Se puede cruzar cualquier par de las cualitativas y analizar esa tabla, pero solo mira dos variables a la vez.',
         'Any pair of the qualitative variables can be cross-tabulated and analysed, but it only looks at two at a time.'));
  } else {
    M('ca', TT('Análisis de correspondencias', 'Correspondence analysis'), 'no aplica',
      TT(`Hacen falta dos variables cualitativas y hay ${nQual}.`,
         `Two qualitative variables are needed and there are ${nQual}.`));
  }

  /* ---------- ACM ---------- */
  if (nQual >= 3 && nQuant === 0) {
    M('mca', TT('Análisis de correspondencias múltiple', 'Multiple correspondence analysis'), 'recomendado',
      TT(`${nQual} variables cualitativas y ninguna cuantitativa: el ACM las trata todas a la vez.`,
         `${nQual} qualitative variables and no quantitative ones: MCA handles them all at once.`));
  } else if (nQual >= 2) {
    M('mca', TT('Análisis de correspondencias múltiple', 'Multiple correspondence analysis'), 'posible',
      nQuant > 0
        ? TT('Es aplicable, pero obligaría a descartar las cuantitativas o a cortarlas en clases, perdiendo información. El AFDM evita esa pérdida.',
             'It applies, but it would mean dropping the quantitative variables or cutting them into classes and losing information. FAMD avoids that loss.')
        : TT('Con dos variables el AC dice lo mismo y se lee mejor.',
             'With two variables, CA says the same thing and reads better.'));
  } else {
    M('mca', TT('Análisis de correspondencias múltiple', 'Multiple correspondence analysis'), 'no aplica',
      TT(`Hacen falta al menos dos variables cualitativas y hay ${nQual}.`,
         `At least two qualitative variables are needed and there are ${nQual}.`));
  }

  /* ---------- AFDM ---------- */
  if (nQuant >= 1 && nQual >= 1) {
    M('famd', TT('Análisis factorial de datos mixtos', 'Factor analysis of mixed data'),
      pocasCual ? 'posible' : 'recomendado',
      pocasCual
        ? TT(`Si la cualitativa no es un factor de diseño sino una característica del individuo, el AFDM la mete en los ejes junto a las ${nQuant} cuantitativas, en pie de igualdad.`,
             `If the qualitative variable is not a design factor but a characteristic of the individual, FAMD puts it inside the axes alongside the ${nQuant} quantitative ones, on equal footing.`)
        : TT(`Hay ${nQuant} cuantitativas y ${nQual} cualitativas. El AFDM las analiza juntas y en pie de igualdad, sin descartar unas ni cortar las otras.`,
             `There are ${nQuant} quantitative and ${nQual} qualitative variables. FAMD analyses them together and on equal footing, without dropping either or discretising.`));
  } else {
    M('famd', TT('Análisis factorial de datos mixtos', 'Factor analysis of mixed data'), 'no aplica',
      TT('Hace falta al menos una variable de cada tipo.', 'At least one variable of each type is needed.'));
  }

  /* ---------- AFM ---------- */
  if (grupos) {
    M('mfa', TT('Análisis factorial múltiple', 'Multiple factor analysis'), 'recomendado',
      TT(`Los nombres sugieren ${grupos.length} bloques de variables (${grupos.map(g => g.nombre).join(', ')}). Sin equilibrarlos, el bloque con más columnas dominaría los ejes por serlo, no por importar más.`,
         `The names suggest ${grupos.length} blocks of variables (${grupos.map(g => g.nombre).join(', ')}). Without balancing them, the block with more columns would dominate the axes for that reason alone.`),
      { grupos });
  } else if (nQuant + nQual >= 4) {
    M('mfa', TT('Análisis factorial múltiple', 'Multiple factor analysis'), 'posible',
      TT('Aplicable si las variables se agrupan en bloques con sentido —morfología, suelo, clima— y quieres que ninguno domine por traer más columnas. Los grupos hay que declararlos.',
         'Applicable if the variables fall into meaningful blocks — morphology, soil, climate — and you want none of them to dominate by sheer number of columns. The groups have to be declared.'));
  } else {
    M('mfa', TT('Análisis factorial múltiple', 'Multiple factor analysis'), 'no aplica',
      TT('Hacen falta al menos dos grupos con dos variables cada uno.',
         'At least two groups of two variables each are needed.'));
  }

  /* ---------- HCPC ---------- */
  M('hcpc', TT('Agrupamiento sobre componentes (HCPC)', 'Clustering on components (HCPC)'), 'posible',
    TT('Se corre después de cualquiera de los anteriores, si además de ordenar los individuos quieres agruparlos.',
       'It runs after any of the above, if besides ordering the individuals you also want to group them.'));

  /* ============================================================
     Avisos: cada uno con la cifra que lo motiva
     ============================================================ */
  const avisos = [];
  const A = (nivel, titulo, texto) => avisos.push({ nivel, titulo, texto });

  if (n && nQuant + nQual > 0) {
    const p = nQuant + nQual;
    if (n < REC.U.nMinimo) {
      A('warn', TT('Muestra pequeña', 'Small sample'),
        TT(`${n} observaciones. Por debajo de ${REC.U.nMinimo} los ejes son inestables: repetir el muestreo puede cambiarlos de sitio.`,
           `${n} observations. Below ${REC.U.nMinimo} the axes are unstable: resampling can move them.`));
    }
    if (n < REC.U.nPorVariable * p) {
      A('warn', TT('Pocas observaciones por variable', 'Few observations per variable'),
        TT(`${n} observaciones para ${p} variables, ${(n / p).toFixed(1)} por variable. Lo cómodo es al menos ${REC.U.nPorVariable}.`,
           `${n} observations for ${p} variables, ${(n / p).toFixed(1)} each. At least ${REC.U.nPorVariable} is comfortable.`));
    }
  }

  if (cor) {
    const pB = cor.bartlett.p < 0.0001 ? '< 0.0001' : '= ' + cor.bartlett.p.toFixed(3);
    if (cor.sinEstructura) {
      A('bad', TT('No hay correlación que resumir', 'Nothing to summarise'),
        TT(`La prueba de Bartlett no rechaza que la matriz de correlaciones sea la identidad (χ² = ${cor.bartlett.chi2.toFixed(1)}, p ${pB}); la correlación absoluta media es ${cor.media.toFixed(3)}. Un ACP devolverá tantos componentes como variables: no habrá reducción.`,
           `Bartlett's test does not reject that the correlation matrix is the identity (χ² = ${cor.bartlett.chi2.toFixed(1)}, p ${pB}); the mean absolute correlation is ${cor.media.toFixed(3)}. A PCA will return as many components as variables: there will be no reduction.`));
    } else {
      A('ok', TT('Hay estructura de correlación', 'There is correlation structure'),
        TT(`Bartlett rechaza la independencia (χ² = ${cor.bartlett.chi2.toFixed(1)}, p ${pB}). Correlación absoluta media ${cor.media.toFixed(3)}; ${cor.fuertes} de ${cor.nPares} pares superan ${REC.U.corrDebil}.`,
           `Bartlett rejects independence (χ² = ${cor.bartlett.chi2.toFixed(1)}, p ${pB}). Mean absolute correlation ${cor.media.toFixed(3)}; ${cor.fuertes} of ${cor.nPares} pairs exceed ${REC.U.corrDebil}.`));
    }
    if (cor.redundantes.length) {
      A('warn', TT('Variables casi redundantes', 'Nearly redundant variables'),
        cor.redundantes.slice(0, 4).map(x => `${x.a}–${x.b} (r = ${x.r.toFixed(3)})`).join(', ') + '. ' +
        TT('No invalida el análisis, pero esas variables pesarán doble sobre el mismo eje.',
           'It does not invalidate the analysis, but those variables will weigh twice on the same axis.'));
    }
  }

  if (abund) {
    A('warn', TT('Parece una tabla de abundancias', 'This looks like an abundance table'),
      TT(`Todas las variables activas son enteros no negativos y el ${(abund.pCeros * 100).toFixed(0)} % de los valores son ceros. Sobre datos así el ACP crudo produce el arco de Gauch, un artefacto en forma de herradura que se confunde con un gradiente. Considera el análisis de correspondencias, o un ACP tras transformar por Hellinger.`,
         `Every active variable is a non-negative integer and ${(abund.pCeros * 100).toFixed(0)} % of the values are zeros. On such data a raw PCA produces Gauch's arch, a horseshoe artefact easily mistaken for a gradient. Consider correspondence analysis, or a PCA after a Hellinger transformation.`));
  }

  if (raras.length) {
    A('warn', TT('Categorías con muy pocos casos', 'Categories with very few cases'),
      raras.slice(0, 5).map(x => `${x.variable} = ${x.nivel} (${x.n})`).join(', ') +
      (raras.length > 5 ? ` y ${raras.length - 5} más` : '') + '. ' +
      TT('En un ACM una categoría rara se coloca lejos del centro y arrastra el eje hacia ella: el mapa acabará mostrando su rareza y no la estructura. Conviene agruparlas o pasarlas a suplementarias.',
         'In an MCA a rare category sits far from the centre and pulls the axis towards it: the map ends up showing its rarity rather than the structure. Consider merging them or making them supplementary.'));
  }

  /* asociación entre cualitativas: si no la hay, el ACM no tiene qué mostrar */
  if (nQual >= 2) {
    let maxV = 0, par = null;
    for (let i = 0; i < qual.length; i++) for (let j = i + 1; j < qual.length; j++) {
      const t = GSV.contingencia(qual[i].values.map(String), qual[j].values.map(String));
      const c = GSV.chi2Tabla(t.N);
      const m = Math.min(t.filas.length, t.cols.length) - 1;
      const v = m > 0 && c.n > 0 ? Math.sqrt(c.chi2 / (c.n * m)) : 0;
      if (v > maxV) { maxV = v; par = [qual[i].name, qual[j].name]; }
    }
    if (maxV < REC.U.cramerDebil) {
      A('bad', TT('Las cualitativas no están asociadas', 'The qualitative variables are not associated'),
        TT(`La v de Cramér más alta entre pares es ${maxV.toFixed(3)}. Sin asociación, un ACM dibuja un mapa sin estructura: los ejes reparten a los individuos casi al azar.`,
           `The highest pairwise Cramér's V is ${maxV.toFixed(3)}. Without association, an MCA draws a map with no structure: the axes scatter the individuals almost at random.`));
    } else {
      A('ok', TT('Las cualitativas están asociadas', 'The qualitative variables are associated'),
        TT(`v de Cramér más alta: ${maxV.toFixed(3)} entre ${par[0]} y ${par[1]}.`,
           `Highest Cramér's V: ${maxV.toFixed(3)}, between ${par[0]} and ${par[1]}.`));
    }
  }

  /* ---------- el elegido ---------- */
  const orden = ['mfa', 'famd', 'mca', 'ca', 'pca'];
  let elegido = null;
  for (const id of orden) {
    const m = metodos.find(x => x.id === id && x.veredicto === 'recomendado');
    if (m) { elegido = m; break; }
  }
  if (!elegido) elegido = metodos.find(m => m.veredicto === 'posible') || null;

  return {
    inventario: inv, correlacion: cor, abundancia: abund,
    categoriasRaras: raras, gruposDetectados: grupos,
    metodos, avisos,
    recomendado: elegido ? elegido.id : null,
  };
};

/* Doble salida: <script> en el navegador y require en Node. */
if (typeof require === 'function' && typeof S === 'undefined') global.S = require('./stats.js');
if (typeof require === 'function' && typeof GSV === 'undefined') global.GSV = require('./gsvd.js');
if (typeof module !== 'undefined' && module.exports) module.exports = REC;
if (typeof window !== 'undefined') window.REC = REC;

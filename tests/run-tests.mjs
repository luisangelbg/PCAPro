/* Ejecuta la suite de pruebas de PCAPro en un navegador sin interfaz.
 *
 * La suite vive en tests/index.html y se ejecuta sola al cargar la página;
 * al terminar deja el resultado en window.__testResult. Este guion solo la
 * abre, espera ese objeto y traduce el resultado a un codigo de salida, que
 * es lo que entiende la integracion continua.
 *
 * No forma parte de la aplicacion: PCAPro no necesita Node ni npm para
 * funcionar, y este fichero no se sirve al usuario. Es solo herramienta.
 *
 * Uso:  node tests/run-tests.mjs
 * Variables opcionales:
 *   PCAPRO_URL      direccion de la suite (por defecto localhost:8790)
 *   PCAPRO_TIMEOUT  milisegundos de espera (por defecto 300000)
 */

import { chromium } from 'playwright';

const URL = process.env.PCAPRO_URL || 'http://127.0.0.1:8790/tests/index.html';
const TIMEOUT = Number(process.env.PCAPRO_TIMEOUT || 300_000);

const browser = await chromium.launch();
const page = await browser.newPage();

/* Se recogen los errores de consola aparte: no hacen fallar la suite, pero
   conviene verlos en el registro si algo va mal. */
const problems = [];
page.on('console', m => { if (m.type() === 'error') problems.push(m.text()); });
page.on('pageerror', e => problems.push('pageerror: ' + e.message));

console.log(`Abriendo ${URL}`);
await page.goto(URL, { waitUntil: 'domcontentloaded' });

let result;
try {
  await page.waitForFunction(() => window.__testResult, null, { timeout: TIMEOUT });
  result = await page.evaluate(() => window.__testResult);
} catch (e) {
  const visible = await page.evaluate(
    () => (document.getElementById('summary') || {}).textContent || '(sin resumen)'
  );
  console.error(`\nLa suite no termino en ${TIMEOUT} ms. Estado en pantalla: ${visible}`);
  if (problems.length) console.error('Errores de consola:\n  ' + problems.join('\n  '));
  await browser.close();
  process.exit(1);
}

const failures = await page.evaluate(() =>
  [...document.querySelectorAll('.case.fail')].map(el => ({
    name: (el.querySelector('.nm') || {}).textContent || '(sin nombre)',
    error: (el.querySelector('.err') || {}).textContent || '',
  }))
);

await browser.close();

console.log(`\n${result.pass} de ${result.total} pruebas pasaron en ${result.ms} ms`);

if (problems.length) {
  console.log(`\nAvisos de consola (${problems.length}), no hacen fallar la suite:`);
  for (const p of problems.slice(0, 20)) console.log('  · ' + p);
}

/* Una suite que no ejecuta nada tambien pasa en verde, y esa es la forma
   clasica en que una integracion continua engaña. Si no corrio el numero
   esperado de pruebas, es un fallo aunque ninguna haya reventado. */
const MIN = Number(process.env.PCAPRO_MIN_TESTS || 1);
if (!result.total || result.total < MIN) {
  console.error(`\nSe esperaban al menos ${MIN} pruebas y se ejecutaron ${result.total}.`);
  console.error('La suite no corrio como deberia; en verde no significa nada.');
  process.exit(1);
}

if (result.fail > 0) {
  console.error(`\n${result.fail} prueba(s) fallaron:\n`);
  for (const f of failures) console.error(`  ✖ ${f.name}\n    ${f.error}\n`);
  process.exit(1);
}

console.log('\nTodo en verde.');

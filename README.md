# PCAPro

**A complete principal component analysis, in your browser, with nothing to install.**

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)

PCAPro is a self-contained web application dedicated to **principal component analysis (PCA)**:
data preparation, verification of assumptions, extraction, rotation, factor maps and
interpretation, ending in a publication-ready report.

All computation happens **in the browser**, in plain JavaScript. There is no server, no build
step and no Python runtime, and **no user data is ever transmitted**.

The interface, the embedded theory and the generated report are available in **Spanish and
English**. *Documentación en español: [`LEEME.md`](LEEME.md).*

---

## Running it

PCAPro is a folder of static files. Any static web server will do.

**On Windows**, right-click **`servidor.ps1`** → *Run with PowerShell*. It opens
`http://localhost:8790` by itself. To use another port:

```bash
powershell -ExecutionPolicy Bypass -File servidor.ps1 -Port 9001
```

**Anywhere else**, serve the folder with whatever you have to hand:

```bash
python3 -m http.server 8790
```

Then open `http://localhost:8790`.

Opening `index.html` by double-clicking also works, but the bundled example data sets in
`datos/` will not load, because browsers block local file reads from `file://`.

### Requirements

A current browser (Chrome, Edge, Firefox or Safari). Nothing else.

### Third-party dependency

The only third-party code is **SheetJS** (`xlsx` 0.18.5, Apache-2.0), used solely to read
`.xlsx` workbooks. It is loaded once from a CDN. For a fully offline installation, download
`xlsx.full.min.js` into `js/vendor/` and change the corresponding `<script src>` in
`index.html`; everything else already works with no network access.

---

## What it does

| Step | Contents |
|---|---|
| 1 | Import (`.xlsx`, `.xls`, `.csv`, `.tsv`, `.txt`), variable typing and roles, 7 scaling options, assumption diagnosis with an A–D verdict |
| 2 | Extraction: eigenvalues, variance, scree plot, and 8 retention criteria with a weighted-consensus recommendation |
| 3 | Rotation: varimax, quartimax, equamax, parsimax, promax, direct oblimin and quartimin |
| 4 | Factor maps: correlation circle, map of individuals, biplot, contributions, `cos²`, ellipses |
| 5 | Interpretation: naming the axes, dimension description, test values, group comparison, model fit |
| 6 | Self-contained HTML report, PDF via printing, and a full ZIP package |

**Variable roles** follow the French school of data analysis: active, supplementary
quantitative, qualitative/group, row identifier, or excluded.

**Assumptions checked automatically:** Bartlett's test of sphericity, KMO with per-variable MSA,
determinant of R, multicollinearity, scale disparity, Mahalanobis outliers, missing-data pattern,
skewness and the n:p ratio.

**Retention criteria:** Horn's parallel analysis (by permutation of your own data or from random
normal data, against the 95th percentile), Kaiser–Guttman, Jolliffe, broken stick, Velicer's MAP,
the scree elbow, and 70% / 80% cumulative variance.

**Figures.** Drawn by an in-house SVG engine, not a charting library. Every figure is editable in
place — titles, axis labels, palettes, themes, ellipses, typeface and four independent font-size
controls — and exports to SVG, PNG, JPG or WEBP at up to 12× resolution.

---

## Tests

The test suite runs in the browser. Start the local server and open:

```
http://localhost:8790/tests/index.html
```

It runs 60 tests in 11 groups and takes about 40 seconds. The page title becomes
`PASS — PCAPro tests` and the summary reads `All 60 tests passed` when everything is green.

Every expectation is either a reference value published by an independent implementation
(R: `prcomp`, `psych::KMO`, `pchisq`, `pf`, `pt`) or an algebraic invariant that must hold
regardless of the data. **No expectation was recorded from a previous run of PCAPro itself.**

Run the suite after any change to the numerical engine (`js/stats.js`, `js/rotate.js`,
`js/factor.js`).

---

## Repository layout

```
index.html            the application
js/                   engine and interface (8,400 lines)
  stats.js            linear algebra and distributions
  rotate.js           Jennrich gradient projection rotations
  factor.js           coordinates, cos², contributions
  figure.js           SVG figure engine, editing and export
  i18n.js             Spanish/English dictionary and switching
  data.js, block2-6.js, plots1-5.js, report.js
css/                  styles
datos/                example data sets
tests/                automated test suite
curso/                teaching package (workshop materials, in Spanish)
paper/                JOSS submission
```

---

## Teaching materials

`curso/` contains a workshop package in Spanish: participant manual, instructor guide, and five
simulated practice data sets with a deliberately planted latent structure so that students can
verify they reached the right answer.

The answer keys and the exam solutions are deliberately **not** distributed here, so that the
assessment remains usable. Instructors who want them can ask the author.

**The practice data sets are simulated and must always be presented as such.** They are generated
by `curso/generar_datos.ps1` from a fixed seed; if the seed changes, every number quoted in the
manual has to be re-verified.

---

## Citation

If PCAPro is useful in your work, please cite it. See [`CITATION.cff`](CITATION.cff).

---

## Support and governance

PCAPro is maintained by its author. What you can expect:

- **Bug reports** go in the [issue tracker](https://github.com/luisangelbg/PCAPro/issues), in
  Spanish or English. Reports that affect a numerical result are treated as the highest priority.
- **Response time** is usually within a week during the academic term, and can be longer outside it.
- **Scope.** PCAPro is deliberately dedicated to PCA alone. Proposals that extend the PCA workflow
  are welcome; other multivariate methods belong in separate software. See
  [`CONTRIBUTING.md`](CONTRIBUTING.md).
- **Versioning** follows [Semantic Versioning](https://semver.org/). Changes are recorded in
  [`CHANGELOG.md`](CHANGELOG.md). A change that alters a numerical result will never be a patch
  release, and will always be documented explicitly.
- **Decisions** on scope and design rest with the maintainer, taken in the open on the issue
  tracker.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md). Bug reports and suggestions are welcome through the
issue tracker.

---

## License

GNU General Public License v3.0 — see [`LICENSE`](LICENSE).

# Changelog

All notable changes to PCAPro are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- **Column coordinates in CA and MCA were multiplied by the column mass.** The shared core
  (`js/gsvd.js`) received the chi-square metric `1/c` as the only column weight and returned
  `c·G` instead of Greenacre's principal coordinates `G = Dc^(-1/2)·V·Dσ`. On the smoking table the
  first-axis coordinate of *none* was 0.124 instead of 0.393; in MCA the categories were squeezed
  towards the origin by a factor between 4 and 35 in the same example. The core now takes the
  column masses separately (`opt.colMass`); PCA, FAMD and MFA, whose column weights are also their
  masses, are unchanged. Eigenvalues, row and individual coordinates, `cos²`, contributions,
  interpretation and HCPC were already right. Affected in 1.1.0: the CA map (symmetric and
  asymmetric), the MCA category map, the column/category coordinates in Block 2, the report
  table and `05_columnas_coord_cos2_contrib.csv` / `12_descripcion_ejes.csv` in the ZIP.
- Seven new tests (118 in total): Greenacre's row and column coordinates, column `cos²` and
  contributions, the transition formula, the quasi-barycentre of MCA categories, the two-variable
  MCA–CA identity and the projection of supplementary rows.
- **FAMD reported for each category a coordinate and a `cos²` that were not the ones on the map.**
  The tables took the core's column coordinate, `√p_k · barycentre / √λ`, and the `cos²` of that
  vector, while the category map drew the barycentre and the card itself said so. On iris with
  *Species* active, *setosa* was −0.765 on Dim1 instead of −2.606, with `cos²` 0.877 instead of
  0.965. `FAMD.run` now reports what `FactoMineR::FAMD` reports: correlation and `r²` for each
  quantitative variable, and for each category its barycentre with the `cos²` of that point over
  all the axes (the core's values stay in `colCoordNucleo` / `colCos2Nucleo`). Quantitative
  variables, contributions, `η²`, the individuals and the position of the categories on the map
  were already right. Affected in 1.1.0: category coordinates and `cos²` in card 2.5, in the
  report table and in `05_columnas_coord_cos2_contrib.csv`; the `cos2` column of
  `12_descripcion_ejes.csv`; and the category map only when it was filtered or coloured by `cos²`.
- Two new FAMD tests (120 in total): iris against `FactoMineR::FAMD` and the identity between the
  reported and the drawn points.

## [1.1.0] — 2026-09-10

The platform stops being a PCA tool and becomes a factor-methods tool. The five methods share a
single generalized-SVD core, so they also share the maps, the interpretation and the report.

### Added

- **Correspondence analysis (CA)**, **multiple correspondence analysis (MCA)**, **factor analysis
  of mixed data (FAMD)** and **multiple factor analysis (MFA)**, on a shared core (`js/gsvd.js`)
  that decomposes `Z = Dr^(1/2)·(X − 1·mᵀ)·Dc^(1/2)` and returns eigenvalues, coordinates, `cos²`
  and contributions in one shape. MCA reports the Benzécri and Greenacre adjustments and a Cramér's
  V matrix; FAMD, the `r²` and `η²` of each variable; MFA, the partial points, the block inertias
  and the RV coefficients.
- **Method recommender** (`js/recomienda.js`), a card at the end of Block 1 that reads the data —
  variable types, sample size, Bartlett, rare categories, blocks in the variable names — and says
  which method applies, which is possible and which does not apply, with the figure that motivates
  each warning.
- **Block 5b — hierarchical clustering on the factor coordinates (HCPC)**, for all five methods:
  Ward on weighted points, three rules for the number of clusters, k-means consolidation,
  dendrogram, cluster map, test values, paragons and specific individuals.
- **New figures**: symmetric CA map, category map, variable map mixing `r²` and `η²`, block map,
  partial points, dendrogram, cut-choice plot and cluster profiles in small multiples.
- **Landing block** with the workflow and what each block does.
- **"How to cite" button** in Block 1, and the reference in the report's methods paragraph.
- `scripts/i18n_faltantes.pl`, which lists the strings that still have no translation.

### Changed

- The report, the printed version and the ZIP package are method-aware: they name the method, its
  axes and its tables, and add a section for the clustering when it was run.
- The test suite grows from 60 to **111** tests, in 19 groups.

### Fixed

- The reference value of λ₃ for iris in `tests/tests.js` and `lib/reproduce-iris.js` read 0.146755
  instead of 0.146757; the tolerance of 1e-5 was hiding the typo.

## [1.0.1] — 2026-09-07

### Added

- `.zenodo.json`, so that the archived record carries the author's name, ORCID and affiliation
  rather than the metadata inferred from the hosting account.
- A "How to cite" section in the README, with the sentence for a methods section and a BibTeX entry.

## [1.0.0] — 2026-09-07

First public release.

### Added

- **Block 1 — data and assumptions.** Import of `.xlsx`, `.xls`, `.csv`, `.tsv` and `.txt`, with
  detection of the column and decimal separators. Variable typing and roles (active, supplementary
  quantitative, qualitative/group, row identifier, excluded). Seven scaling options and four prior
  transformations. Automatic diagnosis of the assumptions — Bartlett's test of sphericity, KMO with
  per-variable MSA, determinant of R, multicollinearity, scale disparity, Mahalanobis outliers,
  missing-data pattern, skewness and the n:p ratio — with an A–D verdict and written recommendations.
- **Block 2 — extraction.** Eigenvalues, explained variance and scores. Eight retention criteria:
  Horn's parallel analysis (by permutation or from random normal data, against the 95th percentile),
  Kaiser–Guttman, Jolliffe, broken stick, Velicer's MAP, the scree elbow, and the 70% and 80%
  cumulative-variance thresholds, with a weighted-consensus recommendation.
- **Block 3 — rotation.** Varimax, quartimax, equamax, parsimax, promax, direct oblimin and
  quartimin, through Jennrich's gradient projection algorithm, with Kaiser normalisation and
  pattern, structure and Φ matrices.
- **Block 4 — factor maps.** Correlation circle, map of individuals, biplot, contributions and
  `cos²`, with concentration, mean-confidence and convex-hull envelopes, and projection of
  supplementary elements.
- **Block 5 — interpretation.** Naming of axes, dimension description, test values of categories,
  ANOVA and Kruskal–Wallis per component, residuals and RMSR, and a drafted results paragraph.
- **Block 6 — reporting.** Self-contained HTML report, PDF through printing, and a ZIP package with
  the figures and up to 14 result tables.
- **Figure engine.** In-house SVG rendering with per-figure editing (titles, axes, palettes, themes,
  typeface and four independent font-size controls) and export to SVG, PNG, JPG and WEBP at up to
  12× resolution.
- **Bilingual interface.** Spanish and English throughout: interface, the 34 embedded theory
  sections and the generated report.
- **Test suite.** 60 automated tests in 11 groups, whose expectations are reference values from R
  or algebraic invariants.
- **Teaching package** in `curso/`: participant manual, instructor guide and five simulated practice
  data sets with a deliberately planted latent structure.

[Unreleased]: https://github.com/luisangelbg/PCAPro/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/luisangelbg/PCAPro/releases/tag/v1.1.0
[1.0.1]: https://github.com/luisangelbg/PCAPro/releases/tag/v1.0.1
[1.0.0]: https://github.com/luisangelbg/PCAPro/releases/tag/v1.0.0

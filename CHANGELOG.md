# Changelog

All notable changes to PCAPro are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/luisangelbg/PCAPro/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/luisangelbg/PCAPro/releases/tag/v1.0.0

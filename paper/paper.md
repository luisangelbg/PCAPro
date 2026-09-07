---
title: 'PCAPro: an offline, browser-based platform for guided principal component analysis'
tags:
  - JavaScript
  - principal component analysis
  - multivariate statistics
  - statistics education
  - reproducible research
  - agricultural sciences
authors:
  - name: Luis Ángel Barrera-Guzmán
    orcid: 0000-0001-8057-2583
    affiliation: 1
affiliations:
  - name: "Centro Académico Regional sede Huatusco-Veracruz, Universidad Autónoma Chapingo, Huatusco, Veracruz, Mexico"
    index: 1
date: 7 September 2026
bibliography: paper.bib
---

# Summary

Principal component analysis (PCA) [@pearson1901; @hotelling1933; @jolliffe2002] is among the most
widely used multivariate techniques in the biological and agricultural sciences, and it is often the
first multivariate method a student meets. `PCAPro` is a self-contained web application that performs
a complete PCA workflow entirely inside the browser, with no installation and no server-side
computation. It walks the user through six steps — data import and assignment of variable roles,
verification of assumptions, extraction, rotation, factor maps, and interpretation — and ends in a
single-file HTML report plus a ZIP package of figures and result tables.

The numerical engine is written from scratch in JavaScript: eigendecomposition by Jacobi rotations,
the Kaiser–Meyer–Olkin index with per-variable measures of sampling adequacy [@kaiser1974],
Bartlett's test of sphericity [@bartlett1950], and Mahalanobis distances. Eight retention criteria
are implemented, including Horn's parallel analysis with Glorfeld's 95th-percentile rule
[@horn1965; @glorfeld1995], Velicer's minimum average partial [@velicer1976], the broken stick
[@frontier1976] and the scree elbow [@cattell1966]. Seven rotations — the orthomax family and
oblimin, quartimin and promax [@kaiser1958; @hendrickson1964] — are obtained through Jennrich's
gradient projection algorithm [@jennrich2001; @jennrich2002]. Every figure is drawn by an in-house
SVG engine, is editable in the interface (titles, axes, palettes, ellipses, typography, font size)
and exports to SVG, PNG, JPG or WEBP at up to 12× resolution. The interface, the embedded
methodological guidance and the generated report are available in Spanish and English.

# Statement of need

Researchers and students who need to run a PCA today choose between three families of tools, and
each imposes a cost that is not about the statistics.

Programming environments are the most complete option. In R, `FactoMineR` [@le2008] with
`factoextra` [@factoextra] implements the French school of data analysis — active and supplementary
elements, `cos²`, contributions — and `psych` [@psych] provides rotations and adequacy indices; in
Python, `scikit-learn` [@pedregosa2011] provides the decomposition. They demand programming ability,
which excludes a large part of the undergraduate audience and many field researchers.

Commercial graphical packages such as SPSS, XLSTAT or Minitab remove that barrier but add a licence
cost that is a genuine obstacle in Latin American public universities, where a departmental licence
often does not exist and students cannot install one at home.

Free graphical packages are the closest alternatives. `JASP` [@jasp] and `jamovi` [@jamovi] are
excellent and build on R, and `PAST` [@hammer2001] is a long-standing free package in ecology and
palaeontology. All three, however, require installation with administrative rights — a real
constraint in shared university computer laboratories — and their PCA modules are oriented towards
psychometrics or palaeoecology, offering limited built-in guidance on the assumption checking that
a PCA needs before it can be trusted.

`PCAPro` was written for the gap those three leave open, and its design follows from it:

- **No installation.** It is a folder of static files. It runs from any web server, from a
  university intranet, or from a USB stick, and it needs no administrative rights. This is what
  makes it usable in a teaching laboratory where students cannot install software.
- **Data stay on the machine.** All computation happens in the browser's memory; no user data is
  ever transmitted. The only third-party dependency is SheetJS (Apache-2.0), used solely to read
  `.xlsx` workbooks, which is loaded once and can be vendored locally for a fully offline
  installation. This matters for unpublished field data and for institutional data-protection rules.
- **The theory sits next to the computation.** Thirty-four expandable sections cover the postulates,
  the preliminary tests, sample-size rules, the retention criteria, the rotations, the reading of
  `cos²` and contributions, and the difference between the three kinds of ellipse. Diagnostics are
  not reported as bare numbers: the software states which assumption is at risk and what to do about
  it, and refuses to present a decision as more certain than it is.
- **Spanish as a first-class language.** Teaching material for multivariate statistics in Spanish is
  scarce, and the language barrier compounds the tooling barrier. The interface, the theory and the
  generated report exist in full in both Spanish and English.

The intended audience is undergraduate and postgraduate students and researchers in the biological
and agricultural sciences, and instructors teaching multivariate methods. `PCAPro` is the basis of a
continuing-education workshop at the Universidad Autónoma Chapingo, and the repository includes the
teaching package: participant manual, instructor guide, and five simulated practice data sets with a
deliberately planted latent structure, so that students can verify they reached the right answer.

# Quality control

Correctness is checked by a browser-based suite of 60 tests in 11 groups, covering descriptive
statistics, linear algebra, probability distributions, sampling adequacy, extraction, rotation,
coordinates and quality measures, group comparison, input parsing, export and figures. Every
expectation is either a reference value published by an independent implementation — R's `prcomp`,
`psych::KMO`, `pchisq`, `pf`, `pt` — or an algebraic invariant that must hold regardless of the
data, such as the eigenvalues summing to the trace or communalities being preserved by an orthogonal
rotation. No expectation was recorded from a previous run of `PCAPro` itself. The varimax
implementation is additionally checked against an exhaustive sweep of the rotation angle, to confirm
that the gradient projection algorithm reaches the global maximum of its own criterion rather than a
local one.

# Acknowledgements

The teaching materials distributed with `PCAPro` were developed for the continuing-education
programme of the Universidad Autónoma Chapingo.

# References

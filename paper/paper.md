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

Running a PCA correctly requires more than computing eigenvalues. The analyst must decide how to
handle missing data, whether to standardise, whether the correlation structure justifies the
analysis at all, how many components to retain, whether to rotate, and which loadings may be
interpreted. Each of those decisions changes the result, and none of them is made for the user by a
function call. In teaching settings, and in the practice of researchers who are not statisticians,
these are precisely the decisions that go wrong.

`PCAPro` was written for that gap. It places the methodological guidance next to the computation:
thirty-four expandable sections cover the postulates, the preliminary tests, sample-size rules, the
retention criteria, the rotations, the reading of `cos²` and contributions, and the difference
between the three kinds of ellipse. Diagnostics are not reported as bare numbers; the software
states which assumption is at risk and what to do about it, and refuses to present a decision as
more certain than it is. The retention step reports eight criteria side by side rather than a single
answer, because the criteria disagree and the disagreement is informative.

The intended audience is undergraduate and postgraduate students and researchers in the biological
and agricultural sciences, and instructors teaching multivariate methods. Two further constraints
shaped the design and are not incidental: the software must run without installation, because
students in shared university computer laboratories in Latin America often cannot install anything;
and it must exist in Spanish, because teaching material for multivariate statistics in that language
is scarce, and the language barrier compounds the tooling barrier.

# State of the field

Researchers who need to run a PCA today choose between three families of tools.

Programming environments are the most complete option. In R, `FactoMineR` [@le2008] with
`factoextra` [@factoextra] implements the French school of data analysis — active and supplementary
elements, `cos²`, contributions — and `psych` [@psych] provides rotations and adequacy indices; in
Python, `scikit-learn` [@pedregosa2011] provides the decomposition. They are more capable than
`PCAPro` and will remain so. They demand programming ability, which excludes a large part of the
undergraduate audience and many field researchers.

Commercial graphical packages such as SPSS, XLSTAT and Minitab remove that barrier but add a licence
cost that is a genuine obstacle in Latin American public universities, where a departmental licence
often does not exist and students cannot install one at home.

Free graphical packages are the closest alternatives. `JASP` [@jasp] and `jamovi` [@jamovi] are
excellent and build on R, and `PAST` [@hammer2001] is a long-standing free package in ecology and
palaeontology. All three require installation with administrative rights, and their PCA modules are
oriented towards psychometrics or palaeoecology, offering limited built-in guidance on assumption
checking.

The contribution of `PCAPro` is therefore not a new algorithm — the methods it implements are
established, and it cites their original sources. It is the combination of three properties that no
existing tool offers together: zero installation, so it runs where nothing can be installed;
methodological guidance embedded at each decision point rather than deferred to a manual; and a
fully bilingual interface, theory and report. Contributing this to an existing project was not a
practical route: the guidance is the software's structure, not a feature that could be added to a
package designed around a different workflow, and no established PCA tool runs without installation.

# Software design

`PCAPro` is a folder of static files with no build step, no framework and no module bundler.
Everything is attached to `window`, so the application also runs from `file://`. This is a
deliberate trade-off. The cost is real: no module system, no tree shaking, and manual DOM
construction. The benefit is that the software has no toolchain to rot, can be served from a USB
stick or a university intranet, and can be read file by file by a reviewer or a student without
installing anything. For a tool whose purpose is to work where nothing can be installed, freedom
from dependencies is a functional requirement rather than an aesthetic preference. The single
third-party dependency is SheetJS, used only to read `.xlsx` workbooks, and it can be vendored
locally for a fully offline installation.

The numerical engine was written rather than wrapped. No JavaScript library offered the combination
of retention criteria and rotation algorithms required, and reimplementation makes every step
auditable in the same language as the interface. The risk of reimplementation is silent numerical
error, and that risk is managed by validation rather than by trust: the test suite compares against
independent implementations, and the rotation code is checked against an exhaustive sweep of the
rotation angle to confirm it reaches the global maximum of its own criterion rather than a local
one.

The figure engine is likewise written from scratch instead of using a charting library. Charting
libraries optimise for rendering; publication figures need editability and vector export at
arbitrary resolution, with the exported file matching what the user edited on screen. Owning the
SVG generation makes the export path exact and lets every figure carry the same editing controls.

The application state flows forward through the six blocks: changing the preparation invalidates the
extraction, which invalidates the rotation, and so on. Downstream results are cleared rather than
left stale, so the interface cannot show a rotation computed from data that no longer exist.

Internationalisation uses a dictionary keyed by the Spanish source string rather than by abstract
identifiers. A missing translation therefore degrades to correct Spanish instead of to a broken
identifier — a choice that matters for a project where one language is always complete and the other
is maintained alongside it.

# Research impact statement

`PCAPro` reproduces the reference output of established implementations. Its results have been
compared against `prcomp` and `psych` in R and against SAS on real data sets, and the automated test
suite encodes those reference values so that agreement is checked on every change rather than
asserted once. On Fisher's iris data the eigenvalues agree with `prcomp` to six decimal places and
the KMO index agrees with `psych::KMO` to three.

The software is deployed and usable without installation at
`https://luisangelbg.github.io/PCAPro/`, archived on Zenodo with a citable DOI, and released under
GPL-3.0. It is the basis of a continuing-education workshop, and the repository includes the
teaching package: participant manual, instructor guide, and five simulated practice data sets with a
deliberately planted latent structure, so that students can verify they reached the correct answer.

<!-- PENDIENTE antes de reenviar a JOSS: esta sección necesita evidencia de uso EN INVESTIGACIÓN,
     no docencia ni validación. Añadir aquí, con cita concreta: artículos o preprints cuyo análisis
     se hizo con PCAPro, tesis que lo usaron, o adopción documentada por otros grupos. JOSS rechaza
     explícitamente las afirmaciones sobre uso futuro. Sin esto, la sección no cumple. -->

# AI usage disclosure

The development of `PCAPro` was assisted by a large language model (Anthropic's Claude, used
through Claude Code). The assistance covered code generation and refactoring across the
application, the numerical engine and the test suite, and the drafting of the embedded
methodological guidance, the repository documentation and this paper. The author framed the
problem and the pedagogical approach, specified the scope and the block structure, selected the
statistical methods and the retention and rotation criteria to implement, chose the reference
values used as test expectations, and reviewed, edited and validated all AI-assisted output.
Correctness of the numerical output was verified against independent implementations in R and SAS,
as described above. The author takes full responsibility for the accuracy, originality and
licensing of the submitted materials.

# Acknowledgements

The teaching materials distributed with `PCAPro` were developed for the continuing-education
programme of the Universidad Autónoma Chapingo. The author received no specific financial support
for this work.

# References

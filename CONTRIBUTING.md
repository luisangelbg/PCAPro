# Contributing to PCAPro

Thank you for your interest. Bug reports, suggestions and patches are welcome.
*Se aceptan contribuciones en español o en inglés, indistintamente.*

## Reporting a bug

Open an issue and include:

- what you did, what you expected and what happened instead;
- your browser and version;
- if the problem depends on the data, a **small** file that reproduces it — please make sure
  you are allowed to share it, and never attach unpublished research data;
- anything the browser console printed (F12 → Console).

If a computed value looks wrong, saying what an independent implementation returns for the same
data (R, SPSS, JASP…) makes the report far easier to act on.

## Suggesting a feature

PCAPro is deliberately dedicated to PCA alone. Proposals that extend the PCA workflow
(a retention criterion, a rotation, a diagnostic, a figure) fit well. Proposals for other
multivariate methods do not — they belong in separate software.

## Setting up

There is no build step and no package manager. Clone the repository and serve the folder:

```bash
python3 -m http.server 8790
```

Then open `http://localhost:8790`.

## Before opening a pull request

1. **Run the test suite** at `http://localhost:8790/tests/index.html`. All 60 tests must pass.
2. **If you touched the numerical engine**, add a test. The rule for this repository is strict:
   an expectation must be either a reference value from an independent implementation, or an
   algebraic invariant. *Never* record an expectation from a run of PCAPro itself — that only
   freezes whatever the code currently does, including its bugs.
3. **If you added user-visible text**, add its translation to `js/i18n.js`. The dictionary is
   keyed by the Spanish string, so a missing translation degrades to Spanish rather than to a
   broken identifier. For interpolated sentences use `TT(es, en)` from `js/core.js`.
4. **If you added a figure**, reuse `Fig.mount` and the palettes in `Fig.palettes` /
   `Fig.colormaps`, and give every call to `F.text` its `role` (`title`, `axis` or `label`) so
   that the font-size controls apply to it.

## Style

Match the surrounding code. In short: plain JavaScript, no modules, no framework, no build;
everything hangs off `window` so the app also runs from `file://`. Comments are in Spanish,
matching the existing source.

## Code of conduct

By participating you agree to abide by the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

Contributions are accepted under the GNU General Public License v3.0, the licence of this
project.

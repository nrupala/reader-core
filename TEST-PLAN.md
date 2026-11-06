# Test plan — reader-core

## Scope

Testing covers the portable read-aloud engine in `src/reader-core.js` — chunked
speech synthesis with keep-alive, sentence highlighting and last-read-position
keeping — including regression coverage for the place-keeping defect classes
fixed in 0.2.0. Shells that embed the engine (e.g. DogEar) run their own
surface tests separately; they are out of scope here.

## Suites

| Suite | Covers | Run it | Runs in CI |
|---|---|---|---|
| Engine tests | core reading behaviour against `test/fixture.html` | `node test/reader.test.js` | Yes — ci |
| Regression tests | the 0.2.0 place-keeping fixes (hidden-page utterance errors, chunk-count-pinned place records) | `node test/regression.test.js` | Yes — ci |
| Syntax check | `src/reader-core.js` parses cleanly | `npm run check` | Yes — ci |
| Static analysis (CodeQL) | the JavaScript codebase | GitHub code scanning | Yes — CodeQL workflow |

Both test files together run as `npm test`.

## CI gates

- `ci` (`.github/workflows/ci.yml`) runs install, `npm run check` and
  `npm test` on every push and pull request to `main`; all steps must pass
  before merge.
- CodeQL (`.github/workflows/codeql.yml`) runs on push and pull request to
  `main` and weekly; findings are dispositioned on the house SLA (Critical
  48 h, High 7 d, Medium 14 d — fix, or dismiss with the reason recorded).

## Cadence

- Every pull request: the full ci gate above.
- Weekly: the scheduled CodeQL scan.
- Every release candidate: the release-readiness run (checker + evidence
  reads), per the house Release-Readiness Standard.

## Coverage bar

No numeric floor; new functionality lands with tests per CONTRIBUTING, and
engine behaviour fixes land with a regression test where practical — the
0.2.0 regression suite is the standing example.

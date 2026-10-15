# Changelog

## 0.2.0 — 2026-10-15

Engine parity release: the fixes the shipped embed (dogear v1.0.5–v1.0.7)
earned in production are ported back into the canonical engine, so shells
built on reader-core no longer inherit the older defect classes
(release-gate finding F4, dogear gate 2026-10-15). This release also
resolves the version incoherence (F10): the 0.1.1 bump below was a chore
change on main that was never tagged; 0.2.0 is the tagged release, and
the package version and the source `VERSION` constant agree.

### Fixed
- **Place-losing utterance-error cascade** (embed v1.0.6): an utterance
  error on a hidden page means the OS suspended speech. The engine
  advanced on any error, cascading to the end, where the completion
  path cleared the saved place. On a hidden page it now keeps the
  place at the current chunk and stops.
- **Place records are pinned to their chunking**: saved positions now
  carry the chunk count (`n`) and are only offered when it matches, so
  a place saved against different content is never resumed mid-stream.
  Pre-0.2.0 records (no `n`) are still accepted on the range check.
- **Voice picker privacy** (gate finding F11): on-device (`localService`)
  voices are preferred over network voices, which send the text being
  read to the browser vendor's servers — the wrong default for private
  documents. Google voices now rank only within the on-device set,
  after en-US.

### Added
- **Boot contract** (embed v1.0.5): `ReaderCore.auto(options)` never
  initializes while the document is still parsing — while
  `readyState === 'loading'` it defers `create()` to DOMContentLoaded,
  so readable content placed after the script is never invisible to
  the reader. Regression-tested in `test/regression.test.js`.
- **Orphan-text fallback** (embed v1.0.7): a container holding real
  direct text and no selected block inside it is itself read, so
  bodies stored as bare text are no longer silently skipped.
- **Screen wake lock + visibility reconciliation** (embed v1.0.6):
  playback holds a screen wake lock where available and reconciles
  state when the page returns from hidden.
- Text inside excluded descendants of a kept block is now skipped
  during sentence wrapping (matches the embed).

## [Unreleased]

### Added
- `CONTRIBUTING.md`: PR-flow discipline (draft PR → CI green → owner merges;
  CHANGELOG entry + semver bump per PR; merge commits reference PR numbers;
  releases tagged `vX.Y.Z`), plus the no-deploy-target note and test
  instructions.

### Changed
- Version: 0.1.0 → 0.1.1 (chore: certification PR).
- `src/reader-core.css` and `test/reader.test.js` now carry the Apache-2.0
  license header, matching `src/reader-core.js`.


## 0.1.0 — 2026-09-28

Initial extraction. The reader that shipped on onsmartgrid (PR #60 lineage) and
nrupalakolkar.com (PR #29), factored into a portable, dependency-free core.

- Chunked `speechSynthesis` playback with 8s keep-alive (screen-off / app-switch safe)
- Sentence splitting with per-sentence highlighting
- Play / pause / resume, stop, 0.8×–1.5× speed, progress bar
- Last-read-point resume via configurable `storageKey`
- Configurable block / exclusion selectors; Google en-US voice preference
- UMD: global `ReaderCore`, CommonJS

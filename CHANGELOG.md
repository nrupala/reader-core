# Changelog

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

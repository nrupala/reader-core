# Changelog

## 0.1.0 — 2026-09-28

Initial extraction. The reader that shipped on onsmartgrid (PR #60 lineage) and
nrupalakolkar.com (PR #29), factored into a portable, dependency-free core.

- Chunked `speechSynthesis` playback with 8s keep-alive (screen-off / app-switch safe)
- Sentence splitting with per-sentence highlighting
- Play / pause / resume, stop, 0.8×–1.5× speed, progress bar
- Last-read-point resume via configurable `storageKey`
- Configurable block / exclusion selectors; Google en-US voice preference
- UMD: global `ReaderCore`, CommonJS

# Codetopo Profile — Reader Core (nrupala/reader-core)

**What this is.** The agent-facing map of this repository, generated with
Codetopo 0.9.1 (local engine, `~/.cargo/bin/codetopo`) so an arriving agent
can see the machine — topology, trust boundaries, money surface — before it
submits or changes anything. Read this first; the graph snapshot beside it
(`snapshot.json`, `stats.json`) is the measured evidence.

- **Repo:** nrupala/reader-core
- **Commit profiled:** `0d16f5a058b8f303dddf50bc6696fa6c4f1c12d8` (main, fetched 2026-11-18)
- **Engine:** codetopo 0.9.1 · index run 2026-11-18
- **Graph:** files walked: 10 · failed: 0 · 242 nodes · 452 edges · audit chain valid (audit entries: 3, head `df490a4e…d9f9b`)
- **Nodes by kind:** doc 7 · external 142 · file 10 · function 42 · module 10 · package 1 · variable 30
- **Edges by kind:** calls 225 · contains 99 · defines 23 · reads 101 · writes 4
- **Census:** 24 files in the repo tree (see Coverage honesty for what the graph does and does not parse)

## Coverage honesty

Codetopo extracts Rust, TypeScript/JavaScript and Python, and indexes Markdown as Doc nodes. This repo's code is dependency-free JavaScript: `src/reader-core.js` plus `test/reader.test.js` / `test/regression.test.js` are extracted at full symbol level (42 functions). **Not covered:** `src/reader-core.css` (presentation only), `test/fixture.html` (test fixture), YAML workflows and JSON metadata — none contain logic. The 9 Markdown files are Doc nodes (7 indexed as docs in the graph; the rest are GitHub templates). Symbol coverage of the codebase is complete.

## Topology

A single-file, portable read-aloud engine that every shell (web app, browser extensions, embedded site readers) pins by version — shells never fork it (README).

- `src/reader-core.js` — the whole engine (329 lines, zero dependencies, `package.json` main). `create(options)` builds a reader over a readable DOM (title, headings, paragraphs, list items in document order); `pickVoice` selects a speech-synthesis voice; chunk highlighting, `progress`, play/pause state (`setPlay`, `arm`/`disarm` keep-alive), and reading-position persistence (`savePos` / `clearPos`, highlight clearing `clearHi`) are all internal closures.
- `src/reader-core.css` — the reader's styles, shipped beside the engine.
- `test/` — `reader.test.js` + `regression.test.js` with an HTML fixture; `npm test` / `npm run check` are the only scripts.

## Trust boundaries

- **No trust boundary in the network sense:** the engine runs entirely in the reader's own page context, makes no network calls, and holds no credentials (grepped: no auth/token/secret/password handling in any file — 0 code files).
- **Host-page trust:** the engine reads the host document's DOM and speaks it via the platform speech-synthesis API. A hostile host page controls what is read — that is inherent to the embedding model; the engine itself sanitises nothing and executes no remote content.
- **Local state only:** reading position is kept in page-local storage via `savePos`/`clearPos`; no data leaves the device.
- **Blast radius:** one file. Any change to `src/reader-core.js` ships to every shell that pins the new version — the regression suite is the guard.

## Money surface

**No money surface found.** Grep over all code and docs for payment evidence (`stripe|paddle|billing|checkout|webhook|password|api_key`) returns no payment, billing, subscription or credential code — the package has zero dependencies and no scripts beyond check/test. Monetisation, if any, happens in the shells that embed this engine, not in this repo.

## How an agent should approach

1. Read `README.md` and `ROLLOUT.md`, then `src/reader-core.js` — at 329 lines it repays a full read.
2. Keep the zero-dependency, single-file property: shells pin this engine precisely because it has no supply chain.
3. Run `npm test` (both suites) after any change; position/highlight regressions are the historical failure class (see `test/regression.test.js`).
4. Regenerate this profile (below) whenever the engine's public `create()` surface changes.

## Regeneration

`docs/codetopo-profile/refresh.sh` (in this pack) re-downloads the repo
at a named ref, re-runs the index, and rewrites `snapshot.json`,
`stats.json` and the header block inputs of this profile. Regenerate at
every release / material change.

**Release gate: NOT RUN — Guardian Mesh: NOT RUN** (profile publication is
documentation only; no gate verdict is claimed for this pack).

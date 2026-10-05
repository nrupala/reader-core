# Contributing to reader-core

## PR flow (standing rule, 2026-10-05)

Direct pushes to `main` are retired. Every change lands through a pull request:

1. Branch from `main` head.
2. Open the PR as **draft**.
3. CI green (`npm run check`, `npm test` — see `.github/workflows/ci.yml`).
4. The owner merges; merge commits reference the PR number.
5. Every PR adds a `CHANGELOG.md` entry under `## [Unreleased]` and bumps the
   `package.json` version (patch = fix, minor = feature, major = breaking).
6. Releases are tagged `vX.Y.Z` after merge.

## Deploys

reader-core is a library, not a deployable service — there is no deploy
target and no deploy script. Shells (web app, extensions, site embeds) pin
engine versions per `ROLLOUT.md`; bumping the engine in a shell is a
deliberate PR, never a floating reference.

## Tests

- `npm run check` — `node --check src/reader-core.js` (syntax).
- `npm test` — `node test/reader.test.js` (functional; `jsdom` is the only
  dependency, installed via `npm install --no-audit --no-fund`).

## Conventions

- The engine itself has no runtime dependencies.
- Shells never fork the engine; they pin a version.
- The engine's `ReaderCore.create()` contract is stable within a major version.
- License headers: Apache-2.0 headers on all source files (see `LICENSE`).

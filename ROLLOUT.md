# Rollout policy — reader-core and its shells

One engine, versioned releases, staged shells. No silent pushes.

## Versioning

- Semantic versioning; every release is a git tag `vX.Y.Z` plus a `CHANGELOG.md` entry.
- The engine's `ReaderCore.create()` contract is stable within a major version.
- Shells (web app, extensions, site embeds) pin an engine version. Bumping the
  engine in a shell is a deliberate PR, never a floating reference.

## Rollout order (staged)

1. **Engine release** — tag, changelog, CI green.
2. **Site embeds** (nrupalakolkar.com blog, onsmartgrid, thinkwithfinance) —
   bump the vendored engine file via PR; production deploys on merge through
   the existing Cloudflare Git integration. Verify live with curl.
3. **Web app** — deploy after the embeds prove the release in production.
4. **Browser extensions** — store rollouts are staged, never 100% on day one:
   - Chrome Web Store / Edge Add-ons: staged rollout 10% → 50% → 100%,
     minimum 24h bake at each stage.
   - Firefox Add-ons: staged rollout with the same gates.
   - Safari: dropped (2026-09-28 decision). Apple users are served by the PWA
     only — no native Safari extension, no Apple Developer membership.
     The web app ships as an installable PWA covering iPhone / iPad / Mac.
5. **Rollback** — republish the previous pinned version. Every shell keeps the
   prior release artifact for one full version back.

## Provisioned updates

- Extensions update through their stores' auto-update; the web app through
  deploy; embeds through the site's deploy pipeline. Users never install
  updaters or side-load.
- A release is "provisioned" when its artifacts (tag, store submission,
  deploy) exist and its changelog is published — before any traffic moves.

## Backups

- The repository is mirrored daily (see the `reader-core-daily-backup` cron):
  timestamped tarball of `main` plus tag list, 30-day retention.
- Release tags are never force-pushed or deleted. History rewrites of any kind
  are out of scope for this repo.

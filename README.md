# reader-core

Portable read-aloud engine. One core, every shell: the web app, the browser
extensions (Chrome / Edge / Firefox / Safari), and the readers embedded in our
sites all run this engine. Shells never fork it — they pin a version.

## What it does

- Reads any readable DOM: title, headings, paragraphs, list items — in document order.
- Skips chrome: navigation, asides, footers, code blocks, reference lists (configurable).
- Splits text into sentences, highlights each as it is spoken.
- Chunks long sentences so speech stays natural.
- **Keep-alive**: re-asserts playback on an interval, defeating mobile browsers'
  habit of cutting speech off (~15s on Chrome Android) when the screen turns off
  or the app is switched.
- **Last-read-point resume**: saves the chunk index per document; revisiting
  offers "Resume" from the saved point. Cleared on natural completion.
- Play / pause / resume, stop, speed selector, progress bar.
- Prefers an on-device English voice (network voices send the text being
  read to the browser vendor's servers); hides itself where
  `speechSynthesis` is absent.

No dependencies. No build step. Works as a plain `<script>` (global
`ReaderCore`), CommonJS, or bundled.

## Usage

```html
<script src="reader-core.js"></script>
<link rel="stylesheet" href="reader-core.css">
<div id="reader-mount"></div>
<article id="content">…</article>
<script>
  var reader = ReaderCore.create({
    root: document.getElementById('content'),
    mount: document.getElementById('reader-mount'),
    blockSelector: 'h1,h2,p,li',
    excludeSelector: '.code,aside,nav,footer,script,style',
    storageKey: 'myapp:listen:' + location.pathname, // null disables resume
  });
</script>
```

**Boot contract:** never initialize while the document is still parsing —
content placed after the script has not been parsed yet and would be
invisible to the reader. Either call `create()` after the document has
been parsed, or use `ReaderCore.auto(options)`, which defers to
`DOMContentLoaded` while parsing and creates immediately otherwise
(`options.onReady(reader)` fires once the reader exists).

**Null contract:** `create()` returns `null` — and hides the mount — when
the browser has no `speechSynthesis` or nothing readable is found. A null
return is the shell's signal to tell the user, in its own UI, that
listening is unavailable on this browser; never fail silent.

## Versioning

Semantic versioning. `CHANGELOG.md` records every release. Shells pin engine
versions; the engine never breaks its `create()` contract within a major.

## License

Apache-2.0. See `LICENSE` and `NOTICE`.
Owned by [Nrupal Akolkar](https://nrupalakolkar.com) · Built with [Muse by Meta](https://muse.ai/join) — join Muse, then redeem code **101EEK** in Settings within 48 hours of joining and we both earn tokens.

#!/usr/bin/env node
/*
 * Licensed to Nrupal Akolkar under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance with the
 * License. You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// Regression tests for the defect classes the shipped embed (dogear
// v1.0.5–v1.0.7) fixed and this engine had not, until 0.2.0:
//   1. Parser order / boot contract — initialization must never run
//      while the document is still parsing; content after the script
//      must be readable. (dogear v1.0.5)
//   2. Hidden-page utterance-error cascade — an utterance error on a
//      hidden page means the OS suspended speech; advancing on it runs
//      to the end and the completion path clears the saved place.
//      (dogear v1.0.6 — the place-losing defect)
//   3. Orphan text — a body held as bare text in a container, with no
//      block markup, must be readable. (dogear v1.0.7)
//   4. Place records are pinned to their chunking (the n field).
// Run against an older engine with RC_SRC=<path to old reader-core.js>:
// every group below fails there, which is the point of a regression test.
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const engineSrc = fs.readFileSync(
  process.env.RC_SRC || path.join(__dirname, '..', 'src', 'reader-core.js'), 'utf8');
const fixture = fs.readFileSync(path.join(__dirname, 'fixture.html'), 'utf8');
const failures = [];
function check(name, cond, extra) {
  console.log((cond ? 'PASS' : 'FAIL') + ' ' + name + (extra !== undefined ? ' [' + extra + ']' : ''));
  if (!cond) failures.push(name);
}
function stubSpeech(window, spoken) {
  window.SpeechSynthesisUtterance = function (text) { this.text = text; };
  window.speechSynthesis = {
    paused: false, speaking: false,
    getVoices() { return []; },
    speak(u) { spoken.push(u); }, cancel() {}, pause() {}, resume() {},
  };
}
async function main() {
  // ---- 1. parser order: auto() called mid-parse, content follows ----------
  // Deterministic harness (the design of the embed's own smoke test):
  // scripts are eval'd by hand while readyState is 'loading'; content
  // that "the parser" adds afterwards must still be readable once
  // DOMContentLoaded fires.
  {
    const spoken = [];
    const dom = new JSDOM(
      '<!DOCTYPE html><html><body><div id="mount"></div>' +
      '<main id="content"><p>Early paragraph, parsed before the call.</p></main></body></html>',
      { url: 'https://example.com/parse-order', runScripts: 'outside-only' });
    const { window } = dom;
    stubSpeech(window, spoken);
    check('parser-order: harness starts while parsing', window.document.readyState === 'loading',
      window.document.readyState);
    window.eval(engineSrc);
    window.eval(
      'window.__reader = "unset";' +
      'if (window.ReaderCore && typeof window.ReaderCore.auto === "function") {' +
      '  window.ReaderCore.auto({ root: "#content", mount: "#mount", storageKey: null,' +
      '    onReady: function (r) { window.__reader = r; } });' +
      '} else { window.__reader = "no-auto"; }');
    check('parser-order: nothing wrapped before DOMContentLoaded',
      window.document.querySelectorAll('.rc-sent').length === 0);
    // The parser continues past the script: a late paragraph appears.
    const late = window.document.createElement('p');
    late.textContent = 'Late paragraph, parsed after the call. It must still be read.';
    window.document.getElementById('content').appendChild(late);
    window.document.dispatchEvent(new window.Event('DOMContentLoaded', { bubbles: true }));
    const reader = window.__reader;
    check('parser-order: auto() defers and creates the reader',
      !!reader && typeof reader === 'object',
      String(reader && reader.version || reader));
    const texts = Array.from(window.document.querySelectorAll('.rc-sent')).map(s => s.textContent);
    check('parser-order: content parsed AFTER the script is wrapped',
      texts.some(t => /Late paragraph/.test(t)), texts.length + ' sentences');
    check('parser-order: early content is wrapped too',
      texts.some(t => /Early paragraph/.test(t)));
  }

  // ---- 2. hidden-page utterance error must not cascade or clear the place -
  {
    const spoken = [];
    const dom = new JSDOM(fixture, {
      url: 'https://example.com/doc', runScripts: 'dangerously',
      beforeParse(window) { stubSpeech(window, spoken); window.eval(engineSrc); },
    });
    const { document } = dom.window;
    const reader = dom.window.ReaderCore.create({
      root: '#content', mount: '#mount',
      excludeSelector: '.code,aside,nav,footer,script,style',
      storageKey: 'test:pos',
    });
    document.querySelector('.rc-play').click();
    check('cascade: playing, chunk 1 spoken', reader.getState() === 'playing' && spoken.length === 1);
    spoken[0].onend(); // advance to chunk 2; place saved at i=1
    check('cascade: chunk 2 spoken', spoken.length === 2);
    const before = JSON.parse(dom.window.localStorage.getItem('test:pos'));
    check('cascade: place saved at chunk 2', !!before && before.i === 1, JSON.stringify(before));
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    // The OS kills the utterance; errors keep arriving for anything queued.
    let guard = 0;
    while (guard++ < 50) {
      const u = spoken[spoken.length - 1];
      if (!u || !u.onerror) break;
      const n = spoken.length;
      u.onerror();
      if (spoken.length === n) break;
    }
    check('cascade: no advance on hidden-page error', spoken.length === 2, spoken.length + ' utterances');
    check('cascade: reader stopped, not finished', reader.getState() === 'idle', reader.getState());
    const after = JSON.parse(dom.window.localStorage.getItem('test:pos') || 'null');
    check('cascade: saved place PRESERVED at chunk 2', !!after && after.i === 1, JSON.stringify(after));
  }

  // ---- 3. orphan text: bare text in a container, no block markup ----------
  {
    const spoken = [];
    const html = '<!DOCTYPE html><html><body><div id="mount"></div><main id="content">' +
      '<div class="body">Bare sentence one lives here. Bare sentence two follows it.</div>' +
      '</main></body></html>';
    const dom = new JSDOM(html, {
      url: 'https://example.com/orphan', runScripts: 'dangerously',
      beforeParse(window) { stubSpeech(window, spoken); window.eval(engineSrc); },
    });
    const reader = dom.window.ReaderCore.create({
      root: '#content', mount: '#mount', storageKey: null,
    });
    check('orphan: reader created for bare-text body', !!reader);
    if (reader) {
      dom.window.document.querySelector('.rc-play').click();
      check('orphan: bare text is spoken',
        spoken.length >= 1 && /Bare sentence one/.test(spoken.map(u => u.text).join(' ')),
        JSON.stringify(spoken.map(u => u.text)));
    }
  }

  // ---- 4. place record pinned to its chunking ------------------------------
  {
    const spoken = [];
    const dom = new JSDOM(fixture, {
      url: 'https://example.com/doc', runScripts: 'dangerously',
      beforeParse(window) {
        stubSpeech(window, spoken);
        // A place saved against a DIFFERENT chunking (n mismatch) is stale.
        window.localStorage.setItem('test:pos', JSON.stringify({ i: 1, n: 9999, t: Date.now() }));
        window.eval(engineSrc);
      },
    });
    dom.window.ReaderCore.create({
      root: '#content', mount: '#mount',
      excludeSelector: '.code,aside,nav,footer,script,style',
      storageKey: 'test:pos',
    });
    dom.window.document.querySelector('.rc-play').click();
    const rec = JSON.parse(dom.window.localStorage.getItem('test:pos'));
    check('place-pinning: stale-n place ignored, reading starts at chunk 1',
      spoken.length === 1 && rec && rec.i === 0, JSON.stringify(rec));
  }

  if (failures.length) { console.error('\nFAILURES: ' + failures.join(', ')); process.exit(1); }
  console.log('\nALL REGRESSION TESTS PASSED');
  process.exit(0); // readers under test may hold keep-alive timers
}

main().catch((e) => { console.error(e); process.exit(1); });

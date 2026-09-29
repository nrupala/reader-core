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
(function (global, factory) {
  if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = factory();
  } else {
    global.ReaderCore = factory();
  }
}(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  var VERSION = '0.1.0';

  var DEFAULTS = {
    // CSS selector for readable blocks, in document order.
    blockSelector: 'h1,h2,p,li',
    // Blocks matching this are never read (chrome, code, references, ...).
    excludeSelector: 'aside,nav,footer,script,style',
    // localStorage key for last-read-point resume; null disables persistence.
    storageKey: null,
    // Max characters per speech chunk.
    chunkSize: 240,
    // Keep-alive: re-assert playback every N ms (defeats mobile speech cutoffs).
    keepAliveMs: 8000,
    // Playback speeds offered.
    speeds: [0.8, 1, 1.25, 1.5],
    labels: { listen: 'Listen', pause: 'Pause', resume: 'Resume', stop: 'Stop reading', speed: 'Speed' },
  };

  function create(options) {
    var opts = {};
    for (var k in DEFAULTS) opts[k] = DEFAULTS[k];
    if (options) for (var j in options) opts[j] = options[j];

    var root = typeof opts.root === 'string' ? document.querySelector(opts.root) : opts.root;
    var mount = typeof opts.mount === 'string' ? document.querySelector(opts.mount) : opts.mount;
    if (!root || !mount) throw new Error('ReaderCore: root and mount elements are required');
    if (!('speechSynthesis' in window)) { mount.style.display = 'none'; return null; }

    var synth = window.speechSynthesis;

    // ---- controls ---------------------------------------------------------
    var speedOpts = opts.speeds.map(function (s) {
      return '<option value="' + s + '"' + (s === 1 ? ' selected' : '') + '>' + s + '\u00D7</option>';
    }).join('');
    mount.innerHTML =
      '<div class="rc-row">' +
      '<button type="button" class="rc-play" aria-pressed="false"></button>' +
      '<button type="button" class="rc-stop" disabled aria-label="' + opts.labels.stop + '">\u23F9</button>' +
      '<label class="rc-rate-label">' + opts.labels.speed +
      ' <select class="rc-rate" aria-label="' + opts.labels.speed + '">' + speedOpts + '</select></label>' +
      '<div class="rc-progress" aria-hidden="true"><span class="rc-fill"></span></div>' +
      '</div>';
    var play = mount.querySelector('.rc-play');
    var stopBtn = mount.querySelector('.rc-stop');
    var rateSel = mount.querySelector('.rc-rate');
    var fill = mount.querySelector('.rc-fill');

    // ---- readable blocks ---------------------------------------------------
    var blocks = [];
    Array.prototype.forEach.call(root.querySelectorAll(opts.blockSelector), function (el) {
      if (el.closest(opts.excludeSelector)) return;
      if (el.textContent.replace(/\s+/g, '')) blocks.push(el);
    });

    // ---- sentence split + highlight spans ----------------------------------
    var sents = [];
    blocks.forEach(function (el) {
      var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
      var nodes = [], n;
      while ((n = walker.nextNode())) { if (n.nodeValue.replace(/\s+/g, '')) nodes.push(n); }
      nodes.forEach(function (tn) {
        var parts = tn.nodeValue.split(/(?<=[.!?])\s+/);
        var frag = document.createDocumentFragment();
        parts.forEach(function (p) {
          if (!p.replace(/\s+/g, '')) return;
          var sp = document.createElement('span');
          sp.className = 'rc-sent';
          sp.textContent = p;
          frag.appendChild(sp);
          frag.appendChild(document.createTextNode(' '));
          sents.push({ el: sp, text: p.replace(/\s+/g, ' ').trim() });
        });
        tn.parentNode.replaceChild(frag, tn);
      });
    });
    if (!sents.length) { mount.style.display = 'none'; return null; }

    // ---- chunking ------------------------------------------------------------
    var chunks = [];
    sents.forEach(function (s) {
      var t = s.text, size = opts.chunkSize;
      while (t.length > size) {
        var c = t.lastIndexOf(',', size);
        if (c < 80) c = t.lastIndexOf(' ', size);
        if (c < 80) c = size;
        chunks.push({ el: s.el, text: t.slice(0, c + 1) });
        t = t.slice(c + 1).replace(/^\s+/, '');
      }
      if (t) chunks.push({ el: s.el, text: t });
    });

    // ---- voice ---------------------------------------------------------------
    var voice = null;
    function pickVoice() {
      var vs = synth.getVoices();
      if (!vs || !vs.length) return;
      var en = vs.filter(function (v) { return /^en/i.test(v.lang || ''); });
      en.sort(function (a, b) {
        var ga = /google/i.test(a.name || '') ? 0 : 1, gb = /google/i.test(b.name || '') ? 0 : 1;
        if (ga !== gb) return ga - gb;
        var ua = /en[-_]us/i.test(a.lang || '') ? 0 : 1, ub = /en[-_]us/i.test(b.lang || '') ? 0 : 1;
        return ua - ub;
      });
      voice = (en[0] || vs[0]) || null;
    }
    try { if ('onvoiceschanged' in synth) synth.onvoiceschanged = pickVoice; } catch (e) {}
    pickVoice();

    // ---- state + position persistence -----------------------------------------
    var state = 'idle', idx = 0, gen = 0, keepAlive = null;
    function savePos() {
      if (!opts.storageKey) return;
      try { localStorage.setItem(opts.storageKey, JSON.stringify({ i: idx, t: Date.now() })); } catch (e) {}
    }
    function clearPos() {
      if (!opts.storageKey) return;
      try { localStorage.removeItem(opts.storageKey); } catch (e) {}
    }
    try {
      var sp = JSON.parse(localStorage.getItem(opts.storageKey) || 'null');
      if (sp && sp.i > 0 && sp.i < chunks.length) idx = sp.i;
    } catch (e) {}

    function clearHi() { var h = root.querySelector('.rc-sent.rc-reading'); if (h) h.classList.remove('rc-reading'); }
    function progress(i) { if (fill) fill.style.width = (i < 0 ? 0 : Math.round(((i + 1) / chunks.length) * 100)) + '%'; }
    function setPlay() {
      if (state === 'playing') play.innerHTML = '\u23F8 ' + opts.labels.pause;
      else if (state === 'paused') play.innerHTML = '\u25B6 ' + opts.labels.resume;
      else play.innerHTML = (idx > 0 ? '\u25B6 ' + opts.labels.resume : '\uD83D\uDD0A ' + opts.labels.listen);
      play.setAttribute('aria-pressed', state === 'playing' ? 'true' : 'false');
      if (stopBtn) stopBtn.disabled = (state === 'idle');
    }
    function disarm() { if (keepAlive) { clearInterval(keepAlive); keepAlive = null; } }
    function arm() {
      disarm();
      keepAlive = setInterval(function () {
        try { if (state === 'playing' && !synth.paused) synth.resume(); } catch (e) {}
      }, opts.keepAliveMs);
    }
    function speak(i, g) {
      if (g !== gen || state !== 'playing') return;
      if (i >= chunks.length) { stopAll(true); return; }
      idx = i; savePos();
      var ch = chunks[i];
      clearHi();
      ch.el.classList.add('rc-reading');
      var u = new SpeechSynthesisUtterance(ch.text);
      if (voice) u.voice = voice;
      try { u.rate = parseFloat(rateSel.value) || 1; } catch (e) { u.rate = 1; }
      u.onend = function () { if (g !== gen || state !== 'playing') return; progress(i); speak(i + 1, g); };
      u.onerror = function () { if (g !== gen || state !== 'playing') return; speak(i + 1, g); };
      try { synth.speak(u); } catch (e) { if (g === gen && state === 'playing') speak(i + 1, g); }
    }
    function doPlay() {
      if (state === 'playing') { try { synth.pause(); } catch (e) {} state = 'paused'; setPlay(); disarm(); return; }
      if (state === 'paused') { try { synth.resume(); } catch (e) {} state = 'playing'; setPlay(); arm(); return; }
      gen++;
      try { synth.cancel(); } catch (e) {}
      state = 'playing'; setPlay(); arm(); speak(idx, gen);
    }
    function stopAll(done) {
      gen++; disarm();
      try { synth.cancel(); } catch (e) {}
      state = 'idle';
      if (done) { idx = 0; clearPos(); }
      clearHi(); progress(-1); setPlay();
    }

    play.addEventListener('click', doPlay);
    if (stopBtn) stopBtn.addEventListener('click', function () { stopAll(false); });
    if (rateSel) rateSel.addEventListener('change', function () {
      if (state !== 'playing') return;
      gen++;
      try { synth.cancel(); } catch (e) {}
      speak(idx, gen);
    });
    function onPageHide() { stopAll(false); }
    document.addEventListener('pagehide', onPageHide);

    if (idx > 0) progress(idx - 1);
    setPlay();

    return {
      version: VERSION,
      play: doPlay,
      stop: function () { stopAll(false); },
      getState: function () { return state; },
      getProgress: function () { return chunks.length ? idx / chunks.length : 0; },
      destroy: function () {
        stopAll(false);
        document.removeEventListener('pagehide', onPageHide);
        mount.innerHTML = '';
      },
    };
  }

  return { VERSION: VERSION, create: create, DEFAULTS: DEFAULTS };
}));

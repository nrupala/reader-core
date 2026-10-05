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
// reader-core functional test: drive create() through play -> advance ->
// pause -> resume -> speed -> stop -> revisit-resume -> completion.
// Plain node asserts; jsdom provides the DOM, speech is stubbed.
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const engineSrc = fs.readFileSync(path.join(__dirname, '..', 'src', 'reader-core.js'), 'utf8');
const fixture = fs.readFileSync(path.join(__dirname, 'fixture.html'), 'utf8');
const failures = [];
function check(name, cond, extra) {
  console.log((cond ? 'PASS' : 'FAIL') + ' ' + name + (extra !== undefined ? ' [' + extra + ']' : ''));
  if (!cond) failures.push(name);
}

function makeDom(seedPos) {
  const spoken = [];
  const intervals = [];
  const dom = new JSDOM(fixture, {
    url: 'https://example.com/doc',
    runScripts: 'dangerously',
    beforeParse(window) {
      window.SpeechSynthesisUtterance = function (text) { this.text = text; };
      window.speechSynthesis = {
        paused: false, getVoices() { return []; },
        speak(u) { spoken.push(u); }, cancel() {}, pause() {}, resume() {},
      };
      const orig = window.setInterval.bind(window);
      window.setInterval = (fn, ms) => { intervals.push(ms); return orig(fn, ms); };
      if (seedPos) window.localStorage.setItem('test:pos', JSON.stringify(seedPos));
      window.eval(engineSrc);
    },
  });
  return { dom, spoken, intervals };
}

// ---- run 1: full interaction -----------------------------------------------
let { dom, spoken, intervals } = makeDom(null);
let document = dom.window.document;
const reader = dom.window.ReaderCore.create({
  root: '#content', mount: '#mount',
  excludeSelector: '.code,aside,nav,footer,script,style',
  storageKey: 'test:pos',
});
check('engine version', dom.window.ReaderCore.VERSION === '0.1.0', dom.window.ReaderCore.VERSION);
check('controls rendered', !!document.querySelector('.rc-row'));
const sents = document.querySelectorAll('.rc-sent');
check('sentences wrapped', sents.length >= 6, sents.length + ' spans');
const navText = Array.from(sents).some(s => /navigation/i.test(s.textContent));
check('chrome excluded (nav/aside/footer/code)', !navText);

const play = document.querySelector('.rc-play');
const stopBtn = document.querySelector('.rc-stop');
const fill = document.querySelector('.rc-fill');
play.click();
check('play: state playing', reader.getState() === 'playing');
check('play: one chunk spoken', spoken.length === 1);
check('play: highlight on', document.querySelectorAll('.rc-sent.rc-reading').length === 1);
check('play: keep-alive armed', intervals.includes(8000), intervals.join(','));
check('play: stop enabled', stopBtn.disabled === false);

spoken[0].onend();
check('advance: chunk 2 spoken', spoken.length === 2);
check('advance: progress moved', fill.style.width !== '0%', fill.style.width);
const chunk1 = spoken[1].text;

play.click();
check('pause: state paused', reader.getState() === 'paused');
play.click();
check('resume: state playing', reader.getState() === 'playing');

const saved = JSON.parse(dom.window.localStorage.getItem('test:pos'));
check('position persisted', saved && saved.i === 1, JSON.stringify(saved));

stopBtn.click();
check('manual stop: Resume offered', play.textContent.includes('Resume'));

// ---- run 2: revisit with saved position -------------------------------------
({ dom, spoken } = makeDom({ i: 1, t: Date.now() }));
document = dom.window.document;
const reader2 = dom.window.ReaderCore.create({
  root: '#content', mount: '#mount',
  excludeSelector: '.code,aside,nav,footer,script,style',
  storageKey: 'test:pos',
});
const play2 = document.querySelector('.rc-play');
check('revisit: Resume offered', play2.textContent.includes('Resume'), play2.textContent);
play2.click();
check('revisit: resumes at saved chunk', spoken.length === 1 && spoken[0].text === chunk1);

// ---- run 2b: natural completion clears position ------------------------------
let guard = 0;
while (guard++ < 5000) {
  const u = spoken[spoken.length - 1];
  if (!u || !u.onend) break;
  const before = spoken.length;
  u.onend();
  if (spoken.length === before) break;
}
check('completion: position cleared', dom.window.localStorage.getItem('test:pos') === null);
check('completion: back to Listen', document.querySelector('.rc-play').textContent.includes('Listen'));
check('completion: state idle', reader2.getState() === 'idle');

// ---- unsupported browser hides controls --------------------------------------
const { dom: dom3 } = makeDom(null);
delete dom3.window.speechSynthesis;
dom3.window.eval(engineSrc);
const r3 = dom3.window.ReaderCore.create({ root: '#content', mount: '#mount' });
check('no speechSynthesis: returns null, mount hidden',
  r3 === null && dom3.window.document.querySelector('#mount').style.display === 'none');

if (failures.length) { console.error('\nFAILURES: ' + failures.join(', ')); process.exit(1); }
console.log('\nALL READER-CORE TESTS PASSED');

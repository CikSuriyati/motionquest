/**
 * MOTION QUEST — sound effects (copied from Graph Quest)
 * ------------------------------------------------------------------
 * Short tones made by the browser (Web Audio), so there are no audio
 * files to download. On by default; the 🔊 button in the top bar mutes
 * it, and the choice is remembered on this device.
 *
 *   SFX.play('tap' | 'wrong' | 'right' | 'win' | 'badge' | 'rank' | 'discover' | 'step', i?)
 *   SFX.on        → true when sound is on
 *   SFX.toggle()  → flips it and returns the new state
 *
 * Silent on the pre-test and post-test, so they stay calm and fair.
 */
(function (root) {
  'use strict';

  const KEY = 'motionquest.sound';
  let on = true;
  try { on = localStorage.getItem(KEY) !== 'off'; } catch (e) { }

  let ac = null, lastSound = 0;
  function ctx() {
    const A = root.AudioContext || root.webkitAudioContext;
    if (!A) return null;
    if (!ac) ac = new A();
    if (ac.state !== 'running') ac.resume();   // 'suspended', or iOS 'interrupted'
    return ac;
  }

  /* Phones only let a page make sound after a touch, and the unlocking has to
     happen inside that touch. So on every touch until audio is running:
     start the audio context and play one silent sample. On iPhone, also ask
     for the 'playback' audio session so the game can be heard with the
     silent switch on — the 🔊 button is how students mute it. */
  function unlock() {
    if (!on) return;
    try {
      if (navigator.audioSession) navigator.audioSession.type = 'playback';
      const a = ctx(); if (!a) return;
      const src = a.createBufferSource();
      src.buffer = a.createBuffer(1, 1, 22050);
      src.connect(a.destination); src.start(0);
      if (a.state === 'running') ['touchstart', 'touchend', 'pointerdown', 'click', 'keydown'].forEach(t => document.removeEventListener(t, unlock, true));
    } catch (e) { }
  }
  ['touchstart', 'touchend', 'pointerdown', 'click', 'keydown'].forEach(t => document.addEventListener(t, unlock, true));
  /* Coming back to the tab (or after a phone call) can leave audio paused. */
  document.addEventListener('visibilitychange', () => { if (!document.hidden && ac && ac.state !== 'running') ac.resume(); });

  /** One note: frequency (Hz), start offset and length (s), wave, volume, optional slide to f2. */
  function note(a, f, at, len, type, vol, f2) {
    const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + at;
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + len);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g).connect(a.destination);
    o.start(t); o.stop(t + len + 0.02);
  }
  const run = (a, notes, type, vol, gap, len) => notes.forEach((f, i) => note(a, f, i * gap, len, type, vol));

  const SOUNDS = {
    tap: a => note(a, 620, 0, 0.09, 'sine', 0.1, 880),
    wrong: a => { note(a, 240, 0, 0.2, 'triangle', 0.16, 150); note(a, 180, 0.09, 0.22, 'triangle', 0.1, 120); },
    right: a => run(a, [784, 1175], 'sine', 0.13, 0.09, 0.18),
    win: a => { run(a, [523, 659, 784], 'triangle', 0.14, 0.1, 0.16); note(a, 1047, 0.3, 0.45, 'triangle', 0.15); },
    badge: a => run(a, [1319, 1568, 2093, 2637], 'sine', 0.09, 0.07, 0.22),
    rank: a => { run(a, [523, 659, 784, 1047], 'triangle', 0.13, 0.11, 0.18); [523, 659, 784].forEach(f => note(a, f * 2, 0.46, 0.7, 'sine', 0.07)); },
    discover: a => { run(a, [587, 740, 880], 'sine', 0.12, 0.12, 0.2); note(a, 1175, 0.36, 0.6, 'triangle', 0.13); },
    vroom: a => { note(a, 90, 0, 0.55, 'sawtooth', 0.05, 220); note(a, 180, 0.05, 0.5, 'triangle', 0.05, 330); },
    step: (a, i) => note(a, [523, 587, 659, 698, 784, 1047][i] || 523, 0, 0.5, 'triangle', 0.14)
  };

  function inTest() {
    const t = document.getElementById('screen-test');
    return !!t && !t.classList.contains('hidden');
  }

  function play(name, arg) {
    if (!on || !SOUNDS[name] || inTest()) return;
    if (name !== 'tap' && name !== 'step') lastSound = Date.now();
    try { const a = ctx(); if (a) SOUNDS[name](a, arg); } catch (e) { }
  }

  function toggle() {
    on = !on;
    try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (e) { }
    if (on) { unlock(); play('tap'); }
    return on;
  }

  /* A soft pop for every tap on a place or line of a map — unless that tap
     already made its own sound (a mistake, a right answer, a cleared level).
     The tap is noted before the map's handler runs (it may redraw the map),
     and the pop decided once it has finished. */
  document.addEventListener('click', ev => {
    const t = ev.target.closest && ev.target.closest('svg [data-tap], .opt-graph');
    if (!t) return;
    const at = Date.now();
    setTimeout(() => { if (lastSound < at) play('tap'); }, 0);
  }, true);

  root.SFX = { play, toggle, get on() { return on; } };
})(window);

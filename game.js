/**
 * MOTION QUEST — the game shell
 * ------------------------------------------------------------------
 * Entry, map, How to play, the level player, XP and badges, Discover,
 * My progress and sending results. Built the same way as Graph Quest:
 * progress lives on the device; Submit results posts attempt rows and
 * test rows to a Google Apps Script (the Graph Quest collector works
 * unchanged — give Motion Quest its own Sheet).
 */

/* ============================================================
   1. CONFIG — paste your Apps Script Web App URL here
   ============================================================ */
const ENDPOINT = 'PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE';
const STORE = 'motionquest.v1';
const LANG_KEY = 'motionquest-lang';

/* ============================================================
   2. LANGUAGE — Bahasa Melayu first, English on the button
   ============================================================ */
let LANG = 'bm';
try { const s = localStorage.getItem(LANG_KEY); if (s === 'bm' || s === 'en') LANG = s; } catch (e) { }
function T(en, bm) { return LANG === 'bm' ? bm : en; }
const tt = pair => T(pair[0], pair[1]);
const txt = x => (typeof x === 'function' ? x() : Array.isArray(x) ? tt(x) : x || '');

/* ============================================================
   3. CONTENT
   ============================================================ */
const STAGES = MQ.STAGES, MISTAKES = MQ.MISTAKES;
const RANK_XP = 350;
const RANKS = [['Rookie', 'Pemula'], ['Learner Driver', 'Pelumba Muda'], ['Graph Reader', 'Pembaca Graf'],
['Gradient Expert', 'Pakar Kecerunan'], ['Track Champion', 'Juara Litar'], ['Motion Legend', 'Lagenda Gerakan']];
const BADGES = [
  { k: 'first_lap', icon: '🚩', name: ['First Lap', 'Pusingan Pertama'], how: ['Finish your first level', 'Tamatkan tahap pertama anda'] },
  { k: 'eagle_eye', icon: '🦅', name: ['Eagle Eye', 'Mata Helang'], how: ['Every Stage 1 level with no mistakes', 'Semua tahap Peringkat 1 tanpa kesilapan'] },
  { k: 'gradient_guru', icon: '📈', name: ['Gradient Guru', 'Pakar Kecerunan'], how: ['5 speeds or accelerations right first time', '5 laju atau pecutan betul pada cubaan pertama'] },
  { k: 'graph_artist', icon: '✏️', name: ['Graph Artist', 'Pelukis Graf'], how: ['Draw 3 graphs right first time', 'Lukis 3 graf betul pada cubaan pertama'] },
  { k: 'area_ace', icon: '📐', name: ['Area Ace', 'Raja Luas'], how: ['Clear Stage 5 without worked solutions', 'Tamatkan Peringkat 5 tanpa melihat jalan kerja'] },
  { k: 'track_champion', icon: '🏆', name: ['Track Champion', 'Juara Litar'], how: ['Win all 3 races', 'Menang ketiga-tiga perlumbaan'] }
];

/* ============================================================
   4. SAVED PROGRESS (this device only)
   ============================================================ */
function blank() { return { classCode: '', reg: '', best: {}, done: {}, perfect: {}, noLearn: {}, won: {}, counts: { grad: 0, draw: 0 }, badges: [], discovered: {}, attempts: [], sent: 0, tests: [], testsSent: 0 }; }
let st = blank();
try { const raw = localStorage.getItem(STORE); if (raw) st = Object.assign(blank(), JSON.parse(raw)); } catch (e) { }
function save() { try { localStorage.setItem(STORE, JSON.stringify(st)); } catch (e) { } }
const studentCode = () => st.classCode.split('-')[0] + '-' + st.reg;

const lvKey = (s, i) => s + '-' + (i + 1);
const stageOf = n => STAGES.find(s => s.n === n);
const stageDone = n => stageOf(n).levels.every((_, i) => st.done[lvKey(n, i)]);
const OPEN_ALL = new URLSearchParams(location.search).get('unlock') === 'all';   // for a teacher's demo
const stageOpen = n => OPEN_ALL || n === 1 || stageDone(n - 1);
const unlocked = (s, i) => stageOpen(s) && (OPEN_ALL || i === 0 || !!st.done[lvKey(s, i - 1)]);
const TOTAL_LEVELS = STAGES.reduce((a, s) => a + s.levels.length, 0);
const clearedCount = () => Object.keys(st.done).filter(k => st.done[k]).length;
function totalXP() { return Object.values(st.best).reduce((a, b) => a + b, 0) + 20 * Object.keys(st.discovered).filter(k => st.discovered[k]).length; }
const rankOf = xp => Math.min(Math.floor(xp / RANK_XP), RANKS.length - 1);
if (st.rankSeen == null) st.rankSeen = rankOf(totalXP());
const mastery = n => stageOf(n).levels.reduce((a, _, i) => a + (st.best[lvKey(n, i)] || 0), 0) / stageOf(n).levels.length;

/* ============================================================
   5. SCREENS
   ============================================================ */
const $ = id => document.getElementById(id);
const SCREENS = ['entry', 'map', 'guide', 'level', 'discover', 'progress', 'test'];
let current = 'entry';
function show(name) {
  if (name !== 'level') { MK.stop(); stopRace(); clearInterval(clockTimer); }
  current = name;
  SCREENS.forEach(s => $('screen-' + s).classList.toggle('hidden', s !== name));
  updateNavigation();
  window.scrollTo({ top: 0, behavior: 'instant' });
  requestAnimationFrame(() => {
    const h = $('screen-' + name).querySelector('h1, h2');
    if (current === name && h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
  });
}
function updateNavigation() {
  const visible = st.classCode && !['entry', 'test'].includes(current);
  $('nav-map').classList.toggle('hidden', !visible);
  $('nav-progress').classList.toggle('hidden', !visible);
  $('nav-map').textContent = T('Map', 'Peta');
  $('nav-progress').textContent = T('My progress', 'Kemajuan saya');
  $('nav-help').classList.toggle('hidden', current === 'test');
  $('nav-help').textContent = T('How to play', 'Cara bermain');
  $('nav-map').setAttribute('aria-current', current === 'map' ? 'page' : 'false');
  $('nav-progress').setAttribute('aria-current', current === 'progress' ? 'page' : 'false');
  $('nav-help').setAttribute('aria-current', current === 'guide' ? 'page' : 'false');
}
$('nav-map').addEventListener('click', () => { renderMap(); show('map'); });
$('nav-progress').addEventListener('click', () => { renderProgress(); show('progress'); });
$('nav-help').addEventListener('click', () => openGuide(false));

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2800);
}

function applyLang() {
  document.documentElement.lang = LANG === 'bm' ? 'ms' : 'en';
  $('btn-lang').textContent = LANG === 'bm' ? 'EN' : 'BM';
  $('btn-lang').setAttribute('aria-label', T('Tukar ke Bahasa Melayu', 'Switch to English'));
  soundButton();
  updateNavigation();
  ({ entry: renderEntry, map: renderMap, guide: renderGuide, level: renderTask, discover: renderDiscover, progress: renderProgress, test: () => MQT.render() })[current]();
}
function soundButton() {
  $('btn-sound').textContent = SFX.on ? '🔊' : '🔇';
  $('btn-sound').setAttribute('aria-pressed', String(SFX.on));
  $('btn-sound').setAttribute('aria-label', SFX.on ? T('Sound on — tap to mute', 'Bunyi hidup — ketik untuk senyap') : T('Sound off — tap to turn on', 'Bunyi mati — ketik untuk hidupkan'));
  $('btn-sound').title = $('btn-sound').getAttribute('aria-label');
}
$('btn-sound').addEventListener('click', () => { SFX.toggle(); soundButton(); });
$('btn-lang').addEventListener('click', () => {
  const keep = current === 'entry' ? [$('in-class').value, $('in-reg').value] : null;
  const box = $('ans-num'), typed = box ? box.value : null;
  LANG = LANG === 'bm' ? 'en' : 'bm';
  try { localStorage.setItem(LANG_KEY, LANG); } catch (e) { }
  applyLang();
  if (keep) { $('in-class').value = keep[0]; $('in-reg').value = keep[1]; }
  if (typed != null && $('ans-num')) $('ans-num').value = typed;
});

/* ============================================================
   6. ENTRY
   ============================================================ */
function renderEntry() {
  $('entry-kicker').textContent = T('SPM Form 4 · Graphs of Motion', 'SPM Tingkatan 4 · Graf Gerakan');
  $('entry-title').innerHTML = T('Every graph tells a <span class="script">journey</span>', 'Setiap graf ada <span class="script">kisahnya</span>');
  $('entry-lede').textContent = T('Watch the car move, then read it, draw it and work it out from the graph. Distance–time, speed–time, gradient and area — with instant feedback on every answer.',
    'Tonton kereta bergerak, kemudian baca, lukis dan hitung daripada grafnya. Graf jarak-masa, graf laju-masa, kecerunan dan luas, dengan maklum balas segera bagi setiap jawapan.');
  $('chip-1').textContent = T('6 stages', '6 peringkat');
  $('chip-2').textContent = T('3 levels each', '3 tahap setiap satu');
  $('chip-3').textContent = T('BM & English', 'BM & English');
  $('lbl-class').textContent = T('Class code', 'Kod kelas');
  $('lbl-reg').textContent = T('Register number', 'Nombor giliran');
  $('entry-privacy').textContent = T('Your teacher gives you the class code. No names or passwords. Your progress is saved on this device.',
    'Guru anda akan memberi kod kelas. Tiada nama atau kata laluan. Kemajuan anda disimpan pada peranti ini.');
  $('btn-enter').textContent = T('Start your engine →', 'Hidupkan enjin →');
  $('btn-entry-help').textContent = T('How to play', 'Cara bermain');
  $('entry-guide').innerHTML = [
    T('Take the short pre-test', 'Jawab ujian pra yang ringkas'), T('Race through the 6 stages', 'Lalui 6 peringkat'),
    T('Submit results on My progress', 'Hantar keputusan di Kemajuan saya'), T('Take the post-test — done!', 'Jawab ujian pasca — selesai!')
  ].map((x, i) => '<li><b>' + (i + 1) + '</b><span>' + x + '</span></li>').join('');
  $('join-title').textContent = T('Ready to drive?', 'Sedia untuk memandu?');
  $('art-caption').textContent = T('Up, flat, down — every line is a move.', 'Naik, mendatar, turun: setiap garis ialah satu gerakan.');
  $('entry-error').textContent = '';
  $('in-class').value = st.classCode; $('in-reg').value = st.reg;
}
$('btn-enter').addEventListener('click', () => {
  const cc = $('in-class').value.trim().toUpperCase().replace(/\s+/g, '');
  const rg = $('in-reg').value.trim();
  const okC = /^[A-Z0-9]+(-[A-Z0-9]+)*$/.test(cc), okR = /^\d{1,3}$/.test(rg) && +rg >= 1;
  $('in-class').classList.toggle('bad', !okC); $('in-reg').classList.toggle('bad', !okR);
  $('entry-error').textContent = !okC ? T('Enter your class code, for example 4S1-2026.', 'Masukkan kod kelas, contohnya 4S1-2026.') : !okR ? T('Enter a register number from 1 to 999.', 'Masukkan nombor giliran dari 1 hingga 999.') : '';
  if (!okC) return $('in-class').focus();
  if (!okR) return $('in-reg').focus();
  if (st.classCode && (st.classCode !== cc || st.reg !== String(+rg))) {
    if (!confirm(T('This device has progress for ' + studentCode() + '. Start fresh as ' + cc.split('-')[0] + '-' + (+rg) + '?',
      'Peranti ini ada kemajuan untuk ' + studentCode() + '. Mula baharu sebagai ' + cc.split('-')[0] + '-' + (+rg) + '?'))) return;
    st = blank();
  }
  st.classCode = cc; st.reg = String(+rg); save();
  enterGame();
});
$('btn-entry-help').addEventListener('click', () => openGuide(false));
['in-class', 'in-reg'].forEach(id => {
  $(id).addEventListener('input', e => { e.target.classList.remove('bad'); $('entry-error').textContent = ''; });
  $(id).addEventListener('keydown', e => { if (e.key === 'Enter') $('btn-enter').click(); });
});
function enterGame() {
  if (MQT.fromUrl()) return;
  const toMap = () => { renderMap(); show('map'); };
  const afterPre = () => (st.guideSeen ? toMap() : openGuide(true));
  if (MQT.needPre()) return MQT.start('pre', afterPre);
  afterPre();
}

/* ============================================================
   7. HOW TO PLAY
   ============================================================ */
let guideFirst = false, guideBack = 'map';
function openGuide(first) {
  guideFirst = !!first;
  guideBack = current === 'guide' ? guideBack : current;
  st.guideSeen = true; save();
  renderGuide(); show('guide');
}
function renderGuide() {
  const tests = st.tests || [], cleared = clearedCount(), need = MQT.POST_AFTER_LEVELS, postDone = tests.some(r => r.test === 'post');
  const stops = [
    { icon: '🚩', done: !!st.classCode, h: T('Start', 'Mula'), say: T('Type the class code from your teacher and your register number.', 'Taip kod kelas daripada guru dan nombor giliran anda.') },
    { icon: '📝', done: tests.some(r => r.test === 'pre') || cleared > 0, h: T('Pre-test', 'Ujian pra'), say: T('Answer 10 questions on your own. It is not for your grade.', 'Jawab 10 soalan secara sendiri. Ujian ini tidak dikira untuk gred.') },
    { icon: '🚗', done: cleared >= need, h: T('Drive through the 6 stages', 'Lalui 6 peringkat'), say: T('Each stage has 3 levels. A stage opens when you clear the one before it. Clear at least ' + need + ' levels.', 'Setiap peringkat ada 3 tahap. Peringkat seterusnya dibuka apabila anda selesaikan peringkat sebelumnya. Selesaikan sekurang-kurangnya ' + need + ' tahap.') },
    { icon: '📤', done: st.sent > 0, h: T('Submit at My progress', 'Hantar di Kemajuan saya'), say: T('Press Submit results. It does not end the game.', 'Tekan Hantar keputusan. Ini tidak menamatkan permainan.') },
    { icon: '✏️', done: postDone, h: T('Post-test', 'Ujian pasca'), say: T('Take it only when you have finished playing. You get one try.', 'Jawab hanya apabila anda sudah selesai bermain. Anda ada satu cubaan sahaja.') },
    { icon: '🏆', done: postDone, h: T('Finish!', 'Tamat!'), say: T('See your score before and after.', 'Lihat markah anda sebelum dan selepas.') }
  ];
  const here = stops.findIndex(x => !x.done);
  const card = (n, h, items) => '<div class="guide-card"><div class="qn">' + n + '</div><div><h3>' + h + '</h3><ul>' + items.map(x => '<li>' + x + '</li>').join('') + '</ul></div></div>';
  $('screen-guide').innerHTML =
    '<div class="kicker">' + T('Player guide', 'Panduan pemain') + '</div>' +
    '<h1>' + T('How to <span class="script">play</span>', 'Cara <span class="script">bermain</span>') + '</h1>' +
    '<p class="guide-lede">' + T('Motion Quest turns the Form 4 chapter <i>Graphs of Motion</i> into a road trip in six stages.', 'Motion Quest menjadikan bab Tingkatan 4 <i>Graf Gerakan</i> satu perjalanan dalam enam peringkat.') + '</p>' +
    '<h2 class="guide-h2">' + T('Your journey, step by step', 'Perjalanan anda, langkah demi langkah') + '</h2>' +
    '<ol class="quest-path">' + stops.map((x, i) => '<li class="qp-stop' + (x.done ? ' done' : '') + (st.classCode && i === here ? ' here' : '') + '"><span class="qp-dot" aria-hidden="true">' + (x.done ? '✓' : x.icon) + '</span>' +
      '<div class="qp-body"><div class="qp-step">' + T('Step ', 'Langkah ') + (i + 1) + (st.classCode && i === here ? ' · <b>' + T('You are here', 'Anda di sini') + '</b>' : '') + '</div><h3>' + x.icon + ' ' + x.h + '</h3><p>' + x.say + '</p>' +
      (i === 2 ? '<div class="qp-worlds">' + STAGES.map(s => '<span class="qp-world" style="--world-color:var(' + s.c + ')"><i aria-hidden="true">' + s.icon + '</i><b>' + s.n + '</b> ' + tt(s.name) + '</span>').join('') + '</div>' : '') + '</div></li>').join('') + '</ol>' +
    '<h2 class="guide-h2">' + T('The details', 'Butiran') + '</h2><div class="guide-grid">' +
    card(1, T('Watch the car', 'Tonton kereta'), [
      T('Press <b>▶ Play</b> to watch the car move along the graph. The dot on the graph shows where it is.', 'Tekan <b>▶ Main</b> untuk melihat kereta bergerak mengikut graf. Titik pada graf menunjukkan kedudukannya.'),
      T('On a drawing level, a wrong graph drives your car next to the correct (blue) one, so you can see the difference.', 'Dalam tahap melukis, graf yang salah menggerakkan kereta anda di sebelah kereta biru yang betul, supaya anda nampak bezanya.')]) +
    card(2, T('Answering', 'Menjawab'), [
      T('Tap a graph, tap a part of a graph, drag points, or type a number. Numbers can have a decimal point and a minus sign.', 'Ketik graf, ketik bahagian graf, seret titik, atau taip nombor. Nombor boleh ada titik perpuluhan dan tanda negatif.'),
      T('Every wrong answer is explained. <b>Mistakes cost only a little</b>, and your best score counts.', 'Setiap jawapan salah diterangkan. <b>Kesilapan hanya merugikan sedikit</b>, dan markah terbaik anda yang dikira.'),
      T('<b>Hint</b> gives a nudge. After two tries, <b>Worked solution</b> shows the working (−10 XP).', '<b>Petunjuk</b> memberi bantuan. Selepas dua cubaan, <b>Jalan kerja</b> menunjukkan penyelesaian (−10 XP).')]) +
    card(3, T('XP and badges', 'XP dan lencana'), [
      T('Up to <b>100 XP</b> a level: 60 for solving (less for each mistake), 20 for the quick check, 10 for no hints, 10 for speed.', 'Sehingga <b>100 XP</b> setiap tahap: 60 kerana selesai (berkurang bagi setiap kesilapan), 20 untuk semakan pantas, 10 tanpa petunjuk, 10 untuk kelajuan.'),
      T('In the races, beat the blue car for +30 XP.', 'Dalam perlumbaan, kalahkan kereta biru untuk +30 XP.'),
      T('A new rank every ' + RANK_XP + ' XP and 6 badges to collect.', 'Pangkat baharu setiap ' + RANK_XP + ' XP dan 6 lencana untuk dikumpul.')]) +
    card(4, T('Discover the rule', 'Temui peraturan'), [
      T('Clear a stage’s 3 levels and <b>Discover</b> opens. Pick the rule you noticed, then see its textbook name (+20 XP).', 'Tamatkan 3 tahap sesuatu peringkat dan <b>Temui</b> dibuka. Pilih peraturan yang anda perasan, kemudian lihat nama dalam buku teks (+20 XP).')]) +
    '</div>' +
    '<h2 class="guide-h2">' + T('Badges to collect', 'Lencana untuk dikumpul') + ' <small>' + st.badges.length + ' / ' + BADGES.length + '</small></h2>' +
    '<div class="badge-gallery">' + BADGES.map(b => '<div class="bg-item' + (st.badges.includes(b.k) ? ' got' : '') + '"><span class="bg-icon" aria-hidden="true">' + b.icon + '</span><div><b>' + tt(b.name) + '</b><small>' + tt(b.how) + '</small>' + (st.badges.includes(b.k) ? '<em>' + T('Earned!', 'Diperoleh!') + '</em>' : '') + '</div></div>').join('') + '</div>' +
    '<div class="row" style="margin-top:22px;"><button class="btn" id="guide-go">' + (!st.classCode ? T('← Back', '← Kembali') : guideFirst ? T('Start playing →', 'Mula bermain →') : T('Back', 'Kembali')) + '</button></div>';
  $('guide-go').addEventListener('click', () => {
    if (!st.classCode) { renderEntry(); return show('entry'); }
    if (guideBack === 'progress' && !guideFirst) { renderProgress(); return show('progress'); }
    renderMap(); show('map');
  });
}

/* ============================================================
   8. MAP
   ============================================================ */
function landmark(n) {
  const road = '<path d="M-10 128C60 110 110 140 170 118S260 100 310 112" stroke="#d8cfc4" stroke-width="20" fill="none"/><path d="M-10 128C60 110 110 140 170 118S260 100 310 112" stroke="#fff" stroke-width="2" stroke-dasharray="10 9" fill="none"/>';
  const carS = (x, y, c) => '<g transform="translate(' + x + ' ' + y + ')"><path d="M-20 -7L-16 -16H2L8 -9L18 -7Q21 -6 21 -2V1H-21V-3Q-21 -7 -20 -7Z" fill="' + c + '" stroke="#17130c" stroke-width="2"/><circle cx="-11" cy="2" r="5" fill="#17130c"/><circle cx="11" cy="2" r="5" fill="#17130c"/></g>';
  const axesS = '<path d="M70 20V100H240" stroke="#17130c" stroke-width="4" fill="none"/>';
  const scenes = {
    1: road + '<path d="M40 110V60l26 9-26 9" stroke="#17130c" stroke-width="3" fill="#a2dd70"/>' + carS(150, 118, '#ee6c34') + '<g transform="translate(230 70)"><rect x="-6" y="-30" width="12" height="36" fill="#fff"/><rect x="-6" y="-30" width="6" height="6" fill="#17130c"/><rect y="-24" width="6" height="6" fill="#17130c"/><rect x="-6" y="-18" width="6" height="6" fill="#17130c"/><rect y="-12" width="6" height="6" fill="#17130c"/></g>',
    2: axesS + '<path d="M70 100L120 60H160L230 30" stroke="#ee6c34" stroke-width="7" fill="none" stroke-linejoin="round"/><circle cx="250" cy="110" r="22" fill="#fff" stroke="#17130c" stroke-width="4"/><path d="M250 110l10-12M250 96v-4" stroke="#17130c" stroke-width="3" stroke-linecap="round"/>',
    3: axesS + '<path d="M70 100L130 50H180L230 100" stroke="#8d867e" stroke-width="3" stroke-dasharray="6 7" fill="none"/><g fill="#fff" stroke="#17130c" stroke-width="3"><circle cx="130" cy="50" r="8"/><circle cx="180" cy="50" r="8"/><circle cx="230" cy="100" r="8"/></g><path d="M238 30l18-18 10 10-18 18-14 4z" fill="#ffd54a" stroke="#17130c" stroke-width="3"/>',
    4: road + carS(120, 124, '#ee6c34') + '<path d="M82 116h-22M86 124h-34M82 132h-22" stroke="#8d867e" stroke-width="3" stroke-linecap="round"/><path d="M200 30l30 20-30 20" stroke="#17130c" stroke-width="5" fill="none"/><path d="M180 30l30 20-30 20" stroke="#ee6c34" stroke-width="5" fill="none"/>',
    5: axesS + '<path d="M70 100L110 50H190L230 100Z" fill="#ffd54a" stroke="#17130c" stroke-width="3"/><path d="M70 100L110 50H190L230 100" stroke="#ee6c34" stroke-width="6" fill="none" stroke-linejoin="round"/>',
    6: road + carS(110, 124, '#ee6c34') + carS(190, 114, '#7ca3f9') + '<path d="M240 36h20l-4 26h-12z" fill="#ffd54a" stroke="#17130c" stroke-width="3"/><path d="M244 62v10h12v-10M238 76h24" stroke="#17130c" stroke-width="3" fill="none"/>'
  };
  return '<div class="landmark landmark-' + n + '" aria-hidden="true"><svg viewBox="0 0 300 160" fill="none"><ellipse cx="150" cy="130" rx="130" ry="20" fill="#d4dfcb"/>' + scenes[n].replace(/<path([^>]*?) fill="([^"]+)"/g, '<path$1 style="fill:$2"') + '</svg></div>';
}
let mapMilestones = null;
function renderMap() {
  const xp = totalXP(), r = rankOf(xp);
  $('map-kicker').textContent = 'Motion Quest · ' + studentCode();
  $('map-title').innerHTML = T('Pick a <span class="script">stage</span>', 'Pilih satu <span class="script">peringkat</span>');
  $('player').innerHTML =
    '<div class="kpi"><b>' + xp + ' XP</b><span>' + T('total', 'jumlah') + '</span></div>' +
    '<div class="kpi"><b>' + tt(RANKS[r]) + '</b><span>' + (r < RANKS.length - 1 ? T((RANK_XP - xp % RANK_XP) + ' XP to next rank', (RANK_XP - xp % RANK_XP) + ' XP ke pangkat seterusnya') : T('top rank', 'pangkat tertinggi')) + '</span></div>' +
    '<div class="kpi"><b>' + st.badges.length + ' / ' + BADGES.length + '</b><span>' + T('badges', 'lencana') + '</span></div>';
  $('test-banner').innerHTML = MQT.banner() || submitBanner();
  $('worlds-title').textContent = T('The road ahead', 'Jalan di hadapan');
  $('map-guide').textContent = T('Follow the road in order. Each stage has three levels, and the next stage opens when you finish one.', 'Ikut jalan mengikut susunan. Setiap peringkat ada tiga tahap, dan peringkat seterusnya dibuka apabila anda selesaikan satu peringkat.');
  $('worlds-caption').textContent = T('Watch · Read · Draw · Work it out', 'Tonton · Baca · Lukis · Hitung');

  let next = null;
  for (const s of STAGES) { const i = s.levels.findIndex((_, j) => !st.done[lvKey(s.n, j)]); if (i >= 0 && unlocked(s.n, i)) { next = { s, i }; break; } }
  $('next-mission').innerHTML = '<div><div class="kicker">' + T('YOUR NEXT MISSION', 'MISI SETERUSNYA') + '</div><h2>' +
    (next ? tt(next.s.name) : T('All stages cleared!', 'Semua peringkat selesai!')) + '</h2><p>' +
    (next ? T('Level ', 'Tahap ') + (next.i + 1) + ' · ' + tt(next.s.levels[next.i].title) : T('Replay any level to improve your score.', 'Main semula mana-mana tahap untuk menambah markah.')) + '</p></div>' +
    (next ? '<button class="btn" id="btn-next-mission">' + (st.attempts.length ? T('Continue →', 'Teruskan →') : T('Start driving →', 'Mula memandu →')) + '</button>' : '') +
    '<div class="quest-progress"><span>' + T('Levels cleared', 'Tahap selesai') + ' <b>' + clearedCount() + '/' + TOTAL_LEVELS + '</b></span><progress max="' + TOTAL_LEVELS + '" value="' + clearedCount() + '"></progress></div>';
  if (next) $('btn-next-mission').addEventListener('click', () => { if (!MQT.gate(() => startLevel(next.s.n, next.i))) startLevel(next.s.n, next.i); });

  const milestones = STAGES.filter(s => stageDone(s.n)).map(s => 's' + s.n);
  const gained = mapMilestones && milestones.filter(m => !mapMilestones.includes(m));
  $('map-reward').innerHTML = gained && gained.length ? '<div class="map-celebration"><span aria-hidden="true">✦</span> ' + T('Stage cleared! The next part of the road is open.', 'Peringkat selesai! Bahagian jalan seterusnya sudah dibuka.') + '</div>' : '';
  mapMilestones = milestones;

  const cards = STAGES.map(s => {
    const head = landmark(s.n) + '<div class="n" style="background:var(' + s.c + ')">' + s.n + '</div><h3>' + tt(s.name) + '</h3><div class="topic">' + tt(s.topic) + '</div>';
    if (!stageOpen(s.n)) return '<div class="world locked" style="--world-color:var(' + s.c + ')">' + head + '<span class="corner pill lock">🔒 ' + T('Clear stage ' + (s.n - 1), 'Selesaikan peringkat ' + (s.n - 1)) + '</span></div>';
    const k = i => lvKey(s.n, i), doneN = s.levels.filter((_, i) => st.done[k(i)]).length, nx = s.levels.findIndex((_, i) => !st.done[k(i)]);
    const steps = s.levels.map((L, i) => '<button class="step ' + (st.done[k(i)] ? 'done' : i === nx ? 'now' : '') + '" data-stage="' + s.n + '" data-level="' + i + '"' + (unlocked(s.n, i) ? '' : ' disabled') + ' aria-label="' + T('Level ', 'Tahap ') + (i + 1) + ': ' + tt(L.title) + '"><b>' + (st.done[k(i)] ? '✓' : i + 1) + '</b>' + (st.best[k(i)] || '·') + '</button>').join('');
    const pill = doneN === s.levels.length ? '<span class="corner pill done">' + T('Cleared', 'Selesai') + '</span>' : '<span class="corner pill part">' + doneN + ' / ' + s.levels.length + '</span>';
    const disc = s.discover && doneN === s.levels.length ? '<button class="btn sm' + (st.discovered[s.n] ? ' ghost' : ' pulse') + '" data-discover="' + s.n + '" style="margin-top:12px;">' + (st.discovered[s.n] ? T('Discover ✓', 'Temui ✓') : T('Discover the rule', 'Temui peraturannya')) + '</button>' : '';
    return '<div class="world open' + (next && next.s.n === s.n ? ' recommended' : '') + (doneN === s.levels.length ? ' cleared' : '') + '" style="--world-color:var(' + s.c + ')">' + head + (doneN === s.levels.length ? '<span class="world-flag" aria-hidden="true">⚑</span>' : '') + pill + '<div class="steps">' + steps + '</div>' + disc + '</div>';
  });
  $('worlds').innerHTML = '<div class="core-trail">' + cards.map((c, i) => '<div class="trail-stop"><span class="trail-marker" aria-hidden="true">' + (i + 1) + '</span>' + c + '</div>').join('') + '</div>' + MQT.card();
  $('btn-progress').textContent = T('My progress', 'Kemajuan saya');
  $('btn-switch').textContent = T('Not ' + studentCode() + '? Change', 'Bukan ' + studentCode() + '? Tukar');
}
$('test-banner').addEventListener('click', e => {
  const b = e.target.closest('[data-test]'); if (b) MQT.start(b.dataset.test);
  if (e.target.closest('[data-submit]')) submitNow();
});
$('worlds').addEventListener('click', e => {
  const b = e.target.closest('[data-level]');
  if (b && !b.disabled) { const s = +b.dataset.stage, i = +b.dataset.level; if (!MQT.gate(() => startLevel(s, i))) startLevel(s, i); return; }
  const tb = e.target.closest('[data-test]'); if (tb) return MQT.start(tb.dataset.test);
  const d = e.target.closest('[data-discover]'); if (d) openDiscover(+d.dataset.discover);
});
$('btn-progress').addEventListener('click', () => { renderProgress(); show('progress'); });
$('btn-switch').addEventListener('click', () => { renderEntry(); show('entry'); });

/* ---------- reminders to submit ---------- */
const unsentTests = () => (st.tests || []).slice(st.testsSent || 0);
const unsentCount = () => st.attempts.length - st.sent + unsentTests().length;
function submitWhy() {
  if (!st.sent) return T('Send your results to your teacher. It does not end your game. Keep playing and submit again any time.', 'Hantar keputusan anda kepada guru. Ini tidak menamatkan permainan. Teruskan bermain dan hantar lagi bila-bila masa.');
  return T('You have new results. Send them so your teacher sees your latest work.', 'Anda ada keputusan baharu. Hantar supaya guru anda melihat kerja terkini anda.');
}
function submitBanner() {
  const n = unsentCount();
  if (!n || clearedCount() < MQT.POST_AFTER_LEVELS) return '';
  return '<div class="test-banner submit"><div><div class="kicker">' + T('DON’T FORGET', 'JANGAN LUPA') + '</div><h2>📤 ' + T('Submit your results', 'Hantar keputusan anda') + '</h2><p>' + submitWhy() + ' <b>' + T(n + (n === 1 ? ' result' : ' results') + ' waiting.', n + ' keputusan menunggu.') + '</b></p></div><button class="btn pulse" data-submit>' + T('Submit now →', 'Hantar sekarang →') + '</button></div>';
}
function submitNow() { renderProgress(); show('progress'); sendResults(); }

/* ============================================================
   9. THE LEVEL PLAYER
   ============================================================ */
let run = null, clockTimer = null;
const secs = () => Math.round((Date.now() - run.t0) / 1000);
const numOf = s => parseFloat(String(s).replace(',', '.').replace('−', '-'));
const same = (a, b) => Math.abs(a - b) < 0.011;

function startLevel(s, i) {
  const S = stageOf(s), L = S.levels[i];
  run = { s, i, S, L, tasks: L.make(), k: 0, t0: Date.now(), hints: 0, learn: 0, wrong: 0, phase: 'task', race: !!L.race, solved: 0 };
  resetTask();
  clearInterval(clockTimer);
  clockTimer = setInterval(() => { const c = $('lvl-clock'); if (c && run && run.phase !== 'xp') c.textContent = secs() + ' s'; }, 1000);
  show('level');
  renderTask();
  if (run.race) startRace();
}
function resetTask() { run.mine = null; run.tries = 0; run.hinted = false; run.worked = false; run.solvedTask = false; run.shade = []; run.shadeOk = false; run.drawn = null; run.picked = []; run.msg = null; }
const task = () => run.tasks[run.k];
function logAttempt(a) {
  const d = new Date(), p = x => String(x).padStart(2, '0');
  st.attempts.push(Object.assign({
    attempt_id: Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7),
    timestamp: d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()),
    class_code: st.classCode, student_code: studentCode(), boss_tool_choice: ''
  }, a));
}
const logWrong = tag => logAttempt({ world: run.s, level: run.i + 1, correct: false, optimal: false, score_xp: 0, mistake_tag: tag || 'calc_error', hints_used: run.hints, learn_used: run.learn, time_s: secs() });

/* ---------- drawing one task ---------- */
function renderTask() {
  if (!run) return;
  const el = $('screen-level'), t = task(), n = run.tasks.length, S = run.S;
  const dots = run.tasks.map((_, j) => '<span class="tdot' + (j < run.k || (j === run.k && run.solvedTask) ? ' done' : j === run.k ? ' now' : '') + '"></span>').join('');
  let html = '<div class="lvl-head"><div class="lvl-meta"><button class="btn ghost sm" id="btn-map">← ' + T('Map', 'Peta') + '</button>' +
    '<span>' + T('Stage ', 'Peringkat ') + run.s + ' · ' + T('Level ', 'Tahap ') + (run.i + 1) + '</span><span class="clock" id="lvl-clock">' + secs() + ' s</span></div>' +
    '<div class="task-dots" aria-label="' + T('Question ', 'Soalan ') + (run.k + 1) + ' / ' + n + '">' + dots + '</div></div>' +
    '<div class="mission"><div class="kicker">' + tt(S.name) + '</div><h2>' + tt(run.L.title) + '</h2></div>';
  if (run.race) html += '<div class="race-box">' + MK.track({ rival: true, id: 'race-track', from: T('You', 'Anda'), to: T('Finish', 'Penamat') }) + '<div class="race-legend"><span class="me">● ' + T('You: answer right to move', 'Anda: jawab betul untuk bergerak') + '</span><span class="riv">● ' + T('Rival', 'Pesaing') + '</span></div></div>';

  if (run.phase !== 'task') { el.innerHTML = html + '<div id="panel"></div>'; wireTop(); renderPanel(); return; }

  html += '<div class="note ask task-q"><span class="qn">' + (run.k + 1) + '</span><p>' + txt(t.q) + '</p></div>';
  if (t.table) html += '<div class="table-wrap">' + txt(t.table) + '</div>';
  // a drawing task hides the car until the first check, so Play can't give the answer away
  const anim = t.kind === 'draw' ? (run.mine || run.solvedTask ? t.anim : null) : t.anim || (run.solvedTask && t.animAfter ? t.animAfter : null);
  if (anim) {
    html += '<div class="drive">' + MK.track({ id: 'trk', dMax: anim.dMax || MK.reach(anim.g), du: anim.g.type === 'dt' ? anim.g.yu : MK.areaUnit(anim.g), from: anim.from, to: anim.to, hill: anim.hill, ghost: t.kind === 'draw' && !!run.mine && !run.solvedTask }) +
      '<div class="drive-bar"><button class="btn sm" id="btn-play">▶ ' + T('Play', 'Main') + '</button><div class="readout" id="readout"></div></div></div>';
  }
  // the graph
  const showPlot = t.g && !(t.kind === 'pick' && t.opts[0].g);
  if (t.kind === 'draw') html += '<div class="board draw-board" id="editor"></div><p class="muted draw-help">' + T('Drag each point up or down (or tap the column). Arrow keys work too.', 'Seret setiap titik ke atas atau ke bawah (atau ketik lajurnya). Kekunci anak panah juga boleh digunakan.') + '</p>';
  else if (showPlot) {
    const sch = t.schematic || t.g.schematic;
    html += '<div class="board">' + MK.plot(t.g, { id: 'plt', letters: t.letters, hi: t.hi || (run.solvedTask && t.kind === 'tap' ? t.ans : null), schematic: sch, tap: t.kind === 'tap' && !run.solvedTask ? 'seg' : t.kind === 'shade' && !run.shadeOk ? 'piece' : null, shade: t.kind === 'shade' ? run.shade : t.shadeShow, bad: t.kind === 'tap' ? run.picked : null }) + '</div>';
  }
  // the answer area
  html += '<div class="dock">';
  if (t.kind === 'pick') {
    if (t.opts[0].g) html += '<div class="opt-graphs">' + t.opts.map(o => '<button class="opt-graph' + (run.picked.includes(o.k) ? ' wrong' : run.solvedTask && o.k === t.ans ? ' right' : '') + '" data-pick="' + o.k + '"' + (run.solvedTask || run.picked.includes(o.k) ? ' disabled' : '') + '><span class="og-k">' + o.k.toUpperCase() + '</span>' + MK.plot(o.g, { mini: true, ticks: t.optTicks }) + '</button>').join('') + '</div>';
    else html += '<div class="opts">' + t.opts.map(o => '<button class="opt' + (run.picked.includes(o.k) ? ' wrong' : run.solvedTask && o.k === t.ans ? ' right' : '') + '" data-pick="' + o.k + '"' + (run.solvedTask || run.picked.includes(o.k) ? ' disabled' : '') + '>' + txt(o.html) + '</button>').join('') + '</div>';
  }
  if (t.kind === 'tap' && !run.solvedTask) html += '<p class="muted tap-help">👆 ' + T('Tap a part of the graph (or its letter).', 'Ketik satu bahagian graf (atau hurufnya).') + '</p>';
  if (t.kind === 'shade' && !run.shadeOk) html += '<div class="row answer-row"><span class="muted">👆 ' + T('Tap regions under the graph to shade them.', 'Ketik kawasan di bawah graf untuk melorek.') + '</span><span class="grow"></span><button class="btn" id="btn-shade"' + (run.shade.length ? '' : ' disabled') + '>' + T('Check region', 'Semak kawasan') + '</button></div>';
  if ((t.kind === 'num' || (t.kind === 'shade' && run.shadeOk)) && !run.solvedTask) {
    html += '<div class="row answer-row"><label class="sr-only" for="ans-num">' + T('Your answer', 'Jawapan anda') + '</label><input type="text" class="tnum" id="ans-num" inputmode="decimal" autocomplete="off" maxlength="8"><span class="unit">' + MK.unit(t.unit) + '</span><span class="grow"></span><button class="btn" id="btn-check" disabled>' + T('Check', 'Semak') + '</button></div>';
  }
  if (t.kind === 'draw' && !run.solvedTask) html += '<div class="row answer-row"><span class="grow"></span><button class="btn" id="btn-draw">' + T('Check my graph', 'Semak graf saya') + '</button></div>';
  html += '<div class="say' + (run.msg && run.msg.warn ? ' warn' : '') + '" id="say" role="status" aria-live="polite">' + (run.msg ? run.msg.html : '') + '</div>';
  if (!run.solvedTask) {
    html += '<div class="controls"><button class="btn ghost sm" id="btn-hint">💡 ' + T('Hint', 'Petunjuk') + '</button>' +
      (run.tries >= 2 && !run.worked ? '<button class="btn ghost sm" id="btn-work">📖 ' + T('Worked solution (−10 XP)', 'Jalan kerja (−10 XP)') + '</button>' : '') + '</div>';
    if (run.hinted) html += '<div class="note hint-note"><b>💡</b> ' + txt(t.hint) + '</div>';
    if (run.worked) html += '<div class="note work-note"><b>📖 ' + T('Worked solution', 'Jalan kerja') + '</b><p>' + txt(t.work) + '</p></div>';
  } else if (!run.race) {
    html += '<div class="row" style="margin-top:12px;"><button class="btn" id="btn-next">' + (run.k < n - 1 ? T('Next question →', 'Soalan seterusnya →') : T('Finish level →', 'Tamatkan tahap →')) + '</button></div>';
  }
  html += '</div><div id="panel"></div>';
  el.innerHTML = html;
  wireTop();
  wireTask(anim);
}
function wireTop() {
  $('btn-map').addEventListener('click', () => { run = null; renderMap(); show('map'); });
  if (run && run.race) drawRace();
}
function wireTask(anim) {
  const t = task();
  const plt = $('plt'), trk = $('trk');
  if (anim && trk) {
    const play = () => {
      SFX.play('vroom');
      if (t.kind === 'draw' && run.mine && !run.solvedTask) {   // the student's graph (orange) against the story (blue)
        return MK.animate({ g: run.mine, ghost: t.target, track: trk, plot: null, readout: $('readout'), dMax: Math.max(MK.reach(run.mine), MK.reach(t.target)) || 1 });
      }
      MK.animate({ g: anim.g, track: trk, plot: plt && !(t.kind === 'pick' && t.opts[0].g) ? plt : null, hill: anim.hill, readout: $('readout'), dMax: anim.dMax || MK.reach(anim.g) });
    };
    MK.park(trk, { hill: anim.hill });
    $('btn-play').addEventListener('click', play);
    if ((t.autoplay && run.tries === 0 && !run.solvedTask && !run.played) || (run.solvedTask && t.animAfter && !run.playedAfter)) {
      if (run.solvedTask) run.playedAfter = true; else run.played = true;
      setTimeout(() => { if ($('trk') === trk) play(); }, 350);
    }
  }
  // taps on the graph
  if (plt) {
    const act = el => {
      const id = el.dataset.tap;
      if (id[0] === 's' && t.kind === 'tap') answerTap(+id.slice(1));
      if (id[0] === 'p' && t.kind === 'shade') { const i = +id.slice(1); run.shade = run.shade.includes(i) ? run.shade.filter(x => x !== i) : run.shade.concat(i); SFX.play('tap'); renderTask(); }
    };
    plt.addEventListener('click', e => { const el = e.target.closest('[data-tap]'); if (el) act(el); else if (t.kind === 'tap') { const lt = e.target.closest('.letter'); if (lt) { const i = MK.LETTERS.indexOf(lt.textContent.trim()); if (i >= 0) answerTap(i); } } });
    plt.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset && e.target.dataset.tap) { e.preventDefault(); act(e.target); } });
  }
  document.querySelectorAll('[data-pick]').forEach(b => b.addEventListener('click', () => answerPick(b.dataset.pick)));
  const box = $('ans-num');
  if (box) {
    box.addEventListener('input', () => { box.value = box.value.replace(/[^0-9.,\-−]/g, ''); $('btn-check').disabled = isNaN(numOf(box.value)); });
    box.addEventListener('keydown', e => { if (e.key === 'Enter' && !$('btn-check').disabled) answerNum(); });
    $('btn-check').addEventListener('click', answerNum);
    if (!matchMedia('(pointer: coarse)').matches) box.focus({ preventScroll: true });
  }
  if ($('btn-shade')) $('btn-shade').addEventListener('click', answerShade);
  if (t.kind === 'draw' && $('editor')) {
    run.editor = MK.editor($('editor'), { g: t.axes, cols: t.cols, fixed: t.fixed, start: run.drawnVals });
    if (run.badPts) run.editor.mark(run.badPts);
    if (run.solvedTask) run.editor.lock();
  }
  if ($('btn-draw')) $('btn-draw').addEventListener('click', answerDraw);
  if ($('btn-hint')) $('btn-hint').addEventListener('click', () => { if (!run.hinted) { run.hinted = true; run.hints++; } keepDrawing(); renderTask(); });
  if ($('btn-work')) $('btn-work').addEventListener('click', () => { if (!run.worked) { run.worked = true; run.learn++; } keepDrawing(); renderTask(); });
  if ($('btn-next')) $('btn-next').addEventListener('click', nextTask);
}
/** The editor is rebuilt on every render; keep what the student drew. */
function keepDrawing() { if (run.editor && task().kind === 'draw') run.drawnVals = run.editor.values(); }

/* ---------- checking answers ---------- */
function say(html, warn) { run.msg = { html, warn }; }
function wrongAnswer(tag, extra) {
  run.tries++; run.wrong++;
  logWrong(tag); save();
  SFX.play('wrong');
  say('<b>' + T('Not yet.', 'Belum tepat.') + '</b> ' + (MISTAKES[tag] ? MISTAKES[tag]() : MISTAKES.calc_error()) + (extra || ''), true);
  keepDrawing();
  renderTask();
  const s = $('say'); if (s) s.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function rightAnswer() {
  const t = task();
  run.solvedTask = true; run.solved++;
  if (run.tries === 0 && t.grad) st.counts.grad = (st.counts.grad || 0) + 1;
  if (run.tries === 0 && t.kind === 'draw') st.counts.draw = (st.counts.draw || 0) + 1;
  save();
  SFX.play('right');
  const praise = run.tries === 0 ? pick1([T('Spot on!', 'Tepat sekali!'), T('Correct!', 'Betul!'), T('Well done!', 'Syabas!')]) : T('Correct!', 'Betul!');
  say('<b>✓ ' + praise + '</b> ' + (t.work && !run.worked ? txt(t.work) : ''), false);
  if (run.race) { raceAdvance(); keepDrawing(); renderTask(); setTimeout(() => { if (run && run.phase === 'task' && run.solvedTask) nextTask(); }, 1300); return; }
  keepDrawing();
  renderTask();
  if (t.kind === 'draw') {
    const trk = $('trk');
    if (trk) setTimeout(() => $('btn-play') && $('btn-play').click(), 300);
  }
}
const pick1 = a => a[Math.floor(Math.random() * a.length)];
function answerPick(k) {
  const t = task();
  if (k === t.ans) return rightAnswer();
  run.picked.push(k);
  const o = t.opts.find(x => x.k === k);
  wrongAnswer((o && o.tag) || 'wrong_pick');
}
function answerTap(i) {
  const t = task();
  if (run.solvedTask) return;
  if (t.ans.includes(i)) { run.hiAfter = i; return rightAnswer(); }
  if (!run.picked.includes(i)) run.picked.push(i);
  wrongAnswer((t.tagOf && t.tagOf(i)) || 'calc_error', ' <span class="muted">(' + T('you tapped ', 'anda ketik ') + MK.LETTERS[i] + ')</span>');
}
function answerNum() {
  const t = task(), v = numOf($('ans-num').value);
  if (isNaN(v)) return;
  if (same(v, t.ans)) return rightAnswer();
  const w = (t.wrongs || []).find(x => same(x[0], v) && !same(x[0], t.ans));
  wrongAnswer(w ? w[1] : 'calc_error', ' <span class="muted">(' + T('you wrote ', 'anda tulis ') + MK.fmt(v) + ')</span>');
}
function answerShade() {
  const t = task(), a = run.shade.slice().sort(), b = t.pieces.slice().sort();
  if (a.length === b.length && a.every((x, j) => x === b[j])) {
    run.shadeOk = true; SFX.play('right');
    say('<b>✓ ' + T('Right region.', 'Kawasan yang betul.') + '</b> ' + T('Now find the distance it shows.', 'Sekarang hitung jarak yang diwakilinya.'), false);
    return renderTask();
  }
  wrongAnswer('wrong_region');
}
function answerDraw() {
  const t = task(), vals = run.editor.values();
  run.drawnVals = vals;
  const want = t.cols.map(c => MK.at(t.target.pts, c));
  const bad = t.cols.map((c, j) => (same(vals[j], want[j]) ? -1 : j)).filter(j => j >= 0);
  if (!bad.length) { run.badPts = []; return rightAnswer(); }
  run.badPts = bad;
  // which idea went wrong? look segment by segment
  let tag = 'misplot_point';
  for (const s of MK.segs(t.target.pts)) {
    const js = t.cols.map((c, j) => j).filter(j => t.cols[j] > s.t0 + 1e-9 && t.cols[j] <= s.t1 + 1e-9);
    if (!js.some(j => bad.includes(j))) continue;
    const got = js.map(j => vals[j]), prev = vals[js[0] - 1];
    if (s.dy === 0 && got.some(v => !same(v, prev))) { tag = t.target.type === 'dt' ? 'stop_not_flat' : 'uniform_not_flat'; break; }
    if (s.dy < 0 && t.target.type === 'dt' && got[got.length - 1] > prev) { tag = 'return_drawn_up'; break; }
    break;
  }
  run.mine = Object.assign({}, t.target, { pts: t.cols.map((c, j) => [c, vals[j]]) });
  wrongAnswer(tag, ' ' + T('Press <b>▶ Play</b>: your car is orange, the story’s car is blue.', 'Tekan <b>▶ Main</b>: kereta anda berwarna jingga, kereta dalam cerita berwarna biru.'));
}
function nextTask() {
  MK.stop();
  if (run.k < run.tasks.length - 1) { run.k++; resetTask(); run.played = false; run.playedAfter = false; run.drawnVals = null; run.badPts = null; run.hiAfter = null; renderTask(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  run.solveTime = secs();
  clearInterval(clockTimer);
  if (run.race) { stopRace(); run.phase = 'xp'; award(); return; }
  run.phase = 'check';
  renderTask();
}

/* ---------- the race ---------- */
let raceTimer = null;
function startRace() {
  run.raceT0 = Date.now(); run.me = 0; run.meShown = 0; run.rival = 0; run.rivalWon = false;
  stopRace();
  raceTimer = setInterval(() => {
    if (!run || !run.race) return stopRace();
    run.rival = Math.min(1, (Date.now() - run.raceT0) / 1000 / run.L.target);
    if (run.rival >= 1 && run.me < 1 && !run.rivalWon) { run.rivalWon = true; toast('🔵 ' + T('The rival crossed the line first — keep going!', 'Pesaing melintasi garisan dahulu — teruskan!')); }
    run.meShown += (run.me - run.meShown) * 0.2;
    drawRace();
  }, 60);
}
function stopRace() { clearInterval(raceTimer); raceTimer = null; }
function raceAdvance() { run.me = run.solved / run.tasks.length; if (run.me >= 1 && !run.rivalWon) run.raceWon = true; }
function drawRace() {
  const trk = $('race-track'); if (!trk || !run) return;
  const place = (sel, fr, lane) => {
    const el = trk.querySelector(sel); if (!el) return;
    const x = 46 + 548 * Math.max(0, Math.min(1, fr));
    el.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + lane + ')');
  };
  place('.main-car', run.meShown || 0, 48);
  place('.rival-car', run.rival || 0, 110);
}

/* ---------- quick check and XP ---------- */
function renderPanel() {
  const p = $('panel'); if (!p) return;
  if (run.phase === 'check') {
    const c = run.L.check;
    p.innerHTML = '<div class="note ok"><h3>' + T('All questions solved!', 'Semua soalan selesai!') + '</h3><p>' + T('One last question about the idea behind this level.', 'Satu soalan terakhir tentang idea di sebalik tahap ini.') + '</p></div>' +
      '<div class="note"><h3>' + T('Quick check', 'Semakan pantas') + ' <span class="pill new">+20 XP</span></h3><p>' + tt(c.q) + '</p>' +
      '<div class="opts">' + c.opts.map(o => '<button class="opt" data-qc="' + o[0] + '">' + tt(o[1]) + '</button>').join('') + '</div><div id="qc-out"></div></div>';
    p.querySelectorAll('[data-qc]').forEach(b => b.addEventListener('click', () => {
      const ok = b.dataset.qc === c.ans;
      SFX.play(ok ? 'right' : 'wrong');
      run.reasoning = ok;
      p.querySelectorAll('[data-qc]').forEach(x => { x.disabled = true; if (x.dataset.qc === c.ans) x.classList.add('right'); else if (x === b) x.classList.add('wrong'); });
      $('qc-out').innerHTML = '<p style="margin:12px 0;">' + (ok ? T('Right. ', 'Betul. ') : T('Not quite. ', 'Belum tepat. ')) + tt(c.why) + '</p><button class="btn sm" id="btn-score">' + T('See my XP', 'Lihat XP saya') + '</button>';
      $('btn-score').addEventListener('click', award);
    }));
    return;
  }
  if (run.phase === 'xp' && run.xp) { p.innerHTML = xpCardHtml(run.s, run.i, run.xp); wireXp(p, run.s, run.i); }
}
function award() {
  const L = run.L, solve = Math.max(30, 60 - 10 * run.wrong), nohint = run.hints || run.learn ? 0 : 10;
  const parts = [['solve', T('Solved', 'Selesai') + (run.wrong ? T(' · ' + run.wrong + ' mistake' + (run.wrong > 1 ? 's' : ''), ' · ' + run.wrong + ' kesilapan') : T(' · no mistakes', ' · tanpa kesilapan')), solve]];
  if (run.race) parts.push(['race', T('Beat the rival', 'Kalahkan pesaing'), run.raceWon ? 30 : 0]);
  else parts.push(['reasoning', T('Quick check', 'Semakan pantas'), run.reasoning ? 20 : 0]);
  parts.push(['nohint', T('No hint or worked solution', 'Tanpa petunjuk atau jalan kerja'), nohint]);
  if (!run.race) parts.push(['speed', T('Speed · under ', 'Kelajuan · bawah ') + L.target + ' s (' + run.solveTime + ' s)', run.solveTime <= L.target ? 10 : 0]);
  if (run.learn) parts.push(['learn', T('Used worked solution', 'Guna jalan kerja'), -10]);
  const key = lvKey(run.s, run.i), score = parts.reduce((a, x) => a + x[2], 0), prev = st.best[key] || 0;
  st.best[key] = Math.max(prev, score);
  st.done[key] = true;
  if (!run.wrong) st.perfect[key] = true;
  if (!run.learn) st.noLearn[key] = true;
  if (run.race && run.raceWon) st.won[key] = true;
  logAttempt({ world: run.s, level: run.i + 1, correct: true, optimal: run.wrong === 0, score_xp: score, mistake_tag: '', hints_used: run.hints, learn_used: run.learn, time_s: run.solveTime });
  run.xp = { parts, score, prev };
  const b = ['first_lap'];
  if (STAGES[0].levels.every((_, i) => st.perfect[lvKey(1, i)])) b.push('eagle_eye');
  if ((st.counts.grad || 0) >= 5) b.push('gradient_guru');
  if ((st.counts.draw || 0) >= 3) b.push('graph_artist');
  if (stageOf(5).levels.every((_, i) => st.done[lvKey(5, i)] && st.noLearn[lvKey(5, i)])) b.push('area_ace');
  if (stageOf(6).levels.every((_, i) => st.won[lvKey(6, i)])) b.push('track_champion');
  giveBadges(b);
  run.phase = 'xp';
  renderTask();
}
function giveBadges(keys) {
  const fresh = keys.filter(k => !st.badges.includes(k));
  fresh.forEach(k => st.badges.push(k));
  save();
  fresh.forEach((k, j) => setTimeout(() => { SFX.play('badge'); const B = BADGES.find(x => x.k === k); toast(B.icon + ' ' + T('Badge: ', 'Lencana: ') + tt(B.name)); }, 1000 + j * 900));
}
const celebrated = new WeakSet();
function celebrate(x) {
  if (celebrated.has(x)) return;
  celebrated.add(x);
  const r = rankOf(totalXP());
  if (r > (st.rankSeen || 0)) { st.rankSeen = r; save(); SFX.play('rank'); toast('⭐ ' + T('New rank: ', 'Pangkat baharu: ') + tt(RANKS[r])); }
  else SFX.play('win');
}
function submitNote(s, i) {
  if (!unsentCount()) return '';
  const c = clearedCount(), last = i === stageOf(s).levels.length - 1;
  if (!(c === MQT.POST_AFTER_LEVELS || last)) return '';
  return '<div class="submit-note"><p>📤 ' + submitWhy() + '</p><button class="btn sm" data-go="submit">' + T('Submit now', 'Hantar sekarang') + '</button></div>';
}
function xpCardHtml(s, i, x) {
  celebrate(x);
  const S = stageOf(s), last = i === S.levels.length - 1;
  const rows = x.parts.map(p => '<div class="xp-row' + (p[2] === 0 ? ' zero' : '') + '"><span>' + p[1] + '</span><b>' + (p[2] > 0 ? '+' : '') + p[2] + '</b></div>').join('');
  let next;
  if (last && S.discover && !st.discovered[s]) next = '<button class="btn" data-go="discover">' + T('Discover the rule →', 'Temui peraturannya →') + '</button>';
  else if (last) next = '<button class="btn" data-go="map">' + (s < 6 ? T('Next stage →', 'Peringkat seterusnya →') : T('Back to map', 'Kembali ke peta')) + '</button>';
  else next = '<button class="btn" data-go="next">' + T('Next level →', 'Tahap seterusnya →') + '</button>';
  const raceLine = run && run.race ? '<p class="race-result">' + (run.raceWon ? '🏁 ' + T('You beat the blue car!', 'Anda mengalahkan kereta biru!') : '🔵 ' + T('The blue car won this time. Answer faster to beat it.', 'Kereta biru menang kali ini. Jawab lebih pantas untuk mengalahkannya.')) + '</p>' : '';
  return '<div class="note xp-reward" style="background:#fff;"><h3>' + T('Level ', 'Tahap ') + (i + 1) + T(' cleared', ' selesai') + '</h3>' + raceLine + rows +
    '<div class="xp-total"><span class="muted">' + (x.score > x.prev ? T('New best for this level', 'Markah terbaik baharu untuk tahap ini') : T('Your best stays ', 'Markah terbaik kekal ') + x.prev) + '</span><b>' + x.score + ' XP</b></div>' +
    submitNote(s, i) +
    '<div class="row" style="margin-top:14px;">' + next + '<button class="btn ghost sm" data-go="replay">' + T('Replay with new numbers', 'Main semula dengan nombor baharu') + '</button></div></div>';
}
function wireXp(el, s, i) {
  el.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => {
    const go = b.dataset.go;
    if (go === 'next') startLevel(s, i + 1);
    else if (go === 'replay') startLevel(s, i);
    else if (go === 'discover') openDiscover(s);
    else if (go === 'submit') submitNow();
    else { renderMap(); show('map'); }
  }));
}

/* ============================================================
   10. DISCOVER
   ============================================================ */
let discoverStage = 1, discoverPick = null;
function openDiscover(n) { discoverStage = n; discoverPick = null; renderDiscover(); show('discover'); }
function renderDiscover() {
  const S = stageOf(discoverStage), D = S.discover;
  if (!D) return;
  const answered = discoverPick !== null || st.discovered[S.n];
  const pickNow = discoverPick || (st.discovered[S.n] ? D.ans : null);
  let html = '<div class="badge">' + T('Stage ', 'Peringkat ') + S.n + ' · ' + T('Discover', 'Temui') + '</div>' +
    '<h1>' + T('What did you <span class="script">notice?</span>', 'Apa yang anda <span class="script">perasan?</span>') + '</h1>' +
    '<p>' + T('Think back over the three levels. Which statement is always true?', 'Fikirkan semula tiga tahap tadi. Pernyataan manakah yang sentiasa benar?') + '</p>' +
    '<div class="opts">' + D.opts.map(o => '<button class="opt' + (answered ? (o[0] === D.ans ? ' right' : o[0] === pickNow ? ' wrong' : '') : '') + '" data-dpick="' + o[0] + '"' + (answered ? ' disabled' : '') + '>' + tt(o[1]) + '</button>').join('') + '</div>';
  if (answered) {
    const term = x => '<div class="tcard"><b>' + T(x[0], x[1]) + '</b><i>' + T(x[1], x[0]) + '</i><span>' + T(x[2], x[3]) + '</span></div>';
    html += '<p style="margin-top:16px;"><b class="ink">' + (pickNow === D.ans ? T('Exactly. You found it before anyone told you.', 'Tepat sekali. Anda menemuinya sebelum sesiapa memberitahu.') : T('Look at the highlighted answer and think about the levels again.', 'Lihat jawapan yang ditandakan dan fikirkan semula tahap-tahap tadi.')) + '</b></p>' +
      '<div class="sec-title" style="margin-top:22px;">' + T('Now it has a name', 'Kini ia ada nama') + '</div><div class="terms">' + D.terms.map(term).join('') + '</div>' +
      '<div class="row" style="margin-top:24px;"><button class="btn" id="btn-disc-map">' + T('Back to map', 'Kembali ke peta') + '</button><span class="muted">' + (st.discovered[S.n] ? T('+20 XP for discovering', '+20 XP kerana menemui') : '') + '</span></div>';
  }
  $('screen-discover').innerHTML = html;
  $('screen-discover').querySelectorAll('[data-dpick]').forEach(b => b.addEventListener('click', () => {
    discoverPick = b.dataset.dpick;
    const ok = discoverPick === D.ans;
    if (ok && !st.discovered[S.n]) { st.discovered[S.n] = true; save(); }
    SFX.play(ok ? 'discover' : 'wrong');
    renderDiscover();
    if (!ok) setTimeout(() => { discoverPick = null; if (current === 'discover') renderDiscover(); }, 4200);
  }));
  const back = $('btn-disc-map');
  if (back) back.addEventListener('click', () => { discoverPick = null; renderMap(); show('map'); });
}

/* ============================================================
   11. MY PROGRESS + sending results
   ============================================================ */
function renderProgress() {
  const xp = totalXP(), r = rankOf(xp), unsent = unsentCount();
  const trail = (s, i) => { const a = st.attempts.filter(x => x.world === s && x.level === i + 1).slice(-8); return a.length ? a.map(x => (x.correct ? '✓' : '✗')).join(' → ') : '—'; };
  const stageCard = S => {
    const m = Math.round(mastery(S.n)), cleared = S.levels.filter((_, i) => st.done[lvKey(S.n, i)]).length;
    const started = st.attempts.some(a => a.world === S.n);
    return '<details class="progress-world"' + (started ? ' open' : '') + '><summary><span><b>' + T('Stage ', 'Peringkat ') + S.n + ' · ' + tt(S.name) + '</b><small>' + cleared + ' / ' + S.levels.length + T(' levels cleared', ' tahap selesai') + '</small></span>' +
      '<span class="pill ' + (!started ? 'new' : m >= 70 ? 'done' : 'part') + '">' + (!stageOpen(S.n) ? T('Locked', 'Terkunci') : !started ? T('Not started', 'Belum mula') : m + '%') + '</span></summary>' +
      '<div class="progress-detail"><progress max="100" value="' + m + '"></progress>' +
      S.levels.map((L, i) => '<div class="progress-level"><span><b>' + (i + 1) + '</b> · ' + tt(L.title) + '<small>' + trail(S.n, i) + '</small></span><b>' + (st.best[lvKey(S.n, i)] || 0) + ' XP</b>' +
        '<button class="btn ghost sm" data-rs="' + S.n + '" data-rl="' + i + '"' + (unlocked(S.n, i) ? '' : ' disabled') + '>' + T(st.done[lvKey(S.n, i)] ? 'Replay' : 'Play', st.done[lvKey(S.n, i)] ? 'Main semula' : 'Mula') + '</button></div>').join('') + '</div></details>';
  };
  $('screen-progress').innerHTML =
    '<div class="kicker">' + studentCode() + ' · ' + st.classCode + '</div>' +
    '<h1>' + T('My <span class="script">progress</span>', 'Kemajuan <span class="script">saya</span>') + '</h1>' +
    '<p>' + T('Every attempt helps you learn. Replaying keeps your best score.', 'Setiap cubaan membantu anda belajar. Markah terbaik dikekalkan apabila bermain semula.') + '</p>' +
    '<div class="player"><div class="kpi"><b>' + xp + ' XP</b><span>' + tt(RANKS[r]) + '</span></div>' +
    '<div class="kpi"><b>' + clearedCount() + ' / ' + TOTAL_LEVELS + '</b><span>' + T('levels cleared', 'tahap selesai') + '</span></div>' +
    '<div class="kpi"><b>' + st.badges.length + ' / ' + BADGES.length + '</b><span>' + T('badges earned', 'lencana diperoleh') + '</span></div></div>' +
    '<div class="rank-track"><div class="row spread"><b>' + tt(RANKS[r]) + '</b><span>' + (r < RANKS.length - 1 ? T((RANK_XP - xp % RANK_XP) + ' XP to ', (RANK_XP - xp % RANK_XP) + ' XP lagi ke ') + tt(RANKS[r + 1]) : T('Highest rank reached!', 'Pangkat tertinggi dicapai!')) + '</span></div><progress max="' + RANK_XP + '" value="' + (r < RANKS.length - 1 ? xp % RANK_XP : RANK_XP) + '"></progress></div>' +
    '<section class="sync-card"><div><h2>' + T('Your results', 'Keputusan anda') + '</h2><p>' + (unsent ? T(unsent + (unsent === 1 ? ' result ready to send to your teacher.' : ' results ready to send to your teacher.'), unsent + ' keputusan sedia dihantar kepada guru.') : st.attempts.length || st.tests.length ? T('All saved results have been sent.', 'Semua keputusan tersimpan telah dihantar.') : T('Play your first level to start your journey.', 'Main tahap pertama untuk memulakan perjalanan anda.')) + '</p><small>' + T('Progress is saved on this device.', 'Kemajuan disimpan pada peranti ini.') + '</small></div><button class="btn" id="btn-submit"' + (unsent ? '' : ' disabled') + '>' + T('Submit results', 'Hantar keputusan') + '</button><div id="submit-msg" role="status" aria-live="polite"></div></section>' +
    '<div class="sec-title">' + T('Your journey', 'Perjalanan anda') + '</div>' + STAGES.map(stageCard).join('') +
    '<div class="sec-title">' + T('Your badges', 'Lencana anda') + '</div>' +
    '<div class="badges">' + BADGES.map(b => '<div class="bdg' + (st.badges.includes(b.k) ? '' : ' off') + '"><b>' + (st.badges.includes(b.k) ? b.icon + ' ' : '') + tt(b.name) + '</b><span>' + tt(b.how) + '</span><small>' + T(st.badges.includes(b.k) ? 'Earned' : 'To unlock', st.badges.includes(b.k) ? 'Diperoleh' : 'Untuk dibuka') + '</small></div>').join('') + '</div>' +
    '<details class="class-board" id="class-board"><summary>' + T('Class board · this week', 'Papan kelas · minggu ini') + '</summary><div id="board"><p class="muted">' + T('Loading…', 'Memuatkan…') + '</p></div></details>' +
    '<div class="row"><button class="btn" id="btn-prog-map">' + T('Back on the road →', 'Kembali ke jalan →') + '</button><span class="muted">' + st.attempts.length + T(' attempts', ' cubaan') + '</span></div>';
  $('btn-submit').addEventListener('click', sendResults);
  $('btn-prog-map').addEventListener('click', () => { renderMap(); show('map'); });
  $('class-board').addEventListener('toggle', () => { if ($('class-board').open) loadBoard(); });
  $('screen-progress').querySelectorAll('[data-rs]').forEach(b => b.addEventListener('click', () => {
    const s = +b.dataset.rs, i = +b.dataset.rl;
    if (!MQT.gate(() => startLevel(s, i))) startLevel(s, i);
  }));
}
const notConnected = () => ENDPOINT.indexOf('PASTE_') === 0;
async function loadBoard() {
  const el = $('board'); if (!el) return;
  if (notConnected()) { el.innerHTML = '<p class="muted">' + T('The class board appears once your teacher connects results.', 'Papan kelas dipaparkan setelah guru anda menyambungkan keputusan.') + '</p>'; return; }
  try {
    const res = await fetch(ENDPOINT + '?action=board&class=' + encodeURIComponent(st.classCode), { redirect: 'follow' });
    const d = await res.json();
    if (!d.ok || !d.teams) throw new Error('old');
    const me = studentCode(), mine = d.students.find(x => x.code === me), myTeam = mine ? mine.team : null;
    const rows = (list, key) => list.slice(0, 8).map((x, k) => '<div class="lrow' + ((key === 'team' ? x.team === myTeam : x.code === me) ? ' me' : '') + '"><span><b>' + (k + 1) + '</b> · ' + (key === 'team' ? x.team : x.code) + '</span><b>' + x.xp + '</b></div>').join('');
    el.innerHTML = '<div class="grid2b"><div class="card"><h3>' + T('Teams', 'Pasukan') + '</h3>' + (rows(d.teams, 'team') || '—') + '</div><div class="card"><h3>' + T('Players', 'Pemain') + '</h3>' + (rows(d.students, 'code') || '—') + '</div></div>';
  } catch (e) {
    if ($('board')) $('board').innerHTML = '<p class="muted">' + T('The class board is not available right now.', 'Papan kelas tidak tersedia sekarang.') + '</p>';
  }
}
async function post(rows, tests) {
  const res = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ rows, tests }), redirect: 'follow' });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'rejected');
  return data;
}
async function sendResults() {
  const rows = st.attempts.slice(st.sent), tests = unsentTests(), msg = $('submit-msg');
  if (!rows.length && !tests.length) return;
  if (notConnected()) { msg.textContent = T('Results aren’t connected yet. Your teacher needs to add the results link. Your progress is safe on this device.', 'Keputusan belum disambungkan. Guru anda perlu menambah pautan keputusan. Kemajuan anda selamat pada peranti ini.'); return; }
  $('btn-submit').disabled = true;
  msg.textContent = T('Sending…', 'Menghantar…');
  try {
    const data = await post(rows, tests);
    st.sent = st.attempts.length;
    if (data.testsReceived != null) st.testsSent = st.tests.length;
    save();
    renderProgress();
    $('submit-msg').textContent = MQT.postOpen()
      ? T('Sent! When you have finished playing, take the post-test on the map.', 'Berjaya dihantar! Apabila sudah selesai bermain, jawab ujian pasca di peta.')
      : T('Sent! Keep playing. You can submit again any time.', 'Berjaya dihantar! Teruskan bermain. Anda boleh hantar lagi bila-bila masa.');
  } catch (err) {
    $('btn-submit').disabled = false;
    msg.textContent = T('That didn’t go through. Check your connection and try again. Nothing is lost.', 'Tidak berjaya. Semak sambungan anda dan cuba lagi. Tiada apa yang hilang.');
  }
}
async function sendTests() {
  const tests = unsentTests();
  if (!tests.length || notConnected()) return;
  try { const data = await post([], tests); if (data.testsReceived != null) { st.testsSent = st.tests.length; save(); } } catch (e) { }
}

/* ---------- go ---------- */
if (st.classCode) current = 'map';
applyLang();
show(current);
if (st.classCode) MQT.fromUrl();

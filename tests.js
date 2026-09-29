/**
 * MOTION QUEST — pre-test, post-test and survey
 * ------------------------------------------------------------------
 * Built the same way as Graph Quest's tests. Two matched forms, A and B:
 * item n on each form tests the same idea with different numbers. Odd
 * register numbers take A before and B after; even numbers take B then A.
 *
 * A test is measurement, not play: no hints, no feedback, no XP, one
 * attempt. The pre-test is offered before the first level (and can be
 * skipped); the post-test opens once a student has cleared
 * POST_AFTER_LEVELS levels and submitted results. ?test=pre or ?test=post
 * opens one directly, for a control class that doesn't play.
 *
 * Uses the shell's helpers (T, tt, st, save, show, $, renderMap,
 * sendTests, studentCode) and MK only when called.
 */
(function (root) {
  'use strict';

  const POST_AFTER_LEVELS = 9;

  /* ---------- the graphs ---------- */
  const dt = (tu, yu, tStep, yStep, tMax, yMax, pts) => ({ type: 'dt', tu, yu, tStep, yStep, tMax, yMax, pts });
  const vt = (tStep, yStep, tMax, yMax, pts, schematic) => ({ type: 'vt', tu: 's', yu: 'ms', tStep, yStep, tMax, yMax, pts, schematic });

  const A1 = dt('min', 'km', 5, 2, 40, 12, [[0, 0], [10, 4], [25, 4], [40, 10]]);
  const B1 = dt('min', 'km', 5, 1, 35, 9, [[0, 0], [5, 3], [25, 3], [35, 8]]);
  const A2 = dt('s', 'm', 2, 10, 10, 70, [[0, 0], [4, 20], [6, 20], [10, 60]]);
  const B2 = dt('s', 'm', 2, 10, 10, 50, [[0, 0], [2, 10], [4, 10], [10, 40]]);
  const A3 = dt('s', 'm', 1, 1, 9, 7, [[0, 0], [3, 6], [5, 6], [9, 0]]);
  const B3 = dt('s', 'm', 1, 1, 8, 5, [[0, 0], [2, 4], [6, 4], [8, 0]]);
  const A4 = dt('h', 'km', 0.5, 30, 3, 180, [[0, 0], [1, 60], [1.5, 60], [3, 150]]);
  const B4 = dt('h', 'km', 0.5, 20, 4, 140, [[0, 0], [1, 40], [2, 40], [4, 120]]);
  const mini = pts => dt('min', 'km', 1, 1, 4, 5, pts);
  const A6 = vt(2, 2, 14, 14, [[0, 0], [4, 12], [10, 12], [14, 0]]);
  const B6 = vt(2, 2, 16, 12, [[0, 0], [5, 10], [12, 10], [16, 0]], { t: { 5: '5', 12: '12', 16: '16' }, y: { 10: '10' } });
  const A10 = vt(1, 1, 16, 20, [[0, 0], [4, 16], [14, 16]], { t: { 4: '4', 14: 'T' }, y: { 16: '16' } });
  const B10 = vt(1, 1, 20, 24, [[0, 0], [6, 20], [18, 20]], { t: { 6: '6', 18: 'T' }, y: { 20: '20' } });

  /* ---------- the two forms ---------- */
  const num = (q, ans, extra) => Object.assign({ kind: 'num', q, ans }, extra || {});
  const mc = (q, opts, ans, extra) => Object.assign({ kind: 'mc', q, opts, ans }, extra || {});
  const ret = [['a', ['It is stationary', 'Ia pegun']], ['b', ['It moves away at a uniform speed', 'Ia bergerak menjauh dengan laju seragam']],
    ['c', ['It moves back towards the start', 'Ia bergerak balik ke arah titik mula']], ['d', ['It goes downhill', 'Ia menuruni bukit']]];
  const flat = [['a', ['It is stationary', 'Ia pegun']], ['b', ['It moves at a uniform speed', 'Ia bergerak dengan laju seragam']],
    ['c', ['It accelerates uniformly', 'Ia memecut secara seragam']], ['d', ['It moves back to the start', 'Ia bergerak balik ke titik mula']]];

  const FORMS = {
    A: [
      num(['The graph shows a car’s journey. For how many minutes was the car stationary?', 'Graf menunjukkan perjalanan sebuah kereta. Berapa minitkah kereta itu pegun?'], 15, { g: A1, unit: 'min' }),
      num(['Find the speed of the object from t = 6 s to t = 10 s.', 'Hitung laju objek itu dari t = 6 s hingga t = 10 s.'], 10, { g: A2, unit: 'm s⁻¹' }),
      mc(['What is the object doing from t = 5 s to t = 9 s?', 'Apakah yang dilakukan oleh objek itu dari t = 5 s hingga t = 9 s?'], ret, 'c', { g: A3 }),
      num(['Find the average speed for the whole journey.', 'Hitung laju purata bagi seluruh perjalanan.'], 50, { g: A4, unit: ['km h⁻¹', 'km j⁻¹'] }),
      mc(['A cyclist rides up a hill and down the other side at a uniform speed. Which is the distance–time graph?', 'Seorang penunggang basikal mendaki bukit dan menuruninya di sebelah sana dengan laju seragam. Graf jarak-masa manakah yang betul?'],
        [['a', mini([[0, 0], [2, 4], [4, 0]])], ['b', mini([[0, 0], [4, 4]])], ['c', mini([[0, 0], [2, 4], [4, 4]])]], 'b', { graphs: true }),
      mc(['This is a speed–time graph. What is the car doing from t = 4 s to t = 10 s?', 'Ini ialah graf laju-masa. Apakah yang dilakukan oleh kereta dari t = 4 s hingga t = 10 s?'], flat, 'b', { g: A6 }),
      num(['Find the rate of change of speed in the first 4 seconds.', 'Hitung kadar perubahan laju dalam 4 saat pertama.'], 3, { g: A6, unit: 'm s⁻²' }),
      num(['Find the rate of change of speed in the last 4 seconds.', 'Hitung kadar perubahan laju dalam 4 saat terakhir.'], -3, { g: A6, unit: 'm s⁻²' }),
      num(['Find the total distance travelled in 14 seconds.', 'Hitung jumlah jarak yang dilalui dalam 14 saat.'], 120, { g: A6, unit: 'm' }),
      num(['The total distance travelled in T seconds is 192 m. Find the value of T.', 'Jumlah jarak yang dilalui dalam T saat ialah 192 m. Hitung nilai T.'], 14, { g: A10, unit: 's' })
    ],
    B: [
      num(['The graph shows a car’s journey. For how many minutes was the car stationary?', 'Graf menunjukkan perjalanan sebuah kereta. Berapa minitkah kereta itu pegun?'], 20, { g: B1, unit: 'min' }),
      num(['Find the speed of the object from t = 4 s to t = 10 s.', 'Hitung laju objek itu dari t = 4 s hingga t = 10 s.'], 5, { g: B2, unit: 'm s⁻¹' }),
      mc(['What is the object doing from t = 6 s to t = 8 s?', 'Apakah yang dilakukan oleh objek itu dari t = 6 s hingga t = 8 s?'], ret, 'c', { g: B3 }),
      num(['Find the average speed for the whole journey.', 'Hitung laju purata bagi seluruh perjalanan.'], 30, { g: B4, unit: ['km h⁻¹', 'km j⁻¹'] }),
      mc(['A car drives down into a valley and up the other side at a uniform speed. Which is the distance–time graph?', 'Sebuah kereta menuruni lembah dan mendaki di sebelah sana dengan laju seragam. Graf jarak-masa manakah yang betul?'],
        [['a', mini([[0, 0], [2, 0], [4, 4]])], ['b', mini([[0, 4], [2, 0], [4, 4]])], ['c', mini([[0, 0], [4, 4]])]], 'c', { graphs: true }),
      mc(['This is a speed–time graph. What is the car doing from t = 5 s to t = 12 s?', 'Ini ialah graf laju-masa. Apakah yang dilakukan oleh kereta dari t = 5 s hingga t = 12 s?'], flat, 'b', { g: B6 }),
      num(['Find the rate of change of speed in the first 5 seconds.', 'Hitung kadar perubahan laju dalam 5 saat pertama.'], 2, { g: B6, unit: 'm s⁻²' }),
      num(['Find the rate of change of speed in the last 4 seconds.', 'Hitung kadar perubahan laju dalam 4 saat terakhir.'], -2.5, { g: B6, unit: 'm s⁻²' }),
      num(['Find the total distance travelled in 16 seconds.', 'Hitung jumlah jarak yang dilalui dalam 16 saat.'], 115, { g: B6, unit: 'm' }),
      num(['The total distance travelled in T seconds is 300 m. Find the value of T.', 'Jumlah jarak yang dilalui dalam T saat ialah 300 m. Hitung nilai T.'], 18, { g: B10, unit: 's' })
    ]
  };

  /** What item n tests — the same on both forms. */
  const SLOTS = [
    ['Stationary period', 'Tempoh pegun'], ['Speed from gradient', 'Laju daripada kecerunan'], ['Moving back (d–t)', 'Bergerak balik (j-m)'],
    ['Average speed', 'Laju purata'], ['Graph is not a picture', 'Graf bukan gambar'], ['Uniform speed (v–t)', 'Laju seragam (l-m)'],
    ['Acceleration', 'Pecutan'], ['Deceleration (negative)', 'Nyahpecutan (negatif)'], ['Distance = area', 'Jarak = luas'], ['Unknown from area', 'Anu daripada luas']
  ];

  const SURVEY = [
    ['Motion Quest was fun to use.', 'Motion Quest seronok digunakan.'],
    ['I understand distance–time graphs better after playing.', 'Saya lebih faham graf jarak-masa selepas bermain.'],
    ['I understand speed–time graphs better after playing.', 'Saya lebih faham graf laju-masa selepas bermain.'],
    ['Watching the car move helped me understand the graphs.', 'Melihat kereta bergerak membantu saya memahami graf.'],
    ['The feedback helped me see my mistakes.', 'Maklum balas membantu saya melihat kesilapan saya.'],
    ['I would like to learn other topics this way.', 'Saya mahu belajar topik lain dengan cara ini.'],
    ['The game was easy to use on my device.', 'Permainan ini mudah digunakan pada peranti saya.'],
    ['I feel confident answering graphs of motion questions now.', 'Saya kini yakin menjawab soalan graf gerakan.']
  ];
  const LIKERT = [['Strongly disagree', 'Sangat tidak setuju'], ['Disagree', 'Tidak setuju'], ['Not sure', 'Tidak pasti'], ['Agree', 'Setuju'], ['Strongly agree', 'Sangat setuju']];

  /* ---------- state helpers ---------- */
  const tests = () => st.tests || (st.tests = []);
  const cleared = () => Object.keys(st.done).filter(k => st.done[k]).length;
  const lastOf = kind => tests().filter(r => r.test === kind).slice(-1)[0];
  const formFor = kind => ((+st.reg % 2 === 1) === (kind === 'pre')) ? 'A' : 'B';
  const preTaken = () => !!tests().find(r => r.test === 'pre' && !r.skipped);
  const preSkipped = () => !!tests().find(r => r.test === 'pre' && r.skipped);
  const postTaken = () => !!lastOf('post');
  const preOpen = () => !preTaken() && cleared() === 0;
  const needPre = () => preOpen() && !preSkipped();
  const postOpen = () => !postTaken() && cleared() >= POST_AFTER_LEVELS && st.sent > 0;

  function record(row) {
    const d = new Date(), p = x => String(x).padStart(2, '0');
    tests().push(Object.assign({
      test_id: 't' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7),
      timestamp: d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()),
      class_code: st.classCode, student_code: studentCode(), form: '', score: 0, max: 0, answers: '', correct_items: '',
      time_s: 0, levels_cleared: cleared(), skipped: false
    }, row));
    save();
    sendTests();
  }

  const unitText = x => (Array.isArray(x) ? tt(x) : x || '');
  const numOf = s => parseFloat(String(s).replace(',', '.').replace('−', '-'));
  const isRight = (it, a) => (it.kind === 'num' ? a != null && a !== '' && Math.abs(numOf(a) - it.ans) < 0.011 : a === it.ans);
  const diagram = g => '<div class="tdiag">' + MK.plot(g, { schematic: g.schematic, w: 640, h: 300 }) + '</div>';

  /* ---------- the runner ---------- */
  let run = null;
  function start(kind, then) {
    const form = formFor(kind);
    run = { kind, form, items: FORMS[form], i: 0, ans: {}, t0: Date.now(), then: then || null, stage: 'intro' };
    show('test'); render();
  }

  function render() {
    if (!run) return;
    const el = $('screen-test'), k = run.kind, n = run.items.length;
    const title = k === 'pre' ? T('Before you <span class="script">start</span>', 'Sebelum anda <span class="script">mula</span>') : T('After you <span class="script">play</span>', 'Selepas anda <span class="script">bermain</span>');

    if (run.stage === 'intro') {
      el.innerHTML = '<div class="card"><div class="badge">' + (k === 'pre' ? T('Pre-test', 'Ujian pra') : T('Post-test', 'Ujian pasca')) + '</div>' +
        '<h1>' + title + '</h1>' +
        '<p style="font-size:16.5px;">' + (k === 'pre'
          ? T('10 quick questions about graphs of motion, before you play. It is not marked for your grade. It shows what you know now, so we can see what the game teaches.', '10 soalan ringkas tentang graf gerakan, sebelum anda bermain. Ujian ini tidak dikira untuk gred anda. Ia menunjukkan apa yang anda tahu sekarang, supaya kita dapat melihat apa yang diajar oleh permainan ini.')
          : T('10 questions like the ones before you started. Answer on your own. There are no hints this time.', '10 soalan seperti sebelum anda mula. Jawab secara sendiri. Tiada petunjuk kali ini.')) + '</p>' +
        (k === 'post' ? '<div class="post-warn"><b>⚠️ ' + T('Only start when you have finished playing.', 'Mula hanya apabila anda sudah selesai bermain.') + '</b> ' +
          T('You get one try, and your teacher uses it to see how much you learned from the whole game. Want to play more first? Press <i>Not yet</i>. The post-test will wait for you on the map.', 'Anda ada satu cubaan sahaja, dan guru anda menggunakannya untuk melihat berapa banyak yang anda pelajari daripada keseluruhan permainan. Mahu bermain lagi dahulu? Tekan <i>Belum lagi</i>. Ujian pasca akan menunggu anda di peta.') + '</div>' : '') +
        '<div class="chips"><span class="chip">' + T('10 questions', '10 soalan') + '</span><span class="chip">' + T('about 10 minutes', 'kira-kira 10 minit') + '</span><span class="chip">' + T('one try only', 'satu cubaan sahaja') + '</span></div>' +
        '<div class="row" style="margin-top:22px;"><button class="btn" id="t-go">' + (k === 'post' ? T('I’m finished — start', 'Saya sudah selesai — mula') : T('Start', 'Mula')) + '</button>' +
        (k === 'pre' ? '<button class="btn ghost" id="t-skip">' + T('Skip', 'Langkau') + '</button>' : '<button class="btn ghost" id="t-later">' + T('Not yet — keep playing', 'Belum lagi — terus bermain') + '</button>') + '</div>' +
        (k === 'pre' ? '<p class="muted" style="margin-top:14px;">' + T('Skip only if your teacher hasn’t asked you to do it. Once you clear a level, the pre-test closes.', 'Langkau hanya jika guru anda tidak meminta anda menjawabnya. Setelah anda menyelesaikan satu tahap, ujian pra ditutup.') + '</p>' : '') +
        '</div>';
      el.insertAdjacentHTML('afterbegin', '<button class="btn ghost sm test-map" id="t-map">' + T('← Map', '← Peta') + '</button>');
      $('t-map').addEventListener('click', () => { run = null; renderMap(); show('map'); });
      $('t-go').addEventListener('click', () => { run.stage = 'q'; run.t0 = Date.now(); render(); });
      if ($('t-skip')) $('t-skip').addEventListener('click', () => { record({ test: 'pre', form: run.form, skipped: true }); finish(); });
      if ($('t-later')) $('t-later').addEventListener('click', () => { run = null; renderMap(); show('map'); });
      return;
    }

    if (run.stage === 'q') {
      const it = run.items[run.i], a = run.ans[run.i];
      let input;
      if (it.kind === 'num') {
        input = '<div class="row" style="margin-top:14px;"><input type="text" class="tnum" id="t-num" inputmode="decimal" maxlength="7" value="' + (a != null ? a : '') + '" aria-label="' + T('Your answer', 'Jawapan anda') + '">' +
          '<span style="font-weight:700;">' + unitText(it.unit) + '</span></div>';
      } else if (it.graphs) {
        input = '<div class="opt-graphs">' + it.opts.map(o => '<button class="opt-graph' + (a === o[0] ? ' chosen' : '') + '" data-o="' + o[0] + '"><span class="og-k">' + o[0].toUpperCase() + '</span>' + MK.plot(o[1], { mini: true }) + '</button>').join('') + '</div>';
      } else {
        input = '<div class="opts">' + it.opts.map(o => '<button class="opt' + (a === o[0] ? ' chosen' : '') + '" data-o="' + o[0] + '">' + tt(o[1]) + '</button>').join('') + '</div>';
      }
      el.innerHTML = '<div class="tprog"><div class="row spread"><b>' + (k === 'pre' ? T('Pre-test', 'Ujian pra') : T('Post-test', 'Ujian pasca')) + '</b><span>' + (run.i + 1) + ' / ' + n + '</span></div>' +
        '<div class="progress"><i style="width:' + ((run.i) / n * 100) + '%"></i></div></div>' +
        '<div class="card"><div class="row" style="gap:12px;align-items:flex-start;"><div class="qn">' + (run.i + 1) + '</div><p style="font-size:17px;color:var(--ink);font-weight:500;margin:2px 0 0;flex:1;">' + tt(it.q) + '</p></div>' +
        (it.g ? diagram(it.g) : '') + input + '</div>' +
        '<div class="row spread" style="margin-top:18px;"><button class="btn ghost" id="t-back"' + (run.i === 0 ? ' style="visibility:hidden"' : '') + '>' + T('Back', 'Kembali') + '</button>' +
        '<button class="btn" id="t-next"' + (a == null || a === '' ? ' disabled' : '') + '>' + (run.i === n - 1 ? T('Submit test', 'Hantar ujian') : T('Next', 'Seterusnya')) + '</button></div>';
      const box = $('t-num');
      if (box) {
        box.addEventListener('input', () => {
          box.value = box.value.replace(/[^0-9.,\-−]/g, '');
          run.ans[run.i] = box.value;
          $('t-next').disabled = !box.value || isNaN(numOf(box.value));
        });
        box.addEventListener('keydown', e => { if (e.key === 'Enter' && box.value) $('t-next').click(); });
        box.focus();
      }
      el.querySelectorAll('[data-o]').forEach(b => b.addEventListener('click', () => { run.ans[run.i] = b.dataset.o; render(); }));
      $('t-back').addEventListener('click', () => { run.i--; render(); window.scrollTo({ top: 0, behavior: 'instant' }); });
      $('t-next').addEventListener('click', () => {
        if (run.i < n - 1) { run.i++; render(); window.scrollTo({ top: 0, behavior: 'instant' }); return; }
        if (!confirm(T('Submit your answers? You can’t change them after this.', 'Hantar jawapan anda? Anda tidak boleh mengubahnya selepas ini.'))) return;
        submit();
      });
      return;
    }

    if (run.stage === 'survey') {
      el.innerHTML = '<div class="card"><div class="badge">' + T('Last step', 'Langkah terakhir') + '</div><h1>' + T('What did you <span class="script">think?</span>', 'Apa <span class="script">pendapat</span> anda?') + '</h1>' +
        '<p>' + T('Tell us honestly. There are no right answers.', 'Beritahu kami dengan jujur. Tiada jawapan betul atau salah.') + '</p>' +
        '<div class="lk-key"><span>1 = ' + tt(LIKERT[0]) + '</span><span>5 = ' + tt(LIKERT[4]) + '</span></div>' +
        SURVEY.map((s, j) => '<div class="lk"><p>' + (j + 1) + '. ' + tt(s) + '</p><div class="scale" role="radiogroup">' +
          [1, 2, 3, 4, 5].map(x => '<button data-s="' + j + '" data-v="' + x + '" aria-label="' + tt(LIKERT[x - 1]) + '"' + (run.survey[j] === x ? ' class="on"' : '') + '>' + x + '</button>').join('') + '</div></div>').join('') +
        '<label class="fld" for="t-comment" style="margin-top:18px;">' + T('What did you like most, or what should we improve?', 'Apa yang paling anda suka, atau apa yang perlu diperbaiki?') + '</label>' +
        '<textarea id="t-comment" maxlength="500" rows="3">' + (run.comment || '') + '</textarea>' +
        '<div class="row" style="margin-top:18px;"><button class="btn" id="t-send"' + (Object.keys(run.survey).length < SURVEY.length ? ' disabled' : '') + '>' + T('Send', 'Hantar') + '</button>' +
        '<button class="btn ghost" id="t-noskip">' + T('Skip', 'Langkau') + '</button></div></div>';
      el.querySelectorAll('[data-s]').forEach(b => b.addEventListener('click', () => { run.comment = $('t-comment').value; run.survey[+b.dataset.s] = +b.dataset.v; render(); }));
      $('t-send').addEventListener('click', () => {
        const comment = $('t-comment').value.trim().slice(0, 500);
        record({ test: 'survey', answers: JSON.stringify({ likert: SURVEY.map((_, j) => run.survey[j]), comment }), max: 5 });
        run.stage = 'done'; render();
      });
      $('t-noskip').addEventListener('click', () => { run.stage = 'done'; render(); });
      return;
    }

    const pre = tests().filter(r => r.test === 'pre' && !r.skipped)[0], post = lastOf('post');
    el.innerHTML = '<div class="card"><div class="badge">' + T('Submitted ✓', 'Dihantar ✓') + '</div>' +
      (run.kind === 'pre'
        ? '<h1>' + T('Thank you! Now go and <span class="script">play</span>', 'Terima kasih! Sekarang jom <span class="script">bermain</span>') + '</h1><p>' +
          T('Your answers are saved. After you have played, a post-test will show how much you learned.', 'Jawapan anda telah disimpan. Selepas bermain, ujian pasca akan menunjukkan berapa banyak yang anda pelajari.') + '</p>'
        : '<h1>' + T('Look how far you <span class="script">came</span>', 'Lihat kemajuan <span class="script">anda</span>') + '</h1>' +
          '<div class="player" style="margin-top:14px;">' + (pre ? '<div class="kpi"><b>' + pre.score + ' / ' + pre.max + '</b><span>' + T('before', 'sebelum') + '</span></div>' : '') +
          '<div class="kpi"><b>' + post.score + ' / ' + post.max + '</b><span>' + T('after', 'selepas') + '</span></div></div>' +
          '<p>' + T('Thank you for taking part.', 'Terima kasih kerana mengambil bahagian.') + '</p>') +
      '<button class="btn" id="t-done">' + (run.then ? T('Start playing', 'Mula bermain') : T('Back to map', 'Kembali ke peta')) + '</button></div>';
    $('t-done').addEventListener('click', finish);
  }

  function submit() {
    const it = run.items, marks = it.map((x, j) => (isRight(x, run.ans[j]) ? '1' : '0'));
    const score = marks.filter(m => m === '1').length;
    record({
      test: run.kind, form: run.form, score, max: it.length,
      answers: JSON.stringify(it.map((_, j) => (run.ans[j] == null ? '' : String(run.ans[j])))),
      correct_items: marks.join(''), time_s: Math.round((Date.now() - run.t0) / 1000)
    });
    const played = Object.keys(st.best).length > 0;
    run.stage = run.kind === 'post' && played ? 'survey' : 'done';
    run.survey = {};
    render();
  }

  function finish() {
    const then = run && run.then;
    run = null;
    if (then) then(); else { renderMap(); show('map'); }
  }

  /* ---------- the card on the map ---------- */
  function card() {
    const pre = tests().filter(r => r.test === 'pre' && !r.skipped)[0], post = lastOf('post');
    const c = cleared();
    const preRow = pre ? '<span class="pill done">' + T('Submitted ✓', 'Dihantar ✓') + '</span>'
      : preOpen() ? '<button class="btn sm" data-test="pre">' + T('Start', 'Mula') + '</button>'
        : '<span class="pill lock">' + T('Closed — you have started playing', 'Ditutup — anda sudah mula bermain') + '</span>';
    let postRow;
    if (post) postRow = '<span class="pill done">' + T('Submitted ✓', 'Dihantar ✓') + '</span>';
    else if (postOpen()) postRow = '<button class="btn sm pulse" data-test="post">' + T('Start', 'Mula') + '</button>';
    else if (c < POST_AFTER_LEVELS) postRow = '<span class="pill lock">' + T('Clear ' + POST_AFTER_LEVELS + ' levels to unlock · ' + c + ' / ' + POST_AFTER_LEVELS, 'Selesaikan ' + POST_AFTER_LEVELS + ' tahap untuk buka · ' + c + ' / ' + POST_AFTER_LEVELS) + '</span>';
    else postRow = '<span class="pill lock">' + T('Submit your results first (My progress)', 'Hantar keputusan anda dahulu (Kemajuan saya)') + '</span>';
    return '<div class="world testcard"><div class="n" style="background:var(--green)">✎</div>' +
      '<h3>' + T('Before &amp; after test', 'Ujian sebelum &amp; selepas') + '</h3>' +
      '<div class="topic">' + T('10 questions before you play, 10 after, to see what you learned.', '10 soalan sebelum bermain dan 10 selepas, untuk melihat apa yang anda pelajari.') + '</div>' +
      '<div class="trow"><span>' + T('Pre-test', 'Ujian pra') + '</span>' + preRow + '</div>' +
      '<div class="trow"><span>' + T('Post-test', 'Ujian pasca') + '</span>' + postRow + '</div></div>';
  }

  function banner() {
    if (preOpen()) {
      return '<div class="test-banner"><div><div class="kicker">' + T('BEFORE YOU START', 'SEBELUM ANDA MULA') + '</div><h2>' + T('Take the pre-test', 'Jawab ujian pra') + '</h2><p>' +
        T('10 quick questions, about 10 minutes. It shows what you know now. It is not marked for your grade.', '10 soalan ringkas, kira-kira 10 minit. Ia menunjukkan apa yang anda tahu sekarang. Ujian ini tidak dikira untuk gred anda.') +
        '</p></div><button class="btn" data-test="pre">' + T('Start the pre-test →', 'Mula ujian pra →') + '</button></div>';
    }
    if (postOpen()) {
      return '<div class="test-banner post"><div><div class="kicker">' + T('YOUR POST-TEST IS READY', 'UJIAN PASCA ANDA SEDIA') + '</div><h2>' + T('Finished playing? See how much you learned', 'Sudah selesai bermain? Lihat berapa banyak yang anda pelajari') + '</h2><p>' +
        T('Take it when you have <b>finished playing</b>. You only get one try. Still want to play more? Go ahead. It will stay here.', 'Jawab apabila anda sudah <b>selesai bermain</b>. Anda hanya ada satu cubaan. Masih mahu bermain lagi? Teruskan. Ujian ini akan kekal di sini.') +
        '</p></div><button class="btn" data-test="post">' + T('Start the post-test →', 'Mula ujian pasca →') + '</button></div>';
    }
    return '';
  }

  function gate(startLevel) {
    if (!needPre()) return false;
    start('pre', startLevel);
    return true;
  }
  function fromUrl() {
    const k = new URLSearchParams(location.search).get('test');
    if (k === 'pre' && !preTaken()) { start('pre'); return true; }
    if (k === 'post' && !postTaken()) { start('post'); return true; }
    return false;
  }

  const api = { start, render, card, banner, gate, fromUrl, needPre, postOpen, isRight, FORMS, SLOTS, SURVEY, POST_AFTER_LEVELS };
  root.MQT = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

/**
 * MOTION QUEST — the six stages
 * ------------------------------------------------------------------
 * Form 4 Mathematics, Chapter 7: Graphs of Motion.
 *
 *   1 Garisan Mula        reading the shape of a distance–time graph
 *   2 Laju Stabil         gradient = speed, average speed
 *   3 Lukis Sendiri       drawing distance–time graphs
 *   4 Pecut!              speed–time graphs, acceleration
 *   5 Jarak Tersembunyi   area under a speed–time graph = distance
 *   6 Perlumbaan Akhir    races with mixed questions
 *
 * Every level makes fresh numbers each time it is played. Every graph is
 * built on the grid, so every answer is exact (whole numbers or halves).
 *
 * A task is one question inside a level:
 *   kind 'pick'  choose one option (graphs or sentences)
 *   kind 'tap'   tap a part of the graph
 *   kind 'num'   type a number
 *   kind 'shade' tap the regions under the graph, then type the distance
 *   kind 'draw'  drag points to draw the graph
 * Wrong answers carry a mistake tag; MISTAKES explains each one.
 *
 * Uses the shell's T() and MK (motion.js) at call time.
 */
(function (root) {
  'use strict';

  /* ---------- helpers ---------- */
  const R = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = a => a[R(0, a.length - 1)];
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = R(0, i);[a[i], a[j]] = [a[j], a[i]]; } return a; };
  const r3 = x => Math.round(x * 1000) / 1000;
  const f = x => MK.fmt(x);
  const u = k => MK.unit(k);
  const L = i => MK.LETTERS[i];
  const T = (en, bm) => root.T(en, bm);
  const isNice = x => Math.abs(x * 2 - Math.round(x * 2)) < 1e-9;     // whole or a half
  const NAMES = ['Ali', 'Siti', 'Mei Ling', 'Kumar', 'Aina', 'Farid', 'Priya', 'Hafiz', 'Daniel', 'Nurul', 'Wei Jie', 'Aisyah'];

  /** A graph from corners given in grid units. */
  function grid(type, tu, yu, tStep, yStep, corners, headroom) {
    const pts = corners.map(c => [r3(c[0] * tStep), r3(c[1] * yStep)]);
    const maxC = Math.max(...corners.map(c => c[0])), maxR = Math.max(...corners.map(c => c[1]));
    return { type, tu, yu, tStep, yStep, pts, tMax: r3(maxC * tStep), yMax: r3((maxR + (headroom == null ? 1 : headroom)) * yStep) };
  }
  /** Corners from a list of moves [kind, cols, rowsPerCol]; kind up | flat | down | home. */
  function walk(moves, y0) {
    let c = 0, r = y0 || 0;
    const out = [[0, r]];
    moves.forEach(m => {
      c += m[1];
      if (m[0] === 'up') r += m[1] * m[2];
      else if (m[0] === 'down') r -= m[1] * m[2];
      else if (m[0] === 'home') r = 0;
      out.push([c, r]);
    });
    return out;
  }
  const sameAxes = (gs) => { const tMax = Math.max(...gs.map(g => g.tMax)), yMax = Math.max(...gs.map(g => g.yMax)); gs.forEach(g => { g.tMax = tMax; g.yMax = yMax; }); return gs; };
  const withPts = (g, pts) => Object.assign({}, g, { pts });
  const segsOf = g => MK.segs(g.pts);

  /* ============================================================
     Mistakes — what each tag means, said to the student
     ============================================================ */
  const MISTAKES = {
    missed_stop: () => T('Look again: the car stopped for a while. While it stops, the distance stays the same, so the graph goes flat.', 'Lihat semula. Kereta itu berhenti seketika. Semasa berhenti, jaraknya tidak berubah, jadi graf menjadi mendatar.'),
    stop_as_return: () => T('That graph goes down, which means moving back towards the start. The car only stopped, so the line should be flat.', 'Graf itu menurun, iaitu bergerak balik ke titik mula. Kereta itu hanya berhenti, jadi garisnya sepatutnya mendatar.'),
    return_not_down: () => T('Coming back home makes the distance from home smaller, so the line must go down to 0.', 'Apabila pulang ke rumah, jarak dari rumah menjadi semakin kecil, jadi garis mesti menurun hingga 0.'),
    return_drawn_up: () => T('On the way back the distance from the start gets smaller, so the line goes down, not up.', 'Semasa perjalanan balik, jarak dari titik mula semakin kecil, jadi garis menurun, bukan menaik.'),
    graph_as_picture: () => T('A distance–time graph is not a picture of the road. Going over a hill still takes you further from the start, so the distance keeps increasing.', 'Graf jarak-masa bukan gambar jalan. Melalui bukit tetap membawa anda semakin jauh dari titik mula, jadi jaraknya terus bertambah.'),
    ignored_uniform: () => T('The story says the speed is uniform (the same all the way), so the graph is one straight line.', 'Cerita itu menyatakan lajunya seragam (sama sepanjang masa), jadi graf ialah satu garis lurus.'),
    speed_change_missed: () => T('The speed changes halfway, so the line changes steepness there. A steeper line means faster.', 'Laju berubah di pertengahan, jadi kecerunan garis berubah di situ. Garis yang lebih curam bermaksud lebih laju.'),
    misread_scale: () => T('The shape is right, but a number is not. Read the times and distances on the axes carefully.', 'Bentuknya betul, tetapi ada nombor yang tidak tepat. Baca masa dan jarak pada paksi dengan teliti.'),
    stationary_misread: () => T('Stationary means not moving, so the distance does not change. Look for the flat (horizontal) part.', 'Pegun bermaksud tidak bergerak, jadi jarak tidak berubah. Cari bahagian yang mendatar (mengufuk).'),
    return_misread: () => T('Moving back towards the start makes the distance smaller. Look for the part that goes down.', 'Bergerak balik ke titik mula menjadikan jarak semakin kecil. Cari bahagian yang menurun.'),
    read_point_not_duration: () => T('That is the time on the clock at one end. How long it lasted is the end time minus the start time.', 'Itu ialah masa pada satu hujung sahaja. Tempoh ialah masa akhir tolak masa mula.'),
    read_wrong_axis: () => T('That number is a distance. The question asks about time, which is on the horizontal axis.', 'Nombor itu ialah jarak. Soalan bertanya tentang masa, yang berada pada paksi mengufuk.'),
    speed_inverted: () => T('Speed = distance ÷ time. You divided time by distance.', 'Laju = jarak ÷ masa. Anda membahagikan masa dengan jarak.'),
    used_coordinates_not_change: () => T('Use the change, not the reading at one point: (distance at the end − distance at the start) ÷ (time at the end − time at the start).', 'Gunakan perubahan, bukan bacaan pada satu titik: (jarak akhir − jarak mula) ÷ (masa akhir − masa mula).'),
    negative_speed: () => T('The gradient is negative because the car is coming back. Speed is how fast, so it is never negative: give the size only.', 'Kecerunan negatif kerana kereta itu bergerak balik. Laju ialah seberapa cepat, jadi ia tidak pernah negatif. Berikan nilainya sahaja.'),
    fastest_most_distance: () => T('That part covers the most distance, but it also takes longer. Fastest means the steepest line: most distance in each unit of time.', 'Bahagian itu merentasi jarak paling jauh, tetapi ia juga mengambil masa lebih lama. Paling laju bermaksud garis paling curam, iaitu jarak paling jauh bagi setiap unit masa.'),
    compare_gradients: () => T('Compare how steep the parts are. The steeper the line, the higher the speed.', 'Bandingkan kecuraman setiap bahagian. Semakin curam garis, semakin tinggi lajunya.'),
    ignored_stop_time: () => T('Average speed uses the total time for the whole journey, and that includes the time spent stopped.', 'Laju purata menggunakan jumlah masa bagi seluruh perjalanan, termasuk masa semasa berhenti.'),
    mean_of_speeds: () => T('Average speed is not the average of the speeds. It is total distance ÷ total time.', 'Laju purata bukan purata bagi laju-laju itu. Laju purata = jumlah jarak ÷ jumlah masa.'),
    one_way_distance: () => T('The total distance travelled includes the way there and the way back.', 'Jumlah jarak yang dilalui termasuk perjalanan pergi dan perjalanan balik.'),
    used_displacement: () => T('The car ended where it started, but it did travel. Add the distance there and the distance back.', 'Kereta itu berakhir di tempat ia bermula, tetapi ia tetap bergerak. Tambahkan jarak pergi dan jarak balik.'),
    minutes_not_hours: () => T('The answer must be in km per hour, but the time is in minutes. Change minutes to hours first (÷ 60).', 'Jawapan mesti dalam km sejam, tetapi masa diberi dalam minit. Tukar minit kepada jam dahulu (÷ 60).'),
    stop_not_flat: () => T('While stationary the distance stays the same, so those points should be at the same height.', 'Semasa pegun, jarak tidak berubah, jadi titik-titik itu sepatutnya berada pada ketinggian yang sama.'),
    uniform_not_flat: () => T('At uniform speed the speed stays the same, so on a speed–time graph those points are at the same height.', 'Pada laju seragam, laju tidak berubah, jadi pada graf laju-masa titik-titik itu berada pada ketinggian yang sama.'),
    misplot_point: () => T('Some points (in red) are not in the right place. Work out the value at those times from the story.', 'Beberapa titik (berwarna merah) tidak berada di tempat yang betul. Hitung nilai pada masa itu berdasarkan cerita.'),
    dt_habit_slope_uniform: () => T('Careful: this is a speed–time graph. A sloping line means the speed is changing. Uniform speed is the flat part.', 'Berhati-hati, ini graf laju-masa. Garis yang condong bermaksud laju sedang berubah. Laju seragam ialah bahagian yang mendatar.'),
    accel_decel_mixed: () => T('A line going down on a speed–time graph means the speed is decreasing (deceleration). Accelerating goes up.', 'Garis yang menurun pada graf laju-masa bermaksud laju berkurang (nyahpecutan). Pecutan ialah garis yang menaik.'),
    vt_flat_misread: () => T('A flat line on a speed–time graph means the speed does not change: uniform speed.', 'Garis mendatar pada graf laju-masa bermaksud laju tidak berubah, iaitu laju seragam.'),
    vt_flat_as_stationary: () => T('That is true for a distance–time graph. On a speed–time graph, a flat line above 0 means moving at a uniform speed.', 'Itu benar bagi graf jarak-masa. Pada graf laju-masa, garis mendatar di atas 0 bermaksud bergerak dengan laju seragam.'),
    accel_inverted: () => T('Rate of change of speed = change in speed ÷ time taken. You divided the other way round.', 'Kadar perubahan laju = perubahan laju ÷ masa yang diambil. Anda membahagi secara terbalik.'),
    read_speed_not_change: () => T('That is the change in speed. Divide it by the time taken to get the rate of change of speed.', 'Itu ialah perubahan laju. Bahagikan dengan masa yang diambil untuk mendapat kadar perubahan laju.'),
    accel_sign: () => T('The speed is decreasing, so the rate of change of speed is negative. Put a minus sign in front.', 'Laju semakin berkurang, jadi kadar perubahan laju adalah negatif. Letakkan tanda negatif di hadapan.'),
    ignored_initial_speed: () => T('The object did not start from rest. Add the speed it started with.', 'Objek itu tidak bermula dari pegun. Tambahkan laju awalnya.'),
    triangle_no_half: () => T('That region is a triangle, and the area of a triangle is ½ × base × height.', 'Kawasan itu ialah segi tiga, dan luas segi tiga = ½ × tapak × tinggi.'),
    read_speed_as_distance: () => T('That is a speed read off the graph. Distance is the area under the graph.', 'Itu ialah laju yang dibaca daripada graf. Jarak ialah luas di bawah graf.'),
    trapezium_as_rectangle: () => T('The region is a trapezium, not a rectangle. Area = ½ × (sum of the parallel sides) × width.', 'Kawasan itu ialah trapezium, bukan segi empat tepat. Luas = ½ × (hasil tambah sisi selari) × lebar.'),
    trapezium_as_triangle: () => T('The region is a trapezium, not a triangle: the speed did not start at 0. Use ½ × (u + v) × t.', 'Kawasan itu ialah trapezium, bukan segi tiga, kerana laju tidak bermula dari 0. Gunakan ½ × (u + v) × t.'),
    wrong_region: () => T('Shade only the region under the graph between the two times in the question.', 'Lorekkan hanya kawasan di bawah graf di antara dua masa dalam soalan.'),
    answered_interval_not_time: () => T('That is the length of the uniform-speed part. The question asks for the time on the axis, so add the time before it.', 'Itu ialah tempoh bahagian laju seragam. Soalan meminta masa pada paksi, jadi tambahkan masa sebelumnya.'),
    area_formula: () => T('Split the region into a triangle and a rectangle, and write total distance = area of triangle + area of rectangle.', 'Bahagikan kawasan kepada segi tiga dan segi empat tepat, kemudian tulis jumlah jarak = luas segi tiga + luas segi empat tepat.'),
    calc_error: () => T('Not quite. Check your working step by step.', 'Belum tepat. Semak jalan kerja anda langkah demi langkah.'),
    wrong_pick: () => T('Not this one. Compare each option with the story again.', 'Bukan yang ini. Bandingkan setiap pilihan dengan cerita sekali lagi.')
  };

  /* ============================================================
     STAGE 1 · Garisan Mula — the shape of a distance–time graph
     ============================================================ */
  function s1Match() {
    const who = pick(NAMES);
    const tasks = [];
    // a) go, stop, go
    {
      const a = R(2, 3), s = R(1, 2), b = R(2, 3), r1 = R(1, 2), r2 = R(1, 2);
      const good = grid('dt', 'min', 'km', 2, 1, walk([['up', a, r1], ['flat', s], ['up', b, r2]]));
      const c = walk([['up', a, r1], ['flat', s], ['up', b, r2]]);
      const noStop = grid('dt', 'min', 'km', 2, 1, [[0, 0], c[3]]);
      const back = grid('dt', 'min', 'km', 2, 1, [c[0], c[1], [c[2][0], c[1][1] - 1], c[3]]);
      sameAxes([good, noStop, back]);
      tasks.push({
        kind: 'pick', autoplay: true,
        anim: { g: good, from: T('Home', 'Rumah'), to: T('School', 'Sekolah') },
        q: () => T('Watch ' + who + '’s car drive to school. Which distance–time graph matches the journey?', 'Tonton kereta ' + who + ' bergerak ke sekolah. Graf jarak-masa manakah yang sepadan dengan perjalanan itu?'),
        opts: [{ k: 'a', g: good }, { k: 'b', g: noStop, tag: 'missed_stop' }, { k: 'c', g: back, tag: 'stop_as_return' }], ans: 'a',
        hint: () => T('Watch for the moment the car stands still. What does the distance do then?', 'Perhatikan saat kereta itu tidak bergerak. Apakah yang berlaku kepada jaraknya ketika itu?'),
        work: () => T('The car moves, stops, then moves on. Moving away = line going up. Stopped = flat line. So: up, flat, up.', 'Kereta bergerak, berhenti, kemudian bergerak semula. Bergerak menjauh = garis menaik. Berhenti = garis mendatar. Jadi: naik, mendatar, naik.')
      });
    }
    // b) there and back
    {
      const a = R(2, 3), s = R(1, 2), b = R(2, 4), h = R(2, 3);
      const good = grid('dt', 'min', 'km', 2, 1, [[0, 0], [a, h], [a + s, h], [a + s + b, 0]]);
      const flat = grid('dt', 'min', 'km', 2, 1, [[0, 0], [a, h], [a + s + b, h]]);
      const up = grid('dt', 'min', 'km', 2, 1, [[0, 0], [a, h], [a + s, h], [a + s + b, 2 * h]]);
      sameAxes([good, flat, up]);
      tasks.push({
        kind: 'pick', autoplay: true,
        anim: { g: good, from: T('Home', 'Rumah'), to: T('Shop', 'Kedai') },
        q: () => T('The car goes to the shop, waits, then drives back home. Which graph shows its distance from home?', 'Kereta itu pergi ke kedai, menunggu, kemudian pulang ke rumah. Graf manakah yang menunjukkan jaraknya dari rumah?'),
        opts: [{ k: 'a', g: good }, { k: 'b', g: flat, tag: 'return_not_down' }, { k: 'c', g: up, tag: 'return_drawn_up' }], ans: 'a',
        hint: () => T('When the car is back home, how far is it from home?', 'Apabila kereta sampai semula di rumah, berapa jauhkah ia dari rumah?'),
        work: () => T('Back home means the distance from home is 0 again, so the last part of the graph comes down to 0.', 'Sampai di rumah bermaksud jarak dari rumah kembali menjadi 0, jadi bahagian akhir graf menurun hingga 0.')
      });
    }
    // c) over a hill at uniform speed — the graph is not a picture
    {
      const n = R(4, 5), h = R(4, 5);
      const good = grid('dt', 'min', 'km', 2, 1, [[0, 0], [n, h]]);
      const hill = grid('dt', 'min', 'km', 2, 1, [[0, 0], [n / 2, h], [n, 0]]);
      const slow = grid('dt', 'min', 'km', 2, 1, [[0, 0], [n / 2, 1], [n, h]]);
      sameAxes([good, hill, slow]);
      tasks.push({
        kind: 'pick', autoplay: true,
        anim: { g: good, hill: true, from: T('Start', 'Mula'), to: T('End', 'Tamat') },
        q: () => T('The car drives up a hill and down the other side at a <b class="ink">uniform speed</b>. Which is its distance–time graph?', 'Kereta itu mendaki bukit dan menuruninya di sebelah sana dengan <b class="ink">laju seragam</b>. Graf jarak-masa manakah yang betul?'),
        opts: [{ k: 'a', g: good }, { k: 'b', g: hill, tag: 'graph_as_picture' }, { k: 'c', g: slow, tag: 'ignored_uniform' }], ans: 'a',
        hint: () => T('The graph shows how far the car is from the start, not how high it is.', 'Graf menunjukkan berapa jauh kereta dari titik mula, bukan berapa tinggi kedudukannya.'),
        work: () => T('The car keeps getting further from the start at the same speed, so the distance increases steadily: one straight line going up.', 'Kereta semakin jauh dari titik mula dengan laju yang sama, jadi jarak bertambah secara seragam: satu garis lurus yang menaik.')
      });
    }
    return tasks;
  }

  /** A four-part journey: moving away, stopping, going back. */
  function s1Journey() {
    const tpl = pick([
      [['up', 2, 1], ['flat', R(1, 2)], ['up', R(1, 2), 1], ['home', 0]],
      [['up', 1, 2], ['up', 2, 1], ['flat', R(1, 2)], ['home', 0]],
      [['up', 2, 2], ['flat', R(1, 2)], ['down', 1, 1], ['home', 0]]
    ]);
    let c = walk(tpl.map(m => m[0] === 'home' ? ['home', 0] : m));
    // make the final "home" part take a sensible time
    const back = R(2, 3);
    c = c.map((p, i) => (i === c.length - 1 ? [c[i - 1][0] + back, 0] : p));
    return grid('dt', 'min', 'km', 5, 1, c);
  }
  function s1Read() {
    const g = s1Journey(), sg = segsOf(g);
    const flats = sg.filter(s => s.dy === 0).map(s => s.i), downs = sg.filter(s => s.dy < 0).map(s => s.i), ups = sg.filter(s => s.dy > 0).map(s => s.i);
    const stop = sg[flats[0]];
    return [
      {
        kind: 'tap', g, letters: true, anim: { g, from: T('Home', 'Rumah') },
        q: () => T('Tap the part of the graph where the car is <b class="ink">stationary</b> (not moving).', 'Ketik bahagian graf ketika kereta itu <b class="ink">pegun</b> (tidak bergerak).'),
        ans: flats, tagOf: () => 'stationary_misread',
        hint: () => T('Not moving means the distance stays the same.', 'Tidak bergerak bermaksud jaraknya kekal sama.'),
        work: () => T('Part ' + flats.map(L).join(' and ') + ' is flat: the distance does not change, so the car is stationary.', 'Bahagian ' + flats.map(L).join(' dan ') + ' mendatar: jarak tidak berubah, jadi kereta itu pegun.')
      },
      {
        kind: 'tap', g, letters: true, anim: { g, from: T('Home', 'Rumah') },
        q: () => T('Tap the part where the car is <b class="ink">moving back towards home</b>.', 'Ketik bahagian ketika kereta itu <b class="ink">bergerak balik ke rumah</b>.'),
        ans: downs, tagOf: i => (sg[i].dy === 0 ? 'stop_as_return' : 'return_misread'),
        hint: () => T('Getting closer to home makes the distance from home smaller.', 'Semakin dekat dengan rumah, jarak dari rumah semakin kecil.'),
        work: () => T('Part ' + downs.map(L).join(' and ') + ' goes down: the distance from home decreases, so the car is coming back.', 'Bahagian ' + downs.map(L).join(' dan ') + ' menurun: jarak dari rumah berkurang, jadi kereta sedang pulang.')
      },
      {
        kind: 'num', g, letters: true, hi: [stop.i], anim: { g, from: T('Home', 'Rumah') },
        q: () => T('For how many minutes is the car stationary in part ' + L(stop.i) + '?', 'Berapa minitkah kereta itu pegun dalam bahagian ' + L(stop.i) + '?'),
        ans: stop.dt, unit: 'min',
        wrongs: [[stop.t1, 'read_point_not_duration'], [stop.t0, 'read_point_not_duration'], [stop.y0, 'read_wrong_axis']],
        hint: () => T('Read the time where part ' + L(stop.i) + ' starts and where it ends.', 'Baca masa di permulaan dan di hujung bahagian ' + L(stop.i) + '.'),
        work: () => T('It stops from ' + f(stop.t0) + ' min to ' + f(stop.t1) + ' min: ' + f(stop.t1) + ' − ' + f(stop.t0) + ' = ' + f(stop.dt) + ' min.', 'Kereta berhenti dari minit ke-' + f(stop.t0) + ' hingga minit ke-' + f(stop.t1) + ': ' + f(stop.t1) + ' − ' + f(stop.t0) + ' = ' + f(stop.dt) + ' minit.')
      }
    ];
  }

  function s1Story() {
    const tasks = [];
    // a) walk to the shop and back (m, min)
    {
      const who = pick(NAMES), d = R(2, 4), a = R(2, 3), s = R(1, 2), b = R(2, 3);
      const mk = c => grid('dt', 'min', 'm', 5, 200, c);
      const good = mk([[0, 0], [a, d], [a + s, d], [a + s + b, 0]]);
      const longStop = mk([[0, 0], [a, d], [a + s + 1, d], [a + s + 1 + b, 0]]);
      const up = mk([[0, 0], [a, d], [a + s, d], [a + s + b, 2 * d]]);
      const far = mk([[0, 0], [a, d - 1], [a + s, d - 1], [a + s + b, 0]]);
      sameAxes([good, longStop, up, far]);
      tasks.push({
        kind: 'pick', optTicks: true, animAfter: { g: good, from: T('Home', 'Rumah'), to: T('Shop', 'Kedai') },
        q: () => T(who + ' walks ' + f(d * 200) + ' m to a shop in ' + f(a * 5) + ' minutes, shops for ' + f(s * 5) + ' minutes, then walks home in ' + f(b * 5) + ' minutes. Which graph shows this?',
          who + ' berjalan sejauh ' + f(d * 200) + ' m ke kedai dalam masa ' + f(a * 5) + ' minit, membeli-belah selama ' + f(s * 5) + ' minit, kemudian berjalan pulang dalam masa ' + f(b * 5) + ' minit. Graf manakah yang menunjukkan perjalanan ini?'),
        opts: [{ k: 'a', g: good }, { k: 'b', g: longStop, tag: 'misread_scale' }, { k: 'c', g: up, tag: 'return_drawn_up' }, { k: 'd', g: far, tag: 'misread_scale' }], ans: 'a',
        hint: () => T('Check three things: how far the shop is, how long the flat part lasts, and that the graph comes back to 0.', 'Semak tiga perkara: jarak kedai, tempoh bahagian mendatar, dan graf kembali ke 0.'),
        work: () => T('Up to ' + f(d * 200) + ' m at ' + f(a * 5) + ' min, flat until ' + f((a + s) * 5) + ' min, then down to 0 at ' + f((a + s + b) * 5) + ' min.', 'Naik hingga ' + f(d * 200) + ' m pada minit ke-' + f(a * 5) + ', mendatar hingga minit ke-' + f((a + s) * 5) + ', kemudian turun ke 0 pada minit ke-' + f((a + s + b) * 5) + '.')
      });
    }
    // b) express bus with a rest stop (km, h)
    {
      const d1 = R(2, 4), d2 = R(1, 3);
      const mk = c => grid('dt', 'h', 'km', 0.5, 20, c);
      const good = mk([[0, 0], [2, d1], [3, d1], [4, d1 + d2]]);
      const noStop = mk([[0, 0], [2, d1], [4, d1 + d2]]);
      const back = mk([[0, 0], [2, d1], [3, d1 - 1], [4, d1 + d2]]);
      const late = mk([[0, 0], [3, d1], [4, d1], [5, d1 + d2]]);
      sameAxes([good, noStop, back, late]);
      tasks.push({
        kind: 'pick', optTicks: true, animAfter: { g: good, from: 'Kuala Lumpur', to: 'Ipoh' },
        q: () => T('An express bus travels ' + f(d1 * 20) + ' km in the first hour, stops at a rest area for 30 minutes, then travels another ' + f(d2 * 20) + ' km in 30 minutes. Which graph shows this?',
          'Sebuah bas ekspres bergerak sejauh ' + f(d1 * 20) + ' km dalam jam pertama, berhenti di kawasan rehat selama 30 minit, kemudian bergerak sejauh ' + f(d2 * 20) + ' km lagi dalam masa 30 minit. Graf manakah yang menunjukkan perjalanan ini?'),
        opts: [{ k: 'a', g: good }, { k: 'b', g: noStop, tag: 'missed_stop' }, { k: 'c', g: back, tag: 'stop_as_return' }, { k: 'd', g: late, tag: 'misread_scale' }], ans: 'a',
        hint: () => T('30 minutes is 0.5 hour. Where does the flat part start and end?', '30 minit ialah 0.5 jam. Di manakah bahagian mendatar bermula dan berakhir?'),
        work: () => T('Up to ' + f(d1 * 20) + ' km at 1 h, flat from 1 h to 1.5 h, then up to ' + f((d1 + d2) * 20) + ' km at 2 h.', 'Naik hingga ' + f(d1 * 20) + ' km pada 1 jam, mendatar dari 1 jam hingga 1.5 jam, kemudian naik hingga ' + f((d1 + d2) * 20) + ' km pada 2 jam.')
      });
    }
    // c) up and down a hill on a bicycle
    {
      const who = pick(NAMES), d = R(1, 2), up = R(2, 3), down = 1;
      const mk = c => grid('dt', 'min', 'km', 5, 1, c);
      const good = mk([[0, 0], [up, d], [up + down, 2 * d]]);
      const hill = mk([[0, 0], [up, d], [up + down, 0]]);
      const swap = mk([[0, 0], [down, d], [up + down, 2 * d]]);
      const straight = mk([[0, 0], [up + down, 2 * d]]);
      sameAxes([good, hill, swap, straight]);
      tasks.push({
        kind: 'pick', optTicks: true, animAfter: { g: good, hill: true, from: T('Foot of the hill', 'Kaki bukit'), to: T('Other side', 'Seberang') },
        q: () => T(who + ' cycles ' + f(d) + ' km up a hill in ' + f(up * 5) + ' minutes, then ' + f(d) + ' km down the other side in ' + f(down * 5) + ' minutes. Which is the distance–time graph?',
          who + ' berbasikal sejauh ' + f(d) + ' km mendaki bukit dalam masa ' + f(up * 5) + ' minit, kemudian ' + f(d) + ' km menuruni bukit di sebelah sana dalam masa ' + f(down * 5) + ' minit. Graf jarak-masa manakah yang betul?'),
        opts: [{ k: 'a', g: good }, { k: 'b', g: hill, tag: 'graph_as_picture' }, { k: 'c', g: swap, tag: 'misread_scale' }, { k: 'd', g: straight, tag: 'speed_change_missed' }], ans: 'a',
        hint: () => T('Going down the hill still takes ' + who + ' further from the start. Is it faster or slower than going up?', 'Menuruni bukit tetap membawa ' + who + ' semakin jauh dari titik mula. Adakah ia lebih laju atau lebih perlahan berbanding mendaki?'),
        work: () => T('The distance keeps going up: to ' + f(d) + ' km at ' + f(up * 5) + ' min, then more steeply (faster) to ' + f(2 * d) + ' km at ' + f((up + down) * 5) + ' min.', 'Jarak terus bertambah: hingga ' + f(d) + ' km pada minit ke-' + f(up * 5) + ', kemudian lebih curam (lebih laju) hingga ' + f(2 * d) + ' km pada minit ke-' + f((up + down) * 5) + '.')
      });
    }
    return tasks;
  }

  /* ============================================================
     STAGE 2 · Laju Stabil — gradient = speed, average speed
     ============================================================ */
  const AX = {
    ms: ['s', 'm', 2, 10], mmin: ['min', 'm', 1, 50], kmh: ['h', 'km', 0.5, 20]
  };
  /** A random journey on the grid whose every moving part has a nice speed. */
  function niceJourney(kind, tpl) {
    const [tu, yu, ts, ys] = AX[kind];
    for (let tries = 0; tries < 400; tries++) {
      const c = walk(tpl.map(m => m[0] === 'flat' ? ['flat', m[1] || R(1, 2)] : [m[0], m[1] || R(1, 3), m[2] || R(1, 2)]));
      if (c.some(p => p[1] < 0) || Math.max(...c.map(p => p[1])) > 7 || c[c.length - 1][0] > 10) continue;
      const g = grid('dt', tu, yu, ts, ys, c);
      if (segsOf(g).every(s => isNice(Math.abs(s.slope)))) return g;
    }
    return grid('dt', tu, yu, ts, ys, walk([['up', 2, 1], ['flat', 1], ['up', 2, 1]]));
  }
  function speedTask(g, i, extra) {
    const s = segsOf(g)[i], v = Math.abs(s.slope), su = MK.slopeUnit(g);
    const wrongs = [[r3(s.dt / Math.abs(s.dy)), 'speed_inverted']];
    if (s.t1 > 0 && s.t0 > 0) wrongs.push([r3(s.y1 / s.t1), 'used_coordinates_not_change']);
    if (s.slope < 0) wrongs.push([-v, 'negative_speed']);
    return Object.assign({
      kind: 'num', grad: true, g, letters: true, hi: [i], anim: { g }, ans: v, unit: su, wrongs, allowNeg: true,
      q: () => T('Find the speed of the car in part ' + L(i) + ', in ' + u(su) + '.', 'Hitung laju kereta dalam bahagian ' + L(i) + ', dalam ' + u(su) + '.'),
      hint: () => T('Speed = gradient = change in distance ÷ change in time.', 'Laju = kecerunan = perubahan jarak ÷ perubahan masa.'),
      work: () => T('Distance changes by ' + f(Math.abs(s.dy)) + ' ' + u(g.yu) + ' in ' + f(s.dt) + ' ' + u(g.tu) + '. Speed = ' + f(Math.abs(s.dy)) + ' ÷ ' + f(s.dt) + ' = ' + f(v) + ' ' + u(su) + '.',
        'Jarak berubah sebanyak ' + f(Math.abs(s.dy)) + ' ' + u(g.yu) + ' dalam ' + f(s.dt) + ' ' + u(g.tu) + '. Laju = ' + f(Math.abs(s.dy)) + ' ÷ ' + f(s.dt) + ' = ' + f(v) + ' ' + u(su) + '.')
    }, extra || {});
  }
  function s2Speed() {
    const g1 = niceJourney('ms', [['up'], ['flat'], ['up']]);
    const g2 = niceJourney('mmin', [['up'], ['flat'], ['up']]);
    const g3 = niceJourney('kmh', [['up'], ['flat'], ['down', 0, 0]].map(m => m[0] === 'down' ? ['down', R(1, 2), R(1, 2)] : m));
    const last = segsOf(g3).length - 1;
    return [speedTask(g1, 0), speedTask(g2, 2), speedTask(g3, last)];
  }
  function s2Fastest() {
    let g, sg, fast, most;
    for (let k = 0; k < 400; k++) {
      g = niceJourney('ms', [['up', R(1, 4), R(1, 2)], ['flat'], ['up', R(1, 3), R(1, 3)]]);
      sg = segsOf(g);
      const moving = sg.filter(s => s.dy !== 0);
      fast = moving.slice().sort((a, b) => Math.abs(b.slope) - Math.abs(a.slope));
      most = moving.slice().sort((a, b) => Math.abs(b.dy) - Math.abs(a.dy));
      if (Math.abs(fast[0].slope) > Math.abs(fast[1].slope) && most[0].i !== fast[0].i && Math.abs(most[0].dy) > Math.abs(most[1].dy)) break;
    }
    const flat = sg.find(s => s.dy === 0);
    // a second journey that comes back, for the return speed
    const g2 = niceJourney('kmh', [['up'], ['flat'], ['down', R(1, 2), R(1, 3)]]);
    const back = segsOf(g2).filter(s => s.dy < 0).slice(-1)[0];
    return [
      {
        kind: 'tap', g, letters: true, anim: { g },
        q: () => T('In which part is the car moving <b class="ink">fastest</b>? Tap it.', 'Dalam bahagian manakah kereta itu bergerak <b class="ink">paling laju</b>? Ketik bahagian itu.'),
        ans: fast.filter(s => Math.abs(Math.abs(s.slope) - Math.abs(fast[0].slope)) < 1e-9).map(s => s.i), tagOf: i => (sg[i].dy === 0 ? 'stationary_misread' : i === most[0].i ? 'fastest_most_distance' : 'compare_gradients'),
        hint: () => T('Fastest = steepest line.', 'Paling laju = garis paling curam.'),
        work: () => T('Speeds: ' + sg.map(s => L(s.i) + ' = ' + f(Math.abs(s.slope))).join(', ') + ' ' + u('ms') + '. Part ' + L(fast[0].i) + ' is the steepest.', 'Laju: ' + sg.map(s => L(s.i) + ' = ' + f(Math.abs(s.slope))).join(', ') + ' ' + u('ms') + '. Bahagian ' + L(fast[0].i) + ' paling curam.')
      },
      {
        kind: 'num', g, letters: true, hi: [flat.i], anim: { g }, ans: 0, unit: 'ms',
        wrongs: [[flat.y0, 'stationary_misread'], [flat.dt, 'stationary_misread']],
        q: () => T('What is the speed of the car in part ' + L(flat.i) + '?', 'Berapakah laju kereta dalam bahagian ' + L(flat.i) + '?'),
        hint: () => T('How much does the distance change in part ' + L(flat.i) + '?', 'Berapa banyakkah jarak berubah dalam bahagian ' + L(flat.i) + '?'),
        work: () => T('Part ' + L(flat.i) + ' is flat: the distance changes by 0, so the speed is 0 ÷ ' + f(flat.dt) + ' = 0. The car is stationary.', 'Bahagian ' + L(flat.i) + ' mendatar: jarak berubah sebanyak 0, jadi laju = 0 ÷ ' + f(flat.dt) + ' = 0. Kereta itu pegun.')
      },
      speedTask(g2, back.i, {
        q: () => T('The car drives back to the start in part ' + L(back.i) + '. Find its speed in ' + u('kmh') + '.', 'Kereta itu bergerak balik ke titik mula dalam bahagian ' + L(back.i) + '. Hitung lajunya dalam ' + u('kmh') + '.')
      })
    ];
  }
  function s2Average() {
    const tasks = [];
    // a) with a stop (km, h)
    for (let k = 0; k < 500; k++) {
      const Tn = R(4, 8), stop = R(1, 2), a = R(1, Tn - stop - 1), avgs = [20, 30, 40, 50, 60];
      const avg = pick(avgs), D = avg * Tn * 0.5;                // grid t = 0.5 h
      if (D % 20) continue;
      const Dr = D / 20, d1 = R(1, Dr - 1);
      const g = grid('dt', 'h', 'km', 0.5, 20, [[0, 0], [a, d1], [a + stop, d1], [Tn, Dr]]);
      const sg = segsOf(g), tt = Tn * 0.5, moving = tt - stop * 0.5;
      const wr1 = r3(D / moving), wr2 = r3((sg[0].slope + sg[2].slope) / 2);
      if (!isNice(wr1) || Math.abs(wr1 - avg) < 0.01 || Math.abs(wr2 - avg) < 0.01) continue;
      tasks.push({
        kind: 'num', g, anim: { g }, ans: avg, unit: 'kmh', wrongs: [[wr1, 'ignored_stop_time'], [wr2, 'mean_of_speeds'], [r3((sg[0].slope + sg[2].slope) / 3), 'mean_of_speeds']],
        q: () => T('Find the <b class="ink">average speed</b> of the car for the whole journey, in ' + u('kmh') + '.', 'Hitung <b class="ink">laju purata</b> kereta itu bagi seluruh perjalanan, dalam ' + u('kmh') + '.'),
        hint: () => T('Average speed = total distance ÷ total time. Does the total time include the stop?', 'Laju purata = jumlah jarak ÷ jumlah masa. Adakah jumlah masa termasuk masa berhenti?'),
        work: () => T('Total distance = ' + f(D) + ' km. Total time = ' + f(tt) + ' h (including the stop). Average speed = ' + f(D) + ' ÷ ' + f(tt) + ' = ' + f(avg) + ' ' + u('kmh') + '.', 'Jumlah jarak = ' + f(D) + ' km. Jumlah masa = ' + f(tt) + ' jam (termasuk masa berhenti). Laju purata = ' + f(D) + ' ÷ ' + f(tt) + ' = ' + f(avg) + ' ' + u('kmh') + '.')
      });
      break;
    }
    // b) there and back (m, s)
    for (let k = 0; k < 500; k++) {
      const a = R(2, 4), s = R(1, 2), b = R(2, 4), h = R(3, 6), Tn = a + s + b;
      const D = h * 10, tt = Tn * 2, avg = r3(2 * D / tt);
      if (!isNice(avg) || !isNice(D / tt)) continue;
      const g = grid('dt', 's', 'm', 2, 10, [[0, 0], [a, h], [a + s, h], [Tn, 0]]);
      tasks.push({
        kind: 'num', g, anim: { g }, ans: avg, unit: 'ms', wrongs: [[r3(D / tt), 'one_way_distance'], [0, 'used_displacement']],
        q: () => T('A runner goes out and comes back to the start. Find the <b class="ink">average speed</b> for the whole run, in ' + u('ms') + '.', 'Seorang pelari pergi dan kembali ke titik mula. Hitung <b class="ink">laju purata</b> bagi seluruh larian, dalam ' + u('ms') + '.'),
        hint: () => T('Total distance travelled = the distance out + the distance back.', 'Jumlah jarak yang dilalui = jarak pergi + jarak balik.'),
        work: () => T('Total distance = ' + f(D) + ' + ' + f(D) + ' = ' + f(2 * D) + ' m. Total time = ' + f(tt) + ' s. Average speed = ' + f(2 * D) + ' ÷ ' + f(tt) + ' = ' + f(avg) + ' ' + u('ms') + '.', 'Jumlah jarak = ' + f(D) + ' + ' + f(D) + ' = ' + f(2 * D) + ' m. Jumlah masa = ' + f(tt) + ' s. Laju purata = ' + f(2 * D) + ' ÷ ' + f(tt) + ' = ' + f(avg) + ' ' + u('ms') + '.')
      });
      break;
    }
    // c) minutes on the axis, km per hour in the answer
    for (let k = 0; k < 500; k++) {
      const Tn = R(4, 9), stop = 1, a = R(1, Tn - 2), Tm = Tn * 5;
      const avg = pick([24, 30, 36, 40, 42, 48, 60]), D = avg * Tm / 60;
      if (!Number.isInteger(D) || D < 3 || D > 8) continue;
      const d1 = R(1, D - 1), wr = r3(D / Tm);
      const g = grid('dt', 'min', 'km', 5, 1, [[0, 0], [a, d1], [a + stop, d1], [Tn, D]]);
      tasks.push({
        kind: 'num', g, anim: { g }, ans: avg, unit: 'kmh', wrongs: [[wr, 'minutes_not_hours'], [r3(D / (Tm - 5) * 60), 'ignored_stop_time']],
        q: () => T('A motorcyclist delivers food. Find the average speed for the whole journey, in <b class="ink">' + u('kmh') + '</b>.', 'Seorang penghantar makanan menunggang motosikal. Hitung laju purata bagi seluruh perjalanan, dalam <b class="ink">' + u('kmh') + '</b>.'),
        hint: () => T('The time is in minutes. ' + f(Tm) + ' minutes = ' + f(Tm) + ' ÷ 60 hours.', 'Masa diberi dalam minit. ' + f(Tm) + ' minit = ' + f(Tm) + ' ÷ 60 jam.'),
        work: () => T('Total distance = ' + f(D) + ' km. Total time = ' + f(Tm) + ' min = ' + f(r3(Tm / 60)) + ' h. Average speed = ' + f(D) + ' ÷ ' + f(Tm) + '/60 = ' + f(avg) + ' ' + u('kmh') + '.', 'Jumlah jarak = ' + f(D) + ' km. Jumlah masa = ' + f(Tm) + ' minit = ' + f(r3(Tm / 60)) + ' jam. Laju purata = ' + f(D) + ' ÷ ' + f(Tm) + '/60 = ' + f(avg) + ' ' + u('kmh') + '.')
      });
      break;
    }
    return tasks;
  }

  /* ============================================================
     STAGE 3 · Lukis Sendiri — drawing distance–time graphs
     ============================================================ */
  function drawTask(g, q, extra) {
    const cols = []; for (let t = 0; t <= g.tMax + 1e-9; t += g.tStep) cols.push(r3(t));
    const axesOnly = Object.assign({}, g, { pts: [[0, 0]] });
    return Object.assign({
      kind: 'draw', target: g, cols, axes: axesOnly, fixed: { 0: g.pts[0][1] }, anim: { g, dMax: MK.reach(g) },
      q, hint: () => T('Work out where the object is at each time, then drag that point there.', 'Tentukan kedudukan objek pada setiap masa, kemudian seret titik itu ke situ.'),
      work: () => T('The points are: ' + cols.map(t => '(' + f(t) + ', ' + f(MK.at(g.pts, t)) + ')').join(', ') + '.', 'Titik-titiknya ialah: ' + cols.map(t => '(' + f(t) + ', ' + f(MK.at(g.pts, t)) + ')').join(', ') + '.')
    }, extra || {});
  }
  const table = (g, cols) => '<table class="dtable"><tr><th>' + T('Time', 'Masa') + ' (' + u(g.tu) + ')</th>' + cols.map(t => '<td>' + f(t) + '</td>').join('') + '</tr><tr><th>' + (g.type === 'dt' ? T('Distance', 'Jarak') : T('Speed', 'Laju')) + ' (' + u(g.yu) + ')</th>' + cols.map(t => '<td>' + f(MK.at(g.pts, t)) + '</td>').join('') + '</tr></table>';
  function s3Table() {
    const g1 = grid('dt', 's', 'm', 1, 10, walk([['up', R(2, 3), R(1, 2)], ['flat', R(1, 2)], ['up', R(1, 2), R(1, 2)]]));
    const h = R(2, 3), a = R(1, 2);
    const g2 = grid('dt', 'min', 'm', 1, 100, [[0, 0], [a, a * h], [a + 1, a * h], [a + 1 + a, 0]]);
    const who = pick(NAMES);
    return [
      drawTask(g1, () => T('The table shows the distance of a toy car from the start. Plot the points to draw its distance–time graph.', 'Jadual menunjukkan jarak sebuah kereta mainan dari titik mula. Plotkan titik-titik untuk melukis graf jarak-masanya.'), { table: () => table(g1, drawCols(g1)) }),
      drawTask(g2, () => T(who + ' walks to a friend’s house and back. Plot the table to draw the distance–time graph.', who + ' berjalan ke rumah kawan dan pulang semula. Plotkan jadual untuk melukis graf jarak-masa.'), { table: () => table(g2, drawCols(g2)) })
    ];
  }
  const drawCols = g => { const c = []; for (let t = 0; t <= g.tMax + 1e-9; t += g.tStep) c.push(r3(t)); return c; };
  function s3Story() {
    const who = pick(NAMES);
    const a = 2, d1 = R(2, 3), s = 1, d2 = R(1, 2);                     // grid: 0.5 h, 20 km
    const g1 = grid('dt', 'h', 'km', 0.5, 20, [[0, 0], [a, a * d1], [a + s, a * d1], [a + s + 1, a * d1 + d2]]);
    const run = R(2, 3), per = R(1, 2);
    const g2 = grid('dt', 'min', 'm', 1, 100, [[0, 0], [run, run * per * 2], [run + 1, run * per * 2], [run + 1 + run * 2, 0]]);
    return [
      drawTask(g1, () => T(who + ' drives ' + f(a * d1 * 20) + ' km in the first hour at a uniform speed, rests for 30 minutes, then drives ' + f(d2 * 20) + ' km more in 30 minutes. Draw the distance–time graph.',
        who + ' memandu sejauh ' + f(a * d1 * 20) + ' km dalam jam pertama dengan laju seragam, berehat selama 30 minit, kemudian memandu ' + f(d2 * 20) + ' km lagi dalam masa 30 minit. Lukis graf jarak-masa.')),
      drawTask(g2, () => T('A runner runs ' + f(run * per * 200) + ' m from the start in ' + f(run) + ' minutes, rests for 1 minute, then jogs back to the start in ' + f(run * 2) + ' minutes, at uniform speeds. Draw the distance–time graph.',
        'Seorang pelari berlari sejauh ' + f(run * per * 200) + ' m dari titik mula dalam masa ' + f(run) + ' minit, berehat selama 1 minit, kemudian berjoging balik ke titik mula dalam masa ' + f(run * 2) + ' minit, dengan laju seragam. Lukis graf jarak-masa.'))
    ];
  }
  function s3Speeds() {
    const v1 = R(1, 2), a = R(2, 3), s = R(1, 2), v2 = R(1, 2), b = R(1, 2);   // grid 1 s, 10 m → speed = rows × 10
    const g1 = grid('dt', 's', 'm', 1, 10, [[0, 0], [a, a * v1], [a + s, a * v1], [a + s + b, a * v1 + b * v2]]);
    const h = R(2, 3) * 2, up = h / 2, down = h;                             // there at 2 rows/s, back at 1 row/s
    const g2 = grid('dt', 's', 'm', 1, 10, [[0, 0], [up, h], [up + 1, h], [up + 1 + down, 0]]);
    return [
      drawTask(g1, () => T('A robot moves at ' + f(v1 * 10) + ' ' + u('ms') + ' for ' + f(a) + ' s, stops for ' + f(s) + ' s, then moves on at ' + f(v2 * 10) + ' ' + u('ms') + ' for ' + f(b) + ' s. Draw its distance–time graph.',
        'Sebuah robot bergerak dengan laju ' + f(v1 * 10) + ' ' + u('ms') + ' selama ' + f(a) + ' s, berhenti selama ' + f(s) + ' s, kemudian bergerak lagi dengan laju ' + f(v2 * 10) + ' ' + u('ms') + ' selama ' + f(b) + ' s. Lukis graf jarak-masanya.'),
        { hint: () => T('Distance = speed × time. At ' + f(v1 * 10) + ' ' + u('ms') + ', it goes ' + f(v1 * 10) + ' m every second.', 'Jarak = laju × masa. Pada ' + f(v1 * 10) + ' ' + u('ms') + ', robot bergerak ' + f(v1 * 10) + ' m setiap saat.') }),
      drawTask(g2, () => T('A drone flies away at 20 ' + u('ms') + ' for ' + f(up) + ' s, hovers in place for 1 s, then flies straight back to the start at 10 ' + u('ms') + '. Draw the graph of its distance from the start.',
        'Sebuah dron terbang menjauh dengan laju 20 ' + u('ms') + ' selama ' + f(up) + ' s, terapung di tempat yang sama selama 1 s, kemudian terbang terus balik ke titik mula dengan laju 10 ' + u('ms') + '. Lukis graf jaraknya dari titik mula.'),
        { hint: () => T('How far away is the drone when it turns back? At 10 ' + u('ms') + ', how long does it take to come back?', 'Berapa jauhkah dron itu apabila ia berpatah balik? Pada 10 ' + u('ms') + ', berapa lamakah masa untuk kembali?') })
    ];
  }

  /* ============================================================
     STAGE 4 · Pecut! — speed–time graphs
     ============================================================ */
  function vtJourney() {
    for (let k = 0; k < 400; k++) {
      const v0 = pick([0, 0, 1]), a = R(1, 2), ra = R(1, 2), s = R(1, 2), b = R(1, 2);
      const top = v0 + a * ra;
      if (top % b) continue;
      const c = [[0, v0], [a, top], [a + s, top], [a + s + b, 0]];
      if (c[3][0] > 7) continue;
      const g = grid('vt', 's', 'ms', 2, 4, c);
      return g;
    }
    return grid('vt', 's', 'ms', 2, 4, [[0, 0], [2, 2], [4, 2], [5, 0]]);
  }
  function s4Shape() {
    const g = vtJourney(), sg = segsOf(g);
    const flat = sg.find(s => s.dy === 0), upS = sg.find(s => s.dy > 0), dn = sg.find(s => s.dy < 0);
    const g2 = vtJourney(), sg2 = segsOf(g2), flat2 = sg2.find(s => s.dy === 0);
    return [
      {
        kind: 'tap', g, letters: true, anim: { g },
        q: () => T('This is a <b class="ink">speed–time</b> graph. Tap the part where the car moves at a <b class="ink">uniform speed</b>.', 'Ini ialah graf <b class="ink">laju-masa</b>. Ketik bahagian ketika kereta bergerak dengan <b class="ink">laju seragam</b>.'),
        ans: [flat.i], tagOf: () => 'dt_habit_slope_uniform',
        hint: () => T('Uniform speed: the speed does not change.', 'Laju seragam: laju tidak berubah.'),
        work: () => T('In part ' + L(flat.i) + ' the speed stays at ' + f(flat.y0) + ' ' + u('ms') + ': the line is flat.', 'Dalam bahagian ' + L(flat.i) + ', laju kekal ' + f(flat.y0) + ' ' + u('ms') + ': garisnya mendatar.')
      },
      {
        kind: 'tap', g, letters: true, anim: { g },
        q: () => T('Tap the part where the car is <b class="ink">accelerating</b> (speeding up).', 'Ketik bahagian ketika kereta itu <b class="ink">memecut</b> (bertambah laju).'),
        ans: [upS.i], tagOf: i => (sg[i].dy < 0 ? 'accel_decel_mixed' : 'vt_flat_misread'),
        hint: () => T('Speeding up means the speed is increasing.', 'Bertambah laju bermaksud laju semakin meningkat.'),
        work: () => T('In part ' + L(upS.i) + ' the speed goes up from ' + f(upS.y0) + ' to ' + f(upS.y1) + ' ' + u('ms') + '. Part ' + L(dn.i) + ' is slowing down (deceleration).', 'Dalam bahagian ' + L(upS.i) + ', laju meningkat dari ' + f(upS.y0) + ' kepada ' + f(upS.y1) + ' ' + u('ms') + '. Bahagian ' + L(dn.i) + ' pula semakin perlahan (nyahpecutan).')
      },
      {
        kind: 'pick', g: g2, letters: true, hi: [flat2.i], anim: { g: g2 },
        q: () => T('What is the car doing in part ' + L(flat2.i) + '?', 'Apakah yang dilakukan oleh kereta dalam bahagian ' + L(flat2.i) + '?'),
        opts: [
          { k: 'a', html: () => T('It is stationary', 'Kereta itu pegun'), tag: 'vt_flat_as_stationary' },
          { k: 'b', html: () => T('It moves at a uniform speed of ' + f(flat2.y0) + ' ' + u('ms'), 'Kereta bergerak dengan laju seragam ' + f(flat2.y0) + ' ' + u('ms')) },
          { k: 'c', html: () => T('It is accelerating uniformly', 'Kereta memecut secara seragam'), tag: 'vt_flat_misread' }
        ], ans: 'b',
        hint: () => T('Read the speed in part ' + L(flat2.i) + '. Is it 0?', 'Baca laju dalam bahagian ' + L(flat2.i) + '. Adakah lajunya 0?'),
        work: () => T('The speed stays at ' + f(flat2.y0) + ' ' + u('ms') + ', not 0, so the car is moving at a uniform speed.', 'Laju kekal ' + f(flat2.y0) + ' ' + u('ms') + ', bukan 0, jadi kereta bergerak dengan laju seragam.')
      }
    ];
  }
  function accelTask(g, i, extra) {
    const s = segsOf(g)[i], a = s.slope;
    const wrongs = [[r3(Math.abs(s.dt / s.dy)), 'accel_inverted'], [Math.abs(s.dy), 'read_speed_not_change'], [-a, a < 0 ? 'accel_sign' : 'calc_error']];
    if (s.t0 > 0) wrongs.push([r3(s.y1 / s.t1), 'used_coordinates_not_change']);
    return Object.assign({
      kind: 'num', grad: true, g, letters: true, hi: [i], anim: { g }, ans: a, unit: 'ms2', allowNeg: true, wrongs,
      q: () => T('Find the <b class="ink">rate of change of speed</b> in part ' + L(i) + ', in ' + u('ms2') + '.', 'Hitung <b class="ink">kadar perubahan laju</b> dalam bahagian ' + L(i) + ', dalam ' + u('ms2') + '.'),
      hint: () => T('Rate of change of speed = gradient = (final speed − initial speed) ÷ time taken.', 'Kadar perubahan laju = kecerunan = (laju akhir − laju awal) ÷ masa yang diambil.'),
      work: () => T('(' + f(s.y1) + ' − ' + f(s.y0) + ') ÷ (' + f(s.t1) + ' − ' + f(s.t0) + ') = ' + f(s.dy) + ' ÷ ' + f(s.dt) + ' = ' + f(a) + ' ' + u('ms2') + '.' + (a < 0 ? ' Negative: the car is decelerating.' : ''),
        '(' + f(s.y1) + ' − ' + f(s.y0) + ') ÷ (' + f(s.t1) + ' − ' + f(s.t0) + ') = ' + f(s.dy) + ' ÷ ' + f(s.dt) + ' = ' + f(a) + ' ' + u('ms2') + '.' + (a < 0 ? ' Negatif: kereta mengalami nyahpecutan.' : ''))
    }, extra || {});
  }
  function niceVT(pred) {
    for (let k = 0; k < 600; k++) {
      const g = vtJourney();
      if (segsOf(g).every(s => isNice(s.slope)) && (!pred || pred(g))) return g;
    }
    return grid('vt', 's', 'ms', 2, 4, [[0, 0], [2, 2], [4, 2], [5, 0]]);
  }
  function s4Accel() {
    const g1 = niceVT(g => g.pts[0][1] > 0 || true), sg1 = segsOf(g1);
    const g2 = niceVT(), dn = segsOf(g2).find(s => s.dy < 0);
    // find u: from v0, accelerating at a for t seconds
    let v0, a, t, uu;
    do { v0 = R(2, 8); a = R(1, 4); t = R(2, 5); uu = v0 + a * t; } while (uu > 24);
    const t2 = t + R(2, 4), T3 = t2 + R(2, 4);
    const g3 = { type: 'vt', tu: 's', yu: 'ms', tStep: 1, yStep: 1, pts: [[0, v0], [t, uu], [t2, uu], [T3, 0]], tMax: T3, yMax: Math.ceil(uu * 1.15) };
    return [
      accelTask(g1, sg1.find(s => s.dy > 0).i),
      accelTask(g2, dn.i),
      {
        kind: 'num', g: g3, schematic: { t: { [t]: f(t), [t2]: f(t2), [T3]: f(T3) }, y: { [v0]: f(v0), [uu]: 'u' } }, anim: { g: g3 },
        ans: uu, unit: 'ms', wrongs: [[a * t, 'ignored_initial_speed'], [r3((uu - v0) / t), 'calc_error']],
        q: () => T('The rate of change of speed in the first ' + f(t) + ' s is ' + f(a) + ' ' + u('ms2') + '. Find the value of <i>u</i>.', 'Kadar perubahan laju dalam ' + f(t) + ' s pertama ialah ' + f(a) + ' ' + u('ms2') + '. Hitung nilai <i>u</i>.'),
        hint: () => T('Write (u − ' + f(v0) + ') ÷ ' + f(t) + ' = ' + f(a) + ' and solve for u.', 'Tulis (u − ' + f(v0) + ') ÷ ' + f(t) + ' = ' + f(a) + ' dan selesaikan untuk u.'),
        work: () => T('(u − ' + f(v0) + ') ÷ ' + f(t) + ' = ' + f(a) + ', so u − ' + f(v0) + ' = ' + f(a * t) + ' and u = ' + f(uu) + '.', '(u − ' + f(v0) + ') ÷ ' + f(t) + ' = ' + f(a) + ', maka u − ' + f(v0) + ' = ' + f(a * t) + ' dan u = ' + f(uu) + '.')
      }
    ];
  }
  function s4Draw() {
    const who = pick(NAMES);
    const a = R(1, 2), top = pick([2, 4]), s = R(1, 2), b = R(1, 2);      // top divides by a and b: every point is on the grid
    const g1 = grid('vt', 's', 'ms', 2, 4, [[0, 0], [a, top], [a + s, top], [a + s + b, 0]]);
    const v0 = 1, acc = 1, ta = R(2, 3), s2 = 1, top2 = v0 + acc * ta;
    const g2 = grid('vt', 's', 'ms', 2, 4, [[0, v0], [ta, top2], [ta + s2, top2], [ta + s2 + top2 / (top2 % 2 ? 1 : 2), 0]]);
    const dec2 = top2 * 4 / ((g2.pts[3][0] - g2.pts[2][0]));
    return [
      drawTask(g1, () => T(who + '’s car starts from rest and speeds up uniformly to ' + f(top * 4) + ' ' + u('ms') + ' in ' + f(a * 2) + ' s. It keeps that speed for ' + f(s * 2) + ' s, then slows down uniformly and stops ' + f(b * 2) + ' s later. Draw the speed–time graph.',
        'Kereta ' + who + ' bermula dari pegun dan memecut secara seragam hingga ' + f(top * 4) + ' ' + u('ms') + ' dalam masa ' + f(a * 2) + ' s. Kereta itu mengekalkan laju tersebut selama ' + f(s * 2) + ' s, kemudian nyahpecut secara seragam dan berhenti ' + f(b * 2) + ' s kemudian. Lukis graf laju-masa.'),
        { anim: { g: g1 }, fixed: { 0: 0 }, hint: () => T('Start at 0 (from rest). Where is the speed after ' + f(a * 2) + ' s?', 'Mula pada 0 (dari pegun). Berapakah laju selepas ' + f(a * 2) + ' s?') }),
      drawTask(g2, () => T('A bus moving at ' + f(v0 * 4) + ' ' + u('ms') + ' accelerates at ' + f(acc * 2) + ' ' + u('ms2') + ' for ' + f(ta * 2) + ' s, moves at a uniform speed for ' + f(s2 * 2) + ' s, then decelerates at ' + f(dec2) + ' ' + u('ms2') + ' until it stops. Draw the speed–time graph.',
        'Sebuah bas yang bergerak dengan laju ' + f(v0 * 4) + ' ' + u('ms') + ' memecut ' + f(acc * 2) + ' ' + u('ms2') + ' selama ' + f(ta * 2) + ' s, bergerak dengan laju seragam selama ' + f(s2 * 2) + ' s, kemudian nyahpecut ' + f(dec2) + ' ' + u('ms2') + ' hingga berhenti. Lukis graf laju-masa.'),
        { anim: { g: g2 }, fixed: { 0: v0 * 4 }, hint: () => T('Speed after ' + f(ta * 2) + ' s = ' + f(v0 * 4) + ' + ' + f(acc * 2) + ' × ' + f(ta * 2) + '.', 'Laju selepas ' + f(ta * 2) + ' s = ' + f(v0 * 4) + ' + ' + f(acc * 2) + ' × ' + f(ta * 2) + '.') })
    ];
  }

  /* ============================================================
     STAGE 5 · Jarak Tersembunyi — area under a speed–time graph
     ============================================================ */
  /** SPM-style axes: only the corner values are labelled. */
  function autoSch(pts) {
    const t = {}, y = {};
    pts.forEach(p => { if (p[0] > 0) t[p[0]] = f(p[0]); if (p[1] > 0) y[p[1]] = f(p[1]); });
    return { t, y };
  }
  const areaG = (pts, ts, ys) => { const tMax = pts[pts.length - 1][0], yMax = Math.max(...pts.map(p => p[1])); return { type: 'vt', tu: 's', yu: 'ms', tStep: ts, yStep: ys, pts, tMax, yMax: Math.ceil(yMax * 1.15), schematic: autoSch(pts) }; };
  function shadeTask(g, pieces, dist, wrongs, qen, qbm, work) {
    return {
      kind: 'shade', g, pieces, ans: dist, unit: 'm', wrongs, anim: { g },
      q: () => T(qen, qbm),
      hint: () => T('Distance = area under the speed–time graph. Which shape is the region?', 'Jarak = luas di bawah graf laju-masa. Apakah bentuk kawasan itu?'),
      work
    };
  }
  function s5Shade() {
    const v = pick([8, 10, 12, 16, 20]), t1 = pick([2, 4, 6]), t2 = t1 + pick([2, 4]), T3 = t2 + pick([2, 4]);
    const g1 = areaG([[0, 0], [t1, v], [t2, v], [T3, 0]], 2, 4);
    const tri = v * t1 / 2, rect = v * (t2 - t1);
    const uu = pick([4, 8]), vv = uu + pick([4, 8]), tt = pick([2, 4, 6]), t3b = tt + pick([2, 4]);
    const g3 = areaG([[0, uu], [tt, vv], [t3b, 0]], 2, 4);
    const trap = (uu + vv) / 2 * tt;
    return [
      shadeTask(g1, [0], tri, [[v * t1, 'triangle_no_half'], [v, 'read_speed_as_distance']],
        'Shade the region that shows the distance travelled in the first ' + f(t1) + ' s, then find that distance.',
        'Lorekkan kawasan yang mewakili jarak yang dilalui dalam ' + f(t1) + ' s pertama, kemudian hitung jarak itu.',
        () => T('Triangle: ½ × ' + f(t1) + ' × ' + f(v) + ' = ' + f(tri) + ' m.', 'Segi tiga: ½ × ' + f(t1) + ' × ' + f(v) + ' = ' + f(tri) + ' m.')),
      shadeTask(g1, [1], rect, [[v * t2, 'used_coordinates_not_change'], [v, 'read_speed_as_distance'], [rect / 2, 'calc_error']],
        'Shade the region for the time the car moves at a uniform speed, then find the distance travelled in that time.',
        'Lorekkan kawasan bagi tempoh kereta bergerak dengan laju seragam, kemudian hitung jarak yang dilalui dalam tempoh itu.',
        () => T('Rectangle: (' + f(t2) + ' − ' + f(t1) + ') × ' + f(v) + ' = ' + f(rect) + ' m.', 'Segi empat tepat: (' + f(t2) + ' − ' + f(t1) + ') × ' + f(v) + ' = ' + f(rect) + ' m.')),
      shadeTask(g3, [0], trap, [[vv * tt, 'trapezium_as_rectangle'], [vv * tt / 2, 'trapezium_as_triangle'], [uu * tt, 'trapezium_as_rectangle']],
        'Shade the region for the first ' + f(tt) + ' s, then find the distance travelled.',
        'Lorekkan kawasan bagi ' + f(tt) + ' s pertama, kemudian hitung jarak yang dilalui.',
        () => T('Trapezium: ½ × (' + f(uu) + ' + ' + f(vv) + ') × ' + f(tt) + ' = ' + f(trap) + ' m.', 'Trapezium: ½ × (' + f(uu) + ' + ' + f(vv) + ') × ' + f(tt) + ' = ' + f(trap) + ' m.'))
    ];
  }
  function s5Total() {
    const tasks = [];
    for (let k = 0; k < 400; k++) {
      const v = pick([10, 12, 15, 16, 20, 24]), t1 = pick([2, 4, 5, 6]), t2 = t1 + pick([4, 5, 6, 8]), T3 = t2 + pick([2, 3, 4, 5]);
      const D = v * t1 / 2 + v * (t2 - t1) + v * (T3 - t2) / 2, avg = r3(D / T3);
      if (!Number.isInteger(D) || !isNice(avg)) continue;
      const g = { type: 'vt', tu: 's', yu: 'ms', tStep: 1, yStep: 1, pts: [[0, 0], [t1, v], [t2, v], [T3, 0]], tMax: T3, yMax: Math.ceil(v * 1.15) };
      const sch = { t: { [t1]: f(t1), [t2]: f(t2), [T3]: f(T3) }, y: { [v]: f(v) } };
      tasks.push({
        kind: 'num', g, schematic: sch, anim: { g }, ans: D, unit: 'm', wrongs: [[v * T3, 'triangle_no_half'], [v * t2, 'triangle_no_half'], [v, 'read_speed_as_distance']],
        q: () => T('Find the <b class="ink">total distance</b> travelled in ' + f(T3) + ' s.', 'Hitung <b class="ink">jumlah jarak</b> yang dilalui dalam ' + f(T3) + ' s.'),
        hint: () => T('Split the area into a triangle, a rectangle and a triangle — or use one trapezium.', 'Bahagikan luas kepada segi tiga, segi empat tepat dan segi tiga — atau gunakan satu trapezium.'),
        work: () => T('½(' + f(t1) + ')(' + f(v) + ') + (' + f(t2 - t1) + ')(' + f(v) + ') + ½(' + f(T3 - t2) + ')(' + f(v) + ') = ' + f(D) + ' m. Or trapezium: ½ × (' + f(t2 - t1) + ' + ' + f(T3) + ') × ' + f(v) + ' = ' + f(D) + ' m.',
          '½(' + f(t1) + ')(' + f(v) + ') + (' + f(t2 - t1) + ')(' + f(v) + ') + ½(' + f(T3 - t2) + ')(' + f(v) + ') = ' + f(D) + ' m. Atau trapezium: ½ × (' + f(t2 - t1) + ' + ' + f(T3) + ') × ' + f(v) + ' = ' + f(D) + ' m.')
      });
      tasks.push({
        kind: 'num', g, schematic: sch, anim: { g }, ans: avg, unit: 'ms', wrongs: [[r3(v / 2), 'mean_of_speeds'], [r3(v * 2 / 3), 'mean_of_speeds'], [v, 'mean_of_speeds']],
        q: () => T('Find the <b class="ink">average speed</b> for the whole ' + f(T3) + ' s.', 'Hitung <b class="ink">laju purata</b> bagi keseluruhan ' + f(T3) + ' s.'),
        hint: () => T('Average speed = total distance ÷ total time. The total distance is the whole area.', 'Laju purata = jumlah jarak ÷ jumlah masa. Jumlah jarak ialah keseluruhan luas.'),
        work: () => T('Total distance = ' + f(D) + ' m. Average speed = ' + f(D) + ' ÷ ' + f(T3) + ' = ' + f(avg) + ' ' + u('ms') + '.', 'Jumlah jarak = ' + f(D) + ' m. Laju purata = ' + f(D) + ' ÷ ' + f(T3) + ' = ' + f(avg) + ' ' + u('ms') + '.')
      });
      break;
    }
    for (let k = 0; k < 400; k++) {
      const v1 = pick([6, 8, 10, 12]), v2 = v1 + pick([4, 6, 8]), t1 = pick([2, 3, 4]), t2 = t1 + pick([2, 4]), t3 = t2 + pick([3, 4, 5]), T4 = t3 + pick([2, 4]);
      const D = (v1 + v2) / 2 * (t2 - t1) + v2 * (t3 - t2);
      if (!Number.isInteger(D)) continue;
      const g = { type: 'vt', tu: 's', yu: 'ms', tStep: 1, yStep: 1, pts: [[0, 0], [t1, v1], [t2, v2], [t3, v2], [T4, 0]], tMax: T4, yMax: Math.ceil(v2 * 1.15) };
      tasks.push({
        kind: 'num', g, schematic: { t: { [t1]: f(t1), [t2]: f(t2), [t3]: f(t3), [T4]: f(T4) }, y: { [v1]: f(v1), [v2]: f(v2) } }, anim: { g }, ans: D, unit: 'm',
        wrongs: [[v2 * (t3 - t1), 'trapezium_as_rectangle'], [v2 * (t2 - t1) / 2 + v2 * (t3 - t2), 'trapezium_as_triangle']],
        q: () => T('Find the distance travelled from t = ' + f(t1) + ' s to t = ' + f(t3) + ' s.', 'Hitung jarak yang dilalui dari t = ' + f(t1) + ' s hingga t = ' + f(t3) + ' s.'),
        hint: () => T('That region is a trapezium followed by a rectangle.', 'Kawasan itu terdiri daripada sebuah trapezium diikuti sebuah segi empat tepat.'),
        work: () => T('½(' + f(v1) + ' + ' + f(v2) + ')(' + f(t2 - t1) + ') + (' + f(t3 - t2) + ')(' + f(v2) + ') = ' + f(D) + ' m.', '½(' + f(v1) + ' + ' + f(v2) + ')(' + f(t2 - t1) + ') + (' + f(t3 - t2) + ')(' + f(v2) + ') = ' + f(D) + ' m.')
      });
      break;
    }
    return tasks;
  }
  function s5Unknown() {
    const tasks = [];
    // a) find T
    {
      const v = pick([10, 12, 15, 20]), t1 = pick([4, 6, 8]), k = R(5, 12), Tn = t1 + k, D = v * t1 / 2 + v * k;
      const g = { type: 'vt', tu: 's', yu: 'ms', tStep: 1, yStep: 1, pts: [[0, 0], [t1, v], [Tn, v]], tMax: Tn, yMax: Math.ceil(v * 1.2) };
      tasks.push({
        kind: 'num', g, schematic: { t: { [t1]: f(t1), [Tn]: 'T' }, y: { [v]: f(v) } }, anim: { g }, ans: Tn, unit: 's',
        wrongs: [[k, 'answered_interval_not_time'], [r3(D / v), 'area_formula']],
        q: () => T('The total distance travelled in <i>T</i> seconds is ' + f(D) + ' m. Find the value of <i>T</i>.', 'Jumlah jarak yang dilalui dalam <i>T</i> saat ialah ' + f(D) + ' m. Hitung nilai <i>T</i>.'),
        hint: () => T('Area of triangle + area of rectangle = ' + f(D) + '. The rectangle is (T − ' + f(t1) + ') wide.', 'Luas segi tiga + luas segi empat tepat = ' + f(D) + '. Lebar segi empat tepat ialah (T − ' + f(t1) + ').'),
        work: () => T('½(' + f(t1) + ')(' + f(v) + ') + ' + f(v) + '(T − ' + f(t1) + ') = ' + f(D) + ' → ' + f(v * t1 / 2) + ' + ' + f(v) + 'T − ' + f(v * t1) + ' = ' + f(D) + ' → ' + f(v) + 'T = ' + f(D + v * t1 / 2) + ' → T = ' + f(Tn) + '.',
          '½(' + f(t1) + ')(' + f(v) + ') + ' + f(v) + '(T − ' + f(t1) + ') = ' + f(D) + ' → ' + f(v * t1 / 2) + ' + ' + f(v) + 'T − ' + f(v * t1) + ' = ' + f(D) + ' → ' + f(v) + 'T = ' + f(D + v * t1 / 2) + ' → T = ' + f(Tn) + '.')
      });
    }
    // b) find u
    for (let k = 0; k < 400; k++) {
      const uu = R(2, 10), v = uu + R(2, 10), t1 = pick([2, 4, 5, 6, 8]), S = (uu + v) / 2 * t1, T2 = t1 + R(2, 5);
      if (!Number.isInteger(S) || v > 24) continue;
      const g = { type: 'vt', tu: 's', yu: 'ms', tStep: 1, yStep: 1, pts: [[0, uu], [t1, v], [T2, 0]], tMax: T2, yMax: Math.ceil(v * 1.2) };
      tasks.push({
        kind: 'num', g, schematic: { t: { [t1]: f(t1), [T2]: f(T2) }, y: { [uu]: 'u', [v]: f(v) } }, anim: { g }, ans: uu, unit: 'ms',
        wrongs: [[r3(2 * S / t1), 'trapezium_as_triangle'], [r3(S / t1), 'calc_error']],
        q: () => T('The distance travelled in the first ' + f(t1) + ' s is ' + f(S) + ' m. Find the value of <i>u</i>.', 'Jarak yang dilalui dalam ' + f(t1) + ' s pertama ialah ' + f(S) + ' m. Hitung nilai <i>u</i>.'),
        hint: () => T('The region is a trapezium: ½ × (u + ' + f(v) + ') × ' + f(t1) + ' = ' + f(S) + '.', 'Kawasan itu ialah trapezium: ½ × (u + ' + f(v) + ') × ' + f(t1) + ' = ' + f(S) + '.'),
        work: () => T('½(u + ' + f(v) + ')(' + f(t1) + ') = ' + f(S) + ' → u + ' + f(v) + ' = ' + f(2 * S / t1) + ' → u = ' + f(uu) + '.', '½(u + ' + f(v) + ')(' + f(t1) + ') = ' + f(S) + ' → u + ' + f(v) + ' = ' + f(2 * S / t1) + ' → u = ' + f(uu) + '.')
      });
      break;
    }
    // c) find v
    for (let k = 0; k < 400; k++) {
      const v = R(6, 20), t1 = R(2, 5), t2 = t1 + R(3, 8), Tn = t2 + R(2, 5), D = v * (Tn + t2 - t1) / 2;
      if (!Number.isInteger(D)) continue;
      const g = { type: 'vt', tu: 's', yu: 'ms', tStep: 1, yStep: 1, pts: [[0, 0], [t1, v], [t2, v], [Tn, 0]], tMax: Tn, yMax: Math.ceil(v * 1.2) };
      tasks.push({
        kind: 'num', g, schematic: { t: { [t1]: f(t1), [t2]: f(t2), [Tn]: f(Tn) }, y: { [v]: 'v' } }, anim: { g }, ans: v, unit: 'ms',
        wrongs: [[r3(D / Tn), 'area_formula'], [r3(D / (t2 - t1)), 'area_formula'], [r3(2 * D / Tn), 'area_formula']],
        q: () => T('The total distance travelled is ' + f(D) + ' m. Find the value of <i>v</i>.', 'Jumlah jarak yang dilalui ialah ' + f(D) + ' m. Hitung nilai <i>v</i>.'),
        hint: () => T('The whole region is a trapezium with parallel sides ' + f(t2 - t1) + ' and ' + f(Tn) + ', and height v.', 'Keseluruhan kawasan ialah trapezium dengan sisi selari ' + f(t2 - t1) + ' dan ' + f(Tn) + ', dan tinggi v.'),
        work: () => T('½ × (' + f(t2 - t1) + ' + ' + f(Tn) + ') × v = ' + f(D) + ' → ' + f((Tn + t2 - t1) / 2) + 'v = ' + f(D) + ' → v = ' + f(v) + '.', '½ × (' + f(t2 - t1) + ' + ' + f(Tn) + ') × v = ' + f(D) + ' → ' + f((Tn + t2 - t1) / 2) + 'v = ' + f(D) + ' → v = ' + f(v) + '.')
      });
      break;
    }
    return tasks;
  }

  /* ============================================================
     STAGE 6 · Perlumbaan Akhir — races with mixed questions
     ============================================================ */
  const noShade = t => (t.kind === 'shade' ? Object.assign({}, t, { kind: 'num', shadeShow: t.pieces }) : t);
  function race(pools, n) {
    const all = [];
    pools.forEach(p => all.push(...p().filter(t => t.kind !== 'draw').map(noShade)));
    return shuffle(all).slice(0, n);
  }

  /* ============================================================
     The stages, their levels and their end-of-level quick checks
     ============================================================ */
  const qc = (q, opts, ans, why) => ({ q, opts, ans, why });
  const STAGES = [
    {
      n: 1, c: '--blue', icon: '🏁', name: ['Starting Line', 'Garisan Mula'], topic: ['Reading distance–time graphs', 'Membaca graf jarak-masa'],
      levels: [
        { title: ['Watch and match', 'Tonton dan padan'], target: 90, make: s1Match,
          check: qc(['On a distance–time graph, a horizontal line means the object is…', 'Pada graf jarak-masa, garis mengufuk bermaksud objek itu…'],
            [['a', ['moving at a uniform speed', 'bergerak dengan laju seragam']], ['b', ['stationary', 'pegun']], ['c', ['moving back to the start', 'bergerak balik ke titik mula']]], 'b',
            ['The distance does not change, so it is not moving.', 'Jarak tidak berubah, jadi objek itu tidak bergerak.']) },
        { title: ['Read the graph', 'Baca graf'], target: 90, make: s1Read,
          check: qc(['On a distance–time graph, a line going down means the object is…', 'Pada graf jarak-masa, garis yang menurun bermaksud objek itu…'],
            [['a', ['slowing down', 'semakin perlahan']], ['b', ['going downhill', 'menuruni bukit']], ['c', ['moving back towards the start', 'bergerak balik ke arah titik mula']]], 'c',
            ['Its distance from the start is getting smaller.', 'Jaraknya dari titik mula semakin berkurang.']) },
        { title: ['Story to graph', 'Cerita ke graf'], target: 150, make: s1Story,
          check: qc(['A car climbs a hill at a uniform speed. Its distance–time graph is…', 'Sebuah kereta mendaki bukit dengan laju seragam. Graf jarak-masanya ialah…'],
            [['a', ['shaped like the hill', 'berbentuk seperti bukit']], ['b', ['a straight line going up', 'garis lurus yang menaik']], ['c', ['a flat line', 'garis mendatar']]], 'b',
            ['The graph shows distance, not height, and uniform speed gives a straight line.', 'Graf menunjukkan jarak, bukan ketinggian, dan laju seragam menghasilkan garis lurus.']) }
      ],
      discover: {
        opts: [['a', ['A distance–time graph is a picture of the road the object travels on.', 'Graf jarak-masa ialah gambar jalan yang dilalui oleh objek.']],
          ['b', ['A distance–time graph shows how far the object is from the start at each moment: up = moving away, flat = stationary, down = coming back.', 'Graf jarak-masa menunjukkan jarak objek dari titik mula pada setiap masa: naik = bergerak menjauh, mendatar = pegun, turun = bergerak balik.']],
          ['c', ['A steeper line means the object is further away.', 'Garis yang lebih curam bermaksud objek berada lebih jauh.']]], ans: 'b',
        terms: [['Distance–time graph', 'Graf jarak-masa', 'A graph of distance from a fixed point (vertical axis) against time (horizontal axis).', 'Graf jarak dari satu titik tetap (paksi mencancang) melawan masa (paksi mengufuk).'],
          ['Stationary', 'Pegun', 'Not moving. On a distance–time graph, a horizontal line.', 'Tidak bergerak. Pada graf jarak-masa, garis mengufuk.']]
      }
    },
    {
      n: 2, c: '--yellow', icon: '⏱️', name: ['Steady Speed', 'Laju Stabil'], topic: ['Gradient and average speed', 'Kecerunan dan laju purata'],
      levels: [
        { title: ['Find the speed', 'Kira laju'], target: 120, make: s2Speed,
          check: qc(['The gradient of a distance–time graph gives the…', 'Kecerunan graf jarak-masa memberikan…'],
            [['a', ['speed', 'laju']], ['b', ['distance', 'jarak']], ['c', ['time taken', 'masa yang diambil']]], 'a',
            ['Gradient = change in distance ÷ change in time = speed.', 'Kecerunan = perubahan jarak ÷ perubahan masa = laju.']) },
        { title: ['Fastest part', 'Bahagian paling laju'], target: 120, make: s2Fastest,
          check: qc(['Two parts of a distance–time graph cover the same distance. The steeper part is…', 'Dua bahagian graf jarak-masa merentasi jarak yang sama. Bahagian yang lebih curam…'],
            [['a', ['slower', 'lebih perlahan']], ['b', ['faster', 'lebih laju']], ['c', ['the same speed', 'sama laju']]], 'b',
            ['Steeper means the same distance in less time: faster.', 'Lebih curam bermaksud jarak yang sama dalam masa yang lebih singkat, iaitu lebih laju.']) },
        { title: ['Average speed', 'Laju purata'], target: 180, make: s2Average,
          check: qc(['Average speed for a whole journey =', 'Laju purata bagi seluruh perjalanan ='],
            [['a', ['the mean of all the speeds', 'min bagi semua laju']], ['b', ['total distance ÷ total time', 'jumlah jarak ÷ jumlah masa']], ['c', ['total distance ÷ time spent moving', 'jumlah jarak ÷ masa semasa bergerak']]], 'b',
            ['Every minute counts, including the stops.', 'Setiap minit dikira, termasuk masa berhenti.']) }
      ],
      discover: {
        opts: [['a', ['The speed is the height of the line on a distance–time graph.', 'Laju ialah ketinggian garis pada graf jarak-masa.']],
          ['b', ['The speed is the gradient of a distance–time graph, and average speed is total distance ÷ total time.', 'Laju ialah kecerunan graf jarak-masa, dan laju purata ialah jumlah jarak ÷ jumlah masa.']],
          ['c', ['Average speed is the mean of the speeds in each part.', 'Laju purata ialah min bagi laju dalam setiap bahagian.']]], ans: 'b',
        terms: [['Speed', 'Laju', 'Rate of change of distance: the gradient of a distance–time graph.', 'Kadar perubahan jarak: kecerunan graf jarak-masa.'],
          ['Uniform speed', 'Laju seragam', 'Speed that does not change: a straight sloping line on a distance–time graph.', 'Laju yang tidak berubah: garis lurus condong pada graf jarak-masa.'],
          ['Average speed', 'Laju purata', 'Total distance ÷ total time.', 'Jumlah jarak ÷ jumlah masa.']]
      }
    },
    {
      n: 3, c: '--orange', icon: '✏️', name: ['Draw It Yourself', 'Lukis Sendiri'], topic: ['Drawing distance–time graphs', 'Melukis graf jarak-masa'],
      levels: [
        { title: ['From a table', 'Daripada jadual'], target: 150, make: s3Table,
          check: qc(['In a table, the distance stays at 40 m from t = 3 s to t = 5 s. On the graph that part is…', 'Dalam jadual, jarak kekal 40 m dari t = 3 s hingga t = 5 s. Pada graf, bahagian itu…'],
            [['a', ['a horizontal line', 'garis mengufuk']], ['b', ['a vertical line', 'garis mencancang']], ['c', ['a line going down', 'garis menurun']]], 'a',
            ['Same distance, time passing: a horizontal line.', 'Jarak sama semasa masa berlalu: garis mengufuk.']) },
        { title: ['From a story', 'Daripada cerita'], target: 180, make: s3Story,
          check: qc(['A car travels at a uniform speed. The points on its distance–time graph…', 'Sebuah kereta bergerak dengan laju seragam. Titik-titik pada graf jarak-masanya…'],
            [['a', ['lie on a straight line', 'terletak pada satu garis lurus']], ['b', ['make a curve', 'membentuk lengkung']], ['c', ['are all at the same height', 'semuanya pada ketinggian yang sama']]], 'a',
            ['Uniform speed: the same distance every unit of time, so a straight line.', 'Laju seragam: jarak yang sama bagi setiap unit masa, jadi garis lurus.']) },
        { title: ['From speeds', 'Daripada laju'], target: 180, make: s3Speeds,
          check: qc(['Something moves at 20 m s⁻¹ for 3 s. How far does it go?', 'Sesuatu objek bergerak dengan laju 20 m s⁻¹ selama 3 s. Berapa jauhkah ia bergerak?'],
            [['a', ['23 m', '23 m']], ['b', ['60 m', '60 m']], ['c', ['6.7 m', '6.7 m']]], 'b',
            ['Distance = speed × time = 20 × 3 = 60 m.', 'Jarak = laju × masa = 20 × 3 = 60 m.']) }
      ],
      discover: {
        opts: [['a', ['To draw a distance–time graph, plot the distance at each time. Uniform speed gives a straight line, stopping gives a horizontal line, coming back gives a line going down.', 'Untuk melukis graf jarak-masa, plot jarak pada setiap masa. Laju seragam menghasilkan garis lurus, berhenti menghasilkan garis mengufuk, dan bergerak balik menghasilkan garis menurun.']],
          ['b', ['To draw a distance–time graph, draw the shape of the route.', 'Untuk melukis graf jarak-masa, lukis bentuk laluan.']],
          ['c', ['A faster object always gives a longer line.', 'Objek yang lebih laju sentiasa menghasilkan garis yang lebih panjang.']]], ans: 'a',
        terms: [['Gradient', 'Kecerunan', 'How steep a line is: vertical change ÷ horizontal change.', 'Kecuraman garis: perubahan mencancang ÷ perubahan mengufuk.']]
      }
    },
    {
      n: 4, c: '--green', icon: '🚀', name: ['Speed Up!', 'Pecut!'], topic: ['Speed–time graphs and acceleration', 'Graf laju-masa dan pecutan'],
      levels: [
        { title: ['What is it doing?', 'Apa yang berlaku?'], target: 90, make: s4Shape,
          check: qc(['On a speed–time graph, a horizontal line above zero means…', 'Pada graf laju-masa, garis mengufuk di atas sifar bermaksud…'],
            [['a', ['stationary', 'pegun']], ['b', ['uniform speed', 'laju seragam']], ['c', ['uniform acceleration', 'pecutan seragam']]], 'b',
            ['The speed stays the same, so it moves at a uniform speed.', 'Laju tidak berubah, jadi objek bergerak dengan laju seragam.']) },
        { title: ['Rate of change of speed', 'Kadar perubahan laju'], target: 180, make: s4Accel,
          check: qc(['The gradient of a speed–time graph gives the…', 'Kecerunan graf laju-masa memberikan…'],
            [['a', ['distance travelled', 'jarak yang dilalui']], ['b', ['rate of change of speed', 'kadar perubahan laju']], ['c', ['average speed', 'laju purata']]], 'b',
            ['Gradient = change in speed ÷ time = rate of change of speed (acceleration).', 'Kecerunan = perubahan laju ÷ masa = kadar perubahan laju (pecutan).']) },
        { title: ['Draw a speed–time graph', 'Lukis graf laju-masa'], target: 200, make: s4Draw,
          check: qc(['A car decelerates uniformly until it stops. On a speed–time graph that part is…', 'Sebuah kereta nyahpecut secara seragam hingga berhenti. Pada graf laju-masa, bahagian itu…'],
            [['a', ['a straight line down to zero', 'garis lurus menurun hingga sifar']], ['b', ['a horizontal line', 'garis mengufuk']], ['c', ['a line going up', 'garis menaik']]], 'a',
            ['The speed decreases steadily to 0.', 'Laju berkurang secara seragam hingga 0.']) }
      ],
      discover: {
        opts: [['a', ['A speed–time graph looks the same as a distance–time graph for the same journey.', 'Graf laju-masa kelihatan sama dengan graf jarak-masa bagi perjalanan yang sama.']],
          ['b', ['On a speed–time graph, flat = uniform speed, up = accelerating, down = decelerating, and the gradient is the rate of change of speed.', 'Pada graf laju-masa, mendatar = laju seragam, naik = memecut, turun = nyahpecutan, dan kecerunan ialah kadar perubahan laju.']],
          ['c', ['On a speed–time graph, a flat line means stationary.', 'Pada graf laju-masa, garis mendatar bermaksud pegun.']]], ans: 'b',
        terms: [['Speed–time graph', 'Graf laju-masa', 'A graph of speed (vertical axis) against time (horizontal axis).', 'Graf laju (paksi mencancang) melawan masa (paksi mengufuk).'],
          ['Acceleration', 'Pecutan', 'Speed increasing: a positive rate of change of speed.', 'Laju bertambah: kadar perubahan laju yang positif.'],
          ['Deceleration', 'Nyahpecutan', 'Speed decreasing: a negative rate of change of speed.', 'Laju berkurang: kadar perubahan laju yang negatif.']]
      }
    },
    {
      n: 5, c: '--terra', icon: '📐', name: ['Hidden Distance', 'Jarak Tersembunyi'], topic: ['Area under a speed–time graph', 'Luas di bawah graf laju-masa'],
      levels: [
        { title: ['Shade the distance', 'Lorek jarak'], target: 180, make: s5Shade,
          check: qc(['On a speed–time graph, the distance travelled is the…', 'Pada graf laju-masa, jarak yang dilalui ialah…'],
            [['a', ['gradient of the graph', 'kecerunan graf']], ['b', ['highest speed', 'laju paling tinggi']], ['c', ['area under the graph', 'luas di bawah graf']]], 'c',
            ['Speed × time = distance, which is the area under the graph.', 'Laju × masa = jarak, iaitu luas di bawah graf.']) },
        { title: ['Total distance', 'Jumlah jarak'], target: 200, make: s5Total,
          check: qc(['A car speeds up from 0 to 10 m s⁻¹ in 4 s. The distance travelled is…', 'Sebuah kereta memecut dari 0 hingga 10 m s⁻¹ dalam 4 s. Jarak yang dilalui ialah…'],
            [['a', ['40 m', '40 m']], ['b', ['20 m', '20 m']], ['c', ['2.5 m', '2.5 m']]], 'b',
            ['A triangle: ½ × 4 × 10 = 20 m.', 'Segi tiga: ½ × 4 × 10 = 20 m.']) },
        { title: ['Find the unknown', 'Cari nilai anu'], target: 240, make: s5Unknown,
          check: qc(['The total distance is given and the graph has an unknown T. The first step is to…', 'Jumlah jarak diberi dan graf mempunyai anu T. Langkah pertama ialah…'],
            [['a', ['write the area under the graph in terms of T and make it equal to the distance', 'tulis luas di bawah graf dalam sebutan T dan samakan dengan jarak']], ['b', ['divide the distance by the speed', 'bahagikan jarak dengan laju']], ['c', ['find the gradient', 'cari kecerunan']]], 'a',
            ['Area = distance gives an equation, and then you solve it.', 'Luas = jarak memberikan satu persamaan, kemudian selesaikannya.']) }
      ],
      discover: {
        opts: [['a', ['The distance travelled is the highest speed × the total time.', 'Jarak yang dilalui ialah laju paling tinggi × jumlah masa.']],
          ['b', ['The distance travelled is the area under the speed–time graph: add up triangles, rectangles and trapeziums.', 'Jarak yang dilalui ialah luas di bawah graf laju-masa: jumlahkan luas segi tiga, segi empat tepat dan trapezium.']],
          ['c', ['The distance travelled is the gradient of the speed–time graph.', 'Jarak yang dilalui ialah kecerunan graf laju-masa.']]], ans: 'b',
        terms: [['Area under a speed–time graph', 'Luas di bawah graf laju-masa', 'The distance travelled in that time.', 'Jarak yang dilalui dalam tempoh masa itu.']]
      }
    },
    {
      n: 6, c: '--blue', icon: '🏆', name: ['Final Race', 'Perlumbaan Akhir'], topic: ['Mixed problems against the clock', 'Soalan campuran menentang masa'],
      levels: [
        { title: ['Distance–time race', 'Perlumbaan jarak-masa'], target: 150, race: 5, make: () => race([s1Read, s2Speed, s2Fastest, s2Average], 5) },
        { title: ['Speed–time race', 'Perlumbaan laju-masa'], target: 160, race: 5, make: () => race([s4Shape, s4Accel, s5Shade, s5Total], 5) },
        { title: ['Grand Prix', 'Grand Prix'], target: 200, race: 6, make: () => race([s1Story, s2Average, s4Accel, s5Total, s5Unknown], 6) }
      ]
    }
  ];

  const api = { STAGES, MISTAKES, _gen: { s1Match, s1Read, s1Story, s2Speed, s2Fastest, s2Average, s3Table, s3Story, s3Speeds, s4Shape, s4Accel, s4Draw, s5Shade, s5Total, s5Unknown } };
  root.MQ = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

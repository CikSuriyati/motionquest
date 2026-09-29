/**
 * MOTION QUEST — the motion engine
 * ------------------------------------------------------------------
 * A motion graph is a list of corner points joined by straight lines:
 *
 *   { type: 'dt' | 'vt',          distance–time or speed–time
 *     pts: [[t, y], ...],          the corners, in time order
 *     tMax, yMax, tStep, yStep,    the axes
 *     tu: 's' | 'min' | 'h',       time unit
 *     yu: 'm' | 'km' | 'ms' | 'kmh' }
 *
 * It draws graphs (plot), the road with the car (track), plays the car
 * along a graph (animate), and gives the drag-the-points drawing board
 * (editor). It never decides right or wrong — stages.js does that.
 *
 * Uses the shell's T() at call time for labels.
 */
(function (root) {
  'use strict';

  const INK = '#17130c', SOFT = '#8d867e', LINE = '#eae4e1', ORANGE = '#ee6c34', BLUE = '#7ca3f9', YELLOW = '#ffd54a', GREEN = '#a2dd70';
  const LETTERS = 'ABCDEFGHIJ';
  /* base.css sets svg path { fill: none }, so filled paths carry their fill as a style. */
  const solid = s => s.replace(/<path([^>]*?) fill="([^"]+)"/g, '<path$1 style="fill:$2"');

  /* ---------- numbers and units ---------- */
  const near = (a, b, tol) => Math.abs(a - b) <= (tol == null ? 1e-6 : tol);
  function fmt(x) {
    if (typeof x !== 'number') return String(x);
    const r = Math.round(x * 100) / 100;
    return String(r).replace('-', '−');
  }
  const Tx = (en, bm) => (root.T ? root.T(en, bm) : bm);
  const UNIT = {
    s: () => 's', min: () => 'min', h: () => Tx('h', 'j'),
    m: () => 'm', km: () => 'km',
    ms: () => 'm s⁻¹', kmh: () => Tx('km h⁻¹', 'km j⁻¹'), mmin: () => 'm min⁻¹', ms2: () => 'm s⁻²'
  };
  const unit = k => (UNIT[k] ? UNIT[k]() : k);
  /** The unit of a graph's gradient: distance/time → speed, speed/time → acceleration. */
  function slopeUnit(g) {
    if (g.type === 'dt') return g.yu === 'km' && g.tu === 'h' ? 'kmh' : g.yu === 'm' && g.tu === 's' ? 'ms' : g.yu === 'm' && g.tu === 'min' ? 'mmin' : g.yu + '/' + g.tu;
    return 'ms2';
  }
  /** The unit of the area under a speed–time graph. */
  const areaUnit = g => (g.yu === 'kmh' ? 'km' : 'm');

  /* ---------- the maths of a piecewise-linear graph ---------- */
  function at(pts, t) {
    if (t <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) {
      const [t0, y0] = pts[i - 1], [t1, y1] = pts[i];
      if (t <= t1) return t1 === t0 ? y1 : y0 + (y1 - y0) * (t - t0) / (t1 - t0);
    }
    return pts[pts.length - 1][1];
  }
  function segs(pts) {
    const out = [];
    for (let i = 1; i < pts.length; i++) {
      const [t0, y0] = pts[i - 1], [t1, y1] = pts[i];
      out.push({ i: i - 1, t0, y0, t1, y1, dt: t1 - t0, dy: y1 - y0, slope: (y1 - y0) / (t1 - t0) });
    }
    return out;
  }
  /** Area under the graph from ta to tb (speed–time: the distance travelled). */
  function area(pts, ta, tb) {
    let a = 0;
    segs(pts).forEach(s => {
      const lo = Math.max(ta, s.t0), hi = Math.min(tb, s.t1);
      if (hi > lo) a += (at(pts, lo) + at(pts, hi)) / 2 * (hi - lo);
    });
    return a;
  }
  /** Where the object is at time t: distance from the start. */
  const position = (g, t) => (g.type === 'dt' ? at(g.pts, t) : area(g.pts, 0, t));
  /** How far along the road the whole journey reaches. */
  function reach(g) {
    if (g.type === 'dt') return Math.max(...g.pts.map(p => p[1]));
    return area(g.pts, 0, g.pts[g.pts.length - 1][0]);
  }
  const endTime = g => g.pts[g.pts.length - 1][0];

  /* ============================================================
     plot — a graph as an SVG string
     o: { mini, w, h, letters, hi:[seg], tap:'seg'|'piece', shade:[piece],
          ghost:pts, schematic:{t:{value:label}, y:{value:label}}, id, label }
     ============================================================ */
  function frame(g, o) {
    const mini = !!o.mini, W = o.w || (mini ? 300 : 640), H = o.h || (mini ? 190 : 340);
    const L = mini ? 30 : 70, R = mini ? 12 : 26, Tp = mini ? 12 : 20, B = mini ? 26 : 52;
    const X = t => L + t / g.tMax * (W - L - R), Y = y => H - B - y / g.yMax * (H - Tp - B);
    return { W, H, L, R, Tp, B, X, Y, mini };
  }
  const pathOf = (pts, X, Y) => pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join(' ');

  function axes(g, f, o) {
    const { W, H, L, R, Tp, B, X, Y, mini } = f;
    let s = '';
    const sch = o.schematic;
    if (!mini && !sch) {
      for (let t = 0; t <= g.tMax + 1e-9; t += g.tStep) {
        s += '<line x1="' + X(t) + '" y1="' + Tp + '" x2="' + X(t) + '" y2="' + (H - B) + '" stroke="' + LINE + '" stroke-width="1"/>' +
          (t ? '<text x="' + X(t) + '" y="' + (H - B + 20) + '" text-anchor="middle" class="tick">' + fmt(t) + '</text>' : '');
      }
      for (let y = 0; y <= g.yMax + 1e-9; y += g.yStep) {
        s += '<line x1="' + L + '" y1="' + Y(y) + '" x2="' + (W - R) + '" y2="' + Y(y) + '" stroke="' + LINE + '" stroke-width="1"/>' +
          (y ? '<text x="' + (L - 9) + '" y="' + (Y(y) + 4.5) + '" text-anchor="end" class="tick">' + fmt(y) + '</text>' : '');
      }
    } else if (mini && o.ticks) {
      for (let t = g.tStep; t <= g.tMax + 1e-9; t += g.tStep) s += '<text x="' + X(t) + '" y="' + (H - B + 15) + '" text-anchor="middle" class="tick sm">' + fmt(t) + '</text>';
      for (let y = g.yStep; y <= g.yMax + 1e-9; y += g.yStep) s += '<line x1="' + L + '" y1="' + Y(y) + '" x2="' + (W - R) + '" y2="' + Y(y) + '" stroke="' + LINE + '"/><text x="' + (L - 5) + '" y="' + (Y(y) + 4) + '" text-anchor="end" class="tick sm">' + fmt(y) + '</text>';
    }
    if (sch) {
      const tl = sch.t || {}, yl = sch.y || {};
      Object.keys(tl).forEach(k => {
        const t = +k, yTop = Math.max(...g.pts.filter(p => near(p[0], t)).map(p => p[1]), 0);
        if (yTop > 0) s += '<line x1="' + X(t) + '" y1="' + Y(yTop) + '" x2="' + X(t) + '" y2="' + (H - B) + '" stroke="' + SOFT + '" stroke-dasharray="5 5"/>';
        s += '<text x="' + X(t) + '" y="' + (H - B + 21) + '" text-anchor="middle" class="tick' + (isNaN(+tl[k]) ? ' var' : '') + '">' + tl[k] + '</text>';
      });
      Object.keys(yl).forEach(k => {
        const y = +k, first = g.pts.find(p => near(p[1], y));
        if (first && first[0] > 0) s += '<line x1="' + L + '" y1="' + Y(y) + '" x2="' + X(first[0]) + '" y2="' + Y(y) + '" stroke="' + SOFT + '" stroke-dasharray="5 5"/>';
        s += '<text x="' + (L - 9) + '" y="' + (Y(y) + 5) + '" text-anchor="end" class="tick' + (isNaN(+yl[k]) ? ' var' : '') + '">' + yl[k] + '</text>';
      });
    }
    s += '<text x="' + (L - (mini ? 6 : 9)) + '" y="' + (H - B + (mini ? 15 : 20)) + '" text-anchor="end" class="tick' + (mini ? ' sm' : '') + '">0</text>';
    s += '<path d="M' + L + ' ' + (Tp - 6) + ' V' + (H - B) + ' H' + (W - R + 6) + '" fill="none" stroke="' + INK + '" stroke-width="' + (mini ? 2 : 2.4) + '"/>' +
      '<path d="M' + (L - 5) + ' ' + (Tp + 2) + ' L' + L + ' ' + (Tp - 8) + ' L' + (L + 5) + ' ' + (Tp + 2) + 'M' + (W - R - 2) + ' ' + (H - B - 5) + ' L' + (W - R + 8) + ' ' + (H - B) + ' L' + (W - R - 2) + ' ' + (H - B + 5) + '" fill="none" stroke="' + INK + '" stroke-width="2"/>';
    const yName = g.type === 'dt' ? Tx('Distance', 'Jarak') : Tx('Speed', 'Laju');
    const tName = Tx('Time', 'Masa');
    if (mini) {
      s += '<text x="' + (L + 6) + '" y="' + (Tp + 4) + '" class="axis sm">' + yName + '</text>' +
        '<text x="' + (W - R) + '" y="' + (H - B - 7) + '" text-anchor="end" class="axis sm">' + tName + '</text>';
    } else {
      s += '<text transform="translate(18 ' + ((Tp + H - B) / 2) + ') rotate(-90)" text-anchor="middle" class="axis">' + yName + ' (' + unit(g.yu) + ')</text>' +
        '<text x="' + ((L + W - R) / 2) + '" y="' + (H - 6) + '" text-anchor="middle" class="axis">' + tName + ' (' + unit(g.tu) + ')</text>';
    }
    return s;
  }

  function plot(g, o) {
    o = o || {};
    const f = frame(g, o), { X, Y, W, H, B } = f;
    let s = axes(g, f, o);
    const sg = segs(g.pts);
    // shaded pieces under the graph
    sg.forEach(p => {
      const d = 'M' + X(p.t0) + ' ' + Y(0) + ' L' + X(p.t0) + ' ' + Y(p.y0) + ' L' + X(p.t1) + ' ' + Y(p.y1) + ' L' + X(p.t1) + ' ' + Y(0) + ' Z';
      const on = o.shade && o.shade.includes(p.i);
      if (o.tap === 'piece') s += '<path d="' + d + '" class="piece' + (on ? ' on' : '') + '" data-tap="p' + p.i + '" tabindex="0" role="button" aria-pressed="' + !!on + '" aria-label="' + Tx('Region ', 'Kawasan ') + LETTERS[p.i] + '"/>';
      else if (on) s += '<path d="' + d + '" class="piece on"/>';
    });
    if (o.ghost) s += '<path d="' + pathOf(o.ghost, X, Y) + '" fill="none" stroke="' + BLUE + '" stroke-width="' + (f.mini ? 3 : 5) + '" stroke-dasharray="8 7" stroke-linejoin="round" stroke-linecap="round"/>';
    // the graph, one segment at a time so a segment can be highlighted
    sg.forEach(p => {
      const on = o.hi && o.hi.includes(p.i), bad = o.bad && o.bad.includes(p.i);
      s += '<line x1="' + X(p.t0) + '" y1="' + Y(p.y0) + '" x2="' + X(p.t1) + '" y2="' + Y(p.y1) + '" class="seg' + (on ? ' hi' : '') + (bad ? ' bad' : '') + '" stroke-width="' + (f.mini ? 4 : on ? 8 : 6) + '"/>';
    });
    g.pts.forEach(p => { s += '<circle cx="' + X(p[0]) + '" cy="' + Y(p[1]) + '" r="' + (f.mini ? 3 : 5) + '" fill="#fff" stroke="' + INK + '" stroke-width="2"/>'; });
    if (o.letters) {
      sg.forEach(p => {
        const mx = (X(p.t0) + X(p.t1)) / 2, my = (Y(p.y0) + Y(p.y1)) / 2;
        const ang = Math.atan2(Y(p.y1) - Y(p.y0), X(p.t1) - X(p.t0));
        let lx = mx + Math.sin(ang) * 22, ly = my - Math.cos(ang) * 22;
        ly = Math.max(ly, 16); if (ly > H - B - 12) ly = my - 22;
        s += '<g class="letter' + (o.hi && o.hi.includes(p.i) ? ' hi' : '') + '"><circle cx="' + lx + '" cy="' + ly + '" r="13"/><text x="' + lx + '" y="' + (ly + 5) + '" text-anchor="middle">' + LETTERS[p.i] + '</text></g>';
      });
    }
    if (o.tap === 'seg') {
      sg.forEach(p => {
        s += '<line x1="' + X(p.t0) + '" y1="' + Y(p.y0) + '" x2="' + X(p.t1) + '" y2="' + Y(p.y1) + '" class="seg-hit" data-tap="s' + p.i + '" tabindex="0" role="button" aria-label="' + Tx('Part ', 'Bahagian ') + LETTERS[p.i] + '"/>';
      });
    }
    s += '<g class="cursor" style="display:none"><line x1="0" y1="' + f.Tp + '" x2="0" y2="' + (H - B) + '" stroke="' + INK + '" stroke-width="1.5" stroke-dasharray="4 4"/><circle r="' + (f.mini ? 5 : 8) + '" fill="' + ORANGE + '" stroke="' + INK + '" stroke-width="2"/></g>';
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="plot' + (f.mini ? ' mini' : '') + '"' + (o.id ? ' id="' + o.id + '"' : '') +
      ' role="img" aria-label="' + (o.label || (g.type === 'dt' ? Tx('Distance–time graph', 'Graf jarak-masa') : Tx('Speed–time graph', 'Graf laju-masa'))) + '">' + s + '</svg>';
  }

  /* ============================================================
     track — the road the car drives on
     o: { dMax, du, from, to, hill, rival, ghost, id }
     ============================================================ */
  const RX0 = 46, RX1 = 594;
  function car(color, cls) {
    return '<g class="car ' + (cls || '') + '"><g class="car-body">' +
      '<path d="M-24 -9 L-19 -20 L2 -20 L10 -11 L22 -9 Q26 -8 26 -3 L26 1 L-26 1 L-26 -4 Q-26 -9 -24 -9 Z" fill="' + color + '" stroke="' + INK + '" stroke-width="2.2" stroke-linejoin="round"/>' +
      '<path d="M-15 -17 L-2 -17 L-2 -11 L-17 -11 Z M1 -17 L6 -11 L1 -11 Z" fill="#fff" stroke="' + INK + '" stroke-width="1.6"/>' +
      '<circle cx="-14" cy="2" r="6" fill="' + INK + '"/><circle cx="-14" cy="2" r="2.2" fill="#fff"/><circle cx="14" cy="2" r="6" fill="' + INK + '"/><circle cx="14" cy="2" r="2.2" fill="#fff"/></g></g>';
  }
  function bestMarks(d) {
    const score = k => {
      const step = d / k;
      if (Math.abs(step * 2 - Math.round(step * 2)) > 1e-9) return 99;
      let m = step; while (m >= 10 && Math.abs(m / 10 - Math.round(m / 10)) < 1e-9) m /= 10;
      return ({ 1: 0, 5: 1, 2: 2, 2.5: 3 })[m] != null ? ({ 1: 0, 5: 1, 2: 2, 2.5: 3 })[m] : 10 + String(m).length;
    };
    return [5, 4, 6, 7, 3, 8, 10, 2].reduce((best, k) => (score(k) < score(best) ? k : best), 4);
  }
  const hillY = x => { const u = (x - RX0) / (RX1 - RX0); return 70 - Math.sin(Math.PI * u) * 42; };
  function track(o) {
    const W = 640, H = o.rival ? 158 : 118;
    let s = '';
    const lane = y => '<rect x="' + (RX0 - 20) + '" y="' + (y - 4) + '" width="' + (RX1 - RX0 + 40) + '" height="20" rx="5" fill="#e9e3dc"/>' +
      '<line x1="' + (RX0 - 14) + '" y1="' + (y + 6) + '" x2="' + (RX1 + 14) + '" y2="' + (y + 6) + '" stroke="#fff" stroke-width="2" stroke-dasharray="12 10"/>';
    if (o.hill) {
      let d = ''; for (let x = RX0 - 20; x <= RX1 + 20; x += 8) d += (d ? 'L' : 'M') + x + ' ' + (hillY(Math.min(Math.max(x, RX0), RX1)) + 3).toFixed(1);
      s += '<path d="' + d + ' L' + (RX1 + 20) + ' 96 L' + (RX0 - 20) + ' 96 Z" fill="' + GREEN + '" opacity=".55"/><path d="' + d + '" fill="none" stroke="#b9ad9f" stroke-width="12" stroke-linecap="round"/>';
    } else if (o.rival) {
      s += lane(50) + lane(112);
    } else s += lane(70);
    const base = o.hill ? 104 : o.rival ? 144 : 100;
    // distance marks
    // pick the number of marks whose step is roundest: 70 m → 0, 10, 20 … 70; 12 km → 0, 3, 6, 9, 12
    const n = o.marks || (o.dMax ? bestMarks(o.dMax) : 4);
    for (let k = 0; k <= n && !o.rival; k++) {
      const x = RX0 + (RX1 - RX0) * k / n;
      s += '<line x1="' + x + '" y1="' + (base - 10) + '" x2="' + x + '" y2="' + (base - 4) + '" stroke="' + SOFT + '" stroke-width="1.5"/>' +
        '<text x="' + x + '" y="' + (base + 7) + '" text-anchor="middle" class="tick sm">' + (o.dMax != null ? fmt(o.dMax * k / n) + (k === n ? ' ' + unit(o.du) : '') : '') + '</text>';
    }
    const y0 = o.hill ? hillY(RX0) : o.rival ? 50 : 70;
    s += '<g transform="translate(' + (RX0 - 30) + ' ' + (y0 - 40) + ')"><line x1="0" y1="0" x2="0" y2="30" stroke="' + INK + '" stroke-width="2"/><path d="M0 0 L14 5 L0 10 Z" fill="' + GREEN + '" stroke="' + INK + '" stroke-width="1.5"/></g>';
    if (o.from) s += '<text x="' + (RX0 - 4) + '" y="12" class="axis sm">' + o.from + '</text>';
    if (o.to) s += '<text x="' + RX1 + '" y="12" text-anchor="end" class="axis sm">' + o.to + '</text>';
    if (o.rival) s += '<g transform="translate(' + (RX1 + 4) + ' 20)"><rect x="0" y="0" width="12" height="104" fill="url(#chk)"/></g>' +
      '<defs><pattern id="chk" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="' + INK + '"/><rect x="6" y="6" width="6" height="6" fill="' + INK + '"/><rect x="6" width="6" height="6" fill="#fff"/><rect y="6" width="6" height="6" fill="#fff"/></pattern></defs>';
    if (o.ghost) s += '<g class="ghost-car" opacity=".55">' + car(BLUE) + '</g>';
    if (o.rival) s += '<g class="rival-car">' + car(BLUE) + '</g>';
    s += '<g class="main-car">' + car(o.color || ORANGE) + '</g>';
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="track"' + (o.id ? ' id="' + o.id + '"' : '') + ' aria-hidden="true">' + solid(s) + '</svg>';
  }
  /** Put a car on the road: frac 0..1 along it, dir 1 right / −1 left. */
  function placeCar(el, frac, dir, o) {
    if (!el) return;
    const x = RX0 + (RX1 - RX0) * Math.max(0, Math.min(1, frac));
    let y = o && o.lane != null ? o.lane : 70, rot = 0;
    if (o && o.hill) { y = hillY(x); rot = Math.atan2(hillY(x + 1) - hillY(x - 1), 2) * 180 / Math.PI; }
    el.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + (y - 2).toFixed(1) + ') rotate(' + rot.toFixed(1) + ')');
    const body = el.querySelector('.car-body');
    if (body) body.setAttribute('transform', dir < 0 ? 'scale(-1 1)' : '');
  }

  /* ============================================================
     animate — drive the car along a graph, with a cursor on the plot
     o: { g, track: svgEl, plot: svgEl|null, ghost: g|null, hill, ms,
          readout: el, onEnd }
     ============================================================ */
  let running = null;
  function stop() { if (running) { cancelAnimationFrame(running.raf); running = null; } }
  function animate(o) {
    stop();
    const g = o.g, T1 = endTime(g), D = o.dMax || reach(g) || 1;
    const main = o.track.querySelector('.main-car'), gh = o.track.querySelector('.ghost-car');
    const cur = o.plot ? o.plot.querySelector('.cursor') : null;
    const f = o.plot ? frame(g, { mini: o.plot.classList.contains('mini'), w: o.plot.viewBox.baseVal.width, h: o.plot.viewBox.baseVal.height }) : null;
    const lane = o.hill ? null : 70;
    const ms = o.ms || 4200, t0 = performance.now();
    if (cur) cur.style.display = '';
    const dirAt = (gg, t) => {
      if (gg.type === 'vt') return 1;
      const e = 1e-3 * T1; return at(gg.pts, t + e) < at(gg.pts, t - e) - 1e-9 ? -1 : 1;
    };
    let lastDir = 1, lastGDir = 1;
    function frameFn(now) {
      const k = Math.min(1, (now - t0) / ms), t = k * T1;
      const p = position(g, t), d = dirAt(g, t);
      if (g.type === 'vt' || !near(at(g.pts, t + 1e-3 * T1), at(g.pts, t - 1e-3 * T1), 1e-9)) lastDir = d;
      placeCar(main, p / D, lastDir, { hill: o.hill, lane });
      if (gh && o.ghost) {
        const gd = dirAt(o.ghost, t);
        if (!near(at(o.ghost.pts, t + 1e-3 * T1), at(o.ghost.pts, t - 1e-3 * T1), 1e-9)) lastGDir = gd;
        placeCar(gh, position(o.ghost, t) / D, lastGDir, { hill: o.hill, lane });
      }
      if (cur && f) {
        const y = at(g.pts, t);
        cur.querySelector('line').setAttribute('x1', f.X(t)); cur.querySelector('line').setAttribute('x2', f.X(t));
        cur.querySelector('circle').setAttribute('cx', f.X(t)); cur.querySelector('circle').setAttribute('cy', f.Y(y));
      }
      if (o.readout) {
        o.readout.innerHTML = '<span>t = <b>' + fmt(Math.round(t * 10) / 10) + '</b> ' + unit(g.tu) + '</span>' +
          (g.type === 'dt'
            ? '<span>' + Tx('distance from start', 'jarak dari titik mula') + ' = <b>' + fmt(Math.round(p * 10) / 10) + '</b> ' + unit(g.yu) + '</span>'
            : '<span>' + Tx('speed', 'laju') + ' = <b>' + fmt(Math.round(at(g.pts, t) * 10) / 10) + '</b> ' + unit(g.yu) + '</span><span>' + Tx('distance', 'jarak') + ' = <b>' + fmt(Math.round(p * 10) / 10) + '</b> ' + unit(areaUnit(g)) + '</span>');
      }
      if (k < 1) running.raf = requestAnimationFrame(frameFn);
      else { running = null; if (o.onEnd) o.onEnd(); }
    }
    running = { raf: requestAnimationFrame(frameFn) };
  }
  /** Park the car(s) at the start. */
  function park(trackEl, o) {
    if (!trackEl) return;
    const lane = o && o.hill ? null : 70;
    placeCar(trackEl.querySelector('.main-car'), 0, 1, { hill: o && o.hill, lane });
    placeCar(trackEl.querySelector('.ghost-car'), 0, 1, { hill: o && o.hill, lane });
  }

  /* ============================================================
     editor — drag points to draw a graph
     cfg: { g (axes only), cols: [t...], fixed: {index: value}, onChange }
     Every point snaps to the y grid. Arrow keys move a focused point.
     ============================================================ */
  function editor(host, cfg) {
    const g = cfg.g, f = frame(g, {}), { X, Y } = f;
    const vals = cfg.cols.map((t, i) => (cfg.fixed && cfg.fixed[i] != null ? cfg.fixed[i] : cfg.start ? cfg.start[i] : 0));
    let bad = [];
    host.innerHTML = '<svg viewBox="0 0 ' + f.W + ' ' + f.H + '" class="plot editor" role="group" aria-label="' + Tx('Drawing board: drag each point up or down', 'Papan lukisan: seret setiap titik ke atas atau ke bawah') + '">' +
      axes(g, f, {}) +
      cfg.cols.map(t => '<line x1="' + X(t) + '" y1="' + f.Tp + '" x2="' + X(t) + '" y2="' + (f.H - f.B) + '" class="col"/>').join('') +
      '<polyline class="drawn" fill="none" stroke="' + ORANGE + '" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>' +
      cfg.cols.map((t, i) => '<g class="handle' + (cfg.fixed && cfg.fixed[i] != null ? ' fixed' : '') + '" data-i="' + i + '" tabindex="' + (cfg.fixed && cfg.fixed[i] != null ? -1 : 0) + '" role="slider" aria-valuemin="0" aria-valuemax="' + g.yMax + '">' +
        '<circle r="30" class="hit"/><circle r="11" class="dot"/><text class="hv" text-anchor="middle"></text></g>').join('') +
      '</svg>';
    const svg = host.querySelector('svg');
    const snap = cfg.snap || g.yStep;
    function draw() {
      svg.querySelector('.drawn').setAttribute('points', cfg.cols.map((t, i) => X(t) + ',' + Y(vals[i])).join(' '));
      svg.querySelectorAll('.handle').forEach(h => {
        const i = +h.dataset.i;
        h.setAttribute('transform', 'translate(' + X(cfg.cols[i]) + ' ' + Y(vals[i]) + ')');
        h.classList.toggle('bad', bad.includes(i));
        h.setAttribute('aria-valuenow', vals[i]);
        h.setAttribute('aria-label', 't = ' + fmt(cfg.cols[i]) + ' ' + unit(g.tu) + ': ' + fmt(vals[i]) + ' ' + unit(g.yu));
        const tx = h.querySelector('.hv'); tx.textContent = fmt(vals[i]); tx.setAttribute('y', vals[i] > g.yMax * 0.85 ? 30 : -16);
      });
    }
    function toY(ev) {
      const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
      const p = pt.matrixTransform(svg.getScreenCTM().inverse());
      const y = (f.H - f.B - p.y) / (f.H - f.Tp - f.B) * g.yMax;
      return Math.max(0, Math.min(g.yMax, Math.round(y / snap) * snap));
    }
    let drag = null;
    function set(i, v) {
      if (cfg.fixed && cfg.fixed[i] != null) return;
      v = Math.max(0, Math.min(g.yMax, Math.round(v / snap) * snap));
      if (vals[i] === v) return;
      vals[i] = v; bad = bad.filter(b => b !== i); draw();
      if (cfg.onChange) cfg.onChange(vals.slice());
    }
    svg.addEventListener('pointerdown', ev => {
      const h = ev.target.closest('.handle');
      let i;
      if (h) i = +h.dataset.i;
      else {   // a tap anywhere on a column moves that column's point
        const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
        const p = pt.matrixTransform(svg.getScreenCTM().inverse());
        let best = -1, bd = 1e9;
        cfg.cols.forEach((t, j) => { const d = Math.abs(X(t) - p.x); if (d < bd) { bd = d; best = j; } });
        const half = cfg.cols.length > 1 ? (X(cfg.cols[1]) - X(cfg.cols[0])) / 2 : 40;
        if (bd > Math.max(30, half)) return;
        i = best;
      }
      if (cfg.fixed && cfg.fixed[i] != null) return;
      ev.preventDefault();
      drag = i; svg.setPointerCapture(ev.pointerId);
      set(i, toY(ev));
      if (root.SFX) SFX.play('tap');
    });
    svg.addEventListener('pointermove', ev => { if (drag != null) set(drag, toY(ev)); });
    const end = () => { drag = null; };
    svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
    svg.addEventListener('keydown', ev => {
      const h = ev.target.closest('.handle'); if (!h) return;
      const i = +h.dataset.i;
      if (ev.key === 'ArrowUp' || ev.key === 'ArrowRight') { set(i, vals[i] + snap); ev.preventDefault(); }
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowLeft') { set(i, vals[i] - snap); ev.preventDefault(); }
    });
    draw();
    return {
      values: () => vals.slice(),
      pts: () => cfg.cols.map((t, i) => [t, vals[i]]),
      mark: list => { bad = list.slice(); draw(); },
      lock: () => svg.classList.add('locked')
    };
  }

  const MK = { fmt, unit, slopeUnit, areaUnit, at, segs, area, position, reach, endTime, plot, track, animate, park, stop, editor, near, LETTERS };
  root.MK = MK;
  if (typeof module !== 'undefined' && module.exports) module.exports = MK;
})(typeof window !== 'undefined' ? window : globalThis);

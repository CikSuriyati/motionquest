/**
 * GRAPH QUEST collector — Google Apps Script backend
 * ------------------------------------------------------------------
 * Students press "Submit results" on the My Progress page. The game
 * sends every attempt not yet sent, and this script appends ONE ROW
 * PER ATTEMPT to the "Attempts" tab. That flat sheet is what the
 * teacher dashboard reads, and it opens directly in Excel or SPSS.
 *
 * Behaviour:
 *   - Every row carries an attempt_id made on the student's device.
 *     A row whose attempt_id is already in the sheet is skipped, so a
 *     student pressing Submit twice (or a flaky connection retrying)
 *     never creates duplicates.
 *   - Rows are validated field by field; a bad row rejects the whole
 *     batch with a message, rather than half-writing it.
 *   - No names are stored. student_code is class code + register number.
 *
 * SETUP
 *   1. Open a Google Sheet > Extensions > Apps Script
 *   2. Replace Code.gs with this file, Save
 *   3. Run  setupSheet  once (authorise when prompted)
 *   4. Run  testCollector  once — it should log "All tests passed"
 *   5. Deploy > New deployment > Web app
 *        Execute as:      Me
 *        Who has access:  Anyone
 *   6. Copy the /exec URL into ENDPOINT in graphquest/index.html
 *
 * IMPORTANT: after ANY edit to this file you must
 *   Deploy > Manage deployments > (pencil) > Version: New version > Deploy
 * or the live URL keeps serving the old code.
 */

var SHEET_NAME = 'Attempts';

/* The teacher dashboard reads the sheet with ?action=rows&key=… — only with
   this key. Change it to your own long random phrase before deploying, and
   never commit your real key. Students never need it. */
var TEACHER_KEY = 'CHANGE_ME';

var FIELDS = [
  'attempt_id', 'timestamp', 'class_code', 'student_code', 'world', 'level',
  'correct', 'optimal', 'score_xp', 'hints_used', 'learn_used', 'time_s',
  'mistake_tag', 'boss_tool_choice'
];
var RECEIVED_COL = FIELDS.length + 1;          // server time, added by this script

/* Pre-test, post-test and survey rows go to their own tab. */
var TESTS_SHEET = 'Tests';
var TEST_FIELDS = [
  'test_id', 'timestamp', 'class_code', 'student_code', 'test', 'form', 'score', 'max',
  'answers', 'correct_items', 'time_s', 'levels_cleared', 'skipped'
];
var TEST_RECEIVED_COL = TEST_FIELDS.length + 1;

/* Class leaderboard teams. Leave the Teams tab empty and students are grouped
   in fours by register number (1–4 = Team 1, 5–8 = Team 2, …). To choose teams
   yourself, add rows: student_code (e.g. 4S1-17) | team (any name). */
var TEAMS_SHEET = 'Teams';
var TEAM_SIZE = 4;

var MAX_ROWS_PER_POST = 500;


/* ==================================================================
   ENTRY POINTS
   ================================================================== */

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.action === 'board') return json(board(String(p['class'] || '').toUpperCase()));
  if (p.action !== 'rows') return json({ ok: true, message: 'GRAPH QUEST collector is running.' });

  // ---- teacher dashboard: every attempt row, only with the teacher key ----
  if (!TEACHER_KEY || TEACHER_KEY === 'CHANGE_ME') {
    return json({ ok: false, code: 'NO_KEY', error: 'Set TEACHER_KEY in the Apps Script, then deploy a new version.' });
  }
  if (String(p.key || '') !== TEACHER_KEY) return json({ ok: false, code: 'BAD_KEY', error: 'That teacher key is not right.' });

  return json({ ok: true, rows: readTab(getSheet(), RECEIVED_COL), tests: readTab(getTestsSheet(), TEST_RECEIVED_COL) });
}

/* ==================================================================
   CLASS BOARD — this week's XP, per student and per team, one class only.
   Weekly XP = for each level, the best score received since Monday 00:00.
   Only codes and XP leave the sheet; no key needed (the class code scopes it).
   ================================================================== */

function board(cls) {
  if (!/^[A-Z0-9]+(-[A-Z0-9]+)*$/.test(cls)) return { ok: false, error: 'Unknown class code.' };
  var since = weekStart();
  var rows = readTab(getSheet(), RECEIVED_COL).filter(function (r) { return String(r.class_code) === cls; });
  var best = {}, everyone = {};
  rows.forEach(function (r) {
    var s = String(r.student_code);
    everyone[s] = true;
    if (!(new Date(r.received) >= since)) return;
    var k = r.world + '-' + r.level, b = best[s] || (best[s] = {});
    b[k] = Math.max(b[k] || 0, Number(r.score_xp) || 0);
  });
  var teamOf = teamMap();
  var students = Object.keys(everyone).map(function (s) {
    var xp = 0, b = best[s] || {};
    Object.keys(b).forEach(function (k) { xp += b[k]; });
    var reg = Number(s.split('-').pop()) || 0;
    return { code: s, xp: xp, team: teamOf[s] || ('Team ' + Math.ceil(reg / TEAM_SIZE)) };
  }).sort(function (a, b) { return b.xp - a.xp; });
  var teams = {};
  students.forEach(function (s) {
    var t = teams[s.team] || (teams[s.team] = { team: s.team, total: 0, members: [] });
    t.total += s.xp; t.members.push({ code: s.code, xp: s.xp });
  });
  var list = Object.keys(teams).map(function (k) {
    var t = teams[k]; t.xp = Math.round(t.total / t.members.length); return t;   // average, so team size doesn't matter
  }).sort(function (a, b) { return b.xp - a.xp; });
  return { ok: true, week_start: since.toISOString(), students: students, teams: list };
}

function weekStart() {
  var d = new Date(), day = (d.getDay() + 6) % 7;            // Monday = 0
  d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - day);
  return d;
}

function teamMap() {
  var out = {};
  readTab(getTeamsSheet(), 2).forEach(function (r) {
    var s = String(r.student_code || '').trim().toUpperCase(), t = String(r.team || '').trim();
    if (s && t) out[s] = t;
  });
  return out;
}

function getTeamsSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(TEAMS_SHEET) || ss.insertSheet(TEAMS_SHEET);
  if (sh.getLastRow() === 0) {
    sh.appendRow(['student_code', 'team']);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, 2).setFontWeight('bold');
  }
  return sh;
}

function readTab(sheet, cols) {
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var head = sheet.getRange(1, 1, 1, cols).getValues()[0];
  return sheet.getRange(2, 1, last - 1, cols).getValues().map(function (r) {
    var o = {};
    head.forEach(function (h, i) { o[h] = (r[i] instanceof Date) ? r[i].toISOString() : r[i]; });
    return o;
  });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);

    if (!e || !e.postData || !e.postData.contents) return json({ ok: false, error: 'No data received.' });

    var body = JSON.parse(e.postData.contents);
    var rows = Array.isArray(body.rows) ? body.rows : [];
    var tests = Array.isArray(body.tests) ? body.tests : [];
    if (!rows.length && !tests.length) return json({ ok: false, error: 'Nothing in the submission.' });
    if (rows.length + tests.length > MAX_ROWS_PER_POST) return json({ ok: false, error: 'Too many rows in one submission.' });

    for (var i = 0; i < rows.length; i++) {
      var problem = checkRow(rows[i]);
      if (problem) return json({ ok: false, error: 'Attempt ' + (i + 1) + ': ' + problem });
    }
    for (var j = 0; j < tests.length; j++) {
      var tp = checkTest(tests[j]);
      if (tp) return json({ ok: false, error: 'Test ' + (j + 1) + ': ' + tp });
    }
    var testsAdded = appendNew(getTestsSheet(), tests, TEST_FIELDS, 'test_id');

    var sheet = getSheet();
    var known = knownIds(sheet);
    var now = new Date();
    var out = [];

    rows.forEach(function (r) {
      var id = String(r.attempt_id);
      if (known[id]) return;                   // already stored — skip, don't duplicate
      known[id] = true;
      var line = FIELDS.map(function (f) { return r[f] === undefined ? '' : r[f]; });
      line.push(now);
      out.push(line);
    });

    if (out.length) {
      sheet.getRange(sheet.getLastRow() + 1, 1, out.length, RECEIVED_COL).setValues(out);
    }
    return json({ ok: true, received: rows.length, added: out.length, skipped: rows.length - out.length,
                  testsReceived: tests.length, testsAdded: testsAdded });

  } catch (err) {
    return json({ ok: false, error: String(err && err.message ? err.message : err) });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}


/* ==================================================================
   VALIDATION
   ================================================================== */

function checkRow(r) {
  if (!r || typeof r !== 'object') return 'not an object.';
  if (!/^[a-z0-9]+-[a-z0-9]+$/i.test(String(r.attempt_id || ''))) return 'missing attempt_id.';
  if (!/^[A-Z0-9]+(-[A-Z0-9]+)*$/.test(String(r.class_code || ''))) return 'bad class_code.';
  if (!/^[A-Z0-9]+-\d{1,3}$/.test(String(r.student_code || ''))) return 'bad student_code.';
  if (!isInt(r.world, 1, 7)) return 'bad world.';          // 7 = the Boss Level
  if (!isInt(r.level, 1, 5)) return 'bad level.';
  if (typeof r.correct !== 'boolean' || typeof r.optimal !== 'boolean') return 'correct/optimal must be true or false.';
  if (!isInt(r.score_xp, -20, 100)) return 'bad score_xp.';
  if (!isInt(r.hints_used, 0, 99) || !isInt(r.learn_used, 0, 99)) return 'bad hint counts.';
  if (!isInt(r.time_s, 0, 86400)) return 'bad time_s.';
  if (String(r.mistake_tag || '').length > 60 || String(r.boss_tool_choice || '').length > 60) return 'tag too long.';
  return '';
}

function checkTest(r) {
  if (!r || typeof r !== 'object') return 'not an object.';
  if (!/^t[a-z0-9]+-[a-z0-9]+$/i.test(String(r.test_id || ''))) return 'missing test_id.';
  if (!/^[A-Z0-9]+(-[A-Z0-9]+)*$/.test(String(r.class_code || ''))) return 'bad class_code.';
  if (!/^[A-Z0-9]+-\d{1,3}$/.test(String(r.student_code || ''))) return 'bad student_code.';
  if (['pre', 'post', 'survey'].indexOf(r.test) < 0) return 'test must be pre, post or survey.';
  if (['A', 'B', ''].indexOf(r.form) < 0) return 'bad form.';
  if (!isInt(r.score, 0, 50) || !isInt(r.max, 0, 50)) return 'bad score.';
  if (String(r.answers || '').length > 2000 || String(r.correct_items || '').length > 50) return 'answers too long.';
  if (!isInt(r.time_s, 0, 86400) || !isInt(r.levels_cleared, 0, 100)) return 'bad time or levels.';
  if (typeof r.skipped !== 'boolean') return 'skipped must be true or false.';
  return '';
}

/** Append rows whose id isn't in the tab yet; returns how many were added. */
function appendNew(sheet, list, fields, idField) {
  if (!list.length) return 0;
  var known = knownIds(sheet), now = new Date(), out = [];
  list.forEach(function (r) {
    var id = String(r[idField]);
    if (known[id]) return;
    known[id] = true;
    var line = fields.map(function (f) { return r[f] === undefined ? '' : r[f]; });
    line.push(now);
    out.push(line);
  });
  if (out.length) sheet.getRange(sheet.getLastRow() + 1, 1, out.length, fields.length + 1).setValues(out);
  return out.length;
}

function isInt(v, lo, hi) { return typeof v === 'number' && v === Math.round(v) && v >= lo && v <= hi; }


/* ==================================================================
   HELPERS
   ================================================================== */

function knownIds(sheet) {
  var out = {}, last = sheet.getLastRow();
  if (last < 2) return out;
  sheet.getRange(2, 1, last - 1, 1).getValues().forEach(function (r) { out[String(r[0])] = true; });
  return out;
}

function getTestsSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(TESTS_SHEET) || ss.insertSheet(TESTS_SHEET);
  if (sh.getLastRow() === 0) {
    sh.appendRow(TEST_FIELDS.concat(['received']));
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, TEST_RECEIVED_COL).setFontWeight('bold');
  }
  return sh;
}

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(SHEET_NAME) || setupSheet();
}

/** Run this once from the editor to create the Attempts, Tests and Teams tabs. */
function setupSheet() {
  getTestsSheet();
  getTeamsSheet();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(FIELDS.concat(['received']));
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, RECEIVED_COL).setFontWeight('bold');
  }
  return sh;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}


/* ==================================================================
   SELF-TEST — run from the editor, check the log. Writes nothing.
   ================================================================== */

function testCollector() {
  var good = {
    attempt_id: 'lx3k9a-abc12', timestamp: '2026-10-14 10:32', class_code: '4S1-2026', student_code: '4S1-17',
    world: 3, level: 2, correct: true, optimal: false, score_xp: 30, hints_used: 1, learn_used: 0,
    time_s: 48, mistake_tag: 'fewest_edges_not_shortest', boss_tool_choice: ''
  };
  if (checkRow(good)) throw new Error('Good row rejected: ' + checkRow(good));

  function bad(change, why) {
    var r = JSON.parse(JSON.stringify(good));
    for (var k in change) r[k] = change[k];
    if (!checkRow(r)) throw new Error('Bad row accepted: ' + why);
  }
  bad({ level: 6 }, 'level 6');
  bad({ world: 0 }, 'world 0');
  bad({ optimal: 'yes' }, 'string boolean');
  bad({ score_xp: 101 }, 'score over 100');
  bad({ student_code: 'Ali' }, 'a name as student_code');
  bad({ attempt_id: '' }, 'missing id');

  var t = { test_id: 'tlx3k9a-abc12', timestamp: '2026-10-14 10:32', class_code: '4S1-2026', student_code: '4S1-17',
    test: 'pre', form: 'A', score: 6, max: 10, answers: '[\"3\"]', correct_items: '1101100110', time_s: 240, levels_cleared: 0, skipped: false };
  if (checkTest(t)) throw new Error('Good test row rejected: ' + checkTest(t));
  var bt = JSON.parse(JSON.stringify(t)); bt.test = 'mid';
  if (!checkTest(bt)) throw new Error('Bad test row accepted: test=mid');

  Logger.log('All tests passed. %s fields per attempt, %s per test.', FIELDS.length, TEST_FIELDS.length);
  return 'OK';
}

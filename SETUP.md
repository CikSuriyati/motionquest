# MOTION QUEST — setup

A graphs of motion game for **KSSM Matematik Tingkatan 4, Bab 7 Graf Gerakan**. Built the same way as Graph Quest: same look, same sound, same class code + register number sign-in, same pre-test/post-test flow, and the same results format.

## Files

| File | What it is |
|---|---|
| `index.html` | The page: top bar, entry screen and empty screens |
| `game.js` | The game shell: map, How to play, level player, XP, badges, Discover, My progress, sending results |
| `stages.js` | The 6 stages and 18 levels. Every level makes new numbers each time it is played |
| `motion.js` | The motion engine: draws graphs, the road and the car, plays the car along a graph, and the drag-the-points drawing board |
| `tests.js` | Pre-test, post-test (two matched forms) and survey |
| `sound.js` | Sound effects (copied from Graph Quest, plus an engine sound) |
| `base.css`, `interface.css` | Graph Quest's styles, copied unchanged |
| `motionquest.css` | Styles for graphs, the road, the drawing board and the race |
| `apps-script.gs` | Graph Quest's results collector, copied unchanged. It accepts Motion Quest rows as they are |

It is plain HTML and JavaScript with no build step. Open it with any static web server, for example from this folder: `python3 -m http.server 8795`, then go to `http://localhost:8795/`.

**Teacher demo:** add `?unlock=all` to the address to open every stage without playing through.

## The stages

| Stage | Name | Levels | What it teaches |
|---|---|---|---|
| 1 | Garisan Mula | Tonton dan padan · Baca graf · Cerita ke graf | Reading a distance–time graph: up = moving away, flat = stationary, down = coming back. A graph is not a picture of the road (the hill question) |
| 2 | Laju Stabil | Kira laju · Bahagian paling laju · Laju purata | Gradient = speed. Steepest = fastest. Average speed = total distance ÷ total time, including stops, both ways, and minutes → hours |
| 3 | Lukis Sendiri | Daripada jadual · Daripada cerita · Daripada laju | Drawing distance–time graphs by dragging points. A wrong graph is driven next to the correct one |
| 4 | Pecut! | Apa yang berlaku? · Kadar perubahan laju · Lukis graf laju-masa | Speed–time graphs: flat = uniform speed (not stationary!), gradient = rate of change of speed, negative = deceleration, finding *u* |
| 5 | Jarak Tersembunyi | Lorek jarak · Jumlah jarak · Cari nilai anu | Distance = area under a speed–time graph: triangle, rectangle, trapezium, then SPM-style unknowns (*T*, *u*, *v*) |
| 6 | Perlumbaan Akhir | Perlumbaan jarak-masa · Perlumbaan laju-masa · Grand Prix | Mixed questions against a rival car on a timer |

Stages open in order: a stage opens when the one before it is cleared. Levels inside a stage also open in order.

Every level ends with a **quick check** on the idea behind it. Stages 1–5 end with **Discover**: the student picks the rule they noticed, then sees the textbook terms (graf jarak-masa, pegun, laju seragam, laju purata, kecerunan, pecutan, nyahpecutan, luas di bawah graf).

## Scoring

| Part | XP |
|---|---|
| Solved | 60, minus 10 for each wrong answer (never below 30) |
| Quick check (races: beat the rival) | 20 (races: 30) |
| No hint or worked solution | 10 |
| Speed, under the level's target time (not in races) | 10 |
| Used a worked solution | −10 |
| Discover, once per stage | +20 |

Replaying keeps the best score. Ranks every 350 XP. Six badges: Pusingan Pertama, Mata Helang, Pakar Kecerunan, Pelukis Graf, Raja Luas, Juara Litar.

**Hint** is always available. **Worked solution** appears after two wrong tries on a question.

## Results — connect a Google Sheet (about 10 minutes)

The game works without this. Progress is saved on each student's device. Connect a Sheet when you want results to reach you.

**Use a new Sheet, not Graph Quest's**, so the two games' results never mix.

1. Make a new Google Sheet → **Extensions → Apps Script**. Replace `Code.gs` with the whole of `apps-script.gs`.
2. Change `var TEACHER_KEY = 'CHANGE_ME';` to your own phrase. Don't commit the real key.
3. Run **setupSheet**, then **testCollector** (the log should say *All tests passed*).
4. **Deploy → New deployment → Web app**, Execute as **Me**, Who has access **Anyone**. Copy the `/exec` link.
5. In `game.js`, replace `PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE` with that link.

After any edit to the Apps Script: **Deploy → Manage deployments → pencil → Version: New version → Deploy.**

Rows are the same as Graph Quest's: `world` is the stage (1–6) and `level` is 1–3. Each wrong answer is its own row with a mistake tag; clearing a level adds one row with the score.

### Mistake tags

| Tag | Means |
|---|---|
| `graph_as_picture` | Chose a graph shaped like the hill/road instead of distance from the start |
| `missed_stop`, `stop_as_return` | Missed the stop, or drew a stop going down |
| `return_not_down`, `return_drawn_up` | The way back was not drawn going down to 0 |
| `stationary_misread`, `return_misread` | Tapped the wrong part for stationary / coming back |
| `read_point_not_duration`, `read_wrong_axis` | Gave a clock time instead of a duration, or a distance instead of a time |
| `misread_scale`, `speed_change_missed`, `ignored_uniform` | Right shape, wrong numbers; missed a change of speed; ignored "uniform speed" |
| `speed_inverted`, `used_coordinates_not_change`, `negative_speed` | Time ÷ distance; used one point's reading instead of the change; gave a negative speed |
| `fastest_most_distance`, `compare_gradients` | Picked the part that covers most distance, not the steepest |
| `ignored_stop_time`, `mean_of_speeds`, `one_way_distance`, `used_displacement`, `minutes_not_hours` | Average speed mistakes |
| `stop_not_flat`, `uniform_not_flat`, `misplot_point` | Drawing mistakes |
| `dt_habit_slope_uniform`, `vt_flat_as_stationary`, `vt_flat_misread`, `accel_decel_mixed` | Reading a speed–time graph as if it were distance–time |
| `accel_inverted`, `read_speed_not_change`, `accel_sign`, `ignored_initial_speed` | Rate of change of speed mistakes |
| `triangle_no_half`, `trapezium_as_rectangle`, `trapezium_as_triangle`, `read_speed_as_distance`, `wrong_region`, `area_formula`, `answered_interval_not_time` | Area and unknown-value mistakes |
| `calc_error`, `wrong_pick` | Any other wrong answer |

The Graph Quest teacher dashboard doesn't know these stages yet, so read the results in the Sheet or in Excel/SPSS for now.

## Pre-test and post-test

Same rules as Graph Quest: 10 questions each, no hints, no feedback, one try. Odd register numbers take form A before and B after; even numbers take B then A. The post-test opens after **9 levels** are cleared and results are submitted. For a control class that doesn't play: `…/?test=pre` and later `…/?test=post`.

| # | Idea | Form A | Form B |
|---|---|---|---|
| 1 | Stationary period (d–t) | 15 min | 20 min |
| 2 | Speed from gradient | 10 m s⁻¹ | 5 m s⁻¹ |
| 3 | Moving back (d–t) | c | c |
| 4 | Average speed with a stop | 50 km j⁻¹ | 30 km j⁻¹ |
| 5 | A graph is not a picture (hill / valley) | b | c |
| 6 | Flat line on a speed–time graph | b (uniform speed) | b |
| 7 | Acceleration | 3 m s⁻² | 2 m s⁻² |
| 8 | Deceleration (negative rate) | −3 m s⁻² | −2.5 m s⁻² |
| 9 | Distance = area | 120 m | 115 m |
| 10 | Unknown *T* from the area | 14 | 18 |

Every answer key has been checked against its graph. **Please review the questions before a class uses them.**

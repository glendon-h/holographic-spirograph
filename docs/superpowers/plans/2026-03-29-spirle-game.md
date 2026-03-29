# Spirle Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a daily spirograph guessing game ("Spirle") as a standalone HTML file reusing the existing shape engine.

**Architecture:** Single `spirle.html` file containing the spirograph math engine (copied from brewer.html), game state machine, canvas rendering for target + icons, Web Audio feedback, and localStorage persistence. No dependencies, no build step.

**Tech Stack:** Vanilla JS, Canvas 2D, Web Audio API, localStorage

**Reference:** Design spec at `docs/superpowers/specs/2026-03-29-spirle-game-design.md`, mockup at `.superpowers/brainstorm/7263-1774757816/content/spirle-mockup-v3.html`

---

## File Structure

- **Create:** `spirle.html` — the entire game (single file, like brewer.html)

That's it. One file.

---

### Task 1: Scaffold HTML + CSS Layout

**Files:**
- Create: `spirle.html`

The full single-screen mobile-first layout with all structural elements. No interactivity yet — just the static shell.

- [ ] **Step 1: Create spirle.html with full CSS and DOM structure**

Create `spirle.html` with:
- Full CSS from the v3 mockup (Space Grotesk font, dark theme, all component styles)
- Static DOM: `.game` container with header, target canvas wrapper (180px circle), `#guessGrid` (empty, JS will fill), divider, `#pickersArea` (empty, JS will fill), Roll button (disabled), guess counter
- Modal overlays for stats and settings (hidden by default)
- Empty `<script>` tag for game code

Key CSS classes needed:
- `.cell-intune` (green: `#1a3a2a` bg, `#2a6a4a` border)
- `.cell-close` (yellow: `#2e2a1a` bg, `#6a5a2a` border)
- `.cell-off` (gray: `#1a1a22` bg, `#22222e` border)
- `.cell-empty`, `.cell-pending`
- `.picker-option.selected` (purple glow), `.confirmed` (green), `.eliminated` (dimmed)
- `.roll-btn` (purple gradient, 40px tall, rounded)
- `.modal-overlay`, `.modal` for popups

See the v3 mockup for exact values. The layout must fit on a single screen without scrolling (~700px viewport).

- [ ] **Step 2: Open in browser and verify layout**

Open `spirle.html` in a browser. Verify:
- Dark background, header shows "SPIRLE #1"
- Empty circular target area
- No scrolling on a ~700px tall viewport
- Roll button is disabled
- All three header buttons visible

- [ ] **Step 3: Commit**

```bash
git add spirle.html
git commit -m "feat(spirle): scaffold HTML/CSS layout — single-screen mobile-first shell"
```

---

### Task 2: Shape Engine + Daily Puzzle Seeding

**Files:**
- Modify: `spirle.html` (inside `<script>` tag)

Copy the shape math from brewer.html (superformula, Fourier, arc tables) and add puzzle seeding.

- [ ] **Step 1: Add shape engine code**

Add inside the `<script>` tag:

1. `superformula(theta, m, n1, n2, n3)` — copy from brewer.html line 169
2. `FOURIER_SHAPES` object with: circle, heart, trefoil, starfish, blob, butterfly — copy from brewer.html line 178-186. Add `star` using `superformula(t, 5, 0.3, 0.3, 0.3)`.
3. `fitFourier(fn, n)` — copy from brewer.html line 189
4. `fourierPt(t, c)` — copy from brewer.html line 199
5. `fourierCache` + `getFC(name)` — copy from brewer.html line 201-202
6. `makeShape(name)` — takes a shape name string (not type+params like brewer). For 'star' use superformula directly. For everything else use fourier cache. Returns `{ getPoint(t), getPolarRadius(t) }`.
7. `arcTable(shape, n)` — copy from brewer.html line 215
8. `arc2theta(table, target)` — copy from brewer.html line 216

- [ ] **Step 2: Add parameter space constants**

```javascript
const OUTER_SHAPES = ['circle', 'heart', 'blob', 'starfish'];
const INNER_SHAPES = ['circle', 'star', 'trefoil', 'butterfly'];
const RATIOS = [0.2, 0.3, 0.4, 0.5];
const PENS = [0.4, 0.6, 0.8, 1.0];
```

- [ ] **Step 3: Add daily puzzle seeding**

```javascript
function hashDate(dateStr) {
  let h = 0;
  for (let i = 0; i < dateStr.length; i++) {
    h = ((h << 5) - h + dateStr.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function getDailyPuzzle() {
  const today = new Date();
  const dateStr = today.getFullYear() + '-' +
    String(today.getMonth() + 1).padStart(2, '0') + '-' +
    String(today.getDate()).padStart(2, '0');
  const h = hashDate(dateStr);
  const epoch = new Date(2026, 2, 29); // March 29, 2026
  const dayNum = Math.floor((today - epoch) / 86400000) + 1;

  return {
    outerIdx: h % 4,
    innerIdx: (h >> 2) % 4,
    ratioIdx: (h >> 4) % 4,
    penIdx:   (h >> 6) % 4,
    rotation: ((h >> 8) % 360) * Math.PI / 180,
    dayNum,
    dateStr,
  };
}

function getPuzzleAnswer(puzzle) {
  return {
    outer: OUTER_SHAPES[puzzle.outerIdx],
    inner: INNER_SHAPES[puzzle.innerIdx],
    ratio: RATIOS[puzzle.ratioIdx],
    pen:   PENS[puzzle.penIdx],
  };
}
```

- [ ] **Step 4: Verify in browser console**

Open dev console, run `getDailyPuzzle()` and `getPuzzleAnswer(getDailyPuzzle())`. Verify valid indices (0-3), rotation in radians, and shape name strings.

- [ ] **Step 5: Commit**

```bash
git add spirle.html
git commit -m "feat(spirle): add shape engine and daily puzzle seeding"
```

---

### Task 3: Target Spirograph Rendering with Progressive Reveal

**Files:**
- Modify: `spirle.html` (inside `<script>` tag)

Draw the daily puzzle's spirograph on the target canvas with rotation and progressive lap reveal.

- [ ] **Step 1: Add target point computation**

The function `computeTargetPoints(answer, puzzle, laps)` pre-computes all trace points:
1. Create shapes via `makeShape(answer.outer)` and `makeShape(answer.inner)`
2. Build arc tables for both
3. Compute maxR from outer shape for scaling
4. Loop `dist` from 0 to `atA.totalLen * laps` in steps of 0.04
5. At each step: compute rolling point (same math as brewer.html lines 340-356), apply rotation via `cosR/sinR`, store `{x, y, maxR}` in array
6. Return the points array

The rolling computation per step:
- `thetaA = arc2theta(atA.table, dist % atA.totalLen)`
- Get tangent via numerical derivative, compute inward normal
- `thetaB = arc2theta(atB.table, (dist % bPer) / answer.ratio)` where `bPer = atB.totalLen * answer.ratio`
- Center of B = contactPoint + normal * clampedRB
- Pen position = centerB + penDist * (cos(rot), sin(rot)) where rot = thetaA - thetaB and penDist = answer.pen * answer.ratio
- Apply puzzle rotation: `rx = penX*cosR - penY*sinR`, `ry = penX*sinR + penY*cosR`

- [ ] **Step 2: Add progressive drawing animation**

- `drawTarget()` — draws 3 points per frame using `requestAnimationFrame`. For each point, draws a line segment from previous point. Skip segments with jumps > 30% of canvas width. Color: purple-violet gradient `hsla(265 + progress*60, 65%, 58±12%, 0.8)`. LineWidth 1.5, round caps.
- `redrawTargetInstant()` — redraws all points up to `drawIdx` immediately (for resize)
- `revealMoreLaps(newLapCount)` — recomputes points at new lap count, sets drawIdx to old point count, resumes animation from there
- `startTarget()` — initializes canvas, computes initial points at 2 laps, starts animation

- [ ] **Step 3: Add initialization**

```javascript
const currentPuzzle = getDailyPuzzle();
const currentAnswer = getPuzzleAnswer(currentPuzzle);
document.getElementById('puzzleNum').textContent = '#' + currentPuzzle.dayNum;
startTarget();
```

Wire `window.addEventListener('resize', redrawTargetInstant)`.

- [ ] **Step 4: Verify in browser**

- Spirograph draws progressively in purple/violet
- Pattern is rotated (not axis-aligned)
- Only ~2 laps — sparse, shape not obvious
- Resize redraws instantly

- [ ] **Step 5: Commit**

```bash
git add spirle.html
git commit -m "feat(spirle): target spirograph rendering with progressive reveal and rotation"
```

---

### Task 4: Icon Renderers (Shapes, Size, Reach)

**Files:**
- Modify: `spirle.html` (inside `<script>` tag)

Canvas renderers for the visual icons used in pickers and guess cells.

- [ ] **Step 1: Add feedback color constants**

```javascript
const FEEDBACK_COLORS = {
  intune: 'rgba(106, 234, 154, 0.75)',
  close:  'rgba(232, 200, 90, 0.75)',
  off:    'rgba(90, 90, 110, 0.4)',
  neutral:'rgba(168, 152, 255, 0.7)',
  confirmed: 'rgba(106, 234, 154, 0.7)',
};
```

- [ ] **Step 2: Add canvas init helper**

`initCanvas(canvas, size)` — sets canvas dimensions to `size * devicePixelRatio`, sets style width/height to `size + 'px'`, applies DPR transform, returns ctx.

- [ ] **Step 3: Add shape icon renderer**

`drawShapeIcon(canvas, shapeName, color, size)`:
1. Init canvas at given size
2. Create shape via `makeShape(shapeName)`
3. Sample 200 points to find maxR
4. Scale = (size/2) * 0.7 / maxR
5. Stroke 300-point closed path at given color, lineWidth 1.5

- [ ] **Step 4: Add size icon renderer**

`drawSizeIcon(canvas, level, color, size)` where level is 0-3:
- Draw a filled+stroked circle centered in canvas
- Radii: `[0.18, 0.3, 0.42, 0.56]` * size / 2
- Fill with color at 0.12 opacity, stroke with color at full opacity

- [ ] **Step 5: Add reach icon renderer**

`drawReachIcon(canvas, level, color, size)` where level is 0-3:
- Center dot (1.2px radius, color at 0.25 opacity)
- Arm line from center to dot position (color at 0.25 opacity, 0.8px)
- Pen dot at distance `[0.12, 0.22, 0.32, 0.42]` * size from center (2.5px radius, full color)

- [ ] **Step 6: Add unified dispatcher**

```javascript
function drawIcon(canvas, paramType, valueIdx, color, size) {
  if (paramType === 'outer') drawShapeIcon(canvas, OUTER_SHAPES[valueIdx], color, size);
  else if (paramType === 'inner') drawShapeIcon(canvas, INNER_SHAPES[valueIdx], color, size);
  else if (paramType === 'size') drawSizeIcon(canvas, valueIdx, color, size);
  else if (paramType === 'reach') drawReachIcon(canvas, valueIdx, color, size);
}
```

- [ ] **Step 7: Commit**

```bash
git add spirle.html
git commit -m "feat(spirle): icon renderers for shapes, size, and reach"
```

---

### Task 5: Guess Grid + Parameter Pickers (Dynamic DOM)

**Files:**
- Modify: `spirle.html` (inside `<script>` tag)

Generate the 6 guess rows and 4 picker groups dynamically. Wire up tap-to-select.

- [ ] **Step 1: Add game state variables**

```javascript
const PARAM_TYPES = ['outer', 'inner', 'size', 'reach'];
const PARAM_LABELS = ['Outer Shape', 'Inner Shape', 'Size', 'Reach'];
const MAX_GUESSES = 6;

let guesses = [];       // array of { outer: idx, inner: idx, size: idx, reach: idx }
let feedback = [];       // array of arrays of 'intune'|'close'|'off'
let currentSelection = { outer: null, inner: null, size: null, reach: null };
let gameOver = false;
```

- [ ] **Step 2: Build guess grid rows**

`buildGuessRows()`: Create 6 `.guess-row` divs, each with 4 `.guess-cell.cell-empty` divs. Append to `#guessGrid`. Cell IDs: `cell-${row}-${col}`.

- [ ] **Step 3: Build pickers**

`buildPickers()`: Create 2 `.picker-row` divs, each with 2 `.picker-group` divs. Each group has a label and a `.picker-options` container with 4 `.picker-option` divs. Each option contains a canvas drawn via `drawIcon()` with neutral color at size 28. Add click handler `onPickerTap(paramType, valueIdx, optEl)`. Append to `#pickersArea`.

- [ ] **Step 4: Add picker interaction**

`onPickerTap(paramType, valueIdx, optEl)`:
1. If gameOver, return
2. Remove `.selected` from all non-confirmed, non-eliminated options in the same picker group
3. Add `.selected` to tapped option
4. Set `currentSelection[paramType] = valueIdx`
5. Call `updateCurrentRowPreview()` and `checkRollReady()`

`updateCurrentRowPreview()`: For the current guess row (index = `guesses.length`), update each cell: if selection exists, set class to `cell-pending` and draw icon with purple color. If null, set class to `cell-empty` and clear content.

`checkRollReady()`: Enable Roll button if all 4 currentSelection values are non-null.

`updateGuessCount()`: Set `#guessCount` text to `${guesses.length + 1} of 6`.

Call `buildGuessRows()`, `buildPickers()`, `updateGuessCount()` during init.

- [ ] **Step 5: Verify in browser**

- 6 empty guess rows visible
- 4 picker groups with icons
- Tapping highlights with purple border
- Tapping all 4 enables Roll button
- Current row previews selections

- [ ] **Step 6: Commit**

```bash
git add spirle.html
git commit -m "feat(spirle): dynamic guess grid and picker interaction"
```

---

### Task 6: Guess Submission + Feedback Logic

**Files:**
- Modify: `spirle.html` (inside `<script>` tag)

The core game logic: submit guess, compute feedback, update grid, reveal laps, detect win/loss.

- [ ] **Step 1: Add feedback computation**

```javascript
function computeFeedback(guess) {
  const answerIndices = [
    currentPuzzle.outerIdx, currentPuzzle.innerIdx,
    currentPuzzle.ratioIdx, currentPuzzle.penIdx,
  ];
  const guessIndices = [guess.outer, guess.inner, guess.size, guess.reach];
  return guessIndices.map((g, i) => {
    if (g === answerIndices[i]) return 'intune';
    if (Math.abs(g - answerIndices[i]) === 1) return 'close';
    return 'off';
  });
}
```

- [ ] **Step 2: Add lap schedule**

```javascript
const LAPS_SCHEDULE = [2, 3.5, 5, 6.5, 8, 9.5, 12];
```

Index 0 = initial (2 laps), index 1 = after guess 1 (3.5 laps), etc.

- [ ] **Step 3: Add guess submission**

Wire Roll button click to `submitGuess()`:
1. Guard: if gameOver or not all selected, return
2. Build guess object from currentSelection
3. Compute feedback
4. Push to guesses and feedback arrays
5. Call `animateFeedback(rowIdx, guess, fb)`

- [ ] **Step 4: Add feedback animation**

`animateFeedback(rowIdx, guess, fb)`: Reveal cells left-to-right with 200ms delay between each. For each cell: set class to `cell-${state}`, clear content, create canvas, draw icon with feedback color at size 26. After all 4 revealed, call `onFeedbackComplete(rowIdx, fb)`.

- [ ] **Step 5: Add post-feedback logic**

`onFeedbackComplete(rowIdx, fb)`:
1. Call `updatePickerStates()`
2. If all intune: `gameOver = true`, call `onWin()`
3. If guesses.length >= 6: `gameOver = true`, call `onLose()`
4. Otherwise: `revealMoreLaps(LAPS_SCHEDULE[guesses.length])`, `resetSelectionForNextGuess()`, `updateGuessCount()`, disable Roll

- [ ] **Step 6: Add picker state updates**

`updatePickerStates()`: For each param, scan all guesses to find confirmed index (intune) and off indices. Update picker options: confirmed get `.confirmed` class + green icon, off get `.eliminated`, if param is confirmed then all non-confirmed options get eliminated. Update currentSelection for confirmed params.

`resetSelectionForNextGuess()`: Clear currentSelection for non-confirmed params. Call `updateCurrentRowPreview()`.

- [ ] **Step 7: Add win/lose handlers**

`onWin()`: Reveal 12 laps, change Roll button text to "Share", update guess count to "In tune!", save stats.

`onLose()`: Reveal 12 laps, change Roll button text to "Share", show answer in guess count, save stats.

- [ ] **Step 8: Verify in browser**

Play through a full game:
- Feedback colors appear correctly
- Eliminated options dimmed, confirmed green
- Target reveals more laps per guess
- Win/lose detection works

- [ ] **Step 9: Commit**

```bash
git add spirle.html
git commit -m "feat(spirle): guess submission, feedback logic, progressive reveal on guess"
```

---

### Task 7: Sharing + Statistics + localStorage Persistence

**Files:**
- Modify: `spirle.html` (inside `<script>` tag)

- [ ] **Step 1: Add share function**

`shareResult()`: Build emoji string from feedback array (intune=🟢, close=🟡, off=⚫). Header: `Spirle #${dayNum} 🎵 ${guessCount}/6`. Copy to clipboard via `navigator.clipboard.writeText()`. Flash "Copied!" in guess count for 2 seconds.

Wire to Roll button after game over (replace submitGuess handler).

- [ ] **Step 2: Add stats persistence**

`loadStats()`: Read `spirle-stats` from localStorage, parse JSON. Default: `{ played: 0, won: 0, streak: 0, maxStreak: 0, distribution: [0,0,0,0,0,0] }`.

`saveStats(won)`: Load stats, increment played, if won: increment won/streak/maxStreak and distribution[guessCount-1], else reset streak. Write to localStorage.

- [ ] **Step 3: Add stats modal rendering**

`renderStats()`: Build stats display DOM using `document.createElement` (not innerHTML with user data). Show: played, win%, streak, maxStreak as big numbers. Distribution as horizontal bars. Highlight current game's bar if won.

Wire `#btnStats` click to open modal with rendered stats. Wire close button and overlay click to dismiss.

- [ ] **Step 4: Add settings modal**

Wire `#btnSettings` to open modal with hard mode checkbox toggle. Store in localStorage as `spirle-hardmode`. Prevent toggling mid-game (if guesses > 0 and not gameOver, reject the change).

Hard mode: in `onFeedbackComplete`, skip `revealMoreLaps()` call when hardMode is true.

- [ ] **Step 5: Add game state persistence**

`saveGameState()`: Write `{ dateStr, guesses, feedback, gameOver }` to localStorage key `spirle-state`. Call after each guess feedback completes.

`loadGameState()`: Read from localStorage. Return null if dateStr doesn't match today.

`restoreGameState()`: If saved state exists for today:
1. Replay all guesses into grid (instant, no animation) — fill cells with correct feedback classes and icons
2. Set targetMaxLaps to match progress
3. Recompute and redraw target at correct lap count
4. Update picker states
5. If gameOver, configure Share button

Call `restoreGameState()` at end of init, after all DOM and patches are built.

- [ ] **Step 6: Verify in browser**

- Make 2 guesses, refresh — state preserved
- Complete game, tap Share — emoji grid in clipboard
- Stats modal shows correct numbers
- Hard mode setting persists

- [ ] **Step 7: Commit**

```bash
git add spirle.html
git commit -m "feat(spirle): sharing, statistics, localStorage persistence, hard mode"
```

---

### Task 8: Sound Design (Web Audio)

**Files:**
- Modify: `spirle.html` (inside `<script>` tag)

- [ ] **Step 1: Add audio system**

- Lazy-init `AudioContext` on first user interaction
- `playTone(freq, duration, gain, type)`: Create oscillator + gain node, exponential ramp to silence, auto-stop
- `playFeedbackSound(state, cellIndex)`: Base frequencies [262, 330, 392, 523] (C4, E4, G4, C5).
  - intune: sine at base freq, 0.6s, gain 0.12
  - close: triangle at base * 0.991 (15 cents flat), 0.4s, gain 0.08
  - off: sine at base * 0.5, 0.15s, gain 0.05
- `playWinSound()`: Staggered chord — all 4 base freqs with 80ms delays, 1.5s sustain

- [ ] **Step 2: Wire sound into feedback animation**

In `animateFeedback`, call `playFeedbackSound(state, cellIdx)` for each cell as it reveals.
In `onWin`, call `playWinSound()`.

- [ ] **Step 3: Add sound toggle**

Read `spirle-sound` from localStorage (default true). Toggle via `#btnSound` click. Add `.active` class to button when enabled. Store preference on toggle.

- [ ] **Step 4: Verify**

- Feedback reveals play tones
- Win plays sustained chord
- Mute button silences everything
- Preference persists across refresh

- [ ] **Step 5: Commit**

```bash
git add spirle.html
git commit -m "feat(spirle): Web Audio feedback sounds — chimes, chords, and win fanfare"
```

---

### Task 9: Final Testing + Polish

**Files:**
- Modify: `spirle.html`

- [ ] **Step 1: Verify initialization order**

Ensure at the bottom of `<script>`, the order is:
1. Shape engine + constants (Tasks 2, 4)
2. Game state variables (Task 5)
3. DOM builders: `buildGuessRows()`, `buildPickers()` (Task 5)
4. Target init: `startTarget()` (Task 3)
5. Sound setup (Task 8)
6. `restoreGameState()` — must be last (Task 7)

- [ ] **Step 2: Test full game flow**

Manual test checklist:
1. Fresh game: target draws ~2 laps, pick all 4, Roll, feedback animates with sound, target adds laps
2. Win: all correct → "In tune! 🎵", Share button works, emoji grid in clipboard
3. Lose: 6 wrong guesses → answer shown, Share works
4. Refresh persistence: 2 guesses, refresh → guesses and laps restored
5. Daily reset: different date → new puzzle, old state cleared
6. Hard mode: enable, guess → target stays at 2 laps
7. Stats: play game, open stats → numbers correct
8. Resize: target redraws, no scrolling
9. Sound toggle: mutes/unmutes, persists

- [ ] **Step 3: Commit**

```bash
git add spirle.html
git commit -m "feat(spirle): polish and verify full game flow"
```

---

## Summary

| Task | What | Commits |
|------|------|---------|
| 1 | HTML/CSS scaffold | 1 |
| 2 | Shape engine + puzzle seeding | 1 |
| 3 | Target rendering + progressive reveal | 1 |
| 4 | Icon renderers | 1 |
| 5 | Guess grid + pickers | 1 |
| 6 | Guess submission + feedback | 1 |
| 7 | Sharing + stats + persistence | 1 |
| 8 | Sound design | 1 |
| 9 | Final testing + polish | 1 |

Total: 9 tasks, 9 commits, 1 file.

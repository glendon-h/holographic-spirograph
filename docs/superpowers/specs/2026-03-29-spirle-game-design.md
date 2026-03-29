# Spirle — Daily Spirograph Guessing Game

## Overview

A NYT Games-style daily puzzle where players study a progressively-revealed spirograph pattern and guess the four parameters that produced it. Inspired by the holographic spirograph engine's parameterized shape system.

**Core concept:** You see a spirograph drawing itself. You deduce which shapes, size, and reach created it. Submit your guess, get feedback, the pattern reveals more. Narrow it down in 6 tries.

## Game Loop

1. **Open the game** — today's target spirograph begins drawing (~2 laps visible initially)
2. **Study the pattern** — watch curves form, notice symmetry, petal count, tightness, reach
3. **Build your guess** — tap to select one value for each of the 4 parameters
4. **Submit ("Roll")** — guess row locks in, each parameter gets feedback, target draws 1-2 more laps
5. **Repeat** — up to 6 guesses, pattern progressively reveals with each guess
6. **Win/lose** — win: satisfying chord + full reveal. Lose: answer revealed gently
7. **Share** — copy emoji grid showing your path to the answer

Players can guess at any point — early guess = less information but more impressive. Each guess rewards the player with more of the pattern.

## Target Rendering

The target spirograph is rendered with two key techniques to prevent the answer being visually obvious:

### Fewer Laps
The pattern starts with only ~2 laps drawn. This produces sparse, ambiguous curves where the outer shape's silhouette is not apparent. Each guess adds 1-2 more laps, so by guess 6 the full pattern (~12 laps) is visible.

### Random Rotation
The entire pattern is rotated by a random angle (seeded from the daily puzzle). A heart at 212° doesn't read as "heart" — the player must study curve behavior rather than recognizing a silhouette.

### Lap Progression
| State | Laps Visible |
|-------|-------------|
| Initial | ~2 |
| After guess 1 | ~3.5 |
| After guess 2 | ~5 |
| After guess 3 | ~6.5 |
| After guess 4 | ~8 |
| After guess 5 | ~9.5 |
| After guess 6 / win / lose | Full (~12) |

## Parameter Space

4×4×4×4 grid = **256 possible combinations**.

### Outer Shape (smooth shapes only)

The outer rolling shape must be smooth to produce readable patterns.

| # | Shape | Character |
|---|-------|-----------|
| 1 | Circle | Smooth, symmetric, classic |
| 2 | Heart | Asymmetric, organic, warm |
| 3 | Blob | Irregular, soft, unpredictable |
| 4 | Starfish | 5-fold but rounded, organic |

### Inner Shape (any shape)

| # | Shape | Character |
|---|-------|-----------|
| 1 | Circle | Smooth, simple rolling |
| 2 | Star | Sharp, geometric, 5-pointed |
| 3 | Trefoil | 3-fold symmetry, clover-like |
| 4 | Butterfly | Complex, winged, dramatic |

### Size (ratio of inner to outer)

Presented visually as a circle at 4 different sizes — no numbers shown to the player.

Internal values: `0.2` · `0.3` · `0.4` · `0.5`

### Reach (pen distance from inner shape's center)

Presented visually as a dot at 4 different distances along an arm from center — no numbers shown to the player.

Internal values: `0.4` · `0.6` · `0.8` · `1.0`

### Shape Pool Rotation

The 4-shape pools are designed to be swappable. When the game needs freshening (~8-9 months of dailies), new shapes rotate in and the combination space resets. Could also do seasonal pools.

## Feedback System

Each of the 4 parameters in a guess receives one of three feedback states:

| Feedback | Meaning | Visual | Sound |
|----------|---------|--------|-------|
| **In tune** | Exact match | Bright green, stands out | Clear resonant chime |
| **Close** | One step away in the parameter's ordered list | Warm yellow | Softer, slightly detuned note |
| **Off** | 2+ steps away | Dim gray, recedes | Dull, muted tap |

### "Close" Definition

Each parameter is an ordered list of 4 values. "Close" means adjacent in that list:

- **Outer Shape:** Circle ↔ Heart ↔ Blob ↔ Starfish (ordered by visual similarity)
- **Inner Shape:** Circle ↔ Star ↔ Trefoil ↔ Butterfly
- **Size:** 0.2 ↔ 0.3 ↔ 0.4 ↔ 0.5 (natural order)
- **Reach:** 0.4 ↔ 0.6 ↔ 0.8 ↔ 1.0 (natural order)

Shape orderings should be tuned so that adjacent shapes look somewhat similar, making "close" feedback visually meaningful.

### Guess History Grid

Rows stack top to bottom (like Wordle). Each row has 4 cells showing the guessed value as a **visual icon** (shape silhouette, size circle, or reach dot) with feedback color as background. No text in the grid — all visual. Scanning down a column lets you track elimination progress for that parameter.

### Parameter Picker State

After each guess, the parameter picker updates:
- **In tune** values: locked in with green highlight, no longer tappable
- **Off** values: dimmed/faded in the picker to prevent wasted guesses
- **Close** values: remain normal/selectable

## Interface

### Layout: Single-Screen Mobile-First

Everything fits on one screen — no scrolling. Single vertical flow:

1. **Header** — "SPIRLE #N", sound toggle, stats, settings
2. **Target spirograph** — circular canvas (~180px), pattern draws progressively
3. **Guess history** — 6 compact rows of 4 icon cells, feedback-colored
4. **Divider**
5. **Parameter picker** — 2×2 grid of groups (Outer Shape, Inner Shape, Size, Reach), each with 4 tappable icon options in a 1×4 row
6. **Roll button** — submits the guess

### Fully Visual Interface

No text values anywhere in the game grid or pickers:
- **Shape pickers** show actual curve silhouettes rendered from the engine
- **Size picker** shows circles at 4 different sizes
- **Reach picker** shows a dot at 4 different distances from center along an arm
- **Guess cells** use the same icons as the pickers, tinted by feedback color

The only text labels are the group headers ("Outer Shape", "Inner Shape", "Size", "Reach") and the column headers on the guess grid.

### Interaction

All interaction is tap-based. No dragging, no sliders, no precision input.

- Tap a shape/size/reach option → it highlights as selected
- Tap Roll → guess submits, cells resolve left-to-right with staggered delay, target draws more laps
- Tap Share → copies emoji grid to clipboard

### Visual Design

- Dark theme — spirograph lines glow against dark background
- Purple/violet palette for the spirograph trace, shifting hue as it draws
- Consistent with the holographic spirograph aesthetic (glow, dark canvas)
- Shape thumbnails rendered from the actual math engine
- No scrolling on any phone screen

## Sound Design

Minimal, additive, not required to play.

### Per-Guess Feedback

The 4 parameter cells resolve left-to-right with a short delay between each. Each cell plays a tone based on its feedback state. The 4 tones naturally form a chord:
- All **in tune** = perfect, harmonious chord
- Mixed = tension and partial resolution
- All **off** = flat, scattered, no harmony

### Win/Lose

- **Win:** Chord sustains and rings out. Target spirograph redraws at full speed as a victory lap with all laps.
- **Lose:** Gentle reveal. Answer shown with soft tone. Full pattern draws out. No punishment sound.

### Implementation

Web Audio API with synthesized tones. No audio files to load. Mute button in header, preference saved to localStorage.

## Daily Puzzle System

### Seeding

Deterministic from date — a hash of `YYYY-MM-DD` indexes into the 256 combinations and determines the rotation angle. No server required. Everyone gets the same puzzle client-side.

### Daily Reset

Midnight local time.

### Hard Mode

The target spirograph does not reveal additional laps on guesses — stays at the initial ~2 laps throughout. Same 6 guesses. Toggled in settings, tracked separately in stats.

### Statistics (localStorage)

- Games played
- Win rate (%)
- Current streak / max streak
- Guess distribution bar chart (1-6)
- Hard mode: separate tracking for all above

## Sharing

After win or loss, players can copy an emoji grid:

```
Spirle #42 🎵 3/6

🟢🟡🟡⚫
🟢🟢🟢🟡
🟢🟢🟢🟢
```

- 🟢 = in tune
- 🟡 = close
- ⚫ = off
- Header includes puzzle number and guess count
- 🎵 is the resonance theme marker

## Technical Notes

### Reusing the Spirograph Engine

The game reuses the existing shape engine from the holographic spirograph project:
- Superformula shapes (circle, star, starfish, blob)
- Fourier shapes (heart, trefoil, butterfly)
- Arc-length parameterization for smooth rolling
- Rolling point computation for trace generation

The game wraps this engine with a fixed parameter space and game logic — no modifications to the core math needed.

### Architecture

Single HTML file (like brewer.html), standalone. Contains:
- Spirograph engine (shared math functions)
- Game state management
- Canvas rendering (2D, no Three.js needed)
- Web Audio synthesis
- localStorage persistence

No build step, no server, no dependencies.

### Canvas Rendering

- Target spirograph draws progressively using `requestAnimationFrame`
- Points computed via rolling point computation with incrementing arc parameter
- Rotation applied to all drawn points before rendering
- Lap count controlled by game state (initial + guesses made)
- All icons (shapes, size circles, reach dots) rendered to small canvases via the same engine

## Future Expansion Paths

These are deliberately out of scope for v1 but documented as validated ideas:

### Visual Workbench Mode (Approach B)
Live side-by-side comparison — your guess spirograph draws alongside the target. More visually engaging but significantly more rendering and UX complexity. Natural v2 feature.

### Reveal Moments (Approach C)
Hybrid: grid-based feedback for speed, but submission triggers a brief animation of your guess drawing, and win/loss gets a cinematic side-by-side replay.

### Curated Puzzle Lists
Hand-pick combinations that produce the most visually distinct and interesting patterns, rather than pure date-hash indexing. Allows difficulty tuning and avoids degenerate combinations.

### Seasonal Shape Pools
Rotate new shapes into the 4×4 pools periodically to keep the game fresh and reset the combination space.

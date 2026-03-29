# Spirle — Daily Spirograph Guessing Game

## Overview

A NYT Games-style daily puzzle where players study a progressively-revealed spirograph pattern and guess the four parameters that produced it. Inspired by the holographic spirograph engine's parameterized shape system.

**Core concept:** You see a spirograph drawing itself. You deduce which shapes, ratio, and pen offset created it. Submit your guess, get feedback, narrow it down in 6 tries.

## Game Loop

1. **Open the game** — today's target spirograph begins drawing itself progressively (~30 second full reveal)
2. **Study the pattern** — watch curves form, notice symmetry, petal count, tightness, pen reach
3. **Build your guess** — tap to select one value for each of the 4 parameters
4. **Submit ("Roll")** — guess row locks in, each parameter gets feedback
5. **Repeat** — up to 6 guesses
6. **Win/lose** — win: satisfying chord + victory lap redraw. Lose: answer revealed gently
7. **Share** — copy emoji grid showing your path to the answer

Players can guess at any point during or after the reveal — no need to wait for the full draw.

## Parameter Space

4×4×4×4 grid = **256 possible combinations**.

### Shape A — Outer (smooth shapes only)

The outer rolling shape must be smooth to produce readable patterns.

| # | Shape | Character |
|---|-------|-----------|
| 1 | Circle | Smooth, symmetric, classic |
| 2 | Heart | Asymmetric, organic, warm |
| 3 | Blob | Irregular, soft, unpredictable |
| 4 | Starfish | 5-fold but rounded, organic |

### Shape B — Inner (any shape)

| # | Shape | Character |
|---|-------|-----------|
| 1 | Circle | Smooth, simple rolling |
| 2 | Star | Sharp, geometric, 5-pointed |
| 3 | Trefoil | 3-fold symmetry, clover-like |
| 4 | Butterfly | Complex, winged, dramatic |

### Ratio (size of B relative to A)

`0.2` · `0.3` · `0.4` · `0.5`

### Pen Offset (distance from B's center)

`0.4` · `0.6` · `0.8` · `1.0`

### Shape Pool Rotation

The 4-shape pools are designed to be swappable. When the game needs freshening (~8-9 months of dailies), new shapes rotate in and the combination space resets. Could also do seasonal pools.

## Feedback System

Each of the 4 parameters in a guess receives one of three feedback states:

| Feedback | Meaning | Visual | Sound |
|----------|---------|--------|-------|
| **In tune** | Exact match | Bright, filled, stands out | Clear resonant chime |
| **Close** | One step away in the parameter's ordered list | Muted, warm | Softer, slightly detuned note |
| **Off** | 2+ steps away | Dim, recedes | Dull, muted tap |

### "Close" Definition

Each parameter is an ordered list of 4 values. "Close" means adjacent in that list:

- **Shape A:** Circle ↔ Heart ↔ Blob ↔ Starfish (ordered by visual similarity)
- **Shape B:** Circle ↔ Star ↔ Trefoil ↔ Butterfly
- **Ratio:** 0.2 ↔ 0.3 ↔ 0.4 ↔ 0.5 (natural numeric order)
- **Pen:** 0.4 ↔ 0.6 ↔ 0.8 ↔ 1.0 (natural numeric order)

Shape orderings should be tuned so that adjacent shapes look somewhat similar, making "close" feedback visually meaningful.

### Guess History Grid

Rows stack top to bottom (like Wordle). Each row has 4 cells showing the guessed value and feedback color. Scanning down a column lets you track elimination progress for that parameter.

### Parameter Picker State

After each guess, the parameter picker updates:
- **In tune** values: locked in, highlighted
- **Off** values: dimmed in the picker to prevent wasted guesses
- **Close** values: remain normal/selectable

## Interface

### Layout: Top-Down Mobile-First

Single vertical flow, no side panels:

1. **Header** — "SPIRLE #N", sound toggle, settings, hard mode indicator
2. **Target spirograph** — circular canvas, the pattern draws progressively
3. **Guess history** — rows of 4 feedback-colored cells stacking downward
4. **Parameter picker** — 4 groups (Outer Shape, Inner Shape, Ratio, Pen), each with 4 tappable options in a 2×2 or 1×4 grid
5. **Roll button** — submits the guess, disabled until all 4 parameters selected

### Interaction

All interaction is tap-based. No dragging, no sliders, no precision input.

- Tap a shape thumbnail → it highlights as selected for that parameter
- Tap a ratio/pen value → it highlights
- Tap Roll → guess submits, cells resolve left-to-right with staggered delay
- Tap Share → copies emoji grid to clipboard

### Visual Design

- Dark theme — spirograph lines glow against dark background, consistent with the holographic spirograph aesthetic
- Palette to be refined during implementation — should evoke the bloom/glow feel of the main app, not generic dark mode
- Shape thumbnails in the picker show the actual curve silhouettes, not just names
- Responsive: works on phone screens without horizontal scrolling

## Sound Design

Minimal, additive, not required to play.

### Per-Guess Feedback

The 4 parameter cells resolve left-to-right with a short delay between each. Each cell plays a tone based on its feedback state. The 4 tones naturally form a chord:
- All **in tune** = perfect, harmonious chord
- Mixed = tension and partial resolution
- All **off** = flat, scattered, no harmony

### Win/Lose

- **Win:** Chord sustains and rings out. Target spirograph redraws at full speed as a victory lap.
- **Lose:** Gentle reveal. Answer shown with soft tone. No punishment sound.

### Implementation

Web Audio API with synthesized tones. No audio files to load. Mute button in header, preference saved to localStorage.

## Daily Puzzle System

### Seeding

Deterministic from date — a hash of `YYYY-MM-DD` indexes into the 256 combinations. No server required. Everyone gets the same puzzle client-side.

### Daily Reset

Midnight local time.

### Hard Mode

The target spirograph stops drawing after ~5 seconds (~15-20% of the curve). Player works from a fragment. Same 6 guesses. Toggled in settings, tracked separately in stats.

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
- Superformula shapes (circle, star, flower, starfish, blob)
- Fourier shapes (heart, trefoil, butterfly)
- Arc-length parameterization for smooth rolling
- `computeRollingPoint()` for trace generation

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
- Points computed via `computeRollingPoint()` with incrementing arc parameter
- Hard mode: stop drawing after N points
- Feedback colors applied to guess grid via CSS or canvas overlay

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

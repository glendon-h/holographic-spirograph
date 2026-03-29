# Loople v2 — Weekly Progression, Color, and Harmonic Systems

## 1. Shorter/Lazier Draw

**Problem:** The spirograph reveals too much too fast, making it too easy to identify shapes.

**Changes:**
- Initial reveal: ~1 lap (was 2) — barely a hint
- Draw speed: halved — the pen moves lazily, you watch it think
- Per-guess reveal: ~1.5 additional laps (was ~2.5)
- Lap schedule for 4 guesses: [1, 2.5, 4, 6, 10]
- Full reveal on win/lose stays at 10+ laps

## 2. Daily Color Sets

Each day gets a different hue range for the spirograph trace. This makes each day feel distinct and prevents players from using color as a recognition shortcut across days.

| Day | Hue Range | Character |
|-----|-----------|-----------|
| Mon | 200-260 | Cool blue |
| Tue | 280-340 | Purple-violet |
| Wed | 20-80 | Warm gold-orange |
| Thu | 140-200 | Teal-cyan |
| Fri | 320-380 | Pink-magenta |
| Sat | 80-140 | Green-lime |
| Sun | 0-60 | Red-coral |

The hue shifts within its range as the trace progresses (same as current behavior, just different base).

## 3. Monday-to-Sunday Difficulty Curve

### Shape Pool Rotation

Total library: ~10-12 shapes across complexity tiers.

**Tier 1 (Simple):** Circle, Heart, Blob — smooth, symmetric, recognizable patterns
**Tier 2 (Moderate):** Star, Starfish, Flower, Trefoil — more complex but readable
**Tier 3 (Complex):** Butterfly, Figure-8, Leaf — unusual, hard to distinguish

| Day | Outer Pool (5) | Inner Pool (5) |
|-----|---------------|---------------|
| Mon | Circle, Heart, Blob, Starfish, Flower | Circle, Heart, Star, Blob, Trefoil |
| Tue | Circle, Heart, Blob, Starfish, Flower | Circle, Star, Trefoil, Blob, Starfish |
| Wed | Heart, Blob, Starfish, Flower, Trefoil | Star, Trefoil, Blob, Butterfly, Starfish |
| Thu | Blob, Starfish, Flower, Trefoil, Star | Trefoil, Butterfly, Blob, Starfish, Flower |
| Fri | Starfish, Flower, Trefoil, Star, Butterfly | Butterfly, Blob, Starfish, Flower, Trefoil |
| Sat | Flower, Trefoil, Star, Butterfly, Leaf | Blob, Starfish, Flower, Leaf, Figure-8 |
| Sun | Trefoil, Star, Butterfly, Leaf, Figure-8 | Butterfly, Leaf, Figure-8, Flower, Star |

Monday uses the most recognizable shapes. Sunday uses the weirdest.

### Draw Speed by Day

| Day | Draw Speed | Initial Laps |
|-----|-----------|-------------|
| Mon | Normal | 1.5 |
| Tue | Normal | 1.2 |
| Wed | Slower | 1.0 |
| Thu | Slower | 1.0 |
| Fri | Lazy | 0.8 |
| Sat | Lazy | 0.8 |
| Sun | Very lazy | 0.6 |

## 4. Weekly Harmonic Chord System

### Concept

Playing each day adds a voice to a weekly chord. By Sunday, if you've played all 7 days, you hear a full 7-voice chord on completion. The chord changes weekly so it's always fresh.

### Mechanics

- **Threshold: played, not won.** Submitting at least one guess counts. You don't need to solve it.
- **Tracking:** localStorage stores `{ weekId: 'YYYY-WNN', daysPlayed: [0,1,2,3,4,5,6] }` where weekId is ISO week number.
- **Streak display:** The 4 guess dots could be supplemented by 7 small music note indicators somewhere (header? below dots?) showing which days you've played this week.

### Sound Design

Each day contributes one note to the chord. The notes form a progression that resolves on Sunday.

**Week chord structure:**
- Mon: Root note (e.g., C4)
- Tue: + Third (E4)
- Wed: + Fifth (G4) — now a basic triad
- Thu: + Seventh (B4) — major 7th chord
- Fri: + Ninth (D5) — extended jazz chord
- Sat: + Eleventh (F5) — lush, almost complete
- Sun: + Thirteenth (A5) — full resolution

The specific root note changes weekly (seeded from week number) so each week's chord sounds different: C major 13, D major 13, etc.

**When do you hear it?**
- On each guess's feedback, you hear the chord voiced with however many days you've played this week
- On win, the full accumulated chord rings out
- If you've played all 7 days and win on Sunday, you get the complete chord — a special moment

**Tone qualities by day:**
- Mon-Tue: Simple sine waves (clean, pure)
- Wed-Thu: Add triangle waves (warmer)
- Fri-Sat: Add subtle harmonics (richer)
- Sun: Full warm tone (the reward)

## Implementation Notes

- Need to add figure-8 and leaf to the shape engine (already in FOURIER_SHAPES from brewer.html)
- Day-of-week: `new Date().getDay()` (0=Sun, 1=Mon, ..., 6=Sat)
- In test mode (?day=N), simulate day-of-week as `N % 7`
- Weekly streak stored separately from daily game state
- The chord system builds on existing Web Audio — just more oscillators and frequencies

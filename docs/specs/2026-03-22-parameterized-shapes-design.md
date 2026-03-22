# Parameterized Shapes — Design Spec

**Date:** 2026-03-22
**Status:** Draft
**Sub-project:** A of 2 (this is shapes; Sub-project B is the emotion server)
**Depends on:** Working holographic spirograph app (complete)

## Overview

Replace the fixed circle-inside-circle hypotrochoid with parameterized shapes that can morph between circles, stars, petals, organic blobs, and arbitrary freeform curves. The spirograph becomes a point on Shape B rolling inside/around Shape A, where both shapes are defined by tunable parameters. This dramatically expands the visual vocabulary and creates the parameter space that the emotion server (Sub-project B) will later target.

## Goals

- Replace the hypotrochoid formula with a general shape-rolling simulation
- Support two shape systems: superformula and Fourier freeform
- Maintain the proven drawing engine (Canvas 2D pen-on-paper, eraser, bloom)
- Keep the same drawing speed and feel
- Create rich presets that showcase the new shape variety
- Build incrementally with visual validation at each step

## Non-Goals

- Emotion server integration (that's Sub-project B)
- Changing the rendering pipeline (Canvas 2D → Three.js bloom stays as-is)
- Pepper's ghost viewport changes

---

## 1. Superformula Shape Engine

### 1.1 The Gielis Superformula

A single superformula shape is defined by 6 parameters:

```
r(θ) = ( |cos(m*θ/4) / a|^n2 + |sin(m*θ/4) / b|^n3 )^(-1/n1)
```

Where:
- **m** — symmetry order (integer or float). m=0 is a circle, m=3 is triangular, m=5 is pentagonal, etc.
- **n1, n2, n3** — shape exponents. Control roundedness vs spikiness. All equal = regular polygon feel. Varied = organic, asymmetric forms.
- **a, b** — scaling (usually both 1.0, tweak for stretch/asymmetry)

To get a Cartesian point from θ:
```
x(θ) = r(θ) * cos(θ)
y(θ) = r(θ) * sin(θ)
```

### 1.2 Parameter Ranges

| Param | Min | Max | Notes |
|-------|-----|-----|-------|
| m | 0 | 12 | 0=circle, fractional values create interesting asymmetries |
| n1 | 0.1 | 10 | Low = spiky/star-like, high = rounded |
| n2 | 0.1 | 10 | Shape character |
| n3 | 0.1 | 10 | Shape character |
| a | 0.5 | 2.0 | Usually 1.0 |
| b | 0.5 | 2.0 | Usually 1.0 |

### 1.3 Known Beautiful Combinations

- Circle: m=4, n1=2, n2=2, n3=2
- Rounded square: m=4, n1=4, n2=4, n3=4
- Star: m=5, n1=0.3, n2=0.3, n3=0.3
- Flower (8 petals): m=8, n1=0.5, n2=0.5, n3=8
- Organic blob: m=3, n1=0.5, n2=1, n3=1
- Astroid: m=4, n1=2, n2=2, n3=2 (with specific a/b)

---

## 2. Fourier Freeform Shapes

### 2.1 Fourier Descriptor Curves

Any closed curve can be approximated by a sum of rotating circles:

```
x(θ) = Σ(k=1..N) Ak * cos(k*θ + φk)
y(θ) = Σ(k=1..N) Bk * sin(k*θ + ψk)
```

Where:
- **N** — number of terms (8-12 is enough for rich shapes)
- **Ak, Bk** — amplitudes for each harmonic
- **φk, ψk** — phase offsets for each harmonic

### 2.2 Parameter Space

Each freeform shape is defined by 4*N parameters (amplitude and phase for x and y at each frequency). For N=8, that's 32 parameters per shape.

To keep this manageable, we use a reduced representation:
- **Term 1** (k=1): base circle size and orientation — A1, B1, φ1, ψ1
- **Terms 2-4**: major shape features (triangle-ness, square-ness, asymmetry)
- **Terms 5-8**: fine detail (bumps, dips, organic variation)

Higher terms have exponentially decreasing max amplitude to prevent chaos.

### 2.3 Known Beautiful Shapes (approximate coefficients)

These can be discovered through experimentation and stored as named presets:
- Heart-like, teardrop, leaf, figure-eight, trefoil, organic blob

---

## 3. Shape-Rolling Simulation

### 3.1 How It Works

Instead of the closed-form hypotrochoid equation, we simulate the rolling numerically:

1. **Shape A** (the fixed outer shape) is defined as a parameterized curve: `A(θ) → (x, y)`
2. **Shape B** (the rolling inner shape) is defined similarly: `B(θ) → (x, y)`
3. At each time step, we:
   a. Advance along Shape A's perimeter by a small arc length
   b. Rotate Shape B so it rolls without slipping along A
   c. Compute the pen point: a point at offset `d` from Shape B's center
4. The pen point traces the spirograph curve

### 3.2 Arc Length Parameterization

Both shapes need to be sampled by arc length (not angle) for smooth rolling. We pre-compute a lookup table of cumulative arc length → θ for each shape, then interpolate.

### 3.3 Rolling Math

At parameter t (which represents distance traveled along Shape A's perimeter):

```
θ_A = arcLengthToAngle_A(t)              // where on A we are
pos_A = A(θ_A)                             // contact point on A
tangent_A = normalize(A'(θ_A))            // tangent at contact point
normal_A = perpendicular(tangent_A)       // inward normal

// Shape B has rolled distance t along its own perimeter
θ_B = arcLengthToAngle_B(t)              // how much B has rotated

// Total rotation of B = angle traversed on A minus angle traversed on B.
// This is the non-circular generalization of the hypotrochoid's (R-r)/r ratio.
rotation = θ_A - θ_B

// Center of B: offset from the contact point along A's inward normal.
// The offset distance is B's centroid-to-boundary distance at B's current
// contact angle (θ_B). For a circle this is just the radius; for a
// superformula shape, evaluate r_B(θ_B) — the polar radius at that angle.
centroid_offset = B_polar_radius(θ_B)
center_B = pos_A + normal_A * centroid_offset

// Pen point is at distance d from center_B, rotated by B's accumulated rotation
pen = center_B + d * (cos(rotation), sin(rotation))
```

**Key clarifications:**
- `B_polar_radius(θ)` is the distance from Shape B's centroid to its boundary at angle θ. For superformula shapes, this is the superformula `r(θ)` directly. For Fourier shapes, evaluate the curve at θ and compute distance from (0,0).
- The rolling constraint is: arc length traveled on A equals arc length traveled on B. This is what makes it "roll without slipping."
- No arbitrary offset term in the rotation — the rotation is purely determined by the rolling constraint.

### 3.4 3D Extension

Same Z oscillation as current: `z(t) = A_z * sin(fz * t + phase_z)`

The shape rolling is 2D; the Z axis adds depth independently.

### 3.5 Performance

The simulation is more expensive than the closed-form hypotrochoid, but we're only computing 4 points per frame per view (our current SEGS_PER_FRAME). The arc length lookup tables are pre-computed once per shape change. This should be comfortably real-time.

---

## 4. Shape Mode System

### 4.1 Four Modes

- **Classic** — original hypotrochoid (circle in circle). Fastest, simplest. Good fallback.
- **Superformula** — both Shape A and Shape B are superformula curves. 12 shape params total (6 per shape) + spirograph params.
- **Freeform** — both shapes are Fourier descriptor curves. Richest, most organic.
- **Mixed** — Shape A is superformula, Shape B is freeform (or vice versa). Deferred to after the first three modes are working.

A setting in the panel lets you choose the mode. The presets include examples for Classic, Superformula, and Freeform modes. Mixed mode is added later as a stretch goal.

### 4.2 Blending Between Modes

When morphing from one pattern to the next, the shapes themselves lerp — superformula params interpolate smoothly (m going from 3 to 5 morphs a triangle into a pentagon), and Fourier coefficients interpolate smoothly by definition.

If transitioning between modes (e.g., superformula → freeform), we convert the superformula to its Fourier approximation first, then lerp the Fourier coefficients.

---

## 5. Updated Parameter Space

The full parameter set for a single spirograph pattern:

### Shape A (outer/fixed)
- mode: 'circle' | 'superformula' | 'freeform'
- superformula: m, n1, n2, n3, a, b
- freeform: A1..A8, B1..B8, φ1..φ8, ψ1..ψ8 (32 params, but controlled via reduced set)

### Shape B (inner/rolling)
- Same param structure as Shape A

### Spirograph behavior
- rollingRatio: how much of B's perimeter maps to A's (analogous to R/r ratio)
- penOffset: distance from B's center (analogous to d)
- direction: inside (hypotrochoid-like) or outside (epitrochoid-like)

### 3D
- A_z: Z amplitude
- fz: Z frequency
- phase_z: Z phase

### Color
- baseHue, saturation, lightness (already exist)

### Motion
- drawSpeed, morphRate (already exist)

---

## 6. Updated Presets

Replace the current `[R, r, d, A, fz, phase]` presets with richer objects:

```js
{
  name: "Starflower",
  shapeMode: "superformula",
  shapeA: { m: 6, n1: 1, n2: 1, n3: 1, a: 1, b: 1 },
  shapeB: { m: 3, n1: 0.5, n2: 0.5, n3: 0.5, a: 1, b: 1 },
  rolling: { ratio: 0.4, penOffset: 0.6, inside: true },
  z: { amplitude: 1.5, frequency: 2.0, phase: 0 },
}
```

Ship with 15-20 curated presets that showcase the range of shapes.

---

## 7. Incremental Build Plan

**Critical:** Build and visually verify at each step. Do not move to the next step until the current one looks right.

1. **Step 1:** Implement superformula function. Render standalone shapes on screen to verify they look correct. Visual checkpoint.
2. **Step 2:** Implement arc-length parameterization for superformula shapes. Visual checkpoint.
3. **Step 3:** Implement shape-rolling simulation with two superformula shapes. Replace the hypotrochoid in the drawing loop. Visual checkpoint — should produce recognizable spirograph-like patterns.
4. **Step 4:** Tune the rolling simulation until the output looks beautiful. Adjust parameter ranges, find good presets. Extended visual checkpoint.
5. **Step 5:** Implement Fourier freeform shapes. Render standalone. Visual checkpoint.
6. **Step 6:** Integrate freeform shapes into the rolling simulation. Visual checkpoint.
7. **Step 7:** Add shape mode selector to settings panel. Wire presets.
8. **Step 8:** Implement smooth shape morphing (lerp between presets). Visual checkpoint.
9. **Step 9:** Create 15-20 curated presets across all modes.

Each step produces a working, visually verifiable result.

---

## 8. Implementation Notes

- The superformula can produce self-intersecting shapes for certain parameters. Clamp parameter ranges to avoid degenerate cases.
- Arc length computation should use numerical integration (Simpson's rule or similar) with enough samples (~500-1000 per shape) for smooth results.
- The rolling simulation may need a correction step to prevent drift — periodically re-align Shape B to the contact point.
- Freeform shapes with too many high-frequency terms look chaotic. Exponentially decay max amplitude for higher terms.
- Keep the classic hypotrochoid mode as an option — it's the fastest and produces known-good results.

---

## 9. Future: Emotion Server Integration (Sub-project B)

This spec intentionally does NOT cover the emotion server. Once parameterized shapes are working, a separate spec will cover:
- Docker container architecture
- Model selection and training
- 42-dimension emotion taxonomy
- Emotion vector → shape+spirograph parameter mapping
- Fine-tuning interface

The parameter space defined here (Section 5) is what the emotion server will target.

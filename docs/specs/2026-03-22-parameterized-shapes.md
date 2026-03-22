# Parameterized Shapes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fixed circle-in-circle spirograph with parameterized superformula and Fourier freeform shapes that produce dramatically more varied and beautiful patterns.

**Architecture:** Each task creates a standalone test HTML file that renders to screen for visual validation. The user reviews each checkpoint before proceeding. Once all pieces work, they get integrated into the main index.html. The shape engine is pure math — no Three.js dependency, just Canvas 2D rendering for testing.

**Tech Stack:** Vanilla JS, Canvas 2D for visual testing, integration into existing index.html (Canvas 2D + Three.js bloom)

**Spec:** `docs/specs/2026-03-22-parameterized-shapes-design.md`

**CRITICAL:** Every task ends with a visual checkpoint. Do NOT proceed to the next task until the user confirms the output looks correct. If it looks wrong, fix it before moving on.

---

## Task 1: Superformula Renderer

**Files:**
- Create: `holographic-spirograph/test-superformula.html`

**Goal:** Render standalone superformula shapes on a black canvas. The user should see beautiful mathematical curves — stars, flowers, rounded polygons, organic blobs — and be able to tweak parameters with sliders.

- [ ] **Step 1: Create test-superformula.html**

A standalone HTML page with:
- Black canvas, centered
- The Gielis superformula: `r(θ) = ( |cos(m*θ/4)/a|^n2 + |sin(m*θ/4)/b|^n3 )^(-1/n1)`
- Draw the shape as a closed curve in a bright color
- Sliders for m (0-12), n1 (0.1-10), n2 (0.1-10), n3 (0.1-10), a (0.5-2), b (0.5-2)
- Shape redraws immediately when sliders change
- Display current parameter values
- Start with a known-good shape: m=5, n1=0.3, n2=0.3, n3=0.3 (five-pointed star)

```js
function superformula(theta, m, n1, n2, n3, a, b) {
  const t = m * theta / 4;
  const r = Math.pow(
    Math.pow(Math.abs(Math.cos(t) / a), n2) +
    Math.pow(Math.abs(Math.sin(t) / b), n3),
    -1 / n1
  );
  return r;
}

// Draw by sampling θ from 0 to 2π, converting polar to cartesian
function drawShape(ctx, cx, cy, scale, params) {
  const { m, n1, n2, n3, a, b } = params;
  const steps = 500;
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * Math.PI * 2;
    const r = superformula(theta, m, n1, n2, n3, a, b) * scale;
    const x = cx + r * Math.cos(theta);
    const y = cy + r * Math.sin(theta);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.strokeStyle = '#88ccff';
  ctx.lineWidth = 2;
  ctx.stroke();
}
```

Include a few preset buttons: "Circle" (m=4,n1=2,n2=2,n3=2), "Star" (m=5,n1=0.3,n2=0.3,n3=0.3), "Flower" (m=8,n1=0.5,n2=0.5,n3=8), "Triangle" (m=3,n1=0.3,n2=0.3,n3=0.3), "Blob" (m=3,n1=0.5,n2=1,n3=1).

- [ ] **Step 2: Visual checkpoint**

Open `http://localhost:3000/test-superformula.html`. User should see:
- A beautiful five-pointed star on black background
- Sliders that morph the shape in real-time
- Preset buttons that snap to known-good shapes
- Shapes should be smooth, centered, and fill ~60% of the canvas

**Wait for user approval before proceeding.**

- [ ] **Step 3: Commit**

```bash
git add test-superformula.html
git commit -m "feat: superformula shape renderer with interactive sliders"
```

---

## Task 2: Arc Length Parameterization

**Files:**
- Modify: `holographic-spirograph/test-superformula.html`

**Goal:** Add arc-length parameterization to the superformula shape. This is needed for smooth rolling — we need to be able to sample the shape by distance traveled along its perimeter, not by angle.

- [ ] **Step 1: Implement arc length lookup table**

Add to the test page:

```js
// Pre-compute cumulative arc length for a shape
function computeArcLengthTable(params, numSamples) {
  const table = [{ theta: 0, arcLen: 0 }];
  let totalLen = 0;
  let prevX = superformula(0, params.m, params.n1, params.n2, params.n3, params.a, params.b);
  let prevPx = prevX * Math.cos(0);
  let prevPy = prevX * Math.sin(0);

  for (let i = 1; i <= numSamples; i++) {
    const theta = (i / numSamples) * Math.PI * 2;
    const r = superformula(theta, params.m, params.n1, params.n2, params.n3, params.a, params.b);
    const px = r * Math.cos(theta);
    const py = r * Math.sin(theta);
    const dx = px - prevPx;
    const dy = py - prevPy;
    totalLen += Math.sqrt(dx * dx + dy * dy);
    table.push({ theta, arcLen: totalLen });
    prevPx = px;
    prevPy = py;
  }
  return { table, totalLen };
}

// Given a target arc length, find the corresponding theta via binary search
function arcLengthToTheta(table, targetLen) {
  let lo = 0, hi = table.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (table[mid].arcLen < targetLen) lo = mid;
    else hi = mid;
  }
  // Lerp between lo and hi
  const frac = (targetLen - table[lo].arcLen) / (table[hi].arcLen - table[lo].arcLen);
  return table[lo].theta + frac * (table[hi].theta - table[lo].theta);
}
```

- [ ] **Step 2: Visualize arc-length sampling**

Draw dots along the shape at equal arc-length intervals (not equal angle intervals). The dots should be evenly spaced along the perimeter regardless of shape curvature — a star's spikes should have the same dot density as its concave regions.

Also draw dots at equal angle intervals in a different color for comparison. The arc-length dots should be clearly more uniform.

- [ ] **Step 3: Visual checkpoint**

User should see:
- Shape drawn as before
- Green dots at equal arc-length intervals — evenly distributed around the perimeter
- Red dots at equal angle intervals — bunched at high-curvature areas
- Clear visible difference showing the arc-length parameterization works

**Wait for user approval before proceeding.**

- [ ] **Step 4: Commit**

```bash
git add test-superformula.html
git commit -m "feat: arc length parameterization for superformula shapes"
```

---

## Task 3: Two-Shape Rolling Simulation

**Files:**
- Create: `holographic-spirograph/test-rolling.html`

**Goal:** Implement the core rolling simulation — Shape B rolling inside Shape A — and render the traced curve. This is the heart of the parameterized spirograph.

- [ ] **Step 1: Create test-rolling.html**

A standalone page that:
- Defines Shape A (outer, fixed) and Shape B (inner, rolling) as superformula shapes
- Simulates B rolling inside A using arc-length parameterization
- Draws the traced pen point as a spirograph curve
- Uses the same slow pen-on-paper drawing style (speed=0.008 equivalent, persistent lines)
- Shows Shape A as a faint outline for reference
- Start with known-good params: Shape A = circle (m=4,n1=2,n2=2,n3=2), Shape B = circle (m=4,n1=2,n2=2,n3=2) — this should reproduce a classic hypotrochoid

The rolling simulation core:

```js
function computeRollingPoint(t, shapeA, shapeB, penOffset, arcTableA, arcTableB) {
  // t = distance traveled along Shape A's perimeter

  // Where on A are we?
  const thetaA = arcLengthToTheta(arcTableA.table, t % arcTableA.totalLen);

  // Contact point on A
  const rA = superformula(thetaA, ...shapeAParams);
  const posAx = rA * Math.cos(thetaA);
  const posAy = rA * Math.sin(thetaA);

  // Tangent and inward normal at contact point (numerical derivative)
  const dt = 0.001;
  const thetaA2 = thetaA + dt;
  const rA2 = superformula(thetaA2, ...shapeAParams);
  const posA2x = rA2 * Math.cos(thetaA2);
  const posA2y = rA2 * Math.sin(thetaA2);
  let tx = posA2x - posAx, ty = posA2y - posAy;
  const tLen = Math.sqrt(tx*tx + ty*ty);
  tx /= tLen; ty /= tLen;
  // Inward normal (perpendicular, pointing toward center)
  let nx = ty, ny = -tx;
  // Make sure normal points inward (toward origin)
  if (nx * posAx + ny * posAy > 0) { nx = -nx; ny = -ny; }

  // How much has B rotated? (arc length on B = arc length on A = t)
  const thetaB = arcLengthToTheta(arcTableB.table, t % arcTableB.totalLen);

  // B's polar radius at contact angle
  const rB = superformula(thetaB, ...shapeBParams);

  // Center of B: offset from contact point along inward normal
  const centerBx = posAx + nx * rB;
  const centerBy = posAy + ny * rB;

  // Rotation of B
  const rotation = thetaA - thetaB;

  // Pen point
  const penX = centerBx + penOffset * Math.cos(rotation);
  const penY = centerBy + penOffset * Math.sin(rotation);

  return { x: penX, y: penY };
}
```

Include sliders for:
- Shape A: m, n1 (simplified — use n1=n2=n3 for now)
- Shape B: m, n1
- Pen offset
- Rolling ratio (scale B's perimeter relative to A)

- [ ] **Step 2: Verify with circles first**

With both shapes as circles, the output should match the classic hypotrochoid. Compare visually with the existing spirograph in index.html to confirm the rolling simulation produces correct results.

- [ ] **Step 3: Visual checkpoint**

User should see:
- Faint outline of Shape A
- A spirograph curve being drawn slowly and persistently
- With circle+circle: should look like the existing spirograph
- Changing Shape A or B to a star/flower should produce wildly different, beautiful patterns

**Wait for user approval before proceeding.**

- [ ] **Step 4: Commit**

```bash
git add test-rolling.html
git commit -m "feat: shape-rolling simulation with superformula shapes"
```

---

## Task 4: Tune the Rolling Simulation

**Files:**
- Modify: `holographic-spirograph/test-rolling.html`

**Goal:** Spend time finding beautiful parameter combinations and fixing any visual issues. This is an artistic tuning task, not a coding task.

- [ ] **Step 1: Identify and fix visual issues**

Common problems to look for:
- Curve jumping or discontinuities (fix: increase arc length table resolution)
- Pen point drifting away from the shape (fix: rolling math error)
- Degenerate shapes that produce noise (fix: clamp parameter ranges)
- Shape too big/small for the canvas (fix: auto-scale based on bounding box)

- [ ] **Step 2: Find 10+ beautiful presets**

Experiment with different Shape A / Shape B combinations. Document presets as:
```js
{ name: "Starflower", shapeA: {...}, shapeB: {...}, penOffset: ..., rollingRatio: ... }
```

Look for:
- Classic-feeling patterns (circle + polygon)
- Organic, flowing patterns (blob + blob)
- Dramatic, pointy patterns (star + star)
- Unexpected beauty (mismatched symmetries)

- [ ] **Step 3: Visual checkpoint**

User reviews the tuned output and the preset collection. This is the "does it look beautiful?" gate.

**Wait for user approval before proceeding.**

- [ ] **Step 4: Commit**

```bash
git add test-rolling.html
git commit -m "feat: tuned rolling simulation with curated presets"
```

---

## Task 5: Fourier Freeform Shapes

**Files:**
- Create: `holographic-spirograph/test-fourier.html`

**Goal:** Implement Fourier descriptor shapes and render them standalone, similar to Task 1 for superformula.

- [ ] **Step 1: Create test-fourier.html**

```js
// Fourier freeform shape: sum of harmonics
function fourierShape(theta, terms) {
  let x = 0, y = 0;
  for (const { k, ax, ay, phiX, phiY } of terms) {
    x += ax * Math.cos(k * theta + phiX);
    y += ay * Math.sin(k * theta + phiY);
  }
  return { x, y };
}

// Convert to polar for compatibility with rolling simulation
function fourierPolarRadius(theta, terms) {
  const p = fourierShape(theta, terms);
  return Math.sqrt(p.x * p.x + p.y * p.y);
}
```

- Render standalone Fourier shapes on black canvas
- Sliders for the first 4 terms (amplitude and phase for each)
- Higher terms (5-8) with smaller max amplitudes
- Preset buttons for: "Heart-like", "Teardrop", "Leaf", "Trefoil", "Organic blob"
- These presets will need to be discovered by experimentation

- [ ] **Step 2: Visual checkpoint**

User should see smooth, organic closed curves that look distinctly different from superformula shapes — more natural, less mathematical.

**Wait for user approval before proceeding.**

- [ ] **Step 3: Commit**

```bash
git add test-fourier.html
git commit -m "feat: Fourier freeform shape renderer with interactive controls"
```

---

## Task 6: Fourier Shapes in Rolling Simulation

**Files:**
- Modify: `holographic-spirograph/test-rolling.html`

**Goal:** Add Fourier freeform shapes as an option in the rolling simulation alongside superformula.

- [ ] **Step 1: Integrate Fourier into rolling simulation**

- Add a "Shape Type" toggle for each shape: Superformula / Freeform
- Refactor the rolling simulation to accept a generic shape interface:
  ```js
  // Both shape types implement:
  // - getPoint(theta) → { x, y }
  // - getPolarRadius(theta) → number
  // - computeArcLengthTable(numSamples) → { table, totalLen }
  ```
- Wire Fourier shapes into the simulation

- [ ] **Step 2: Visual checkpoint**

Test combinations: superformula A + freeform B, freeform A + superformula B, freeform A + freeform B. Should produce recognizably different patterns from pure superformula.

**Wait for user approval before proceeding.**

- [ ] **Step 3: Commit**

```bash
git add test-rolling.html
git commit -m "feat: Fourier freeform shapes integrated into rolling simulation"
```

---

## Task 7: Shape Mode Selector & Morphing

**Files:**
- Modify: `holographic-spirograph/test-rolling.html`

**Goal:** Add smooth morphing between presets (shapes lerp from one to the next) and a shape mode selector.

- [ ] **Step 1: Implement shape parameter lerping**

- Superformula params lerp directly (m, n1, n2, n3 interpolate smoothly)
- Fourier coefficients lerp directly (amplitudes and phases interpolate)
- Use the same LERP_RATE approach from the current app
- Add the eraser/cycle system from the working app: when pattern closes, start erasing old + drawing new

- [ ] **Step 2: Add mode selector UI**

- Dropdown: Classic / Superformula / Freeform
- Classic mode uses the original hypotrochoid (for comparison)
- Preset selector populated with the curated presets from Task 4 + Task 5

- [ ] **Step 3: Visual checkpoint**

User should see:
- Smooth morphing between different shaped spirographs
- The eraser chasing the old pattern while the new one draws
- Mode switching producing clearly different visual families

**Wait for user approval before proceeding.**

- [ ] **Step 4: Commit**

```bash
git add test-rolling.html
git commit -m "feat: shape morphing and mode selector"
```

---

## Task 8: Integrate into Main App

**Files:**
- Modify: `holographic-spirograph/index.html`

**Goal:** Port the proven rolling simulation, shape engine, and presets into the main app, replacing the hypotrochoid math.

- [ ] **Step 1: Extract the shape engine code from test-rolling.html**

Copy the working shape functions (superformula, Fourier, arc length, rolling simulation) into index.html. Keep all existing features (bloom, Pepper's ghost, settings, encoding, eraser).

- [ ] **Step 2: Replace the spirograph math**

- Replace `compute3DPoint()` with the rolling simulation + Z oscillation
- Update presets from `[R, r, d, A, fz, phase]` arrays to the new shape preset objects
- Keep the current `project()` function for 3D camera projection (it just needs x,y,z — we now provide those from the rolling sim + Z)

- [ ] **Step 3: Update settings panel**

- Add Shape Mode selector (Classic / Superformula / Freeform)
- Classic mode preserves the original behavior exactly
- Wire the existing encoding pipeline to the new parameter space (the encoder's output params now target shape parameters instead of just R/r/d)

- [ ] **Step 4: Visual checkpoint**

The main app should work exactly as before in Classic mode, and produce beautiful new patterns in Superformula and Freeform modes. All existing features (bloom, Pepper's ghost, settings, encoding, eraser) should still work.

**Wait for user approval before proceeding.**

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat: parameterized shapes integrated into main app"
```

- [ ] **Step 6: Clean up test files**

```bash
rm test-superformula.html test-fourier.html test-rolling.html
git add -A
git commit -m "chore: remove test files after integration"
```

---

## Task 9: Curate Final Presets

**Files:**
- Modify: `holographic-spirograph/index.html`

**Goal:** Create 15-20 curated presets across all three modes that showcase the range of shapes. These become the "random" rotation when no data input is active.

- [ ] **Step 1: Build preset collection**

Aim for variety:
- 3-4 Classic presets (the best from the current set)
- 6-8 Superformula presets (stars, flowers, polygons, organic)
- 4-6 Freeform presets (hearts, organic blobs, asymmetric)
- 2-3 that are specifically beautiful for the Pepper's ghost holographic view

Each preset needs: name, shapeA params, shapeB params, penOffset, rollingRatio, Z oscillation params.

- [ ] **Step 2: Visual checkpoint**

Watch the app cycle through all presets in random mode. Each transition should look beautiful.

**Wait for user approval before proceeding.**

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: 15-20 curated shape presets across all modes"
```

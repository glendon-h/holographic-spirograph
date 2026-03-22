import { describe, it, expect } from 'vitest';
import { Morpher, PARAM_RANGES } from '../src/morpher.js';

describe('Morpher', () => {
  it('initializes with random parameters within valid ranges', () => {
    const m = new Morpher();
    const p = m.getParams();
    expect(p.R).toBeGreaterThanOrEqual(PARAM_RANGES.R.min);
    expect(p.R).toBeLessThanOrEqual(PARAM_RANGES.R.max);
    expect(p.r).toBeGreaterThanOrEqual(PARAM_RANGES.r.min);
    expect(p.r).toBeLessThanOrEqual(PARAM_RANGES.r.max);
  });

  it('parameters change after update', () => {
    const m = new Morpher();
    const before = { ...m.getParams() };
    for (let i = 0; i < 100; i++) m.update(1 / 60);
    const after = m.getParams();
    const changed = Object.keys(before).some(k => before[k] !== after[k]);
    expect(changed).toBe(true);
  });

  it('parameters stay within valid ranges after many updates', () => {
    const m = new Morpher();
    for (let i = 0; i < 1000; i++) m.update(1 / 60);
    const p = m.getParams();
    expect(p.R).toBeGreaterThanOrEqual(PARAM_RANGES.R.min);
    expect(p.R).toBeLessThanOrEqual(PARAM_RANGES.R.max);
  });

  it('setAttractor causes params to drift toward target', () => {
    const m = new Morpher();
    const target = { R: 8, r: 3, d: 4, A: 2, fz: 3, phase: 1 };
    m.setAttractor(target);
    for (let i = 0; i < 500; i++) m.update(1 / 60);
    const p = m.getParams();
    expect(Math.abs(p.R - target.R)).toBeLessThan(3);
  });

  it('clearAttractor resumes free wandering', () => {
    const m = new Morpher();
    m.setAttractor({ R: 8, r: 3, d: 4, A: 2, fz: 3, phase: 1 });
    m.clearAttractor();
    for (let i = 0; i < 100; i++) m.update(1 / 60);
    expect(m.getParams().R).toBeDefined();
  });
});

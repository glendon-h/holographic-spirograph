import { describe, it, expect } from 'vitest';
import { noise2D, noise3D } from '../src/noise.js';

describe('simplex noise', () => {
  it('noise2D returns values in [-1, 1]', () => {
    for (let i = 0; i < 100; i++) {
      const v = noise2D(i * 0.1, i * 0.17);
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('noise2D is deterministic', () => {
    expect(noise2D(1.5, 2.3)).toBe(noise2D(1.5, 2.3));
  });

  it('noise3D returns values in [-1, 1]', () => {
    for (let i = 0; i < 100; i++) {
      const v = noise3D(i * 0.1, i * 0.13, i * 0.17);
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

import { describe, it, expect } from 'vitest';
import { computeViewports } from '../src/renderer.js';

describe('computeViewports', () => {
  it('returns 4 viewport definitions', () => {
    const vps = computeViewports(400, 800);
    expect(vps).toHaveLength(4);
  });

  it('each viewport has x, y, width, height, cameraIndex', () => {
    const vps = computeViewports(400, 800);
    for (const vp of vps) {
      expect(vp).toHaveProperty('x');
      expect(vp).toHaveProperty('y');
      expect(vp).toHaveProperty('width');
      expect(vp).toHaveProperty('height');
      expect(vp).toHaveProperty('cameraIndex');
    }
  });

  it('viewports are centered on the screen', () => {
    const vps = computeViewports(400, 800);
    // On a 400x800 screen, the layout square is 400x400 centered vertically
    // Center should be at (200, 400) — check that viewports are arranged around it
    const centerX = 200;
    const centerY = 400;
    // Top quadrant should be above center
    expect(vps[0].y).toBeGreaterThanOrEqual(centerY - 1);
    // Bottom quadrant should be below center
    expect(vps[1].y).toBeLessThan(centerY);
  });
});

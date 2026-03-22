// tests/spirograph.test.js
import { describe, it, expect } from 'vitest';
import { computePoint3D, computePoint2D, TrailBuffer } from '../src/spirograph.js';

describe('computePoint3D', () => {
  it('returns x, y, z coordinates for given t and params', () => {
    const params = { R: 5, r: 3, d: 2, A: 1, fz: 2, phase: 0 };
    const point = computePoint3D(0, params);
    expect(point.x).toBeCloseTo(4, 5);
    expect(point.y).toBeCloseTo(0, 5);
    expect(point.z).toBeCloseTo(0, 5);
  });

  it('produces different z values at different t', () => {
    const params = { R: 5, r: 3, d: 2, A: 1, fz: 2, phase: 0 };
    const p1 = computePoint3D(0, params);
    const p2 = computePoint3D(Math.PI / 4, params);
    expect(p2.z).not.toBeCloseTo(p1.z, 2);
  });
});

describe('computePoint2D', () => {
  it('returns x, y with z=0', () => {
    const params = { R: 5, r: 3, d: 2 };
    const point = computePoint2D(0, params);
    expect(point.x).toBeCloseTo(4, 5);
    expect(point.y).toBeCloseTo(0, 5);
    expect(point.z).toBe(0);
  });
});

describe('TrailBuffer', () => {
  it('stores points up to max capacity', () => {
    const buffer = new TrailBuffer(3);
    buffer.push({ x: 1, y: 0, z: 0 });
    buffer.push({ x: 2, y: 0, z: 0 });
    buffer.push({ x: 3, y: 0, z: 0 });
    expect(buffer.length).toBe(3);
  });

  it('drops oldest point when capacity exceeded', () => {
    const buffer = new TrailBuffer(2);
    buffer.push({ x: 1, y: 0, z: 0 });
    buffer.push({ x: 2, y: 0, z: 0 });
    buffer.push({ x: 3, y: 0, z: 0 });
    expect(buffer.length).toBe(2);
    expect(buffer.get(0).x).toBe(2);
  });

  it('returns flat Float32Array for Three.js', () => {
    const buffer = new TrailBuffer(10);
    buffer.push({ x: 1, y: 2, z: 3 });
    buffer.push({ x: 4, y: 5, z: 6 });
    const arr = buffer.toFloat32Array();
    expect(arr).toBeInstanceOf(Float32Array);
    expect(arr[0]).toBe(1);
    expect(arr[1]).toBe(2);
    expect(arr[2]).toBe(3);
    expect(arr[3]).toBe(4);
    expect(arr.length).toBe(6);
  });
});

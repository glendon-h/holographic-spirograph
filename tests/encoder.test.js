// tests/encoder.test.js
import { describe, it, expect } from 'vitest';
import { classifyInput, extractFeatures, mapToAttractor, encode } from '../src/encoder.js';

describe('classifyInput', () => {
  it('classifies plain text', () => {
    expect(classifyInput({ type: 'text', value: 'hello world' })).toBe('text');
  });
  it('classifies time input', () => {
    expect(classifyInput({ type: 'time', value: new Date() })).toBe('time');
  });
  it('classifies image input', () => {
    expect(classifyInput({ type: 'image', value: {} })).toBe('image');
  });
});

describe('extractFeatures', () => {
  it('returns normalized features for text input', () => {
    const features = extractFeatures('text', { type: 'text', value: 'hello world' });
    expect(features.complexity).toBeGreaterThanOrEqual(0);
    expect(features.complexity).toBeLessThanOrEqual(1);
    expect(features.warmth).toBeDefined();
    expect(features.energy).toBeDefined();
  });
  it('returns normalized features for time input', () => {
    const date = new Date('2026-03-21T14:30:00');
    const features = extractFeatures('time', { type: 'time', value: date });
    expect(features.energy).toBeGreaterThan(0);
  });
});

describe('mapToAttractor', () => {
  it('returns valid spirograph params', () => {
    const features = { complexity: 0.5, warmth: 0.5, scale: 0.5, structure: 0.5, energy: 0.5, persistence: 0.5, weight: 0.5 };
    const attractor = mapToAttractor(features);
    expect(attractor.R).toBeDefined();
    expect(attractor.r).toBeDefined();
    expect(attractor.d).toBeDefined();
  });
});

describe('encode (full pipeline)', () => {
  it('is deterministic for same input', () => {
    const input = { type: 'text', value: 'hello world' };
    const a1 = encode(input);
    const a2 = encode(input);
    expect(a1.R).toBe(a2.R);
  });
  it('produces different results for different inputs', () => {
    const a = encode({ type: 'text', value: 'hello' });
    const b = encode({ type: 'text', value: 'a completely different and much longer sentence' });
    const same = Object.keys(a).every(k => a[k] === b[k]);
    expect(same).toBe(false);
  });
});

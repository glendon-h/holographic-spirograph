import { noise2D } from './noise.js';

export const PARAM_RANGES = {
  R:     { min: 3, max: 10 },
  r:     { min: 1, max: 7 },
  d:     { min: 0.5, max: 5 },
  A:     { min: 0.5, max: 3 },
  fz:    { min: 0.5, max: 5 },
  phase: { min: 0, max: Math.PI * 2 },
};

const PARAM_KEYS = Object.keys(PARAM_RANGES);

function randomInRange(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export class Morpher {
  constructor(speed = 1) {
    this.speed = speed;
    this.time = Math.random() * 1000;
    this.params = {};
    this.attractor = null;
    this.attractorStrength = 0.02;

    this.offsets = {};
    for (const key of PARAM_KEYS) {
      const range = PARAM_RANGES[key];
      this.params[key] = randomInRange(range.min, range.max);
      this.offsets[key] = Math.random() * 1000;
    }
  }

  getParams() {
    return { ...this.params };
  }

  setAttractor(target) {
    this.attractor = { ...target };
  }

  clearAttractor() {
    this.attractor = null;
  }

  update(dt) {
    this.time += dt * this.speed;

    for (const key of PARAM_KEYS) {
      const range = PARAM_RANGES[key];
      const offset = this.offsets[key];

      const noiseVal = noise2D(this.time * 0.3 + offset, offset * 0.7);
      const drift = noiseVal * dt * 0.5;

      let pull = 0;
      if (this.attractor && this.attractor[key] !== undefined) {
        const diff = this.attractor[key] - this.params[key];
        pull = diff * this.attractorStrength;
      }

      this.params[key] = clamp(
        this.params[key] + drift + pull,
        range.min,
        range.max
      );
    }
  }
}

// src/encoder.js
import { PARAM_RANGES } from './morpher.js';

function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff;
  }
  return (hash >>> 0) / 0xffffffff;
}

export function classifyInput(input) {
  return input.type;
}

export function extractFeatures(type, input) {
  const features = {
    complexity: 0.5, warmth: 0.5, scale: 0.5,
    structure: 0.5, energy: 0.5, persistence: 0.5, weight: 0.5,
  };

  if (type === 'text') {
    const text = input.value;
    const len = text.length;
    features.complexity = Math.min(len / 200, 1);
    features.warmth = 0.7;
    features.scale = Math.min(len / 100, 1) * 0.5 + 0.25;
    const vowels = (text.match(/[aeiou]/gi) || []).length;
    features.structure = 1 - (vowels / Math.max(len, 1));
    features.energy = 0.4;
    features.persistence = 0.6;
    features.weight = Math.min(len / 50, 1);
  }

  if (type === 'name') {
    const name = input.value;
    features.complexity = Math.min(name.length / 20, 1) * 0.6;
    features.warmth = 0.8;
    features.scale = 0.5;
    features.structure = 0.4;
    features.energy = 0.5;
    features.persistence = 0.9;
    features.weight = 0.7;
  }

  if (type === 'time') {
    const date = input.value;
    const hour = date.getHours() + date.getMinutes() / 60;
    features.energy = Math.sin((hour / 24) * Math.PI);
    features.warmth = 0.3 + features.energy * 0.5;
    features.complexity = 0.3;
    features.structure = 0.8;
    features.scale = 0.5;
    features.persistence = 0.2;
    features.weight = 0.4;
  }

  if (type === 'location') {
    const { lat, lon } = input.value;
    features.warmth = 1 - Math.abs(lat) / 90;
    features.complexity = Math.abs(Math.sin(lon * 0.1)) * 0.6 + 0.2;
    features.scale = 0.7;
    features.structure = 0.5;
    features.energy = 0.5;
    features.persistence = 0.7;
    features.weight = 0.6;
  }

  if (type === 'image') {
    const meta = input.value;
    if (meta.brightness !== undefined) features.warmth = meta.brightness;
    if (meta.edgeDensity !== undefined) features.complexity = meta.edgeDensity;
    if (meta.hasFaces) features.warmth = Math.max(features.warmth, 0.7);
    features.weight = 0.8;
    features.persistence = 0.5;
  }

  return features;
}

export function mapToAttractor(features) {
  const { complexity, warmth, scale, structure, energy, persistence, weight } = features;

  function mix(primary, ...secondaries) {
    const secondary = secondaries.reduce((a, b) => a + b, 0) / secondaries.length;
    return primary * 0.7 + secondary * 0.3;
  }

  function lerp(min, max, t) {
    return min + (max - min) * Math.max(0, Math.min(1, t));
  }

  const ranges = PARAM_RANGES;
  return {
    R: lerp(ranges.R.min, ranges.R.max, mix(scale, energy, weight)),
    r: lerp(ranges.r.min, ranges.r.max, mix(complexity, structure)),
    d: lerp(ranges.d.min, ranges.d.max, mix(scale, complexity, warmth)),
    A: lerp(ranges.A.min, ranges.A.max, mix(scale, energy)),
    fz: lerp(ranges.fz.min, ranges.fz.max, mix(complexity, energy, structure)),
    phase: lerp(ranges.phase.min, ranges.phase.max, mix(warmth, persistence)),
  };
}

export function encode(input) {
  const type = classifyInput(input);
  const features = extractFeatures(type, input);
  const hashSeed = hashString(JSON.stringify(input));
  for (const key of Object.keys(features)) {
    const perturbation = (hashString(key + hashSeed.toString()) - 0.5) * 0.1;
    features[key] = Math.max(0, Math.min(1, features[key] + perturbation));
  }
  return mapToAttractor(features);
}

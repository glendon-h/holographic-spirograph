// src/main.js
import {
  createRenderer, createScene,
  createSpirographLine, updateLinePositions,
  createPyramidCameras, PeppersGhostRenderer,
  generateTrailColors,
} from './renderer.js';
import { computePoint3D, computePoint2D, TrailBuffer, rotatePoint2DIn3D } from './spirograph.js';
import { Morpher } from './morpher.js';
import { Settings } from './settings.js';
import { encode } from './encoder.js';
import { FeedManager } from './feeds.js';
import { analyzeImageFile } from './image-analyzer.js';

const canvas = document.createElement('canvas');
document.body.appendChild(canvas);

const renderer = createRenderer(canvas);
const scene = createScene();
const cameras = createPyramidCameras();

const { line, geometry, material } = createSpirographLine();
scene.add(line);

const morpher = new Morpher();
const trail = new TrailBuffer(3000);
const peppersRenderer = new PeppersGhostRenderer(renderer, scene, cameras);

const settings = new Settings();
peppersRenderer.setCalibration({
  scale: settings.get('viewportScale'),
  offsetX: settings.get('viewportOffsetX'),
  offsetY: settings.get('viewportOffsetY'),
});
const feedManager = new FeedManager();
const curatedItems = [];
let lastCycleTime = 0;

document.addEventListener('click', () => {
  settings.toggle();
});

settings.onChange((key, value) => {
  switch (key) {
    case 'bloomIntensity':
      peppersRenderer.bloomPass.strength = value;
      break;
    case 'morphSpeed':
      morpher.speed = value;
      break;
    case 'trailLength':
      trail.capacity = value;
      break;
    case 'inputSource':
      if (value === 'random') morpher.clearAttractor();
      break;
    case 'addCuratedItem':
      curatedItems.push(value);
      feedManager.setCuratedItems(curatedItems);
      break;
    case 'addCuratedImage':
      analyzeImageFile(value).then(input => {
        curatedItems.push(input);
        feedManager.setCuratedItems(curatedItems);
      });
      break;
    case 'viewportScale':
    case 'viewportOffsetX':
    case 'viewportOffsetY':
      peppersRenderer.setCalibration({
        scale: settings.get('viewportScale'),
        offsetX: settings.get('viewportOffsetX'),
        offsetY: settings.get('viewportOffsetY'),
      });
      break;
  }
});

let t = 0;
let hue = 0.55; // start with pale cyan
const POINTS_PER_FRAME = 10;
const T_STEP = 0.02;

async function maybeAdvanceInput(currentTime) {
  const mode = settings.get('inputSource');
  if (mode === 'random') {
    morpher.clearAttractor();
    return;
  }

  const interval = settings.get('cycleInterval') * 1000;
  if (currentTime - lastCycleTime < interval) return;
  lastCycleTime = currentTime;

  const input = await feedManager.getNext(mode);
  if (input) {
    const attractor = encode(input);
    morpher.setAttractor(attractor);
  }
}

let lastFrameTime = performance.now();

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = (now - lastFrameTime) / 1000;
  lastFrameTime = now;

  morpher.update(dt);
  maybeAdvanceInput(now);
  const params = morpher.getParams();

  for (let i = 0; i < POINTS_PER_FRAME; i++) {
    t += T_STEP;
    const mode = settings.get('mode');
    let point;
    if (mode === '3d') {
      point = computePoint3D(t, params);
    } else if (mode === '2d') {
      point = computePoint2D(t, params);
      point = rotatePoint2DIn3D(point, t * 0.01);
    } else {
      // Mix — blend between modes
      const blend = (Math.sin(t * 0.001) + 1) / 2;
      const p3d = computePoint3D(t, params);
      const p2d = rotatePoint2DIn3D(computePoint2D(t, params), t * 0.01);
      point = {
        x: p3d.x * blend + p2d.x * (1 - blend),
        y: p3d.y * blend + p2d.y * (1 - blend),
        z: p3d.z * blend + p2d.z * (1 - blend),
      };
    }
    trail.push(point);
  }

  if (trail.length >= 2) {
    updateLinePositions(geometry, trail.toFloat32Array());
    line.computeLineDistances();
    const colors = generateTrailColors(trail.length, hue, t);
    geometry.setColors(colors);
    hue = (hue + 0.00002) % 1; // very slow global hue drift
  }

  peppersRenderer.render();
}

window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  peppersRenderer.setSize(w, h);
  material.resolution.set(w, h);
});

animate();

// Keep screen awake during display
async function requestWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      await navigator.wakeLock.request('screen');
    } catch { /* fallback: do nothing */ }
  }
}
requestWakeLock();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') requestWakeLock();
});

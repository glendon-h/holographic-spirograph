// src/main.js
import {
  createRenderer, createScene,
  createSpirographLine, updateLinePositions,
  createPyramidCameras, PeppersGhostRenderer,
} from './renderer.js';
import { computePoint3D, TrailBuffer } from './spirograph.js';
import { Morpher } from './morpher.js';

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

let t = 0;
const POINTS_PER_FRAME = 10;
const T_STEP = 0.02;

function animate() {
  requestAnimationFrame(animate);

  morpher.update(1 / 60);
  const params = morpher.getParams();

  for (let i = 0; i < POINTS_PER_FRAME; i++) {
    t += T_STEP;
    trail.push(computePoint3D(t, params));
  }

  if (trail.length >= 2) {
    updateLinePositions(geometry, trail.toFloat32Array());
    line.computeLineDistances();
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

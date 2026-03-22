// src/main.js
import {
  createRenderer, createScene, createCamera,
  createBloomComposer, createSpirographLine, updateLinePositions,
} from './renderer.js';
import { computePoint3D, TrailBuffer } from './spirograph.js';
import { Morpher } from './morpher.js';

const canvas = document.createElement('canvas');
document.body.appendChild(canvas);

const renderer = createRenderer(canvas);
const scene = createScene();
const camera = createCamera();
const { composer } = createBloomComposer(renderer, scene, camera);

const { line, geometry, material } = createSpirographLine();
scene.add(line);

const morpher = new Morpher();
const trail = new TrailBuffer(3000);

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

  composer.render();
}

window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
  material.resolution.set(w, h);
});

animate();

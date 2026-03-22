// src/main.js
import {
  createRenderer, createScene,
  createSpirographLine, updateLinePositions,
  computeViewports, createPyramidCameras,
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

  // Render 4 viewports
  const w = window.innerWidth;
  const h = window.innerHeight;
  const viewports = computeViewports(w, h);

  renderer.setScissorTest(true);
  renderer.clear();

  for (const vp of viewports) {
    const cam = cameras[vp.cameraIndex];
    cam.aspect = vp.width / vp.height;
    cam.updateProjectionMatrix();
    renderer.setViewport(vp.x, vp.y, vp.width, vp.height);
    renderer.setScissor(vp.x, vp.y, vp.width, vp.height);
    renderer.render(scene, cam);
  }

  renderer.setScissorTest(false);
}

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  material.resolution.set(window.innerWidth, window.innerHeight);
});

animate();

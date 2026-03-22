// src/renderer.js
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 1);
  return renderer;
}

export function createScene() {
  return new THREE.Scene();
}

export function createCamera() {
  const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 0, 12);
  camera.lookAt(0, 0, 0);
  return camera;
}

export function createBloomComposer(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5,   // strength
    0.4,   // radius
    0.85   // threshold
  );
  bloomPass.resolution.set(
    Math.floor(window.innerWidth / 2),
    Math.floor(window.innerHeight / 2)
  );
  composer.addPass(bloomPass);

  return { composer, bloomPass };
}

export function createSpirographLine() {
  const geometry = new LineGeometry();
  geometry.setPositions([0, 0, 0]);

  const material = new LineMaterial({
    color: 0x88ccff,
    linewidth: 3,
    worldUnits: false,
    transparent: true,
    opacity: 1.0,
  });
  material.resolution.set(window.innerWidth, window.innerHeight);

  const line = new Line2(geometry, material);
  line.computeLineDistances();
  return { line, geometry, material };
}

export function updateLinePositions(geometry, positions) {
  if (positions.length < 6) return;
  geometry.setPositions(positions);
}

/**
 * Compute the 4 viewport rectangles for the Pepper's ghost diamond layout.
 * Uses the shorter screen dimension as the layout square, centered on screen.
 */
export function computeViewports(screenW, screenH) {
  const size = Math.min(screenW, screenH);
  const half = Math.floor(size / 2);
  const offsetX = Math.floor((screenW - size) / 2);
  const offsetY = Math.floor((screenH - size) / 2);

  return [
    // Top quadrant (back camera)
    { x: offsetX, y: offsetY + half, width: size, height: half, cameraIndex: 0 },
    // Bottom quadrant (front camera)
    { x: offsetX, y: offsetY, width: size, height: half, cameraIndex: 1 },
    // Left quadrant
    { x: offsetX, y: offsetY, width: half, height: size, cameraIndex: 2 },
    // Right quadrant
    { x: offsetX + half, y: offsetY, width: half, height: size, cameraIndex: 3 },
  ];
}

/**
 * Create 4 cameras arranged at 90° intervals around the origin.
 * Each camera is flipped upside-down (up vector inverted) to compensate
 * for the pyramid reflection.
 */
export function createPyramidCameras(distance = 12) {
  const cameras = [];
  const angles = [
    Math.PI,       // back (top quadrant on screen)
    0,             // front (bottom quadrant)
    Math.PI / 2,   // left
    -Math.PI / 2,  // right
  ];

  for (const angle of angles) {
    const cam = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    cam.position.set(
      Math.sin(angle) * distance,
      0,
      Math.cos(angle) * distance
    );
    cam.lookAt(0, 0, 0);
    cam.up.set(0, -1, 0);
    cam.lookAt(0, 0, 0);
    cameras.push(cam);
  }

  return cameras;
}

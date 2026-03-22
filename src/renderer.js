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
    color: 0xffffff,      // white base (vertex colors will override)
    linewidth: 3,
    worldUnits: false,
    vertexColors: true,    // enable per-vertex coloring
    transparent: true,
    opacity: 1.0,
  });
  material.resolution.set(window.innerWidth, window.innerHeight);

  const line = new Line2(geometry, material);
  line.computeLineDistances();
  return { line, geometry, material };
}

/**
 * Generate a color array for the trail — bright at head, faded at tail.
 * @param {number} pointCount - number of points in the trail
 * @param {number} hue - base hue in [0, 1]
 * @param {number} time - current time for subtle hue drift along the curve
 * @returns {Float32Array} flat [r,g,b, r,g,b, ...] array
 */
export function generateTrailColors(pointCount, hue, time) {
  const colors = new Float32Array(pointCount * 3);
  const color = new THREE.Color();

  for (let i = 0; i < pointCount; i++) {
    const progress = i / Math.max(pointCount - 1, 1); // 0 = tail, 1 = head
    const localHue = (hue + progress * 0.1 + time * 0.01) % 1;
    const saturation = 0.3 + progress * 0.4; // tail is less saturated
    const lightness = 0.2 + progress * 0.6;  // tail is dimmer
    color.setHSL(localHue, saturation, lightness);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  return colors;
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

/**
 * PeppersGhostRenderer — renders all 4 viewports to an offscreen render target,
 * then applies UnrealBloom via EffectComposer on a fullscreen quad that reads
 * from that target, producing a bloom-composited final image.
 */
export class PeppersGhostRenderer {
  constructor(webglRenderer, scene, cameras) {
    this.renderer = webglRenderer;
    this.scene = scene;
    this.cameras = cameras;

    const w = window.innerWidth;
    const h = window.innerHeight;
    const pixelRatio = Math.min(window.devicePixelRatio, 2);

    // Render target for multi-viewport compositing
    this.renderTarget = new THREE.WebGLRenderTarget(
      w * pixelRatio, h * pixelRatio,
      { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter }
    );

    // Fullscreen quad scene to display the render target
    this.quadScene = new THREE.Scene();
    this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quadGeom = new THREE.PlaneGeometry(2, 2);
    const quadMat = new THREE.MeshBasicMaterial({ map: this.renderTarget.texture });
    this.quadMesh = new THREE.Mesh(quadGeom, quadMat);
    this.quadScene.add(this.quadMesh);

    // Bloom composer processes the fullscreen quad
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.quadScene, this.quadCamera));

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(Math.floor(w / 2), Math.floor(h / 2)),
      1.5, 0.4, 0.85
    );
    this.composer.addPass(this.bloomPass);
  }

  render() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const viewports = computeViewports(w, h);

    // Step 1: Render all 4 viewports to the render target
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.clear();
    this.renderer.setScissorTest(true);

    for (const vp of viewports) {
      const cam = this.cameras[vp.cameraIndex];
      cam.aspect = vp.width / vp.height;
      cam.updateProjectionMatrix();

      // Scale viewport coords to render target pixel size
      const pixelRatio = this.renderer.getPixelRatio();
      this.renderer.setViewport(
        vp.x * pixelRatio, vp.y * pixelRatio,
        vp.width * pixelRatio, vp.height * pixelRatio
      );
      this.renderer.setScissor(
        vp.x * pixelRatio, vp.y * pixelRatio,
        vp.width * pixelRatio, vp.height * pixelRatio
      );
      this.renderer.render(this.scene, cam);
    }

    this.renderer.setScissorTest(false);
    this.renderer.setRenderTarget(null);

    // Step 2: Bloom pass on the composited image via fullscreen quad
    this.composer.render();
  }

  setSize(w, h) {
    const pixelRatio = this.renderer.getPixelRatio();
    this.renderTarget.setSize(w * pixelRatio, h * pixelRatio);
    this.composer.setSize(w, h);
    this.bloomPass.resolution.set(Math.floor(w / 2), Math.floor(h / 2));
  }
}

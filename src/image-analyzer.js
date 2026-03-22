// src/image-analyzer.js

/**
 * Analyze an image loaded into an HTMLImageElement.
 * Uses an offscreen canvas to extract pixel data.
 */
export function analyzeImage(img) {
  const canvas = document.createElement('canvas');
  const size = 64;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, size, size);
  const imageData = ctx.getImageData(0, 0, size, size);
  const pixels = imageData.data;

  let totalR = 0, totalG = 0, totalB = 0;
  let totalBrightness = 0;
  let edgeSum = 0;
  const pixelCount = size * size;

  for (let i = 0; i < pixels.length; i += 4) {
    totalR += pixels[i];
    totalG += pixels[i + 1];
    totalB += pixels[i + 2];
    totalBrightness += (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
  }

  const avgR = totalR / pixelCount;
  const avgG = totalG / pixelCount;
  const avgB = totalB / pixelCount;
  const brightness = totalBrightness / pixelCount / 255;

  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      const idx = (y * size + x) * 4;
      const idxRight = (y * size + x + 1) * 4;
      const idxDown = ((y + 1) * size + x) * 4;
      const curr = (pixels[idx] + pixels[idx+1] + pixels[idx+2]) / 3;
      const right = (pixels[idxRight] + pixels[idxRight+1] + pixels[idxRight+2]) / 3;
      const down = (pixels[idxDown] + pixels[idxDown+1] + pixels[idxDown+2]) / 3;
      edgeSum += Math.abs(curr - right) + Math.abs(curr - down);
    }
  }
  const edgeDensity = Math.min(edgeSum / (pixelCount * 128), 1);

  const warmth = avgR / (avgR + avgG + avgB + 1);

  let skinPixels = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i], g = pixels[i+1], b = pixels[i+2];
    if (r > 95 && g > 40 && b > 20 && r > g && r > b && (r - g) > 15) {
      skinPixels++;
    }
  }
  const hasFaces = skinPixels / pixelCount > 0.15;

  return {
    brightness, edgeDensity, warmth, hasFaces,
    dominantR: avgR / 255, dominantG: avgG / 255, dominantB: avgB / 255,
  };
}

/**
 * Load an image from a File object and analyze it.
 */
export function analyzeImageFile(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const features = analyzeImage(img);
      URL.revokeObjectURL(url);
      resolve({ type: 'image', value: features });
    };
    img.onerror = reject;
    img.src = url;
  });
}

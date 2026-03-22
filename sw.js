const CACHE = 'holospiro-v1';
const ASSETS = [
  './',
  './index.html',
  './src/main.js',
  './src/spirograph.js',
  './src/morpher.js',
  './src/noise.js',
  './src/renderer.js',
  './src/encoder.js',
  './src/feeds.js',
  './src/settings.js',
  './src/image-analyzer.js',
  './manifest.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});

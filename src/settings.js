// src/settings.js

const DEFAULTS = {
  mode: '3d',
  inputSource: 'random',
  cycleInterval: 60,
  bloomIntensity: 1.5,
  trailLength: 3000,
  colorSaturation: 0.7,
  morphSpeed: 1.0,
  viewportScale: 1.0,
  viewportOffsetX: 0,
  viewportOffsetY: 0,
};

const STORAGE_KEY = 'holospiro-settings';

export class Settings {
  constructor() {
    this.values = { ...DEFAULTS };
    this.listeners = [];
    this._visible = false;
    this._load();
    this._createPanel();
  }

  get(key) {
    return this.values[key];
  }

  set(key, value) {
    this.values[key] = value;
    this._save();
    this.listeners.forEach(fn => fn(key, value));
  }

  onChange(fn) {
    this.listeners.push(fn);
  }

  _load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved) Object.assign(this.values, saved);
    } catch { /* ignore corrupt data */ }
  }

  _save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.values));
  }

  _createPanel() {
    const panel = document.createElement('div');
    panel.id = 'settings-panel';
    panel.innerHTML = `
      <div class="settings-header">
        <h2>Settings</h2>
        <button id="settings-close">&times;</button>
      </div>

      <label>Display Mode</label>
      <select data-key="mode">
        <option value="3d">True 3D</option>
        <option value="2d">2D Rotated</option>
        <option value="mix">Mix</option>
      </select>

      <label>Input Source</label>
      <select data-key="inputSource">
        <option value="random">Random</option>
        <option value="curated">Curated</option>
        <option value="live">Live</option>
        <option value="both">Curated + Live</option>
      </select>

      <label>Cycle Interval (s)</label>
      <input type="range" data-key="cycleInterval" min="10" max="300" step="10">
      <span class="range-value" data-for="cycleInterval"></span>

      <label>Bloom Intensity</label>
      <input type="range" data-key="bloomIntensity" min="0" max="3" step="0.1">
      <span class="range-value" data-for="bloomIntensity"></span>

      <label>Trail Length</label>
      <input type="range" data-key="trailLength" min="500" max="5000" step="100">
      <span class="range-value" data-for="trailLength"></span>

      <label>Color Saturation</label>
      <input type="range" data-key="colorSaturation" min="0" max="1" step="0.05">
      <span class="range-value" data-for="colorSaturation"></span>

      <label>Morph Speed</label>
      <input type="range" data-key="morphSpeed" min="0.1" max="3" step="0.1">
      <span class="range-value" data-for="morphSpeed"></span>

      <hr>
      <h3>Pyramid Calibration</h3>

      <label>Viewport Scale</label>
      <input type="range" data-key="viewportScale" min="0.5" max="1.5" step="0.01">
      <span class="range-value" data-for="viewportScale"></span>

      <label>Offset X</label>
      <input type="range" data-key="viewportOffsetX" min="-50" max="50" step="1">
      <span class="range-value" data-for="viewportOffsetX"></span>

      <label>Offset Y</label>
      <input type="range" data-key="viewportOffsetY" min="-50" max="50" step="1">
      <span class="range-value" data-for="viewportOffsetY"></span>
    `;

    document.body.appendChild(panel);

    // Set initial values on all inputs
    panel.querySelectorAll('[data-key]').forEach(el => {
      const key = el.dataset.key;
      el.value = this.values[key];
      const display = panel.querySelector(`[data-for="${key}"]`);
      if (display) display.textContent = this.values[key];
    });

    // Bind change events
    panel.querySelectorAll('[data-key]').forEach(el => {
      const event = el.tagName === 'SELECT' ? 'change' : 'input';
      el.addEventListener(event, () => {
        const val = el.type === 'range' ? parseFloat(el.value) : el.value;
        this.set(el.dataset.key, val);
        const display = panel.querySelector(`[data-for="${el.dataset.key}"]`);
        if (display) display.textContent = val;
      });
    });

    // Close button
    panel.querySelector('#settings-close').addEventListener('click', (e) => {
      e.stopPropagation();
      this.hide();
    });

    // Click outside panel to close (but not when clicking the panel itself)
    panel.addEventListener('click', (e) => e.stopPropagation());
  }

  toggle() {
    this._visible ? this.hide() : this.show();
  }

  show() {
    document.getElementById('settings-panel').classList.add('visible');
    this._visible = true;
  }

  hide() {
    document.getElementById('settings-panel').classList.remove('visible');
    this._visible = false;
  }
}

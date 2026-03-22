// src/spirograph.js

export function computePoint3D(t, params) {
  const { R, r, d, A, fz, phase } = params;
  const diff = R - r;
  const ratio = diff / r;
  return {
    x: diff * Math.cos(t) + d * Math.cos(ratio * t),
    y: diff * Math.sin(t) - d * Math.sin(ratio * t),
    z: A * Math.sin(fz * t + phase),
  };
}

export function computePoint2D(t, params) {
  const { R, r, d } = params;
  const diff = R - r;
  const ratio = diff / r;
  return {
    x: diff * Math.cos(t) + d * Math.cos(ratio * t),
    y: diff * Math.sin(t) - d * Math.sin(ratio * t),
    z: 0,
  };
}

export class TrailBuffer {
  constructor(capacity) {
    this._capacity = capacity;
    this._data = [];
  }

  get capacity() {
    return this._capacity;
  }

  set capacity(newCapacity) {
    this._capacity = newCapacity;
    while (this._data.length > this._capacity) {
      this._data.shift();
    }
  }

  get length() {
    return this._data.length;
  }

  push(point) {
    this._data.push(point);
    if (this._data.length > this._capacity) {
      this._data.shift();
    }
  }

  get(index) {
    return this._data[index];
  }

  toFloat32Array() {
    const arr = new Float32Array(this._data.length * 3);
    for (let i = 0; i < this._data.length; i++) {
      arr[i * 3] = this._data[i].x;
      arr[i * 3 + 1] = this._data[i].y;
      arr[i * 3 + 2] = this._data[i].z;
    }
    return arr;
  }
}

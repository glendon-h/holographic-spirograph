// src/feeds.js

export class ClockFeed {
  get() {
    return { type: 'time', value: new Date() };
  }
}

export class CuratedFeed {
  constructor(items = []) {
    this.items = items;
    this.index = 0;
  }

  next() {
    if (this.items.length === 0) return null;
    const item = this.items[this.index];
    this.index = (this.index + 1) % this.items.length;
    return item;
  }

  addItem(item) {
    this.items.push(item);
  }

  removeItem(index) {
    this.items.splice(index, 1);
    if (this.index >= this.items.length) this.index = 0;
  }
}

export function parseWeatherResponse(response) {
  const current = response.current;
  return {
    type: 'location',
    value: {
      temperature: current.temperature_2m,
      wind: current.wind_speed_10m,
      cloudCover: current.cloud_cover,
      lat: 0, lon: 0,
    },
  };
}

export async function fetchWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,cloud_cover`;
  const res = await fetch(url);
  const data = await res.json();
  const input = parseWeatherResponse(data);
  input.value.lat = lat;
  input.value.lon = lon;
  return input;
}

export class FeedManager {
  constructor() {
    this.clock = new ClockFeed();
    this.curated = new CuratedFeed();
    this.weatherCache = null;
    this.weatherLocation = null;
    this.lastWeatherFetch = 0;
  }

  setWeatherLocation(lat, lon) {
    this.weatherLocation = { lat, lon };
  }

  setCuratedItems(items) {
    this.curated = new CuratedFeed(items);
  }

  async getNext(mode) {
    if (mode === 'random') return null;
    if (mode === 'curated') return this.curated.next();
    if (mode === 'live') return this._getLiveInput();
    if (mode === 'both') {
      const curated = this.curated.next();
      if (curated) return curated;
      return this._getLiveInput();
    }
    return null;
  }

  async _getLiveInput() {
    const clockInput = this.clock.get();
    const now = Date.now();
    if (this.weatherLocation && now - this.lastWeatherFetch > 600000) {
      try {
        this.weatherCache = await fetchWeather(
          this.weatherLocation.lat, this.weatherLocation.lon
        );
        this.lastWeatherFetch = now;
      } catch { /* use cache or fallback */ }
    }
    return this.weatherCache || clockInput;
  }
}

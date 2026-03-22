import { describe, it, expect } from 'vitest';
import { ClockFeed, CuratedFeed, parseWeatherResponse } from '../src/feeds.js';

describe('ClockFeed', () => {
  it('returns a time input with current date', () => {
    const feed = new ClockFeed();
    const input = feed.get();
    expect(input.type).toBe('time');
    expect(input.value).toBeInstanceOf(Date);
  });
});

describe('CuratedFeed', () => {
  it('cycles through items', () => {
    const feed = new CuratedFeed([
      { type: 'text', value: 'hello' },
      { type: 'text', value: 'world' },
    ]);
    const a = feed.next();
    const b = feed.next();
    expect(a.value).toBe('hello');
    expect(b.value).toBe('world');
  });

  it('wraps around at end of collection', () => {
    const feed = new CuratedFeed([{ type: 'text', value: 'only' }]);
    feed.next();
    const wrapped = feed.next();
    expect(wrapped.value).toBe('only');
  });

  it('returns null for empty collection', () => {
    const feed = new CuratedFeed([]);
    expect(feed.next()).toBeNull();
  });
});

describe('parseWeatherResponse', () => {
  it('extracts temperature and wind from Open-Meteo response', () => {
    const response = {
      current: { temperature_2m: 15, wind_speed_10m: 20, cloud_cover: 50 },
    };
    const input = parseWeatherResponse(response);
    expect(input.type).toBe('location');
    expect(input.value.temperature).toBe(15);
    expect(input.value.wind).toBe(20);
  });
});

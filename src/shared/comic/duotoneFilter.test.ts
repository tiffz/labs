import { describe, expect, it } from 'vitest';

import {
  duotoneComponentTables,
  softEmojiWashTables,
  softPhotoDuotoneTables,
} from './duotoneFilter';

describe('duotoneComponentTables', () => {
  it('maps black/white to a 0-to-1 identity ramp per channel', () => {
    const tables = duotoneComponentTables('#000000', '#ffffff');
    expect(tables.r).toBe('0.000 1.000');
    expect(tables.g).toBe('0.000 1.000');
    expect(tables.b).toBe('0.000 1.000');
  });

  it('uses the dark hex as the low end and light hex as the high end per channel', () => {
    const tables = duotoneComponentTables('#331155', '#ffeecc');
    const [darkR, lightR] = tables.r.split(' ').map(Number);
    const [darkG, lightG] = tables.g.split(' ').map(Number);
    const [darkB, lightB] = tables.b.split(' ').map(Number);
    expect(darkR).toBeCloseTo(0x33 / 255, 3);
    expect(lightR).toBeCloseTo(0xff / 255, 3);
    expect(darkG).toBeCloseTo(0x11 / 255, 3);
    expect(lightG).toBeCloseTo(0xee / 255, 3);
    expect(darkB).toBeCloseTo(0x55 / 255, 3);
    expect(lightB).toBeCloseTo(0xcc / 255, 3);
  });

  it('falls back to mid-gray for malformed hex input', () => {
    const tables = duotoneComponentTables('not-a-color', '#ffffff');
    expect(tables.r.startsWith('0.500')).toBe(true);
  });
});

describe('softPhotoDuotoneTables', () => {
  it('pulls darks toward mid-neutral and lights toward near-white vs hard duotone', () => {
    const hard = duotoneComponentTables('#1a1a1a', '#dce9f5');
    const soft = softPhotoDuotoneTables('#1a1a1a', '#dce9f5');
    const [hardDark] = hard.r.split(' ').map(Number);
    const [softDark, softLight] = soft.r.split(' ').map(Number);
    expect(softDark).toBeGreaterThan(hardDark!);
    expect(softLight).toBeGreaterThan(0.7);
  });
});

describe('softEmojiWashTables', () => {
  it('keeps a readable light end while tinting toward the figure color', () => {
    const tables = softEmojiWashTables('#336699');
    const [darkR, lightR] = tables.r.split(' ').map(Number);
    expect(darkR).toBeGreaterThan(0.1);
    expect(lightR).toBeGreaterThan(0.75);
    expect(lightR).toBeGreaterThan(darkR!);
  });
});

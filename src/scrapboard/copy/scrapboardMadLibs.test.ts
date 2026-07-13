import { describe, expect, it } from 'vitest';

import {
  generateMadLibsBlocks,
  madLibsTemplateKey,
} from './scrapboardMadLibs';

describe('scrapboardMadLibs', () => {
  it('returns non-empty blocks for most seeds', () => {
    const outputs = Array.from({ length: 20 }, (_, index) => generateMadLibsBlocks(1000 + index, 0));
    const nonEmpty = outputs.filter((blocks) => blocks.length > 0);
    expect(nonEmpty.length).toBeGreaterThan(10);
    for (const blocks of nonEmpty) {
      for (const block of blocks) {
        expect(block.content.trim().length).toBeGreaterThan(0);
        expect(block.content).not.toMatch(/\{(adjective|noun|place)\}/);
      }
    }
  });

  it('does not repeat the same template back-to-back across seeds', () => {
    let previousKey = '';
    for (let seed = 0; seed < 20; seed++) {
      const blocks = generateMadLibsBlocks(seed * 17, 2);
      const key = blocks.map(madLibsTemplateKey).join('|');
      if (key && previousKey) {
        expect(key).not.toBe(previousKey);
      }
      previousKey = key;
    }
  });
});

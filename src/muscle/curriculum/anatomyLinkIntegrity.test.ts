import { describe, expect, it } from 'vitest';
import { STRUCTURE_DETAILS_BY_ID } from '../curriculum/structureDetailsCatalog';

describe('anatomy link integrity', () => {
  it('uses en.wikipedia.org URLs only for curated nodes', () => {
    for (const details of Object.values(STRUCTURE_DETAILS_BY_ID)) {
      if (!details.wikipediaUrl) continue;
      expect(details.wikipediaUrl).toMatch(/^https:\/\/en\.wikipedia\.org\/wiki\/[^#]+$/);
      expect(details.wikipediaUrl).not.toContain(' ');
    }
  });

  it('requires definitions for all catalog entries', () => {
    for (const [id, details] of Object.entries(STRUCTURE_DETAILS_BY_ID)) {
      expect(details.definition.length, id).toBeGreaterThan(20);
    }
  });
});

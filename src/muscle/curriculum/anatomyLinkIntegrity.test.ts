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

  // Ratchet: "triceps surae" is the combined group (gastrocnemius + soleus),
  // never a synonym for a single muscle. It may appear in a definition that
  // describes the grouping, but must not stand as a muscle's own name or alias.
  it('never labels a single muscle "triceps surae"', () => {
    for (const [id, details] of Object.entries(STRUCTURE_DETAILS_BY_ID)) {
      expect(details.latinName?.toLowerCase() ?? '', id).not.toContain('triceps surae');
      for (const alias of details.colloquialNames ?? []) {
        expect(alias.toLowerCase(), `${id} alias`).not.toBe('triceps surae');
      }
    }
    expect(STRUCTURE_DETAILS_BY_ID.muscle_gastrocnemius.latinName).toBe(
      'Musculus gastrocnemius',
    );
  });

  // Ratchet: the lateral (acromial) deltoid caps the acromion and forms the
  // widest point of the shoulder. "Forward of the acromion" is the anterior
  // (clavicular) head's landmark — it must not describe the lateral head.
  it('does not give the lateral deltoid an anterior-deltoid landmark', () => {
    const lateral = STRUCTURE_DETAILS_BY_ID.muscle_deltoid_lateral.definition.toLowerCase();
    expect(lateral).not.toContain('forward of the acromion');
    expect(lateral).toContain('acromion');
  });
});

import { describe, expect, it } from 'vitest';
import {
  emptyStanzaPracticeOverlayV1,
  isStanzaPracticeOverlayV1,
  STANZA_PRACTICE_OVERLAY_FILE_NAME,
  STANZA_PRACTICE_OVERLAY_SCHEMA_VERSION,
} from './stanzaPracticeOverlay';

describe('stanzaPracticeOverlay', () => {
  it('creates empty v1 overlay', () => {
    const overlay = emptyStanzaPracticeOverlayV1('2026-01-01T00:00:00.000Z');
    expect(overlay.schemaVersion).toBe(STANZA_PRACTICE_OVERLAY_SCHEMA_VERSION);
    expect(overlay.exportedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(overlay.entries).toEqual({});
    expect(overlay.deletedDriveSourceFileIds).toEqual([]);
  });

  it('validates v1 shape', () => {
    expect(isStanzaPracticeOverlayV1(emptyStanzaPracticeOverlayV1())).toBe(true);
    expect(isStanzaPracticeOverlayV1({ schemaVersion: 2, exportedAt: 'x', entries: {} })).toBe(false);
    expect(isStanzaPracticeOverlayV1(null)).toBe(false);
  });

  it('exports overlay filename for Encore_App sidecar', () => {
    expect(STANZA_PRACTICE_OVERLAY_FILE_NAME).toBe('stanza_practice_overlay.json');
  });
});

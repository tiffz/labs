import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  readLabsGoogleSessionTouches,
  touchLabsGoogleSessionConsumer,
  type LabsGoogleSessionTouches,
} from './labsGoogleSessionConsumers';

describe('labsGoogleSessionConsumers', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('touchLabsGoogleSessionConsumer persists and merges ids', () => {
    touchLabsGoogleSessionConsumer('stanza');
    const a = readLabsGoogleSessionTouches();
    expect(typeof a.stanza).toBe('number');
    touchLabsGoogleSessionConsumer('encore');
    const b = readLabsGoogleSessionTouches();
    expect(typeof b.stanza).toBe('number');
    expect(typeof b.encore).toBe('number');
  });

  it('readLabsGoogleSessionTouches returns {} on invalid JSON', () => {
    localStorage.setItem('labs_google_session_apps_v1', '{not json');
    expect(readLabsGoogleSessionTouches()).toEqual({});
  });

  it('ignores non-number entries in stored JSON', () => {
    localStorage.setItem('labs_google_session_apps_v1', '{"stanza":"x","encore":1,"scales":null}');
    expect(readLabsGoogleSessionTouches()).toEqual({ encore: 1 } satisfies LabsGoogleSessionTouches);
  });
});

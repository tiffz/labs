import { describe, expect, it } from 'vitest';

import { inferSketchbookCaptureFromText } from './sketchbookCaptureUtils';

describe('inferSketchbookCaptureFromText', () => {
  it('detects links', () => {
    const capture = inferSketchbookCaptureFromText('https://example.com/story seed');
    expect(capture?.kind).toBe('link');
    expect(capture?.url).toBe('https://example.com/story');
  });

  it('detects short daily flashes', () => {
    const capture = inferSketchbookCaptureFromText('Saw a cat wearing a tiny hat at the bodega.');
    expect(capture?.kind).toBe('daily_flash');
    expect(capture?.occurredOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('detects longer notes as ideas', () => {
    const capture = inferSketchbookCaptureFromText('Act one\n\nThe courier finds a ledger.\n\nAct two begins.');
    expect(capture?.kind).toBe('idea');
  });
});

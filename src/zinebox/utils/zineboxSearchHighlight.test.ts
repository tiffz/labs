import { describe, expect, it } from 'vitest';

import { splitZineboxSearchHighlight } from './zineboxSearchHighlight';

describe('splitZineboxSearchHighlight', () => {
  it('returns plain text when query is empty', () => {
    expect(splitZineboxSearchHighlight('Lazy Cat Sundays', '')).toEqual([
      { kind: 'text', value: 'Lazy Cat Sundays' },
    ]);
  });

  it('highlights a case-insensitive token in the title', () => {
    expect(splitZineboxSearchHighlight('Lazy Cat Sundays', 'cat')).toEqual([
      { kind: 'text', value: 'Lazy ' },
      { kind: 'mark', value: 'Cat' },
      { kind: 'text', value: ' Sundays' },
    ]);
  });

  it('highlights each token in a multi-word query', () => {
    expect(splitZineboxSearchHighlight('Lazy Cat Sundays', 'lazy cat')).toEqual([
      { kind: 'mark', value: 'Lazy' },
      { kind: 'text', value: ' ' },
      { kind: 'mark', value: 'Cat' },
      { kind: 'text', value: ' Sundays' },
    ]);
  });
});

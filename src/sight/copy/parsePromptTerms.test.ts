import { describe, expect, it } from 'vitest';
import { parsePromptTerms } from './parsePromptTerms';

describe('parsePromptTerms', () => {
  it('wraps known phrases as term segments', () => {
    const parts = parsePromptTerms('Which inner square looks more vivid?');
    expect(parts).toEqual([
      { type: 'text', value: 'Which ' },
      { type: 'term', id: 'inner-square', value: 'inner square' },
      { type: 'text', value: ' looks ' },
      { type: 'term', id: 'more-vivid', value: 'more vivid' },
      { type: 'text', value: '?' },
    ]);
  });

  it('prefers longer phrases over shorter overlaps', () => {
    const parts = parsePromptTerms('Which swatch is less vivid?');
    expect(parts.some((p) => p.type === 'term' && p.id === 'less-vivid')).toBe(true);
    expect(parts.some((p) => p.type === 'term' && p.id === 'more-vivid')).toBe(false);
  });

  it('returns plain text when no terms match', () => {
    expect(parsePromptTerms('Pick the cast scene.')).toEqual([
      { type: 'text', value: 'Pick the cast scene.' },
    ]);
  });
});

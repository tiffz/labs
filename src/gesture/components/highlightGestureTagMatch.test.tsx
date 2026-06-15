import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { highlightGestureTagMatch } from './highlightGestureTagMatch';

describe('highlightGestureTagMatch', () => {
  it('returns plain text when query is empty', () => {
    expect(highlightGestureTagMatch('cats', '')).toBe('cats');
  });

  it('wraps a case-insensitive substring match', () => {
    const { container } = render(<>{highlightGestureTagMatch('cats', 'cat')}</>);
    const match = container.querySelector('.gesture-pack-tags-match');
    expect(match?.textContent).toBe('cat');
    expect(container.textContent).toBe('cats');
  });
});

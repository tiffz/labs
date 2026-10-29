import { describe, expect, it } from 'vitest';

import { lyreflySourceLinkLabel } from './lyreflySourceLink';

describe('lyreflySourceLinkLabel', () => {
  it('names a Drive folder as Drive', () => {
    expect(lyreflySourceLinkLabel('https://drive.google.com/drive/folders/abc')).toBe('Open in Drive');
  });

  it('names a website by its host', () => {
    expect(lyreflySourceLinkLabel('https://www.example.com/comics/')).toBe('View on example.com');
  });

  it('shows nothing for a link that is not a web address', () => {
    expect(lyreflySourceLinkLabel('not a link')).toBeNull();
    expect(lyreflySourceLinkLabel('javascript:alert(1)')).toBeNull();
  });
});

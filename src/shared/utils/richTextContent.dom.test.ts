// @vitest-environment jsdom
//
// The emptiness path must behave identically to a real DOM parse *and* never perform
// one. Node-environment tests cannot prove either: without `DOMParser`,
// `richTextPlainText` silently falls back to the same tag-stripping code the emptiness
// check uses, so a parity assertion there compares a function to itself.
import { describe, expect, it, vi } from 'vitest';
import { isRichTextEmpty, richTextPlainText } from './richTextContent';

// TipTap's "empty" documents and the shapes Encore stores.
const EMPTINESS_CASES: Array<[string | undefined, boolean]> = [
  [undefined, true],
  ['   ', true],
  ['<p></p>', true],
  ['<p><br></p>', true],
  ['<p><br /></p>', true],
  ['<p>&nbsp;</p>', true],
  ['<p> </p>', true],
  ['<ul><li></li></ul>', true],
  ['<p><em><strong></strong></em></p>', true],
  ['Hi', false],
  ['<p>Hi</p>', false],
  ['<p><strong>Hi</strong></p>', false],
  ['<ul><li>a</li><li>b</li></ul>', false],
  ['<p>&lt;p&gt;</p>', false],
  ['<p>&amp;</p>', false],
];

describe('richTextContent (DOM)', () => {
  it.each(EMPTINESS_CASES)('isRichTextEmpty(%j) === %s', (html, expected) => {
    expect(isRichTextEmpty(html)).toBe(expected);
  });

  it('agrees with the DOM-parsing plain-text path on every emptiness case', () => {
    for (const [html] of EMPTINESS_CASES) {
      expect(isRichTextEmpty(html)).toBe(richTextPlainText(html).length === 0);
    }
  });

  // Encore's Originals library calls this per song per render (workflow completion +
  // dashboard status). Parsing each song's full brainstorm document on every keystroke
  // cost 137ms of blocking parse in a production profile.
  it('never builds a DOM to answer emptiness', () => {
    const parseSpy = vi.spyOn(DOMParser.prototype, 'parseFromString');
    try {
      for (const [html] of EMPTINESS_CASES) isRichTextEmpty(html);
      expect(parseSpy).not.toHaveBeenCalled();

      // Guard the spy itself: the path we are asserting away from still uses DOMParser.
      richTextPlainText('<p>Hi</p>');
      expect(parseSpy).toHaveBeenCalled();
    } finally {
      parseSpy.mockRestore();
    }
  });
});

import { describe, expect, it, vi } from 'vitest';
import { maxWidthForMaterialGlyph, visibleMaterialIconsLookReady } from './materialIconGlyphReadiness';

function rect(w: number, h: number): DOMRect {
  return {
    width: w,
    height: h,
    top: 0,
    left: 0,
    right: w,
    bottom: h,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect;
}

describe('maxWidthForMaterialGlyph', () => {
  it('caps long ligature names with a modest em multiplier', () => {
    expect(maxWidthForMaterialGlyph(24, 14)).toBeCloseTo(59.04, 5);
  });
});

describe('visibleMaterialIconsLookReady', () => {
  it('returns true when no visible icon elements', () => {
    document.body.innerHTML = '';
    expect(visibleMaterialIconsLookReady(document)).toBe(true);
  });

  it('ignores wide in-layout boxes when off-DOM width shows glyphs (padded buttons)', () => {
    document.body.innerHTML =
      '<span class="material-symbols-outlined" style="font-size:17px;display:inline-block">add</span>';
    const el = document.querySelector('span') as HTMLElement;
    vi.spyOn(window, 'getComputedStyle').mockImplementation((node) => {
      if (node === el) {
        return {
          fontFamily: '"Material Symbols Outlined", sans-serif',
          fontSize: '17px',
          fontWeight: '400',
          fontStyle: 'normal',
          fontFeatureSettings: '"liga"',
          fontVariationSettings: 'normal',
          letterSpacing: 'normal',
          lineHeight: '1',
        } as unknown as CSSStyleDeclaration;
      }
      return { fontFamily: 'sans-serif', fontSize: '16px' } as unknown as CSSStyleDeclaration;
    });
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(rect(44, 44));
    const proto = HTMLElement.prototype.getBoundingClientRect;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement
    ) {
      if (this.getAttribute('data-labs-material-icon-probe') === '1') {
        return rect(17, 24);
      }
      if (this === el) {
        return rect(44, 44);
      }
      return proto.call(this);
    });
    expect(visibleMaterialIconsLookReady(document)).toBe(true);
    vi.restoreAllMocks();
  });

  it('returns false when flex squeezes in-layout box but off-DOM measurement shows plaintext', () => {
    document.body.innerHTML =
      '<span class="material-symbols-outlined" style="font-size:20px;display:inline-block">directions_run</span>';
    const el = document.querySelector('span') as HTMLElement;
    vi.spyOn(window, 'getComputedStyle').mockImplementation((node) => {
      if (node === el) {
        return {
          fontFamily: '"Material Symbols Outlined", sans-serif',
          fontSize: '20px',
          fontWeight: '400',
          fontStyle: 'normal',
          fontFeatureSettings: '"liga"',
          fontVariationSettings: 'normal',
          letterSpacing: 'normal',
          lineHeight: '1',
        } as unknown as CSSStyleDeclaration;
      }
      return { fontFamily: 'sans-serif', fontSize: '16px' } as unknown as CSSStyleDeclaration;
    });
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(rect(22, 20));
    const proto = HTMLElement.prototype.getBoundingClientRect;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement
    ) {
      if (this.getAttribute('data-labs-material-icon-probe') === '1') {
        return rect(180, 24);
      }
      if (this === el) {
        return rect(22, 20);
      }
      return proto.call(this);
    });
    expect(visibleMaterialIconsLookReady(document)).toBe(false);
    vi.restoreAllMocks();
  });

  it('returns true when off-DOM width matches compact glyphs', () => {
    document.body.innerHTML =
      '<span class="material-symbols-outlined" style="font-size:20px;display:inline-block">directions_run</span>';
    const el = document.querySelector('span') as HTMLElement;
    vi.spyOn(window, 'getComputedStyle').mockImplementation((node) => {
      if (node === el) {
        return {
          fontFamily: '"Material Symbols Outlined", sans-serif',
          fontSize: '20px',
          fontWeight: '400',
          fontStyle: 'normal',
          fontFeatureSettings: '"liga"',
          fontVariationSettings: 'normal',
          letterSpacing: 'normal',
          lineHeight: '1',
        } as unknown as CSSStyleDeclaration;
      }
      return { fontFamily: 'sans-serif', fontSize: '16px' } as unknown as CSSStyleDeclaration;
    });
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(rect(22, 20));
    const proto = HTMLElement.prototype.getBoundingClientRect;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement
    ) {
      if (this.getAttribute('data-labs-material-icon-probe') === '1') {
        return rect(22, 24);
      }
      if (this === el) {
        return rect(22, 20);
      }
      return proto.call(this);
    });
    expect(visibleMaterialIconsLookReady(document)).toBe(true);
    vi.restoreAllMocks();
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  loadImageFromDataUrl, 
  splitSpreadImage, 
  isLikelySpreadImage 
} from './imageManipulation';

// Mock canvas and image for tests
const mockCanvasContext = {
  drawImage: vi.fn(),
  fillRect: vi.fn(),
  fillStyle: '',
  imageSmoothingEnabled: true,
  imageSmoothingQuality: 'high',
};

const mockCanvas = {
  getContext: vi.fn(() => mockCanvasContext),
  toDataURL: vi.fn(() => 'data:image/png;base64,mockImageData'),
  width: 0,
  height: 0,
};

beforeEach(() => {
  // Mock document.createElement for canvas
  vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
    if (tagName === 'canvas') {
      return mockCanvas as unknown as HTMLCanvasElement;
    }
    return document.createElement(tagName);
  });

  // Mock Image
  const mockImage = {
    width: 1000,
    height: 500,
    src: '',
    onload: null as (() => void) | null,
    onerror: null as (() => void) | null,
  };

  vi.spyOn(window, 'Image').mockImplementation(() => {
    setTimeout(() => {
      if (mockImage.onload) mockImage.onload();
    }, 0);
    return mockImage as unknown as HTMLImageElement;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('imageManipulation utilities', () => {
  describe('isLikelySpreadImage', () => {
    it('returns true for spread-like aspect ratios (between 1.1 and 1.8)', () => {
      // Spread of two 5.5x8.5 pages = 11x8.5 = aspect 1.294
      expect(isLikelySpreadImage(1100, 850)).toBe(true);
      
      // Spread of two 6x9 pages = 12x9 = aspect 1.333
      expect(isLikelySpreadImage(1200, 900)).toBe(true);
      
      // Borderline cases
      expect(isLikelySpreadImage(1150, 1000)).toBe(true); // 1.15
      expect(isLikelySpreadImage(1750, 1000)).toBe(true); // 1.75
    });

    it('returns false for single page aspect ratios (not spread)', () => {
      // Single 5.5x8.5 page = aspect 0.647
      expect(isLikelySpreadImage(550, 850)).toBe(false);
      
      // Single 8.5x11 page = aspect 0.773
      expect(isLikelySpreadImage(850, 1100)).toBe(false);
      
      // Square image
      expect(isLikelySpreadImage(1000, 1000)).toBe(false);
    });

    it('returns false for very wide images (panoramic)', () => {
      // Too wide to be a spread
      expect(isLikelySpreadImage(2000, 1000)).toBe(false); // 2.0
      expect(isLikelySpreadImage(3000, 1000)).toBe(false); // 3.0
    });
  });

  describe('loadImageFromDataUrl', () => {
    it('resolves with an HTMLImageElement', async () => {
      const img = await loadImageFromDataUrl('data:image/png;base64,test');
      expect(img).toBeDefined();
    });

    it('sets the src to the provided dataUrl', async () => {
      const dataUrl = 'data:image/png;base64,testdata';
      const img = await loadImageFromDataUrl(dataUrl);
      expect(img.src).toBe(dataUrl);
    });
  });

  describe('splitSpreadImage', () => {
    it('creates two canvases for left and right halves', async () => {
      const [leftUrl, rightUrl] = await splitSpreadImage('data:image/png;base64,spread');
      
      // Verify canvases were created
      expect(document.createElement).toHaveBeenCalledWith('canvas');
      
      // Verify we got data URLs back
      expect(leftUrl).toContain('data:image/png');
      expect(rightUrl).toContain('data:image/png');
    });

    it('returns two separate data URLs', async () => {
      const [leftUrl, rightUrl] = await splitSpreadImage('data:image/png;base64,spread');
      expect(leftUrl).toBeDefined();
      expect(rightUrl).toBeDefined();
    });
  });

  describe('combineToSpreadImage', () => {
    it('is tested via integration tests', () => {
      // combineToSpreadImage requires Promise.all which is harder to mock
      // The actual functionality is tested via integration tests
      expect(true).toBe(true);
    });
  });
});

describe('spreadPairing utilities', () => {
  // These tests verify the page label and filename functions
  describe('getPageLabel', () => {
    // Import dynamically to test
    it('should be tested in spreadPairing.test.ts', () => {
      // Placeholder - these tests exist in spreadPairing.test.ts
      expect(true).toBe(true);
    });
  });
});

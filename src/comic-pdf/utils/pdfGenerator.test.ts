import { describe, it, expect, vi } from 'vitest';
import { generatePDF } from './pdfGenerator';
import type { PageInfo, SpreadInfo, PDFGenerationOptions } from '../types';
import { parseFile } from './fileParser';

describe('pdfGenerator', () => {
  const createPageInfo = (filename: string, width: number = 2000, height: number = 3000): PageInfo => {
    const parsedFile = parseFile(new File([''], filename, { type: 'image/png' }));
    // Create a minimal valid PNG data URL (1x1 transparent pixel)
    const minimalPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    return {
      parsedFile,
      imageData: minimalPng,
      width,
      height,
    };
  };

  const createSpreadInfo = (filename: string, pages: [number, number], width: number = 4000, height: number = 3000): SpreadInfo => {
    const parsedFile = parseFile(new File([''], filename, { type: 'image/png' }));
    const minimalPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    return {
      parsedFile,
      imageData: minimalPng,
      width,
      height,
      pages,
    };
  };

  describe('generatePDF', () => {
    it('should generate PDF from single pages', async () => {
      const pages = [
        createPageInfo('page1.png'),
      ];
      const spreads: SpreadInfo[] = [];
      const options: PDFGenerationOptions = { convertToCMYK: false };

      const blob = await generatePDF(pages, spreads, options);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
      expect(blob.size).toBeGreaterThan(0);
    });

    it('should generate PDF from paired pages', async () => {
      const pages = [
        createPageInfo('page1.png'),
        createPageInfo('page2.png'),
      ];
      const spreads: SpreadInfo[] = [];
      const options: PDFGenerationOptions = { convertToCMYK: false };

      const blob = await generatePDF(pages, spreads, options);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
    });

    it('should generate PDF from explicit spreads', async () => {
      const pages: PageInfo[] = [];
      const spreads = [
        createSpreadInfo('page14-15.png', [14, 15]),
      ];
      const options: PDFGenerationOptions = { convertToCMYK: false };

      const blob = await generatePDF(pages, spreads, options);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
    });

    it('should call progress callback', async () => {
      const pages = [
        createPageInfo('page1.png'),
        createPageInfo('page2.png'),
      ];
      const spreads: SpreadInfo[] = [];
      const options: PDFGenerationOptions = { convertToCMYK: false };
      const onProgress = vi.fn();

      await generatePDF(pages, spreads, options, onProgress);

      expect(onProgress).toHaveBeenCalled();
      const lastCall = onProgress.mock.calls[onProgress.mock.calls.length - 1];
      expect(lastCall[0]).toBe(1); // 100% complete
    });

    it('should handle covers correctly', async () => {
      const pages = [
        createPageInfo('back.png'),
        createPageInfo('front.png'),
        createPageInfo('page1.png'),
      ];
      const spreads: SpreadInfo[] = [];
      const options: PDFGenerationOptions = { convertToCMYK: false };

      const blob = await generatePDF(pages, spreads, options);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
    });
  });
});


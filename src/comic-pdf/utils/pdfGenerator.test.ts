import { describe, it, expect, vi } from 'vitest';
import { 
  generatePDF, 
  createPDF, 
  estimateUncompressedSize, 
  estimateCompressedSize, 
  formatFileSize,
  downloadPDF,
  COMPRESSION_PRESETS,
  getCompressionDescription,
} from './pdfGenerator';
import type { PageInfo, SpreadInfo, PDFGenerationOptions } from '../types';
import { parseFile } from './fileParser';

// Helper to create default options
const defaultOptions: PDFGenerationOptions = {
  convertToCMYK: false,
  compressionPreset: 'none',
  convertToJpeg: false,
  jpegQuality: 0.85,
  reduceResolution: false,
  resolutionScale: 1,
};

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

      const blob = await generatePDF(pages, spreads, defaultOptions);

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

      const blob = await generatePDF(pages, spreads, defaultOptions);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
    });

    it('should generate PDF from explicit spreads', async () => {
      const pages: PageInfo[] = [];
      const spreads = [
        createSpreadInfo('page14-15.png', [14, 15]),
      ];

      const blob = await generatePDF(pages, spreads, defaultOptions);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
    });

    it('should call progress callback', async () => {
      const pages = [
        createPageInfo('page1.png'),
        createPageInfo('page2.png'),
      ];
      const spreads: SpreadInfo[] = [];
      const onProgress = vi.fn();

      await generatePDF(pages, spreads, defaultOptions, onProgress);

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

      const blob = await generatePDF(pages, spreads, defaultOptions);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
    });

    it('should handle compression preset', async () => {
      const pages = [
        createPageInfo('page1.png'),
      ];
      const spreads: SpreadInfo[] = [];
      const optionsWithCompression: PDFGenerationOptions = { 
        ...defaultOptions,
        compressionPreset: 'medium',
      };

      const blob = await generatePDF(pages, spreads, optionsWithCompression);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
    });

    it('should handle custom compression options', async () => {
      const pages = [
        createPageInfo('page1.png'),
      ];
      const spreads: SpreadInfo[] = [];
      const optionsWithCompression: PDFGenerationOptions = { 
        ...defaultOptions,
        compressionPreset: 'custom',
        convertToJpeg: true,
        jpegQuality: 0.7,
        reduceResolution: true,
        resolutionScale: 0.5,
      };

      const blob = await generatePDF(pages, spreads, optionsWithCompression);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
    });
  });

  describe('createPDF', () => {
    it('should return PDFResult with metadata', async () => {
      const pages = [
        createPageInfo('page1.png'),
        createPageInfo('page2.png'),
      ];
      const spreads: SpreadInfo[] = [];

      const result = await createPDF(pages, spreads, defaultOptions, 'test.pdf');

      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.fileName).toBe('test.pdf');
      expect(result.fileSize).toBeGreaterThan(0);
      expect(result.spreadCount).toBeGreaterThan(0);
    });

    it('should include estimated uncompressed size when compression is enabled', async () => {
      const pages = [
        createPageInfo('page1.png'),
      ];
      const spreads: SpreadInfo[] = [];
      const options: PDFGenerationOptions = { 
        ...defaultOptions,
        compressionPreset: 'medium',
      };

      const result = await createPDF(pages, spreads, options, 'test.pdf');

      expect(result.estimatedUncompressedSize).toBeDefined();
      expect(result.estimatedUncompressedSize).toBeGreaterThan(0);
    });
  });

  describe('downloadPDF', () => {
    it('should return PDFResult after download', async () => {
      // Mock saveAs from file-saver
      vi.mock('file-saver', () => ({
        saveAs: vi.fn(),
      }));

      const pages = [
        createPageInfo('page1.png'),
      ];
      const spreads: SpreadInfo[] = [];

      const result = await downloadPDF(pages, spreads, defaultOptions, 'test.pdf');

      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.fileName).toBe('test.pdf');
    });
  });

  describe('estimateUncompressedSize', () => {
    it('should estimate size based on image data', () => {
      const pages = [
        createPageInfo('page1.png'),
        createPageInfo('page2.png'),
      ];
      const spreads: SpreadInfo[] = [];

      const size = estimateUncompressedSize(pages, spreads);

      expect(size).toBeGreaterThan(0);
    });

    it('should include PDF overhead', () => {
      const pages: PageInfo[] = [];
      const spreads: SpreadInfo[] = [];

      const size = estimateUncompressedSize(pages, spreads);

      // Should have at least the PDF overhead
      expect(size).toBe(5000);
    });
  });

  describe('estimateCompressedSize', () => {
    it('should estimate smaller size for maximum compression', () => {
      const uncompressedSize = 1000000;

      const noneCompression = estimateCompressedSize(uncompressedSize, { ...defaultOptions, compressionPreset: 'none' });
      const maxCompression = estimateCompressedSize(uncompressedSize, { ...defaultOptions, compressionPreset: 'maximum' });

      expect(maxCompression).toBeLessThan(noneCompression);
    });

    it('should account for resolution reduction', () => {
      const uncompressedSize = 1000000;
      
      const noReduction = estimateCompressedSize(uncompressedSize, { 
        ...defaultOptions, 
        compressionPreset: 'custom',
        reduceResolution: false,
      });
      const withReduction = estimateCompressedSize(uncompressedSize, { 
        ...defaultOptions, 
        compressionPreset: 'custom',
        reduceResolution: true,
        resolutionScale: 0.5,
      });

      expect(withReduction).toBeLessThan(noReduction);
    });

    it('should return uncompressed size when no compression', () => {
      const uncompressedSize = 1000000;
      const compressed = estimateCompressedSize(uncompressedSize, { ...defaultOptions, compressionPreset: 'none' });

      expect(compressed).toBe(uncompressedSize);
    });
  });

  describe('COMPRESSION_PRESETS', () => {
    it('should have all expected presets', () => {
      expect(COMPRESSION_PRESETS).toHaveProperty('none');
      expect(COMPRESSION_PRESETS).toHaveProperty('light');
      expect(COMPRESSION_PRESETS).toHaveProperty('medium');
      expect(COMPRESSION_PRESETS).toHaveProperty('maximum');
      expect(COMPRESSION_PRESETS).toHaveProperty('custom');
    });

    it('should have valid settings for each preset', () => {
      for (const preset of Object.values(COMPRESSION_PRESETS)) {
        expect(preset).toHaveProperty('convertToJpeg');
        expect(preset).toHaveProperty('jpegQuality');
        expect(preset).toHaveProperty('reduceResolution');
        expect(preset).toHaveProperty('resolutionScale');
        expect(preset).toHaveProperty('description');
        expect(preset.jpegQuality).toBeGreaterThanOrEqual(0);
        expect(preset.jpegQuality).toBeLessThanOrEqual(1);
        expect(preset.resolutionScale).toBeGreaterThanOrEqual(0.25);
        expect(preset.resolutionScale).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('getCompressionDescription', () => {
    it('should return preset description for non-custom presets', () => {
      const description = getCompressionDescription({ ...defaultOptions, compressionPreset: 'medium' });
      expect(description).toBe(COMPRESSION_PRESETS.medium.description);
    });

    it('should return custom description for custom preset', () => {
      const description = getCompressionDescription({ 
        ...defaultOptions, 
        compressionPreset: 'custom',
        convertToJpeg: true,
        jpegQuality: 0.8,
        reduceResolution: true,
        resolutionScale: 0.75,
      });
      expect(description).toContain('JPEG');
      expect(description).toContain('80%');
      expect(description).toContain('75%');
    });

    it('should return "No compression" for custom with no options', () => {
      const description = getCompressionDescription({ 
        ...defaultOptions, 
        compressionPreset: 'custom',
        convertToJpeg: false,
        reduceResolution: false,
      });
      expect(description).toBe('No compression');
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(500)).toBe('500 Bytes');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(1572864)).toBe('1.5 MB');
    });
  });
});


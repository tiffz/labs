export interface ParsedFile {
  file: File;
  pageNumber: number | null;
  isSpread: boolean;
  spreadPages?: [number, number];
  displayName: string;
  originalName: string;
}

export interface PageInfo {
  parsedFile: ParsedFile;
  imageData: string;
  width: number;
  height: number;
}

export interface SpreadInfo {
  parsedFile: ParsedFile;
  imageData: string;
  width: number;
  height: number;
  pages: [number, number];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export type CompressionPreset = 'none' | 'light' | 'medium' | 'maximum' | 'custom';

export interface PDFGenerationOptions {
  convertToCMYK: boolean;
  compressionPreset: CompressionPreset;
  // Custom compression options (used when preset is 'custom')
  convertToJpeg: boolean;
  jpegQuality: number; // 0-1, default 0.85
  reduceResolution: boolean;
  resolutionScale: number; // 0.25-1, default 1 (100%)
}

export interface PDFResult {
  blob: Blob;
  fileName: string;
  fileSize: number;
  pageCount: number;
  spreadCount: number;
  estimatedUncompressedSize?: number;
}


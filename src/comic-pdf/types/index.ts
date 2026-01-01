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

export interface PDFGenerationOptions {
  convertToCMYK: boolean;
}


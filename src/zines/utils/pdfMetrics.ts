import type { BookletPageInfo, SpreadInfo, PDFGenerationOptions, CompressionPreset } from '../types';
import { MAX_EXPORT_CANVAS_DIMENSION } from '../constants';

/**
 * Compression preset configurations.
 *
 * These are lightweight (no pdf-lib dependency) so that the Export Options UI
 * can display size estimates without pulling in the full PDF generator. The
 * heavy pdf-lib-backed generator lives in `./pdfGenerator`.
 */
export const COMPRESSION_PRESETS: Record<CompressionPreset, {
  convertToJpeg: boolean;
  jpegQuality: number;
  reduceResolution: boolean;
  resolutionScale: number;
  description: string;
}> = {
  none: {
    convertToJpeg: false,
    jpegQuality: 1,
    reduceResolution: false,
    resolutionScale: 1,
    description: 'No compression - original quality',
  },
  light: {
    convertToJpeg: true,
    jpegQuality: 0.92,
    reduceResolution: false,
    resolutionScale: 1,
    description: 'Light - JPEG 92% quality',
  },
  medium: {
    convertToJpeg: true,
    jpegQuality: 0.85,
    reduceResolution: true,
    resolutionScale: 0.85,
    description: 'Medium - JPEG 85% + 85% resolution',
  },
  maximum: {
    convertToJpeg: true,
    jpegQuality: 0.7,
    reduceResolution: true,
    resolutionScale: 0.5,
    description: 'Maximum - Similar to macOS "Reduce File Size"',
  },
  custom: {
    convertToJpeg: false,
    jpegQuality: 0.85,
    reduceResolution: false,
    resolutionScale: 1,
    description: 'Custom settings',
  },
};

export function getEffectiveCompressionSettings(options: PDFGenerationOptions): {
  convertToJpeg: boolean;
  jpegQuality: number;
  reduceResolution: boolean;
  resolutionScale: number;
} {
  if (options.compressionPreset === 'custom') {
    return {
      convertToJpeg: options.convertToJpeg,
      jpegQuality: options.jpegQuality,
      reduceResolution: options.reduceResolution,
      resolutionScale: options.resolutionScale,
    };
  }
  return COMPRESSION_PRESETS[options.compressionPreset];
}

export function estimateUncompressedSize(pages: BookletPageInfo[], spreads: SpreadInfo[]): number {
  let totalSize = 0;

  for (const page of pages) {
    totalSize += Math.round((page.imageData.length * 3) / 4);
  }

  for (const spread of spreads) {
    totalSize += Math.round((spread.imageData.length * 3) / 4);
  }

  // Add PDF overhead (roughly 5KB for structure)
  totalSize += 5000;

  return totalSize;
}

export function estimateCompressedSize(
  uncompressedSize: number,
  options: PDFGenerationOptions,
): number {
  const settings = getEffectiveCompressionSettings(options);

  let size = uncompressedSize;

  if (settings.reduceResolution) {
    size *= (settings.resolutionScale * settings.resolutionScale);
  }

  if (settings.convertToJpeg) {
    const jpegRatio = 0.3 + (settings.jpegQuality * 0.4);
    size *= jpegRatio;
  }

  return Math.round(size);
}

export function getCompressionDescription(options: PDFGenerationOptions): string {
  if (options.compressionPreset !== 'custom') {
    return COMPRESSION_PRESETS[options.compressionPreset].description;
  }

  const parts: string[] = [];
  if (options.convertToJpeg) {
    parts.push(`JPEG ${Math.round(options.jpegQuality * 100)}%`);
  }
  if (options.reduceResolution) {
    parts.push(`${Math.round(options.resolutionScale * 100)}% resolution`);
  }
  return parts.length > 0 ? parts.join(' + ') : 'Custom - no compression';
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/** Convert a paper dimension into inches for DPI math. */
export function paperDimensionToInches(value: number, unit: 'in' | 'cm' | 'mm'): number {
  if (unit === 'in') return value;
  if (unit === 'mm') return value / 25.4;
  return value / 2.54;
}

/** Landscape sheet size in the paper's native unit (width ≥ height). */
export function minizineSheetSize(
  paper: { width: number; height: number },
): { width: number; height: number } {
  const landscape = paper.width >= paper.height;
  return {
    width: landscape ? paper.width : paper.height,
    height: landscape ? paper.height : paper.width,
  };
}

/** Landscape sheet size in inches (for export pixel math). */
export function minizineSheetSizeInches(paper: {
  width: number;
  height: number;
  unit: 'in' | 'cm' | 'mm';
}): { width: number; height: number } {
  const sheet = minizineSheetSize(paper);
  return {
    width: paperDimensionToInches(sheet.width, paper.unit),
    height: paperDimensionToInches(sheet.height, paper.unit),
  };
}

/**
 * Highest DPI that still fits both sheet edges under the canvas safety cap.
 */
export function maxSafeExportDpi(
  paper: { width: number; height: number; unit: 'in' | 'cm' | 'mm' },
  maxCanvasDim = MAX_EXPORT_CANVAS_DIMENSION,
): number {
  const sheet = minizineSheetSizeInches(paper);
  if (sheet.width <= 0 || sheet.height <= 0) return 300;
  return Math.max(72, Math.floor(Math.min(maxCanvasDim / sheet.width, maxCanvasDim / sheet.height)));
}

/**
 * DPI needed so the tallest/widest source roughly fills a minizine panel
 * without upscaling (capped by canvas safety).
 */
export function suggestDpiFromSources(
  paper: { width: number; height: number; unit: 'in' | 'cm' | 'mm' },
  sources: Array<{ width: number; height: number }>,
): number | null {
  if (sources.length === 0) return null;
  const sheet = minizineSheetSizeInches(paper);
  const panelW = sheet.width / 4;
  const panelH = sheet.height / 2;
  if (panelW <= 0 || panelH <= 0) return null;

  let needed = 0;
  for (const src of sources) {
    if (src.width <= 0 || src.height <= 0) continue;
    needed = Math.max(needed, src.width / panelW, src.height / panelH);
  }
  if (needed <= 0) return null;

  const capped = Math.min(Math.ceil(needed), maxSafeExportDpi(paper));
  return Math.round(capped / 50) * 50;
}

/** Full export pixel size for a minizine print sheet (after resolution scale). */
export function minizineExportPixelSize(
  paper: { width: number; height: number; dpi: number; unit: 'in' | 'cm' | 'mm' },
  resolutionScale = 1,
): { width: number; height: number; effectiveDpi: number; panelWidth: number; panelHeight: number } {
  const sheet = minizineSheetSizeInches(paper);
  const scale = Math.min(1, Math.max(0.05, resolutionScale));
  const width = Math.round(sheet.width * paper.dpi * scale);
  const height = Math.round(sheet.height * paper.dpi * scale);
  return {
    width,
    height,
    effectiveDpi: Math.round(paper.dpi * scale),
    panelWidth: Math.round(width / 4),
    panelHeight: Math.round(height / 2),
  };
}

/**
 * Realistic compressed size for a single minizine sheet export.
 * Uses typical PNG/JPEG bytes-per-pixel for photo content — not uncompressed RGBA.
 */
export function estimateMinizineExportBytes(
  paper: { width: number; height: number; dpi: number; unit: 'in' | 'cm' | 'mm' },
  options: { resolutionScale: number; jpegQuality: number },
): number {
  const { width, height } = minizineExportPixelSize(paper, options.resolutionScale);
  const pixels = width * height;
  // Photographic PNG ≈ 0.6–1.2 B/px; JPEG ≈ 0.08–0.35 B/px depending on quality.
  const bytesPerPixel =
    options.jpegQuality >= 1 ? 0.85 : 0.08 + options.jpegQuality * 0.28;
  return Math.max(50_000, Math.round(pixels * bytesPerPixel));
}

/** Convert paper dimension to PDF points (1/72"). */
export function paperDimensionToPoints(value: number, unit: 'in' | 'cm' | 'mm'): number {
  if (unit === 'in') return value * 72;
  if (unit === 'mm') return (value / 25.4) * 72;
  return (value / 2.54) * 72;
}


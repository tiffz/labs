import type { BookletPageInfo, SpreadInfo, PDFGenerationOptions, CompressionPreset } from '../types';

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

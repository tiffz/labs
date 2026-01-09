import { PDFDocument } from 'pdf-lib';
import { saveAs } from 'file-saver';
import type { PageInfo, SpreadInfo, PDFGenerationOptions, PDFResult, CompressionPreset } from '../types';
import { convertToCMYK } from './imageProcessor';
import { organizeIntoSpreads } from './spreadOrganizer';

/**
 * Compression preset configurations
 */
const COMPRESSION_PRESETS: Record<CompressionPreset, { 
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

export { COMPRESSION_PRESETS };

/**
 * Gets effective compression settings based on preset or custom options
 */
function getEffectiveCompressionSettings(options: PDFGenerationOptions): {
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

/**
 * Processes an image with compression options (JPEG conversion and/or resolution reduction)
 */
async function processImageForCompression(
  dataUrl: string,
  settings: { convertToJpeg: boolean; jpegQuality: number; reduceResolution: boolean; resolutionScale: number }
): Promise<string> {
  // If no compression needed, return original
  if (!settings.convertToJpeg && !settings.reduceResolution) {
    return dataUrl;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Calculate new dimensions if reducing resolution
      const newWidth = settings.reduceResolution 
        ? Math.round(img.width * settings.resolutionScale) 
        : img.width;
      const newHeight = settings.reduceResolution 
        ? Math.round(img.height * settings.resolutionScale) 
        : img.height;

      const canvas = document.createElement('canvas');
      canvas.width = newWidth;
      canvas.height = newHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Use high-quality image scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Fill with white background for transparency handling (needed for JPEG)
      if (settings.convertToJpeg) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, newWidth, newHeight);
      }

      // Draw the image (scaled if needed)
      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      // Output format
      if (settings.convertToJpeg) {
        resolve(canvas.toDataURL('image/jpeg', settings.jpegQuality));
      } else {
        resolve(canvas.toDataURL('image/png'));
      }
    };
    img.onerror = () => reject(new Error('Failed to load image for compression'));
    img.src = dataUrl;
  });
}

/**
 * Embeds an image into a PDF document
 */
async function embedImage(
  pdfDoc: PDFDocument,
  imageData: string,
  options: PDFGenerationOptions
): Promise<{ image: Awaited<ReturnType<typeof pdfDoc.embedPng>> | Awaited<ReturnType<typeof pdfDoc.embedJpg>>; width: number; height: number }> {
  let dataToUse = imageData;
  
  // Convert to CMYK if requested (though browser limitations apply)
  if (options.convertToCMYK) {
    dataToUse = await convertToCMYK(imageData);
  }
  
  // Apply compression (JPEG conversion and/or resolution reduction)
  const compressionSettings = getEffectiveCompressionSettings(options);
  if (compressionSettings.convertToJpeg || compressionSettings.reduceResolution) {
    try {
      dataToUse = await processImageForCompression(dataToUse, compressionSettings);
    } catch (error) {
      console.warn('Failed to compress image, using original:', error);
    }
  }
  
  // Determine image format and embed
  let image;
  if (dataToUse.startsWith('data:image/png')) {
    image = await pdfDoc.embedPng(dataToUse);
  } else if (dataToUse.startsWith('data:image/jpeg') || dataToUse.startsWith('data:image/jpg')) {
    image = await pdfDoc.embedJpg(dataToUse);
  } else {
    // Try PNG as fallback
    image = await pdfDoc.embedPng(dataToUse);
  }
  
  return {
    image,
    width: image.width,
    height: image.height,
  };
}

/**
 * Creates a spread from two page images side by side
 */
async function createSpreadFromPages(
  pdfDoc: PDFDocument,
  leftPage: PageInfo,
  rightPage: PageInfo,
  options: PDFGenerationOptions
): Promise<void> {
  const { image: leftImage, width: leftWidth, height: leftHeight } = await embedImage(
    pdfDoc,
    leftPage.imageData,
    options
  );
  
  // Yield after first image embedding
  await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
  
  const { image: rightImage, width: rightWidth, height: rightHeight } = await embedImage(
    pdfDoc,
    rightPage.imageData,
    options
  );
  
  // Yield after second image embedding
  await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
  
  // Use the height of the first page, and combine widths
  const spreadWidth = leftWidth + rightWidth;
  const spreadHeight = Math.max(leftHeight, rightHeight);
  
  const page = pdfDoc.addPage([spreadWidth, spreadHeight]);
  
  // Draw left page
  page.drawImage(leftImage, {
    x: 0,
    y: 0,
    width: leftWidth,
    height: leftHeight,
  });
  
  // Draw right page
  page.drawImage(rightImage, {
    x: leftWidth,
    y: 0,
    width: rightWidth,
    height: rightHeight,
  });
}

/**
 * Generates a Mixam-compatible PDF from pages and spreads.
 * Uses the same spread organization as the preview to ensure consistency.
 * Automatically pairs consecutive pages into spreads when possible.
 * For example, a 24-page comic becomes 12 spreads (13 PDF pages if there's a cover).
 */
export async function generatePDF(
  pages: PageInfo[],
  spreads: SpreadInfo[],
  options: PDFGenerationOptions,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  
  // Use the same spread organization as preview
  const previewSpreads = organizeIntoSpreads(pages, spreads);
  const totalSpreads = previewSpreads.length;
  
  // Process each spread with better yielding for responsiveness
  for (let i = 0; i < previewSpreads.length; i++) {
    const spread = previewSpreads[i];
    
    // Report progress
    if (onProgress) {
      onProgress((i + 1) / totalSpreads);
    }
    
    // Yield to browser more frequently to prevent freezing
    await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
    
    try {
      if (spread.type === 'explicit-spread' && spread.explicitSpread) {
        // Explicit spread - use as-is
        const { image, width, height } = await embedImage(
          pdfDoc,
          spread.explicitSpread.imageData,
          options
        );
        
        // Yield after image embedding
        await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
        
        const page = pdfDoc.addPage([width, height]);
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: width,
          height: height,
        });
      } else if (spread.leftPage && spread.rightPage) {
        // Auto-paired spread - combine two pages
        await createSpreadFromPages(
          pdfDoc,
          spread.leftPage,
          spread.rightPage,
          options
        );
      } else if (spread.leftPage) {
        // Single page
        const { image, width, height } = await embedImage(
          pdfDoc,
          spread.leftPage.imageData,
          options
        );
        
        // Yield after image embedding
        await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
        
        const page = pdfDoc.addPage([width, height]);
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: width,
          height: height,
        });
      }
    } catch (error) {
      console.error(`Error processing spread ${i + 1}:`, error);
      throw new Error(`Failed to process spread ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  // Generate PDF bytes
  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Estimates file size of uncompressed PDF based on image data sizes
 */
export function estimateUncompressedSize(pages: PageInfo[], spreads: SpreadInfo[]): number {
  let totalSize = 0;
  
  for (const page of pages) {
    // Base64 data URL overhead is about 1.37x, so divide to get rough original size
    totalSize += Math.round((page.imageData.length * 3) / 4);
  }
  
  for (const spread of spreads) {
    totalSize += Math.round((spread.imageData.length * 3) / 4);
  }
  
  // Add PDF overhead (roughly 5KB for structure)
  totalSize += 5000;
  
  return totalSize;
}

/**
 * Estimates file size with compression based on preset or custom settings
 */
export function estimateCompressedSize(
  uncompressedSize: number, 
  options: PDFGenerationOptions
): number {
  const settings = getEffectiveCompressionSettings(options);
  
  let size = uncompressedSize;
  
  // Resolution reduction: size scales with the square of the resolution scale
  // (since both width and height are reduced)
  if (settings.reduceResolution) {
    size *= (settings.resolutionScale * settings.resolutionScale);
  }
  
  // JPEG compression
  if (settings.convertToJpeg) {
    // Higher quality = less compression
    // At quality 0.85, expect about 40-60% of original size for PNG->JPEG
    const jpegRatio = 0.3 + (settings.jpegQuality * 0.4);
    size *= jpegRatio;
  }
  
  return Math.round(size);
}

/**
 * Gets compression ratio description for UI
 */
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
  
  return parts.length > 0 ? parts.join(' + ') : 'No compression';
}

/**
 * Generates a PDF and returns the result with metadata
 */
export async function createPDF(
  pages: PageInfo[],
  spreads: SpreadInfo[],
  options: PDFGenerationOptions,
  fileName: string = 'mixam-comic.pdf',
  onProgress?: (progress: number) => void
): Promise<PDFResult> {
  const previewSpreads = organizeIntoSpreads(pages, spreads);
  const blob = await generatePDF(pages, spreads, options, onProgress);
  
  const settings = getEffectiveCompressionSettings(options);
  const hasCompression = settings.convertToJpeg || settings.reduceResolution;
  
  return {
    blob,
    fileName,
    fileSize: blob.size,
    pageCount: pages.length + spreads.length,
    spreadCount: previewSpreads.length,
    estimatedUncompressedSize: hasCompression 
      ? estimateUncompressedSize(pages, spreads) 
      : undefined,
  };
}

/**
 * Downloads the generated PDF
 */
export async function downloadPDF(
  pages: PageInfo[],
  spreads: SpreadInfo[],
  options: PDFGenerationOptions,
  filename: string = 'mixam-comic.pdf',
  onProgress?: (progress: number) => void
): Promise<PDFResult> {
  const result = await createPDF(pages, spreads, options, filename, onProgress);
  saveAs(result.blob, result.fileName);
  return result;
}

/**
 * Downloads an existing PDF blob
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  saveAs(blob, fileName);
}

/**
 * Formats file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}


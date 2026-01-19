import { PDFDocument, rgb } from 'pdf-lib';
import { saveAs } from 'file-saver';
import type { BookletPageInfo, SpreadInfo, PDFGenerationOptions, PDFResult, CompressionPreset } from '../types';
import { convertToCMYK } from './imageProcessor';
import { organizeIntoSpreads } from './spreadOrganizer';
import { calculateRequiredContentPages } from './spreadPairing';

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
 * Handles blank pages by filling with blankPageColor
 */
async function createSpreadFromPages(
  pdfDoc: PDFDocument,
  leftPage: BookletPageInfo | { imageData: string; width: number; height: number } | undefined,
  rightPage: BookletPageInfo | { imageData: string; width: number; height: number } | undefined,
  options: PDFGenerationOptions,
  standardPageWidth?: number,
  standardPageHeight?: number
): Promise<void> {
  // Determine dimensions from available pages or use standard/default
  let leftWidth = standardPageWidth || 612;
  let leftHeight = standardPageHeight || 792;
  let rightWidth = standardPageWidth || 612;
  let rightHeight = standardPageHeight || 792;
  
  let leftImage = null;
  let rightImage = null;
  
  // Process left page
  if (leftPage?.imageData) {
    const result = await embedImage(pdfDoc, leftPage.imageData, options);
    leftImage = result.image;
    leftWidth = result.width;
    leftHeight = result.height;
    await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
  }
  
  // Process right page
  if (rightPage?.imageData) {
    const result = await embedImage(pdfDoc, rightPage.imageData, options);
    rightImage = result.image;
    rightWidth = result.width;
    rightHeight = result.height;
    await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
  }
  
  // Use consistent dimensions (prefer left page dimensions)
  const pageWidth = leftPage?.imageData ? leftWidth : rightWidth;
  const pageHeight = Math.max(leftHeight, rightHeight);
  const spreadWidth = pageWidth * 2;
  
  const page = pdfDoc.addPage([spreadWidth, pageHeight]);
  
  // Get blank page color
  const blankColor = hexToRgb(options.blankPageColor || '#FFFFFF');
  
  // Draw left page or fill with color
  if (leftImage) {
    page.drawImage(leftImage, {
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
    });
  } else {
    page.drawRectangle({
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
      color: rgb(blankColor.r, blankColor.g, blankColor.b),
    });
  }
  
  // Draw right page or fill with color
  if (rightImage) {
    page.drawImage(rightImage, {
      x: pageWidth,
      y: 0,
      width: pageWidth,
      height: pageHeight,
    });
  } else {
    page.drawRectangle({
      x: pageWidth,
      y: 0,
      width: pageWidth,
      height: pageHeight,
      color: rgb(blankColor.r, blankColor.g, blankColor.b),
    });
  }
}

/**
 * Generates a Mixam print-ready PDF (spreads format)
 */
async function generateMixamPDF(
  pages: BookletPageInfo[],
  spreads: SpreadInfo[],
  options: PDFGenerationOptions,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  
  const previewSpreads = organizeIntoSpreads(pages, spreads);
  const totalSpreads = previewSpreads.length;
  
  for (let i = 0; i < previewSpreads.length; i++) {
    const spread = previewSpreads[i];
    
    if (onProgress) {
      onProgress((i + 1) / totalSpreads);
    }
    
    await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
    
    try {
      // Determine standard page dimensions from the first available page
      let standardPageWidth: number | null = null;
      let standardPageHeight: number | null = null;
      
      for (const s of previewSpreads) {
        if (s.leftPage && !s.leftPage.isBlank) {
          standardPageWidth = s.leftPage.width;
          standardPageHeight = s.leftPage.height;
          break;
        }
        if (s.rightPage && !s.rightPage.isBlank) {
          standardPageWidth = s.rightPage.width;
          standardPageHeight = s.rightPage.height;
          break;
        }
      }
      
      if (spread.type === 'explicit-spread' && spread.explicitSpread) {
        const { image } = await embedImage(pdfDoc, spread.explicitSpread.imageData, options);
        await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
        
        // Scale spread to match expected dimensions (2x standard page width)
        // This ensures explicit spreads are the same size as two paired pages
        let spreadWidth = image.width;
        let spreadHeight = image.height;
        
        if (standardPageWidth && standardPageHeight) {
          // Target: spread should be 2x page width, same height
          spreadWidth = standardPageWidth * 2;
          spreadHeight = standardPageHeight;
        }
        
        const page = pdfDoc.addPage([spreadWidth, spreadHeight]);
        page.drawImage(image, { x: 0, y: 0, width: spreadWidth, height: spreadHeight });
      } else {
        // Auto-paired spread - may have blank pages that need color fill
        await createSpreadFromPages(
          pdfDoc, 
          spread.leftPage, 
          spread.rightPage, 
          options,
          standardPageWidth || undefined,
          standardPageHeight || undefined
        );
      }
    } catch (error) {
      console.error(`Error processing spread ${i + 1}:`, error);
      throw new Error(`Failed to process spread ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Generates a distribution PDF (sequential single pages for digital reading)
 */
async function generateDistributionPDF(
  pages: BookletPageInfo[],
  spreads: SpreadInfo[],
  options: PDFGenerationOptions,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  
  // Build complete reading order page list (includes blanks for missing pages)
  const allPages = buildReadingOrderPages(pages, spreads);
  
  // For distribution, filter out blank pages (digital readers don't need them)
  const pagesWithContent = allPages.filter(p => p.imageData);
  
  const totalPages = pagesWithContent.length;
  
  for (let i = 0; i < pagesWithContent.length; i++) {
    const pageData = pagesWithContent[i];
    
    if (onProgress) {
      onProgress((i + 1) / totalPages);
    }
    
    await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
    
    try {
      const { image, width, height } = await embedImage(pdfDoc, pageData.imageData, options);
      await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
      const page = pdfDoc.addPage([width, height]);
      page.drawImage(image, { x: 0, y: 0, width, height });
    } catch (error) {
      console.error(`Error processing page ${i + 1}:`, error);
      throw new Error(`Failed to process page ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Build complete reading order page list with blanks for missing pages
 * Order: Front cover (0) -> Inner front (-0.5) -> Pages 1, 2, 3... -> Inner back (-1) -> Back cover (-2)
 */
export function buildReadingOrderPages(
  pages: BookletPageInfo[],
  spreads: SpreadInfo[]
): Array<{ imageData: string; pageNumber: number; label: string }> {
  // Create a map of page numbers to pages
  const pageMap = new Map<number, BookletPageInfo>();
  for (const page of pages) {
    const pageNum = page.parsedFile.pageNumber;
    if (pageNum !== null) {
      pageMap.set(pageNum, page);
    }
  }
  
  // Track which pages are in explicit spreads
  const pagesInSpreads = new Set<number>();
  for (const spread of spreads) {
    pagesInSpreads.add(spread.pages[0]);
    pagesInSpreads.add(spread.pages[1]);
  }
  
  // Find max content page number
  let maxPage = 1;
  for (const page of pages) {
    const num = page.parsedFile.pageNumber;
    if (num !== null && num > maxPage) {
      maxPage = num;
    }
  }
  for (const spread of spreads) {
    if (spread.pages[0] > 0) maxPage = Math.max(maxPage, spread.pages[0]);
    if (spread.pages[1] > 0) maxPage = Math.max(maxPage, spread.pages[1]);
  }
  
  const allPages: Array<{ imageData: string; pageNumber: number; label: string }> = [];
  
  // Helper to add a page (with blank if missing)
  const addPage = (pageNum: number, label: string) => {
    // Skip if this page is part of a spread
    if (pagesInSpreads.has(pageNum)) return;
    
    const page = pageMap.get(pageNum);
    allPages.push({
      imageData: page?.imageData || '', // Empty string for blank page
      pageNumber: pageNum,
      label,
    });
  };
  
  // Add pages in reading order
  addPage(0, 'Front Cover');
  addPage(-0.5, 'Inner Front');
  
  // Content pages 1 through maxPage
  for (let i = 1; i <= maxPage; i++) {
    addPage(i, `Page ${i}`);
  }
  
  addPage(-1, 'Inner Back');
  addPage(-2, 'Back Cover');
  
  // Add spread images - spreads are double-width pages
  for (const spread of spreads) {
    allPages.push({
      imageData: spread.imageData,
      pageNumber: spread.pages[0], // Use left page number for sorting
      label: `Spread ${spread.pages[0]}-${spread.pages[1]}`,
    });
  }
  
  // Sort by reading order
  const getReadingOrder = (pageNum: number): number => {
    if (pageNum === 0) return 0;
    if (pageNum === -0.5) return 0.5;
    if (pageNum > 0) return pageNum;
    if (pageNum === -1) return 9998;
    if (pageNum === -2 || pageNum === -3) return 9999;
    return pageNum + 10000;
  };
  
  allPages.sort((a, b) => getReadingOrder(a.pageNumber) - getReadingOrder(b.pageNumber));
  
  return allPages;
}

/**
 * Builds a list of individual pages for home printing.
 * Unlike buildReadingOrderPages, this doesn't include spread images directly.
 * Instead, it adds placeholders for pages in spreads that will be filled by splitting.
 */
function buildHomePrintPages(
  pages: BookletPageInfo[],
  spreads: SpreadInfo[]
): Array<{ imageData: string; pageNumber: number; label: string; spreadHalf?: 'left' | 'right'; spreadImageData?: string }> {
  // Create a map of page number to page data
  const pageMap = new Map<number, BookletPageInfo>();
  for (const page of pages) {
    const pageNum = page.parsedFile.pageNumber;
    if (pageNum !== null) {
      pageMap.set(pageNum, page);
    }
  }
  
  // Create a map of page number to spread (for pages that are part of spreads)
  const spreadMap = new Map<number, SpreadInfo>();
  for (const spread of spreads) {
    spreadMap.set(spread.pages[0], spread);
    spreadMap.set(spread.pages[1], spread);
  }
  
  // Find max uploaded content page number
  let uploadedMaxPage = 1;
  for (const page of pages) {
    const num = page.parsedFile.pageNumber;
    if (num !== null && num > uploadedMaxPage) {
      uploadedMaxPage = num;
    }
  }
  for (const spread of spreads) {
    if (spread.pages[0] > 0) uploadedMaxPage = Math.max(uploadedMaxPage, spread.pages[0]);
    if (spread.pages[1] > 0) uploadedMaxPage = Math.max(uploadedMaxPage, spread.pages[1]);
  }
  
  // Calculate required content pages for proper booklet folding
  const maxPage = calculateRequiredContentPages(uploadedMaxPage);
  
  const allPages: Array<{ imageData: string; pageNumber: number; label: string; spreadHalf?: 'left' | 'right'; spreadImageData?: string }> = [];
  
  // Helper to add a page
  const addPage = (pageNum: number, label: string) => {
    const spread = spreadMap.get(pageNum);
    if (spread) {
      // This page is part of a spread - mark which half to extract
      const isLeftPage = spread.pages[0] === pageNum;
      allPages.push({
        imageData: '', // Will be filled by splitting
        pageNumber: pageNum,
        label,
        spreadHalf: isLeftPage ? 'left' : 'right',
        spreadImageData: spread.imageData,
      });
    } else {
      const page = pageMap.get(pageNum);
      allPages.push({
        imageData: page?.imageData || '',
        pageNumber: pageNum,
        label,
      });
    }
  };
  
  // Add pages in reading order
  addPage(0, 'Front Cover');
  addPage(-0.5, 'Inner Front');
  
  // Content pages 1 through maxPage
  for (let i = 1; i <= maxPage; i++) {
    addPage(i, `Page ${i}`);
  }
  
  addPage(-1, 'Inner Back');
  addPage(-2, 'Back Cover');
  
  return allPages;
}

/**
 * Splits a spread image and extracts one half
 */
async function splitSpreadForPDF(
  spreadImageData: string,
  half: 'left' | 'right'
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const halfWidth = Math.floor(img.width / 2);
      canvas.width = halfWidth;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve('');
        return;
      }
      
      if (half === 'left') {
        ctx.drawImage(img, 0, 0, halfWidth, img.height, 0, 0, halfWidth, img.height);
      } else {
        ctx.drawImage(img, halfWidth, 0, halfWidth, img.height, 0, 0, halfWidth, img.height);
      }
      
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve('');
    img.src = spreadImageData;
  });
}

/**
 * Generates a home duplex PDF (two pages per sheet for double-sided home printing)
 * Uses booklet imposition for saddle-stitch binding
 */
async function generateHomeDuplexPDF(
  pages: BookletPageInfo[],
  spreads: SpreadInfo[],
  options: PDFGenerationOptions,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  
  // Build page list with spread pages marked for splitting
  const rawPages = buildHomePrintPages(pages, spreads);
  
  // Process pages - split spread images as needed
  const allPages: Array<{ imageData: string; pageNumber: number; label: string }> = [];
  for (const page of rawPages) {
    if (page.spreadHalf && page.spreadImageData) {
      // Split the spread image and extract the correct half
      const halfImageData = await splitSpreadForPDF(page.spreadImageData, page.spreadHalf);
      allPages.push({
        imageData: halfImageData,
        pageNumber: page.pageNumber,
        label: page.label,
      });
    } else {
      allPages.push({
        imageData: page.imageData,
        pageNumber: page.pageNumber,
        label: page.label,
      });
    }
  }
  
  // Pad to multiple of 4 for booklet folding
  while (allPages.length % 4 !== 0) {
    allPages.push({ imageData: '', pageNumber: -999, label: 'Blank' });
  }
  
  // Determine standard page dimensions from first available image
  let standardPageWidth = 612; // Default letter width
  let standardPageHeight = 792; // Default letter height
  
  for (const page of allPages) {
    if (page.imageData) {
      try {
        const { width, height } = await embedImage(pdfDoc, page.imageData, options);
        standardPageWidth = width;
        standardPageHeight = height;
        break;
      } catch {
        // Continue to next page
      }
    }
  }
  
  const totalSheets = allPages.length / 4;
  const totalPDFPages = totalSheets * 2; // Front and back of each sheet
  
  // Booklet imposition: rearrange pages for saddle-stitch folding
  // For n pages, sheet 1 front = [n, 1], sheet 1 back = [2, n-1], etc.
  const imposedSheets: { front: [number, number]; back: [number, number] }[] = [];
  
  const n = allPages.length;
  for (let sheet = 0; sheet < totalSheets; sheet++) {
    // Front of sheet: last unassigned, first unassigned
    const frontLeft = n - 1 - (sheet * 2);
    const frontRight = sheet * 2;
    
    // Back of sheet: second unassigned, second-to-last unassigned  
    const backLeft = sheet * 2 + 1;
    const backRight = n - 2 - (sheet * 2);
    
    imposedSheets.push({
      front: [frontLeft, frontRight],
      back: [backLeft, backRight],
    });
  }
  
  let progress = 0;
  
  for (const sheet of imposedSheets) {
    // Create front of sheet (two pages side by side)
    await createImposedPage(pdfDoc, allPages, sheet.front, options, standardPageWidth, standardPageHeight);
    progress++;
    if (onProgress) onProgress(progress / totalPDFPages);
    
    // Create back of sheet
    await createImposedPage(pdfDoc, allPages, sheet.back, options, standardPageWidth, standardPageHeight);
    progress++;
    if (onProgress) onProgress(progress / totalPDFPages);
  }
  
  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Creates a single imposed page with two pages side by side
 */
/**
 * Converts a hex color string to RGB values (0-1 range)
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255,
    };
  }
  return { r: 1, g: 1, b: 1 }; // Default to white
}

async function createImposedPage(
  pdfDoc: PDFDocument,
  allPages: { imageData: string; pageNumber: number }[],
  indices: [number, number],
  options: PDFGenerationOptions,
  standardPageWidth: number = 612,
  standardPageHeight: number = 792
): Promise<void> {
  const [leftIdx, rightIdx] = indices;
  const leftPage = allPages[leftIdx];
  const rightPage = allPages[rightIdx];
  
  // Use standard dimensions for consistent page sizes
  const pageWidth = standardPageWidth;
  const pageHeight = standardPageHeight;
  
  // Create sheet (two pages wide)
  const sheetWidth = pageWidth * 2;
  const page = pdfDoc.addPage([sheetWidth, pageHeight]);
  
  // Get blank page color
  const blankColor = hexToRgb(options.blankPageColor || '#FFFFFF');
  
  // Draw left page (scaled to fit standard size)
  if (leftPage?.imageData) {
    const { image } = await embedImage(pdfDoc, leftPage.imageData, options);
    page.drawImage(image, { x: 0, y: 0, width: pageWidth, height: pageHeight });
  } else {
    // Fill blank page with color
    page.drawRectangle({
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
      color: rgb(blankColor.r, blankColor.g, blankColor.b),
    });
  }
  
  // Draw right page (scaled to fit standard size)
  if (rightPage?.imageData) {
    const { image } = await embedImage(pdfDoc, rightPage.imageData, options);
    page.drawImage(image, { x: pageWidth, y: 0, width: pageWidth, height: pageHeight });
  } else {
    // Fill blank page with color
    page.drawRectangle({
      x: pageWidth,
      y: 0,
      width: pageWidth,
      height: pageHeight,
      color: rgb(blankColor.r, blankColor.g, blankColor.b),
    });
  }
  
  await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
}

/**
 * Generates a print-ready PDF from pages and spreads.
 * Supports multiple export formats: mixam, home-duplex, distribution
 */
export async function generatePDF(
  pages: BookletPageInfo[],
  spreads: SpreadInfo[],
  options: PDFGenerationOptions,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const format = options.exportFormat || 'mixam';
  
  switch (format) {
    case 'distribution':
      return generateDistributionPDF(pages, spreads, options, onProgress);
    case 'home-duplex':
      return generateHomeDuplexPDF(pages, spreads, options, onProgress);
    case 'mixam':
    default:
      return generateMixamPDF(pages, spreads, options, onProgress);
  }
}

/**
 * Estimates file size of uncompressed PDF based on image data sizes
 */
export function estimateUncompressedSize(pages: BookletPageInfo[], spreads: SpreadInfo[]): number {
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
  pages: BookletPageInfo[],
  spreads: SpreadInfo[],
  options: PDFGenerationOptions,
  fileName: string = 'zine.pdf',
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
  pages: BookletPageInfo[],
  spreads: SpreadInfo[],
  options: PDFGenerationOptions,
  filename: string = 'zine.pdf',
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

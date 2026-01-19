import type { ParsedFile, BookletPageInfo, SpreadInfo, ValidationResult } from '../types';

/**
 * Loads an image file and returns its data URL and dimensions
 */
export async function loadImage(file: File): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        resolve({
          dataUrl,
          width: img.width,
          height: img.height,
        });
      };
      img.onerror = () => reject(new Error(`Failed to load image: ${file.name}`));
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsDataURL(file);
  });
}

/**
 * Validates that all images have consistent dimensions (except spreads)
 */
export function validateImageDimensions(
  pages: BookletPageInfo[],
  spreads: SpreadInfo[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Having at least one page or spread is valid for export
  if (pages.length === 0 && spreads.length === 0) {
    return {
      isValid: false,
      errors: [],
      warnings: ['No pages uploaded yet'],
    };
  }
  
  // Get standard page dimensions from first regular page
  // Filter out any pages that might have been incorrectly classified as spreads
  let standardWidth: number | null = null;
  let standardHeight: number | null = null;
  
  // Find the most common page dimensions among regular pages
  const dimensionCounts = new Map<string, number>();
  for (const page of pages) {
    const key = `${page.width}×${page.height}`;
    dimensionCounts.set(key, (dimensionCounts.get(key) || 0) + 1);
  }
  
  // Use the most common dimensions as standard
  let maxCount = 0;
  for (const [key, count] of dimensionCounts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      const [width, height] = key.split('×').map(Number);
      standardWidth = width;
      standardHeight = height;
    }
  }
  
  // Dimension mismatches are warnings, not errors - images will be scaled to fit
  if (pages.length > 0 && standardWidth !== null) {
    // Check all regular pages have same dimensions
    for (const page of pages) {
      if (page.width !== standardWidth || page.height !== standardHeight) {
        warnings.push(
          `Page "${page.parsedFile.displayName}" has different dimensions (${page.width}×${page.height}) - will be scaled to fit`
        );
      }
    }
  }
  
  // Validate spreads - warn about dimension mismatches
  if (spreads.length > 0 && standardWidth !== null) {
    const expectedSpreadWidth = standardWidth * 2;
    for (const spread of spreads) {
      if (spread.width !== expectedSpreadWidth) {
        warnings.push(
          `Spread "${spread.parsedFile.displayName}" width (${spread.width}) differs from expected (${expectedSpreadWidth}) - will be scaled`
        );
      }
      if (spread.height !== standardHeight) {
        warnings.push(
          `Spread "${spread.parsedFile.displayName}" height (${spread.height}) differs from expected (${standardHeight}) - will be scaled`
        );
      }
    }
  } else if (spreads.length > 0 && standardWidth === null) {
    // If we only have spreads, use first spread to determine standard
    const firstSpread = spreads[0];
    standardWidth = firstSpread.width / 2;
    standardHeight = firstSpread.height;
    
    // Warn about inconsistent spread dimensions
    for (const spread of spreads) {
      if (spread.width !== firstSpread.width || spread.height !== firstSpread.height) {
        warnings.push(
          `Spread "${spread.parsedFile.displayName}" has different dimensions (${spread.width}×${spread.height}) - will be scaled`
        );
      }
    }
  }
  
  // Check for missing page numbers
  const pagesWithoutNumbers = pages.filter(p => p.parsedFile.pageNumber === null);
  if (pagesWithoutNumbers.length > 0) {
    warnings.push(
      `${pagesWithoutNumbers.length} page(s) without page numbers: ` +
      pagesWithoutNumbers.map(p => p.parsedFile.displayName).join(', ')
    );
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Processes all files and loads their images
 */
export async function processFiles(
  parsedFiles: ParsedFile[]
): Promise<{ pages: BookletPageInfo[]; spreads: SpreadInfo[] }> {
  const pages: BookletPageInfo[] = [];
  const spreads: SpreadInfo[] = [];
  
  for (const parsedFile of parsedFiles) {
    const imageData = await loadImage(parsedFile.file);
    
    if (parsedFile.isSpread && parsedFile.spreadPages) {
      spreads.push({
        parsedFile,
        imageData: imageData.dataUrl,
        width: imageData.width,
        height: imageData.height,
        pages: parsedFile.spreadPages,
      });
    } else {
      pages.push({
        parsedFile,
        imageData: imageData.dataUrl,
        width: imageData.width,
        height: imageData.height,
      });
    }
  }
  
  return { pages, spreads };
}

/**
 * Converts RGB image to CMYK (simplified - actual CMYK conversion requires color profiles)
 * Note: This is a basic approximation. For true CMYK conversion, you'd need a color profile library.
 * For now, we'll preserve RGB and let the printer handle conversion.
 */
export async function convertToCMYK(dataUrl: string): Promise<string> {
  // TODO: Implement proper CMYK conversion if needed
  // For now, return original - printers can handle RGB to CMYK conversion
  return dataUrl;
}

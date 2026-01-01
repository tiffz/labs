import { PDFDocument } from 'pdf-lib';
import { saveAs } from 'file-saver';
import type { PageInfo, SpreadInfo, PDFGenerationOptions } from '../types';
import { convertToCMYK } from './imageProcessor';
import { organizeIntoSpreads } from './spreadOrganizer';

/**
 * Embeds an image into a PDF document
 */
async function embedImage(
  pdfDoc: PDFDocument,
  imageData: string,
  convertCMYK: boolean
): Promise<{ image: Awaited<ReturnType<typeof pdfDoc.embedPng>> | Awaited<ReturnType<typeof pdfDoc.embedJpg>>; width: number; height: number }> {
  let dataToUse = imageData;
  
  // Convert to CMYK if requested (though browser limitations apply)
  if (convertCMYK) {
    dataToUse = await convertToCMYK(imageData);
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
    options.convertToCMYK
  );
  
  // Yield after first image embedding
  await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
  
  const { image: rightImage, width: rightWidth, height: rightHeight } = await embedImage(
    pdfDoc,
    rightPage.imageData,
    options.convertToCMYK
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
    
    if (spread.type === 'explicit-spread' && spread.explicitSpread) {
      // Explicit spread - use as-is
      const { image, width, height } = await embedImage(
        pdfDoc,
        spread.explicitSpread.imageData,
        options.convertToCMYK
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
        options.convertToCMYK
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
  }
  
  // Generate PDF bytes
  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
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
): Promise<void> {
  const blob = await generatePDF(pages, spreads, options, onProgress);
  saveAs(blob, filename);
}


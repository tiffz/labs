import React, { useState, useRef, useCallback, useMemo, useEffect, useTransition, useDeferredValue, lazy, Suspense } from 'react';
import type { 
  PaperConfig, 
  ModalContent, 
  PageSlot, 
  ZineMode,
  ParsedFile,
  BookletPageInfo,
  SpreadInfo,
  ValidationResult,
  PDFGenerationOptions,
  PDFResult,
  PDFExportFormat,
  ImageSizeWarning,
} from './types';
import { DEFAULT_PDF_OPTIONS, DEFAULT_BLEED_CONFIG } from './types';
import { PAGE_SLOTS_CONFIG, DEFAULT_PAPER_CONFIG, DEFAULT_BOOKLET_PAPER_CONFIG } from './constants';
import { buildBookPages, createSpreadFileName, createPageFileName, getPageLabel } from './utils/spreadPairing';
import { splitSpreadImage, combineToSpreadImage } from './utils/imageManipulation';
import PaperConfiguration from './components/PaperConfiguration';
import ImageUploaderSlot from './components/ImageUploaderSlot';
import ModeToggle from './components/ModeToggle';
import ExportOptions from './components/ExportOptions';
import SharedImageLibrary from './components/SharedImageLibrary';
import Instructions from './components/Instructions';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load heavy components for better initial load performance
const PrintSheetCanvas = lazy(() => import('./components/PrintSheetCanvas'));
const SpreadPreview = lazy(() => import('./components/SpreadPreview'));
const BookReader = lazy(() => import('./components/BookReader'));

// Loading fallback component
const LoadingFallback: React.FC<{ height?: string }> = ({ height = '200px' }) => (
  <div 
    className="flex items-center justify-center bg-stone-50 rounded-lg animate-pulse"
    style={{ minHeight: height }}
  >
    <p className="text-stone-400">Loading...</p>
  </div>
);
import { parseAndSortFiles, validateImageDimensions, createPDF, downloadBlob, loadImage } from './utils';

// Shared uploaded file with loaded image data
interface UploadedImage {
  file?: File; // Optional - may be undefined for synthetic images (split/combined)
  name: string; // Display name for the image
  dataUrl: string;
  thumbnailUrl?: string; // Small version for UI display
  width: number;
  height: number;
  id: string;
}

// Generate a thumbnail from an image
const generateThumbnail = (dataUrl: string, maxSize: number = 120): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      
      // Calculate thumbnail dimensions
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxSize) {
          height = Math.round(height * maxSize / width);
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = Math.round(width * maxSize / height);
          height = maxSize;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.6));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
};

// Downscale image if too large (for memory optimization)
const MAX_IMAGE_DIMENSION = 4000;
const downscaleIfNeeded = (dataUrl: string, width: number, height: number): Promise<{ dataUrl: string; width: number; height: number }> => {
  return new Promise((resolve) => {
    // If image is within limits, return as-is
    if (width <= MAX_IMAGE_DIMENSION && height <= MAX_IMAGE_DIMENSION) {
      resolve({ dataUrl, width, height });
      return;
    }
    
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ dataUrl, width, height });
        return;
      }
      
      // Calculate new dimensions maintaining aspect ratio
      let newWidth = width;
      let newHeight = height;
      if (width > height) {
        if (width > MAX_IMAGE_DIMENSION) {
          newHeight = Math.round(height * MAX_IMAGE_DIMENSION / width);
          newWidth = MAX_IMAGE_DIMENSION;
        }
      } else {
        if (height > MAX_IMAGE_DIMENSION) {
          newWidth = Math.round(width * MAX_IMAGE_DIMENSION / height);
          newHeight = MAX_IMAGE_DIMENSION;
        }
      }
      
      canvas.width = newWidth;
      canvas.height = newHeight;
      ctx.drawImage(img, 0, 0, newWidth, newHeight);
      
      // Use high quality for downscaled images
      resolve({ 
        dataUrl: canvas.toDataURL('image/jpeg', 0.92), 
        width: newWidth, 
        height: newHeight 
      });
    };
    img.onerror = () => resolve({ dataUrl, width, height });
    img.src = dataUrl;
  });
};

type MinizineViewMode = 'edit' | 'print' | 'preview';
type BookletViewMode = 'spreads' | 'preview';

const App: React.FC = () => {
  // =============================================
  // SHARED STATE
  // =============================================
  const [_isPending, startTransition] = useTransition();
  void _isPending; // Available for loading indicators during mode transitions
  const [zineMode, setZineModeInternal] = useState<ZineMode>('minizine');
  
  // Wrap mode changes in transition to avoid blocking UI
  const setZineMode = useCallback((mode: ZineMode) => {
    startTransition(() => {
      setZineModeInternal(mode);
    });
  }, []);
  const [sharedImages, setSharedImages] = useState<UploadedImage[]>([]);
  // Deferred version for non-urgent computations (booklet parsing, etc.)
  const deferredSharedImages = useDeferredValue(sharedImages);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  
  // Paper config - separate for each mode
  const [minizinePaperConfig, setMinizinePaperConfig] = useState<PaperConfig>(DEFAULT_PAPER_CONFIG);
  const [bookletPaperConfig, setBookletPaperConfig] = useState<PaperConfig>(DEFAULT_BOOKLET_PAPER_CONFIG);
  
  const paperConfig = zineMode === 'minizine' ? minizinePaperConfig : bookletPaperConfig;
  const setPaperConfig = zineMode === 'minizine' ? setMinizinePaperConfig : setBookletPaperConfig;
  
  const [exportOptions, setExportOptions] = useState<PDFGenerationOptions>({
    ...DEFAULT_PDF_OPTIONS,
    bleed: DEFAULT_BLEED_CONFIG,
  });
  const [fileName, setFileName] = useState('zine');
  
  // Minizine Mode State  
  const [minizineSlotAssignments, setMinizineSlotAssignments] = useState<Record<string, string>>({});
  const [imageFitModes, setImageFitModes] = useState<Record<string, 'cover' | 'contain'>>({});
  const [minizineViewMode, setMinizineViewMode] = useState<MinizineViewMode>('edit');
  const [draggedSlotId, setDraggedSlotId] = useState<string | null>(null);
  const [dragOverSlotId, setDragOverSlotId] = useState<string | null>(null);
  const [modalContent, setModalContent] = useState<ModalContent | null>(null);
  
  // Booklet Mode State
  const [bookletViewMode, setBookletViewMode] = useState<BookletViewMode>('spreads');
  const [bookletValidation, setBookletValidation] = useState<ValidationResult>({
    isValid: false,
    errors: [],
    warnings: [],
  });
  const [pdfResult, setPdfResult] = useState<PDFResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [blankPageColor, setBlankPageColor] = useState<string>('#FFFFFF');
  const [blankPageColors, setBlankPageColors] = useState<Map<number, string>>(new Map());
  
  // Image warnings
  const [imageSizeWarnings, setImageSizeWarnings] = useState<ImageSizeWarning[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const placeholderInputRef = useRef<HTMLInputElement>(null);
  const [_pendingPlaceholderSlot, setPendingPlaceholderSlot] = useState<string | null>(null);
  void _pendingPlaceholderSlot; // Used by placeholder file input handler
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  
  // =============================================
  // Derived state: Minizine slot images
  // =============================================
  const images = useMemo(() => {
    const result: Record<string, string> = {};
    for (const [slotId, imageId] of Object.entries(minizineSlotAssignments)) {
      const image = sharedImages.find(img => img.id === imageId);
      if (image) {
        result[slotId] = image.dataUrl;
      }
    }
    return result;
  }, [sharedImages, minizineSlotAssignments]);
  
  const hasMinizineImages = Object.keys(images).length > 0;
  
  // =============================================
  // Derived state: Booklet pages/spreads
  // Uses deferred images to avoid blocking UI during heavy parsing
  // =============================================
  const { bookletPages, bookletSpreads } = useMemo(() => {
    if (deferredSharedImages.length === 0) {
      return { bookletPages: [] as BookletPageInfo[], bookletSpreads: [] as SpreadInfo[] };
    }
    
    try {
      // Create synthetic File objects for images that don't have them
      // This allows synthetic images (from split/combine) to be parsed
      const imagesWithFiles = deferredSharedImages.map(img => {
        if (img.file) return img;
        // Create a synthetic File object for parsing
        const syntheticFile = new File([], img.name || 'unnamed.png', { type: 'image/png' });
        return { ...img, file: syntheticFile };
      });
      
      // Filter out any images without names
      const validImages = imagesWithFiles.filter(img => img.file && img.file.name);
      if (validImages.length === 0) {
        return { bookletPages: [] as BookletPageInfo[], bookletSpreads: [] as SpreadInfo[] };
      }
      
      const parsedFiles = parseAndSortFiles(validImages.map(img => img.file!));
      const pages: BookletPageInfo[] = [];
      const spreads: SpreadInfo[] = [];
      
      for (const parsedFile of parsedFiles) {
        const image = validImages.find(img => img.file!.name === parsedFile.originalName);
        if (!image || !image.dataUrl) continue;
        
        if (parsedFile.isSpread && parsedFile.spreadPages) {
          spreads.push({
            parsedFile,
            imageData: image.dataUrl,
            width: image.width,
            height: image.height,
            pages: parsedFile.spreadPages,
          });
        } else {
          pages.push({
            parsedFile,
            imageData: image.dataUrl,
            width: image.width,
            height: image.height,
          });
        }
      }
      
      return { bookletPages: pages, bookletSpreads: spreads };
    } catch (error) {
      console.error('Error parsing booklet pages:', error);
      return { bookletPages: [] as BookletPageInfo[], bookletSpreads: [] as SpreadInfo[] };
    }
  }, [deferredSharedImages]);
  
  // =============================================
  // Minizine book pages for preview
  // Build pages in reading order to match the physical print layout
  // =============================================
  const minizineBookPages = useMemo(() => {
    // Reading order for a minizine: Front Cover, then pages 1-6, then Back Cover
    // We need blank pages before front and after back for proper spread display
    const readingOrder: Array<{ id: string; label: string; isBlank?: boolean }> = [
      { id: 'blank-start', label: '', isBlank: true },
      { id: 'frontCover', label: 'Front Cover' },
      { id: 'page1', label: 'Page 1' },
      { id: 'page2', label: 'Page 2' },
      { id: 'page3', label: 'Page 3' },
      { id: 'page4', label: 'Page 4' },
      { id: 'page5', label: 'Page 5' },
      { id: 'page6', label: 'Page 6' },
      { id: 'backCover', label: 'Back Cover' },
      { id: 'blank-end', label: '', isBlank: true },
    ];
    
    return readingOrder.map(page => ({
      id: page.id,
      imageData: page.isBlank ? '' : (images[page.id] || ''),
      label: page.label,
      isBlank: !!page.isBlank,
      fitMode: page.isBlank ? undefined : (imageFitModes[page.id] || 'cover'),
    }));
  }, [images, imageFitModes]);

  // =============================================
  // Booklet book pages for preview  
  // Includes both single pages and spreads, properly ordered for book reading
  // =============================================
  // Build book pages using shared utility for consistency with SpreadPreview
  const bookletBookPages = useMemo(
    () => buildBookPages(bookletPages, bookletSpreads),
    [bookletPages, bookletSpreads]
  );
  
  // Validate booklet pages
  useEffect(() => {
    if (bookletPages.length === 0 && bookletSpreads.length === 0) {
      setBookletValidation({ isValid: false, errors: [], warnings: [] });
    } else {
      const validation = validateImageDimensions(bookletPages, bookletSpreads);
      setBookletValidation(validation);
    }
  }, [bookletPages, bookletSpreads]);

  // Clear PDF result when images change to prevent stale downloads
  useEffect(() => {
    setPdfResult(null);
    setGenerationError(null);
  }, [sharedImages, bookletPages, bookletSpreads]);

  // Check image sizes against paper config
  useEffect(() => {
    try {
      const warnings: ImageSizeWarning[] = [];
      const config = zineMode === 'minizine' ? minizinePaperConfig : bookletPaperConfig;
      
      // For minizine, each page is 1/4 width and 1/2 height of sheet
      const targetWidth = zineMode === 'minizine' ? config.width / 4 : config.width;
      const targetHeight = zineMode === 'minizine' ? config.height / 2 : config.height;
      
      if (targetWidth <= 0 || targetHeight <= 0) {
        setImageSizeWarnings([]);
        return;
      }
      
      const targetAspect = targetHeight / targetWidth;
      const targetPixelWidth = targetWidth * config.dpi;
      const targetPixelHeight = targetHeight * config.dpi;
      
      // For booklet mode, also calculate spread dimensions
      const spreadTargetAspect = targetHeight / (targetWidth * 2);
      
      // Get set of spread image IDs for booklet mode
      const spreadImageIds = new Set<string>();
      if (zineMode === 'booklet') {
        bookletSpreads.forEach(spread => {
          // Find the corresponding shared image by matching data
          const matchingImage = sharedImages.find(img => 
            img.file?.name === spread.parsedFile.originalName ||
            img.dataUrl === spread.imageData
          );
          if (matchingImage) {
            spreadImageIds.add(matchingImage.id);
          }
        });
      }
      
      sharedImages.forEach(image => {
        if (!image || !image.width || !image.height || !image.file) return;
        
        const imageAspect = image.height / image.width;
        
        // Check if this is a spread image (in booklet mode)
        const isSpreadImage = spreadImageIds.has(image.id);
        const expectedAspect = isSpreadImage ? spreadTargetAspect : targetAspect;
        const aspectDiff = Math.abs(imageAspect - expectedAspect) / expectedAspect;
        
        // For spreads, expected width is 2x single page
        const expectedPixelWidth = isSpreadImage ? targetPixelWidth * 2 : targetPixelWidth;
        
        if (aspectDiff > 0.15) {
          warnings.push({
            imageId: image.id,
            fileName: image.file.name || 'Unknown',
            issue: 'aspect-ratio',
            message: `Aspect ratio differs by ${Math.round(aspectDiff * 100)}% - image will be cropped`,
            severity: 'warning',
          });
        } else if (image.width < expectedPixelWidth * 0.7 || image.height < targetPixelHeight * 0.7) {
          warnings.push({
            imageId: image.id,
            fileName: image.file.name || 'Unknown',
            issue: 'upscale',
            message: `Resolution is low (${image.width}x${image.height}px) - may appear blurry at ${config.dpi} DPI`,
            severity: 'warning',
          });
        }
      });
      
      setImageSizeWarnings(warnings);
    } catch (error) {
      console.error('Error checking image sizes:', error);
      setImageSizeWarnings([]);
    }
  }, [sharedImages, zineMode, minizinePaperConfig, bookletPaperConfig, bookletSpreads]);

  // Get warning for a specific image
  const getWarningForImage = useCallback((imageId: string) => {
    return imageSizeWarnings.find(w => w.imageId === imageId);
  }, [imageSizeWarnings]);

  // =============================================
  // FILE UPLOAD HANDLERS
  // =============================================
  
  // Auto-assign uploaded images to minizine slots based on filename patterns
  const autoAssignToMinizineSlots = useCallback((newImages: UploadedImage[]) => {
    const smartPlaced: Record<string, string> = {};
    const unplacedImages: UploadedImage[] = [];
    
    // Helper to extract page number from filename
    const extractPageNumber = (filename: string): number | null => {
      const normalized = filename.replace(/\.[^/.]+$/, "").toLowerCase();
      
      // Check for "page" followed by number
      const pageMatch = normalized.match(/page[_\s-]*(\d+)/i);
      if (pageMatch) return parseInt(pageMatch[1], 10);
      
      // Check for "p" followed by number (p1, p2, etc.)
      const pMatch = normalized.match(/^p(\d+)$/i);
      if (pMatch) return parseInt(pMatch[1], 10);
      
      // Check if filename is just a number
      const numMatch = normalized.match(/^(\d+)$/);
      if (numMatch) return parseInt(numMatch[1], 10);
      
      return null;
    };
    
    // Helper to check for cover keywords
    // Returns: 'outer-front', 'inner-front', 'outer-back', 'inner-back', or null
    const checkCoverType = (filename: string): 'outer-front' | 'inner-front' | 'outer-back' | 'inner-back' | null => {
      const normalized = filename.replace(/\.[^/.]+$/, "").replace(/[\s_-]/g, "").toLowerCase();
      
      // Check for explicit inner/outer keywords first
      const hasInner = /inner/i.test(normalized);
      const hasOuter = /outer/i.test(normalized);
      const hasFront = /front/i.test(normalized);
      const hasBack = /back/i.test(normalized);
      const hasCover = /cover/i.test(normalized);
      
      // Inner front cover
      if (hasInner && (hasFront || (hasCover && !hasBack))) {
        return 'inner-front';
      }
      // Inner back cover
      if (hasInner && hasBack) {
        return 'inner-back';
      }
      // Outer front cover (explicit outer, or just front/cover without inner)
      if ((hasOuter && hasFront) || (hasFront && !hasInner && !hasBack) || (hasCover && !hasInner && !hasBack)) {
        return 'outer-front';
      }
      // Outer back cover
      if ((hasOuter && hasBack) || (hasBack && !hasInner)) {
        return 'outer-back';
      }
      
      return null;
    };
    
    // First pass: collect all images by cover type
    const outerFrontCandidates: UploadedImage[] = [];
    const outerBackCandidates: UploadedImage[] = [];
    const innerCoverImages: UploadedImage[] = []; // Skip these for minizine slots
    const otherImages: UploadedImage[] = [];
    
    for (const image of newImages) {
      const coverType = checkCoverType(image.name);
      if (coverType === 'outer-front') {
        outerFrontCandidates.push(image);
      } else if (coverType === 'outer-back') {
        outerBackCandidates.push(image);
      } else if (coverType === 'inner-front' || coverType === 'inner-back') {
        innerCoverImages.push(image); // Skip inner covers for minizine
      } else {
        otherImages.push(image);
      }
    }
    
    // Assign outer front cover (prioritize first match)
    if (outerFrontCandidates.length > 0 && !smartPlaced['frontCover']) {
      smartPlaced['frontCover'] = outerFrontCandidates[0].id;
    }
    
    // Assign outer back cover
    if (outerBackCandidates.length > 0 && !smartPlaced['backCover']) {
      smartPlaced['backCover'] = outerBackCandidates[0].id;
    }
    
    // Process remaining images (outer covers after first, inner covers, and others)
    const remainingImages = [
      ...outerFrontCandidates.slice(smartPlaced['frontCover'] ? 1 : 0),
      ...outerBackCandidates.slice(smartPlaced['backCover'] ? 1 : 0),
      ...innerCoverImages, // Inner covers go to unassigned pool
      ...otherImages,
    ];
    
    for (const image of remainingImages) {
      const fileName = image.name;
      let matched = false;
      
      // Check for page numbers
      if (!matched) {
        const pageNum = extractPageNumber(fileName);
        if (pageNum !== null && pageNum >= 1 && pageNum <= 6) {
          const slotId = `page${pageNum}`;
          if (!smartPlaced[slotId]) {
            smartPlaced[slotId] = image.id;
            matched = true;
          }
        }
      }
      
      if (!matched) unplacedImages.push(image);
    }
    
    // Fill remaining slots with unplaced images in reading order
    const readingOrderSlots = ['frontCover', 'page1', 'page2', 'page3', 'page4', 'page5', 'page6', 'backCover'];
    
    setMinizineSlotAssignments(prev => {
      const updated = { ...prev, ...smartPlaced };
      let unplacedIdx = 0;
      for (const slotId of readingOrderSlots) {
        if (unplacedIdx >= unplacedImages.length) break;
        if (!updated[slotId]) {
          updated[slotId] = unplacedImages[unplacedIdx].id;
          unplacedIdx++;
        }
      }
      return updated;
    });
    
    setImageFitModes(prev => {
      const updated = { ...prev };
      for (const slot of PAGE_SLOTS_CONFIG) {
        if (!updated[slot.id]) updated[slot.id] = 'cover';
      }
      return updated;
    });
  }, []);
  
  // Process uploaded files and optionally auto-assign to minizine slots
  const processUploadedFiles = useCallback(async (files: File[], assignToMinizine = true) => {
    if (!files.length) return;
    setIsProcessingFiles(true);
    
    try {
      const newImages: UploadedImage[] = [];
      
      // Process files in parallel batches for better performance
      const batchSize = 4;
      const fileArray = Array.from(files);
      
      for (let i = 0; i < fileArray.length; i += batchSize) {
        const batch = fileArray.slice(i, i + batchSize);
        
        const batchResults = await Promise.all(
          batch.map(async (file) => {
            // Skip if file with same name already exists
            if (sharedImages.some(img => img.file?.name === file.name)) return null;
            
            try {
              const loaded = await loadImage(file);
              
              // Downscale if image is too large to improve memory usage
              const { dataUrl, width, height } = await downscaleIfNeeded(
                loaded.dataUrl, 
                loaded.width, 
                loaded.height
              );
              
              // Generate thumbnail for UI display
              const thumbnailUrl = await generateThumbnail(dataUrl, 120);
              
              return {
                file,
                name: file.name,
                dataUrl,
                thumbnailUrl,
                width,
                height,
                id: `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              };
            } catch (error) {
              console.error(`Failed to load image: ${file.name}`, error);
              return null;
            }
          })
        );
        
        const validResults = batchResults.filter((img): img is NonNullable<typeof img> => img !== null);
        newImages.push(...validResults);
        
        // Yield to main thread between batches
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      
      if (newImages.length === 0) return;
      
      setSharedImages(prev => [...prev, ...newImages]);
      
      // Auto-assign to minizine slots
      if (assignToMinizine) {
        autoAssignToMinizineSlots(newImages);
      }
    } finally {
      setIsProcessingFiles(false);
    }
  }, [sharedImages, autoAssignToMinizineSlots]);
  
  const handleFilesSelected = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    processUploadedFiles(files, true);
    event.target.value = '';
  }, [processUploadedFiles]);
  
  const handleFileDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingFiles(false);
    
    const files = Array.from(event.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) processUploadedFiles(files, true);
  }, [processUploadedFiles]);
  
  const handleFileDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingFiles(true);
  }, []);
  
  const handleFileDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingFiles(false);
  }, []);

  // Placeholder upload handler for booklet mode
  const handlePlaceholderClick = useCallback((pageNumber: number) => {
    // Convert page number to slot type string for processing
    let slotType: string;
    if (pageNumber === 0) slotType = 'front-cover';
    else if (pageNumber === -0.5) slotType = 'inner-front';
    else if (pageNumber === -1) slotType = 'inner-back';
    else if (pageNumber === -2 || pageNumber === -3) slotType = 'back-cover';
    else slotType = `page-${pageNumber}`;
    
    setPendingPlaceholderSlot(slotType);
    placeholderInputRef.current?.click();
  }, []);

  // Parse spread ID to extract page numbers
  const parseSpreadId = useCallback((spreadId: string): { leftPageNum: number; rightPageNum: number } | null => {
    // Try different ID formats
    // Format: "page-spread-2-3" (regular pages)
    let match = spreadId.match(/page-spread-(\d+)-(\d+)/);
    if (match) {
      return { leftPageNum: parseInt(match[1], 10), rightPageNum: parseInt(match[2], 10) };
    }
    
    // Format: "outer-cover-spread" (back cover -2 + front cover 0)
    if (spreadId === 'outer-cover-spread') {
      return { leftPageNum: -2, rightPageNum: 0 };
    }
    
    // Format: "inner-front-spread" (inner front -0.5 + page 1)
    if (spreadId === 'inner-front-spread') {
      return { leftPageNum: -0.5, rightPageNum: 1 };
    }
    
    // Format: "inner-back-spread" - need to find the actual page numbers
    if (spreadId === 'inner-back-spread') {
      // Find the highest page number that would pair with inner back
      const maxPage = bookletPages.reduce((max, p) => {
        const num = p.parsedFile.pageNumber;
        return num !== null && num > 0 ? Math.max(max, num) : max;
      }, 0);
      const lastEven = maxPage % 2 === 0 ? maxPage : maxPage - 1;
      return { leftPageNum: lastEven > 0 ? lastEven : 2, rightPageNum: -1 };
    }
    
    // Format: "spread-X-Y" (explicit spread)
    match = spreadId.match(/spread-(-?\d+(?:\.\d+)?)-(-?\d+(?:\.\d+)?)/);
    if (match) {
      return { leftPageNum: parseFloat(match[1]), rightPageNum: parseFloat(match[2]) };
    }
    
    return null;
  }, [bookletPages]);

  // State for spread operations in progress
  const [isProcessingSpread, setIsProcessingSpread] = useState(false);
  
  // Toggle between spread and paired mode for a set of pages
  const handleToggleSpreadMode = useCallback(async (spreadId: string, makeSpread: boolean) => {
    setIsProcessingSpread(true);
    
    try {
      if (makeSpread) {
        // User wants to combine two separate images into a spread
        const pageNums = parseSpreadId(spreadId);
        if (!pageNums) {
          console.error('Unable to identify pages to combine from spread ID:', spreadId);
          return;
        }
        
        const { leftPageNum, rightPageNum } = pageNums;
        
        const leftPage = bookletPages.find(p => p.parsedFile.pageNumber === leftPageNum);
        const rightPage = bookletPages.find(p => p.parsedFile.pageNumber === rightPageNum);
        
        if (!leftPage || !rightPage) {
          const leftLabel = getPageLabel(leftPageNum);
          const rightLabel = getPageLabel(rightPageNum);
          setModalContent({
            title: 'Cannot Combine',
            message: `Both pages must have images. Missing: ${!leftPage ? leftLabel : ''} ${!rightPage ? rightLabel : ''}`.trim(),
          });
          return;
        }
        
        // Combine the two images
        const combinedImageData = await combineToSpreadImage(leftPage.imageData, rightPage.imageData);
        
        // Use a filename that will be properly parsed as a spread
        const spreadFileName = createSpreadFileName(leftPageNum, rightPageNum);
        const uniqueId = `combined-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Find and remove the original images by their originalName
        const leftOriginalName = leftPage.parsedFile.originalName;
        const rightOriginalName = rightPage.parsedFile.originalName;
        
        // Update sharedImages: remove originals, add combined
        setSharedImages(prev => {
          const filtered = prev.filter(img => {
            const imgName = img.name || '';
            return imgName !== leftOriginalName && imgName !== rightOriginalName;
          });
          return [...filtered, {
            id: uniqueId,
            name: spreadFileName,
            dataUrl: combinedImageData,
            width: leftPage.width + rightPage.width,
            height: Math.max(leftPage.height, rightPage.height),
            thumbnailUrl: combinedImageData,
          }];
        });
        // Success - UI will update automatically, no modal needed
      } else {
        // User wants to split a spread into separate pages
        const spread = bookletSpreads.find(s => 
          `spread-${s.pages[0]}-${s.pages[1]}` === spreadId
        );
        
        if (!spread) {
          console.error('Unable to find spread to split:', spreadId);
          return;
        }
        
        // Split the spread image
        const [leftImageData, rightImageData] = await splitSpreadImage(spread.imageData);
        
        // Create unique IDs for the new pages
        const timestamp = Date.now();
        const leftId = `split-left-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
        const rightId = `split-right-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Use filenames that will parse correctly
        const leftFileName = createPageFileName(spread.pages[0]);
        const rightFileName = createPageFileName(spread.pages[1]);
        
        // Remove the spread from shared images by matching the spread's original name
        const spreadOriginalName = spread.parsedFile.originalName;
        
        setSharedImages(prev => {
          const filtered = prev.filter(img => {
            const name = img.name || '';
            return name !== spreadOriginalName;
          });
          
          // Add the two new pages
          return [...filtered, 
            {
              id: leftId,
              name: leftFileName,
              dataUrl: leftImageData,
              width: spread.width / 2,
              height: spread.height,
              thumbnailUrl: leftImageData,
            },
            {
              id: rightId,
              name: rightFileName,
              dataUrl: rightImageData,
              width: spread.width / 2,
              height: spread.height,
              thumbnailUrl: rightImageData,
            }
          ];
        });
        // Success - UI will update automatically, no modal needed
      }
    } catch (error) {
      console.error('Spread operation failed:', error);
      setModalContent({
        title: 'Error',
        message: 'Failed to process spread. Please try again.',
      });
    } finally {
      setIsProcessingSpread(false);
    }
  }, [bookletPages, bookletSpreads, parseSpreadId]);

  const handlePlaceholderFileSelected = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      processUploadedFiles(files, false);
    }
    setPendingPlaceholderSlot(null);
    event.target.value = '';
  }, [processUploadedFiles]);

  // =============================================
  // IMAGE MANAGEMENT HANDLERS
  // =============================================
  const handleRemoveSharedImage = useCallback((imageId: string) => {
    setSharedImages(prev => prev.filter(img => img.id !== imageId));
    setMinizineSlotAssignments(prev => {
      const updated = { ...prev };
      for (const [slotId, assignedId] of Object.entries(updated)) {
        if (assignedId === imageId) delete updated[slotId];
      }
      return updated;
    });
  }, []);

  const handleBookletRemoveFile = useCallback((parsedFile: ParsedFile) => {
    const image = sharedImages.find(img => img.file?.name === parsedFile.originalName);
    if (image) handleRemoveSharedImage(image.id);
  }, [sharedImages, handleRemoveSharedImage]);

  const handleBookletReplaceFile = useCallback((parsedFile: ParsedFile) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = false;
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        const { dataUrl, width, height } = await loadImage(file);
        const thumbnailUrl = await generateThumbnail(dataUrl, 150);
        const oldImage = sharedImages.find(img => img.file?.name === parsedFile.originalName);
        
        setSharedImages(prev => prev.map(img => 
          img.file?.name === parsedFile.originalName
            ? { ...img, file, name: file.name, dataUrl, thumbnailUrl, width, height, id: oldImage?.id || img.id }
            : img
        ));
      } catch (error) {
        console.error('Failed to load replacement image:', error);
      }
    };
    
    input.click();
  }, [sharedImages]);
  
  const handleClearAllImages = useCallback(() => {
    // Note: Confirmation is handled by SharedImageLibrary component
    setSharedImages([]);
    setMinizineSlotAssignments({});
    setImageFitModes({});
    setPdfResult(null);
    setGenerationError(null);
  }, []);
  
  const assignedMinizineImageIds = useMemo(() => {
    return new Set(Object.values(minizineSlotAssignments));
  }, [minizineSlotAssignments]);
  
  const handleSelectImageForSlot = useCallback((imageId: string) => {
    const emptySlot = PAGE_SLOTS_CONFIG.find(slot => !minizineSlotAssignments[slot.id]);
    if (emptySlot) {
      setMinizineSlotAssignments(prev => ({ ...prev, [emptySlot.id]: imageId }));
      setImageFitModes(prev => ({ ...prev, [emptySlot.id]: 'cover' }));
    }
  }, [minizineSlotAssignments]);

  // =============================================
  // EXPORT HANDLERS
  // =============================================
  const generateCanvasFromImages = useCallback((
    canvasImages: Record<string, string>,
    canvasImageFitModes: Record<string, 'cover' | 'contain'>,
    canvasPaperConfig: PaperConfig,
    pageSlotsConfig: PageSlot[]
  ): Promise<HTMLCanvasElement> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      const isLandscape = canvasPaperConfig.width >= canvasPaperConfig.height;
      const paperWidthInUnits = isLandscape ? canvasPaperConfig.width : canvasPaperConfig.height;
      const paperHeightInUnits = isLandscape ? canvasPaperConfig.height : canvasPaperConfig.width;
      
      let pixelWidth = paperWidthInUnits * canvasPaperConfig.dpi;
      let pixelHeight = paperHeightInUnits * canvasPaperConfig.dpi;
      
      pixelWidth *= exportOptions.resolutionScale;
      pixelHeight *= exportOptions.resolutionScale;
      
      const MAX_CANVAS_DIM = 16000;
      if (pixelWidth > MAX_CANVAS_DIM || pixelHeight > MAX_CANVAS_DIM) {
        const scaleDown = Math.min(MAX_CANVAS_DIM / pixelWidth, MAX_CANVAS_DIM / pixelHeight);
        pixelWidth *= scaleDown;
        pixelHeight *= scaleDown;
      }

      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
      
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const panelWidth = canvas.width / 4;
      const panelHeight = canvas.height / 2;

      interface LoadedImageData {
        img: HTMLImageElement;
        slotConfig: PageSlot;
      }

      const imageLoadPromises: Promise<LoadedImageData>[] = [];
      
      pageSlotsConfig.forEach(slotConfig => {
        const imageSrc = canvasImages[slotConfig.id];
        if (imageSrc) {
          const promise = new Promise<LoadedImageData>((imageResolve, imageReject) => {
            const img = new Image();
            img.onload = () => imageResolve({ img, slotConfig });
            img.onerror = () => imageReject(new Error(`Failed to load image for ${slotConfig.label}`));
            img.src = imageSrc;
          });
          imageLoadPromises.push(promise);
        }
      });

      Promise.all(imageLoadPromises).then(loadedImagesData => {
        loadedImagesData.forEach(({ img, slotConfig }) => {
          const col = (slotConfig.gridOrder - 1) % 4;
          const row = Math.floor((slotConfig.gridOrder - 1) / 4);
          const x = col * panelWidth;
          const y = row * panelHeight;
          
          const fitMode = canvasImageFitModes[slotConfig.id] || 'cover';
          
          ctx.save();
          ctx.translate(x + panelWidth / 2, y + panelHeight / 2);
          
          if (slotConfig.rotation === 180) ctx.rotate(Math.PI);
          
          ctx.beginPath();
          ctx.rect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight);
          ctx.clip();

          let dw: number, dh: number;
          const imgAspectRatio = img.width / img.height;
          const panelAspectRatio = panelWidth / panelHeight;

          if (fitMode === 'contain') {
            if (imgAspectRatio > panelAspectRatio) {
              dw = panelWidth;
              dh = panelWidth / imgAspectRatio;
            } else {
              dh = panelHeight;
              dw = panelHeight * imgAspectRatio;
            }
          } else {
            if (imgAspectRatio > panelAspectRatio) {
              dh = panelHeight;
              dw = panelHeight * imgAspectRatio;
            } else {
              dw = panelWidth;
              dh = panelWidth / imgAspectRatio;
            }
          }

          ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
          ctx.restore();
        });
        
        resolve(canvas);
      }).catch(reject);
    });
  }, [exportOptions.resolutionScale]);

  const handleExportPNG = useCallback(async () => {
    setIsGenerating(true);
    setGenerationError(null);
    
    try {
      const existingCanvas = document.getElementById('printSheetCanvas') as HTMLCanvasElement;
      let canvas: HTMLCanvasElement;

      if (existingCanvas && minizineViewMode === 'print') {
        canvas = existingCanvas;
      } else {
        canvas = await generateCanvasFromImages(images, imageFitModes, minizinePaperConfig, PAGE_SLOTS_CONFIG);
      }

      const quality = exportOptions.jpegQuality;
      const dataURL = quality < 1 
        ? canvas.toDataURL('image/jpeg', quality)
        : canvas.toDataURL('image/png');
      
      const link = document.createElement('a');
      link.href = dataURL;
      link.download = fileName.includes('.') ? fileName : `${fileName}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error generating PNG:', error);
      setGenerationError('Error generating PNG. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [images, imageFitModes, minizinePaperConfig, minizineViewMode, generateCanvasFromImages, exportOptions.jpegQuality, fileName]);

  const handleExportPDF = useCallback(async (format: PDFExportFormat) => {
    // For minizine mode, generate single-page PDF
    if (zineMode === 'minizine') {
      setIsGenerating(true);
      setGenerationError(null);
      
      try {
        const canvas = await generateCanvasFromImages(images, imageFitModes, minizinePaperConfig, PAGE_SLOTS_CONFIG);
        const dataURL = canvas.toDataURL('image/png');
        
        const { PDFDocument } = await import('pdf-lib');
        const pdfDoc = await PDFDocument.create();
        const pngImage = await pdfDoc.embedPng(dataURL);
        
        const page = pdfDoc.addPage([canvas.width, canvas.height]);
        page.drawImage(pngImage, {
          x: 0,
          y: 0,
          width: canvas.width,
          height: canvas.height,
        });
        
        const pdfBytes = await pdfDoc.save();
        // Create a new ArrayBuffer copy for Blob compatibility
        const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
        downloadBlob(blob, fileName.includes('.') ? fileName : `${fileName}.pdf`);
      } catch (error) {
        console.error('Error generating PDF:', error);
        setGenerationError('Error generating PDF. Please try again.');
      } finally {
        setIsGenerating(false);
      }
      return;
    }
    
    // Booklet mode
    if (!bookletValidation.isValid) {
      setGenerationError('Please fix validation errors before generating PDF.');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationError(null);
    setPdfResult(null);
    
    try {
      const result = await createPDF(
        bookletPages, 
        bookletSpreads, 
        { ...exportOptions, exportFormat: format, blankPageColor },
        fileName.includes('.') ? fileName : `${fileName}.pdf`,
        (progress) => setGenerationProgress(progress)
      );
      
      setPdfResult(result);
      downloadBlob(result.blob, result.fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      setGenerationError(`Error generating PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  }, [zineMode, bookletPages, bookletSpreads, exportOptions, bookletValidation.isValid, fileName, images, imageFitModes, minizinePaperConfig, generateCanvasFromImages, blankPageColor]);

  const handleRedownloadPDF = useCallback(() => {
    if (pdfResult) {
      downloadBlob(pdfResult.blob, fileName.includes('.') ? fileName : `${fileName}.pdf`);
    }
  }, [pdfResult, fileName]);

  // Blank page color handlers
  // When user picks a color on any blank page, set it as the global color
  // This ensures the Preview (book) view shows the same color
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleBlankPageColorChange = useCallback((color: string, _pageNumber?: number) => {
    // Always set the global color - this applies to all blank pages
    // including in the book preview mode
    setBlankPageColor(color);
    // Clear any per-page overrides so all pages use the new color
    setBlankPageColors(new Map());
  }, []);

  const handleApplyColorToAll = useCallback((color: string) => {
    // Set as the default color and clear per-page overrides
    setBlankPageColor(color);
    setBlankPageColors(new Map());
  }, []);

  // =============================================
  // MINIZINE SLOT HANDLERS
  // =============================================
  const handleImageFitChange = useCallback((slotId: string, mode: 'cover' | 'contain') => {
    setImageFitModes(prev => ({ ...prev, [slotId]: mode }));
  }, []);

  const handleSingleImageUpload = useCallback(async (slotId: string, imageDataUrl: string) => {
    try {
      const existingImage = sharedImages.find(img => img.dataUrl === imageDataUrl);
      
      if (existingImage) {
        setMinizineSlotAssignments(prev => ({ ...prev, [slotId]: existingImage.id }));
      } else {
        const newId = `direct-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const img = new Image();
        img.src = imageDataUrl;
        await new Promise((resolve, reject) => { 
          img.onload = resolve; 
          img.onerror = reject;
        });
        
        const blob = await fetch(imageDataUrl).then(r => r.blob());
        // Use proper MIME type, fallback to png
        const mimeType = blob.type || 'image/png';
        const extension = mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' : 'png';
        const fileName = `page-${slotId.replace('page', '')}-${newId}.${extension}`;
        const file = new File([blob], fileName, { type: mimeType });
        
        // Generate thumbnail for UI
        const thumbnailUrl = await generateThumbnail(imageDataUrl, 150);
        
        const newImage: UploadedImage = {
          file,
          name: fileName,
          dataUrl: imageDataUrl,
          thumbnailUrl,
          width: img.width || 100,
          height: img.height || 100,
          id: newId,
        };
        
        setSharedImages(prev => [...prev, newImage]);
        setMinizineSlotAssignments(prev => ({ ...prev, [slotId]: newId }));
      }
      
      setImageFitModes(prev => ({ ...prev, [slotId]: 'cover' }));
    } catch (error) {
      console.error('Error uploading image to slot:', error);
    }
  }, [sharedImages]);

  const handleImageRemove = useCallback((slotId: string) => {
    setMinizineSlotAssignments(prev => {
      const updated = { ...prev };
      delete updated[slotId];
      return updated;
    });
    setImageFitModes(prev => {
      const updated = { ...prev };
      delete updated[slotId];
      return updated;
    });
  }, []);

  const handleDragStart = useCallback((slotId: string) => {
    setDraggedSlotId(slotId);
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent, targetSlotId: string) => {
    event.preventDefault();
    if (targetSlotId !== dragOverSlotId) setDragOverSlotId(targetSlotId);
  }, [dragOverSlotId]);

  const handleDragLeave = useCallback(() => {
    setDragOverSlotId(null);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent, targetSlotId: string) => {
    event.preventDefault();
    setDragOverSlotId(null);
    
    if (event.dataTransfer.files.length > 0) return;
    
    const draggedId = event.dataTransfer.getData("text/plain");
    if (draggedId && draggedId !== targetSlotId) {
      setMinizineSlotAssignments(prev => {
        const updated = { ...prev };
        const draggedImageId = prev[draggedId];
        const targetImageId = prev[targetSlotId];
        
        if (draggedImageId) updated[targetSlotId] = draggedImageId;
        else delete updated[targetSlotId];
        
        if (targetImageId) updated[draggedId] = targetImageId;
        else delete updated[draggedId];
        
        return updated;
      });
      
      setImageFitModes(prev => {
        const updated = { ...prev };
        const draggedFit = prev[draggedId] || 'cover';
        const targetFit = prev[targetSlotId] || 'cover';
        updated[targetSlotId] = draggedFit;
        updated[draggedId] = targetFit;
        return updated;
      });
    }
    setDraggedSlotId(null);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedSlotId(null);
    setDragOverSlotId(null);
  }, []);

  const aspectRatioPaddingForGrid = useMemo(() => {
    const w = minizinePaperConfig.width > minizinePaperConfig.height ? minizinePaperConfig.width : minizinePaperConfig.height;
    const h = minizinePaperConfig.width > minizinePaperConfig.height ? minizinePaperConfig.height : minizinePaperConfig.width;
    if (w === 0 || h === 0) return '50%';
    return `${(h / w) * 100}%`;
  }, [minizinePaperConfig]);

  // =============================================
  // RENDER
  // =============================================
  const UploadDropZone = ({ minimal = false }: { minimal?: boolean }) => (
    <div 
      className={`border border-dashed rounded-xl text-center transition-all cursor-pointer ${
        isDraggingFiles 
          ? 'border-teal-500 bg-teal-50 border-solid scale-[1.01]' 
          : 'border-stone-300 bg-stone-50/50 hover:bg-teal-50 hover:border-teal-400'
      } ${minimal ? 'p-4' : 'p-8'}`}
      onClick={() => fileInputRef.current?.click()}
      onDrop={handleFileDrop}
      onDragOver={handleFileDragOver}
      onDragLeave={handleFileDragLeave}
    >
      <div className={minimal ? 'text-2xl mb-1' : 'text-4xl mb-2'}>{isDraggingFiles ? '📥' : '🖼️'}</div>
      <p className={`font-heading font-bold text-teal-600 ${minimal ? 'text-base' : 'text-lg'}`}>
        {isDraggingFiles ? 'Drop images here!' : 'Click or drag images to upload'}
      </p>
      {!minimal && (
        <p className="text-sm text-stone-500 mt-2">
          Files named &quot;page1&quot;, &quot;frontcover&quot;, &quot;page2-3&quot; are auto-ordered
        </p>
      )}
      <input 
        type="file" 
        multiple 
        accept="image/*" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleFilesSelected}
      />
    </div>
  );

  // Hidden input for placeholder uploads
  const PlaceholderFileInput = () => (
    <input
      type="file"
      accept="image/*"
      ref={placeholderInputRef}
      className="hidden"
      onChange={handlePlaceholderFileSelected}
    />
  );

  // View mode buttons
  const ViewModeButton = ({ 
    active, 
    onClick, 
    icon, 
    label 
  }: { 
    active: boolean; 
    onClick: () => void; 
    icon: string; 
    label: string;
  }) => (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
        active 
          ? 'bg-teal-500 text-white shadow-sm' 
          : 'bg-white text-stone-600 hover:bg-teal-50 border border-stone-200 hover:border-teal-300 hover:text-teal-600'
      }`}
    >
      <span className="mr-1">{icon}</span>
      {label}
    </button>
  );

  return (
    <>
      <PlaceholderFileInput />
      
      {modalContent && (
        <div className="modal-overlay" onClick={() => setModalContent(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">{modalContent.title}</h2>
            <p className="modal-body">{modalContent.message}</p>
            <button className="custom-button" onClick={() => setModalContent(null)}>
              Got it
            </button>
          </div>
        </div>
      )}
      
      <div className="container mx-auto p-4 md:p-6 max-w-7xl">
        {/* Header */}
        <header className="mb-6 text-center">
          <h1 className="app-title text-4xl md:text-5xl font-bold">
            Zine Studio
          </h1>
          <p className="app-subtitle mt-1">Format zines for printing</p>
        </header>
        
        {/* Main Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <PaperConfiguration 
              paperConfig={paperConfig} 
              onConfigChange={setPaperConfig}
              mode={zineMode}
              bleedConfig={zineMode === 'booklet' ? exportOptions.bleed : undefined}
              onBleedChange={zineMode === 'booklet' ? (bleed) => setExportOptions(prev => ({ ...prev, bleed })) : undefined}
            />
            
            <ExportOptions
              mode={zineMode}
              options={exportOptions}
              onOptionsChange={setExportOptions}
              fileName={fileName}
              onFileNameChange={setFileName}
              onExportPNG={handleExportPNG}
              onExportPDF={handleExportPDF}
              isGenerating={isGenerating}
              progress={generationProgress}
              isValid={zineMode === 'minizine' ? hasMinizineImages : bookletValidation.isValid}
              pages={bookletPages}
              spreads={bookletSpreads}
              pdfResult={pdfResult}
              onRedownload={handleRedownloadPDF}
              generationError={generationError}
              hasImages={hasMinizineImages}
              paperConfig={zineMode === 'minizine' ? minizinePaperConfig : bookletPaperConfig}
            />
            
            <Instructions mode={zineMode} />
            
            <SharedImageLibrary
              images={sharedImages}
              onRemove={handleRemoveSharedImage}
              onClearAll={handleClearAllImages}
              onSelectForSlot={zineMode === 'minizine' ? handleSelectImageForSlot : undefined}
              assignedImageIds={zineMode === 'minizine' ? assignedMinizineImageIds : new Set()}
              slotsFilledCount={zineMode === 'minizine' ? Object.keys(minizineSlotAssignments).length : undefined}
              totalSlots={zineMode === 'minizine' ? 8 : undefined}
              compact
            />
          </div>
          
          {/* Right Main Content Area */}
          <div className="lg:col-span-2">
            {/* Header Row: Mode Toggle + View Mode */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3 bg-white rounded-xl p-4 border border-stone-200">
              <ModeToggle mode={zineMode} onModeChange={setZineMode} compact />
              
              {/* View Mode Buttons */}
              <div className="flex gap-2">
                {zineMode === 'minizine' ? (
                  <>
                    <ViewModeButton 
                      active={minizineViewMode === 'edit'} 
                      onClick={() => setMinizineViewMode('edit')}
                      icon="✏️"
                      label="Edit"
                    />
                    <ViewModeButton 
                      active={minizineViewMode === 'print'} 
                      onClick={() => setMinizineViewMode('print')}
                      icon="🖨️"
                      label="Print"
                    />
                    <ViewModeButton 
                      active={minizineViewMode === 'preview'} 
                      onClick={() => setMinizineViewMode('preview')}
                      icon="📖"
                      label="Preview"
                    />
                  </>
                ) : (
                  <>
                    <ViewModeButton 
                      active={bookletViewMode === 'spreads'} 
                      onClick={() => setBookletViewMode('spreads')}
                      icon="📑"
                      label="Spreads"
                    />
                    <ViewModeButton 
                      active={bookletViewMode === 'preview'} 
                      onClick={() => setBookletViewMode('preview')}
                      icon="📖"
                      label="Preview"
                    />
                  </>
                )}
              </div>
            </div>
            

            {/* Warnings */}
            {imageSizeWarnings.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-orange-700 font-medium mb-1">
                  ⚠️ {imageSizeWarnings.length} image{imageSizeWarnings.length !== 1 ? 's' : ''} may need adjustment
                </p>
                <ul className="text-xs text-orange-600 space-y-0.5">
                  {imageSizeWarnings.slice(0, 3).map((w, i) => (
                    <li key={i}>{w.fileName}: {w.message}</li>
                  ))}
                  {imageSizeWarnings.length > 3 && (
                    <li>...and {imageSizeWarnings.length - 3} more</li>
                  )}
                </ul>
              </div>
            )}

            {isProcessingFiles && (
              <div className="text-center text-gray-600 py-4">Processing images...</div>
            )}
            
            {/* =============================================
                MINIZINE MODE CONTENT
                ============================================= */}
            {zineMode === 'minizine' && (
              <>
                {minizineViewMode === 'edit' && (
                  <div className="space-y-4">
                    <UploadDropZone minimal />
                    
                    {/* Always show the 8-slot grid */}
                    <div 
                      className="aspect-ratio-container-for-grid shadow-lg rounded-xl overflow-hidden" 
                      style={{ 
                        '--aspect-ratio-padding': aspectRatioPaddingForGrid, 
                        '--grid-gap': '8px', 
                        '--grid-padding': '12px', 
                        '--grid-bg-color': '#f3f4f6', 
                        '--grid-border': 'none', 
                        '--grid-border-radius': '12px' 
                      } as React.CSSProperties} 
                      onDragLeave={handleDragLeave}
                    >
                      <div className="aspect-ratio-content-for-grid">
                        {PAGE_SLOTS_CONFIG.map(slot => {
                          const imageId = minizineSlotAssignments[slot.id];
                          // TODO: Pass warning to ImageUploaderSlot for per-slot warning display
                          const _warning = imageId ? getWarningForImage(imageId) : undefined;
                          void _warning; // Suppress unused variable warning
                          
                          return (
                            <ImageUploaderSlot
                              key={slot.id}
                              slot={slot}
                              imageSrc={images[slot.id]}
                              fitMode={imageFitModes[slot.id] || 'cover'}
                              rotation={slot.rotation}
                              onImageUpload={handleSingleImageUpload}
                              onImageRemove={handleImageRemove}
                              onFitModeChange={handleImageFitChange}
                              onDragStart={handleDragStart}
                              onDragOver={(e) => handleDragOver(e, slot.id)}
                              onDrop={handleDrop}
                              onDragEnd={handleDragEnd}
                              isDraggingOver={dragOverSlotId === slot.id}
                              isBeingDragged={draggedSlotId === slot.id}
                              isPreviewMode={false}
                              paperConfig={minizinePaperConfig}
                              setModalContent={setModalContent}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
                
                {minizineViewMode === 'print' && (
                  <div className="space-y-3">
                    <p className="text-sm text-stone-600 text-center">
                      Print at 100% scale, landscape, single-sided
                    </p>
                    <Suspense fallback={<LoadingFallback height="400px" />}>
                      <PrintSheetCanvas 
                        images={images} 
                        imageFitModes={imageFitModes} 
                        paperConfig={minizinePaperConfig} 
                        pageSlotsConfig={PAGE_SLOTS_CONFIG} 
                      />
                    </Suspense>
                  </div>
                )}
                
                {minizineViewMode === 'preview' && (
                  <div className="space-y-3">
                    <p className="text-stone-500 text-center text-sm">
                      📖 Preview your zine as a book
                    </p>
                    <div className="card p-6">
                      <ErrorBoundary>
                        <Suspense fallback={<LoadingFallback height="300px" />}>
                          <BookReader
                            pages={minizineBookPages}
                            paperConfig={minizinePaperConfig}
                            aspectRatio={(minizinePaperConfig.width / 4) / (minizinePaperConfig.height / 2)}
                          />
                        </Suspense>
                      </ErrorBoundary>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* =============================================
                BOOKLET MODE CONTENT
                ============================================= */}
            {zineMode === 'booklet' && (
              <>
                {bookletViewMode === 'spreads' && (
                  <div className="space-y-4">
                    <UploadDropZone minimal />
                    
                    {sharedImages.length > 0 ? (
                      <ErrorBoundary
                        fallback={
                          <div className="p-6 bg-amber-50 border border-amber-200 rounded-lg text-center">
                            <p className="text-amber-800">Unable to display spread preview. Try refreshing the page.</p>
                          </div>
                        }
                      >
                        <Suspense fallback={<LoadingFallback height="300px" />}>
                          <SpreadPreview
                            pages={bookletPages}
                            spreads={bookletSpreads}
                            validation={bookletValidation}
                            paperConfig={bookletPaperConfig}
                            bleedConfig={exportOptions.bleed}
                            blankPageColor={blankPageColor}
                            blankPageColors={blankPageColors}
                            imageWarnings={imageSizeWarnings}
                            isProcessingSpread={isProcessingSpread}
                            onRemove={handleBookletRemoveFile}
                            onReplace={handleBookletReplaceFile}
                            onUploadToSlot={handlePlaceholderClick}
                            onToggleSpreadMode={handleToggleSpreadMode}
                            onBlankPageColorChange={handleBlankPageColorChange}
                            onApplyColorToAll={handleApplyColorToAll}
                          />
                        </Suspense>
                      </ErrorBoundary>
                    ) : (
                      <div className="text-center py-16 bg-stone-50 rounded-xl border border-dashed border-stone-300">
                        <div className="text-5xl mb-3">📚</div>
                        <p className="font-heading text-xl font-bold text-teal-600">No images yet!</p>
                        <p className="text-stone-500 mt-1">Upload page images to create your booklet</p>
                      </div>
                    )}
                  </div>
                )}
                
                {bookletViewMode === 'preview' && (
                  <div className="space-y-3">
                    <p className="text-stone-500 text-center text-sm">
                      📖 Preview your booklet as a book
                    </p>
                    {bookletBookPages.length > 0 ? (
                      <div className="card p-6">
                        <ErrorBoundary>
                          <Suspense fallback={<LoadingFallback height="300px" />}>
                          <BookReader
                            pages={bookletBookPages}
                            paperConfig={bookletPaperConfig}
                            aspectRatio={bookletPaperConfig.width / bookletPaperConfig.height}
                            blankPageColor={blankPageColor}
                          />
                          </Suspense>
                        </ErrorBoundary>
                      </div>
                    ) : (
                      <div className="text-center py-16 bg-stone-50 rounded-xl border border-dashed border-stone-300">
                        <div className="text-4xl mb-2">📖</div>
                        <p className="font-heading text-teal-600">Upload images to preview!</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <footer className="text-center mt-8 py-3 text-stone-400 text-sm">
          Zine Studio
        </footer>
      </div>
    </>
  );
};

export default App;

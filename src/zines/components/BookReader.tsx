/* eslint-disable react/prop-types */
import React, { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import type { PaperConfig, StPageFlipInstance, StPageFlipEvent, StPageFlipInitEvent } from '../types';

interface BookPage {
  id: string;
  imageData: string;
  label: string;
  isBlank?: boolean;
  fitMode?: 'cover' | 'contain';
  isSpread?: boolean; // If true, this is a spread image that should be split into left/right
}

interface BookReaderProps {
  pages: BookPage[];
  paperConfig: PaperConfig;
  aspectRatio?: number;
  blankPageColor?: string;
}

// Cache for processed preview images to avoid reprocessing
const previewImageCache = new Map<string, string>();

// Generate cache key for a page
const getPageCacheKey = (pageId: string, imageData: string, fitMode: string, width: number, height: number): string => {
  // Use last 50 chars of imageData as part of key (for uniqueness without full comparison)
  const imageHash = imageData ? imageData.slice(-50) : '';
  return `${pageId}|${imageHash}|${fitMode}|${width}x${height}`;
};

// Resize image to thumbnail for better performance
const resizeImageForPreview = async (
  imageData: string, 
  maxWidth: number, 
  maxHeight: number,
  fitMode: 'cover' | 'contain' = 'cover',
  cacheKey?: string
): Promise<string> => {
  if (!imageData) return '';
  
  // Check cache first
  if (cacheKey && previewImageCache.has(cacheKey)) {
    return previewImageCache.get(cacheKey)!;
  }
  
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(imageData);
        return;
      }
      
      canvas.width = maxWidth;
      canvas.height = maxHeight;
      
      // Fill with white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, maxWidth, maxHeight);
      
      const imgAspect = img.width / img.height;
      const canvasAspect = maxWidth / maxHeight;
      
      let drawWidth: number, drawHeight: number, drawX: number, drawY: number;
      
      if (fitMode === 'contain') {
        if (imgAspect > canvasAspect) {
          drawWidth = maxWidth;
          drawHeight = maxWidth / imgAspect;
        } else {
          drawHeight = maxHeight;
          drawWidth = maxHeight * imgAspect;
        }
        drawX = (maxWidth - drawWidth) / 2;
        drawY = (maxHeight - drawHeight) / 2;
      } else {
        if (imgAspect > canvasAspect) {
          drawHeight = maxHeight;
          drawWidth = maxHeight * imgAspect;
        } else {
          drawWidth = maxWidth;
          drawHeight = maxWidth / imgAspect;
        }
        drawX = (maxWidth - drawWidth) / 2;
        drawY = (maxHeight - drawHeight) / 2;
      }
      
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
      const result = canvas.toDataURL('image/jpeg', 0.8);
      
      // Cache the result
      if (cacheKey) {
        previewImageCache.set(cacheKey, result);
        // Limit cache size
        if (previewImageCache.size > 50) {
          const firstKey = previewImageCache.keys().next().value;
          if (firstKey) previewImageCache.delete(firstKey);
        }
      }
      
      resolve(result);
    };
    img.onerror = () => resolve(imageData);
    img.src = imageData;
  });
};

// Split a spread image into left and right halves
const splitSpreadImage = async (
  imageData: string,
  halfWidth: number,
  height: number,
  side: 'left' | 'right',
  cacheKey?: string
): Promise<string> => {
  if (!imageData) return '';
  
  // Check cache first
  const fullCacheKey = cacheKey ? `${cacheKey}-${side}` : undefined;
  if (fullCacheKey && previewImageCache.has(fullCacheKey)) {
    return previewImageCache.get(fullCacheKey)!;
  }
  
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(imageData);
        return;
      }
      
      canvas.width = halfWidth;
      canvas.height = height;
      
      // Draw the appropriate half of the spread
      const sourceX = side === 'left' ? 0 : img.width / 2;
      const sourceWidth = img.width / 2;
      
      ctx.drawImage(
        img,
        sourceX, 0, sourceWidth, img.height, // Source rectangle
        0, 0, halfWidth, height // Destination rectangle
      );
      
      const result = canvas.toDataURL('image/jpeg', 0.85);
      
      // Cache the result
      if (fullCacheKey) {
        previewImageCache.set(fullCacheKey, result);
        if (previewImageCache.size > 50) {
          const firstKey = previewImageCache.keys().next().value;
          if (firstKey) previewImageCache.delete(firstKey);
        }
      }
      
      resolve(result);
    };
    img.onerror = () => resolve(imageData);
    img.src = imageData;
  });
};

const BookReader: React.FC<BookReaderProps> = memo(({
  pages,
  paperConfig,
  aspectRatio,
  blankPageColor = '#FFFFFF',
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processedPages, setProcessedPages] = useState<BookPage[]>([]);
  
  const bookRef = useRef<HTMLDivElement>(null);
  const pageFlipRef = useRef<StPageFlipInstance | null>(null);
  const isMountedRef = useRef(true);
  const initTimeoutRef = useRef<number | null>(null);

  // Calculate page dimensions
  const { pageWidth, pageHeight } = useMemo(() => {
    const baseWidth = 320; // Larger size for better readability
    const ratio = aspectRatio || (paperConfig.width / paperConfig.height) || 0.7;
    return {
      pageWidth: baseWidth,
      pageHeight: Math.round(baseWidth / ratio),
    };
  }, [paperConfig, aspectRatio]);

  // Process images - resize for preview with caching
  // Handles spreads by splitting them into left and right pages
  useEffect(() => {
    let cancelled = false;
    
    const processImages = async () => {
      const processed: BookPage[] = [];
      let skipNext = false;
      
      for (let i = 0; i < pages.length; i++) {
        if (cancelled) return;
        
        // Skip placeholder pages that follow spreads
        if (skipNext) {
          skipNext = false;
          continue;
        }
        
        const page = pages[i];
        
        if (page.isBlank || !page.imageData) {
          processed.push(page);
        } else if (page.isSpread) {
          // Split spread into left and right halves
          const cacheKey = getPageCacheKey(
            page.id,
            page.imageData,
            'spread',
            pageWidth * 2,
            pageHeight * 2
          );
          
          const leftHalf = await splitSpreadImage(
            page.imageData,
            pageWidth * 2,
            pageHeight * 2,
            'left',
            cacheKey
          );
          
          const rightHalf = await splitSpreadImage(
            page.imageData,
            pageWidth * 2,
            pageHeight * 2,
            'right',
            cacheKey
          );
          
          // Add left page (for the left side of the spread)
          processed.push({
            ...page,
            id: `${page.id}-left`,
            imageData: leftHalf,
            label: `${page.label} (L)`,
            isSpread: false,
          });
          
          // Add right page (for the right side of the spread)
          processed.push({
            ...page,
            id: `${page.id}-right`,
            imageData: rightHalf,
            label: `${page.label} (R)`,
            isSpread: false,
          });
          
          // Skip the next page (which is a placeholder for the spread's second slot)
          skipNext = true;
        } else {
          // Regular page - resize for preview
          const cacheKey = getPageCacheKey(
            page.id, 
            page.imageData, 
            page.fitMode || 'cover',
            pageWidth * 2,
            pageHeight * 2
          );
          
          const resized = await resizeImageForPreview(
            page.imageData, 
            pageWidth * 2,
            pageHeight * 2,
            page.fitMode || 'cover',
            cacheKey
          );
          processed.push({ ...page, imageData: resized });
        }
      }
      
      if (!cancelled) {
        setProcessedPages(processed);
      }
    };
    
    processImages();
    
    return () => {
      cancelled = true;
    };
  }, [pages, pageWidth, pageHeight]);

  // Get display text for current spread
  const getDisplayText = useCallback((currentIdx: number, total: number) => {
    if (total === 0) return '';
    const spreadNum = Math.floor(currentIdx / 2) + 1;
    const totalSpreads = Math.ceil(total / 2);
    return `Spread ${spreadNum} of ${totalSpreads}`;
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (initTimeoutRef.current) {
      cancelAnimationFrame(initTimeoutRef.current);
      initTimeoutRef.current = null;
    }
    
    if (pageFlipRef.current) {
      try {
        pageFlipRef.current.destroy();
      } catch {
        // Ignore cleanup errors
      }
      pageFlipRef.current = null;
    }
    
    if (bookRef.current) {
      bookRef.current.innerHTML = '';
    }
  }, []);

  // Track mounted state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  // Initialize PageFlip when processed pages are ready
  useEffect(() => {
    if (!bookRef.current) return;
    if (!window.St?.PageFlip) {
      setError('Book preview library not loaded');
      return;
    }
    if (processedPages.length === 0) return;
    if (processedPages.filter(p => !p.isBlank).length === 0) {
      setIsReady(false);
      setError(null);
      return;
    }

    setIsReady(false);
    setError(null);
    cleanup();

    // Build page elements
    const pagesWithPadding = [...processedPages];
    
    // Ensure even number of pages
    if (pagesWithPadding.length % 2 !== 0) {
      pagesWithPadding.push({
        id: 'blank-end',
        imageData: '',
        label: '',
        isBlank: true,
      });
    }

    pagesWithPadding.forEach((page) => {
      const pageEl = document.createElement('div');
      // Treat pages without imageData as effectively blank for styling
      const isEffectivelyBlank = page.isBlank || !page.imageData;
      pageEl.className = `pageflip-page ${isEffectivelyBlank ? 'blank-page' : ''}`;
      
      // Use CSS custom property for blank page color - this survives PageFlip's element cloning
      // and can be read by CSS rules that target the library's internal elements
      const bgColor = isEffectivelyBlank ? blankPageColor : '#ffffff';
      pageEl.style.setProperty('--page-bg-color', bgColor);
      pageEl.setAttribute('data-blank', isEffectivelyBlank ? 'true' : 'false');
      pageEl.style.cssText = `width: 100%; height: 100%; overflow: hidden; background-color: ${bgColor}; --page-bg-color: ${bgColor};`;
      
      if (page.imageData) {
        // Page has image data - render it
        const img = document.createElement('img');
        img.src = page.imageData;
        img.alt = page.label;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = page.fitMode === 'contain' ? 'contain' : 'cover';
        img.style.backgroundColor = '#ffffff';
        img.draggable = false;
        pageEl.appendChild(img);
      }
      // Blank pages just show the blankPageColor background (no label or placeholder needed)
      
      bookRef.current!.appendChild(pageEl);
    });

    // Initialize after DOM is ready
    initTimeoutRef.current = requestAnimationFrame(() => {
      if (!isMountedRef.current || !bookRef.current) return;

      setTimeout(() => {
        if (!isMountedRef.current || !bookRef.current) return;

        try {
          const pageElements = bookRef.current.querySelectorAll('.pageflip-page');
          if (pageElements.length === 0) {
            setError('No pages to display');
            return;
          }

          pageFlipRef.current = new window.St.PageFlip(bookRef.current, {
            width: pageWidth,
            height: pageHeight,
            size: 'stretch',
            minWidth: 200,
            maxWidth: 400,
            minHeight: 280,
            maxHeight: 560,
            maxShadowOpacity: 0.3,
            showCover: false,
            mobileScrollSupport: false,
            flippingTime: 350,
            usePortrait: true,
            drawShadow: true,
            startPage: 0,
            autoSize: true,
          });

          pageFlipRef.current.loadFromHTML(pageElements);

          pageFlipRef.current.on('flip', (e: StPageFlipEvent) => {
            if (isMountedRef.current) {
              setCurrentPage(e.data);
            }
          });

          pageFlipRef.current.on('init', (e: StPageFlipInitEvent) => {
            if (isMountedRef.current && pageFlipRef.current) {
              setPageCount(pageFlipRef.current.getPageCount());
              setCurrentPage(e.data.page);
              setTimeout(() => {
                if (isMountedRef.current) {
                  setIsReady(true);
                }
              }, 50);
            }
          });

        } catch (err) {
          console.error('PageFlip init error:', err);
          if (isMountedRef.current) {
            setError('Failed to initialize book preview');
          }
        }
      }, 30);
    });

    return cleanup;
  }, [processedPages, pageWidth, pageHeight, cleanup, blankPageColor]);

  const goToPrev = useCallback(() => pageFlipRef.current?.flipPrev(), []);
  const goToNext = useCallback(() => pageFlipRef.current?.flipNext(), []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isReady) return;
      
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        goToPrev();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isReady, goToPrev, goToNext]);

  // Empty state
  if (pages.filter(p => !p.isBlank).length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-stone-500">
        <p>Upload images to preview your zine as a book</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center py-12 text-orange-600">
        <div className="text-center">
          <p>{error}</p>
          <p className="text-sm mt-2 text-stone-500">Try refreshing the page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="book-reader-container">
      <div 
        className="book-reader-wrapper"
        style={{
          maxWidth: `${pageWidth * 2 + 40}px`,
          margin: '0 auto',
        }}
      >
        <div
          ref={bookRef}
          className="book-reader-book"
          style={{
            opacity: isReady ? 1 : 0,
            visibility: isReady ? 'visible' : 'hidden',
            transition: 'opacity 0.2s ease',
            minHeight: `${pageHeight}px`,
          }}
        />
        
        {!isReady && (
          <div 
            className="flex items-center justify-center bg-stone-50 rounded-lg"
            style={{ minHeight: `${pageHeight}px` }}
          >
            <p className="text-stone-400">Loading preview...</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4 mt-4">
        <button
          onClick={goToPrev}
          disabled={!isReady || currentPage <= 1}
          className="px-4 py-2 text-sm font-medium bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          ← Previous
        </button>
        <span className="text-sm text-stone-500 min-w-[120px] text-center">
          {isReady ? getDisplayText(currentPage, pageCount) : ''}
        </span>
        <button
          onClick={goToNext}
          disabled={!isReady || currentPage >= pageCount - 2}
          className="px-4 py-2 text-sm font-medium bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
});

BookReader.displayName = 'BookReader';

export default BookReader;

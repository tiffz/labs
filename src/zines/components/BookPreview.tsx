import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import type { BookPreviewProps, StPageFlipInstance, StPageFlipEvent, StPageFlipInitEvent } from '../types';
import { PAGE_SLOTS_CONFIG, BOOK_READING_ORDER, DUMMY_PLACEHOLDER_IMAGE } from '../constants';
import ZinePageDisplay from './ZinePageDisplay';

const BookPreview: React.FC<BookPreviewProps> = ({ images, imageFitModes, paperConfig }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [isBookReady, setIsBookReady] = useState(false);
  const bookRef = useRef<HTMLDivElement>(null);
  const pageFlipRef = useRef<StPageFlipInstance | null>(null);

  // Calculate display text for current page position
  const getPageDisplayText = useCallback((stPageFlipCurrentPage: number) => {
    const totalRealPages = 8; // Front, Page1-6, Back
    
    // Map StPageFlip position to logical page numbers
    if (stPageFlipCurrentPage <= 1) {
      // First spread: blank + frontCover
      return `Page 1 of ${totalRealPages}`;
    } else if (stPageFlipCurrentPage <= 3) {
      // Second spread: page1 + page2  
      return `Pages 2-3 of ${totalRealPages}`;
    } else if (stPageFlipCurrentPage <= 5) {
      // Third spread: page3 + page4
      return `Pages 4-5 of ${totalRealPages}`;
    } else if (stPageFlipCurrentPage <= 7) {
      // Fourth spread: page5 + page6
      return `Pages 6-7 of ${totalRealPages}`;
    } else {
      // Fifth spread: backCover + blank
      return `Page 8 of ${totalRealPages}`;
    }
  }, []);

  // Calculate page dimensions to match exact aspect ratio used elsewhere
  const pageWidth = useMemo(() => {
    // Base width for good display size, maintain aspect ratio
    const baseWidth = 400;
    return baseWidth;
  }, []);

  const pageHeight = useMemo(() => {
    const zinePageW = paperConfig.width / 4;
    const zinePageH = paperConfig.height / 2;
    const aspectRatio = zinePageW / zinePageH;
    
    const baseWidth = 400;
    return Math.round(baseWidth / aspectRatio);
  }, [paperConfig.width, paperConfig.height]);

  // Create pages data in book reading order with blank pages
  const pagesData = useMemo(() => {
    const pages: Array<{
      id: string;
      label: string;
      imageSrc: string;
      fitMode: 'cover' | 'contain';
      isBlank: boolean;
    }> = [];
    
    BOOK_READING_ORDER.forEach(pageId => {
      if (pageId.startsWith('blank')) {
        // Create blank page for cover simulation
        pages.push({
          id: pageId,
          label: 'Blank',
          imageSrc: 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22100%22%20height%3D%22100%22%20viewBox%3D%220%200%20100%20100%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%22%20height%3D%22100%22%20fill%3D%22%23FFFFFF%22%20opacity%3D%220%22%2F%3E%3C%2Fsvg%3E',
          fitMode: 'cover',
          isBlank: true
        });
      } else {
        const slot = PAGE_SLOTS_CONFIG.find(s => s.id === pageId);
        if (slot) {
          const imageSrc = images[slot.id] || DUMMY_PLACEHOLDER_IMAGE;
          const fitMode = imageFitModes[slot.id] || 'cover';
          pages.push({
            id: slot.id,
            label: slot.label,
            imageSrc,
            fitMode,
            isBlank: false
          });
        }
      }
    });
    return pages;
  }, [images, imageFitModes]);

  // Initialize StPageFlip
  useEffect(() => {
    if (!bookRef.current || !window.St) return;

    // Hide book during setup to prevent flash
    setIsBookReady(false);

    // Clean up existing instance
    if (pageFlipRef.current) {
      pageFlipRef.current.destroy();
    }

    // Create page elements using React to render ZinePageDisplay
    bookRef.current.innerHTML = '';
    pagesData.forEach((page) => {
      const pageElement = document.createElement('div');
      pageElement.className = 'pageflip-page';
      pageElement.style.width = '100%';
      pageElement.style.height = '100%';
      
      // Style blank pages to be invisible immediately
      if (page.isBlank) {
        pageElement.classList.add('blank-page');
        // Apply styles immediately to prevent flash
        pageElement.style.backgroundColor = 'transparent';
        pageElement.style.border = 'none';
        pageElement.style.opacity = '0';
        pageElement.style.visibility = 'hidden';
        pageElement.style.pointerEvents = 'none';
      }
      
      // Create a temporary container for React rendering
      const reactContainer = document.createElement('div');
      reactContainer.style.width = '100%';
      reactContainer.style.height = '100%';
      pageElement.appendChild(reactContainer);
      
      if (page.isBlank) {
        // For blank pages, create an immediately invisible div
        const blankDiv = document.createElement('div');
        blankDiv.style.width = '100%';
        blankDiv.style.height = '100%';
        blankDiv.style.backgroundColor = 'transparent';
        blankDiv.style.opacity = '0';
        blankDiv.style.visibility = 'hidden';
        blankDiv.style.border = 'none';
        blankDiv.style.pointerEvents = 'none';
        reactContainer.appendChild(blankDiv);
      } else {
        // Render ZinePageDisplay with same props as used elsewhere
        const zineDisplay = React.createElement(ZinePageDisplay, {
          imageSrc: page.imageSrc,
          fitMode: page.fitMode,
          rotation: 0,
          altText: page.label,
          paperConfig: paperConfig,
          isPrintSlot: false
        });
        
        const root = createRoot(reactContainer);
        root.render(zineDisplay);
      }
      
      bookRef.current!.appendChild(pageElement);
    });

    // Initialize PageFlip with slight delay to prevent flash
    setTimeout(() => {
      try {
        pageFlipRef.current = new window.St.PageFlip(bookRef.current!, {
          width: pageWidth,
          height: pageHeight,
          size: 'stretch',
          minWidth: 300,
          maxWidth: 800,
          minHeight: 400,
          maxHeight: 1000,
          maxShadowOpacity: 0.5,
          showCover: false, // Use blank page trick to simulate covers
          mobileScrollSupport: false,
          flippingTime: 600, // Slightly faster for better feel
          usePortrait: true,
          drawShadow: true,
          startPage: 0,
          autoSize: true
        });

        pageFlipRef.current.loadFromHTML(document.querySelectorAll('.pageflip-page'));
      
        // Event listeners
        pageFlipRef.current.on('flip', (e: StPageFlipEvent) => {
          setCurrentPage(e.data);
        });

        pageFlipRef.current.on('init', (e: StPageFlipInitEvent) => {
          setPageCount(pageFlipRef.current!.getPageCount());
          setCurrentPage(e.data.page);
          // Book is now fully ready - show it
          setTimeout(() => setIsBookReady(true), 100);
        });

      } catch (error) {
        console.error('Failed to initialize PageFlip:', error);
      }
    }, 50); // Small delay to let DOM settle

    return () => {
      if (pageFlipRef.current) {
        pageFlipRef.current.destroy();
        pageFlipRef.current = null;
      }
      // Clean up React components - roots are automatically unmounted when container is removed
    };
  }, [pagesData, pageWidth, pageHeight, paperConfig]);

  const goToPreviousPage = () => {
    if (pageFlipRef.current) {
      pageFlipRef.current.flipPrev();
    }
  };

  const goToNextPage = () => {
    if (pageFlipRef.current) {
      pageFlipRef.current.flipNext();
    }
  };

  return (
    <div className="book-preview-container">
      <div className="book-spread-wrapper">
        <div
          ref={bookRef}
          className={`pageflip-book ${isBookReady ? 'book-ready' : 'book-loading'}`}
          style={{
            opacity: isBookReady ? 1 : 0,
            visibility: isBookReady ? 'visible' : 'hidden'
          }}
        ></div>
        {!isBookReady && (
          <div className="book-loading-placeholder">
            <div className="loading-text">Preparing your zine...</div>
          </div>
        )}
      </div>
      <div className="book-navigation">
        <button
          onClick={goToPreviousPage}
          disabled={!isBookReady || currentPage === 0}
          className="custom-button-secondary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ← Prev
        </button>
        <span className="nav-text">
          {isBookReady ? getPageDisplayText(currentPage) : 'Loading...'}
        </span>
        <button
          onClick={goToNextPage}
          disabled={!isBookReady || currentPage >= pageCount - 1}
          className="custom-button-secondary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next →
        </button>
      </div>
    </div>
  );
};

export default BookPreview; 
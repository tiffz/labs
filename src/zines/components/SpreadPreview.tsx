/* eslint-disable react/prop-types */
import React, { useMemo, memo, useState, useRef, useEffect } from 'react';
import type { BookletPageInfo, SpreadInfo, ValidationResult, PaperConfig, BleedConfig, ImageSizeWarning } from '../types';
import IconButton from './IconButton';
import { buildPrintSpreads, type PrintSpread } from '../utils/spreadPairing';

interface SpreadPreviewProps {
  pages: BookletPageInfo[];
  spreads: SpreadInfo[];
  validation: ValidationResult;
  paperConfig: PaperConfig;
  bleedConfig: BleedConfig;
  blankPageColor?: string;
  blankPageColors?: Map<number, string>;
  imageWarnings?: ImageSizeWarning[];
  isProcessingSpread?: boolean;
  onRemove?: (parsedFile: ParsedFile) => void;
  onReplace?: (parsedFile: ParsedFile) => void;
  onReorder?: (fromIndex: number, toIndex: number, type: 'page' | 'spread') => void;
  onUploadToSlot?: (pageNumber: number) => void;
  onToggleSpreadMode?: (spreadId: string, makeSpread: boolean) => void;
  onBlankPageColorChange?: (color: string, pageNumber?: number) => void;
  onApplyColorToAll?: (color: string) => void;
}

const SpreadPreview: React.FC<SpreadPreviewProps> = memo(({
  pages,
  spreads,
  validation,
  paperConfig,
  bleedConfig,
  blankPageColor = '#FFFFFF',
  blankPageColors = new Map(),
  imageWarnings = [],
  isProcessingSpread = false,
  onRemove,
  onReplace,
  onUploadToSlot,
  onToggleSpreadMode,
  onBlankPageColorChange,
  onApplyColorToAll,
}) => {
  const [currentSpreadIndex, setCurrentSpreadIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetPage, setUploadTargetPage] = useState<number | null>(null);
  const [showAppliedToast, setShowAppliedToast] = useState(false);
  
  // Handler to apply color to all with visual feedback
  const handleApplyToAll = (color: string) => {
    if (onApplyColorToAll) {
      onApplyColorToAll(color);
      setShowAppliedToast(true);
      setTimeout(() => setShowAppliedToast(false), 1500);
    }
  };

  // Build print spreads using shared utility
  const printSpreads = useMemo(() => buildPrintSpreads(pages, spreads), [pages, spreads]);

  // Keyboard navigation for spreads (disabled during spread processing)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (printSpreads.length === 0 || isProcessingSpread) return;
      
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setCurrentSpreadIndex(i => Math.max(0, i - 1));
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setCurrentSpreadIndex(i => Math.min(printSpreads.length - 1, i + 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [printSpreads.length, isProcessingSpread]);

  // Calculate page aspect ratio for consistent layout
  const pageAspectRatio = useMemo(() => {
    // Convert to common unit for ratio calculation
    const width = paperConfig.width;
    const height = paperConfig.height;
    // Just use the raw values - the ratio is the same regardless of unit
    return width / height;
  }, [paperConfig.width, paperConfig.height]);

  // For a spread (two pages side by side), the aspect ratio doubles the width
  const spreadAspectRatio = pageAspectRatio * 2;

  // Calculate bleed and quiet area percentages for visual overlay
  const { bleedWidthPercent, bleedHeightPercent, quietAreaWidthPercent, quietAreaHeightPercent } = useMemo(() => {
    // Get bleed value in same unit as page
    let bleedValue = bleedConfig.top || 0;
    let quietAreaValue = bleedConfig.quietArea || 0.25;
    const pageWidth = paperConfig.width;
    const pageHeight = paperConfig.height;
    
    // Convert to page units if different
    if (bleedConfig.unit !== paperConfig.unit) {
      const conversionFactor = bleedConfig.unit === 'mm' && paperConfig.unit === 'in' 
        ? 1 / 25.4 
        : bleedConfig.unit === 'in' && paperConfig.unit === 'mm' 
          ? 25.4 
          : 1;
      bleedValue = bleedValue * conversionFactor;
      quietAreaValue = quietAreaValue * conversionFactor;
    }
    
    // The full artwork size (including bleeds)
    const fullWidth = pageWidth + (bleedValue * 2);
    const fullHeight = pageHeight + (bleedValue * 2);
    
    // Bleed percentage is the portion of the full artwork that is bleed (outside area)
    const bleedWPercent = fullWidth > 0 ? (bleedValue / fullWidth) * 100 : 0;
    const bleedHPercent = fullHeight > 0 ? (bleedValue / fullHeight) * 100 : 0;
    
    // Quiet area percentage - measured from trim line inward
    // So it's bleed + quiet area from edge of artwork
    const quietWPercent = fullWidth > 0 ? ((bleedValue + quietAreaValue) / fullWidth) * 100 : 0;
    const quietHPercent = fullHeight > 0 ? ((bleedValue + quietAreaValue) / fullHeight) * 100 : 0;
    
    return {
      bleedWidthPercent: Math.min(bleedWPercent, 15),
      bleedHeightPercent: Math.min(bleedHPercent, 15),
      quietAreaWidthPercent: Math.min(quietWPercent, 25),
      quietAreaHeightPercent: Math.min(quietHPercent, 25),
    };
  }, [bleedConfig, paperConfig]);

  // Handle file upload to specific slot
  const handleUploadClick = (pageNum: number) => {
    setUploadTargetPage(pageNum);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadTargetPage !== null && onUploadToSlot) {
      onUploadToSlot(uploadTargetPage);
    }
    setUploadTargetPage(null);
    if (e.target) e.target.value = '';
  };

  // Empty state
  if (pages.length === 0 && spreads.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-2">📄</div>
        <p className="font-heading text-xl text-orange-500">No pages yet!</p>
        <p className="text-stone-500 text-sm mt-2">Upload images to see your booklet preview</p>
      </div>
    );
  }

  const currentSpread = printSpreads[currentSpreadIndex];

  // Render bleed and quiet area overlay using Mixam-like colors
  // Bleed area: Pink/magenta (area that gets trimmed off)
  // Quiet area (safe zone): Blue dashed line (keep important content inside)
  const BleedOverlay = ({ show }: { show: boolean }) => {
    if (!show || (bleedWidthPercent <= 0 && bleedHeightPercent <= 0)) return null;
    
    const bleedColor = 'rgba(236, 72, 153, 0.25)'; // Pink for bleed
    const trimLineColor = 'rgba(236, 72, 153, 0.7)'; // Solid pink for trim line
    const safeZoneColor = 'rgba(59, 130, 246, 0.5)'; // Blue for safe zone
    
    return (
      <div className="absolute inset-0 pointer-events-none">
        {/* Bleed areas - pink fill (Mixam style) */}
        {/* Top bleed */}
        <div 
          className="absolute top-0 left-0 right-0"
          style={{ height: `${bleedHeightPercent}%`, backgroundColor: bleedColor }}
        />
        {/* Bottom bleed */}
        <div 
          className="absolute bottom-0 left-0 right-0"
          style={{ height: `${bleedHeightPercent}%`, backgroundColor: bleedColor }}
        />
        {/* Left bleed */}
        <div 
          className="absolute top-0 bottom-0 left-0"
          style={{ width: `${bleedWidthPercent}%`, backgroundColor: bleedColor }}
        />
        {/* Right bleed */}
        <div 
          className="absolute top-0 bottom-0 right-0"
          style={{ width: `${bleedWidthPercent}%`, backgroundColor: bleedColor }}
        />
        
        {/* Trim line - solid pink line at bleed boundary */}
        <div 
          className="absolute"
          style={{
            top: `${bleedHeightPercent}%`,
            left: `${bleedWidthPercent}%`,
            right: `${bleedWidthPercent}%`,
            bottom: `${bleedHeightPercent}%`,
            border: `1px solid ${trimLineColor}`,
          }}
        />
        
        {/* Safe zone (quiet area) - blue dashed line inside trim */}
        {quietAreaWidthPercent > bleedWidthPercent && quietAreaHeightPercent > bleedHeightPercent && (
          <div 
            className="absolute"
            style={{
              top: `${quietAreaHeightPercent}%`,
              left: `${quietAreaWidthPercent}%`,
              right: `${quietAreaWidthPercent}%`,
              bottom: `${quietAreaHeightPercent}%`,
              border: `2px dashed ${safeZoneColor}`,
            }}
          />
        )}
      </div>
    );
  };

  // Render a single page with controls
  const renderPage = (
    pageInfo: { pageNum: number; page?: BookletPageInfo; label: string } | undefined,
    side: 'left' | 'right'
  ) => {
    if (!pageInfo) {
      return (
        <div className="flex-1 bg-stone-100 flex items-center justify-center">
          <span className="text-stone-300">{side === 'left' ? 'L' : 'R'}</span>
        </div>
      );
    }

    const hasImage = !!pageInfo.page;
    
    // Find warning for this page's image
    const pageWarning = hasImage 
      ? imageWarnings.find(w => w.fileName === pageInfo.page!.parsedFile.originalName)
      : undefined;

    return (
      <div className={`flex-1 bg-stone-50 flex items-center justify-center overflow-hidden relative ${
        side === 'left' ? 'border-r border-stone-200' : ''
      }`}>
        {hasImage ? (
          <>
            <img
              src={pageInfo.page!.imageData}
              alt={pageInfo.label}
              className="w-full h-full object-cover"
              draggable={false}
            />
            <BleedOverlay show={bleedWidthPercent > 0 || bleedHeightPercent > 0} />
            
            {/* Warning indicator */}
            {pageWarning && (
              <div 
                className="absolute bottom-2 left-2 bg-amber-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm cursor-help"
                title={pageWarning.message}
              >
                ⚠
              </div>
            )}
            
            <div className="absolute top-2 right-2 flex gap-1">
              {onReplace && (
                <IconButton
                  onClick={() => onReplace(pageInfo.page!.parsedFile)}
                  icon="replace"
                  title="Replace"
                  size="sm"
                />
              )}
              {onRemove && (
                <IconButton
                  onClick={() => onRemove(pageInfo.page!.parsedFile)}
                  icon="remove"
                  title="Remove"
                  size="sm"
                  variant="danger"
                />
              )}
            </div>
          </>
        ) : (
          <div 
            className="flex flex-col items-center justify-center p-4 w-full h-full relative"
            style={{ backgroundColor: blankPageColors.get(pageInfo.pageNum) || blankPageColor }}
          >
            {/* Upload button - minimal, contrasting design */}
            <button
              onClick={() => handleUploadClick(pageInfo.pageNum)}
              className="bg-white/90 hover:bg-white shadow-sm rounded-lg px-3 py-2 transition-colors"
              title={`Upload image for ${pageInfo.label}`}
            >
              <span className="text-xl text-stone-600">+</span>
            </button>
            
            {/* Color picker - bottom right, minimal */}
            {onBlankPageColorChange && (
              <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-white/90 rounded shadow-sm px-1.5 py-1">
                <input
                  type="color"
                  value={blankPageColors.get(pageInfo.pageNum) || blankPageColor}
                  onChange={(e) => onBlankPageColorChange(e.target.value, pageInfo.pageNum)}
                  className="w-4 h-4 cursor-pointer rounded border border-stone-300"
                  title="Set fill color"
                />
                {onApplyColorToAll && (
                  <button
                    onClick={() => handleApplyToAll(blankPageColors.get(pageInfo.pageNum) || blankPageColor)}
                    className="text-[9px] px-1.5 py-0.5 text-stone-500 hover:text-teal-600 transition-colors whitespace-nowrap"
                    title="Apply this color to all blank pages"
                  >
                    Apply to all
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Render a single spread
  const renderSpread = (spread: PrintSpread) => {
    const isExplicit = spread.type === 'explicit-spread';
    
    if (isExplicit && spread.explicitSpread) {
      // Single image spread
      return (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border-2 border-teal-400">
          <div 
            className="bg-stone-50 flex items-center justify-center overflow-hidden relative"
            style={{ aspectRatio: `${spreadAspectRatio}` }}
          >
            <img
              src={spread.explicitSpread.imageData}
              alt={spread.displayLabel}
              className="w-full h-full object-cover"
              draggable={false}
            />
            <BleedOverlay show={bleedWidthPercent > 0 || bleedHeightPercent > 0} />
            
            {/* Replace/Remove buttons in top right corner (consistent with individual pages) */}
            <div className="absolute top-2 right-2 flex gap-1">
              {onReplace && (
                <IconButton
                  onClick={() => onReplace(spread.explicitSpread!.parsedFile)}
                  icon="replace"
                  title="Replace"
                  size="sm"
                  disabled={isProcessingSpread}
                />
              )}
              {onRemove && (
                <IconButton
                  onClick={() => onRemove(spread.explicitSpread!.parsedFile)}
                  icon="remove"
                  title="Remove"
                  size="sm"
                  variant="danger"
                  disabled={isProcessingSpread}
                />
              )}
            </div>
            
            {/* Link/Unlink button in bottom right corner (consistent position) */}
            {onToggleSpreadMode && (
              <div className="absolute bottom-2 right-2">
                <IconButton
                  onClick={() => onToggleSpreadMode(spread.id, false)}
                  icon="unlink"
                  title={isProcessingSpread ? "Processing..." : "Split into separate pages"}
                  size="sm"
                  disabled={isProcessingSpread}
                />
              </div>
            )}
          </div>
          <div className="px-4 py-2 border-t-2 border-teal-200 bg-teal-50 flex items-center gap-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500 text-white font-bold uppercase tracking-wide">
              Spread Image
            </span>
            <span className="text-sm font-medium text-teal-800">{spread.displayLabel}</span>
          </div>
        </div>
      );
    }
    
    // Auto-paired spread (two separate images or placeholders)
    const bothPagesPresent = spread.leftPage?.page && spread.rightPage?.page;
    
    return (
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border-2 border-amber-300">
        <div 
          className="flex relative"
          style={{ aspectRatio: `${spreadAspectRatio}` }}
        >
          {renderPage(spread.leftPage, 'left')}
          {renderPage(spread.rightPage, 'right')}
          
          {/* Link button in bottom right corner (consistent position with unlink) */}
          {bothPagesPresent && onToggleSpreadMode && (
            <div className="absolute bottom-2 right-2 z-10">
              <IconButton
                onClick={() => onToggleSpreadMode(spread.id, true)}
                icon="link"
                title={isProcessingSpread ? "Processing..." : "Link as single spread image"}
                size="sm"
                disabled={isProcessingSpread}
              />
            </div>
          )}
        </div>
        
        <div className="px-4 py-2 border-t-2 border-amber-200 bg-amber-50 flex items-center gap-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200 text-amber-800 font-bold uppercase tracking-wide">
            Paired
          </span>
          <span className="text-sm font-medium text-amber-800">{spread.displayLabel}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 relative">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      
      {/* Toast notification for "Apply to all" */}
      <div 
        className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-teal-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium transition-all duration-300 ${
          showAppliedToast ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
      >
        Color applied to all blank pages
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between">
        <div className="font-handwriting text-amber-700">
          📖 {printSpreads.length} spread{printSpreads.length !== 1 ? 's' : ''} in reading order
        </div>
        {(bleedWidthPercent > 0 || bleedHeightPercent > 0) && (
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1 text-pink-600">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(236, 72, 153, 0.25)' }} />
              Bleed ({bleedConfig.top}{bleedConfig.unit})
            </div>
            <div className="flex items-center gap-1 text-blue-600">
              <span className="w-3 h-3 rounded-sm border-2 border-dashed" style={{ borderColor: 'rgba(59, 130, 246, 0.5)' }} />
              Safe zone ({bleedConfig.quietArea || 0.25}{bleedConfig.unit})
            </div>
          </div>
        )}
      </div>

      {/* Image warnings summary - collapsible */}
      {imageWarnings.length > 0 && (
        <details className="bg-amber-50 border-2 border-amber-300 rounded-xl overflow-hidden">
          <summary className="p-3 cursor-pointer select-none font-heading text-base font-bold text-amber-800 hover:bg-amber-100/50">
            ⚠️ {imageWarnings.length} image{imageWarnings.length !== 1 ? 's' : ''} may need adjustment
            <span className="text-xs font-normal ml-2 text-amber-600">(click to expand)</span>
          </summary>
          <ul className="text-sm text-amber-700 space-y-0.5 px-3 pb-3 max-h-40 overflow-y-auto">
            {imageWarnings.map((warning, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-amber-500">•</span>
                <span><strong>{warning.fileName}:</strong> {warning.message}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Validation warnings */}
      {validation.warnings.length > 0 && (
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-3">
          <ul className="text-sm text-stone-600 space-y-0.5">
            {validation.warnings.map((warning, i) => (
              <li key={i}>• {warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Current spread view */}
      {currentSpread && (
        <div className="space-y-4">
          <div className="max-w-2xl mx-auto">
            {renderSpread(currentSpread)}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setCurrentSpreadIndex(i => Math.max(0, i - 1))}
              disabled={currentSpreadIndex === 0 || isProcessingSpread}
              className="px-4 py-2 text-sm font-medium bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Previous
            </button>
            <span className="text-sm text-stone-500 min-w-[120px] text-center">
              {isProcessingSpread ? 'Processing...' : `Spread ${currentSpreadIndex + 1} of ${printSpreads.length}`}
            </span>
            <button
              onClick={() => setCurrentSpreadIndex(i => Math.min(printSpreads.length - 1, i + 1))}
              disabled={currentSpreadIndex >= printSpreads.length - 1 || isProcessingSpread}
              className="px-4 py-2 text-sm font-medium bg-stone-100 text-stone-600 rounded-lg hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* All spreads thumbnail grid */}
      <div className="border-t-2 border-amber-100 pt-4 mt-6">
        <h3 className="font-heading text-sm font-bold text-amber-800 mb-3">All Spreads (Reading Order)</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {printSpreads.map((spread, index) => {
            const isActive = index === currentSpreadIndex;
            const isExplicit = spread.type === 'explicit-spread';
            
            return (
              <button
                key={spread.id}
                onClick={() => setCurrentSpreadIndex(index)}
                className={`rounded-lg overflow-hidden border-2 transition-all text-left ${
                  isActive 
                    ? 'border-orange-400 ring-2 ring-orange-200 shadow-md' 
                    : isExplicit 
                      ? 'border-teal-300 hover:border-teal-400' 
                      : 'border-amber-200 hover:border-amber-300'
                }`}
              >
                <div 
                  className="bg-stone-100 flex"
                  style={{ aspectRatio: `${spreadAspectRatio}` }}
                >
                  {isExplicit && spread.explicitSpread ? (
                    <img
                      src={spread.explicitSpread.imageData}
                      alt={spread.displayLabel}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <>
                      <div 
                        className="flex-1 flex items-center justify-center overflow-hidden"
                        style={{ backgroundColor: spread.leftPage?.page ? undefined : blankPageColor }}
                      >
                        {spread.leftPage?.page ? (
                          <img
                            src={spread.leftPage.page.imageData}
                            alt="Left"
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <span className="text-stone-400 text-[10px]">{spread.leftPage?.label || '+'}</span>
                        )}
                      </div>
                      <div className="w-px bg-stone-200" />
                      <div 
                        className="flex-1 flex items-center justify-center overflow-hidden"
                        style={{ backgroundColor: spread.rightPage?.page ? undefined : blankPageColor }}
                      >
                        {spread.rightPage?.page ? (
                          <img
                            src={spread.rightPage.page.imageData}
                            alt="Right"
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <span className="text-stone-400 text-[10px]">{spread.rightPage?.label || '+'}</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
                <div className={`px-2 py-1.5 text-xs truncate ${
                  isExplicit ? 'bg-teal-50 text-teal-700' : 'bg-amber-50 text-amber-700'
                }`}>
                  {index + 1}. {spread.displayLabel}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});

SpreadPreview.displayName = 'SpreadPreview';

export default SpreadPreview;

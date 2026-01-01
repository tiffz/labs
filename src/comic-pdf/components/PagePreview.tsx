import React from 'react';
import type { ParsedFile, PageInfo, SpreadInfo, ValidationResult } from '../types';
import { organizeIntoSpreads, estimateDPI, getPageDimensionsInches, calculateTrimSize } from '../utils/spreadOrganizer';

interface PagePreviewProps {
  pages: PageInfo[];
  spreads: SpreadInfo[];
  validation: ValidationResult;
  onRemove?: (parsedFile: ParsedFile) => void;
  onReplace?: (parsedFile: ParsedFile) => void;
}

export const PagePreview: React.FC<PagePreviewProps> = ({
  pages,
  spreads,
  validation,
  onRemove,
  onReplace,
}) => {
  // Organize pages into spreads (matching final PDF layout)
  const previewSpreads = organizeIntoSpreads(pages, spreads);
  
  // Calculate DPI and dimensions from first regular page
  let dpi: number | null = null;
  let pageDimensions: { width: number; height: number } | null = null;
  let artDimensionsInches: { width: number; height: number } | null = null;
  let trimDimensionsInches: { width: number; height: number } | null = null;
  
  if (pages.length > 0) {
    const firstPage = pages.find(p => (p.parsedFile.pageNumber ?? 0) >= 0) || pages[0];
    dpi = estimateDPI(firstPage.width, firstPage.height);
    pageDimensions = { width: firstPage.width, height: firstPage.height };
    artDimensionsInches = getPageDimensionsInches(firstPage.width, firstPage.height, dpi);
    trimDimensionsInches = calculateTrimSize(firstPage.width, firstPage.height, dpi);
  }

  return (
    <div className="space-y-4">
      {/* Page Information */}
      {dpi && pageDimensions && artDimensionsInches && trimDimensionsInches && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <h3 className="font-semibold text-blue-800 mb-2 text-sm">Detected Page Information</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            <div>
              <span className="text-blue-600 font-medium block">Art Size:</span>
              <p className="text-blue-700">{artDimensionsInches.width}&quot; × {artDimensionsInches.height}&quot;</p>
            </div>
            <div>
              <span className="text-blue-600 font-medium block">Trim Size:</span>
              <p className="text-blue-700">{trimDimensionsInches.width}&quot; × {trimDimensionsInches.height}&quot;</p>
            </div>
            <div>
              <span className="text-blue-600 font-medium block">Dimensions:</span>
              <p className="text-blue-700">{pageDimensions.width} × {pageDimensions.height} px</p>
            </div>
            <div>
              <span className="text-blue-600 font-medium block">DPI:</span>
              <p className="text-blue-700">{dpi}</p>
            </div>
            <div>
              <span className="text-blue-600 font-medium block">Spreads:</span>
              <p className="text-blue-700">{previewSpreads.length}</p>
            </div>
          </div>
        </div>
      )}

      {validation.errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-semibold text-red-800 mb-2">Errors:</h3>
          <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
            {validation.errors.map((error, idx) => (
              <li key={idx}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {validation.warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">Warnings:</h3>
          <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
            {validation.warnings.map((warning, idx) => (
              <li key={idx}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-base font-semibold text-gray-700">Preview (Final PDF Layout)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {previewSpreads.map((spread, idx) => (
            <div
              key={idx}
              className={`border rounded overflow-hidden ${
                spread.type === 'explicit-spread' 
                  ? 'border-purple-400 border-2' 
                  : spread.type === 'auto-paired-spread'
                  ? 'border-blue-300 border-2'
                  : 'border-gray-200'
              }`}
            >
              <div className="bg-gray-50 px-1.5 py-0.5 border-b">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-700 truncate flex-1">
                    {spread.displayLabel}
                  </span>
                </div>
              </div>
              <div className="flex">
                {spread.type === 'explicit-spread' && spread.explicitSpread ? (
                  <div className="w-full">
                    <img
                      src={spread.explicitSpread.imageData}
                      alt={spread.displayLabel}
                      className="w-full h-auto"
                      style={{ maxHeight: '180px', objectFit: 'contain' }}
                    />
                    <div className="px-1.5 py-1 bg-gray-50 border-t flex items-center justify-between gap-1">
                      <p className="text-[10px] text-gray-500 truncate flex-1" title={spread.explicitSpread.parsedFile.originalName}>
                        {spread.explicitSpread.parsedFile.originalName}
                      </p>
                      <div className="flex gap-1 flex-shrink-0">
                        {onReplace && (
                          <button
                            onClick={() => onReplace(spread.explicitSpread!.parsedFile)}
                            className="text-[10px] bg-blue-500 text-white px-1 py-0.5 rounded hover:bg-blue-600"
                            title="Replace"
                            aria-label={`Replace ${spread.explicitSpread.parsedFile.originalName}`}
                          >
                            ↻
                          </button>
                        )}
                        {onRemove && (
                          <button
                            onClick={() => onRemove(spread.explicitSpread!.parsedFile)}
                            className="text-[10px] bg-red-500 text-white px-1 py-0.5 rounded hover:bg-red-600"
                            title="Remove"
                            aria-label={`Remove ${spread.explicitSpread.parsedFile.originalName}`}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : spread.leftPage && spread.rightPage ? (
                  <>
                    <div className="w-1/2 border-r">
                      <img
                        src={spread.leftPage.imageData}
                        alt={`${spread.displayLabel} - Left`}
                        className="w-full h-auto"
                        style={{ maxHeight: '180px', objectFit: 'contain' }}
                      />
                      <div className="px-1 py-0.5 bg-gray-50 border-t flex items-center justify-between gap-1">
                        <p className="text-[10px] text-gray-500 truncate flex-1" title={spread.leftPage.parsedFile.originalName}>
                          {spread.leftPage.parsedFile.originalName}
                        </p>
                        <div className="flex gap-1 flex-shrink-0">
                          {onReplace && (
                            <button
                              onClick={() => onReplace(spread.leftPage!.parsedFile)}
                              className="text-[10px] bg-blue-500 text-white px-1 py-0.5 rounded hover:bg-blue-600"
                              title="Replace"
                              aria-label={`Replace ${spread.leftPage.parsedFile.originalName}`}
                            >
                              ↻
                            </button>
                          )}
                          {onRemove && (
                            <button
                              onClick={() => onRemove(spread.leftPage!.parsedFile)}
                              className="text-[10px] bg-red-500 text-white px-1 py-0.5 rounded hover:bg-red-600"
                              title="Remove"
                              aria-label={`Remove ${spread.leftPage.parsedFile.originalName}`}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="w-1/2">
                      <img
                        src={spread.rightPage.imageData}
                        alt={`${spread.displayLabel} - Right`}
                        className="w-full h-auto"
                        style={{ maxHeight: '180px', objectFit: 'contain' }}
                      />
                      <div className="px-1 py-0.5 bg-gray-50 border-t flex items-center justify-between gap-1">
                        <p className="text-[10px] text-gray-500 truncate flex-1" title={spread.rightPage.parsedFile.originalName}>
                          {spread.rightPage.parsedFile.originalName}
                        </p>
                        <div className="flex gap-1 flex-shrink-0">
                          {onReplace && (
                            <button
                              onClick={() => onReplace(spread.rightPage!.parsedFile)}
                              className="text-[10px] bg-blue-500 text-white px-1 py-0.5 rounded hover:bg-blue-600"
                              title="Replace"
                              aria-label={`Replace ${spread.rightPage.parsedFile.originalName}`}
                            >
                              ↻
                            </button>
                          )}
                          {onRemove && (
                            <button
                              onClick={() => onRemove(spread.rightPage!.parsedFile)}
                              className="text-[10px] bg-red-500 text-white px-1 py-0.5 rounded hover:bg-red-600"
                              title="Remove"
                              aria-label={`Remove ${spread.rightPage.parsedFile.originalName}`}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                ) : spread.leftPage ? (
                  <div className="w-full">
                    <img
                      src={spread.leftPage.imageData}
                      alt={spread.displayLabel}
                      className="w-full h-auto mx-auto"
                      style={{ maxHeight: '180px', maxWidth: '50%', objectFit: 'contain' }}
                    />
                    <div className="px-1.5 py-1 bg-gray-50 border-t flex items-center justify-center gap-1">
                      <p className="text-[10px] text-gray-500 truncate" title={spread.leftPage.parsedFile.originalName}>
                        {spread.leftPage.parsedFile.originalName}
                      </p>
                      <div className="flex gap-1 flex-shrink-0 ml-1">
                        {onReplace && (
                          <button
                            onClick={() => onReplace(spread.leftPage!.parsedFile)}
                            className="text-[10px] bg-blue-500 text-white px-1 py-0.5 rounded hover:bg-blue-600"
                            title="Replace"
                            aria-label={`Replace ${spread.leftPage.parsedFile.originalName}`}
                          >
                            ↻
                          </button>
                        )}
                        {onRemove && (
                          <button
                            onClick={() => onRemove(spread.leftPage!.parsedFile)}
                            className="text-[10px] bg-red-500 text-white px-1 py-0.5 rounded hover:bg-red-600"
                            title="Remove"
                            aria-label={`Remove ${spread.leftPage.parsedFile.originalName}`}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      {previewSpreads.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          No pages to preview. Upload files to get started.
        </div>
      )}
    </div>
  );
};


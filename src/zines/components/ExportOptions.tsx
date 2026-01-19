import React, { useMemo } from 'react';
import type { ZineMode, PDFGenerationOptions, PDFExportFormat, BookletPageInfo, SpreadInfo, PDFResult, PaperConfig } from '../types';
import { estimateUncompressedSize, estimateCompressedSize, formatFileSize } from '../utils/pdfGenerator';

interface ExportOptionsProps {
  mode: ZineMode;
  options: PDFGenerationOptions;
  onOptionsChange: (options: PDFGenerationOptions) => void;
  fileName: string;
  onFileNameChange: (fileName: string) => void;
  onExportPNG?: () => void;
  onExportPDF?: (format: PDFExportFormat) => void;
  isGenerating: boolean;
  progress: number;
  isValid: boolean;
  pages?: BookletPageInfo[];
  spreads?: SpreadInfo[];
  pdfResult?: PDFResult | null;
  onRedownload?: () => void;
  generationError?: string | null;
  hasImages?: boolean;
  paperConfig?: PaperConfig; // For minizine output dimension calculations
}

const PDF_FORMAT_INFO: Record<PDFExportFormat, { label: string; description: string; icon: string }> = {
  mixam: {
    label: 'Mixam Print-Ready',
    description: 'For uploading to Mixam.com (0.125" bleed)',
    icon: '🖨️',
  },
  'home-duplex': {
    label: 'Home Printing',
    description: 'Duplex print & staple binding',
    icon: '🏠',
  },
  distribution: {
    label: 'Digital',
    description: 'Sequential pages for screens',
    icon: '📱',
  },
};


const ExportOptions: React.FC<ExportOptionsProps> = ({
  mode,
  options,
  onOptionsChange,
  fileName,
  onFileNameChange,
  onExportPNG,
  onExportPDF,
  isGenerating,
  progress,
  isValid,
  pages = [],
  spreads = [],
  pdfResult,
  onRedownload,
  generationError,
  hasImages = false,
  paperConfig,
}) => {
  // File size estimate for booklet mode
  const fileSizeEstimates = useMemo(() => {
    if (mode !== 'booklet' || (pages.length === 0 && spreads.length === 0)) return null;
    
    const uncompressed = estimateUncompressedSize(pages, spreads);
    const compressed = estimateCompressedSize(uncompressed, options);
    
    return {
      uncompressed,
      compressed,
      savings: uncompressed - compressed,
      savingsPercent: Math.round((1 - compressed / uncompressed) * 100),
    };
  }, [mode, pages, spreads, options]);

  // Minizine output dimensions and file size estimate
  const minizineOutputInfo = useMemo(() => {
    if (mode !== 'minizine' || !paperConfig || !hasImages) return null;
    
    // Calculate output dimensions based on paper config and resolution scale
    const isLandscape = paperConfig.width >= paperConfig.height;
    const baseWidth = isLandscape ? paperConfig.width : paperConfig.height;
    const baseHeight = isLandscape ? paperConfig.height : paperConfig.width;
    
    // Full resolution dimensions
    const fullWidth = Math.round(baseWidth * paperConfig.dpi);
    const fullHeight = Math.round(baseHeight * paperConfig.dpi);
    
    // Scaled dimensions based on resolution setting
    const scaledWidth = Math.round(fullWidth * options.resolutionScale);
    const scaledHeight = Math.round(fullHeight * options.resolutionScale);
    
    // Effective DPI
    const effectiveDpi = Math.round(paperConfig.dpi * options.resolutionScale);
    
    // Estimate file size (rough estimate: ~3 bytes per pixel for JPEG at quality, ~4 for PNG)
    const pixelCount = scaledWidth * scaledHeight;
    const bytesPerPixel = options.jpegQuality >= 1 ? 4 : (0.5 + options.jpegQuality * 2.5); // PNG vs JPEG estimate
    const estimatedBytes = Math.round(pixelCount * bytesPerPixel);
    
    return {
      width: scaledWidth,
      height: scaledHeight,
      dpi: effectiveDpi,
      estimatedSize: estimatedBytes,
    };
  }, [mode, paperConfig, hasImages, options.resolutionScale, options.jpegQuality]);

  const handleJpegQualityChange = (quality: number) => {
    onOptionsChange({
      ...options,
      jpegQuality: quality,
      convertToJpeg: quality < 1,
      compressionPreset: 'custom',
    });
  };

  const handleResolutionScaleChange = (scale: number) => {
    onOptionsChange({
      ...options,
      resolutionScale: scale,
      reduceResolution: scale < 1,
      compressionPreset: 'custom',
    });
  };

  const handleExportFormatChange = (format: PDFExportFormat) => {
    onOptionsChange({
      ...options,
      exportFormat: format,
    });
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">
          <span>📤</span>
          Export
        </h2>
      </div>
      <div className="card-body space-y-4">
        {/* File Name */}
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1">
            File Name
          </label>
          <input
            type="text"
            value={fileName}
            onChange={(e) => onFileNameChange(e.target.value)}
            className="input-field text-sm"
            placeholder={mode === 'minizine' ? 'minizine' : 'booklet'}
          />
        </div>

        {/* Quality Settings */}
        <div className="warm-section space-y-3">
          <h4 className="font-medium text-amber-800 text-xs">Quality & Size</h4>

          <div className="flex items-center gap-2">
            <span className="text-xs text-amber-700 w-16 flex-shrink-0">Quality</span>
            <input
              type="range"
              min="0.5"
              max="1"
              step="0.05"
              value={options.jpegQuality}
              onChange={(e) => handleJpegQualityChange(parseFloat(e.target.value))}
              className="compression-slider flex-1"
            />
            <span className="text-xs text-amber-600 w-10 text-right">
              {options.jpegQuality >= 1 ? 'Max' : `${Math.round(options.jpegQuality * 100)}%`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-amber-700 w-16 flex-shrink-0">Resolution</span>
            <input
              type="range"
              min="0.25"
              max="1"
              step="0.05"
              value={options.resolutionScale}
              onChange={(e) => handleResolutionScaleChange(parseFloat(e.target.value))}
              className="compression-slider flex-1"
            />
            <span className="text-xs text-amber-600 w-10 text-right">
              {Math.round(options.resolutionScale * 100)}%
            </span>
          </div>

          {/* Booklet file size estimate */}
          {fileSizeEstimates && (
            <div className="flex items-center gap-2 pt-2 border-t border-amber-200">
              <span className="text-xs text-amber-700">Est. Size:</span>
              <span className="text-xs font-medium text-amber-800">
                {formatFileSize(fileSizeEstimates.compressed)}
              </span>
              {fileSizeEstimates.savingsPercent > 0 && (
                <span className="text-xs text-teal-600">
                  (-{fileSizeEstimates.savingsPercent}%)
                </span>
              )}
            </div>
          )}

          {/* Minizine output info */}
          {minizineOutputInfo && (
            <div className="pt-2 border-t border-amber-200 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-amber-700">Output:</span>
                <span className="font-medium text-amber-800">
                  {minizineOutputInfo.width} × {minizineOutputInfo.height} px
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-amber-700">Effective DPI:</span>
                <span className="font-medium text-amber-800">{minizineOutputInfo.dpi}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-amber-700">Est. Size:</span>
                <span className="font-medium text-amber-800">
                  {formatFileSize(minizineOutputInfo.estimatedSize)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* CMYK Option */}
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={options.convertToCMYK}
            onChange={(e) => onOptionsChange({ ...options, convertToCMYK: e.target.checked })}
            className="w-4 h-4 text-teal-600 rounded border-amber-300"
          />
          <span className="text-xs text-amber-700">Convert to CMYK</span>
        </label>

        {/* Export Format Selection (Booklet only) */}
        {mode === 'booklet' && (
          <div>
            <label className="block text-xs font-medium text-amber-700 mb-1.5">
              PDF Format
            </label>
            <div className="space-y-1.5">
              {(Object.keys(PDF_FORMAT_INFO) as PDFExportFormat[]).map((format) => {
                const info = PDF_FORMAT_INFO[format];
                const isSelected = options.exportFormat === format;
                return (
                  <label
                    key={format}
                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer border transition-colors ${
                      isSelected
                        ? 'border-teal-400 bg-teal-50'
                        : 'border-amber-200 bg-amber-50/50 hover:bg-amber-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="exportFormat"
                      value={format}
                      checked={isSelected}
                      onChange={() => handleExportFormatChange(format)}
                      className="text-teal-600"
                    />
                    <span className="text-base">{info.icon}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium text-amber-800">{info.label}</span>
                      <span className="text-xs text-amber-600 ml-1">– {info.description}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Error Display */}
        {generationError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-2">
            <p className="text-red-700 text-xs">{generationError}</p>
          </div>
        )}

        {/* Export Buttons */}
        <div className="space-y-2 pt-2">
          {mode === 'minizine' && (
            <>
              {onExportPNG && (
                <button
                  onClick={onExportPNG}
                  disabled={!hasImages || isGenerating}
                  className="btn btn-primary w-full"
                >
                  <span>🖼️</span> Download PNG
                </button>
              )}
              {onExportPDF && (
                <button
                  onClick={() => onExportPDF('mixam')}
                  disabled={!hasImages || isGenerating}
                  className="btn btn-secondary w-full"
                >
                  <span>📄</span> Download PDF
                </button>
              )}
            </>
          )}
          
          {mode === 'booklet' && onExportPDF && (
            <button
              onClick={() => onExportPDF(options.exportFormat)}
              disabled={!isValid || isGenerating}
              className="btn btn-primary w-full"
            >
              <span>{PDF_FORMAT_INFO[options.exportFormat].icon}</span>
              {isGenerating ? 'Generating...' : `Download ${PDF_FORMAT_INFO[options.exportFormat].label}`}
            </button>
          )}
        </div>

        {/* Progress Bar */}
        {isGenerating && (
          <div className="pt-2">
            <div className="pdf-progress-bar">
              <div
                className="pdf-progress-fill"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <p className="text-center text-xs text-stone-500 mt-1">
              {Math.round(progress * 100)}%
            </p>
          </div>
        )}

        {/* Result */}
        {pdfResult && !isGenerating && (
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-2">
            <div className="flex items-center justify-between">
              <div className="text-xs">
                <p className="font-medium text-teal-800">Ready!</p>
                <p className="text-teal-600">{formatFileSize(pdfResult.fileSize)}</p>
              </div>
              {onRedownload && (
                <button
                  onClick={onRedownload}
                  className="btn btn-primary text-xs px-3 py-1.5"
                >
                  Download
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExportOptions;

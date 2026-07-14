import React, { useMemo, useState } from 'react';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemText from '@mui/material/ListItemText';
import type { ZineMode, PDFGenerationOptions, PDFExportFormat, BookletPageInfo, SpreadInfo, PDFResult, PaperConfig } from '../types';
import {
  estimateUncompressedSize,
  estimateCompressedSize,
  formatFileSize,
  estimateMinizineExportBytes,
  minizineExportPixelSize,
  suggestDpiFromSources,
} from '../utils/pdfMetrics';
import AppSlider from '../../shared/components/AppSlider';
import { useLabsDisclosureMenu } from '../../shared/a11y/useLabsDisclosureMenu';

type PageImageExportKind = 'pages' | 'scroll' | 'spreads';

const PAGE_IMAGE_EXPORT_OPTIONS: Array<{
  id: PageImageExportKind;
  label: string;
  hint: string;
}> = [
  { id: 'pages', label: 'Pages (ZIP)', hint: 'One image per page' },
  { id: 'scroll', label: 'Vertical scroll', hint: 'Single long image' },
  { id: 'spreads', label: 'Spreads (ZIP)', hint: 'Facing-page pairs' },
];

interface ExportOptionsProps {
  mode: ZineMode;
  options: PDFGenerationOptions;
  onOptionsChange: (options: PDFGenerationOptions) => void;
  fileName: string;
  onFileNameChange: (fileName: string) => void;
  onExportPNG?: () => void;
  onExportPDF?: (format: PDFExportFormat) => void;
  onExportPagesZip?: () => void;
  onExportVerticalScroll?: () => void;
  onExportSpreadsZip?: () => void;
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
  /** Source pixel sizes used to suggest a higher export DPI. */
  sourceImageSizes?: Array<{ width: number; height: number }>;
  onApplyDpi?: (dpi: number) => void;
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
  onExportPagesZip,
  onExportVerticalScroll,
  onExportSpreadsZip,
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
  sourceImageSizes = [],
  onApplyDpi,
}) => {
  const [pageImageMenuAnchor, setPageImageMenuAnchor] = useState<HTMLElement | null>(null);
  const pageImageMenu = useLabsDisclosureMenu({ menuId: 'zine-page-image-export-menu' });
  const pageImageMenuOpen = Boolean(pageImageMenuAnchor);

  const pageImageChoices = useMemo(
    () =>
      PAGE_IMAGE_EXPORT_OPTIONS.filter((option) => {
        if (option.id === 'pages') return Boolean(onExportPagesZip);
        if (option.id === 'scroll') return Boolean(onExportVerticalScroll);
        return Boolean(onExportSpreadsZip);
      }),
    [onExportPagesZip, onExportVerticalScroll, onExportSpreadsZip],
  );

  const runPageImageExport = (kind: PageImageExportKind) => {
    setPageImageMenuAnchor(null);
    if (kind === 'pages') onExportPagesZip?.();
    else if (kind === 'scroll') onExportVerticalScroll?.();
    else onExportSpreadsZip?.();
  };

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

    const { width, height, effectiveDpi, panelWidth, panelHeight } = minizineExportPixelSize(
      paperConfig,
      options.resolutionScale,
    );
    const estimatedBytes = estimateMinizineExportBytes(paperConfig, {
      resolutionScale: options.resolutionScale,
      jpegQuality: options.jpegQuality,
    });
    const suggestedDpi = suggestDpiFromSources(paperConfig, sourceImageSizes);
    const showDpiNudge =
      suggestedDpi != null && suggestedDpi > paperConfig.dpi + 25;

    return {
      width,
      height,
      panelWidth,
      panelHeight,
      dpi: effectiveDpi,
      estimatedSize: estimatedBytes,
      suggestedDpi: showDpiNudge ? suggestedDpi : null,
    };
  }, [
    mode,
    paperConfig,
    hasImages,
    options.resolutionScale,
    options.jpegQuality,
    sourceImageSizes,
  ]);

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
            <AppSlider
              min={0.5}
              max={1}
              step={0.05}
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
            <AppSlider
              min={0.25}
              max={1}
              step={0.05}
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
                <span className="text-amber-700">Sheet:</span>
                <span className="font-medium text-amber-800">
                  {minizineOutputInfo.width} × {minizineOutputInfo.height} px
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-amber-700">Per page:</span>
                <span className="font-medium text-amber-800">
                  {minizineOutputInfo.panelWidth} × {minizineOutputInfo.panelHeight} px
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
              {minizineOutputInfo.suggestedDpi != null && onApplyDpi && (
                <button
                  type="button"
                  onClick={() => onApplyDpi(minizineOutputInfo.suggestedDpi!)}
                  className="mt-2 w-full text-left text-xs px-2.5 py-2 rounded-md bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100 transition-colors"
                >
                  Your pages are larger than each panel. Set DPI to{' '}
                  <span className="font-semibold">{minizineOutputInfo.suggestedDpi}</span> to
                  keep source detail.
                </button>
              )}
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
            <>
              <button
                onClick={() => onExportPDF(options.exportFormat)}
                disabled={!isValid || isGenerating}
                className="btn btn-primary w-full"
              >
                <span>{PDF_FORMAT_INFO[options.exportFormat].icon}</span>
                {isGenerating ? 'Generating...' : `Download ${PDF_FORMAT_INFO[options.exportFormat].label}`}
              </button>
              {pageImageChoices.length > 0 && (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary w-full"
                    disabled={!isValid || isGenerating}
                    onClick={(event) => setPageImageMenuAnchor(event.currentTarget)}
                    {...pageImageMenu.getTriggerA11yProps(pageImageMenuOpen)}
                  >
                    Download page images
                    <span className="ml-1 opacity-70" aria-hidden>
                      ▾
                    </span>
                  </button>
                  <Menu
                    {...pageImageMenu.getMenuProps()}
                    anchorEl={pageImageMenuAnchor}
                    open={pageImageMenuOpen}
                    onClose={() => setPageImageMenuAnchor(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                    slotProps={{
                      paper: {
                        className: 'labs-popover-surface zine-page-image-menu',
                        sx: {
                          minWidth: pageImageMenuAnchor?.offsetWidth ?? 220,
                          mt: 0.5,
                          bgcolor: 'var(--color-bg-card)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius)',
                          boxShadow: '0 8px 24px rgba(68, 64, 60, 0.12)',
                          backgroundImage: 'none',
                          '& .MuiMenuItem-root:hover, & .MuiMenuItem-root.Mui-focusVisible': {
                            bgcolor: 'var(--color-teal-50)',
                          },
                          '& .MuiListItemText-primary': {
                            fontFamily: 'var(--font-heading)',
                            fontSize: '1.05rem',
                            fontWeight: 700,
                            color: 'var(--color-teal-500)',
                            lineHeight: 1.2,
                          },
                          '& .MuiListItemText-secondary': {
                            fontSize: '0.7rem',
                            color: 'var(--color-text-muted)',
                            marginTop: '2px',
                          },
                        },
                      },
                    }}
                  >
                    {pageImageChoices.map((option) => (
                      <MenuItem
                        key={option.id}
                        onClick={() => runPageImageExport(option.id)}
                        dense
                      >
                        <ListItemText
                          primary={option.label}
                          secondary={option.hint}
                        />
                      </MenuItem>
                    ))}
                  </Menu>
                </>
              )}
            </>
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

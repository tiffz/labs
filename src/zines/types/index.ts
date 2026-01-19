// ============================================
// Zine Mode Types
// ============================================

export type ZineMode = 'minizine' | 'booklet';

// ============================================
// Paper & Layout Configuration
// ============================================

export interface PaperConfig {
  width: number;
  height: number;
  unit: 'in' | 'cm' | 'mm';
  dpi: number;
}

export interface BleedConfig {
  top: number;
  bottom: number;
  left: number;
  right: number;
  unit: 'in' | 'mm';
  // Quiet area (safe zone) - distance from trim line where important content should not be placed
  quietArea: number;
}

// Mixam standard bleed: 0.125" (1/8 inch) on all sides
// Mixam quiet area (safe zone): 0.25" from trim line
export const DEFAULT_BLEED_CONFIG: BleedConfig = {
  top: 0.125,
  bottom: 0.125,
  left: 0.125,
  right: 0.125,
  unit: 'in',
  quietArea: 0.25, // 1/4 inch from trim line
};

// ============================================
// Booklet Mode Types (from comic-pdf)
// ============================================

export interface ParsedFile {
  file: File;
  pageNumber: number | null;
  isSpread: boolean;
  spreadPages?: [number, number];
  displayName: string;
  originalName: string;
}

export interface BookletPageInfo {
  parsedFile: ParsedFile;
  imageData: string;
  width: number;
  height: number;
  fitMode?: 'cover' | 'contain';
  isBlank?: boolean;
}

export interface SpreadInfo {
  parsedFile: ParsedFile;
  imageData: string;
  width: number;
  height: number;
  pages: [number, number];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================
// PDF Generation Types
// ============================================

export type CompressionPreset = 'none' | 'light' | 'medium' | 'maximum' | 'custom';

// Different PDF export formats
export type PDFExportFormat = 
  | 'mixam'           // Professional print-ready spreads for Mixam
  | 'home-duplex'     // Home printing with duplex/saddle-stitch imposition
  | 'distribution';   // Sequential pages for digital distribution

export interface PDFGenerationOptions {
  convertToCMYK: boolean;
  compressionPreset: CompressionPreset;
  convertToJpeg: boolean;
  jpegQuality: number; // 0-1, default 0.85
  reduceResolution: boolean;
  resolutionScale: number; // 0.25-1, default 1 (100%)
  bleed: BleedConfig;
  exportFormat: PDFExportFormat;
  blankPageColor?: string; // Hex color for blank pages, default #FFFFFF
}

export interface PDFResult {
  blob: Blob;
  fileName: string;
  fileSize: number;
  pageCount: number;
  spreadCount: number;
  estimatedUncompressedSize?: number;
}

export const DEFAULT_PDF_OPTIONS: PDFGenerationOptions = {
  convertToCMYK: false,
  compressionPreset: 'custom',
  convertToJpeg: false,
  jpegQuality: 1,
  reduceResolution: false,
  resolutionScale: 1,
  bleed: DEFAULT_BLEED_CONFIG,
  exportFormat: 'mixam',
};

// ============================================
// Image Validation Types
// ============================================

export interface ImageSizeWarning {
  imageId: string;
  fileName: string;
  issue: 'crop' | 'upscale' | 'downscale' | 'aspect-ratio';
  message: string;
  severity: 'warning' | 'error';
}

// ============================================
// Minizine Mode Types (existing)
// ============================================

export interface PageSlot {
  id: string;
  label: string;
  notes: string;
  rotation: number;
  gridOrder: number;
}

export interface ModalContent {
  title: string;
  message: string;
}

export interface ImageUploadProps {
  slot: PageSlot;
  imageSrc?: string;
  fitMode?: 'cover' | 'contain';
  rotation?: number;
  onImageUpload: (slotId: string, imageDataUrl: string) => void;
  onImageRemove: (slotId: string) => void;
  onFitModeChange: (slotId: string, mode: 'cover' | 'contain') => void;
  onDragStart: (slotId: string) => void;
  onDragOver: (event: React.DragEvent, targetSlotId: string) => void;
  onDrop: (event: React.DragEvent, targetSlotId: string) => void;
  onDragEnd: () => void;
  isDraggingOver: boolean;
  isBeingDragged: boolean;
  isPreviewMode: boolean;
  paperConfig: PaperConfig;
  setModalContent: (content: ModalContent | null) => void;
}

export interface ZinePageDisplayProps {
  imageSrc?: string;
  fitMode?: 'cover' | 'contain';
  rotation?: number;
  altText?: string;
  paperConfig: PaperConfig;
  isPrintSlot?: boolean;
}

export interface PaperConfigurationProps {
  paperConfig: PaperConfig;
  onConfigChange: (newConfig: PaperConfig) => void;
  mode?: ZineMode;
}

export interface BookPreviewProps {
  images: Record<string, string>;
  imageFitModes: Record<string, 'cover' | 'contain'>;
  paperConfig: PaperConfig;
  mode?: ZineMode;
  bookletPages?: BookletPageInfo[];
  bookletSpreads?: SpreadInfo[];
}

export interface PrintSheetCanvasProps {
  images: Record<string, string>;
  imageFitModes: Record<string, 'cover' | 'contain'>;
  paperConfig: PaperConfig;
  pageSlotsConfig: PageSlot[];
}

export type ViewMode = 'edit' | 'printPreview' | 'bookPreview';

// StPageFlip event data interfaces
export interface StPageFlipEvent {
  data: number;
}

export interface StPageFlipInitEvent {
  data: {
    page: number;
  };
}

// StPageFlip library types
export interface StPageFlipInstance {
  loadFromHTML(elements: NodeListOf<Element>): void;
  on(event: 'flip', callback: (e: StPageFlipEvent) => void): void;
  on(event: 'init', callback: (e: StPageFlipInitEvent) => void): void;
  flipNext(): void;
  flipPrev(): void;
  getPageCount(): number;
  getCurrentPageIndex(): number;
  destroy(): void;
}

interface StPageFlipConfig {
  width: number;
  height: number;
  size: string;
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
  maxShadowOpacity: number;
  showCover: boolean;
  mobileScrollSupport: boolean;
  flippingTime: number;
  usePortrait: boolean;
  drawShadow: boolean;
  startPage: number;
  autoSize: boolean;
}

declare global {
  interface Window {
    St: {
      PageFlip: new (element: HTMLElement, config: StPageFlipConfig) => StPageFlipInstance;
    };
  }
} 
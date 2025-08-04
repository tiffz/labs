export interface PaperConfig {
  width: number;
  height: number;
  unit: 'in' | 'cm' | 'mm';
  dpi: number;
}

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
}

export interface BookPreviewProps {
  images: Record<string, string>;
  imageFitModes: Record<string, 'cover' | 'contain'>;
  paperConfig: PaperConfig;
}

export interface PrintSheetCanvasProps {
  images: Record<string, string>;
  imageFitModes: Record<string, 'cover' | 'contain'>;
  paperConfig: PaperConfig;
  pageSlotsConfig: PageSlot[];
}

export type ViewMode = 'edit' | 'printPreview' | 'bookPreview';

export interface FileMapping {
  [key: string]: string[];
}

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
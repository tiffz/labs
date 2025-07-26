import type { PageSlot, FileMapping } from '../types';

export const PAGE_SLOTS_CONFIG: PageSlot[] = [
  { id: 'page4', label: 'Page 4', notes: 'Top Left on Sheet', rotation: 180, gridOrder: 1 },
  { id: 'page3', label: 'Page 3', notes: 'Top Center-Left', rotation: 180, gridOrder: 2 },
  { id: 'page2', label: 'Page 2', notes: 'Top Center-Right', rotation: 180, gridOrder: 3 },
  { id: 'page1', label: 'Page 1', notes: 'Top Right on Sheet', rotation: 180, gridOrder: 4 },
  { id: 'page5', label: 'Page 5', notes: 'Bottom Left on Sheet', rotation: 0, gridOrder: 5 },
  { id: 'page6', label: 'Page 6', notes: 'Bottom Center-Left', rotation: 0, gridOrder: 6 },
  { id: 'backCover', label: 'Back Cover', notes: 'Bottom Center-Right', rotation: 0, gridOrder: 7 },
  { id: 'frontCover', label: 'Front Cover', notes: 'Bottom Right on Sheet', rotation: 0, gridOrder: 8 },
];

export const BOOK_READING_ORDER: string[] = [
  'blankBeforeFront',
  'frontCover',
  'page1',
  'page2',
  'page3',
  'page4',
  'page5',
  'page6',
  'backCover',
  'blankAfterBack'
];

export const DUMMY_PLACEHOLDER_IMAGE = "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22100%22%20height%3D%22100%22%20viewBox%3D%220%200%20100%20100%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22100%22%20height%3D%22100%22%20fill%3D%22%23FFFFFF%22%2F%3E%3C%2Fsvg%3E";

export const FILENAME_MAP: FileMapping = {
  'frontCover': ['frontcover', 'front', 'cover', 'outerfront'],
  'backCover': ['backcover', 'back', 'outerback'],
  'page1': ['page1', 'p1', '1'],
  'page2': ['page2', 'p2', '2'],
  'page3': ['page3', 'p3', '3'],
  'page4': ['page4', 'p4', '4'],
  'page5': ['page5', 'p5', '5'],
  'page6': ['page6', 'p6', '6'],
};

export const DEFAULT_PAPER_CONFIG = {
  width: 11,
  height: 8.5,
  unit: 'in' as const,
  dpi: 300
}; 
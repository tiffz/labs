import type { DragEvent, ReactNode } from 'react';
import type { SongMediaUploadSlot } from './songMediaUploadSlot';

export type PracticeResourceGroupId = SongMediaUploadSlot;

/** One section in the unified practice resources panel. */
export type PracticeResourceGroup = {
  id: string;
  /** DOM anchor; defaults to repertoire meta or {@link PracticeResourceGroup.id}. */
  anchorId?: string;
  title: string;
  subheader: string;
  itemCount: number;
  /** Shown in the group header when a primary item exists (e.g. "Spotify — Blue"). */
  primarySummary?: string | null;
  body: ReactNode;
  footer?: ReactNode;
};

export const PRACTICE_RESOURCE_GROUP_META: Record<
  PracticeResourceGroupId,
  { title: string; subheader: string; anchorId: string }
> = {
  listen: {
    title: 'Listen',
    subheader: 'Reference recordings',
    anchorId: 'encore-media-hub-listen',
  },
  play: {
    title: 'Play',
    subheader: 'Backing tracks',
    anchorId: 'encore-media-hub-play',
  },
  charts: {
    title: 'Charts',
    subheader: 'Sheets & exports',
    anchorId: 'encore-media-hub-charts',
  },
  takes: {
    title: 'Takes',
    subheader: 'Practice uploads',
    anchorId: 'encore-media-hub-takes',
  },
  misc: {
    title: 'Misc',
    subheader: 'Other resources',
    anchorId: 'encore-media-hub-misc',
  },
};

/** Drag-and-drop upload targets for resource group panels (repertoire + Originals). */
export type ResourceGroupsFileDropConfig<T extends string = string> = {
  /** File drag active anywhere on the song page (from outside the page). */
  globalFileDragActive: boolean;
  /** Hub section currently receiving pointer during a file drag. */
  hoveredSlot: T | null;
  /** Slots that accept the current drag payload; omit or null = all slots. */
  eligibleSlots?: Set<T> | null;
  onMediaSlotDragEnter: (slot: T, e: DragEvent<HTMLElement>) => void;
  onMediaSlotDragLeave: (slot: T, e: DragEvent<HTMLElement>) => void;
  onMediaSlotDragOver: (slot: T, e: DragEvent<HTMLElement>) => void;
  onMediaSlotDrop: (slot: T, e: DragEvent<HTMLElement>) => void;
};

/** @deprecated Use {@link ResourceGroupsFileDropConfig} */
export type SongPageMediaHubFileDropConfig = ResourceGroupsFileDropConfig<SongMediaUploadSlot>;

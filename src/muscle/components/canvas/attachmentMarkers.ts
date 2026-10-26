import { ANATOMY_COLORS } from './anatomyVisuals';
import type { AttachmentRole, AttachmentSites } from './attachmentSites';

export type AttachmentMarkerShape = 'sphere' | 'diamond';

/**
 * Origin and insertion must differ in shape as well as colour, so the pair still reads
 * apart for colour-blind viewers. The sidebar legend draws the same shapes.
 */
export const ATTACHMENT_MARKER_STYLE: Record<
  AttachmentRole,
  { label: string; shape: AttachmentMarkerShape; color: string }
> = {
  origin: { label: 'Origin', shape: 'sphere', color: ANATOMY_COLORS.origin },
  insertion: { label: 'Insertion', shape: 'diamond', color: ANATOMY_COLORS.insertion },
};

export type AttachmentMarker = {
  role: AttachmentRole;
  shape: AttachmentMarkerShape;
  color: string;
  position: [number, number, number];
};

export function buildAttachmentMarkers(sites: AttachmentSites): AttachmentMarker[] {
  return (['origin', 'insertion'] as const).map((role) => ({
    role,
    shape: ATTACHMENT_MARKER_STYLE[role].shape,
    color: ATTACHMENT_MARKER_STYLE[role].color,
    position: [sites[role].x, sites[role].y, sites[role].z],
  }));
}

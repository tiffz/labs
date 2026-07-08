export type EncoreMediaLinkRowSlot = 'reference' | 'backing' | 'chart';

export const ENCORE_MEDIA_LINK_PRIMARY_COPY: Record<
  EncoreMediaLinkRowSlot,
  { active: string; promote: string }
> = {
  reference: { active: 'Preferred reference', promote: 'Make preferred' },
  backing: { active: 'Preferred backing track', promote: 'Make preferred' },
  chart: { active: 'Preferred chart', promote: 'Make preferred' },
};

export function encoreMediaLinkPrimaryHoverProps(
  slot: EncoreMediaLinkRowSlot,
  isPrimary: boolean,
  onMakePrimary?: () => void,
): {
  isPrimary: boolean;
  onMakePrimary?: () => void;
  primaryActiveLabel: string;
  primaryPromoteLabel: string;
} {
  const copy = ENCORE_MEDIA_LINK_PRIMARY_COPY[slot];
  return {
    isPrimary,
    onMakePrimary,
    primaryActiveLabel: copy.active,
    primaryPromoteLabel: copy.promote,
  };
}

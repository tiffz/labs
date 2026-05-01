export type EncorePossessivePage = 'repertoire' | 'practice' | 'performances' | 'settings';

/** e.g. `Tiff's practice`, or `Your practice` when no owner display name. */
export function encorePossessivePageTitle(
  ownerDisplayName: string | null | undefined,
  page: EncorePossessivePage,
): string {
  const t = ownerDisplayName?.trim();
  if (t) return `${t}'s ${page}`;
  return `Your ${page}`;
}

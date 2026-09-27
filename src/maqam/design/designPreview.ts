/**
 * Whether the theme picker is on this page at all.
 *
 * A preview control, not a feature: it exists so one person can compare ten
 * looks in the running app and say which one to keep. Anyone else loading the
 * app gets one design, and the winner's tokens will be folded into the
 * stylesheet with the rest deleted, per `labs-ui-design-variations`.
 *
 * In its own module so the picker component can stay a component-only file and
 * keep Fast Refresh working.
 */
export function isDesignPreviewEnabled(): boolean {
  if (import.meta.env.DEV) return true;
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).has('designPreview');
}

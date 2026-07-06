import { isPlaybackFieldSelectPopoverTarget } from '../../shared/components/music/playbackFieldSelect';

const PROTECTED_SELECTORS = [
  '.playback-controls-bar',
  '.palette-sidebar',
  '.input-section',
  '.shared-bpm-dropdown',
  '.shared-time-sig-dropdown',
  '.labs-metronome-settings-popover',
  '.settings-dropdown-container',
  '.settings-dropdown',
  '.rhythm-presets-dropdown',
  '.rhythm-presets-menu',
  '.download-dropdown-container',
] as const;

/** Portaled popovers near the playback bar should not clear Darbuka note selection. */
export function isDrumsSelectionProtectedTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (isPlaybackFieldSelectPopoverTarget(target)) return true;
  return PROTECTED_SELECTORS.some((selector) => target.closest(selector) != null);
}

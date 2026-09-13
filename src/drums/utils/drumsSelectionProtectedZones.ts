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

/**
 * Should an outside click clear the note selection?
 *
 * Reported while practising: "when I select an area to loop, sometimes while I'm looping, the
 * selection UI disappears making it hard to tell what section I'm looping. The loop still works
 * properly, but the state of the UI doesn't reflect what's happening."
 *
 * That is this handler. Click-away-clears is right while editing, but the selection is not only an
 * edit target — during playback it IS the loop. Clearing it mid-loop leaves the transport looping a
 * range nothing on screen describes, so the UI and the audio disagree about what is happening. The
 * `.playback-controls-bar` zone was protected for the same reason; the gap was every neutral click
 * elsewhere on the page (a heading, a label, the background).
 *
 * So while playback is running on a selection, the selection stays. Stopping playback restores
 * ordinary click-away behaviour.
 */
export function shouldClearDrumsSelectionOnOutsideClick(opts: {
  hasSelection: boolean;
  isPlaying: boolean;
  targetProtected: boolean;
  insideNoteDisplay: boolean;
}): boolean {
  if (!opts.hasSelection) return false;
  if (opts.targetProtected) return false;
  if (opts.insideNoteDisplay) return false;
  // The selection is describing the running loop; do not let the UI drift from the audio.
  if (opts.isPlaying) return false;
  return true;
}

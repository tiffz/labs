/** Debounced auto-push quiet period (Stanza, Scales, Gesture portfolio apps). */
export const LABS_DRIVE_AUTO_PUSH_DEBOUNCE_MS = 3_000;

/** Minimum ms between consecutive auto-pushes on the same session. */
export const LABS_DRIVE_AUTO_PUSH_MIN_INTERVAL_MS = 4_000;

/** Silent re-pull interval while the tab is visible (cross-device sync). */
export const LABS_DRIVE_AUTO_PULL_INTERVAL_MS = 5 * 60 * 1000;

/** Minimum ms between visibility-triggered silent re-pulls. */
export const LABS_DRIVE_AUTO_PULL_MIN_INTERVAL_MS = 2 * 60 * 1000;

const STORAGE_KEY = 'gesture-local-ui-preferences';

export type GestureLocalUiPreferences = {
  version: 1;
  /** Device-local only — never synced to Drive. Default hides NSFW-tagged collections. */
  showNsfwCollections: boolean;
};

function parseStoredPreferences(raw: unknown): GestureLocalUiPreferences | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (row.version !== 1) return null;
  if (typeof row.showNsfwCollections !== 'boolean') return null;
  return { version: 1, showNsfwCollections: row.showNsfwCollections };
}

export function readGestureLocalUiPreferences(): GestureLocalUiPreferences | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return parseStoredPreferences(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeGestureLocalUiPreferences(
  patch: Partial<Pick<GestureLocalUiPreferences, 'showNsfwCollections'>>,
): GestureLocalUiPreferences {
  const next: GestureLocalUiPreferences = {
    version: 1,
    showNsfwCollections: patch.showNsfwCollections ?? readGestureLocalUiPreferences()?.showNsfwCollections ?? false,
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore quota / private mode failures.
  }
  return next;
}

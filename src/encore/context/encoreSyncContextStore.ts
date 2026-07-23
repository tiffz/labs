import { createContext } from 'react';
import type { ConflictAnalysis, SyncCheckResult } from '../drive/repertoireSync';

/**
 * `deferred`: a conflict the user dismissed ("Decide later") without resolving. Local edits diverge
 * from Drive and were never pushed, so the status surface must say "not backed up" rather than
 * silently reverting to "Backed up" (S4). Cleared by the next successful sync/resolve.
 */
export type SyncUiState = 'idle' | 'syncing' | 'error' | 'conflict' | 'deferred';

/** Fired after the merge half of a silent auto-merge completes; consumers can show a toast. */
export type SilentAutoMergeSummary = {
  localOnlyCount: number;
  remoteOnlyCount: number;
};

/**
 * Sync surface: Drive sync state machine, conflict view, debounced background push.
 */
export type EncoreSyncContextValue = {
  syncState: SyncUiState;
  syncMessage: string | null;
  /** Re-run Drive bootstrap / pull. No-op when not signed in. */
  retryDriveSync: () => Promise<void>;
  /** Debounced silent push of `repertoire_data.json`. Coalesces rapid local writes. */
  scheduleBackgroundSync: () => void;
  /** Set when `runInitialSyncIfPossible` returns a row-level conflict that needs user input. */
  conflict: SyncCheckResult | null;
  /** Detailed analysis (which rows conflict / which are auto-mergeable) — populated alongside `conflict`. */
  conflictAnalysis: ConflictAnalysis | null;
  /** Resolve every "both edited" row at once with the user's per-row choice. */
  resolveConflictWithChoices: (choices: Map<string, 'local' | 'remote'>) => Promise<void>;
  /** Convenience: pick "use Drive everywhere". */
  resolveConflictRemote: () => Promise<void>;
  /** Convenience: pick "keep this device everywhere". */
  resolveConflictLocal: () => Promise<void>;
  dismissConflict: () => void;
  /** Most recent silent auto-merge summary; cleared after toasting. */
  lastSilentMerge: SilentAutoMergeSummary | null;
  acknowledgeSilentMerge: () => void;
};

/**
 * HMR-stable context identity. Vite Fast Refresh can re-evaluate `createContext` while an older
 * `useEncoreSync` module still holds the previous object — which surfaces as
 * "useEncoreSync outside EncoreSyncProvider" even though the provider is mounted.
 * Pinning on `globalThis` keeps one identity across hot updates.
 */
const HMR_KEY = '__labsEncoreSyncContext' as const;

type GlobalWithSyncCtx = typeof globalThis & {
  [HMR_KEY]?: ReturnType<typeof createContext<EncoreSyncContextValue | null>>;
};

const g = globalThis as GlobalWithSyncCtx;

export const EncoreSyncContext =
  g[HMR_KEY] ?? createContext<EncoreSyncContextValue | null>(null);

g[HMR_KEY] = EncoreSyncContext;

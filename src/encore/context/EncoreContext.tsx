/* eslint-disable react-refresh/only-export-components */
/**
 * Composer for the Encore provider stack.
 *
 * Encore used to hang every concern (auth, library, sync, mutations) off a single big context
 * value, so any save would re-render `EncoreMainShell`, `EncoreAccountMenu`, both list screens,
 * and SongPage in lockstep. The provider has been split into four focused sub-contexts:
 *
 *  - {@link EncoreAuthProvider}     — Google + Spotify session
 *  - {@link EncoreLibraryProvider}  — Dexie live queries split into tables vs extras contexts (see {@link useEncoreLibraryTables} / {@link useEncoreLibraryExtras})
 *  - {@link EncoreSyncProvider}     — sync state machine, conflict, debounced background push
 *  - {@link EncoreActionsProvider}  — saveSong / deleteSong / savePerformance / deletePerformance / publish / reorganize
 *
 * Components that only need one slice should call {@link useEncoreAuth}, {@link useEncoreLibrary},
 * {@link useEncoreSync}, or {@link useEncoreActions} directly. The legacy {@link useEncore}
 * façade is preserved for back-compat — it composes all four hooks but pays the full re-render cost.
 */
import { useMemo, type ReactElement, type ReactNode } from 'react';
import type { RepertoireExtrasRow } from '../db/encoreDb';
import type { EncorePerformance, EncoreSong } from '../types';
import type { SyncCheckResult } from '../drive/repertoireSync';
import type { BuildPublicSnapshotOptions } from '../drive/publicSnapshot';
import type { ReorganizeDriveUploadsResult } from '../drive/driveReorganize';
import { LabsUndoProvider } from '../../shared/undo/LabsUndoContext';
import { EncoreBlockingJobProvider } from './EncoreBlockingJobContext';
import { EncoreAuthProvider, useEncoreAuth } from './EncoreAuthContext';
import { EncoreLibraryProvider, useEncoreLibrary } from './EncoreLibraryContext';
import { EncoreSyncProvider, type SyncUiState } from './EncoreSyncContext';
import { EncoreActionsProvider } from './EncoreActionsContext';
import { useEncoreSync } from './useEncoreSync';
import { useEncoreActions } from './useEncoreActions';

export type { SyncUiState } from './EncoreSyncContext';
export type { EncoreSongLiveState } from './EncoreLibraryContext';
export { useEncoreAuth } from './EncoreAuthContext';
export {
  useEncoreLibrary,
  useEncoreLibraryExtras,
  useEncoreLibraryTables,
  useEncoreSong,
} from './EncoreLibraryContext';
export { useEncoreSync } from './useEncoreSync';
export { useEncoreActions } from './useEncoreActions';

/**
 * Legacy shape exposed by `useEncore()`. New code should reach for the slice-specific hooks.
 */
export interface EncoreContextValue {
  googleAuthReady: boolean;
  googleAccessToken: string | null;
  googleGateBypassed: boolean;
  displayName: string | null;
  effectiveDisplayName: string | null;
  setOwnerDisplayName: (name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  continueWithoutGoogle: () => void;
  signOut: () => void;
  spotifyLinked: boolean;
  disconnectSpotify: () => void;
  connectSpotify: () => Promise<void>;
  spotifyConnectError: string | null;
  spotifyConnectLoopbackUrl: string | null;
  clearSpotifyConnectError: () => void;
  accessDenied: boolean;
  accessDeniedMessage: string | null;
  retryAccessGate: () => void;
  songs: EncoreSong[];
  performances: EncorePerformance[];
  repertoireExtras: RepertoireExtrasRow;
  songsHydrated: boolean;
  libraryReady: boolean;
  refreshLibrary: () => Promise<void>;
  saveRepertoireExtras: (patch: Partial<Omit<RepertoireExtrasRow, 'id'>>) => Promise<void>;
  saveSong: (song: EncoreSong, options?: { silentUndo?: boolean }) => Promise<void>;
  deleteSong: (id: string) => Promise<void>;
  savePerformance: (p: EncorePerformance, options?: { silentUndo?: boolean }) => Promise<void>;
  deletePerformance: (id: string) => Promise<void>;
  bulkSaveSongs: (songs: EncoreSong[]) => Promise<void>;
  bulkDeleteSongs: (ids: string[]) => Promise<void>;
  bulkSavePerformances: (performances: EncorePerformance[]) => Promise<void>;
  bulkDeletePerformances: (ids: string[]) => Promise<void>;
  syncState: SyncUiState;
  syncMessage: string | null;
  retryDriveSync: () => Promise<void>;
  scheduleBackgroundSync: () => void;
  conflict: SyncCheckResult | null;
  resolveConflictRemote: () => Promise<void>;
  resolveConflictLocal: () => Promise<void>;
  dismissConflict: () => void;
  publishPublicSnapshot: (options?: BuildPublicSnapshotOptions) => Promise<{
    fileId: string;
    generatedAt: string;
    driveModifiedTime?: string;
    publiclyReadable: boolean;
    warning?: string;
    publicVideoCount: number;
    privateVideoCount: number;
  }>;
  reorganizeDriveUploads: () => Promise<ReorganizeDriveUploadsResult>;
}

export function EncoreProvider({ children }: { children: ReactNode }): ReactElement {
  return (
    <LabsUndoProvider>
      <EncoreBlockingJobProvider>
        <EncoreAuthProvider>
          <EncoreLibraryProvider>
            <EncoreSyncProvider>
              <EncoreActionsProvider>{children}</EncoreActionsProvider>
            </EncoreSyncProvider>
          </EncoreLibraryProvider>
        </EncoreAuthProvider>
      </EncoreBlockingJobProvider>
    </LabsUndoProvider>
  );
}

/**
 * Back-compat aggregate hook. New code should call the slice hooks directly so it only re-renders
 * when the slice it cares about changes.
 */
export function useEncore(): EncoreContextValue {
  const auth = useEncoreAuth();
  const library = useEncoreLibrary();
  const sync = useEncoreSync();
  const actions = useEncoreActions();

  return useMemo<EncoreContextValue>(
    () => ({
      googleAuthReady: auth.googleAuthReady,
      googleAccessToken: auth.googleAccessToken,
      googleGateBypassed: auth.googleGateBypassed,
      displayName: auth.displayName,
      signInWithGoogle: auth.signInWithGoogle,
      continueWithoutGoogle: auth.continueWithoutGoogle,
      signOut: auth.signOut,
      spotifyLinked: auth.spotifyLinked,
      disconnectSpotify: auth.disconnectSpotify,
      connectSpotify: auth.connectSpotify,
      spotifyConnectError: auth.spotifyConnectError,
      spotifyConnectLoopbackUrl: auth.spotifyConnectLoopbackUrl,
      clearSpotifyConnectError: auth.clearSpotifyConnectError,
      accessDenied: auth.accessDenied,
      accessDeniedMessage: auth.accessDeniedMessage,
      retryAccessGate: auth.retryAccessGate,
      songs: library.songs,
      performances: library.performances,
      repertoireExtras: library.repertoireExtras,
      songsHydrated: library.songsHydrated,
      libraryReady: library.libraryReady,
      refreshLibrary: library.refreshLibrary,
      effectiveDisplayName: library.effectiveDisplayName,
      saveRepertoireExtras: actions.saveRepertoireExtras,
      setOwnerDisplayName: actions.setOwnerDisplayName,
      saveSong: actions.saveSong,
      deleteSong: actions.deleteSong,
      savePerformance: actions.savePerformance,
      deletePerformance: actions.deletePerformance,
      bulkSaveSongs: actions.bulkSaveSongs,
      bulkDeleteSongs: actions.bulkDeleteSongs,
      bulkSavePerformances: actions.bulkSavePerformances,
      bulkDeletePerformances: actions.bulkDeletePerformances,
      syncState: sync.syncState,
      syncMessage: sync.syncMessage,
      retryDriveSync: sync.retryDriveSync,
      scheduleBackgroundSync: sync.scheduleBackgroundSync,
      conflict: sync.conflict,
      resolveConflictRemote: sync.resolveConflictRemote,
      resolveConflictLocal: sync.resolveConflictLocal,
      dismissConflict: sync.dismissConflict,
      publishPublicSnapshot: actions.publishPublicSnapshot,
      reorganizeDriveUploads: actions.reorganizeDriveUploads,
    }),
    [auth, library, sync, actions],
  );
}

import { useCallback, useState, type Dispatch, type RefObject, type SetStateAction } from 'react';
import { stanzaDb, type StanzaSong } from '../db/stanzaDb';
import { computeStanzaLocalMediaFingerprint } from '../utils/stanzaLocalMediaFingerprint';
import { backfillStanzaVideoThumbnailIfNeeded } from '../utils/stanzaVideoThumbnail';
import { loadDriveFileAsStanzaLocalBlob } from '../drive/loadDriveSourceForStanza';
import {
  hydrateStanzaDriveSongMedia,
  stanzaDriveSongNeedsMediaDownload,
} from '../drive/stanzaDriveMediaHydration';
import { clearStanzaDriveTombstone } from '../drive/stanzaDriveTombstones';
import {
  readStanzaDriveBootstrapFromLocation,
  replaceStanzaPlaybackUrlSearchParams,
  STANZA_DRIVE_FILE_QUERY,
} from '../utils/stanzaDriveUrlParams';
import { useStanzaPlaybackBootstrap } from './useStanzaPlaybackBootstrap';

type UseStanzaDriveDeepLinkOptions = {
  songs: StanzaSong[] | undefined;
  selected: StanzaSong | null;
  selectedId: string | null;
  selectedIdRef: RefObject<string | null>;
  selectedRef: RefObject<StanzaSong | null>;
  setSelectedId: Dispatch<SetStateAction<string | null>>;
  setViewerShellPending: Dispatch<SetStateAction<boolean>>;
  ensureYoutubeSongByVideoId: (videoId: string) => Promise<string>;
};

/**
 * Drive deep-link resolution (`?df=<file id>`), including the playback URL bootstrap.
 * Owns all deep-link UI state (errors, OAuth-gesture prompt, tombstone re-add prompt,
 * busy flag) so `StanzaWorkspace` only wires the returned values into
 * `StanzaDriveDeepLinkAlerts`. Extracted per docs/COMPONENT_DECOMPOSITION_PATTERN.md
 * (self-contained lifecycle) with no behavior change.
 */
export function useStanzaDriveDeepLink({
  songs,
  selected,
  selectedId,
  selectedIdRef,
  selectedRef,
  setSelectedId,
  setViewerShellPending,
  ensureYoutubeSongByVideoId,
}: UseStanzaDriveDeepLinkOptions) {
  const [driveDeepLinkError, setDriveDeepLinkError] = useState<string | null>(null);
  const [fingerprintDeepLinkError, setFingerprintDeepLinkError] = useState<string | null>(null);
  const [driveDeepLinkNeedsGesture, setDriveDeepLinkNeedsGesture] = useState<{
    fileId: string;
    title: string | null;
  } | null>(null);
  /**
   * Set when the URL's `?df=<file id>` is one the user previously removed from this device's
   * library (a Drive deletion tombstone — see ADR 0006). Renders a "Re-add to library?" prompt
   * instead of silently re-importing the row; dismissing strips the URL params; re-adding
   * clears the tombstone and runs the normal import.
   */
  const [driveDeepLinkRemovedPrompt, setDriveDeepLinkRemovedPrompt] = useState<{
    fileId: string;
    title: string | null;
  } | null>(null);
  const [driveDeepLinkBusy, setDriveDeepLinkBusy] = useState(false);

  const commitDriveDeepLinkImport = useCallback(
    async (opts: { fileId: string; suggestedTitle: string | null; interactiveOAuth: boolean }) => {
      const existingByLink = await stanzaDb.songs.where('driveSourceFileId').equals(opts.fileId).first();
      if (existingByLink) {
        clearStanzaDriveTombstone(opts.fileId);
        const row = stanzaDriveSongNeedsMediaDownload(existingByLink)
          ? await hydrateStanzaDriveSongMedia({
              row: existingByLink,
              suggestedTitle: opts.suggestedTitle,
              interactiveOAuth: opts.interactiveOAuth,
            })
          : existingByLink;
        setSelectedId(row.id);
        setDriveDeepLinkError(null);
        setDriveDeepLinkNeedsGesture(null);
        void backfillStanzaVideoThumbnailIfNeeded(row.id);
        return;
      }
      const { blob, title, driveSourceFileId } = await loadDriveFileAsStanzaLocalBlob(opts);
      const existing = await stanzaDb.songs.where('driveSourceFileId').equals(driveSourceFileId).first();
      if (existing) {
        clearStanzaDriveTombstone(driveSourceFileId);
        const row = stanzaDriveSongNeedsMediaDownload(existing)
          ? await hydrateStanzaDriveSongMedia({
              row: existing,
              suggestedTitle: opts.suggestedTitle,
              interactiveOAuth: opts.interactiveOAuth,
            })
          : existing;
        setSelectedId(row.id);
        setDriveDeepLinkError(null);
        setDriveDeepLinkNeedsGesture(null);
        void backfillStanzaVideoThumbnailIfNeeded(row.id);
        return;
      }
      const rowId = crypto.randomUUID();
      const row: StanzaSong = {
        id: rowId,
        ytId: null,
        title,
        markers: [],
        stats: {},
        updatedAt: Date.now(),
        localAudioBlob: blob,
        driveSourceFileId,
        localMediaFingerprint: computeStanzaLocalMediaFingerprint({
          sizeBytes: blob.size,
          fileName: title,
        }),
      };
      await stanzaDb.songs.put(row);
      setSelectedId(rowId);
      setDriveDeepLinkError(null);
      setDriveDeepLinkNeedsGesture(null);
      // Successful import overrides any prior tombstone for this Drive file id.
      clearStanzaDriveTombstone(driveSourceFileId);
      void backfillStanzaVideoThumbnailIfNeeded(rowId);
    },
    [setSelectedId],
  );

  const completeGestureDriveImport = useCallback(async () => {
    const pending = driveDeepLinkNeedsGesture;
    const fromUrl = readStanzaDriveBootstrapFromLocation();
    const selectedRow = selectedRef.current;
    const fileId =
      pending?.fileId ??
      fromUrl.driveFileId ??
      (selectedRow && stanzaDriveSongNeedsMediaDownload(selectedRow)
        ? selectedRow.driveSourceFileId?.trim() ?? null
        : null);
    const suggestedTitle =
      pending?.title ?? fromUrl.driveTitle ?? (selectedRow?.driveSourceFileId ? selectedRow.title : null);
    if (!fileId) return;
    setDriveDeepLinkBusy(true);
    setDriveDeepLinkError(null);
    try {
      await commitDriveDeepLinkImport({
        fileId,
        suggestedTitle,
        interactiveOAuth: true,
      });
    } catch (e) {
      setDriveDeepLinkError(e instanceof Error ? e.message : String(e));
      setDriveDeepLinkNeedsGesture(null);
    } finally {
      setDriveDeepLinkBusy(false);
    }
  }, [driveDeepLinkNeedsGesture, commitDriveDeepLinkImport, selectedRef]);

  useStanzaPlaybackBootstrap({
    songs,
    selected,
    selectedId,
    selectedIdRef,
    setSelectedId,
    setViewerShellPending,
    ensureYoutubeSongByVideoId,
    commitDriveDeepLinkImport,
    setDriveDeepLinkBusy,
    setDriveDeepLinkError,
    setFingerprintDeepLinkError,
    setDriveDeepLinkNeedsGesture,
    setDriveDeepLinkRemovedPrompt,
    fingerprintDeepLinkError,
    driveDeepLinkError,
  });

  const completeDriveDeepLinkReAdd = useCallback(async () => {
    const pending = driveDeepLinkRemovedPrompt;
    if (!pending) return;
    clearStanzaDriveTombstone(pending.fileId);
    setDriveDeepLinkRemovedPrompt(null);
    setDriveDeepLinkBusy(true);
    try {
      await commitDriveDeepLinkImport({
        fileId: pending.fileId,
        suggestedTitle: pending.title,
        interactiveOAuth: true,
      });
    } catch (e) {
      setDriveDeepLinkError(e instanceof Error ? e.message : String(e));
    } finally {
      setDriveDeepLinkBusy(false);
    }
  }, [driveDeepLinkRemovedPrompt, commitDriveDeepLinkImport]);

  /**
   * Bootstrap-prompt dismiss: the user decided not to re-add. Strip the `?df=` deep-link params
   * so a subsequent refresh doesn't prompt again, and clear the prompt state.
   */
  const dismissDriveDeepLinkRemovedPrompt = useCallback(() => {
    setDriveDeepLinkRemovedPrompt(null);
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get(STANZA_DRIVE_FILE_QUERY)) {
        replaceStanzaPlaybackUrlSearchParams({
          youtubeId: null,
          driveFileId: null,
          driveTitle: null,
          mediaFingerprint: null,
        });
      }
    }
  }, []);

  return {
    driveDeepLinkError,
    setDriveDeepLinkError,
    fingerprintDeepLinkError,
    setFingerprintDeepLinkError,
    driveDeepLinkNeedsGesture,
    driveDeepLinkRemovedPrompt,
    driveDeepLinkBusy,
    completeGestureDriveImport,
    completeDriveDeepLinkReAdd,
    dismissDriveDeepLinkRemovedPrompt,
  };
}

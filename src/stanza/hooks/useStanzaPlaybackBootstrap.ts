import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { stanzaDb, type StanzaSong } from '../db/stanzaDb';
import { readStanzaLastSelectedSongId, writeStanzaLastSelectedSongId } from '../db/stanzaLastSelectedSong';
import {
  ensureBeatLibraryImported,
  findStanzaSongByMediaFingerprint,
} from '../import/beatLibraryImport';
import { getStanzaDriveTombstoneFileIds } from '../drive/stanzaDriveTombstones';
import {
  hydrateStanzaDriveSongMedia,
  stanzaDriveSongNeedsMediaDownload,
} from '../drive/stanzaDriveMediaHydration';
import { hydrateStanzaSongStems, stanzaSongStemsNeedHydration } from '../drive/stanzaDriveStemSync';
import {
  ensureLabsGoogleAccessTokenForDrive,
  LabsGoogleInteractiveAuthRequiredError,
} from '../../shared/google/labsGoogleDriveAccess';
import { backfillStanzaVideoThumbnailIfNeeded } from '../utils/stanzaVideoThumbnail';
import {
  hasStanzaDriveDeepLinkQuery,
  hasStanzaMediaFingerprintDeepLinkQuery,
  readStanzaDriveBootstrapFromLocation,
} from '../utils/stanzaDriveUrlParams';
import { readYoutubeVFromLocation } from '../utils/stanzaUrlYoutube';

/** Grace period before showing a fingerprint miss — silent Drive auto-pull may still be merging. */
export const STANZA_FINGERPRINT_DEEP_LINK_MISS_DEFER_MS = 2500;

export interface UseStanzaPlaybackBootstrapParams {
  songs: StanzaSong[] | undefined;
  selected: StanzaSong | null;
  selectedId: string | null;
  selectedIdRef: RefObject<string | null>;
  setSelectedId: (id: string | null | ((cur: string | null) => string | null)) => void;
  setViewerShellPending: (pending: boolean) => void;
  ensureYoutubeSongByVideoId: (videoId: string) => Promise<string>;
  commitDriveDeepLinkImport: (opts: {
    fileId: string;
    suggestedTitle: string | null;
    interactiveOAuth: boolean;
  }) => Promise<void>;
  setDriveDeepLinkBusy: (busy: boolean) => void;
  setDriveDeepLinkError: (message: string | null) => void;
  setFingerprintDeepLinkError: (message: string | null) => void;
  setDriveDeepLinkNeedsGesture: (value: { fileId: string; title: string | null } | null) => void;
  setDriveDeepLinkRemovedPrompt: (value: { fileId: string; title: string | null } | null) => void;
  fingerprintDeepLinkError: string | null;
  driveDeepLinkError: string | null;
}

/**
 * URL bootstrap, last-selected restore, Drive deep links, and Beat fingerprint resolution.
 * See `BOOTSTRAP.md` for precedence rules.
 */
export function useStanzaPlaybackBootstrap(params: UseStanzaPlaybackBootstrapParams): void {
  const {
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
  } = params;

  const urlBootstrapDoneRef = useRef(false);
  const driveDeepLinkAttemptedRef = useRef(false);
  const fingerprintBootstrapAttemptedRef = useRef(false);
  const lastSelectedRestoreAttemptedRef = useRef(false);
  const driveMediaHydrateSongIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (urlBootstrapDoneRef.current) return;
    urlBootstrapDoneRef.current = true;
    const vid = readYoutubeVFromLocation();
    if (!vid) return;
    void ensureYoutubeSongByVideoId(vid).then((id) => setSelectedId(id));
  }, [ensureYoutubeSongByVideoId, setSelectedId]);

  useEffect(() => {
    if (!hasStanzaMediaFingerprintDeepLinkQuery()) return;
    let cancelled = false;
    let missTimer: number | undefined;

    void (async () => {
      await ensureBeatLibraryImported();
      const { youtubeId, driveFileId, mediaFingerprint } = readStanzaDriveBootstrapFromLocation();
      if (youtubeId || driveFileId) return;
      if (!mediaFingerprint) {
        fingerprintBootstrapAttemptedRef.current = true;
        setFingerprintDeepLinkError(
          'This upload link is not valid (the fingerprint in the URL is missing or malformed). Open the recording from your library instead.',
        );
        return;
      }
      const song = await findStanzaSongByMediaFingerprint(mediaFingerprint);
      if (cancelled) return;
      if (song) {
        fingerprintBootstrapAttemptedRef.current = true;
        setFingerprintDeepLinkError(null);
        setSelectedId(song.id);
        return;
      }
      if (songs === undefined) return;

      missTimer = window.setTimeout(() => {
        void (async () => {
          const retry = await findStanzaSongByMediaFingerprint(mediaFingerprint);
          if (cancelled) return;
          if (retry) {
            fingerprintBootstrapAttemptedRef.current = true;
            setFingerprintDeepLinkError(null);
            setSelectedId(retry.id);
            return;
          }
          fingerprintBootstrapAttemptedRef.current = true;
          setFingerprintDeepLinkError(
            'No matching upload found in your library on this device yet. If you use Drive backup, wait for sync to finish, or upload the recording here, then try again.',
          );
        })();
      }, STANZA_FINGERPRINT_DEEP_LINK_MISS_DEFER_MS);
    })();

    return () => {
      cancelled = true;
      if (missTimer != null) window.clearTimeout(missTimer);
    };
  }, [setFingerprintDeepLinkError, setSelectedId, songs]);

  useLayoutEffect(() => {
    if (driveDeepLinkAttemptedRef.current) return;
    const { youtubeId, driveFileId, driveTitle } = readStanzaDriveBootstrapFromLocation();
    if (youtubeId) return;

    if (!hasStanzaDriveDeepLinkQuery()) return;

    if (!driveFileId) {
      driveDeepLinkAttemptedRef.current = true;
      setDriveDeepLinkError(
        'This Google Drive link is not valid for Stanza (the file id in the URL is missing or malformed). Try opening it again from Encore.',
      );
      return;
    }

    driveDeepLinkAttemptedRef.current = true;

    if (getStanzaDriveTombstoneFileIds().has(driveFileId)) {
      setDriveDeepLinkRemovedPrompt({ fileId: driveFileId, title: driveTitle });
      return;
    }

    setDriveDeepLinkBusy(true);

    void (async () => {
      try {
        await commitDriveDeepLinkImport({
          fileId: driveFileId,
          suggestedTitle: driveTitle,
          interactiveOAuth: false,
        });
      } catch (e) {
        if (e instanceof LabsGoogleInteractiveAuthRequiredError) {
          setDriveDeepLinkNeedsGesture({ fileId: driveFileId, title: driveTitle });
          setDriveDeepLinkError(null);
          return;
        }
        setDriveDeepLinkError(e instanceof Error ? e.message : String(e));
      } finally {
        setDriveDeepLinkBusy(false);
      }
    })();
  }, [commitDriveDeepLinkImport, setDriveDeepLinkBusy, setDriveDeepLinkError, setDriveDeepLinkNeedsGesture, setDriveDeepLinkRemovedPrompt]);

  useEffect(() => {
    driveMediaHydrateSongIdRef.current = null;
  }, [selectedId]);

  useEffect(() => {
    if (!selected) return;
    const needsMain = stanzaDriveSongNeedsMediaDownload(selected);
    const needsStems = stanzaSongStemsNeedHydration(selected);
    if (!needsMain && !needsStems) return;
    if (driveMediaHydrateSongIdRef.current === selected.id) return;
    const { driveFileId } = readStanzaDriveBootstrapFromLocation();
    if (needsMain && driveFileId && selected.driveSourceFileId?.trim() === driveFileId) return;
    const hydrateSongId = selected.id;
    driveMediaHydrateSongIdRef.current = hydrateSongId;
    setDriveDeepLinkBusy(true);
    setDriveDeepLinkError(null);
    void (async () => {
      try {
        let row = selected;
        if (needsMain) {
          row = await hydrateStanzaDriveSongMedia({
            row,
            interactiveOAuth: false,
          });
        }
        if (stanzaSongStemsNeedHydration(row)) {
          const token = await ensureLabsGoogleAccessTokenForDrive({ interactive: false });
          row = await hydrateStanzaSongStems({ accessToken: token, row });
        }
        if (selectedIdRef.current !== hydrateSongId) return;
        setSelectedId(row.id);
        setDriveDeepLinkNeedsGesture(null);
        void backfillStanzaVideoThumbnailIfNeeded(row.id);
      } catch (e) {
        if (selectedIdRef.current !== hydrateSongId) return;
        if (e instanceof LabsGoogleInteractiveAuthRequiredError) {
          const fid = selected.driveSourceFileId?.trim();
          if (fid) {
            setDriveDeepLinkNeedsGesture({ fileId: fid, title: selected.title });
          }
          setDriveDeepLinkError(null);
          return;
        }
        setDriveDeepLinkError(e instanceof Error ? e.message : String(e));
      } finally {
        if (selectedIdRef.current === hydrateSongId) {
          setDriveDeepLinkBusy(false);
        }
      }
    })();
  }, [
    selected,
    selectedIdRef,
    setDriveDeepLinkBusy,
    setDriveDeepLinkError,
    setDriveDeepLinkNeedsGesture,
    setSelectedId,
  ]);

  useEffect(() => {
    if (lastSelectedRestoreAttemptedRef.current) return;
    if (selectedId) {
      lastSelectedRestoreAttemptedRef.current = true;
      return;
    }
    if (!songs) return;
    if (readYoutubeVFromLocation()) return;
    if (hasStanzaDriveDeepLinkQuery()) return;
    if (hasStanzaMediaFingerprintDeepLinkQuery() && !fingerprintBootstrapAttemptedRef.current) {
      return;
    }
    lastSelectedRestoreAttemptedRef.current = true;
    const savedId = readStanzaLastSelectedSongId();
    if (!savedId) return;
    if (songs.some((s) => s.id === savedId)) {
      setSelectedId(savedId);
    } else {
      writeStanzaLastSelectedSongId(null);
    }
  }, [selectedId, setSelectedId, songs]);

  useEffect(() => {
    writeStanzaLastSelectedSongId(selectedId);
  }, [selectedId]);

  useEffect(() => {
    const onPop = async () => {
      const vid = readYoutubeVFromLocation();
      if (vid) {
        const id = await ensureYoutubeSongByVideoId(vid);
        setSelectedId(id);
        return;
      }
      const { driveFileId, mediaFingerprint } = readStanzaDriveBootstrapFromLocation();
      if (driveFileId) {
        const existing = await stanzaDb.songs.where('driveSourceFileId').equals(driveFileId).first();
        if (existing) {
          setSelectedId(existing.id);
          return;
        }
        setSelectedId(null);
        return;
      }
      if (mediaFingerprint) {
        await ensureBeatLibraryImported();
        const song = await findStanzaSongByMediaFingerprint(mediaFingerprint);
        setSelectedId(song?.id ?? null);
        return;
      }
      setSelectedId(null);
    };
    const handler = () => {
      void onPop();
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [ensureYoutubeSongByVideoId, setSelectedId]);

  useEffect(() => {
    if (songs === undefined) return;

    if (selected) {
      setViewerShellPending(false);
      return;
    }

    if (selectedId && songs.some((s) => s.id === selectedId)) {
      return;
    }

    if (fingerprintDeepLinkError || driveDeepLinkError) {
      if (!selectedId) setViewerShellPending(false);
      return;
    }

    if (readYoutubeVFromLocation() && !selectedId) return;
    if (hasStanzaDriveDeepLinkQuery() && !selectedId && !driveDeepLinkError) return;
    if (hasStanzaMediaFingerprintDeepLinkQuery() && !fingerprintBootstrapAttemptedRef.current) return;

    if (selectedId && !songs.some((s) => s.id === selectedId)) {
      setSelectedId(null);
    }
    if (lastSelectedRestoreAttemptedRef.current) {
      setViewerShellPending(false);
    }
  }, [
    driveDeepLinkError,
    fingerprintDeepLinkError,
    selected,
    selectedId,
    setSelectedId,
    setViewerShellPending,
    songs,
  ]);
}

import { readStanzaLastSelectedSongId } from '../db/stanzaLastSelectedSong';
import {
  hasStanzaDriveDeepLinkQuery,
  hasStanzaMediaFingerprintDeepLinkQuery,
  readStanzaDriveBootstrapFromLocation,
} from './stanzaDriveUrlParams';
import { readYoutubeVFromLocation } from './stanzaUrlYoutube';

/**
 * Synchronous hint for first paint: avoid flashing the landing hero while Dexie / URL bootstrap
 * will immediately open the viewer.
 */
export function readInitialStanzaViewerIntent(): {
  /** Pre-select last song id when safe (no competing URL deep link). */
  initialSelectedId: string | null;
  /** True when the viewer shell should show instead of the landing hero on first paint. */
  expectViewerShell: boolean;
} {
  if (typeof window === 'undefined') {
    return { initialSelectedId: null, expectViewerShell: false };
  }

  if (readYoutubeVFromLocation()) {
    return { initialSelectedId: null, expectViewerShell: true };
  }

  const { driveFileId, mediaFingerprint } = readStanzaDriveBootstrapFromLocation();
  if (driveFileId || mediaFingerprint || hasStanzaDriveDeepLinkQuery() || hasStanzaMediaFingerprintDeepLinkQuery()) {
    return { initialSelectedId: null, expectViewerShell: true };
  }

  const last = readStanzaLastSelectedSongId();
  if (last) {
    return { initialSelectedId: last, expectViewerShell: true };
  }

  return { initialSelectedId: null, expectViewerShell: false };
}

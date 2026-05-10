import {
  driveGetMediaArrayBuffer,
  driveResolveFileForMedia,
  DriveHttpError,
} from '../../shared/drive/driveFetch';
import {
  fetchPublicDriveMediaWithApiKey,
  resolvePublicDriveFileForMedia,
} from '../../shared/drive/fetchPublicDriveMediaBytes';
import { readPersistedGoogleIdentity } from '../../shared/google/encoreGoogleTokenStorage';
import {
  ensureLabsGoogleAccessTokenForDrive,
  LabsGoogleInteractiveAuthRequiredError,
} from '../../shared/google/labsGoogleDriveAccess';
import { isPracticeableStanzaDriveMime, stanzaSongTitleFromFileName } from '../db/stanzaLocalAudioImport';
import { formatStanzaDriveLoadErrors } from './stanzaDriveLoadErrorFormatting';

/**
 * Loads bytes for a Drive file into memory for IndexedDB-backed Stanza songs.
 *
 * - **Signed-in (Encore identity present):** OAuth token first (`drive.file` + userinfo), then
 *   public API-key read as a fallback (e.g. link-shared “anyone with the link”).
 * - **Anonymous:** `VITE_GOOGLE_API_KEY` `alt=media` only (file must be publicly readable).
 *
 * Resolves Drive **shortcuts** to their target file. Allows common **video** containers
 * (`video/mp4`, `video/webm`, `video/quicktime`) from Drive when the browser can play an audio
 * track via `<audio>` (typical Encore performance uploads).
 *
 * @param opts.interactiveOAuth When `false`, skips the GIS popup if only interactive auth would work.
 *   Use from automatic loads (e.g. URL deep link on mount); retry with `true` from a button click.
 */
export async function loadDriveFileAsStanzaLocalBlob(opts: {
  fileId: string;
  suggestedTitle?: string | null;
  interactiveOAuth?: boolean;
}): Promise<{ blob: Blob; title: string; driveSourceFileId: string }> {
  const { fileId, suggestedTitle, interactiveOAuth = true } = opts;
  const identity = readPersistedGoogleIdentity();
  const fallbackErrors: string[] = [];

  const toBlob = (buffer: ArrayBuffer, contentType: string, title: string) => ({
    blob: new Blob([buffer], { type: contentType || 'audio/mpeg' }),
    title,
    driveSourceFileId: fileId,
  });

  if (identity?.email) {
    try {
      const token = await ensureLabsGoogleAccessTokenForDrive({ interactive: interactiveOAuth });
      const { mediaFileId, meta } = await driveResolveFileForMedia(token, fileId);
      if (!isPracticeableStanzaDriveMime(meta.mimeType, meta.name ?? suggestedTitle)) {
        throw new Error(
          `This Drive file is not audio or a supported recording type for Stanza (${meta.mimeType || 'unknown'}). Supported examples: audio/*, MP4/WebM/MOV with an audio track.`,
        );
      }
      const buf = await driveGetMediaArrayBuffer(token, mediaFileId);
      const title =
        suggestedTitle?.trim() ||
        (meta.name ? stanzaSongTitleFromFileName(meta.name) : `Drive · ${fileId.slice(0, 8)}…`);
      return toBlob(buf, meta.mimeType || 'audio/mpeg', title);
    } catch (e) {
      if (e instanceof LabsGoogleInteractiveAuthRequiredError) {
        throw e;
      }
      const msg = e instanceof Error ? e.message : String(e);
      if (e instanceof DriveHttpError && ![401, 403, 404].includes(e.status)) {
        throw e;
      }
      if (msg.includes('not audio or a supported recording')) {
        throw e instanceof Error ? e : new Error(msg);
      }
      fallbackErrors.push(msg);
    }
  }

  try {
    const resolved = await resolvePublicDriveFileForMedia(fileId);
    const okMeta = isPracticeableStanzaDriveMime(resolved.mimeType, resolved.name ?? suggestedTitle);
    const { buffer, contentType } = await fetchPublicDriveMediaWithApiKey(resolved.mediaFileId);
    const okCt = isPracticeableStanzaDriveMime(contentType, suggestedTitle);
    if (!okMeta && !okCt) {
      throw new Error(
        `Anonymous access did not return a recognizable audio or practiceable recording type (Drive metadata: ${resolved.mimeType ?? 'unknown'}, download: ${contentType}). Try signing in via Encore, or share the file publicly / “Anyone with the link”.`,
      );
    }
    const blobMime = okCt ? contentType : resolved.mimeType || 'audio/mpeg';
    const title = suggestedTitle?.trim() || `Drive · ${fileId.slice(0, 8)}…`;
    return toBlob(buffer, blobMime, title);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    fallbackErrors.push(msg);
  }

  throw new Error(formatStanzaDriveLoadErrors(fallbackErrors));
}

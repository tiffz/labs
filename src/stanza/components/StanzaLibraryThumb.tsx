/**
 * StanzaLibraryThumb — picks the best thumbnail to render for a library card row.
 *
 * Three resolution paths, in order:
 *   1. JPEG poster cached on the song row (`localVideoThumbnailBlob`). Painted via an
 *      object URL on a managed `<img>` and invalidated from Dexie when the browser
 *      reports a decode error (returning the user to path 2 / 3 next render).
 *   2. Live `<video>` poster sampled from the local media blob via
 *      `pickThumbnailSeekSec`. Used for videos that haven't generated a JPEG yet.
 *   3. Plain "Audio" / "Video" placeholder when no media is present (Drive-only
 *      song rows, audio-only files, decode failure).
 *
 * Object-URL lifecycle note (load-bearing):
 *   - We deliberately omit the `useEffect` cleanup that would call `URL.revokeObjectURL`.
 *     Under React Strict Mode, that cleanup runs synchronously while the freshly-mounted
 *     `<img>` / `<video>` still references `u`, which paints a broken image.
 *   - Instead we revoke the *previous* URL inside the next effect run (`setUrl(prev =>
 *     { revoke(prev); return next })`), then leak the final URL into GC (~negligible).
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { stanzaDb, type StanzaSong } from '../db/stanzaDb';
import { isStanzaBlobLikeVideo } from '../db/stanzaLocalAudioImport';
import { pickThumbnailSeekSec } from '../utils/stanzaVideoThumbnail';

interface StanzaLibraryJpegThumbProps {
  songId: string;
  blob: Blob;
  onInvalidate: () => void;
}

function StanzaLibraryJpegThumb({ songId, blob, onInvalidate }: StanzaLibraryJpegThumbProps) {
  const thumbKey = `${songId}:${blob.size}:${blob.type}`;
  const [url, setUrl] = useState(() => URL.createObjectURL(blob));
  useLayoutEffect(() => {
    const u = URL.createObjectURL(blob);
    setUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return u;
    });
    // No returned cleanup: see file-header note about Strict Mode.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `blob` reference churns; `thumbKey` encodes identity
  }, [thumbKey]);

  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;
    const onErr = () => {
      onInvalidate();
      void (async () => {
        const row = await stanzaDb.songs.get(songId);
        if (!row?.localVideoThumbnailBlob) return;
        const { localVideoThumbnailBlob, ...rest } = row;
        void localVideoThumbnailBlob;
        await stanzaDb.songs.put({ ...rest });
      })();
    };
    el.addEventListener('error', onErr);
    return () => el.removeEventListener('error', onErr);
  }, [url, songId, onInvalidate]);

  return <img ref={imgRef} className="stanza-library-card-thumb" src={url} alt="" loading="lazy" />;
}

interface StanzaLibraryVideoPosterThumbProps {
  songId: string;
  videoBlob: Blob;
}

function StanzaLibraryVideoPosterThumb({ songId, videoBlob }: StanzaLibraryVideoPosterThumbProps) {
  const [failed, setFailed] = useState(false);
  const posterKey = `${songId}:${videoBlob.size}:${videoBlob.type}`;
  const [url, setUrl] = useState(() => URL.createObjectURL(videoBlob));
  useLayoutEffect(() => {
    const u = URL.createObjectURL(videoBlob);
    setUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return u;
    });
    // No returned cleanup: see file-header note about Strict Mode.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `videoBlob` reference churns; `posterKey` encodes identity
  }, [posterKey]);
  useEffect(() => {
    setFailed(false);
  }, [songId, videoBlob.size, videoBlob.type]);

  if (failed) {
    return (
      <Box
        className="stanza-library-card-thumb stanza-library-card-thumb-placeholder"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'grey.400',
        }}
      >
        <Typography variant="caption" sx={{
          color: "text.secondary"
        }}>
          Video
        </Typography>
      </Box>
    );
  }

  return (
    <video
      className="stanza-library-card-thumb"
      src={url}
      muted
      playsInline
      preload="metadata"
      aria-hidden
      onError={() => setFailed(true)}
      onLoadedMetadata={(e) => {
        const v = e.currentTarget;
        v.currentTime = pickThumbnailSeekSec(v, 0.5);
      }}
    />
  );
}

export interface StanzaLibraryThumbProps {
  song: StanzaSong;
}

/**
 * Library card thumbnail. Falls through JPEG poster → live video sample → text
 * placeholder ("Audio" / "Video") depending on what's available on the row.
 */
export default function StanzaLibraryThumb({ song }: StanzaLibraryThumbProps) {
  const [jpegBad, setJpegBad] = useState(false);
  useEffect(() => {
    setJpegBad(false);
  }, [song.id, song.localVideoThumbnailBlob]);

  const thumb = song.localVideoThumbnailBlob;
  const media = song.localAudioBlob;
  const isVideo = Boolean(media && isStanzaBlobLikeVideo(media, song.title));

  if (thumb && !jpegBad) {
    return <StanzaLibraryJpegThumb songId={song.id} blob={thumb} onInvalidate={() => setJpegBad(true)} />;
  }
  if (isVideo && media) {
    return <StanzaLibraryVideoPosterThumb songId={song.id} videoBlob={media} />;
  }
  return (
    <Box
      className="stanza-library-card-thumb stanza-library-card-thumb-placeholder"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'grey.300',
      }}
    >
      <Typography variant="caption" sx={{
        color: "text.secondary"
      }}>
        Audio
      </Typography>
    </Box>
  );
}

import MusicNoteOutlinedIcon from '@mui/icons-material/MusicNoteOutlined';
import Button from '@mui/material/Button';
import { useMemo, useState, type ReactElement } from 'react';

import { encoreLyricsPlainText, type EncoreOriginalSummary } from '../../shared/federation/encoreOriginalsReader';
import { useEncoreSongs } from '../hooks/useEncoreSongs';
import { lyreflyProjectStageHref, navigateLyreflyHash } from '../routes/lyreflyHash';
import type { ComicProject } from '../types';
import { lyreflyWorkIdForSong, startComicFromEncoreSong } from '../utils/startComicFromEncoreSong';

function SongCard({ song }: { song: EncoreOriginalSummary }): ReactElement {
  const [busy, setBusy] = useState(false);
  const firstLine = encoreLyricsPlainText(song.lyricsAndChords).split('\n').find((line) => line.trim());

  const start = async (): Promise<void> => {
    setBusy(true);
    try {
      const project = await startComicFromEncoreSong(song);
      navigateLyreflyHash(lyreflyProjectStageHref(project.id, 'brainstorm'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="lyrefly-sketchbook__card" data-testid={`lyrefly-encore-song-${song.id}`}>
      <div className="lyrefly-sketchbook__card-open">
        <div className="lyrefly-sketchbook__card-head">
          <span className="lyrefly-sketchbook__kind">
            <MusicNoteOutlinedIcon fontSize="inherit" aria-hidden />
            {song.instrumental ? 'Instrumental' : 'Song'}
          </span>
        </div>
        <h3 className="lyrefly-sketchbook__card-title">{song.title}</h3>
        {firstLine ? <p className="lyrefly-sketchbook__seed-body">{firstLine}</p> : null}
      </div>
      <div className="lyrefly-sketchbook__card-actions">
        <Button size="small" disabled={busy} onClick={() => void start()}>
          Start a comic
        </Button>
      </div>
    </li>
  );
}

/**
 * Original songs from Encore, as more ideas to explore (ADR 0032). A song that already has a comic
 * is left out: that comic stands for it. Read-only: nothing here writes to Encore.
 */
export function LyreflyEncoreSongsSection({ projects }: { projects: readonly ComicProject[] }): ReactElement | null {
  const read = useEncoreSongs();
  const projectIds = useMemo(() => new Set(projects.map((p) => p.id)), [projects]);
  if (!read) return null;
  if (read.status === 'unavailable') {
    return (
      <p className="lyrefly-sketchbook__songs-note" data-testid="lyrefly-encore-songs-unavailable">
        {read.reason}
      </p>
    );
  }
  const songs = read.songs.filter((song) => !projectIds.has(lyreflyWorkIdForSong(song.id)));
  if (songs.length === 0) return null;
  return (
    <section className="lyrefly-sketchbook__songs" aria-labelledby="lyrefly-encore-songs-title">
      <h2 className="lyrefly-sketchbook__songs-title" id="lyrefly-encore-songs-title">
        Songs from Encore
      </h2>
      <ul className="lyrefly-sketchbook__grid">
        {songs.map((song) => (
          <SongCard key={song.id} song={song} />
        ))}
      </ul>
    </section>
  );
}

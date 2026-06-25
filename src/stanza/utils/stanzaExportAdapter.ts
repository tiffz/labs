import type { ExportSourceAdapter } from '../../shared/music/exportTypes';
import type { StanzaSong, StanzaStemTrack } from '../db/stanzaDb';
import {
  buildStanzaAudioExportFileStem,
  buildStanzaExportTracksFromSong,
  renderStanzaExportBuffers,
  type StanzaPlaybackTransform,
} from './stanzaAudioExport';

export type CreateStanzaExportAdapterOptions = {
  song: StanzaSong;
  transform: StanzaPlaybackTransform;
  usePlaybackTransforms: boolean;
  durationSec?: number;
  primaryGain?: number;
  stems?: StanzaStemTrack[];
};

export function createStanzaExportAdapter({
  song,
  transform,
  usePlaybackTransforms,
  durationSec,
  primaryGain,
  stems,
}: CreateStanzaExportAdapterOptions): ExportSourceAdapter {
  const tracks = buildStanzaExportTracksFromSong(song, { primaryGain, stems });
  const exportTransform: StanzaPlaybackTransform = usePlaybackTransforms
    ? transform
    : { playbackRate: 1, transposeSemitones: 0 };
  const fileBaseName = buildStanzaAudioExportFileStem(
    song.title,
    usePlaybackTransforms ? 'Edited' : undefined,
  );

  return {
    id: 'stanza',
    title: 'Export audio',
    fileBaseName,
    stems: tracks.map((track) => ({
      id: track.id,
      label: track.label,
      defaultSelected: track.gain > 0,
    })),
    defaultFormat: 'wav',
    supportsFormat: (format) => ['wav', 'mp3', 'ogg', 'flac'].includes(format),
    estimateDurationSeconds: () => {
      const base = durationSec && durationSec > 0 ? durationSec : 0;
      if (base <= 0) return 0;
      return base / Math.max(0.01, exportTransform.playbackRate);
    },
    renderAudio: async ({ selectedStemIds }) => {
      const rendered = await renderStanzaExportBuffers({
        tracks,
        selectedStemIds,
        transform: exportTransform,
      });
      return rendered;
    },
  };
}

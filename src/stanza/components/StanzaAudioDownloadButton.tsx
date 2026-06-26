import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import { IconButton } from '@mui/material';
import { useMemo, useRef, useState } from 'react';
import AppTooltip from '../../shared/components/AppTooltip';
import SharedExportPopover from '../../shared/components/music/SharedExportPopover';
import type { StanzaSong, StanzaStemTrack } from '../db/stanzaDb';
import {
  createStanzaExportAdapter,
  type CreateStanzaExportAdapterOptions,
} from '../utils/stanzaExportAdapter';
import {
  downloadStanzaOriginalFile,
  stanzaOriginalDownloadExtension,
  stanzaPlaybackTransformIsEdited,
  type StanzaPlaybackTransform,
} from '../utils/stanzaAudioExport';
import '../stanza-export-popover.css';

type StanzaAudioDownloadButtonProps = {
  song: StanzaSong;
  playbackRate: number;
  transposeSemitones: number;
  durationSec?: number;
  primaryGain?: number;
  stems?: StanzaStemTrack[];
};

export default function StanzaAudioDownloadButton({
  song,
  playbackRate,
  transposeSemitones,
  durationSec,
  primaryGain,
  stems,
}: StanzaAudioDownloadButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [usePlaybackTransforms, setUsePlaybackTransforms] = useState(true);

  const transform: StanzaPlaybackTransform = useMemo(
    () => ({ playbackRate, transposeSemitones }),
    [playbackRate, transposeSemitones],
  );
  const transformEdited = stanzaPlaybackTransformIsEdited(transform);
  const blob = song.localAudioBlob;

  const adapterOptions: CreateStanzaExportAdapterOptions = useMemo(
    () => ({
      song,
      transform,
      usePlaybackTransforms: transformEdited ? usePlaybackTransforms : false,
      durationSec,
      primaryGain,
      stems,
    }),
    [song, transform, transformEdited, usePlaybackTransforms, durationSec, primaryGain, stems],
  );
  const adapter = useMemo(() => createStanzaExportAdapter(adapterOptions), [adapterOptions]);
  const originalExtension = useMemo(() => {
    if (!blob) return 'audio';
    return stanzaOriginalDownloadExtension(blob, song.title);
  }, [blob, song.title]);

  if (!blob || song.ytId) return null;

  return (
    <>
      <AppTooltip title="Download audio">
        <span>
          <IconButton
            ref={buttonRef}
            type="button"
            size="small"
            aria-label="Download audio"
            aria-expanded={open}
            aria-haspopup="dialog"
            onClick={() => setOpen((prev) => !prev)}
          >
            <DownloadOutlinedIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </span>
      </AppTooltip>
      <SharedExportPopover
        open={open}
        anchorEl={buttonRef.current}
        onClose={() => setOpen(false)}
        adapter={adapter}
        persistKey="stanza"
        hideLoopCount
        headerSlot={
          <button
            type="button"
            className="shared-export-link-button"
            onClick={() => {
              downloadStanzaOriginalFile(blob, song.title);
              setOpen(false);
            }}
          >
            Download original file (.{originalExtension})
          </button>
        }
        footerSlot={
          transformEdited ? (
            <label className="shared-export-stem-row">
              <input
                type="checkbox"
                checked={usePlaybackTransforms}
                onChange={(event) => setUsePlaybackTransforms(event.target.checked)}
              />
              <span>Apply current pitch shift and playback speed</span>
            </label>
          ) : null
        }
      />
    </>
  );
}

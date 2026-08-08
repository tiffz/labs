import AddIcon from '@mui/icons-material/Add';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import { useCallback, useState, type DragEvent as ReactDragEvent, type ReactElement } from 'react';
import { encoreHairline, encoreSoftPinkWash } from '../../theme/encoreUiTokens';
import { originalsFileDragRelevant } from '../originalsSongFileDrag';
import { useOriginalsTakes } from '../hooks/useOriginalsTakes';
import { OriginalsTakeRow } from './OriginalsTakeRow';
import type { EncoreOriginalSong } from '../types';

export type OriginalsTakesWorkspaceProps = {
  song: EncoreOriginalSong;
  onChange: (next: EncoreOriginalSong) => void;
  readOnly?: boolean;
};

function audioFilesFromDrop(dataTransfer: DataTransfer | null): File[] {
  if (!dataTransfer) return [];
  return Array.from(dataTransfer.files).filter(
    (f) => f.type.startsWith('audio/') || /\.(mp3|m4a|wav|webm|aac|ogg|flac)$/i.test(f.name),
  );
}

/**
 * Record-takes stage: a surface built only for managing takes.
 *
 * Replaces the old `PracticeResourcesPanel` composition, which stacked Demo takes above References
 * and Brainstorm in one label-railed panel — so a stack of take cards sat directly on top of two
 * dense chip rows, with two add-button sizes and two item metaphors in one scroll. References and
 * Brainstorm still live on Song view and the Brainstorm sidebar, where the chip layout is right.
 */
export function OriginalsTakesWorkspace({
  song,
  onChange,
  readOnly = false,
}: OriginalsTakesWorkspaceProps): ReactElement {
  const takes = useOriginalsTakes({ song, onChange, readOnly });
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: ReactDragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      if (readOnly) return;
      const files = audioFilesFromDrop(e.dataTransfer);
      if (files.length > 0) void takes.addFiles(files);
    },
    [readOnly, takes],
  );

  const handleDragOver = useCallback(
    (e: ReactDragEvent<HTMLDivElement>) => {
      if (readOnly || !originalsFileDragRelevant(e.dataTransfer)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      setDragOver(true);
    },
    [readOnly],
  );

  const count = takes.takes.length;

  return (
    <Box
      component="section"
      aria-label="Demo takes"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragOver(false)}
      sx={(t) => ({
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        borderRadius: 2,
        p: { xs: 1.5, sm: 2 },
        border: 1,
        borderColor: dragOver ? 'primary.main' : 'transparent',
        bgcolor: dragOver ? encoreSoftPinkWash(t, 'active') : 'transparent',
        transition: 'background-color 120ms ease, border-color 120ms ease',
      })}
    >
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
        <Typography component="h2" sx={{ fontWeight: 600, fontSize: '1.0625rem' }}>
          Takes
        </Typography>
        {count > 0 ? (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {count}
          </Typography>
        ) : null}
      </Box>

      {/* One aggregate status for the whole surface — never a spinner per row. */}
      {takes.uploading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Saving takes…
          </Typography>
          <LinearProgress sx={{ borderRadius: 1, height: 3 }} />
        </Box>
      ) : null}

      {count === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary', py: 1 }}>
          {readOnly ? 'None yet.' : 'None yet. Drop an audio file here or add one below.'}
        </Typography>
      ) : (
        <Box
          component="ul"
          sx={{
            listStyle: 'none',
            m: 0,
            p: 0,
            display: 'flex',
            flexDirection: 'column',
            '& > li + li': { borderTop: 1, borderColor: encoreHairline },
          }}
        >
          {takes.takes.map((take) => {
            const download = takes.downloadProps(take);
            return (
              <OriginalsTakeRow
                key={take.id}
                take={take}
                isPreferred={takes.preferredTakeId === take.id}
                isPlaying={takes.isPlaying(take.id)}
                playable={takes.isPlayable(take)}
                storageStatus={takes.storageStatus(take)}
                driveOpenUrl={takes.driveOpenUrl(take)}
                readOnly={readOnly}
                onPlay={() => takes.play(take)}
                onMakePreferred={
                  readOnly || takes.preferredTakeId === take.id
                    ? undefined
                    : () => takes.setPreferred(take.id)
                }
                onRename={readOnly ? undefined : (label) => takes.rename(take.id, label)}
                onNotesChange={readOnly ? undefined : (notes) => takes.setNotes(take.id, notes)}
                onRemove={readOnly ? undefined : () => takes.remove(take.id)}
                {...(download ?? {})}
              />
            );
          })}
        </Box>
      )}

      {!readOnly ? (
        <Button
          variant="outlined"
          color="inherit"
          disabled={takes.uploading}
          startIcon={<AddIcon />}
          onClick={takes.openFilePicker}
          sx={{ alignSelf: 'flex-start', mt: 0.5 }}
        >
          Add take
        </Button>
      ) : null}

      {takes.hiddenInputs}
    </Box>
  );
}

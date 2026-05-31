import AddIcon from '@mui/icons-material/Add';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMemo, useState, type ReactElement } from 'react';
import { chordProLyricSnippet } from '../../../shared/music/chordPro/chordProText';
import { useEncoreOriginals } from '../../context/EncoreOriginalsActionsContext';
import { EncoreFilterChipBar, type EncoreFilterFieldConfig } from '../../ui/EncoreFilterChipBar';
import { EncorePageHeader } from '../../ui/EncorePageHeader';
import { encoreMaxWidthPage } from '../../theme/encoreUiTokens';
import { encorePagePaddingTop, encoreScreenPaddingX } from '../../theme/encoreM3Layout';
import { navigateEncore } from '../../routes/encoreAppHash';
import { stashPendingOriginalDraft } from '../pendingOriginalDraft';
import { createBlankOriginalSong } from '../types';
import { OriginalsLibraryMrtTable } from './OriginalsLibraryMrtTable';

export function OriginalsLibraryScreen(): ReactElement {
  const { originals, saveOriginal } = useEncoreOriginals();
  const [search, setSearch] = useState('');
  const [keyFilter, setKeyFilter] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const keys = useMemo(() => [...new Set(originals.map((o) => o.key).filter(Boolean))].sort(), [originals]);

  const filterFields: EncoreFilterFieldConfig[] = useMemo(
    () => [
      {
        id: 'key',
        label: 'Key',
        exclusive: true,
        options: keys.map((k) => ({ value: k, label: k })),
        allowEmptyOptions: true,
      },
    ],
    [keys],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return originals.filter((o) => {
      if (keyFilter[0] && o.key !== keyFilter[0]) return false;
      if (!q) return true;
      const snippet = chordProLyricSnippet(o.lyricsAndChords, 200).toLowerCase();
      return o.title.toLowerCase().includes(q) || snippet.includes(q);
    });
  }, [originals, search, keyFilter]);

  const startNewOriginal = () => {
    if (creating) return;
    setCreating(true);
    const song = createBlankOriginalSong();
    stashPendingOriginalDraft(song);
    navigateEncore({ kind: 'original', id: song.id });
    void saveOriginal(song, { silentUndo: true }).finally(() => setCreating(false));
  };

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        px: encoreScreenPaddingX,
        pt: encorePagePaddingTop,
        pb: { xs: 10, md: 5 },
        ...encoreMaxWidthPage,
      }}
    >
      <EncorePageHeader
        title="Originals"
        description="Your songwriting drafts. brainstorm, chart, demo takes, and exports. Stored locally and backed up to Google Drive."
        actions={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            disabled={creating}
            onClick={() => void startNewOriginal()}
          >
            New Original
          </Button>
        }
      />
      <TextField
        size="small"
        placeholder="Search titles and lyrics…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mt: 2, maxWidth: 400 }}
        inputProps={{ 'aria-label': 'Search originals' }}
      />
      <Box sx={{ mt: 1.5, mb: 0.5 }}>
        <EncoreFilterChipBar
          fields={filterFields}
          visibleFieldIds={['key']}
          values={{ key: keyFilter }}
          onChange={(id, vals) => {
            if (id === 'key') setKeyFilter(vals);
          }}
        />
      </Box>
      {filtered.length === 0 ? (
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          Nothing here yet. Add an original from the toolbar.
        </Typography>
      ) : (
        <OriginalsLibraryMrtTable rows={filtered} search={search} />
      )}
    </Box>
  );
}

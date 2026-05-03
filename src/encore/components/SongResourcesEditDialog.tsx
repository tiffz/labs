import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { useEncore } from '../context/EncoreContext';
import { applyTemplateProgressToSong } from '../repertoire/repertoireMilestones';
import { normalizeSongTags } from '../repertoire/songTags';
import { ensureSongHasDerivedMediaLinks } from '../repertoire/songMediaLinks';
import {
  encoreDialogActionsSx,
  encoreDialogContentSx,
  encoreDialogTitleSx,
} from '../theme/encoreUiTokens';
import { songWithSyncedLegacyDriveIds } from '../utils/songAttachments';
import type { EncoreMilestoneDefinition, EncoreSong } from '../types';
import { SongPageMediaHubCards } from './song/SongPageMediaHubCards';
import { useSongPageMediaHub } from './song/useSongPageMediaHub';

export type SongResourcesEditSection =
  | 'refs'
  | 'backing'
  | 'spotify'
  | 'charts'
  | 'takes'
  | 'all';

const SECTION_SCROLL: Record<SongResourcesEditSection, string | null> = {
  all: null,
  refs: 'encore-media-hub-listen',
  backing: 'encore-media-hub-play',
  spotify: 'encore-media-hub-spotify',
  charts: 'encore-media-hub-charts',
  takes: 'encore-media-hub-takes',
};

function toPersistedSong(
  raw: EncoreSong,
  milestoneTemplate: EncoreMilestoneDefinition[],
): EncoreSong {
  const now = new Date().toISOString();
  const withMilestones = applyTemplateProgressToSong(raw, milestoneTemplate);
  const cleanedTags = normalizeSongTags(withMilestones.tags);
  return songWithSyncedLegacyDriveIds({
    ...withMilestones,
    title: withMilestones.title.trim() || 'Untitled',
    artist: withMilestones.artist.trim() || 'Unknown artist',
    tags: cleanedTags.length > 0 ? cleanedTags : undefined,
    updatedAt: now,
    createdAt: withMilestones.createdAt || now,
  });
}

export function SongResourcesEditDialog(props: {
  open: boolean;
  song: EncoreSong | null;
  initialSection?: SongResourcesEditSection;
  onClose: () => void;
}): ReactElement {
  const { open, song, initialSection = 'all', onClose } = props;
  const { songs, repertoireExtras, googleAccessToken, spotifyLinked, saveSong } = useEncore();
  const [draft, setDraft] = useState<EncoreSong | null>(null);
  const [saving, setSaving] = useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const milestoneTemplate = repertoireExtras.milestoneTemplate;

  useEffect(() => {
    if (!open || !song) {
      setDraft(null);
      return;
    }
    const latest = songs.find((s) => s.id === song.id) ?? song;
    setDraft(ensureSongHasDerivedMediaLinks({ ...latest }));
  }, [open, song, songs]);

  const persistAfterMetadataRefresh = useCallback(
    async (raw: EncoreSong) => {
      await saveSong(toPersistedSong(raw, milestoneTemplate), { silentUndo: true });
    },
    [milestoneTemplate, saveSong],
  );

  const mediaHub = useSongPageMediaHub({
    draft,
    setDraft,
    isNew: false,
    routeKind: 'song',
    routeSongId: song?.id ?? null,
    songs,
    googleAccessToken,
    spotifyLinked,
    driveUploadFolderOverrides: repertoireExtras.driveUploadFolderOverrides,
    persistAfterMetadataRefresh,
  });

  useEffect(() => {
    if (!open || initialSection === 'all') return;
    const id = SECTION_SCROLL[initialSection];
    if (!id) return;
    const t = window.setTimeout(() => {
      contentRef.current?.querySelector(`#${CSS.escape(id)}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }, 50);
    return () => clearTimeout(t);
  }, [open, initialSection, draft?.id]);

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await saveSong(toPersistedSong(draft, milestoneTemplate));
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const title = draft?.title?.trim() || song?.title?.trim() || 'Song';

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" scroll="paper">
      <DialogTitle sx={encoreDialogTitleSx}>Edit song media — {title}</DialogTitle>
      <DialogContent ref={contentRef} sx={{ ...encoreDialogContentSx, pt: 1 }}>
        {draft ? (
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            {mediaHub.spotifyAlerts}
            <Box id="encore-media-hub-spotify">{mediaHub.catalogStrip}</Box>
            <SongPageMediaHubCards slots={mediaHub.mediaSlots} />
            {mediaHub.searchWebFooter}
          </Stack>
        ) : null}
      </DialogContent>
      <DialogActions sx={encoreDialogActionsSx}>
        <Button onClick={onClose} color="inherit" disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={() => void handleSave()} disabled={saving || !draft}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

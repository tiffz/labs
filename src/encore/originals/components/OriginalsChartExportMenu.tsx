import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Snackbar from '@mui/material/Snackbar';
import Tooltip from '@mui/material/Tooltip';
import { useEffect, useRef, useState, type ReactElement } from 'react';
import { chartLayoutToTwoColumnExport } from '../../../shared/music/chordChartTwoColumnExport';
import { copyTextToClipboard } from '../../../shared/music/chordChartAsciiExport';
import { openMonospaceChartPrintWindow } from '../../../shared/music/chordChartPrintExport';
import { useEncoreAuth } from '../../context/EncoreAuthContext';
import { useEncoreBlockingJobs } from '../../context/EncoreBlockingJobContext';
import type { EncoreOriginalSong } from '../types';
import type { ChartLayout } from '../../../shared/music/chordPro/chordChartLayout';

export type OriginalsChartExportMenuProps = {
  song: EncoreOriginalSong;
  layout: ChartLayout;
  onPersist: (next: EncoreOriginalSong) => void | Promise<void>;
};

export function OriginalsChartExportMenu({ song, layout, onPersist }: OriginalsChartExportMenuProps): ReactElement {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [snack, setSnack] = useState<string | null>(null);
  const { googleAccessToken, signInWithGoogle } = useEncoreAuth();
  const { withBlockingJob } = useEncoreBlockingJobs();
  const tokenRef = useRef(googleAccessToken);

  useEffect(() => {
    tokenRef.current = googleAccessToken;
  }, [googleAccessToken]);

  const exportData = chartLayoutToTwoColumnExport(layout);

  const onCopyAscii = async () => {
    await copyTextToClipboard(exportData.single);
    setSnack('Chord chart copied');
    setAnchor(null);
  };

  const onPdf = () => {
    openMonospaceChartPrintWindow(exportData, song.title.trim() || 'Chord chart');
    setAnchor(null);
  };

  const onGoogleDoc = async () => {
    setAnchor(null);
    let token = tokenRef.current;
    if (!token) {
      await withBlockingJob('Signing in to Google…', async () => {
        await signInWithGoogle();
      });
      token = tokenRef.current;
      if (!token) return;
    }
    await withBlockingJob('Exporting to Google Doc…', async () => {
      const { openGoogleDocInNewTab, syncOriginalChartGoogleDoc } = await import(
        '../originalsChartGoogleDocExport'
      );
      const res = await syncOriginalChartGoogleDoc({
        accessToken: token!,
        song,
      });
      const next = { ...song, driveChartGoogleDocId: res.driveChartGoogleDocId };
      await onPersist(next);
      openGoogleDocInNewTab(res.driveChartGoogleDocId);
    });
  };

  return (
    <>
      <Tooltip title="Export chart">
        <IconButton size="small" aria-label="Export chart" onClick={(e) => setAnchor(e.currentTarget)}>
          <FileDownloadOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        <MenuItem onClick={() => void onCopyAscii()}>
          <ListItemIcon>
            <ContentCopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Copy ASCII" secondary="Clipboard" />
        </MenuItem>
        <MenuItem onClick={onPdf}>
          <ListItemIcon>
            <PictureAsPdfOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Print / PDF" secondary="Two-column layout" />
        </MenuItem>
        <MenuItem onClick={() => void onGoogleDoc()}>
          <ListItemIcon>
            <DescriptionOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Google Doc" secondary="Two-column table" />
        </MenuItem>
      </Menu>
      <Snackbar open={Boolean(snack)} autoHideDuration={2500} message={snack} onClose={() => setSnack(null)} />
    </>
  );
}

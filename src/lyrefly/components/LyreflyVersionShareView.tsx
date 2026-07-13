import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import ViewAgendaOutlinedIcon from '@mui/icons-material/ViewAgendaOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';

import { ComicScrollReader } from '../../shared/zine/ComicScrollReader';
import type { ComicScrollReaderPage } from '../../shared/zine/ComicScrollReader';
import { isPublicDriveGuestFetchConfigured } from '../../shared/drive/buildPublicDriveAltMediaUrl';
import {
  fetchPublicVersionShareSnapshot,
  type LyreflyVersionShareSnapshot,
} from '../drive/lyreflyVersionShareSnapshot';
import { buildComicSpreadViews } from '../utils/comicSpreadViews';

type PreviewTab = 'book' | 'scroll';

export function LyreflyVersionShareView({ fileId }: { fileId: string }): ReactElement {
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading');
  const [message, setMessage] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<LyreflyVersionShareSnapshot | null>(null);
  const [tab, setTab] = useState<PreviewTab>('book');
  const [spreadIndex, setSpreadIndex] = useState(0);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    setMessage(null);
    if (!isPublicDriveGuestFetchConfigured()) {
      setState('error');
      setMessage('Guest preview is not configured on this site (missing Google API key).');
      return undefined;
    }
    void fetchPublicVersionShareSnapshot(fileId)
      .then((data) => {
        if (cancelled) return;
        setSnapshot(data);
        setSpreadIndex(0);
        setState('ready');
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState('error');
        setMessage(error instanceof Error ? error.message : 'Could not load this shared version.');
      });
    return () => {
      cancelled = true;
    };
  }, [attempt, fileId]);

  const readerPages = useMemo<ComicScrollReaderPage[]>(
    () =>
      (snapshot?.pages ?? []).map((page) => ({
        id: page.id,
        label: page.label,
        imageUrl: page.imageDataUrl,
        isSpread: page.isSpread,
      })),
    [snapshot],
  );

  const spreadViews = useMemo(
    () =>
      buildComicSpreadViews(
        readerPages.map((page) => ({
          id: page.id,
          label: page.label,
          imageUrl: page.imageUrl,
          isSpread: Boolean(page.isSpread),
        })),
      ),
    [readerPages],
  );

  const currentSpread = spreadViews[spreadIndex];

  if (state === 'loading') {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress aria-label="Loading shared comic" />
      </Container>
    );
  }

  if (state === 'error' || !snapshot) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Stack spacing={2} alignItems="center" textAlign="center">
          <Typography variant="h5" component="h1">
            Shared comic unavailable
          </Typography>
          <Typography color="text.secondary">{message ?? 'This link may have expired or been disabled.'}</Typography>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={retry}>
            Try again
          </Button>
        </Stack>
      </Container>
    );
  }

  return (
    <Box className="lyrefly-version-share" data-testid="lyrefly-version-share">
      <Container maxWidth="lg" sx={{ py: { xs: 2, md: 3 } }}>
        <Stack spacing={1.5}>
          <Typography variant="overline" color="text.secondary">
            Shared draft
          </Typography>
          <Typography variant="h4" component="h1">
            {snapshot.projectTitle}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            {snapshot.versionLabel}
          </Typography>
          <Tabs value={tab} onChange={(_event, next: PreviewTab) => setTab(next)} aria-label="Reader style">
            <Tab value="book" icon={<MenuBookOutlinedIcon fontSize="small" />} iconPosition="start" label="Book" />
            <Tab value="scroll" icon={<ViewAgendaOutlinedIcon fontSize="small" />} iconPosition="start" label="Scroll" />
          </Tabs>
        </Stack>

        <Box sx={{ mt: 2.5 }}>
          {tab === 'book' ? (
            <Box className="lyrefly-version-share__book">
              <Box className="lyrefly-book-preview__stage lyrefly-version-share__book-stage">
                {currentSpread ? (
                  <div
                    className={[
                      'lyrefly-book-preview__spread',
                      currentSpread.right ? 'lyrefly-book-preview__spread--pair' : '',
                      !currentSpread.right ? 'lyrefly-book-preview__spread--single' : '',
                      currentSpread.isOpening ? 'lyrefly-book-preview__spread--opening' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {currentSpread.left ? (
                      <img
                        src={currentSpread.left.imageUrl}
                        alt={currentSpread.left.label}
                        className="lyrefly-book-preview__image"
                      />
                    ) : (
                      <div className="lyrefly-book-preview__blank" aria-hidden />
                    )}
                    {currentSpread.right ? (
                      <img
                        src={currentSpread.right.imageUrl}
                        alt={currentSpread.right.label}
                        className="lyrefly-book-preview__image"
                      />
                    ) : null}
                  </div>
                ) : null}
              </Box>
              <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ mt: 1.5 }}>
                <IconButton
                  aria-label="Previous spread"
                  disabled={spreadIndex <= 0}
                  onClick={() => setSpreadIndex((index) => Math.max(0, index - 1))}
                >
                  ‹
                </IconButton>
                <Typography variant="caption" color="text.secondary">
                  {spreadIndex + 1} / {Math.max(spreadViews.length, 1)}
                </Typography>
                <IconButton
                  aria-label="Next spread"
                  disabled={spreadIndex >= spreadViews.length - 1}
                  onClick={() => setSpreadIndex((index) => Math.min(spreadViews.length - 1, index + 1))}
                >
                  ›
                </IconButton>
              </Stack>
            </Box>
          ) : (
            <div className="comic-scroll-reader-shell comic-scroll-reader-shell--platform">
              <ComicScrollReader pages={readerPages} title={snapshot.projectTitle} variant="platform" />
            </div>
          )}
        </Box>
      </Container>
    </Box>
  );
}

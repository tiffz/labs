import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Tooltip, { tooltipClasses, type TooltipProps } from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';
import { useCallback, useEffect, useRef, useState, type FocusEvent, type MutableRefObject, type ReactElement, type ReactNode } from 'react';
import { ensureSpotifyAccessToken } from '../spotify/pkce';
import { fetchSpotifyTrack } from '../spotify/spotifyApi';
import type { EncoreMediaSource } from '../types';
import { fetchYoutubeOembedMeta, getYoutubeOembedCached } from '../youtube/youtubeOembedMeta';

/**
 * Streaming sources this hover card can resolve metadata for. A subset of
 * {@link EncoreMediaSource} (drive links don't have a streaming preview API).
 */
export type EncoreStreamingHoverCardKind = Extract<EncoreMediaSource, 'spotify' | 'youtube'>;

type ResolvedMeta = {
  title: string;
  subtitle: string;
};

const spotifyMetaCache = new Map<string, ResolvedMeta>();

function fallbackYoutubeHeadingFromWatchUrl(watchUrl: string): string {
  try {
    const v = new URL(watchUrl).searchParams.get('v')?.trim();
    if (v) return `Video · ${v}`;
  } catch {
    /* ignore */
  }
  return 'YouTube';
}

async function fetchSpotifyTrackMeta(
  clientId: string,
  spotifyLinked: boolean,
  trackId: string,
): Promise<ResolvedMeta | null> {
  const key = trackId.trim();
  if (!key) return null;
  const cached = spotifyMetaCache.get(key);
  if (cached) return cached;
  if (!spotifyLinked || !clientId) return null;
  try {
    const token = await ensureSpotifyAccessToken(clientId);
    if (!token) return null;
    const t = await fetchSpotifyTrack(token, key);
    const artists = t.artists?.map((a) => a.name).filter(Boolean).join(', ') ?? '';
    const title = t.name?.trim() || 'Spotify track';
    const meta = { title, subtitle: artists || 'Spotify' };
    spotifyMetaCache.set(key, meta);
    return meta;
  } catch {
    return null;
  }
}

/**
 * Tooltip styled as a small card. We piggyback on MUI's Tooltip rather than rolling our own
 * Popover-based hover behavior because Tooltip ships a pixel-perfect "interactive zone" between
 * the trigger and the floating content (the transparent margin captures mouse events) and well-
 * tuned `enterNextDelay`/`leaveDelay` semantics. The previous Popover-based card had visible
 * open/close races whenever the popover content height changed (lazy meta fetch) or the user
 * crossed the trigger→paper boundary, which read as the "flashing" the user reported.
 */
const HoverCardTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.primary,
    boxShadow: theme.shadows[3],
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: Number(theme.shape.borderRadius) * 1.5,
    padding: theme.spacing(1, 1.25),
    maxWidth: 360,
    fontSize: theme.typography.body2.fontSize,
  },
}));

const HOVER_CARD_OFFSET_MODIFIER = { name: 'offset', options: { offset: [0, 4] } } as const;

/** Pin the popper while inline nickname/notes are focused so chip layout shifts do not yank the card. */
const HOVER_CARD_PINNED_POPPER_MODIFIERS = [
  HOVER_CARD_OFFSET_MODIFIER,
  { name: 'flip', enabled: false },
  { name: 'preventOverflow', enabled: false },
  { name: 'eventListeners', options: { scroll: false, resize: false } },
];

type DeferredHoverCardEditFields = {
  nickname?: string;
  onNicknameChange?: (value: string) => void;
  notes?: string;
  onNotesChange?: (value: string) => void;
};

function isFocusMovingWithinHoverCardEdits(event: FocusEvent<HTMLElement>): boolean {
  const root = event.currentTarget.closest('[data-encore-hover-card-edits]');
  const related = event.relatedTarget;
  return related instanceof Node && Boolean(root?.contains(related));
}

function useDeferredHoverCardEdits(fields: DeferredHoverCardEditFields) {
  const { nickname, onNicknameChange, notes, onNotesChange } = fields;
  const [nicknameDraft, setNicknameDraft] = useState(nickname ?? '');
  const [notesDraft, setNotesDraft] = useState(notes ?? '');
  const [nicknameEditing, setNicknameEditing] = useState(false);
  const [notesEditing, setNotesEditing] = useState(false);
  const editingRef = useRef(false);

  useEffect(() => {
    if (!nicknameEditing) setNicknameDraft(nickname ?? '');
  }, [nickname, nicknameEditing]);

  useEffect(() => {
    if (!notesEditing) setNotesDraft(notes ?? '');
  }, [notes, notesEditing]);

  useEffect(() => {
    editingRef.current = nicknameEditing || notesEditing;
  }, [nicknameEditing, notesEditing]);

  const commitNickname = useCallback(() => {
    if (!onNicknameChange) return;
    setNicknameEditing(false);
    onNicknameChange(nicknameDraft);
  }, [onNicknameChange, nicknameDraft]);

  const commitNotes = useCallback(() => {
    if (!onNotesChange) return;
    setNotesEditing(false);
    onNotesChange(notesDraft);
  }, [onNotesChange, notesDraft]);

  const commitAll = useCallback(() => {
    if (nicknameEditing) commitNickname();
    if (notesEditing) commitNotes();
  }, [commitNickname, commitNotes, nicknameEditing, notesEditing]);

  const popperPinned = nicknameEditing || notesEditing;

  return {
    popperPinned,
    editingRef,
    commitAll,
    nicknameField: onNicknameChange
      ? {
          value: nicknameDraft,
          onChange: setNicknameDraft,
          onFocus: () => {
            editingRef.current = true;
            setNicknameEditing(true);
          },
          onBlur: (event: FocusEvent<HTMLElement>) => {
            if (isFocusMovingWithinHoverCardEdits(event)) return;
            commitNickname();
          },
        }
      : null,
    notesField: onNotesChange
      ? {
          value: notesDraft,
          onChange: setNotesDraft,
          onFocus: () => {
            editingRef.current = true;
            setNotesEditing(true);
          },
          onBlur: (event: FocusEvent<HTMLElement>) => {
            if (isFocusMovingWithinHoverCardEdits(event)) return;
            commitNotes();
          },
        }
      : null,
  };
}

function EncoreHoverCardResourceEditFields(props: {
  edits: ReturnType<typeof useDeferredHoverCardEdits>;
  notesPlaceholder?: string;
}): ReactElement | null {
  const { edits, notesPlaceholder = 'e.g. which take to use' } = props;
  const { nicknameField, notesField } = edits;
  if (!nicknameField && !notesField) return null;

  return (
    <Box
      data-encore-hover-card-edits
      sx={{ mt: 1.25, pt: 1, borderTop: 1, borderColor: 'divider' }}
      onPointerDown={(e) => {
        e.stopPropagation();
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {nicknameField ? (
        <TextField
          label="Nickname"
          size="small"
          fullWidth
          value={nicknameField.value}
          onChange={(e) => nicknameField.onChange(e.target.value)}
          onFocus={nicknameField.onFocus}
          onBlur={nicknameField.onBlur}
          placeholder="Optional label in your list"
          sx={{ mb: notesField ? 1 : 0 }}
        />
      ) : null}
      {notesField ? (
        <TextField
          label="Notes"
          size="small"
          fullWidth
          multiline
          minRows={2}
          maxRows={6}
          value={notesField.value}
          onChange={(e) => notesField.onChange(e.target.value)}
          onFocus={notesField.onFocus}
          onBlur={notesField.onBlur}
          placeholder={notesPlaceholder}
        />
      ) : null}
    </Box>
  );
}

function useHoverCardCloseHandler(
  editingRef: MutableRefObject<boolean>,
  commitAll: () => void,
  setOpen: (open: boolean) => void,
) {
  return useCallback(
    () => {
      if (editingRef.current) return;
      commitAll();
      setOpen(false);
    },
    [commitAll, editingRef, setOpen],
  );
}

function hoverCardPopperSlotProps(popperPinned: boolean) {
  return {
    popper: {
      modifiers: popperPinned ? HOVER_CARD_PINNED_POPPER_MODIFIERS : [HOVER_CARD_OFFSET_MODIFIER],
      sx: {
        zIndex: (z: { zIndex: { modal: number } }) => z.zIndex.modal + 25,
      },
    },
  };
}

export type EncoreStreamingHoverCardProps = {
  kind: EncoreStreamingHoverCardKind;
  spotifyTrackId?: string | null;
  youtubeWatchUrl?: string | null;
  /** When set (e.g. song title/artist), shown until remote metadata resolves. */
  fallbackTitle?: string;
  fallbackSubtitle?: string;
  clientId: string;
  spotifyLinked: boolean;
  children: ReactNode;
  /** Optional inline nickname (stored on {@link EncoreMediaLink.label}). */
  editNickname?: string;
  onEditNicknameChange?: (value: string) => void;
  resourceNotes?: string;
  onResourceNotesChange?: (value: string) => void;
  onPlay?: () => void;
  isPlaying?: boolean;
  playDisabled?: boolean;
  playDisabledReason?: string;
};

/**
 * Wraps a Spotify or YouTube media control; on hover, opens a small card with
 * resolved track/video title and artist/channel when available.
 *
 * Uses MUI Tooltip under the hood. Tooltip handles the mouse-tracking edge cases (interactive
 * trigger→content bridge, focus retention, leave debounce) that a hand-rolled Popover would have
 * to reimplement. We keep the resolved `meta` in component state across open/close cycles so a
 * re-hover after the user briefly leaves does not flash a fallback frame before the cached value
 * paints back in.
 */
export function EncoreStreamingHoverCard(props: EncoreStreamingHoverCardProps): ReactElement {
  const {
    kind,
    spotifyTrackId,
    youtubeWatchUrl,
    fallbackTitle = '',
    fallbackSubtitle = '',
    clientId,
    spotifyLinked,
    children,
    editNickname,
    onEditNicknameChange,
    resourceNotes,
    onResourceNotesChange,
    onPlay,
    isPlaying = false,
    playDisabled = false,
    playDisabledReason,
  } = props;

  // Seed meta from the module cache synchronously so the very first open paints with the cached
  // value (no fallback flash). Subsequent re-hovers also avoid the brief loading frame.
  const cacheKey =
    kind === 'spotify'
      ? (spotifyTrackId?.trim() ?? '')
      : kind === 'youtube'
        ? (youtubeWatchUrl?.trim() ?? '')
        : '';
  const cachedAtMount: ResolvedMeta | null = cacheKey
    ? (kind === 'spotify'
        ? spotifyMetaCache.get(cacheKey)
        : getYoutubeOembedCached(cacheKey)) ?? null
    : null;
  const [meta, setMeta] = useState<ResolvedMeta | null>(cachedAtMount);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const resourceEdits = useDeferredHoverCardEdits({
    nickname: editNickname,
    onNicknameChange: onEditNicknameChange,
    notes: resourceNotes,
    onNotesChange: onResourceNotesChange,
  });

  const handleClose = useHoverCardCloseHandler(resourceEdits.editingRef, resourceEdits.commitAll, setOpen);

  useEffect(() => {
    if (!open) return;
    const track = spotifyTrackId?.trim() ?? '';
    const ytUrl = youtubeWatchUrl?.trim() ?? '';
    let cancelled = false;

    if (kind === 'youtube' && ytUrl) {
      const cached = getYoutubeOembedCached(ytUrl);
      if (cached) {
        setMeta(cached);
        return;
      }
      setLoading(true);
      void (async () => {
        const m = await fetchYoutubeOembedMeta(ytUrl);
        if (cancelled) return;
        setMeta(m);
        setLoading(false);
      })();
      return () => {
        cancelled = true;
      };
    }

    if (kind === 'spotify' && track) {
      const cached = spotifyMetaCache.get(track);
      if (cached) {
        setMeta(cached);
        return;
      }
      setLoading(true);
      void (async () => {
        const m = await fetchSpotifyTrackMeta(clientId, spotifyLinked, track);
        if (cancelled) return;
        setMeta(m);
        setLoading(false);
      })();
      return () => {
        cancelled = true;
      };
    }

    return undefined;
  }, [open, kind, spotifyTrackId, youtubeWatchUrl, clientId, spotifyLinked]);

  const title =
    meta?.title?.trim() ||
    fallbackTitle.trim() ||
    (kind === 'spotify'
      ? 'Spotify track'
      : kind === 'youtube' && youtubeWatchUrl?.trim()
        ? fallbackYoutubeHeadingFromWatchUrl(youtubeWatchUrl.trim())
        : 'YouTube');
  const subtitle = meta?.subtitle?.trim() || fallbackSubtitle.trim();

  const tooltipContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0, minWidth: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        {loading && !meta ? <CircularProgress size={16} sx={{ mt: 0.25, flexShrink: 0 }} /> : null}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.35, wordBreak: 'break-word' }}>
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.35, lineHeight: 1.4 }}>
              {subtitle}
            </Typography>
          ) : null}
          {!subtitle && !loading && kind === 'spotify' && !spotifyLinked ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.35, lineHeight: 1.4 }}>
              Connect Spotify to load track details.
            </Typography>
          ) : null}
        </Box>
      </Box>
      {onPlay ? (
        <Box sx={{ mt: 1, display: 'flex', gap: 0.5, alignItems: 'center' }}>
          <Button
            size="small"
            variant={isPlaying ? 'contained' : 'outlined'}
            startIcon={<PlayArrowIcon fontSize="small" />}
            disabled={playDisabled}
            title={playDisabled ? playDisabledReason : undefined}
            onClick={() => onPlay()}
          >
            {isPlaying ? 'Playing' : 'Play'}
          </Button>
        </Box>
      ) : null}
      {onEditNicknameChange || onResourceNotesChange ? (
        <EncoreHoverCardResourceEditFields edits={resourceEdits} />
      ) : null}
    </Box>
  );

  return (
    <HoverCardTooltip
      title={tooltipContent}
      placement="bottom-start"
      arrow={false}
      enterDelay={280}
      enterNextDelay={120}
      leaveDelay={resourceEdits.popperPinned ? 900 : 220}
      open={open}
      onOpen={() => setOpen(true)}
      onClose={handleClose}
      disableFocusListener
      // Tooltip's default `disableInteractive` is false, so the mouse can move from trigger into
      // the tooltip without closing it. Keeping it interactive is what makes this read as a hover
      // *card* rather than a pure tooltip.
      disableInteractive={false}
      slotProps={hoverCardPopperSlotProps(resourceEdits.popperPinned)}
    >
      {/* Tooltip needs a single ref-forwarding child. Wrapping span keeps the trigger
          inline-aligned with the surrounding caption row. */}
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          width: 'fit-content',
          maxWidth: '100%',
          verticalAlign: 'middle',
          borderRadius: 1,
        }}
      >
        {children}
      </Box>
    </HoverCardTooltip>
  );
}

export type EncoreStaticResourceHoverCardProps = {
  /** Primary heading (e.g. chart attachment title). */
  title: string;
  subtitle?: string;
  children: ReactNode;
  editNickname?: string;
  onEditNicknameChange?: (value: string) => void;
  resourceNotes?: string;
  onResourceNotesChange?: (value: string) => void;
  /** When set, shows a Play control in the hover card (e.g. audio takes). */
  onPlay?: () => void;
  isPlaying?: boolean;
  playDisabled?: boolean;
  playDisabledReason?: string;
  /** When set, shows a low-key download control for attached files. */
  onDownload?: () => void | Promise<void>;
  downloadDisabled?: boolean;
  downloadDisabledReason?: string;
};

/**
 * Same hover-card chrome as {@link EncoreStreamingHoverCard} for Drive attachments (no remote metadata fetch).
 */
export function EncoreStaticResourceHoverCard(props: EncoreStaticResourceHoverCardProps): ReactElement {
  const {
    title,
    subtitle,
    children,
    editNickname,
    onEditNicknameChange,
    resourceNotes,
    onResourceNotesChange,
    onPlay,
    isPlaying = false,
    playDisabled = false,
    playDisabledReason,
    onDownload,
    downloadDisabled = false,
    downloadDisabledReason,
  } = props;
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const heading = title.trim() || 'Attachment';
  const resourceEdits = useDeferredHoverCardEdits({
    nickname: editNickname,
    onNicknameChange: onEditNicknameChange,
    notes: resourceNotes,
    onNotesChange: onResourceNotesChange,
  });

  const handleClose = useHoverCardCloseHandler(resourceEdits.editingRef, resourceEdits.commitAll, setOpen);

  const handleDownload = async () => {
    if (!onDownload || downloading || downloadDisabled) return;
    setDownloading(true);
    try {
      await onDownload();
    } finally {
      setDownloading(false);
    }
  };

  const tooltipContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0, minWidth: 0 }}>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.35, wordBreak: 'break-word' }}>
          {heading}
        </Typography>
        {subtitle?.trim() ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.35, lineHeight: 1.4 }}>
            {subtitle.trim()}
          </Typography>
        ) : null}
      </Box>
      {onPlay || onDownload ? (
        <Box sx={{ mt: 1, display: 'flex', gap: 0.5, alignItems: 'center' }}>
          {onPlay ? (
            <Button
              size="small"
              variant={isPlaying ? 'contained' : 'outlined'}
              startIcon={<PlayArrowIcon fontSize="small" />}
              disabled={playDisabled}
              title={playDisabled ? playDisabledReason : undefined}
              onClick={() => onPlay()}
            >
              {isPlaying ? 'Playing' : 'Play'}
            </Button>
          ) : null}
          {onDownload ? (
            <Tooltip title={downloadDisabled ? downloadDisabledReason : 'Download file'}>
              <span>
                <IconButton
                  size="small"
                  aria-label="Download file"
                  disabled={downloadDisabled || downloading}
                  onClick={() => void handleDownload()}
                  sx={{
                    color: 'text.secondary',
                    '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
                  }}
                >
                  {downloading ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <FileDownloadOutlinedIcon fontSize="small" />
                  )}
                </IconButton>
              </span>
            </Tooltip>
          ) : null}
        </Box>
      ) : null}
      {onEditNicknameChange || onResourceNotesChange ? (
        <EncoreHoverCardResourceEditFields
          edits={resourceEdits}
          notesPlaceholder="e.g. transposed copy"
        />
      ) : null}
    </Box>
  );

  return (
    <HoverCardTooltip
      title={tooltipContent}
      placement="bottom-start"
      arrow={false}
      enterDelay={280}
      enterNextDelay={120}
      leaveDelay={resourceEdits.popperPinned ? 900 : 220}
      open={open}
      onOpen={() => setOpen(true)}
      onClose={handleClose}
      disableFocusListener
      disableInteractive={false}
      slotProps={hoverCardPopperSlotProps(resourceEdits.popperPinned)}
    >
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          width: 'fit-content',
          maxWidth: '100%',
          verticalAlign: 'middle',
          borderRadius: 1,
        }}
      >
        {children}
      </Box>
    </HoverCardTooltip>
  );
}

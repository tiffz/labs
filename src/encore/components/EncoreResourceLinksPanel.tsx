import AddIcon from '@mui/icons-material/Add';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import LinkIcon from '@mui/icons-material/Link';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import {
  useCallback,
  useRef,
  useState,
  type DragEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { resourceLinkOpenUrl } from '../repertoire/encoreResourceLinks';
import { encoreMediaHubAddButtonSx, encoreRadius, practiceResourceChipFieldSx } from '../theme/encoreUiTokens';
import type { EncoreMiscResource } from '../types';
import { useEncoreAuth } from '../context/EncoreAuthContext';
import {
  encoreResourceDownloadDisabled,
  encoreResourceDownloadTargetFromMisc,
  triggerEncoreResourceDownload,
} from '../drive/encoreResourceDownload';
import { EncoreStaticResourceHoverCard } from './EncoreStreamingHoverCard';
import { EncoreMediaLinkRow } from '../ui/EncoreMediaLinkRow';
import { useEncoreMediaPlaybackHoverProps } from '../hooks/useEncoreMediaPlaybackHoverProps';

const DEFAULT_FILE_ACCEPT =
  'audio/*,video/*,image/*,.pdf,.txt,.md,.doc,.docx,application/pdf,text/*,.mp3,.m4a,.wav,.webm,.aac,.flac,.ogg';

function filesFromDataTransfer(dt: DataTransfer): File[] {
  if (dt.files?.length) return Array.from(dt.files);
  const out: File[] = [];
  if (dt.items) {
    for (let i = 0; i < dt.items.length; i++) {
      const item = dt.items[i];
      if (item?.kind === 'file') {
        const f = item.getAsFile();
        if (f) out.push(f);
      }
    }
  }
  return out;
}

export type EncoreResourceLinksPanelLayout = 'media-hub-card' | 'practice-list' | 'sidebar' | 'stack';

export type EncoreResourceLinksPanelProps = {
  resources: EncoreMiscResource[];
  onChange: (resources: EncoreMiscResource[]) => void;
  onAddLink: (url: string, label: string) => void;
  onUploadFiles: (files: File[]) => void | Promise<void>;
  /**
   * `media-hub-card` — Listen / Play / Misc hub cells (row shells, + Add menu; drop handled by hub card).
   * `sidebar` — Originals brainstorm references column (title, panel drop target).
   * `stack` — Generic vertical list.
   */
  layout?: EncoreResourceLinksPanelLayout;
  /** Section heading (sidebar / stack only). */
  title?: string;
  emptyHint?: string;
  addButtonLabel?: string;
  fileAccept?: string;
  driveUploading?: boolean;
  canUploadToDrive?: boolean;
  className?: string;
  /** Fills parent flex column (sidebar layout). */
  fillHeight?: boolean;
  /** View-only: list resources without add, upload, or drop. */
  readOnly?: boolean;
  /** Renders before resource chips (practice-list / hub layouts). */
  prepend?: ReactNode;
  /** Wrap each practice-list chip (e.g. drag-and-drop). */
  wrapResourceChip?: (resource: EncoreMiscResource, chip: ReactElement) => ReactElement;
};

export function EncoreResourceLinksPanel({
  resources,
  onChange,
  onAddLink,
  onUploadFiles,
  layout = 'stack',
  title,
  emptyHint = 'None yet.',
  addButtonLabel = 'Add reference',
  fileAccept = DEFAULT_FILE_ACCEPT,
  driveUploading = false,
  canUploadToDrive = true,
  className,
  fillHeight = false,
  readOnly = false,
  prepend,
  wrapResourceChip,
}: EncoreResourceLinksPanelProps): ReactElement {
  const theme = useTheme();
  const { googleAccessToken } = useEncoreAuth();
  const { propsForMiscResource } = useEncoreMediaPlaybackHoverProps();
  const isHubCard = layout === 'media-hub-card';
  const isPracticeList = layout === 'practice-list';
  const isSidebar = layout === 'sidebar';
  const panelDropEnabled = !readOnly && isSidebar;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);

  const [addMenuAnchor, setAddMenuAnchor] = useState<HTMLElement | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkLabel, setLinkLabel] = useState('');
  const [fileDragActive, setFileDragActive] = useState(false);
  const [fileDragHover, setFileDragHover] = useState(false);

  const submitLink = () => {
    const url = linkUrl.trim();
    if (!url) return;
    onAddLink(url, linkLabel.trim());
    setLinkUrl('');
    setLinkLabel('');
    setLinkOpen(false);
  };

  const endFileDrag = useCallback(() => {
    dragDepthRef.current = 0;
    setFileDragActive(false);
    setFileDragHover(false);
  }, []);

  const onPanelDragEnter = (e: DragEvent<HTMLElement>) => {
    if (!panelDropEnabled) return;
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current += 1;
    setFileDragActive(true);
  };

  const onPanelDragLeave = (e: DragEvent<HTMLElement>) => {
    if (!panelDropEnabled) return;
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setFileDragActive(false);
      setFileDragHover(false);
    }
  };

  const onPanelDragOver = (e: DragEvent<HTMLElement>) => {
    if (!panelDropEnabled) return;
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = driveUploading ? 'none' : 'copy';
    setFileDragHover(true);
  };

  const onPanelDrop = (e: DragEvent<HTMLElement>) => {
    if (!panelDropEnabled) return;
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    endFileDrag();
    if (driveUploading) return;
    const files = filesFromDataTransfer(e.dataTransfer);
    if (files.length > 0) void onUploadFiles(files);
  };

  const dropZoneSx =
    panelDropEnabled && fileDragActive
      ? {
          outline: `2px dashed ${alpha(theme.palette.primary.main, fileDragHover ? 0.55 : 0.22)}`,
          outlineOffset: 3,
          borderRadius: encoreRadius,
          bgcolor: alpha(theme.palette.primary.main, fileDragHover ? 0.04 : 0.015),
          transition: theme.transitions.create(['outline-color', 'background-color'], {
            duration: theme.transitions.duration.shorter,
          }),
        }
      : undefined;

  const renderResourceRow = (resource: EncoreMiscResource): ReactElement => {
    const openUrl = resourceLinkOpenUrl(resource);
    const onRemove = readOnly
      ? undefined
      : () => onChange(resources.filter((r) => r.id !== resource.id));

    const patchResource = (patch: Partial<EncoreMiscResource>) => {
      onChange(resources.map((r) => (r.id === resource.id ? { ...r, ...patch } : r)));
    };

    const downloadTarget = encoreResourceDownloadTargetFromMisc(resource);
    const downloadGate = encoreResourceDownloadDisabled(resource, googleAccessToken);

    const playback = propsForMiscResource(resource);

    const hoverCardProps = {
      title: resource.label,
      subtitle: resource.kind,
      editNickname: resource.label,
      onEditNicknameChange: readOnly
        ? undefined
        : (value: string) => patchResource({ label: value.trim() || resource.label }),
      resourceNotes: resource.notes ?? '',
      onResourceNotesChange: readOnly
        ? undefined
        : (value: string) => patchResource({ notes: value.trim() || undefined }),
      ...(downloadTarget
        ? {
            onDownload: () => triggerEncoreResourceDownload(downloadTarget, googleAccessToken),
            downloadDisabled: downloadGate.disabled,
            downloadDisabledReason: downloadGate.reason,
          }
        : {}),
    };

    if (isHubCard || isPracticeList) {
      const row = (
        <EncoreMediaLinkRow
          key={resource.id}
          slot="reference"
          isPrimary={false}
          caption={resource.label}
          openUrl={openUrl}
          openAriaLabel={`Open ${resource.label}`}
          onRemove={onRemove}
          hoverStripWrapper={(strip) => (
            <EncoreStaticResourceHoverCard {...hoverCardProps}>{strip}</EncoreStaticResourceHoverCard>
          )}
          {...playback}
        />
      );
      return wrapResourceChip ? wrapResourceChip(resource, row) : row;
    }

    const row = (
      <EncoreMediaLinkRow
        slot="reference"
        isPrimary={false}
        caption={resource.label}
        openUrl={openUrl}
        openAriaLabel={`Open ${resource.label}`}
        onRemove={onRemove}
        {...playback}
      />
    );

    return (
      <EncoreStaticResourceHoverCard key={resource.id} {...hoverCardProps}>
        {row}
      </EncoreStaticResourceHoverCard>
    );
  };

  const emptyLine =
    resources.length === 0 ? (
      <Typography variant="caption" color="text.secondary" sx={isHubCard ? undefined : { lineHeight: 1.5, px: 0.25 }}>
        {emptyHint}
      </Typography>
    ) : null;

  const addButton = !readOnly ? (
    <Button
      size="small"
      variant="outlined"
      color="inherit"
      disabled={driveUploading}
      startIcon={<AddIcon sx={{ fontSize: 14 }} />}
      onClick={(e) => setAddMenuAnchor(e.currentTarget)}
      sx={(t) => encoreMediaHubAddButtonSx(t)}
      aria-haspopup="menu"
      aria-expanded={Boolean(addMenuAnchor)}
    >
      {addButtonLabel}
    </Button>
  ) : null;

  const addMenuAndDialog = !readOnly ? (
    <>
      <Menu
        open={Boolean(addMenuAnchor)}
        anchorEl={addMenuAnchor}
        onClose={() => setAddMenuAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <MenuItem
          onClick={() => {
            setAddMenuAnchor(null);
            setLinkOpen(true);
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            <LinkIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Add link" secondary="Paste a URL" />
        </MenuItem>
        <MenuItem
          disabled={driveUploading}
          onClick={() => {
            setAddMenuAnchor(null);
            fileInputRef.current?.click();
          }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            <CloudUploadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Upload file"
            secondary={
              canUploadToDrive
                ? 'PDF, audio, text, and more'
                : 'Sign in to Google to save uploads to Drive'
            }
          />
        </MenuItem>
      </Menu>

      <input
        ref={fileInputRef}
        type="file"
        hidden
        multiple
        accept={fileAccept}
        onChange={(ev) => {
          const files = ev.target.files ? Array.from(ev.target.files) : [];
          ev.target.value = '';
          if (files.length > 0) void onUploadFiles(files);
        }}
      />

      <Dialog open={linkOpen} onClose={() => setLinkOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add link</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 0.5 }}>
            <TextField label="URL" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} fullWidth />
            <TextField
              label="Label (optional)"
              value={linkLabel}
              onChange={(e) => setLinkLabel(e.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLinkOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitLink} disabled={!linkUrl.trim()}>
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </>
  ) : null;

  if (isPracticeList || isHubCard) {
    return (
      <>
        <Stack
          direction="row"
          flexWrap="wrap"
          alignItems="center"
          useFlexGap
          sx={(t) => practiceResourceChipFieldSx(t)}
          className={['encore-resource-links-panel', isPracticeList ? 'encore-resource-links-panel--practice-chips' : 'encore-resource-links-panel--hub', className]
            .filter(Boolean)
            .join(' ')}
        >
          {prepend}
          {resources.map(renderResourceRow)}
          {addButton}
        </Stack>
        {addMenuAndDialog}
      </>
    );
  }

  return (
    <Stack
      spacing={isSidebar ? 1 : 1.25}
      className={['encore-resource-links-panel', className].filter(Boolean).join(' ')}
      sx={{
        ...(fillHeight ? { flex: 1, minHeight: 0, height: 1 } : undefined),
        ...dropZoneSx,
      }}
      onDragEnter={onPanelDragEnter}
      onDragLeave={onPanelDragLeave}
      onDragOver={onPanelDragOver}
      onDrop={onPanelDrop}
    >
      {title ? (
        <Typography
          variant={isSidebar ? 'caption' : 'subtitle2'}
          color="text.secondary"
          sx={{
            flexShrink: 0,
            fontWeight: 700,
            letterSpacing: isSidebar ? '0.06em' : '0.02em',
            textTransform: isSidebar ? 'uppercase' : 'none',
            pr: 0.25,
          }}
        >
          {title}
        </Typography>
      ) : null}

      <Box
        sx={{
          flex: fillHeight ? 1 : undefined,
          minHeight: fillHeight ? 0 : undefined,
          overflowY: fillHeight ? 'auto' : undefined,
          pr: fillHeight ? 0.25 : undefined,
        }}
      >
        <Stack spacing={0.75}>
          {emptyLine}
          {resources.map(renderResourceRow)}
          {addButton}
        </Stack>
      </Box>

      {addMenuAndDialog}
    </Stack>
  );
}

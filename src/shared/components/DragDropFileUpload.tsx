import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme, type SxProps, type Theme } from '@mui/material/styles';
import { useCallback, useId, useRef, useState } from 'react';

/**
 * Shared drag-and-drop file uploader.
 *
 * - Click anywhere on the zone (or focus + Enter / Space) opens the OS picker.
 * - Drag-over highlights the zone; drop calls `onFiles` with the dropped files
 *   filtered against `accept` (mime + extension).
 * - Keyboard accessible; renders a hidden `<input type="file">` so the click /
 *   keyboard fallbacks both work.
 *
 * Reused across Encore's bulk-score and bulk-performance-video imports;
 * extracted here so other apps can adopt the same UX in one line.
 *
 * Surfaces use the theme primary/secondary palette so Encore’s fuchsia/violet
 * tokens read as one calm drop target (not a generic grey slab).
 */
export interface DragDropFileUploadProps {
  onFiles: (files: File[]) => void;
  /** OS picker filter — same string as `<input accept>` (e.g. `"application/pdf,.pdf"`). */
  accept?: string;
  /** Allow multiple file selection. Defaults to true. */
  multiple?: boolean;
  /** Disable interaction (e.g. while a previous upload is processing). */
  disabled?: boolean;
  /** Primary label rendered inside the zone. */
  label: string;
  /** Secondary helper text under the primary label. */
  helperText?: string;
  /** Force a specific minimum height. Defaults to 160. */
  minHeight?: number;
  /** Optional aria-label override for the pick button (defaults to `label`). */
  ariaLabel?: string;
  /** Merged after built-in `sx` (per-app tweaks). */
  sx?: SxProps<Theme>;
}

function fileMatchesAccept(file: File, accept: string | undefined): boolean {
  if (!accept) return true;
  const tokens = accept
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  if (tokens.length === 0) return true;
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  for (const t of tokens) {
    if (t.startsWith('.')) {
      if (fileName.endsWith(t)) return true;
      continue;
    }
    if (t.endsWith('/*')) {
      if (fileType.startsWith(t.slice(0, -1))) return true;
      continue;
    }
    if (t === fileType) return true;
  }
  return false;
}

export function DragDropFileUpload(props: DragDropFileUploadProps): React.ReactElement {
  const {
    onFiles,
    accept,
    multiple = true,
    disabled,
    label,
    helperText,
    minHeight = 160,
    ariaLabel,
    sx: sxProp,
  } = props;
  const theme = useTheme();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dragCounterRef = useRef(0);
  const inputId = useId();
  const [dragActive, setDragActive] = useState(false);

  const openPicker = useCallback(() => {
    if (disabled) return;
    inputRef.current?.click();
  }, [disabled]);

  const handleSelected = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const accepted: File[] = [];
      for (const f of Array.from(files)) {
        if (fileMatchesAccept(f, accept)) accepted.push(f);
      }
      if (accepted.length > 0) onFiles(accepted);
    },
    [accept, onFiles],
  );

  const handleDragEnter = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (disabled) return;
      e.preventDefault();
      dragCounterRef.current += 1;
      setDragActive(true);
    },
    [disabled],
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (disabled) return;
      e.preventDefault();
      dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
      if (dragCounterRef.current === 0) setDragActive(false);
    },
    [disabled],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (disabled) return;
      e.preventDefault();
    },
    [disabled],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (disabled) return;
      e.preventDefault();
      dragCounterRef.current = 0;
      setDragActive(false);
      handleSelected(e.dataTransfer.files);
    },
    [disabled, handleSelected],
  );

  const r = Number(theme.shape.borderRadius);
  const radius = Number.isFinite(r) && r > 0 ? r : 12;
  const primary = theme.palette.primary.main;
  const secondary = theme.palette.secondary.main;

  const baseSx: SxProps<Theme> = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight,
    px: { xs: 2.5, sm: 3.5 },
    py: { xs: 2.5, sm: 3 },
    borderRadius: `${radius}px`,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.55 : 1,
    textAlign: 'center',
    transition: theme.transitions.create(['background-color', 'border-color', 'box-shadow'], {
      duration: 180,
    }),
    outline: 'none',
    background: dragActive
      ? `linear-gradient(165deg, ${alpha(primary, 0.1)} 0%, ${alpha(secondary, 0.08)} 100%)`
      : `linear-gradient(165deg, ${alpha(primary, 0.045)} 0%, ${alpha(secondary, 0.035)} 45%, ${alpha(theme.palette.background.paper, 0.92)} 100%)`,
    border: '1px dashed',
    borderColor: dragActive ? alpha(primary, 0.45) : alpha(primary, 0.22),
    boxShadow: dragActive
      ? `0 0 0 1px ${alpha(primary, 0.12)}, 0 6px 20px ${alpha(primary, 0.08)}`
      : `0 1px 3px ${alpha(primary, 0.06)}`,
    '&:hover': {
      background: disabled
        ? undefined
        : `linear-gradient(165deg, ${alpha(primary, 0.07)} 0%, ${alpha(secondary, 0.055)} 50%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
      borderColor: disabled ? undefined : alpha(primary, 0.32),
      boxShadow: disabled ? undefined : `0 4px 16px ${alpha(primary, 0.07)}`,
    },
    '&:focus-visible': {
      boxShadow: `0 0 0 3px ${alpha(primary, 0.22)}, 0 4px 16px ${alpha(primary, 0.08)}`,
      borderColor: alpha(primary, 0.5),
    },
  };

  return (
    <Box
      onClick={openPicker}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
          e.preventDefault();
          openPicker();
        }
      }}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={ariaLabel ?? label}
      aria-disabled={disabled || undefined}
      sx={[
        baseSx,
        ...(sxProp ? (Array.isArray(sxProp) ? sxProp : [sxProp]) : []),
      ]}
    >
      <Stack alignItems="center" gap={1.25} sx={{ maxWidth: 360 }}>
        <CloudUploadOutlinedIcon
          sx={{
            fontSize: 34,
            color: dragActive ? 'primary.main' : alpha(theme.palette.primary.main, 0.62),
          }}
        />
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            letterSpacing: '-0.012em',
            lineHeight: 1.4,
            color: dragActive ? 'primary.main' : 'text.primary',
          }}
        >
          {dragActive ? 'Drop to upload' : label}
        </Typography>
        {helperText ? (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ lineHeight: 1.6, letterSpacing: '-0.008em', px: 0.5 }}
          >
            {helperText}
          </Typography>
        ) : null}
      </Stack>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(e) => {
          handleSelected(e.target.files);
          /* Allow re-selecting the same file later by resetting the input. */
          e.target.value = '';
        }}
        style={{ display: 'none' }}
      />
    </Box>
  );
}

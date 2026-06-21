import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme, type SxProps, type Theme } from '@mui/material/styles';
import { useCallback, useId, useRef } from 'react';
import { fileMatchesAccept } from '../utils/fileMatchesAccept';
import { useDragDropHighlight } from '../hooks/useDragDropHighlight';

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
  /** Force a specific minimum height. Defaults to 160, or 56 when {@link compact} is true. */
  minHeight?: number;
  /** Dense row-style target (smaller icon and padding). */
  compact?: boolean;
  /** Grows taller while the user is dragging files over the zone. */
  expandOnDrag?: boolean;
  /** Horizontal icon + label, left-aligned — for split upload / link strips. */
  inline?: boolean;
  /** `brand`: Encore primary gradient (bulk import). `soft`: fuchsia-forward inline strip (performance editor). `neutral`: grey inset (legacy). */
  tone?: 'brand' | 'soft' | 'neutral';
  /** Optional aria-label override for the pick button (defaults to `label`). */
  ariaLabel?: string;
  /** Merged after built-in `sx` (per-app tweaks). */
  sx?: SxProps<Theme>;
}

export function DragDropFileUpload(props: DragDropFileUploadProps): React.ReactElement {
  const {
    onFiles,
    accept,
    multiple = true,
    disabled,
    label,
    helperText,
    minHeight: minHeightProp,
    compact = false,
    expandOnDrag = false,
    inline = false,
    tone = 'brand',
    ariaLabel,
    sx: sxProp,
  } = props;
  const theme = useTheme();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const inputId = useId();

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

  const { dragActive, handlers } = useDragDropHighlight({
    disabled,
    stopPropagation: true,
    onDrop: (e) => handleSelected(e.dataTransfer.files),
  });

  const defaultMinHeight = inline ? 44 : compact ? 56 : 160;
  const resolvedMinHeight = minHeightProp ?? defaultMinHeight;
  const minHeight =
    expandOnDrag && dragActive ? Math.max(resolvedMinHeight, inline ? 96 : 112) : resolvedMinHeight;

  const openPicker = useCallback(() => {
    if (disabled) return;
    inputRef.current?.click();
  }, [disabled]);

  const r = Number(theme.shape.borderRadius);
  const radius = Number.isFinite(r) && r > 0 ? r : 12;
  const primary = theme.palette.primary.main;
  const secondary = theme.palette.secondary.main;
  const isNeutral = tone === 'neutral';
  const isSoft = tone === 'soft';

  const neutralBg = dragActive
    ? alpha(theme.palette.action.selected, 0.12)
    : theme.palette.action.hover;
  const neutralBorder = dragActive
    ? alpha(theme.palette.text.primary, 0.22)
    : alpha(theme.palette.divider, 0.95);

  const softBg = dragActive
    ? `linear-gradient(165deg, ${alpha(primary, 0.09)} 0%, ${alpha(primary, 0.05)} 55%, ${alpha(theme.palette.background.paper, 0.94)} 100%)`
    : `linear-gradient(165deg, ${alpha(primary, 0.04)} 0%, ${alpha(primary, 0.022)} 50%, ${alpha(theme.palette.background.paper, 0.98)} 100%)`;
  const softBorder = dragActive ? alpha(primary, 0.36) : alpha(primary, 0.16);

  const baseSx: SxProps<Theme> = {
    position: 'relative',
    display: 'flex',
    alignItems: inline ? 'stretch' : 'center',
    justifyContent: inline ? 'flex-start' : 'center',
    minHeight,
    px: inline ? 1.25 : compact ? { xs: 1.75, sm: 2.25 } : { xs: 2.5, sm: 3.5 },
    py: inline ? 0.875 : compact ? { xs: 1, sm: 1.125 } : { xs: 2.5, sm: 3 },
    borderRadius: `${radius}px`,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.55 : 1,
    textAlign: 'center',
    transition: theme.transitions.create(['background-color', 'border-color', 'box-shadow'], {
      duration: 180,
    }),
    outline: 'none',
    background: isNeutral
      ? neutralBg
      : isSoft
        ? softBg
        : dragActive
          ? `linear-gradient(165deg, ${alpha(primary, 0.1)} 0%, ${alpha(secondary, 0.08)} 100%)`
          : `linear-gradient(165deg, ${alpha(primary, 0.045)} 0%, ${alpha(secondary, 0.035)} 45%, ${alpha(theme.palette.background.paper, 0.92)} 100%)`,
    border: '1px dashed',
    borderColor: isNeutral
      ? neutralBorder
      : isSoft
        ? softBorder
        : dragActive
          ? alpha(primary, 0.45)
          : alpha(primary, 0.22),
    boxShadow: isNeutral
      ? 'none'
      : isSoft
        ? dragActive
          ? `0 0 0 1px ${alpha(primary, 0.08)}`
          : 'none'
        : dragActive
          ? `0 0 0 1px ${alpha(primary, 0.12)}, 0 6px 20px ${alpha(primary, 0.08)}`
          : `0 1px 3px ${alpha(primary, 0.06)}`,
    '&:hover': isNeutral
      ? {
          background: disabled ? undefined : alpha(theme.palette.action.selected, 0.08),
          borderColor: disabled ? undefined : alpha(theme.palette.text.primary, 0.18),
        }
      : isSoft
        ? {
            background: disabled
              ? undefined
              : `linear-gradient(165deg, ${alpha(primary, 0.055)} 0%, ${alpha(primary, 0.03)} 50%, ${alpha(theme.palette.background.paper, 0.97)} 100%)`,
            borderColor: disabled ? undefined : alpha(primary, 0.24),
          }
        : {
            background: disabled
              ? undefined
              : `linear-gradient(165deg, ${alpha(primary, 0.07)} 0%, ${alpha(secondary, 0.055)} 50%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
            borderColor: disabled ? undefined : alpha(primary, 0.32),
            boxShadow: disabled ? undefined : `0 4px 16px ${alpha(primary, 0.07)}`,
          },
    '&:focus-visible': isNeutral
      ? {
          boxShadow: `0 0 0 2px ${alpha(theme.palette.text.primary, 0.1)}`,
          borderColor: alpha(theme.palette.text.primary, 0.28),
        }
      : isSoft
        ? {
            boxShadow: `0 0 0 2px ${alpha(primary, 0.14)}`,
            borderColor: alpha(primary, 0.38),
          }
        : {
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
      onDragEnter={handlers.onDragEnter}
      onDragOver={handlers.onDragOver}
      onDragLeave={handlers.onDragLeave}
      onDrop={handlers.onDrop}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={ariaLabel ?? label}
      aria-disabled={disabled || undefined}
      sx={[
        baseSx,
        ...(sxProp ? (Array.isArray(sxProp) ? sxProp : [sxProp]) : []),
      ]}
    >
      <Stack
        alignItems={inline ? 'center' : 'center'}
        direction={inline ? 'row' : 'column'}
        gap={inline ? 1 : compact ? 0.5 : 1.25}
        sx={{ maxWidth: inline ? 'none' : compact ? 420 : 360, width: inline ? '100%' : undefined }}
      >
        <CloudUploadOutlinedIcon
          sx={{
            fontSize: inline ? 20 : compact ? 22 : 34,
            color: isNeutral
              ? dragActive
                ? 'text.primary'
                : 'text.secondary'
              : isSoft
                ? dragActive
                  ? 'primary.main'
                  : alpha(primary, 0.52)
                : dragActive
                  ? 'primary.main'
                  : alpha(primary, 0.62),
            flexShrink: 0,
          }}
        />
        <Box sx={{ minWidth: 0, textAlign: inline ? 'left' : 'center' }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              letterSpacing: '-0.012em',
              lineHeight: 1.35,
              color: isNeutral
                ? 'text.primary'
                : isSoft
                  ? dragActive
                    ? 'primary.main'
                    : alpha(primary, 0.82)
                  : dragActive
                    ? 'primary.main'
                    : 'text.primary',
            }}
          >
            {dragActive ? 'Drop to upload' : label}
          </Typography>
          {helperText ? (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ lineHeight: 1.45, letterSpacing: '-0.008em', display: 'block', mt: inline ? 0.125 : 0 }}
            >
              {helperText}
            </Typography>
          ) : null}
        </Box>
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

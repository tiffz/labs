import UndoOutlinedIcon from '@mui/icons-material/UndoOutlined';
import RedoOutlinedIcon from '@mui/icons-material/RedoOutlined';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import AppTooltip from '../components/AppTooltip';
import { useLabsUndo } from './LabsUndoContext';
import { labsRedoShortcutLabel, labsUndoShortcutLabel } from './labsUndoShortcutLabel';

export type LabsUndoControlsProps = {
  /** MUI IconButton size; default `small` for dense headers. */
  size?: 'small' | 'medium';
  className?: string;
};

/**
 * Undo / redo icon buttons wired to {@link LabsUndoProvider}.
 * Hotkeys remain active app-wide; these controls expose the same stack in the UI.
 */
export default function LabsUndoControls({ size = 'small', className }: LabsUndoControlsProps) {
  const { undo, redo, canUndo, canRedo } = useLabsUndo();

  return (
    <Stack
      direction="row"
      spacing={0.25}
      className={className}
      role="group"
      aria-label="Undo and redo"
    >
      <AppTooltip title={`Undo (${labsUndoShortcutLabel()})`}>
        <span>
          <IconButton
            size={size}
            disabled={!canUndo}
            onClick={() => void undo()}
            aria-label="Undo"
          >
            <UndoOutlinedIcon fontSize="small" />
          </IconButton>
        </span>
      </AppTooltip>
      <AppTooltip title={`Redo (${labsRedoShortcutLabel()})`}>
        <span>
          <IconButton
            size={size}
            disabled={!canRedo}
            onClick={() => void redo()}
            aria-label="Redo"
          >
            <RedoOutlinedIcon fontSize="small" />
          </IconButton>
        </span>
      </AppTooltip>
    </Stack>
  );
}

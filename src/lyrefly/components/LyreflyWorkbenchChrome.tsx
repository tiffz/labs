import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import { useState, type ReactElement } from 'react';

import { useLabsDisclosureMenu } from '../../shared/a11y/useLabsDisclosureMenu';

import type { ComicProject } from '../types';
import type { LyreflyStageCompletionContext } from '../workflow/lyreflyWorkflowCompletion';
import type { LyreflyWorkflowStage } from '../workflow/lyreflyWorkflowStages';
import { LyreflyMergeWorkDialog } from './LyreflyMergeWorkDialog';
import { LyreflyProjectModeSwitch } from './LyreflyProjectModeSwitch';
import { LyreflyStageActions } from './LyreflyStageChrome';
import { LyreflyWorkflowStepper } from './LyreflyWorkflowStepper';

export type LyreflyWorkbenchChromeProps = {
  project: ComicProject;
  stage: LyreflyWorkflowStage;
  ctx: LyreflyStageCompletionContext;
  onTitleChange: (title: string) => void;
  onStageChange: (stage: LyreflyWorkflowStage) => void;
  onToggleComplete: () => void;
  onContinue: () => void;
};

/** Shared workbench header — title, workflow stepper, and stage actions on every step. */
export function LyreflyWorkbenchChrome({
  project,
  stage,
  ctx,
  onTitleChange,
  onStageChange,
  onToggleComplete,
  onContinue,
}: LyreflyWorkbenchChromeProps): ReactElement {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [merging, setMerging] = useState(false);
  const { menuId, getTriggerA11yProps } = useLabsDisclosureMenu();
  return (
    <header className="lyrefly-workbench__chrome lyrefly-shell-bar">
      <div className="lyrefly-content-rail lyrefly-workbench__chrome-inner">
        <div className="lyrefly-workbench__nav-bar">
          <Stack
            className="lyrefly-workbench__title-block"
            direction="row"
            spacing={1}
            useFlexGap
            sx={{
              alignItems: "center",
              flexWrap: "wrap",
              minWidth: 0
            }}>
            <TextField
              variant="standard"
              value={project.title}
              onChange={(e) => onTitleChange(e.target.value)}
              sx={{ minWidth: 0, flex: '1 1 8rem', maxWidth: '100%' }}
              slotProps={{
                input: { disableUnderline: true },
                htmlInput: { 'aria-label': 'Comic title', className: 'lyrefly-workbench__title-input' }
              }} />
            <LyreflyProjectModeSwitch projectId={project.id} mode="editor" editorStage={stage} />
            <IconButton
              size="small"
              aria-label="Comic actions"
              {...getTriggerA11yProps(Boolean(menuAnchor))}
              onClick={(e) => setMenuAnchor(e.currentTarget)}
            >
              <MoreHorizIcon fontSize="small" />
            </IconButton>
            <Menu id={menuId} anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
              <MenuItem
                onClick={() => {
                  setMenuAnchor(null);
                  setMerging(true);
                }}
              >
                Merge into another comic…
              </MenuItem>
            </Menu>
            <LyreflyMergeWorkDialog source={project} open={merging} onClose={() => setMerging(false)} />
          </Stack>
          <div className="lyrefly-workbench__nav-stepper">
            <LyreflyWorkflowStepper
              project={project}
              stage={stage}
              onStageChange={onStageChange}
              ctx={ctx}
              compact
            />
          </div>
          <LyreflyStageActions
            project={project}
            stage={stage}
            ctx={ctx}
            onToggleComplete={onToggleComplete}
            onContinue={onContinue}
            emphasis="subtle"
          />
        </div>
      </div>
    </header>
  );
}

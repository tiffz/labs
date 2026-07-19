import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import type { ReactElement } from 'react';

import type { ComicProject } from '../types';
import type { LyreflyStageCompletionContext } from '../workflow/lyreflyWorkflowCompletion';
import type { LyreflyWorkflowStage } from '../workflow/lyreflyWorkflowStages';
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

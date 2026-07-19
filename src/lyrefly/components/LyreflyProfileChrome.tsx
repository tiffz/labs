import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactElement } from 'react';

import type { ComicProject } from '../types';
import { lyreflyProjectStageHref, navigateLyreflyHash } from '../routes/lyreflyHash';
import type { LyreflyWorkflowStage } from '../workflow/lyreflyWorkflowStages';
import { LyreflyProjectModeSwitch } from './LyreflyProjectModeSwitch';

export type LyreflyProfileChromeProps = {
  project: ComicProject;
  editorStage: LyreflyWorkflowStage;
};

export function LyreflyProfileChrome({ project, editorStage }: LyreflyProfileChromeProps): ReactElement {
  return (
    <header className="lyrefly-workbench__chrome lyrefly-shell-bar">
      <div className="lyrefly-content-rail lyrefly-workbench__chrome-inner">
        <div className="lyrefly-workbench__nav-bar lyrefly-workbench__nav-bar--profile">
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
            <Typography component="h1" className="lyrefly-workbench__title-display" title={project.title}>
              {project.title}
            </Typography>
            <LyreflyProjectModeSwitch projectId={project.id} mode="profile" editorStage={editorStage} />
          </Stack>
          <div className="lyrefly-workbench__nav-spacer" aria-hidden />
          <Button
            size="small"
            variant="text"
            className="lyrefly-workbench__actions"
            onClick={() => navigateLyreflyHash(lyreflyProjectStageHref(project.id, editorStage))}
            sx={{ textTransform: 'none', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            Open editor
          </Button>
        </div>
      </div>
    </header>
  );
}

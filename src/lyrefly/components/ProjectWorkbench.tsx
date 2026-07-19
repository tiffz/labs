import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';

import { useLabsUndo } from '../../shared/undo/LabsUndoContext';
import { saveLyreflyProject } from '../db/lyreflyProjectMutations';
import {
  useLyreflyArchive,
  useLyreflyArtVersions,
  useLyreflyPageNodes,
  useLyreflyPageRevisions,
  useLyreflyProject,
  useLyreflyStageContext,
  useLyreflyVisualDevAssets,
} from '../hooks/useLyreflyProjectData';
import { lyreflyGalleryHref, lyreflyProjectStageHref, navigateLyreflyHash } from '../routes/lyreflyHash';
import { withSyncedLyreflyProjectStatus } from '../workflow/lyreflyProjectProgress';
import { toggleWorkflowStageCompletion } from '../workflow/lyreflyWorkflowCompletion';
import {
  persistWorkflowStage,
  readPersistedWorkflowStage,
} from '../workflow/lyreflyWorkflowStagePersistence';
import { nextWorkflowStage, type LyreflyWorkflowStage } from '../workflow/lyreflyWorkflowStages';
import { ArtStage } from './ArtStage';
import { BrainstormStage } from './BrainstormStage';
import { LyreflyWorkbenchChrome } from './LyreflyWorkbenchChrome';
import { PublishStage } from './PublishStage';
import { ScriptStage } from './ScriptStage';
import { ThumbsStage } from './ThumbsStage';

const BRAINSTORM_SAVE_MS = 500;

export type ProjectWorkbenchProps = {
  projectId: string;
  initialStage?: LyreflyWorkflowStage;
  onBack: () => void;
};

export function ProjectWorkbench({ projectId, initialStage, onBack }: ProjectWorkbenchProps): ReactElement {
  const { clear } = useLabsUndo();
  const { project, projectHydrated } = useLyreflyProject(projectId);
  const ctx = useLyreflyStageContext(project);
  const { assets } = useLyreflyVisualDevAssets(projectId);
  const { pageNodes } = useLyreflyPageNodes(projectId);
  const pageNodeIds = useMemo(() => pageNodes.map((n) => n.id), [pageNodes]);
  const { revisions } = useLyreflyPageRevisions(pageNodeIds);
  const { artVersions } = useLyreflyArtVersions(projectId);
  const { archive, archiveHydrated } = useLyreflyArchive(project?.archiveId);

  const [stage, setStage] = useState<LyreflyWorkflowStage>('brainstorm');
  const brainstormTimerRef = useRef<number | null>(null);

  useEffect(() => {
    clear();
  }, [projectId, clear]);

  useEffect(() => {
    if (!project) return;
    const resolved = initialStage ?? readPersistedWorkflowStage(projectId, project, ctx);
    setStage(resolved);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stage boot once per project open
  }, [projectId, project?.id, initialStage]);

  const onStageChange = useCallback(
    (next: LyreflyWorkflowStage) => {
      setStage(next);
      persistWorkflowStage(projectId, next);
      navigateLyreflyHash(lyreflyProjectStageHref(projectId, next));
    },
    [projectId],
  );

  const onPersistProject = useCallback(async (next: NonNullable<typeof project>) => {
    await saveLyreflyProject(next);
  }, []);

  const onBrainstormHtmlChange = useCallback(
    (html: string) => {
      if (!project) return;
      const next = { ...project, brainstormHtml: html };
      if (brainstormTimerRef.current != null) {
        window.clearTimeout(brainstormTimerRef.current);
      }
      brainstormTimerRef.current = window.setTimeout(() => {
        void onPersistProject(next);
        brainstormTimerRef.current = null;
      }, BRAINSTORM_SAVE_MS);
    },
    [onPersistProject, project],
  );

  const onToggleStageComplete = useCallback(() => {
    if (!project) return;
    const next = toggleWorkflowStageCompletion(project, stage, ctx);
    void onPersistProject(withSyncedLyreflyProjectStatus(next, ctx));
  }, [ctx, onPersistProject, project, stage]);

  const onContinue = useCallback(() => {
    const next = nextWorkflowStage(stage);
    if (next) {
      onStageChange(next);
      return;
    }
    navigateLyreflyHash(lyreflyGalleryHref());
    onBack();
  }, [onBack, onStageChange, stage]);

  const orderedPageNodes = useMemo(() => {
    if (!project) return pageNodes;
    const order = new Map(project.layoutOrder.map((id, index) => [id, index]));
    return [...pageNodes].sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999));
  }, [pageNodes, project]);

  if (!projectHydrated || !project) {
    return (
      <Box className="lyrefly-workbench lyrefly-workbench--loading" sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress aria-label="Loading project" />
      </Box>
    );
  }

  let stageContent: ReactElement;
  if (stage === 'brainstorm') {
    stageContent = (
      <BrainstormStage project={project} assets={assets} onBrainstormHtmlChange={onBrainstormHtmlChange} />
    );
  } else if (stage === 'script') {
    stageContent = project.modules.script ? (
      <ScriptStage project={project} />
    ) : (
      <Typography
        variant="body2"
        sx={{
          color: "text.secondary",
          p: 3
        }}>
        Script module is disabled for this project.
      </Typography>
    );
  } else if (stage === 'thumbs') {
    stageContent = (
      <ThumbsStage
        project={project}
        onProjectChange={(next) => void onPersistProject(next)}
      />
    );
  } else if (stage === 'art') {
    stageContent = (
      <ArtStage
        project={project}
        pageNodes={orderedPageNodes}
        revisions={revisions}
        artVersions={artVersions}
        onProjectChange={onPersistProject}
      />
    );
  } else {
    stageContent = (
      <PublishStage
        project={project}
        pageNodes={orderedPageNodes}
        revisions={revisions}
        artVersions={artVersions}
        archive={archive}
        archiveHydrated={archiveHydrated}
      />
    );
  }

  return (
    <div
      className={[
        'lyrefly-workbench',
        `lyrefly-workbench--${stage}`,
      ].join(' ')}
      data-testid="lyrefly-project-workbench"
    >
      <LyreflyWorkbenchChrome
        project={project}
        stage={stage}
        ctx={ctx}
        onTitleChange={(title) => void onPersistProject({ ...project, title })}
        onStageChange={onStageChange}
        onToggleComplete={onToggleStageComplete}
        onContinue={onContinue}
      />

      <div className="lyrefly-workbench__stage">{stageContent}</div>
    </div>
  );
}

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';

import { isRichTextEmpty } from '../../shared/utils/richTextContent';
import { saveLyreflyProject } from '../db/lyreflyProjectMutations';
import {
  useLyreflyArchive,
  useLyreflyPageNodes,
  useLyreflyPageRevisions,
  useLyreflyProject,
  useLyreflyScriptDocument,
  useLyreflyStageContext,
  useLyreflyVisualDevAssets,
} from '../hooks/useLyreflyProjectData';
import { lyreflyGalleryHref, lyreflyProjectStageHref, navigateLyreflyHash } from '../routes/lyreflyHash';
import { toggleWorkflowStageCompletion } from '../workflow/lyreflyWorkflowCompletion';
import {
  persistWorkflowStage,
  readPersistedWorkflowStage,
} from '../workflow/lyreflyWorkflowStagePersistence';
import { LYREFLY_WORKFLOW_STAGES, nextWorkflowStage, type LyreflyWorkflowStage } from '../workflow/lyreflyWorkflowStages';
import { ArtStage } from './ArtStage';
import { BrainstormStage } from './BrainstormStage';
import { LyreflyStageFooter } from './LyreflyStageChrome';
import { LyreflyWorkflowStepper } from './LyreflyWorkflowStepper';
import { PublishStage } from './PublishStage';
import { ScriptStage } from './ScriptStage';

const BRAINSTORM_SAVE_MS = 500;

export type ProjectWorkbenchProps = {
  projectId: string;
  initialStage?: LyreflyWorkflowStage;
  onBack: () => void;
};

export function ProjectWorkbench({ projectId, initialStage, onBack }: ProjectWorkbenchProps): ReactElement {
  const { project, projectHydrated } = useLyreflyProject(projectId);
  const ctx = useLyreflyStageContext(project);
  const { assets } = useLyreflyVisualDevAssets(projectId);
  const { pageNodes } = useLyreflyPageNodes(projectId);
  const pageNodeIds = useMemo(() => pageNodes.map((n) => n.id), [pageNodes]);
  const { revisions } = useLyreflyPageRevisions(pageNodeIds);
  const { archive, archiveHydrated } = useLyreflyArchive(project?.archiveId);
  const { script } = useLyreflyScriptDocument(project?.scriptDocumentId ?? null);

  const [stage, setStage] = useState<LyreflyWorkflowStage>('brainstorm');
  const brainstormTimerRef = useRef<number | null>(null);

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
    void onPersistProject(toggleWorkflowStageCompletion(project, stage, ctx));
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
      <Typography variant="body2" color="text.secondary" sx={{ p: 3 }}>
        Script module is disabled for this project.
      </Typography>
    );
  } else if (stage === 'art') {
    stageContent = <ArtStage project={project} pageNodes={orderedPageNodes} revisions={revisions} />;
  } else {
    stageContent = (
      <PublishStage project={project} archive={archive} archiveHydrated={archiveHydrated} />
    );
  }

  const stageIndex = LYREFLY_WORKFLOW_STAGES.findIndex((s) => s.id === stage);
  const stageMeta = LYREFLY_WORKFLOW_STAGES.find((s) => s.id === stage);

  return (
    <div className="lyrefly-workbench" data-testid="lyrefly-project-workbench">
      <header className="lyrefly-workbench__chrome">
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 1.5, md: 2 }} alignItems={{ md: 'center' }}>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
            <Button variant="text" className="lyrefly-workbench__back" onClick={onBack}>
              Showcase
            </Button>
            <TextField
              variant="standard"
              value={project.title}
              onChange={(e) => void onPersistProject({ ...project, title: e.target.value })}
              inputProps={{ 'aria-label': 'Comic title', className: 'lyrefly-workbench__title-input' }}
              sx={{ flex: 1, minWidth: 0 }}
            />
          </Stack>
          <Typography variant="caption" color="text.secondary" className="lyrefly-workbench__progress">
            Step {stageIndex + 1} of {LYREFLY_WORKFLOW_STAGES.length}
            {stageMeta ? ` · ${stageMeta.label}` : ''}
            {script?.markdown && !isRichTextEmpty(script.markdown) ? ' · Script saved' : ''}
          </Typography>
        </Stack>
        <LyreflyWorkflowStepper project={project} stage={stage} onStageChange={onStageChange} ctx={ctx} />
      </header>

      <div className="lyrefly-workbench__stage">
        {stageContent}
        <LyreflyStageFooter
          project={project}
          stage={stage}
          ctx={ctx}
          onToggleComplete={onToggleStageComplete}
          onContinue={onContinue}
        />
      </div>
    </div>
  );
}

import Box from '@mui/material/Box';
import { useMemo, useRef, useState, type KeyboardEvent, type ReactElement } from 'react';

import type { ComicProject, VisualDevAsset } from '../types';
import { useConceptArtSelection } from '../hooks/useConceptArtSelection';
import { useLyreflyVisualDevUndo } from '../hooks/useLyreflyVisualDevUndo';
import { useConceptShelfFileIntake } from '../utils/conceptShelfFileIntake';
import { partitionConceptShelfAssets } from '../utils/conceptShelfUtils';
import { BrainstormBoard } from './BrainstormBoard';
import { ConceptArtDetailDialog } from './ConceptArtDetailDialog';

export type BrainstormStageProps = {
  project: ComicProject;
  assets: VisualDevAsset[];
  onBrainstormHtmlChange: (html: string) => void;
};

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return target.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

export function BrainstormStage({ project, assets, onBrainstormHtmlChange }: BrainstormStageProps): ReactElement {
  const stageRef = useRef<HTMLDivElement>(null);
  const intake = useConceptShelfFileIntake({
    projectId: project.id,
    scopeRef: stageRef,
  });
  const { commitAssetUpdate, removeAsset } = useLyreflyVisualDevUndo();

  const { gallery } = useMemo(() => partitionConceptShelfAssets(assets), [assets]);
  const { selectedId, selected, setSelectedId, selectPrevious, selectNext } = useConceptArtSelection(gallery);
  const [detailOpen, setDetailOpen] = useState(false);

  const fileDragActive = intake.fileDragActive || intake.fileDragHover;

  const onStageKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (detailOpen) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    if (isEditableTarget(event.target)) return;
    if (gallery.length <= 1) return;
    event.preventDefault();
    if (event.key === 'ArrowLeft') selectPrevious();
    else selectNext();
  };

  return (
    <Box
      ref={stageRef}
      tabIndex={-1}
      className={[
        'lyrefly-brainstorm-stage',
        'lyrefly-stage-body',
        fileDragActive ? 'lyrefly-brainstorm-stage--file-drag' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-testid="lyrefly-brainstorm-stage"
      onDragEnter={intake.onDragEnter}
      onDragLeave={intake.onDragLeave}
      onDragOver={intake.onDragOver}
      onDrop={intake.onDrop}
      onPaste={(e) => intake.onPaste(e.nativeEvent)}
      onKeyDown={onStageKeyDown}
    >
      <BrainstormBoard
        projectId={project.id}
        assets={assets}
        projectBrainstormHtml={project.brainstormHtml ?? ''}
        onBrainstormHtmlChange={onBrainstormHtmlChange}
        intake={intake}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onOpenDetail={() => setDetailOpen(true)}
      />

      <ConceptArtDetailDialog
        asset={selected}
        open={detailOpen && Boolean(selected)}
        onClose={() => setDetailOpen(false)}
        onNotesCommit={(before, after) => void commitAssetUpdate(before, after)}
        onRemove={(item) => {
          void removeAsset(item);
          setDetailOpen(false);
        }}
        showNavigationHint={gallery.length > 1}
        onNavigatePrevious={selectPrevious}
        onNavigateNext={selectNext}
      />
    </Box>
  );
}

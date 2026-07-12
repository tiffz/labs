import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useState, type ReactElement } from 'react';

import { RichTextEditor } from '../../shared/components/RichTextEditor';
import type { VisualDevAsset } from '../types';
import type { ConceptShelfFileIntakeHandlers } from '../utils/conceptShelfFileIntake';
import { BrainstormResourceDialog } from './BrainstormResourceDialog';
import { LyreflyBrainstormResources } from './LyreflyBrainstormResources';
import { LyreflyConceptShelf } from './LyreflyConceptShelf';

export type BrainstormBoardProps = {
  projectId: string;
  assets: VisualDevAsset[];
  projectBrainstormHtml: string;
  onBrainstormHtmlChange: (html: string) => void;
  intake: ConceptShelfFileIntakeHandlers;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onOpenDetail: () => void;
};

export function BrainstormBoard({
  projectId,
  assets,
  projectBrainstormHtml,
  onBrainstormHtmlChange,
  intake,
  selectedId,
  onSelect,
  onOpenDetail,
}: BrainstormBoardProps): ReactElement {
  const [resourceDialogOpen, setResourceDialogOpen] = useState(false);
  const openResourceDialog = (): void => setResourceDialogOpen(true);

  return (
    <Box className="lyrefly-brainstorm-board" data-testid="lyrefly-brainstorm-board">
      <Box className="lyrefly-brainstorm-board__columns">
        <Box className="lyrefly-brainstorm-board__column lyrefly-brainstorm-board__column--workspace">
          <Box
            component="section"
            className="lyrefly-brainstorm-board__section lyrefly-brainstorm-board__section--notes"
          >
            <Typography component="h2" className="lyrefly-brainstorm-board__section-label">
              Project notes
            </Typography>
            <RichTextEditor
              className="lyrefly-brainstorm-dock-editor shared-rich-text-editor--compact"
              value={projectBrainstormHtml}
              onChange={onBrainstormHtmlChange}
              onPasteCapture={intake.tryHandlePaste}
              placeholder="Themes, beats, fragments… whatever helps."
              aria-label="Brainstorm notes"
              sx={{ flex: 1, minHeight: 0, minWidth: 0, border: 0, boxShadow: 'none', bgcolor: 'transparent' }}
            />
          </Box>
        </Box>

        <Box className="lyrefly-brainstorm-board__column lyrefly-brainstorm-board__column--art">
          <Box component="section" className="lyrefly-brainstorm-board__section lyrefly-brainstorm-board__section--art">
            <Typography component="h2" className="lyrefly-brainstorm-board__section-label">
              Concept art
            </Typography>
            <LyreflyConceptShelf
              embedded
              assets={assets}
              intake={intake}
              selectedId={selectedId}
              onSelect={onSelect}
              onOpenDetail={onOpenDetail}
            />
          </Box>

          <LyreflyBrainstormResources assets={assets} onAdd={openResourceDialog} />
        </Box>
      </Box>

      <BrainstormResourceDialog
        projectId={projectId}
        open={resourceDialogOpen}
        onClose={() => setResourceDialogOpen(false)}
      />
    </Box>
  );
}

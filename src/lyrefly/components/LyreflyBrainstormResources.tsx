import AddIcon from '@mui/icons-material/Add';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useMemo, type ReactElement } from 'react';

import { useLyreflyVisualDevUndo } from '../hooks/useLyreflyVisualDevUndo';
import type { VisualDevAsset } from '../types';
import { partitionConceptShelfAssets } from '../utils/conceptShelfUtils';
import { ConceptReferenceRow } from './ConceptReferenceRow';

export type LyreflyBrainstormResourcesProps = {
  assets: VisualDevAsset[];
  onAdd: () => void;
};

export function LyreflyBrainstormResources({
  assets,
  onAdd,
}: LyreflyBrainstormResourcesProps): ReactElement {
  const { removeAsset, commitAssetUpdate } = useLyreflyVisualDevUndo();
  const { references } = useMemo(() => partitionConceptShelfAssets(assets), [assets]);

  return (
    <Box
      component="section"
      className="lyrefly-brainstorm-resources"
      data-testid="lyrefly-brainstorm-resources"
    >
      <Box className="lyrefly-brainstorm-resources__header">
        <Typography component="h2" className="lyrefly-brainstorm-board__section-label">
          Resources
        </Typography>
        <Button
          size="small"
          variant="text"
          color="inherit"
          startIcon={<AddIcon sx={{ fontSize: 14 }} />}
          onClick={onAdd}
          sx={{ textTransform: 'none', fontWeight: 500, minWidth: 0, flexShrink: 0, mt: '-0.15rem' }}
        >
          Add
        </Button>
      </Box>

      {references.length > 0 ? (
        <ul className="lyrefly-brainstorm-resources__list">
          {references.map((asset) => (
            <ConceptReferenceRow
              key={asset.id}
              asset={asset}
              onChange={(before, after) => void commitAssetUpdate(before, after)}
              onRemove={(item) => void removeAsset(item)}
            />
          ))}
        </ul>
      ) : (
        <Typography variant="body2" className="lyrefly-brainstorm-resources__empty">
          Links, docs, and idea cards.{' '}
          <Button
            component="span"
            variant="text"
            color="inherit"
            onClick={onAdd}
            sx={{ textTransform: 'none', fontWeight: 500, p: 0, minWidth: 0, verticalAlign: 'baseline' }}
          >
            Add one
          </Button>
        </Typography>
      )}
    </Box>
  );
}

import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import { useMemo } from 'react';

import { sortComicIdsNatural } from '../collections/naturalSortComics';
import type { ZineboxCollection, ZineboxComic } from '../types';

type StackDetailDialogProps = {
  open: boolean;
  collection: ZineboxCollection | null;
  comicsById: ReadonlyMap<string, ZineboxComic>;
  onClose: () => void;
  onOpenComic: (comicId: string) => void;
};

export default function StackDetailDialog({
  open,
  collection,
  comicsById,
  onClose,
  onOpenComic,
}: StackDetailDialogProps): React.ReactElement {
  const sortedIds = useMemo(() => {
    if (!collection) return [];
    return sortComicIdsNatural(comicsById, collection.itemIds, collection.customSortOrder);
  }, [collection, comicsById]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle className="zinebox-stack-dialog__title">
        {collection?.name ?? 'Stack'}
        <IconButton onClick={onClose} aria-label="Close stack details" size="small">
          <span className="material-icons" aria-hidden>
            close
          </span>
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <List disablePadding>
          {sortedIds.map((id) => {
            const comic = comicsById.get(id);
            if (!comic) return null;
            return (
              <ListItemButton
                key={id}
                onClick={() => {
                  onOpenComic(id);
                  onClose();
                }}
              >
                <ListItemText primary={comic.title} secondary={comic.source} />
              </ListItemButton>
            );
          })}
        </List>
      </DialogContent>
    </Dialog>
  );
}

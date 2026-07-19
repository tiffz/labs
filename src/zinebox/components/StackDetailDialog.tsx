import CloseIcon from '@mui/icons-material/Close';
import LinkOffOutlinedIcon from '@mui/icons-material/LinkOffOutlined';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import { useMemo } from 'react';

import { removeComicFromStackUndoable } from '../undo/zineboxUndoableMutations';
import { sortComicIdsNatural } from '../collections/naturalSortComics';
import { useLabsUndo } from '../../shared/undo/LabsUndoContext';
import AppTooltip from '../../shared/components/AppTooltip';
import { handleSpaLinkClick, zineboxReadHref, type ZineboxReaderParams } from '../routes/zineboxHash';
import type { ZineboxCollection, ZineboxComic } from '../types';

function formatStackIssueSecondary(comic: ZineboxComic): string {
  const status =
    comic.readStatus === 'unread'
      ? 'Unread'
      : comic.readStatus === 'in_progress'
        ? `${Math.round(comic.progressPercentage)}% read`
        : 'Finished';
  return `${status} · ${comic.source}`;
}

type StackDetailDialogProps = {
  open: boolean;
  collection: ZineboxCollection | null;
  comicsById: ReadonlyMap<string, ZineboxComic>;
  readerParams: ZineboxReaderParams;
  onClose: () => void;
  onOpenComic: (comicId: string) => void;
  onCollectionChange: (collection: ZineboxCollection | null) => void;
};

export default function StackDetailDialog({
  open,
  collection,
  comicsById,
  readerParams,
  onClose,
  onOpenComic,
  onCollectionChange,
}: StackDetailDialogProps): React.ReactElement {
  const { push } = useLabsUndo();
  const sortedIds = useMemo(() => {
    if (!collection) return [];
    return sortComicIdsNatural(comicsById, collection.itemIds, collection.customSortOrder);
  }, [collection, comicsById]);

  const handleRemoveFromStack = async (comicId: string) => {
    if (!collection) return;
    const commit = await removeComicFromStackUndoable(collection.id, comicId, comicsById);
    if (commit) push(commit);
    const updated = collection.itemIds.filter((id) => id !== comicId);
    if (updated.length <= 1) {
      onCollectionChange(null);
      onClose();
      return;
    }
    onCollectionChange({
      ...collection,
      itemIds: updated,
      customSortOrder: sortComicIdsNatural(comicsById, updated, collection.customSortOrder),
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle className="zinebox-stack-dialog__title">
        {collection?.name ?? 'Stack'}
        <IconButton onClick={onClose} aria-label="Close stack details" size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <List disablePadding>
          {sortedIds.map((id) => {
            const comic = comicsById.get(id);
            if (!comic) return null;
            return (
              <ListItem
                key={id}
                disablePadding
                secondaryAction={
                  <AppTooltip title="Remove from stack">
                    <IconButton
                      edge="end"
                      aria-label={`Remove ${comic.title} from stack`}
                      onClick={() => void handleRemoveFromStack(id)}
                    >
                      <LinkOffOutlinedIcon fontSize="small" />
                    </IconButton>
                  </AppTooltip>
                }
              >
                <ListItemButton
                  component="a"
                  href={zineboxReadHref(id, readerParams)}
                  onClick={(e) =>
                    handleSpaLinkClick(e, () => {
                      onOpenComic(id);
                      onClose();
                    })
                  }
                >
                  <ListItemText
                    primary={comic.title}
                    secondary={formatStackIssueSecondary(comic)}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </DialogContent>
    </Dialog>
  );
}

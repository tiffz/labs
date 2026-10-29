import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import TextField from '@mui/material/TextField';
import { useState, type ReactElement } from 'react';

import {
  addToLyreflyCollection,
  createLyreflyCollection,
  lyreflyCollectionMemberId,
  removeFromLyreflyCollection,
} from '../db/lyreflyCollectionMutations';
import { useLyreflyCollections } from '../hooks/useLyreflyCollections';
import type { LyreflyCollectionMember } from '../types';

/**
 * Put a note or a comic in collections (ADR 0031). Each box adds or removes at once; there is
 * nothing to confirm, since every change is a small marker row that the next tick can undo.
 */
export function LyreflyCollectionPickerDialog({
  kind,
  refId,
  title,
  open,
  onClose,
}: {
  kind: LyreflyCollectionMember['kind'];
  refId: string;
  title: string;
  open: boolean;
  onClose: () => void;
}): ReactElement {
  const { collections, membersByCollection } = useLyreflyCollections();
  const [newTitle, setNewTitle] = useState('');

  const memberIn = (collectionId: string): LyreflyCollectionMember | undefined => {
    const id = lyreflyCollectionMemberId(collectionId, kind, refId);
    return membersByCollection.get(collectionId)?.find((m) => m.id === id);
  };

  const addToNew = async (): Promise<void> => {
    const name = newTitle.trim();
    if (!name) return;
    const created = await createLyreflyCollection(name);
    await addToLyreflyCollection(created.id, kind, refId);
    setNewTitle('');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth data-testid="lyrefly-collection-picker">
      <DialogTitle>Collections for {title || 'this'}</DialogTitle>
      <DialogContent>
        {collections.map((collection) => {
          const member = memberIn(collection.id);
          return (
            <FormControlLabel
              key={collection.id}
              sx={{ display: 'flex' }}
              control={
                <Checkbox
                  size="small"
                  checked={Boolean(member)}
                  onChange={() =>
                    void (member
                      ? removeFromLyreflyCollection(member)
                      : addToLyreflyCollection(collection.id, kind, refId))
                  }
                />
              }
              label={collection.title}
            />
          );
        })}
        <form
          className="lyrefly-collection-picker__new"
          onSubmit={(e) => {
            e.preventDefault();
            void addToNew();
          }}
        >
          <TextField
            size="small"
            label="New collection"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            sx={{ flex: 1 }}
          />
          <Button type="submit" disabled={!newTitle.trim()}>
            Add
          </Button>
        </form>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Done</Button>
      </DialogActions>
    </Dialog>
  );
}

import { useState, type ReactElement } from 'react';
import { EncoreMediaTrackAddMenu } from '../../ui/EncoreMediaTrackAddMenu';
import type { OriginalsTakesController } from '../hooks/useOriginalsTakes';

/**
 * "Add take": paste a Google Drive link, or upload from this device.
 *
 * The same menu the song page uses to add tracks, so a take is added the way every other media
 * file in Encore is. Both take surfaces (the Record-takes stage and the song-files panel) render
 * this, against one `useOriginalsTakes` controller, so they cannot drift apart again.
 */
export function OriginalsTakeAddMenu({
  takes,
  variant,
}: {
  takes: OriginalsTakesController;
  variant: 'chip' | 'button';
}): ReactElement {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [pasteValue, setPasteValue] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const close = () => {
    setAnchor(null);
    setPasteError(null);
    setPasteValue('');
  };

  const addLink = async (raw: string) => {
    if (adding) return;
    setAdding(true);
    setPasteError(null);
    try {
      const result = await takes.addFromDriveLink(raw);
      if (result.ok) close();
      else setPasteError(result.message);
    } finally {
      setAdding(false);
    }
  };

  return (
    <EncoreMediaTrackAddMenu
      addButtonLabel="Add take"
      triggerVariant={variant}
      menuAnchor={anchor}
      onOpenMenu={setAnchor}
      onCloseMenu={close}
      pasteValue={pasteValue}
      onPasteValueChange={(next) => {
        setPasteValue(next);
        setPasteError(null);
      }}
      onPasteApply={(raw) => void addLink(raw)}
      pasteError={pasteError}
      pasteHint="Google Drive"
      pasteBusy={adding}
      uploadDisabled={takes.uploading}
      onUploadClick={takes.openFilePicker}
    />
  );
}

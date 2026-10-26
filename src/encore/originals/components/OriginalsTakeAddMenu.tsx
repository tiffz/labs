import { useState, type ReactElement } from 'react';
import { EncoreMediaTrackAddMenu } from '../../ui/EncoreMediaTrackAddMenu';
import type { OriginalsTakesController } from '../hooks/useOriginalsTakes';

/**
 * "Add take": paste a Google Drive link, or upload from this device.
 *
 * The same menu the song page uses to add tracks. Either path only STAGES the take: it appears in
 * the controller's review panel, and nothing is saved until the user confirms there (ADR 0030).
 * Both take surfaces render this against one `useOriginalsTakes` controller.
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

  const close = () => {
    setAnchor(null);
    setPasteValue('');
  };

  return (
    <EncoreMediaTrackAddMenu
      addButtonLabel="Add take"
      triggerVariant={variant}
      menuAnchor={anchor}
      onOpenMenu={setAnchor}
      onCloseMenu={close}
      pasteValue={pasteValue}
      onPasteValueChange={setPasteValue}
      onPasteApply={(raw) => {
        takes.stageLink(raw);
        close();
      }}
      pasteHint="Google Drive"
      uploadDisabled={takes.uploading}
      onUploadClick={takes.openFilePicker}
    />
  );
}

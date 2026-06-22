import Box from '@mui/material/Box';
import type { ReactElement } from 'react';
import { isRichTextEmpty, richTextPlainText } from '../../../shared/utils/richTextContent';
import { EncoreStaticResourceHoverCard } from '../../components/EncoreStreamingHoverCard';
import { EncoreMediaLinkRow } from '../../ui/EncoreMediaLinkRow';
import type { EncoreOriginalSong } from '../types';

export const ORIGINALS_BRAINSTORM_DOC_LABEL = 'Brainstorm notes';

export type OriginalsBrainstormDocChipProps = {
  song: EncoreOriginalSong;
  onOpen: () => void;
};

const encoreFavicon = (
  <Box
    component="img"
    src="/icons/favicon-encore.png"
    alt=""
    aria-hidden
    sx={{ width: 14, height: 14, display: 'block', flexShrink: 0, opacity: 0.88 }}
  />
);

/** Built-in Encore brainstorm doc — always listed, never removable. */
export function OriginalsBrainstormDocChip({ song, onOpen }: OriginalsBrainstormDocChipProps): ReactElement {
  const plain = richTextPlainText(song.brainstormHtml);
  const hasContent = !isRichTextEmpty(song.brainstormHtml);
  const preview = hasContent
    ? plain.length > 56
      ? `${plain.slice(0, 56).trim()}…`
      : plain
    : 'Empty. Click to write.';

  return (
    <EncoreStaticResourceHoverCard
      title={ORIGINALS_BRAINSTORM_DOC_LABEL}
      subtitle={hasContent ? preview : 'Encore · empty'}
    >
      <EncoreMediaLinkRow
        slot="reference"
        isPrimary={false}
        caption={ORIGINALS_BRAINSTORM_DOC_LABEL}
        fullCaption={hasContent ? plain : `${ORIGINALS_BRAINSTORM_DOC_LABEL} (empty)`}
        stripLeading={encoreFavicon}
        onStripClick={onOpen}
        openAriaLabel={`Open ${ORIGINALS_BRAINSTORM_DOC_LABEL}`}
        layout="chip"
      />
    </EncoreStaticResourceHoverCard>
  );
}

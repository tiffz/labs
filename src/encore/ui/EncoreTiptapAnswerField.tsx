import { memo, type ReactElement } from 'react';
import { RichTextEditor, type RichTextEditorProps } from '../../shared/components/RichTextEditor';
import type { SxProps, Theme } from '@mui/material/styles';

export type EncoreTiptapAnswerFieldProps = {
  value: string;
  onChange: (html: string) => void;
  readOnly: boolean;
  /** Shown when the document is empty (TipTap placeholder). */
  placeholder?: string;
  'aria-label': string;
  sx?: SxProps<Theme>;
};

/**
 * Encore practice wrapper around shared {@link RichTextEditor}.
 */
function EncoreTiptapAnswerFieldInner({
  value,
  onChange,
  readOnly,
  placeholder,
  'aria-label': ariaLabel,
  sx,
}: EncoreTiptapAnswerFieldProps): ReactElement {
  const props: RichTextEditorProps = {
    value,
    onChange,
    readOnly,
    placeholder,
    'aria-label': ariaLabel,
    sx: [
      {
        borderRadius: 0,
      },
      ...(sx ? (Array.isArray(sx) ? sx : [sx]) : []),
    ],
  };
  return <RichTextEditor {...props} />;
}

export const EncoreTiptapAnswerField = memo(EncoreTiptapAnswerFieldInner);

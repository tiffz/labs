import { alpha, useTheme } from '@mui/material/styles';
import type { ReactElement } from 'react';

import { RichTextEditor } from '../../shared/components/RichTextEditor';

export type ScriptRichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
};

export function ScriptRichTextEditor({ value, onChange, disabled }: ScriptRichTextEditorProps): ReactElement {
  const theme = useTheme();

  return (
    <RichTextEditor
      className="shared-rich-text-editor--fill shared-rich-text-editor--canvas lyrefly-script-rich-editor"
      value={value}
      onChange={onChange}
      readOnly={disabled}
      placeholder="Use nested bullets like Google Docs: top level = pages, indent once = panels, indent again = action or CHARACTER: dialogue."
      aria-label="Comic script"
      sx={{
        flex: 1,
        minHeight: 0,
        bgcolor: alpha(theme.palette.background.paper, 0.88),
        borderColor: alpha(theme.palette.primary.main, 0.14),
        '& .shared-rich-text-surface': {
          minHeight: 'min(62vh, 760px)',
          px: { xs: 2.5, sm: 4 },
          py: { xs: 2.5, sm: 3 },
          fontSize: '1.0625rem',
          lineHeight: 1.7,
          fontFamily: 'inherit',
        },
      }}
    />
  );
}

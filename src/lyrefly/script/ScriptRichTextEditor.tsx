import type { ReactElement } from 'react';

import { RichTextEditor } from '../../shared/components/RichTextEditor';

export type ScriptRichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
};

export function ScriptRichTextEditor({ value, onChange, disabled }: ScriptRichTextEditorProps): ReactElement {
  return (
    <RichTextEditor
      className="shared-rich-text-editor--fill shared-rich-text-editor--canvas lyrefly-script-rich-editor"
      value={value}
      onChange={onChange}
      readOnly={disabled}
      preserveEditorHistory
      enableListNesting
      placeholder="Top bullet = page, Tab once = panel, Tab again = dialogue or action. Replace this example with your story."
      aria-label="Comic script"
      sx={{
        flex: 1,
        minHeight: 0,
        height: '100%',
        bgcolor: 'background.paper',
        borderColor: 'divider',
        '& .shared-rich-text-surface': {
          minHeight: '100%',
          height: '100%',
          px: { xs: 2, sm: 2.75 },
          py: { xs: 2, sm: 2.5 },
          fontSize: '1rem',
          lineHeight: 1.65,
          fontFamily: 'inherit',
        },
      }}
    />
  );
}

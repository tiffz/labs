import Stack from '@mui/material/Stack';
import type { ReactElement, ReactNode } from 'react';
import { EncoreBrandTextField } from './EncoreBrandTextField';

export type EncoreYouTubePasteFieldProps = {
  value: string;
  onChange: (next: string) => void;
  /** Typically the primary action (e.g. Add) aligned with the field. */
  trailingAction: ReactNode;
  label?: string;
  placeholder?: string;
  helperText?: ReactNode;
};

export function EncoreYouTubePasteField(props: EncoreYouTubePasteFieldProps): ReactElement {
  const {
    value,
    onChange,
    trailingAction,
    label = 'YouTube',
    placeholder = 'Watch URL or video ID',
    helperText,
  } = props;

  return (
    <Stack direction="row" spacing={0.75} alignItems="flex-start">
      <EncoreBrandTextField
        brand="youtube"
        brandIconPx={18}
        size="small"
        fullWidth
        label={label}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        helperText={helperText}
      />
      {trailingAction}
    </Stack>
  );
}

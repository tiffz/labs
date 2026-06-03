import Alert, { type AlertProps } from '@mui/material/Alert';

type StanzaInlineAlertProps = AlertProps & {
  /** Shared max width for hero / viewer bootstrap alerts. */
  layout?: 'hero' | 'inline';
};

const layoutSx = {
  hero: {
    maxWidth: 560,
    mx: 'auto',
    mb: 2,
    width: '100%',
    '& .MuiAlert-message': { width: '100%' },
  },
  inline: {
    py: 0,
    '& .MuiAlert-message': { py: 0.5 },
  },
} as const;

/** Stanza alert styling — keeps Drive / migration notices visually consistent. */
export default function StanzaInlineAlert({ layout = 'hero', sx, ...rest }: StanzaInlineAlertProps) {
  return <Alert sx={{ ...layoutSx[layout], ...sx }} {...rest} />;
}

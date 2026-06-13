import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactElement, ReactNode } from 'react';

const monoSx = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  fontSize: '0.8125rem',
  lineHeight: 1.5,
} as const;

function InlineCode(props: { children: string }): ReactElement {
  return (
    <Box
      component="code"
      sx={{
        ...monoSx,
        fontSize: '0.875em',
        px: 0.5,
        py: 0.125,
        borderRadius: 0.5,
        bgcolor: 'action.hover',
      }}
    >
      {props.children}
    </Box>
  );
}

function TerminalBlock(props: { children: string }): ReactElement {
  return (
    <Box
      component="pre"
      sx={{
        m: 0,
        mt: 0.75,
        p: 1.25,
        borderRadius: 1,
        border: 1,
        borderColor: 'divider',
        bgcolor: (t) => (t.palette.mode === 'dark' ? 'action.selected' : 'grey.50'),
        ...monoSx,
        overflowX: 'auto',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {props.children}
    </Box>
  );
}

function SetupSection(props: { title: string; children: ReactNode }): ReactElement {
  return (
    <Box component="section" sx={{ mt: 2 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.75 }}>
        {props.title}
      </Typography>
      {props.children}
    </Box>
  );
}

function Step(props: { n: number; children: ReactNode }): ReactElement {
  return (
    <Stack direction="row" spacing={1.25} alignItems="flex-start" sx={{ mt: 1 }}>
      <Typography
        component="span"
        variant="caption"
        sx={{
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          color: 'text.secondary',
          minWidth: 16,
          pt: 0.125,
        }}
      >
        {props.n}.
      </Typography>
      <Box sx={{ flex: 1, minWidth: 0, typography: 'body2', color: 'text.secondary', lineHeight: 1.6 }}>
        {props.children}
      </Box>
    </Stack>
  );
}

/** Local dev setup when guest snapshots cannot reach Drive (missing browser API key). */
export function GuestSnapshotDevSetupPanel(): ReactElement {
  return (
    <Box
      sx={{
        mt: 1.5,
        mb: 2,
        p: 2,
        borderRadius: 1.5,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
        Local dev needs <InlineCode>VITE_GOOGLE_API_KEY</InlineCode> so Encore can read{' '}
        <InlineCode>public_snapshot.json</InlineCode> through the Vite Drive proxy.
      </Typography>

      <SetupSection title="Option A: env file (recommended)">
        <Step n={1}>
          Add the key to <InlineCode>src/.env.local</InlineCode> (gitignored):
          <TerminalBlock>{'VITE_GOOGLE_API_KEY=AIza…your-browser-key…'}</TerminalBlock>
        </Step>
        <Step n={2}>
          Restart the dev server:
          <TerminalBlock>npm run dev</TerminalBlock>
        </Step>
      </SetupSection>

      <SetupSection title="Option B: GitHub variable + gh CLI">
        <Step n={1}>
          Sign in:
          <TerminalBlock>gh auth login</TerminalBlock>
        </Step>
        <Step n={2}>
          Mirror the CI secret as a repo <strong>variable</strong> (secrets cannot be read locally):
          <TerminalBlock>{'gh variable set VITE_GOOGLE_API_KEY --body "AIza…"'}</TerminalBlock>
        </Step>
        <Step n={3}>
          Restart <InlineCode>npm run dev</InlineCode>. Vite loads the variable automatically when the env file
          omits the key.
        </Step>
      </SetupSection>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, lineHeight: 1.55 }}>
        Google Cloud: enable Drive API and allow your dev origin on the key referrer list. Details in{' '}
        <InlineCode>src/encore/README.md</InlineCode> (Browser API key).
      </Typography>
    </Box>
  );
}

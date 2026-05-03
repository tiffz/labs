import ReactMarkdown from 'react-markdown';
import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import { memo, useDeferredValue } from 'react';

function safeUrl(url: string): string {
  const u = url.trim().toLowerCase();
  if (u.startsWith('javascript:') || u.startsWith('data:')) return '';
  return url;
}

/**
 * Markdown renderer used by SongPage's journal preview. Wrapped in `React.memo` and fed via
 * `useDeferredValue` so a long journal does not re-parse markdown on every keystroke; the
 * preview catches up at idle while the textarea stays responsive.
 */
function MarkdownPreviewInner({ markdown }: { markdown: string }): React.ReactElement {
  const theme = useTheme();
  const deferredMarkdown = useDeferredValue(markdown);
  return (
    <Box
      className="encore-markdown-preview"
      sx={{
        color: 'text.primary',
        fontSize: '0.9375rem',
        lineHeight: 1.55,
        '& a': {
          color: 'primary.main',
          textDecoration: 'underline',
        },
        '& a:focus-visible': {
          outline: `2px solid ${theme.palette.secondary.main}`,
          outlineOffset: 2,
        },
      }}
    >
      <ReactMarkdown urlTransform={safeUrl}>{deferredMarkdown}</ReactMarkdown>
    </Box>
  );
}

export const MarkdownPreview = memo(MarkdownPreviewInner);

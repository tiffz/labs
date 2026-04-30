import ReactMarkdown from 'react-markdown';
import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';

function safeUrl(url: string): string {
  const u = url.trim().toLowerCase();
  if (u.startsWith('javascript:') || u.startsWith('data:')) return '';
  return url;
}

export function MarkdownPreview({ markdown }: { markdown: string }): React.ReactElement {
  const theme = useTheme();
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
      <ReactMarkdown urlTransform={safeUrl}>{markdown}</ReactMarkdown>
    </Box>
  );
}

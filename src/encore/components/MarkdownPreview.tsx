import ReactMarkdown from 'react-markdown';
import Box from '@mui/material/Box';

function safeUrl(url: string): string {
  const u = url.trim().toLowerCase();
  if (u.startsWith('javascript:') || u.startsWith('data:')) return '';
  return url;
}

export function MarkdownPreview({ markdown }: { markdown: string }): React.ReactElement {
  return (
    <Box className="encore-markdown-preview text-slate-800">
      <ReactMarkdown urlTransform={safeUrl}>{markdown}</ReactMarkdown>
    </Box>
  );
}

import Typography from '@mui/material/Typography';
import type { SxProps, Theme } from '@mui/material/styles';
import { useMemo, type ReactElement, type ReactNode } from 'react';

export type HighlightedTextProps = {
  text: string;
  /** Case-insensitive substring highlight when non-empty after trim. */
  highlight: string;
  variant?: React.ComponentProps<typeof Typography>['variant'];
  sx?: SxProps<Theme>;
  component?: React.ElementType;
};

function buildHighlightedParts(text: string, needleRaw: string): ReactNode[] {
  const needle = needleRaw.trim();
  if (!needle) return [text];
  const lowerText = text.toLowerCase();
  const lowerNeedle = needle.toLowerCase();
  const out: ReactNode[] = [];
  let pos = 0;
  let key = 0;
  while (pos < text.length) {
    const found = lowerText.indexOf(lowerNeedle, pos);
    if (found === -1) {
      out.push(text.slice(pos));
      break;
    }
    if (found > pos) {
      out.push(<span key={key++}>{text.slice(pos, found)}</span>);
    }
    const slice = text.slice(found, found + needle.length);
    out.push(
      <mark
        key={key++}
        style={{ backgroundColor: 'rgba(124, 58, 237, 0.22)', padding: '0 0.06em', borderRadius: 2 }}
      >
        {slice}
      </mark>,
    );
    pos = found + needle.length;
  }
  return out;
}

/**
 * Renders plain text with `<mark>` around each case-insensitive match of `highlight`.
 */
export function HighlightedText(props: HighlightedTextProps): ReactElement {
  const { text, highlight, variant = 'body2', sx, component } = props;
  const parts = useMemo(() => buildHighlightedParts(text, highlight), [text, highlight]);
  const needle = highlight.trim();

  const rootProps = {
    variant,
    sx,
    noWrap: true as const,
    ...(component ? { component } : {}),
  };

  if (!needle) {
    return (
      <Typography {...rootProps}>
        {text}
      </Typography>
    );
  }

  return (
    <Typography {...rootProps}>
      {parts}
    </Typography>
  );
}

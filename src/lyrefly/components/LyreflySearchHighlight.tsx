import { useMemo, type ReactElement } from 'react';

import { splitLyreflySearchHighlight } from '../utils/lyreflySearchHighlight';

export type LyreflySearchHighlightProps = {
  text: string;
  query: string;
};

export function LyreflySearchHighlight({ text, query }: LyreflySearchHighlightProps): ReactElement {
  const parts = useMemo(() => splitLyreflySearchHighlight(text, query), [query, text]);

  if (parts.length === 1 && parts[0]?.kind === 'text') {
    return <>{parts[0].value}</>;
  }

  return (
    <>
      {parts.map((part, index) =>
        part.kind === 'mark' ? (
          <mark key={`${index}-${part.value}`} className="lyrefly-search-highlight">
            {part.value}
          </mark>
        ) : (
          <span key={`${index}-${part.value}`}>{part.value}</span>
        ),
      )}
    </>
  );
}

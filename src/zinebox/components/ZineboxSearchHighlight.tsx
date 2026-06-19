import { useMemo } from 'react';

import { splitZineboxSearchHighlight } from '../utils/zineboxSearchHighlight';

type ZineboxSearchHighlightProps = {
  text: string;
  query: string | null | undefined;
};

export default function ZineboxSearchHighlight({
  text,
  query,
}: ZineboxSearchHighlightProps): React.ReactElement {
  const parts = useMemo(() => splitZineboxSearchHighlight(text, query ?? ''), [query, text]);

  if (parts.length === 1 && parts[0]?.kind === 'text') {
    return <>{parts[0].value}</>;
  }

  return (
    <>
      {parts.map((part, index) =>
        part.kind === 'mark' ? (
          <mark key={`${index}-${part.value}`} className="zinebox-search-highlight">
            {part.value}
          </mark>
        ) : (
          <span key={`${index}-${part.value}`}>{part.value}</span>
        ),
      )}
    </>
  );
}

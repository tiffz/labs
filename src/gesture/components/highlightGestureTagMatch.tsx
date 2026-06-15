import type { ReactNode } from 'react';

/** Highlights the first case-insensitive match in a tag suggestion. */
export function highlightGestureTagMatch(label: string, query: string): ReactNode {
  const trimmed = query.trim();
  if (!trimmed) return label;

  const lowerLabel = label.toLowerCase();
  const lowerQuery = trimmed.toLowerCase();
  const index = lowerLabel.indexOf(lowerQuery);
  if (index < 0) return label;

  const before = label.slice(0, index);
  const match = label.slice(index, index + trimmed.length);
  const after = label.slice(index + trimmed.length);

  return (
    <>
      {before}
      <span className="gesture-pack-tags-match">{match}</span>
      {after}
    </>
  );
}

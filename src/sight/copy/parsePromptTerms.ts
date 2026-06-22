import { SIGHT_PHRASE_LOOKUP, type SightTermId } from './sightTerms';

export type SightPromptPart =
  | { type: 'text'; value: string }
  | { type: 'term'; id: SightTermId; value: string };

export function parsePromptTerms(text: string): SightPromptPart[] {
  const parts: SightPromptPart[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    let matchIndex = -1;
    let matchPhrase = '';
    let matchId: SightTermId | null = null;

    for (const { phrase, id } of SIGHT_PHRASE_LOOKUP) {
      const index = remaining.toLowerCase().indexOf(phrase.toLowerCase());
      if (index !== -1 && (matchIndex === -1 || index < matchIndex)) {
        matchIndex = index;
        matchPhrase = phrase;
        matchId = id;
      }
    }

    if (matchIndex === -1 || !matchId) {
      parts.push({ type: 'text', value: remaining });
      break;
    }

    if (matchIndex > 0) {
      parts.push({ type: 'text', value: remaining.slice(0, matchIndex) });
    }

    parts.push({
      type: 'term',
      id: matchId,
      value: remaining.slice(matchIndex, matchIndex + matchPhrase.length),
    });
    remaining = remaining.slice(matchIndex + matchPhrase.length);
  }

  return parts;
}

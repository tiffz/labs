import AppTooltip from '../../shared/components/AppTooltip';
import { SIGHT_TERMS, type SightTermId } from '../copy/sightTerms';

interface SightTermProps {
  termId: SightTermId;
  label: string;
}

/** Inline glossary term — dotted underline; hover or tap for definition. */
export default function SightTerm({ termId, label }: SightTermProps): React.ReactElement {
  const definition = SIGHT_TERMS[termId].definition;

  return (
    <AppTooltip title={definition} placement="top">
      <button type="button" className="sight-term">
        {label}
      </button>
    </AppTooltip>
  );
}

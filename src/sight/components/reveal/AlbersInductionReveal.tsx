import { inducedAppearance } from '../../scoring/chromaticInduction';
import type { AlbersField, AlbersQuestionKind } from '../../types';
import FlashcardProofStrip from './FlashcardProofStrip';

interface AlbersInductionRevealProps {
  left: AlbersField;
  right: AlbersField;
  question: AlbersQuestionKind;
  targetsIdentical: boolean;
  visible?: boolean;
}

function revealNote(question: AlbersQuestionKind, targetsIdentical: boolean): string | null {
  if (!targetsIdentical || question === 'identity') return null;
  if (question === 'perceivedWarmer' || question === 'perceivedCooler') {
    return 'Same chip on gray. The warm and cool fields shifted how each side read.';
  }
  if (question === 'perceivedLighter' || question === 'perceivedDarker') {
    return 'Same chip on gray. The fields shifted how light or dark each side read.';
  }
  if (question === 'perceivedMoreSaturated' || question === 'perceivedLessSaturated') {
    return 'Same chip on gray. The fields shifted how vivid each side read.';
  }
  return null;
}

/** Post-answer reveal for Albers flashcards — physical chip plus induced read when targets match. */
export default function AlbersInductionReveal({
  left,
  right,
  question,
  targetsIdentical,
  visible = true,
}: AlbersInductionRevealProps): React.ReactElement {
  const note = revealNote(question, targetsIdentical);
  const showInduced = targetsIdentical && question !== 'identity';

  return (
    <div
      className={`sight-albers-reveal ${visible ? 'sight-albers-reveal--visible' : ''}`}
      aria-hidden={!visible}
    >
      {note ? (
        <p className="sight-albers-reveal__note">{note}</p>
      ) : null}
      <FlashcardProofStrip
        left={left.target}
        right={right.target}
        leftLabel="Left chip"
        rightLabel="Right chip"
        visible={visible}
        variant="separated"
      />
      {showInduced ? (
        <FlashcardProofStrip
          left={inducedAppearance(left.target, left.background)}
          right={inducedAppearance(right.target, right.background)}
          leftLabel="Left read"
          rightLabel="Right read"
          visible={visible}
          variant="separated"
        />
      ) : null}
    </div>
  );
}

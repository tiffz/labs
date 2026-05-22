interface CompactVerdictProps {
  passed: boolean;
  label?: string;
  /** Prominent score (e.g. match accuracy %) shown beside the verdict. */
  score?: string;
  scoreSuffix?: string;
  detail?: string;
}

/** Single-line pass/fail row shared by compare, match, and flashcard feedback. */
export default function CompactVerdict({
  passed,
  label,
  score,
  scoreSuffix,
  detail,
}: CompactVerdictProps): React.ReactElement {
  const text = label ?? (passed ? 'Correct' : 'Not quite');
  const icon = passed ? 'check_circle' : 'cancel';

  return (
    <div className={`sight-verdict-row ${passed ? 'sight-verdict-row--pass' : 'sight-verdict-row--fail'}`}>
      <span
        className={`material-symbols-outlined sight-verdict-row__icon ${passed ? 'sight-verdict-row__icon--pass' : 'sight-verdict-row__icon--fail'}`}
        aria-hidden
      >
        {icon}
      </span>
      <span className="sight-verdict-row__text">{text}</span>
      {score ? (
        <span className="sight-verdict-row__score">
          {score}
          {scoreSuffix ? <span className="sight-verdict-row__score-suffix"> {scoreSuffix}</span> : null}
        </span>
      ) : null}
      {detail ? <span className="sight-verdict-row__detail">{detail}</span> : null}
    </div>
  );
}

import { spellingLabel } from '../notation/maqamAccidentals';
import { scaleDegreeLabels, type MaqamPreset } from '../data/maqamPresets';

interface JinsBreakdownProps {
  preset: MaqamPreset;
}

/**
 * The maqam's two ajnas and the degree they share.
 *
 * Shown beside the staff rather than under it, because the ajnas ARE the
 * structure of the maqam — demoting them to a footnote is what made the first
 * version read as "a scale with odd accidentals".
 */
export default function JinsBreakdown({ preset }: JinsBreakdownProps) {
  const degrees = scaleDegreeLabels(preset.scaleDegrees);

  return (
    <div className="maqam-jins">
      <h2 className="maqam-panel__heading">Built from</h2>

      <ol className="maqam-jins__list">
        {preset.primaryAjnas.map((jins) => (
          <li key={jins.id} className="maqam-jins__item">
            <span className="maqam-jins__name">{jins.name}</span>
            <span className="maqam-jins__steps">
              {jins.intervalsInCents.join(' · ')}
              <span className="maqam-jins__unit"> cents</span>
            </span>
          </li>
        ))}
      </ol>

      {preset.primaryAjnas.length > 1 && (
        <p className="maqam-jins__note">
          Joined on {spellingLabel(preset.primaryAjnas[1].root)}, where the first cell ends and the
          second begins.
        </p>
      )}
      {preset.primaryAjnas.length === 1 && (
        <p className="maqam-jins__note">
          Only the lower cell is settled for this maqam. Sources disagree about the upper region, so
          it is left out rather than guessed.
        </p>
      )}

      <p className="maqam-jins__scale">{degrees.join('  ')}</p>
      {!preset.repeatsAtOctave && (
        <p className="maqam-jins__note">
          Stops at the seventh. This maqam does not return to its tonic an octave up.
        </p>
      )}
    </div>
  );
}

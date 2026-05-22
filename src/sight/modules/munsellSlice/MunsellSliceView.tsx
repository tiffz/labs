import Typography from '@mui/material/Typography';
import CompactVerdict from '../../components/reveal/CompactVerdict';
import { colorStateToHex } from '../../scoring/perceptualScore';
import type { MunsellSliceChallenge, PracticeReveal } from '../../types';

interface MunsellSliceViewProps {
  challenge: MunsellSliceChallenge;
  reveal: PracticeReveal | null;
  onPick: (index: number) => void;
  disabled?: boolean;
}

export default function MunsellSliceView({
  challenge,
  reveal,
  onPick,
  disabled = false,
}: MunsellSliceViewProps): React.ReactElement {
  const sliceReveal = reveal?.kind === 'munsell-slice' ? reveal : null;
  const prompt =
    challenge.axis === 'value' ? 'Which swatch breaks the value slice?' : 'Which swatch breaks the chroma branch?';

  return (
    <div className="sight-workspace sight-workspace--single">
      <Typography variant="subtitle2" component="p" className="sight-compare-prompt">
        {prompt}
      </Typography>
      <div className="sight-munsell-grid" role="group" aria-label={prompt}>
        {challenge.swatches.map((swatch, index) => {
          const hex = colorStateToHex(swatch);
          const isCorrect = sliceReveal && challenge.outlierIndex === index;
          const isWrong = sliceReveal && sliceReveal.pickedIndex === index && !sliceReveal.passed;
          return (
            <button
              key={index}
              type="button"
              className={[
                'sight-munsell-cell',
                isCorrect ? 'sight-compare-swatch--correct' : '',
                isWrong ? 'sight-compare-swatch--wrong' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={{ background: hex }}
              disabled={disabled}
              onClick={() => onPick(index)}
              aria-label={`Swatch ${index + 1}`}
            />
          );
        })}
      </div>
      {sliceReveal && (
        <CompactVerdict
          passed={sliceReveal.passed}
          label={sliceReveal.passed ? 'Correct outlier' : 'Not the outlier'}
        />
      )}
    </div>
  );
}

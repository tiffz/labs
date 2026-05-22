import Slider from '@mui/material/Slider';
import Typography from '@mui/material/Typography';
import CompactVerdict from '../../components/reveal/CompactVerdict';
import type { AnchorPivotChallenge, PracticeReveal } from '../../types';
import AnchorPivotWheel from './AnchorPivotWheel';

interface AnchorPivotViewProps {
  challenge: AnchorPivotChallenge;
  pivotHue: number;
  onPivotChange: (hue: number) => void;
  reveal: PracticeReveal | null;
  interactionDisabled?: boolean;
}

export default function AnchorPivotView({
  challenge,
  pivotHue,
  onPivotChange,
  reveal,
  interactionDisabled = false,
}: AnchorPivotViewProps): React.ReactElement {
  const pivotReveal = reveal?.kind === 'anchor-pivot' ? reveal : null;

  return (
    <div className="sight-workspace sight-workspace--single">
      <Typography variant="subtitle2" component="p">
        Rotate the pivot to align nodes with targets ({challenge.system}).
      </Typography>
      <AnchorPivotWheel
        challenge={challenge}
        pivotHue={pivotHue}
        onPivotChange={onPivotChange}
        disabled={interactionDisabled}
      />
      {!interactionDisabled && (
        <Slider
          size="small"
          min={0}
          max={360}
          value={pivotHue}
          onChange={(_, v) => onPivotChange(v as number)}
          aria-label="Pivot hue"
        />
      )}
      {pivotReveal && (
        <CompactVerdict
          passed={pivotReveal.passed}
          label={pivotReveal.passed ? 'Harmony locked' : 'Adjust rotation'}
          score={`${pivotReveal.angularScore}%`}
          detail={`Max error ${pivotReveal.maxAngularError.toFixed(0)}°`}
        />
      )}
    </div>
  );
}

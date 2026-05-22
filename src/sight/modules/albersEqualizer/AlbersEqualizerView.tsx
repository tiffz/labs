import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import OklchSliders from '../../components/OklchSliders';
import CompactVerdict from '../../components/reveal/CompactVerdict';
import { getLevelConfig } from '../../levels';
import { colorStateToHex } from '../../scoring/perceptualScore';
import type { AlbersEqualizerChallenge, ColorState, PracticeReveal } from '../../types';

interface AlbersEqualizerViewProps {
  challenge: AlbersEqualizerChallenge;
  level: number;
  input: ColorState;
  onInputChange: (next: ColorState) => void;
  reveal: PracticeReveal | null;
  interactionDisabled?: boolean;
}

function fieldPanel(field: AlbersEqualizerChallenge['left'], label: string, inner?: ColorState) {
  const innerColor = inner ?? field.target;
  return (
    <div className="sight-albers-field sight-neutral-panel">
      <Typography variant="caption">{label}</Typography>
      <div className="sight-albers-field__bg" style={{ background: colorStateToHex(field.background) }}>
        <div className="sight-albers-field__inner" style={{ background: colorStateToHex(innerColor) }} />
      </div>
    </div>
  );
}

export default function AlbersEqualizerView({
  challenge,
  level,
  input,
  onInputChange,
  reveal,
  interactionDisabled = false,
}: AlbersEqualizerViewProps): React.ReactElement {
  const eqReveal = reveal?.kind === 'albers-equalizer' ? reveal : null;
  const maxDe = getLevelConfig(level).maxDeltaE ?? 4;

  return (
    <div className="sight-workspace">
      <Typography variant="subtitle2" component="p">
        Match the right inner swatch to the left reference (perceived equality).
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
        {fieldPanel(challenge.left, 'Reference (locked)')}
        {fieldPanel(challenge.right, 'Your field', input)}
      </Stack>
      {!interactionDisabled && (
        <OklchSliders
          value={input}
          onChange={onInputChange}
          locked={{ hue: true, chroma: false }}
          showHex
        />
      )}
      {eqReveal && (
        <CompactVerdict
          passed={eqReveal.passed}
          label={eqReveal.passed ? 'Perceptual match' : 'Keep adjusting'}
          score={`${Math.round(eqReveal.accuracyRating)}%`}
          detail={`ΔE ${eqReveal.deltaE.toFixed(1)} · pass ≤ ${maxDe}`}
        />
      )}
    </div>
  );
}

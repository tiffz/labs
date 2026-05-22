import Typography from '@mui/material/Typography';
import CompactVerdict from '../../components/reveal/CompactVerdict';
import { colorStateToHex } from '../../scoring/perceptualScore';
import type { PracticeReveal, YotCastChallenge } from '../../types';

const LIGHT_LABELS: Record<YotCastChallenge['lightPrompt'], string> = {
  goldenHour: 'Golden hour wash',
  blueCave: 'Cool cave bounce',
  overcast: 'Overcast flattening',
  neonAlley: 'Neon alley spill',
};

interface YotCastViewProps {
  challenge: YotCastChallenge;
  reveal: PracticeReveal | null;
  onPick: (index: number) => void;
  disabled?: boolean;
}

function SceneThumb({ colors, label }: { colors: import('../../types').ColorState[]; label: string }) {
  return (
    <div className="sight-yot-scene" aria-label={label}>
      <svg viewBox="0 0 120 80" className="sight-yot-svg" role="img">
        <rect width="120" height="80" fill={colorStateToHex(colors[0] ?? { h: 0, c: 0, l: 0.5 })} />
        <rect x="0" y="50" width="120" height="30" fill={colorStateToHex(colors[1] ?? colors[0]!)} />
        <rect x="40" y="22" width="40" height="36" fill={colorStateToHex(colors[2] ?? colors[0]!)} />
      </svg>
    </div>
  );
}

export default function YotCastView({
  challenge,
  reveal,
  onPick,
  disabled = false,
}: YotCastViewProps): React.ReactElement {
  const castReveal = reveal?.kind === 'yot-cast' ? reveal : null;

  return (
    <div className="sight-workspace sight-workspace--single">
      <Typography variant="subtitle2" component="p">
        {LIGHT_LABELS[challenge.lightPrompt]} — pick the cast scene.
      </Typography>
      <div className="sight-yot-options" role="group" aria-label="Scene options">
        {challenge.options.map((scene, index) => (
          <button
            key={index}
            type="button"
            className="sight-yot-option"
            disabled={disabled}
            onClick={() => onPick(index)}
          >
            <SceneThumb colors={scene} label={`Scene ${index + 1}`} />
          </button>
        ))}
      </div>
      {castReveal && (
        <CompactVerdict
          passed={castReveal.passed}
          label={castReveal.passed ? 'Correct cast' : 'Wrong atmosphere'}
        />
      )}
    </div>
  );
}
